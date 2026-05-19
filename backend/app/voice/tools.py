"""Voice tool definitions + executors.

Gemini Live has five callable tools + the built-in Google Search
grounding (configured in client.py). All non-blocking, async tools use
NON_BLOCKING + WHEN_IDLE scheduling so the model can keep the
conversation flowing while the background work runs. summarize_canvas is
synchronous because the model must narrate its result inline.

| Tool                 | behavior     | scheduling | UI side-effect                |
|----------------------|--------------|------------|-------------------------------|
| query_data           | NON_BLOCKING | WHEN_IDLE  | chart card appears            |
| generate_editorial   | NON_BLOCKING | WHEN_IDLE  | editorial overlay opens       |
| download_chart_png   | NON_BLOCKING | WHEN_IDLE  | PNG saved to Downloads        |
| toggle_theme         | NON_BLOCKING | SILENT     | dark/light flip               |
| summarize_canvas     | (sync)       | -          | inline narration only         |
"""

from __future__ import annotations

from typing import Any, Literal

from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder
from google.genai.types import Behavior, FunctionDeclaration

from app.conversation import get_store
from app.logger import get_logger
from app.services.chart_pipeline import generate_chart_for_question
from app.services.editorial_pipeline import generate_editorial_for_conversation

log = get_logger("voice.tools")


# ---------------------------------------------------------------------------
# Phase 2 response shape
# ---------------------------------------------------------------------------
#
# Phase 2 tools standardize on a single dict shape so Gemini sees a
# consistent surface and the next tool author has a clear template.
# Phase 1 executors keep their drifted shapes — see memory entry on
# `aperture_voice_tool_response_shape` for the rationale.

Phase2Status = Literal["ok", "error", "needs_action"]
Phase2Scheduling = Literal["WHEN_IDLE", "SILENT"]


