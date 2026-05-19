"""Voice WebSocket handler.

Four asyncio tasks under one TaskGroup, all sharing one VoiceSession:
  - audio_input_loop: browser PCM → Gemini realtime input
  - audio_output_loop: queued Gemini audio bytes → browser binary frames
  - gemini_response_loop: Gemini stream → audio queue / transcripts / tool calls
  - browser_message_loop: browser WS → audio_in_queue / text input / end signal

Cancelling any task tears down the others. The session ends on:
  - explicit `end_session` from browser
  - browser disconnect (WebSocketDisconnect)
  - 60s of no audio in either direction (idle safety)
  - Gemini stream end / error
"""

from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from google.genai.types import Blob, FunctionResponse

from app.logger import get_logger
from app.voice.client import build_live_connect_config, create_gemini_client
from app.voice.session import VoiceSession
from app.voice.tools import (
    execute_clear_canvas,
    execute_delete_chart,
    execute_download_chart_png,
    execute_download_editorial_pdf,
    execute_generate_editorial,
    execute_new_conversation,
    execute_query_data,
    execute_summarize_canvas,
    execute_toggle_theme,
    execute_zoom_to,
)

log = get_logger("voice.handler")

# Hard ceiling on inactivity before the session self-closes. Gemini Live
# itself has a 15-minute server-side cap, but our safety timer catches
# stuck sessions (mic muted, browser frozen) much sooner.
IDLE_TIMEOUT_SECONDS = 60.0

# Audio chunks are sent to Gemini as Blobs with this mime type. Gemini
# Live spec: 16-bit signed PCM, 16 kHz, little-endian, mono. Don't change.
AUDIO_IN_MIME_TYPE = "audio/pcm;rate=16000"

# Queue.get timeout in audio loops. Determines how quickly the loops can
# detect session.is_active going False (or hit the idle-timeout check).
# 5s is a comfortable balance between responsiveness and CPU.
AUDIO_QUEUE_POLL_TIMEOUT_S = 5.0

# Cadence for forwarded/sent chunk count logs. Every Nth chunk emits one
# log line. 50 chunks ≈ 4-9 seconds of audio depending on browser rate.
CHUNK_LOG_INTERVAL = 50