def _phase2_response(
    status: Phase2Status,
    message: str,
    scheduling: Phase2Scheduling,
    data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Phase 2 unified tool response.

    Args:
      status: "ok" | "error" | "needs_action" — disambiguates outcomes for
        the model. "needs_action" means the user must do something else
        first (e.g., generate an editorial before downloading it).
      message: what Gemini narrates. Silent scheduling skips speech but
        the model still reads the field for context.
      scheduling: "WHEN_IDLE" (announce at next pause) or "SILENT" (suppress
        verbal acknowledgement; the UI side-effect is the confirmation).
      data: optional structured payload; absent if there's nothing useful.

    Returns the dict that handler.py forwards to Gemini via FunctionResponse.
    """
    return {
        "status": status,
        "message": message,
        "data": data,
        "scheduling": scheduling,
    }


# ---------------------------------------------------------------------------
# Tool declarations
# ---------------------------------------------------------------------------


QUERY_DATA_TOOL = FunctionDeclaration(
    name="query_data",
    behavior=Behavior.NON_BLOCKING,
    description=(
        "Run an analytics query against the voicebot dataset. "
        "The chart appears on the user's canvas automatically. "
        "Reply verbally with one or two sentences — the headline finding only."
    ),
    parameters={
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description": "The user's question, verbatim, in their language.",
            },
        },
        "required": ["question"],
    },
)


GENERATE_EDITORIAL_TOOL = FunctionDeclaration(
    name="generate_editorial",
    behavior=Behavior.NON_BLOCKING,
    description=(
        "Generate a publication-grade editorial briefing PDF from the charts "
        "currently on the user's canvas. Use when the user asks for a briefing, "
        "report, summary document, magazine, editorial, executive summary, or "
        "PDF. Takes about 30 seconds. Requires at least 2 charts already on "
        "screen."
    ),
    parameters={"type": "object", "properties": {}},
)


DOWNLOAD_CHART_PNG_TOOL = FunctionDeclaration(
    name="download_chart_png",
    behavior=Behavior.NON_BLOCKING,
    description=(
        "Save the user's chart as a PNG image. If chart_id is omitted, "
        "downloads the most recent chart. Use when the user asks to save, "
        "download, or export a chart as an image or file."
    ),
    parameters={
        "type": "object",
        "properties": {
            "chart_id": {
                "type": "string",
                "description": (
                    "Optional. UUID of the chart to download. Omit to "
                    "download the most recent."
                ),
            }
        },
    },
)


TOGGLE_THEME_TOOL = FunctionDeclaration(
    name="toggle_theme",
    behavior=Behavior.NON_BLOCKING,
    description=(
        "Toggle the canvas between dark and light theme. Use when the user "
        "asks to switch theme, dark mode, light mode, brightness, or color scheme."
    ),
    parameters={"type": "object", "properties": {}},
)


SUMMARIZE_CANVAS_TOOL = FunctionDeclaration(
    name="summarize_canvas",
    # No behavior field = synchronous. Gemini waits for the result text to narrate.
    description=(
        "Get a short text summary of the charts currently on the user's canvas. "
        "Use when the user asks what's on screen, what they've looked at, what "
        "charts they have, or for a recap. Do NOT use to answer specific data "
        "questions — use query_data for those."
    ),
    parameters={"type": "object", "properties": {}},
)


# ---------------------------------------------------------------------------
# Phase 2 declarations
# ---------------------------------------------------------------------------


DELETE_CHART_TOOL = FunctionDeclaration(
    name="delete_chart",
    behavior=Behavior.NON_BLOCKING,
    description=(
        "Remove a specific chart from the user's canvas. If chart_id is omitted, "
        "deletes the most recent chart. Use when the user says delete, remove, "
        "get rid of, or take away a chart."
    ),
    parameters={
        "type": "object",
        "properties": {
            "chart_id": {
                "type": "string",
                "description": (
                    "Optional UUID of the chart to delete. Omit to delete the "
                    "most recent."
                ),
            }
        },
    },
)


CLEAR_CANVAS_TOOL = FunctionDeclaration(
    name="clear_canvas",
    behavior=Behavior.NON_BLOCKING,
    description=(
        "Remove all charts from the canvas at once. Use when the user says "
        "clear, wipe, reset the canvas, start fresh, clean slate, or remove "
        "everything. Does NOT reset the conversation — Claude still remembers "
        "prior context."
    ),
    parameters={"type": "object", "properties": {}},
)


NEW_CONVERSATION_TOOL = FunctionDeclaration(
    name="new_conversation",
    behavior=Behavior.NON_BLOCKING,
    description=(
        "Start a completely fresh conversation: clears the canvas AND resets "
        "conversation memory so Claude no longer remembers prior context. Use "
        "when the user says new conversation, start over, fresh start, "
        "different topic, or reset everything."
    ),
    parameters={"type": "object", "properties": {}},
)


ZOOM_TO_TOOL = FunctionDeclaration(
    name="zoom_to",
    behavior=Behavior.NON_BLOCKING,
    description=(
        "Change the canvas zoom level. Pass an integer percentage between 25 "
        "and 200. For 'zoom in' use a value 25 higher than the user's likely "
        "current zoom (default 100); 'zoom out' 25 lower; 'reset zoom' use 100."
    ),
    parameters={
        "type": "object",
        "properties": {
            "level": {
                "type": "integer",
                "description": "Target zoom percentage, 25-200. Default is 100.",
            }
        },
        "required": ["level"],
    },
)


DOWNLOAD_EDITORIAL_PDF_TOOL = FunctionDeclaration(
    name="download_editorial_pdf",
    behavior=Behavior.NON_BLOCKING,
    description=(
        "Download the currently-generated editorial briefing as a PDF. "
        "Requires an editorial to have been generated first (via "
        "generate_editorial). If no editorial exists, this fails with a "
        "helpful message."
    ),
    parameters={"type": "object", "properties": {}},
)


VOICE_FUNCTION_DECLARATIONS = [
    QUERY_DATA_TOOL,
    GENERATE_EDITORIAL_TOOL,
    DOWNLOAD_CHART_PNG_TOOL,
    TOGGLE_THEME_TOOL,
    SUMMARIZE_CANVAS_TOOL,
    # Phase 2 — canvas action surface
    DELETE_CHART_TOOL,
    CLEAR_CANVAS_TOOL,
    NEW_CONVERSATION_TOOL,
    ZOOM_TO_TOOL,
    DOWNLOAD_EDITORIAL_PDF_TOOL,
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _short_verbal_confirmation(chart_type: str, explanation: str) -> str:
    base = explanation.strip() if explanation else ""
    if not base:
        return f"Showing a {chart_type} chart now."
    return base


async def _safe_send(ws: WebSocket, payload: dict[str, Any], session_id: str) -> None:
    """Best-effort send_json. WS may close mid-flight; don't crash the dispatch."""
    try:
        await ws.send_json(payload)
    except Exception as e:
        log.warning(
            "voice WS send failed",
            extra={
                "session_id": session_id,
                "type": payload.get("type"),
                "error": str(e),
            },
        )


# ---------------------------------------------------------------------------
# query_data — existing
# ---------------------------------------------------------------------------


async def execute_query_data(
    question: str,
    conversation_id: str,
    ws: WebSocket,
    session_id: str,
) -> dict[str, Any]:
    """Run a data question through the chart pipeline and push the chart.

    NON_BLOCKING + WHEN_IDLE: Gemini keeps the conversation flowing while
    this runs (~3-7s). The chart appears on screen the moment we resolve;
    Gemini announces the headline finding at the next natural pause.

    Side effects:
      - Sends `tool_started` on entry.
      - Sends `chart_ready` on success (with full spec + data payload).
      - Sends `tool_failed` on pipeline error / clarification / crash.

    Returns the function-response payload Gemini reads. handler.py
    appends the scheduling hint.
    """
    log.info(
        "query_data invoked",
        extra={
            "session_id": session_id,
            "conversation_id": conversation_id,
            "question_chars": len(question),
        },
    )

    await _safe_send(
        ws,
        {"type": "tool_started", "tool": "query_data", "question_preview": question[:140]},
        session_id,
    )

    try:
        result = await generate_chart_for_question(
            question,
            conversation_id=conversation_id,
        )
    except Exception as e:
        log.exception(
            "query_data pipeline crashed",
            extra={"session_id": session_id, "error": repr(e)},
        )
        await _safe_send(ws, {"type": "tool_failed", "tool": "query_data", "reason": str(e)[:200]}, session_id)
        return {"error": str(e), "message": "I couldn't run that query. Could you rephrase?"}

    if result.status == "error":
        log.warning(
            "query_data pipeline error",
            extra={"session_id": session_id, "error": result.error},
        )
        await _safe_send(ws, {"type": "tool_failed", "tool": "query_data", "reason": result.error or "internal_error"}, session_id)
        return {"error": result.error or "internal_error", "message": "I couldn't run that query. Could you rephrase?"}

    if result.status == "clarification":
        log.info("query_data clarification", extra={"session_id": session_id})
        await _safe_send(ws, {"type": "tool_failed", "tool": "query_data", "reason": "needs_clarification"}, session_id)
        return {
            "needs_clarification": True,
            "message": (
                result.clarification_question
                or result.explanation
                or "I need a bit more detail to answer that."
            ),
        }

    payload = jsonable_encoder({
        "type": "chart_ready",
        "chart_id": result.chart_id,
        "chart_spec": result.spec.model_dump(),
        "data": result.data,
        "panel_data": result.panel_data,
        "explanation": result.explanation,
    })
    await _safe_send(ws, payload, session_id)

    log.info(
        "query_data chart pushed",
        extra={
            "session_id": session_id,
            "conversation_id": conversation_id,
            "chart_id": result.chart_id,
            "chart_type": result.spec.chartType,
            "rows": len(result.data),
            "panels": len(result.panel_data) if result.panel_data else 0,
        },
    )

    return {
        "ok": True,
        "chart_type": result.spec.chartType,
        "message": _short_verbal_confirmation(result.spec.chartType, result.explanation),
    }


# ---------------------------------------------------------------------------
# generate_editorial — async, ~30s
# ---------------------------------------------------------------------------


async def execute_generate_editorial(
    conversation_id: str,
    ws: WebSocket,
    session_id: str,
) -> dict[str, Any]:
    """Compose a publication-grade editorial briefing for the conversation.

    NON_BLOCKING + WHEN_IDLE: ~30s server-side, so Gemini chats with the
    user while the pipeline runs. Editorial appears on screen the moment
    we resolve.

    Side effects:
      - Sends `tool_started` (overlay shows "composing briefing" pill).
      - On success: `editorial_ready` with the full EditorialResponse.
      - On not-enough-charts / declined / error: `tool_failed`.

    Returns the function-response payload — message field tells Gemini
    what to say.
    """
    log.info(
        "generate_editorial invoked",
        extra={"session_id": session_id, "conversation_id": conversation_id},
    )
    await _safe_send(
        ws,
        {"type": "tool_started", "tool": "generate_editorial"},
        session_id,
    )

    try:
        result = await generate_editorial_for_conversation(conversation_id)
    except Exception as e:
        log.exception(
            "generate_editorial crashed",
            extra={"session_id": session_id, "error": repr(e)},
        )
        await _safe_send(ws, {"type": "tool_failed", "tool": "generate_editorial", "reason": str(e)[:200]}, session_id)
        return {
            "error": "generation_failed",
            "message": "I couldn't generate the editorial right now.",
        }

    if result.status == "needs_more_charts":
        log.info(
            "generate_editorial needs_more_charts",
            extra={"session_id": session_id, "chart_count": result.chart_count},
        )
        await _safe_send(ws, {"type": "tool_failed", "tool": "generate_editorial", "reason": "needs_more_charts"}, session_id)
        return {
            "needs_more_charts": True,
            "message": (
                "The user needs at least 2 charts on screen before I can "
                "generate an editorial. Tell them briefly to ask a couple "
                "of questions first."
            ),
        }

    if result.status in ("declined", "error"):
        log.warning(
            "generate_editorial declined/errored",
            extra={"session_id": session_id, "status": result.status, "error": result.error},
        )
        await _safe_send(ws, {"type": "tool_failed", "tool": "generate_editorial", "reason": result.status}, session_id)
        return {
            "error": result.status,
            "message": "I couldn't generate the briefing this time. Want me to try again?",
        }

    assert result.editorial is not None
    payload = jsonable_encoder({
        "type": "editorial_ready",
        "editorial": result.editorial.model_dump(),
    })
    await _safe_send(ws, payload, session_id)

    log.info(
        "editorial_ready pushed",
        extra={
            "session_id": session_id,
            "conversation_id": conversation_id,
            "chart_count": result.chart_count,
        },
    )

    return {
        "ok": True,
        "message": (
            "Editorial briefing is ready. It's on screen now — they can "
            "review or download as PDF."
        ),
    }


# ---------------------------------------------------------------------------
# download_chart_png — instant action
# ---------------------------------------------------------------------------


async def execute_download_chart_png(
    chart_id: str | None,
    ws: WebSocket,
    session_id: str,
) -> dict[str, Any]:
    """Tell the browser to capture and save a chart as PNG.

    Args:
      chart_id: UUID of the chart to download, or None to take the latest.
        Resolution happens on the frontend (it has the DOM, we don't).

    Side effects:
      - Sends `action_download_chart_png` on ws — frontend serializes the
        matching `[data-chart-id]` element via downloadElementAsPNG.

    No analyzing pill: this is an instant action. Verbal confirmation is
    short ("saved") at WHEN_IDLE scheduling (mixed in by handler.py).
    """
    log.info(
        "download_chart_png invoked",
        extra={"session_id": session_id, "chart_id": chart_id},
    )
    await _safe_send(
        ws,
        {"type": "action_download_chart_png", "chart_id": chart_id},
        session_id,
    )
    return {"ok": True, "message": "Saved."}


# ---------------------------------------------------------------------------
# toggle_theme — silent flip
# ---------------------------------------------------------------------------


async def execute_toggle_theme(
    ws: WebSocket,
    session_id: str,
) -> dict[str, Any]:
    """Flip the canvas between dark and light theme.

    Side effects:
      - Sends `action_toggle_theme` on ws — frontend toggles via next-themes.

    Returns a stub payload; handler.py mixes in `scheduling: SILENT` so
    Gemini does NOT verbally acknowledge (the visual flip is the
    confirmation; speech would be redundant).
    """
    log.info("toggle_theme invoked", extra={"session_id": session_id})
    await _safe_send(ws, {"type": "action_toggle_theme"}, session_id)
    return {"ok": True, "message": "Theme toggled."}


# ---------------------------------------------------------------------------
# summarize_canvas — synchronous, returns text Gemini narrates
# ---------------------------------------------------------------------------


def execute_summarize_canvas(
    conversation_id: str,
    session_id: str,
) -> dict[str, Any]:
    """Compose a short text summary of the charts on the canvas.

    Synchronous (no `behavior` on the tool declaration) so Gemini blocks
    on the response and narrates the returned `result` inline. No WS
    side-effects, no analyzing pill — the user feels this as an instant
    answer with no visual indicator.
    """
    log.info(
        "summarize_canvas invoked",
        extra={"session_id": session_id, "conversation_id": conversation_id},
    )
    try:
        store = get_store()
        turns = store.get_history(conversation_id)

        if not turns:
            return {
                "result": (
                    "The canvas is empty — no charts yet in this conversation."
                ),
            }

        chart_lines: list[str] = []
        for t in turns:
            spec = t.tool_input.get("chart_spec") if isinstance(t.tool_input, dict) else None
            if not spec:
                continue
            title = spec.get("title") or "Untitled chart"
            ctype = spec.get("chartType") or "chart"
            chart_lines.append(f"- {title} ({ctype})")

        if not chart_lines:
            return {
                "result": (
                    "The canvas is empty — no charts have been generated yet."
                ),
            }

        summary = (
            f"The canvas currently has {len(chart_lines)} chart"
            f"{'s' if len(chart_lines) > 1 else ''}:\n" + "\n".join(chart_lines)
        )
        return {"result": summary}
    except Exception as e:
        log.exception(
            "summarize_canvas crashed",
            extra={"session_id": session_id, "error": repr(e)},
        )
        return {
            "result": (
                "I couldn't read the canvas state just now — but the charts "
                "are still there on screen."
            ),
        }


# ---------------------------------------------------------------------------
# Phase 2 executors — all use _phase2_response for unified shape
# ---------------------------------------------------------------------------


async def execute_delete_chart(
    session_id: str,
    conversation_id: str,
    ws: WebSocket,
    chart_id: str | None,
) -> dict[str, Any]:
    """Tell the frontend to remove one chart from the canvas.

    Args:
      chart_id: UUID of the chart to delete, or None for the most recent.
        Resolution + state update happen on the frontend.

    Side effects:
      - Sends `action_delete_chart` on ws. Frontend filters the chart out
        of the canvas state; missing-id is a graceful no-op there.

    SILENT scheduling: deletion is visually obvious; no verbal narration.
    """
    log.info(
        "delete_chart invoked",
        extra={"session_id": session_id, "chart_id": chart_id},
    )
    try:
        await ws.send_json({"type": "action_delete_chart", "chart_id": chart_id})
        return _phase2_response("ok", "Chart removed.", "SILENT")
    except Exception as e:
        log.exception(
            "delete_chart failed",
            extra={"session_id": session_id, "error": repr(e)},
        )
        return _phase2_response("error", "Couldn't remove the chart.", "WHEN_IDLE")


async def execute_clear_canvas(
    session_id: str,
    conversation_id: str,
    ws: WebSocket,
) -> dict[str, Any]:
    """Tell the frontend to remove all charts. Conversation memory preserved.

    WHEN_IDLE scheduling so Gemini confirms briefly ("canvas cleared") —
    the action is destructive enough to warrant a verbal acknowledgement.
    """
    log.info("clear_canvas invoked", extra={"session_id": session_id})
    try:
        await ws.send_json({"type": "action_clear_canvas"})
        return _phase2_response(
            "ok",
            "Canvas cleared. I still remember what we discussed.",
            "WHEN_IDLE",
        )
    except Exception as e:
        log.exception(
            "clear_canvas failed",
            extra={"session_id": session_id, "error": repr(e)},
        )
        return _phase2_response("error", "Couldn't clear the canvas.", "WHEN_IDLE")


async def execute_new_conversation(
    session_id: str,
    conversation_id: str,
    ws: WebSocket,
) -> dict[str, Any]:
    """Reset everything: canvas, conversation_id, and Claude memory.

    Side effects:
      - Sends `action_new_conversation` to the frontend. Frontend mints
        a new conversation_id and clears all canvas state.
      - Future `query_data` calls use the new conversation_id — Claude's
        in-process store sees no history for the new id.

    WHEN_IDLE so Gemini confirms ("starting fresh") — this is destructive
    and the user should hear that it happened.
    """
    log.info(
        "new_conversation invoked",
        extra={"session_id": session_id, "old_conversation_id": conversation_id},
    )
    try:
        await ws.send_json({"type": "action_new_conversation"})
        return _phase2_response(
            "ok",
            "Starting fresh. Canvas cleared and conversation reset.",
            "WHEN_IDLE",
        )
    except Exception as e:
        log.exception(
            "new_conversation failed",
            extra={"session_id": session_id, "error": repr(e)},
        )
        return _phase2_response(
            "error", "Couldn't start a new conversation.", "WHEN_IDLE"
        )


async def execute_zoom_to(
    session_id: str,
    conversation_id: str,
    ws: WebSocket,
    level: int,
) -> dict[str, Any]:
    """Set canvas zoom level (25–200 percent).

    Backend clamps for safety; frontend also clamps to its own range.
    SILENT scheduling — the visual change is the confirmation.
    """
    clamped = max(25, min(200, int(level)))
    log.info(
        "zoom_to invoked",
        extra={"session_id": session_id, "requested": level, "clamped": clamped},
    )
    try:
        await ws.send_json({"type": "action_zoom_to", "level": clamped})
        return _phase2_response(
            "ok", f"Zoom set to {clamped}%.", "SILENT", data={"level": clamped}
        )
    except Exception as e:
        log.exception(
            "zoom_to failed",
            extra={"session_id": session_id, "error": repr(e)},
        )
        return _phase2_response("error", "Couldn't change the zoom.", "WHEN_IDLE")


async def execute_download_editorial_pdf(
    session_id: str,
    conversation_id: str,
    ws: WebSocket,
) -> dict[str, Any]:
    """Trigger the PDF capture for the currently-rendered editorial.

    Optimistic: we tell Gemini "downloading" and let the frontend's
    reality-check decide whether a file actually lands (it checks
    `editorialRef.current` and returns early if no editorial is open).
    Phase 2 stays fire-and-forget like the other UI tools — round-tripping
    a confirmation would add a hop without much UX gain.

    WHEN_IDLE so Gemini confirms verbally.
    """
    log.info(
        "download_editorial_pdf invoked",
        extra={"session_id": session_id, "conversation_id": conversation_id},
    )
    try:
        await ws.send_json({"type": "action_download_editorial_pdf"})
        return _phase2_response(
            "ok", "Downloading the briefing as PDF.", "WHEN_IDLE"
        )
    except Exception as e:
        log.exception(
            "download_editorial_pdf failed",
            extra={"session_id": session_id, "error": repr(e)},
        )
        return _phase2_response(
            "error", "Couldn't download the briefing.", "WHEN_IDLE"
        )