async def handle_voice_ws(websocket: WebSocket, conversation_id: str) -> None:
    await websocket.accept()
    session = VoiceSession(
        session_id=str(uuid.uuid4()),
        conversation_id=conversation_id or str(uuid.uuid4()),
        ws=websocket,
    )

    log.info(
        "Voice session opening",
        extra={"session_id": session.session_id, "conversation_id": session.conversation_id},
    )

    try:
        client = create_gemini_client()
    except RuntimeError as e:
        await websocket.send_json({"type": "session_error", "message": str(e)})
        await websocket.close()
        return

    from app.settings import settings

    last_audio_activity = time.monotonic()

    try:
        async with client.aio.live.connect(
            model=settings.VOICE_MODEL,
            config=build_live_connect_config(),
        ) as gemini_session:
            session.gemini_session = gemini_session
            await websocket.send_json({
                "type": "session_started",
                "session_id": session.session_id,
                "conversation_id": session.conversation_id,
            })
            log.info("Gemini Live session opened", extra={"session_id": session.session_id})

            # NO input gate. Per Gemini Live docs the canonical pattern
            # for continuous voice conversation is to stream user audio
            # CONTINUOUSLY — never pause sending mid-session. Gemini's
            # automatic VAD handles turn boundaries, and `interrupted`
            # events handle barge-in (we stop AGENT playback, not user
            # input). Pausing inbound audio without an explicit
            # `audio_stream_end` leaves Gemini's audio buffer in an
            # indeterminate state — that's what broke multi-turn before
            # (turn 2+ audio reached Gemini but VAD never opened a new
            # user turn). Browser-side echoCancellation + a silent mic
            # gain prevent the agent's TTS from echoing back.

            forwarded_chunks = 0
            agent_audio_chunks = 0

            async def audio_input_loop() -> None:
                nonlocal last_audio_activity, forwarded_chunks
                exit_reason = "is_active_false"
                try:
                    while session.is_active:
                        try:
                            chunk = await asyncio.wait_for(
                                session.audio_in_queue.get(), timeout=AUDIO_QUEUE_POLL_TIMEOUT_S
                            )
                        except asyncio.TimeoutError:
                            if time.monotonic() - last_audio_activity > IDLE_TIMEOUT_SECONDS:
                                log.info(
                                    "[VOICE-IN] Voice idle timeout",
                                    extra={"session_id": session.session_id},
                                )
                                exit_reason = "idle_timeout"
                                session.is_active = False
                                try:
                                    await websocket.send_json({
                                        "type": "session_ended",
                                        "reason": "idle_timeout",
                                    })
                                except Exception:
                                    pass
                                return
                            continue
                        last_audio_activity = time.monotonic()
                        session.touch()
                        try:
                            await gemini_session.send_realtime_input(
                                audio=Blob(data=chunk, mime_type=AUDIO_IN_MIME_TYPE),
                            )
                        except Exception as e:
                            log.exception(
                                "[VOICE-IN-DEAD] send_realtime_input failed",
                                extra={
                                    "session_id": session.session_id,
                                    "error": repr(e),
                                    "forwarded_so_far": forwarded_chunks,
                                },
                            )
                            exit_reason = f"send_failed:{type(e).__name__}"
                            session.is_active = False
                            return
                        forwarded_chunks += 1
                        if forwarded_chunks % CHUNK_LOG_INTERVAL == 0:
                            log.info(
                                "[VOICE-IN] Mic chunks forwarded",
                                extra={
                                    "session_id": session.session_id,
                                    "forwarded": forwarded_chunks,
                                },
                            )
                except Exception as e:
                    log.exception(
                        "[VOICE-IN-DEAD] audio_input_loop crashed",
                        extra={
                            "session_id": session.session_id,
                            "error": repr(e),
                        },
                    )
                    exit_reason = f"crash:{type(e).__name__}"
                    raise
                finally:
                    log.warning(
                        "[VOICE-IN-EXIT] audio_input_loop exited",
                        extra={
                            "session_id": session.session_id,
                            "exit_reason": exit_reason,
                            "total_chunks_forwarded": forwarded_chunks,
                            "is_active": session.is_active,
                        },
                    )

            async def audio_output_loop() -> None:
                nonlocal last_audio_activity, agent_audio_chunks
                while session.is_active:
                    try:
                        chunk = await asyncio.wait_for(
                            session.audio_out_queue.get(), timeout=AUDIO_QUEUE_POLL_TIMEOUT_S
                        )
                    except asyncio.TimeoutError:
                        continue
                    last_audio_activity = time.monotonic()
                    try:
                        await websocket.send_bytes(chunk)
                        agent_audio_chunks += 1
                        if agent_audio_chunks % CHUNK_LOG_INTERVAL == 0:
                            log.info(
                                "Agent audio chunks sent",
                                extra={
                                    "session_id": session.session_id,
                                    "sent": agent_audio_chunks,
                                },
                            )
                    except Exception as e:
                        log.warning(
                            "send_bytes failed; closing",
                            extra={"session_id": session.session_id, "error": str(e)},
                        )
                        session.is_active = False
                        return

            async def gemini_response_loop() -> None:
                turn_count = 0
                exit_reason = "stream_end"
                try:
                    # OUTER LOOP: gemini_session.receive() returns ONE turn's
                    # iterator and then completes. We must call it again to
                    # get the next turn. Without this outer while, after turn
                    # 1 the inner async-for ends naturally and we sit idle
                    # while mic audio keeps streaming into a Gemini session
                    # that has no listener — ~80s later, 1011 keepalive.
                    while session.is_active:
                        try:
                            turn = gemini_session.receive()
                            async for response in turn:
                                if not session.is_active:
                                    exit_reason = "is_active_false"
                                    return
                                if getattr(response, "tool_call", None):
                                    log.info(
                                        "Tool call received",
                                        extra={
                                            "session_id": session.session_id,
                                            "forwarded_so_far": forwarded_chunks,
                                        },
                                    )
                                    # Fire-and-forget so the response loop
                                    # keeps reading Gemini events while the
                                    # Claude pipeline runs. NON_BLOCKING tool
                                    # behavior + WHEN_IDLE scheduling lets
                                    # Gemini chat freely until the result
                                    # arrives, then announce at a natural
                                    # pause.
                                    asyncio.create_task(
                                        _handle_tool_call(response.tool_call, session),
                                        name=f"tool_{session.session_id[:8]}",
                                    )
                                    continue

                                server_content = getattr(response, "server_content", None)
                                if server_content is None:
                                    continue

                                # Agent audio chunks via model_turn.parts[].inline_data
                                model_turn = getattr(server_content, "model_turn", None)
                                if model_turn is not None:
                                    for part in getattr(model_turn, "parts", []) or []:
                                        inline = getattr(part, "inline_data", None)
                                        if inline is not None and inline.data:
                                            await session.audio_out_queue.put(inline.data)

                                in_t = getattr(server_content, "input_transcription", None)
                                if in_t is not None and getattr(in_t, "text", None):
                                    log.info(
                                        "User transcript",
                                        extra={
                                            "session_id": session.session_id,
                                            "text": in_t.text[:120],
                                        },
                                    )
                                    await websocket.send_json({
                                        "type": "transcript",
                                        "source": "user",
                                        "text": in_t.text,
                                    })

                                out_t = getattr(server_content, "output_transcription", None)
                                if out_t is not None and getattr(out_t, "text", None):
                                    await websocket.send_json({
                                        "type": "transcript",
                                        "source": "agent",
                                        "text": out_t.text,
                                    })

                                # Barge-in: user spoke while agent was responding.
                                # Per Gemini docs: stop AGENT playback, do NOT
                                # pause user input. Just drain the outbound
                                # queue and tell the browser to silence.
                                if getattr(server_content, "interrupted", False):
                                    while not session.audio_out_queue.empty():
                                        try:
                                            session.audio_out_queue.get_nowait()
                                        except asyncio.QueueEmpty:
                                            break
                                    await websocket.send_json({"type": "interrupted"})
                                    log.info(
                                        "Agent interrupted by user",
                                        extra={"session_id": session.session_id},
                                    )

                                # End of agent turn — signal browser so the
                                # transcript bubble closes.
                                if getattr(server_content, "turn_complete", False):
                                    turn_count += 1
                                    await websocket.send_json({"type": "turn_complete"})
                                    log.info(
                                        f"[VOICE-TURN] turn #{turn_count} complete",
                                        extra={
                                            "session_id": session.session_id,
                                            "turn_count": turn_count,
                                            "forwarded_so_far": forwarded_chunks,
                                            "agent_audio_chunks": agent_audio_chunks,
                                        },
                                    )
                            # Inner async-for exited cleanly → this turn is
                            # done. Outer while re-enters to fetch turn N+1.
                            log.debug(
                                "[VOICE-TURN-LOOP] ready for next turn",
                                extra={
                                    "session_id": session.session_id,
                                    "turns_so_far": turn_count,
                                },
                            )
                        except StopAsyncIteration:
                            log.warning(
                                "[VOICE-STREAM-ENDED] Gemini stream ended",
                                extra={
                                    "session_id": session.session_id,
                                    "turns_completed": turn_count,
                                },
                            )
                            exit_reason = "gemini_disconnected"
                            session.is_active = False
                            break
                except Exception as e:
                    log.exception(
                        "[VOICE-RESPONSE-DEAD] gemini_response_loop crashed",
                        extra={
                            "session_id": session.session_id,
                            "error": repr(e),
                            "error_type": type(e).__name__,
                            "turns_completed": turn_count,
                        },
                    )
                    exit_reason = f"crash:{type(e).__name__}"
                    raise
                finally:
                    log.warning(
                        "[VOICE-RESPONSE-EXIT] gemini_response_loop exited",
                        extra={
                            "session_id": session.session_id,
                            "exit_reason": exit_reason,
                            "total_turns": turn_count,
                            "is_active": session.is_active,
                        },
                    )

            async def browser_message_loop() -> None:
                while session.is_active:
                    try:
                        msg = await websocket.receive()
                    except WebSocketDisconnect:
                        log.info(
                            "Browser disconnected",
                            extra={"session_id": session.session_id},
                        )
                        session.is_active = False
                        return

                    if msg.get("type") == "websocket.disconnect":
                        session.is_active = False
                        return

                    if "bytes" in msg and msg["bytes"] is not None:
                        await session.audio_in_queue.put(msg["bytes"])
                        continue

                    if "text" in msg and msg["text"] is not None:
                        import json as _json

                        try:
                            payload = _json.loads(msg["text"])
                        except _json.JSONDecodeError:
                            continue

                        kind = payload.get("type")
                        if kind == "text_input":
                            text = payload.get("text", "").strip()
                            if not text:
                                continue
                            await gemini_session.send_client_content(
                                turns={"role": "user", "parts": [{"text": text}]},
                                turn_complete=True,
                            )
                            await websocket.send_json({
                                "type": "transcript",
                                "source": "user",
                                "text": text,
                            })
                        elif kind == "end_session":
                            log.info(
                                "Browser requested end_session",
                                extra={"session_id": session.session_id},
                            )
                            session.is_active = False
                            return

            async with asyncio.TaskGroup() as tg:
                tg.create_task(audio_input_loop(), name="audio_input")
                tg.create_task(audio_output_loop(), name="audio_output")
                tg.create_task(gemini_response_loop(), name="gemini_response")
                tg.create_task(browser_message_loop(), name="browser_msg")
                # When any task returns / raises, the TaskGroup cancels siblings.

    except* WebSocketDisconnect:
        log.info(
            "Browser disconnect during session",
            extra={"session_id": session.session_id},
        )
    except* Exception as eg:
        for exc in eg.exceptions:
            log.error(
                "Voice session error",
                extra={"session_id": session.session_id, "error": repr(exc)},
            )
    finally:
        session.is_active = False
        if websocket.application_state.value == 1:  # CONNECTED
            try:
                await websocket.send_json({"type": "session_ended", "reason": "closed"})
            except Exception:
                pass
            try:
                await websocket.close()
            except Exception:
                pass
        log.info("Voice session closed", extra={"session_id": session.session_id})


# Per-tool scheduling for Phase 1 tools whose response dicts do NOT
# include the scheduling field themselves. Phase 2 tools embed the
# scheduling field directly in their `_phase2_response` payload, so
# they don't need entries here — _handle_tool_call's mix-in is a no-op
# when scheduling is already present.
#
# SILENT for toggle_theme because the user sees the visual change —
# verbal acknowledgement would be redundant. summarize_canvas is
# synchronous (no `behavior` field on its declaration), so the model
# already narrates the returned `result` inline.
_TOOL_SCHEDULING: dict[str, str] = {
    "query_data": "WHEN_IDLE",
    "generate_editorial": "WHEN_IDLE",
    "download_chart_png": "WHEN_IDLE",
    "toggle_theme": "SILENT",
}


async def _dispatch_one_call(call: Any, session: VoiceSession) -> dict[str, Any]:
    """Route a single function_call to the right executor. Catches any
    crash so a bad tool can't take down the dispatch task."""
    name = getattr(call, "name", "")
    args = getattr(call, "args", {}) or {}

    try:
        if name == "query_data":
            return await execute_query_data(
                question=args.get("question", ""),
                conversation_id=session.conversation_id,
                ws=session.ws,
                session_id=session.session_id,
            )
        if name == "generate_editorial":
            return await execute_generate_editorial(
                conversation_id=session.conversation_id,
                ws=session.ws,
                session_id=session.session_id,
            )
        if name == "download_chart_png":
            return await execute_download_chart_png(
                chart_id=args.get("chart_id"),
                ws=session.ws,
                session_id=session.session_id,
            )
        if name == "toggle_theme":
            return await execute_toggle_theme(
                ws=session.ws,
                session_id=session.session_id,
            )
        if name == "summarize_canvas":
            return execute_summarize_canvas(
                conversation_id=session.conversation_id,
                session_id=session.session_id,
            )
        # Phase 2 — canvas action surface
        if name == "delete_chart":
            return await execute_delete_chart(
                session_id=session.session_id,
                conversation_id=session.conversation_id,
                ws=session.ws,
                chart_id=args.get("chart_id"),
            )
        if name == "clear_canvas":
            return await execute_clear_canvas(
                session_id=session.session_id,
                conversation_id=session.conversation_id,
                ws=session.ws,
            )
        if name == "new_conversation":
            return await execute_new_conversation(
                session_id=session.session_id,
                conversation_id=session.conversation_id,
                ws=session.ws,
            )
        if name == "zoom_to":
            # Gemini occasionally sends level as a float despite the
            # integer schema; coerce defensively.
            level_raw = args.get("level", 100)
            try:
                level = int(level_raw)
            except (TypeError, ValueError):
                level = 100
            return await execute_zoom_to(
                session_id=session.session_id,
                conversation_id=session.conversation_id,
                ws=session.ws,
                level=level,
            )
        if name == "download_editorial_pdf":
            return await execute_download_editorial_pdf(
                session_id=session.session_id,
                conversation_id=session.conversation_id,
                ws=session.ws,
            )
    except Exception as e:
        log.exception(
            "tool executor crashed",
            extra={"session_id": session.session_id, "tool": name, "error": repr(e)},
        )
        return {"error": str(e), "message": "Something went wrong with that action."}

    log.warning(
        "Unknown tool call from Gemini",
        extra={"session_id": session.session_id, "name": name},
    )
    return {"error": f"Unknown tool: {name}"}


async def _handle_tool_call(tool_call: Any, session: VoiceSession) -> None:
    """Dispatch each function_call in the tool_call message. Each tool's
    scheduling hint (WHEN_IDLE / SILENT / unset for sync) is mixed into
    its response dict — that's how Gemini knows whether to announce the
    result and when.
    """
    function_responses: list[FunctionResponse] = []
    for call in getattr(tool_call, "function_calls", []) or []:
        name = getattr(call, "name", "")
        response_payload = await _dispatch_one_call(call, session)

        # Mix in the scheduling field for non-blocking tools.
        # Synchronous tools (summarize_canvas) get no scheduling because
        # the model uses the returned `result` string inline.
        scheduling = _TOOL_SCHEDULING.get(name)
        scheduled_response = (
            {**response_payload, "scheduling": scheduling}
            if scheduling is not None
            else response_payload
        )

        function_responses.append(
            FunctionResponse(
                id=getattr(call, "id", None),
                name=name,
                response=scheduled_response,
            )
        )

    if not function_responses:
        return

    try:
        await session.gemini_session.send_tool_response(
            function_responses=function_responses,
        )
    except Exception as e:
        log.exception(
            "send_tool_response failed",
            extra={"session_id": session.session_id, "error": repr(e)},
        )
