"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { useAudioCapture } from "./use-audio-capture";
import { useAudioPlayback } from "./use-audio-playback";
import {
  type ChartReadyMessage,
  type ToolInFlight,
  voiceMessageSchema,
} from "./voice-messages";

const log = createLogger("voice.session");

/** Window during which incoming transcript fragments from the same source
 *  (user or agent) are concatenated into one bubble. Past this window, a
 *  new bubble is started. 4s comfortably spans the longest pauses inside
 *  a single utterance while still splitting consecutive turns. */
const TRANSCRIPT_COALESCE_MS = 4000;

export type TranscriptTurn = {
  id: string;
  source: "user" | "agent";
  text: string;
  timestamp: number;
};

export type VoiceChartReady = {
  chart_id: string;
  chart_spec: unknown;
  data: Array<Record<string, unknown>>;
  panel_data?: Array<Array<Record<string, unknown>>> | null;
  explanation: string;
};

type StartOptions = {
  conversationId: string;
  onChartReady: (payload: VoiceChartReady) => void;
  onEditorialReady?: (editorial: unknown) => void;
  onDownloadChartPng?: (chartId: string | null | undefined) => void;
  onToggleTheme?: () => void;
  // Phase 2 canvas action surface
  onDeleteChart?: (chartId: string | null | undefined) => void;
  onClearCanvas?: () => void;
  onNewConversation?: () => void;
  onZoomTo?: (level: number) => void;
  onDownloadEditorialPdf?: () => void;
  onEnd?: (reason: string) => void;
};

export type VoicePhase = "idle" | "connecting" | "active" | "closing";

export class VoiceMicPermissionError extends Error {
  constructor(cause?: unknown) {
    super("Microphone access denied");
    this.name = "VoiceMicPermissionError";
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

type VoiceSessionHandle = {
  phase: VoicePhase;
  isActive: boolean;
  isAgentSpeaking: boolean;
  transcript: TranscriptTurn[];
  amplitude: number;
  /** State for the in-flight async tool call. Carries the tool name
   *  so the overlay pill can show "analyzing" vs "composing briefing". */
  toolInFlight: ToolInFlight;
  start: (opts: StartOptions) => Promise<void>;
  stop: (reason?: string) => Promise<void>;
  sendTextInput: (text: string) => void;
};

function deriveVoiceWsUrl(): string {
  const explicit = env.NEXT_PUBLIC_VOICE_WS_URL;
  if (explicit) return explicit;
  const backend = env.NEXT_PUBLIC_BACKEND_URL;
  const wsProto = backend.startsWith("https://") ? "wss://" : "ws://";
  const stripped = backend.replace(/^https?:\/\//, "");
  return `${wsProto}${stripped}/ws/voice`;
}

function isMicPermissionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // getUserMedia rejects with DOMException; name is "NotAllowedError"
  // when the user denies, or "NotFoundError" when no device.
  return (
    err.name === "NotAllowedError" ||
    err.name === "NotFoundError" ||
    err.name === "SecurityError" ||
    /permission/i.test(err.message)
  );
}

export function useVoiceSession(): VoiceSessionHandle {
  const wsRef = useRef<WebSocket | null>(null);
  const optsRef = useRef<StartOptions | null>(null);
  const transcriptBufRef = useRef<Map<string, TranscriptTurn>>(new Map());
  const ampRafRef = useRef<number | null>(null);
  // Single-flight phase guard. Only `idle` allows start(); only `active`
  // allows stop(). Other clicks during transitions are rejected silently.
  const phaseRef = useRef<VoicePhase>("idle");

  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [amplitude, setAmplitude] = useState(0);
  const [toolInFlight, setToolInFlight] = useState<ToolInFlight>({
    active: false,
  });

  const capture = useAudioCapture();
  const playback = useAudioPlayback();

  const setPhaseBoth = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const appendTranscript = useCallback(
    (source: "user" | "agent", text: string) => {
      if (!text) return;
      const key = `${source}-current`;
      const buf = transcriptBufRef.current;
      const existing = buf.get(key);
      if (existing && Date.now() - existing.timestamp < TRANSCRIPT_COALESCE_MS) {
        existing.text += text;
        existing.timestamp = Date.now();
      } else {
        const fresh: TranscriptTurn = {
          id: crypto.randomUUID(),
          source,
          text,
          timestamp: Date.now(),
        };
        buf.set(key, fresh);
      }
      setTranscript(
        Array.from(buf.values()).sort((a, b) => a.timestamp - b.timestamp),
      );
    },
    [],
  );

  const finalizeAgentTurn = useCallback(() => {
    transcriptBufRef.current.delete("agent-current");
    setIsAgentSpeaking(false);
  }, []);

  /**
   * Tear-down order matters: kill PLAYBACK first (close ctx → silences
   * scheduled audio immediately), then capture (releases mic), then WS.
   * Reversing this would let the last 100-300ms of agent speech trail
   * after the overlay closes.
   */
  const stop = useCallback(
    async (reason: string = "user_toggle") => {
      // Reject if not in a stable-to-stop state.
      if (phaseRef.current === "idle" || phaseRef.current === "closing") {
        return;
      }
      setPhaseBoth("closing");
      log.info("Stopping voice session", { reason });

      if (ampRafRef.current !== null) {
        cancelAnimationFrame(ampRafRef.current);
        ampRafRef.current = null;
      }

      // 1. Kill audio playback FIRST. ctx.close() cancels all scheduled
      //    AudioBufferSource nodes immediately.
      playback.stopAudio();
      try {
        await playback.destroy();
      } catch (err) {
        log.warn("playback.destroy failed", { error: String(err) });
      }

      // 2. Release mic + capture audio graph.
      try {
        await capture.stop();
      } catch (err) {
        log.warn("capture.stop failed", { error: String(err) });
      }

      // 3. Close WS last — server-side handler will tear down Gemini session.
      const ws = wsRef.current;
      if (ws) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "end_session" }));
          }
          ws.close();
        } catch {
          // ignore — already closed or never opened
        }
      }
      wsRef.current = null;

      setIsAgentSpeaking(false);
      setAmplitude(0);
      setToolInFlight({ active: false });
      setPhaseBoth("idle");

      const onEnd = optsRef.current?.onEnd;
      optsRef.current = null;
      onEnd?.(reason);
    },
    [capture, playback, setPhaseBoth],
  );

  const start = useCallback(
    async (opts: StartOptions) => {
      // Single-flight: only allowed from idle.
      if (phaseRef.current !== "idle") {
        log.debug("start() ignored — phase not idle", {
          phase: phaseRef.current,
        });
        return;
      }
      setPhaseBoth("connecting");
      optsRef.current = opts;
      transcriptBufRef.current.clear();
      setTranscript([]);

      // 1. Request mic permission + init audio graphs FIRST.
      //    If user denies, throw before any WS opens. Caller catches and
      //    shows the inline toast.
      try {
        await playback.init();
        await capture.init((chunk) => {
          const ws = wsRef.current;
          // Drop chunks when the WS isn't open — happens briefly at
          // open / close transitions. Continuous-stream invariant per
          // Gemini docs: never pause sending mid-session, but it's
          // fine to drop while the socket isn't connected.
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          ws.send(chunk);
        });
      } catch (err) {
        log.error("Audio init failed", {
          error: String(err),
          name: (err as Error)?.name,
        });
        // Tear down whatever opened.
        try {
          await capture.stop();
        } catch {
          // ignore
        }
        try {
          await playback.destroy();
        } catch {
          // ignore
        }
        optsRef.current = null;
        setPhaseBoth("idle");
        if (isMicPermissionError(err)) {
          throw new VoiceMicPermissionError(err);
        }
        throw err;
      }

      // 2. Open WS. Mic is hot but onChunk drops messages until ws is open.
      const url = `${deriveVoiceWsUrl()}?conversation_id=${encodeURIComponent(
        opts.conversationId,
      )}`;
      log.info("Opening voice WS", { url });
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = async () => {
        log.info("Voice WS open");
        try {
          await capture.resume();
        } catch (err) {
          log.warn("capture.resume failed", { error: String(err) });
        }
        setPhaseBoth("active");

        const tick = () => {
          const playAmp = playback.getAmplitude();
          const capAmp = capture.getAmplitude();
          const blend = Math.max(playAmp * 3, capAmp * 1.5);
          setAmplitude(Math.min(1, blend));
          setIsAgentSpeaking(playAmp > 0.01);
          ampRafRef.current = requestAnimationFrame(tick);
        };
        ampRafRef.current = requestAnimationFrame(tick);
      };

      ws.onmessage = (ev) => {
        if (ev.data instanceof ArrayBuffer) {
          // Drop audio if we're already closing — prevents tail playback.
          if (phaseRef.current !== "active") return;
          playback.enqueueAudio(ev.data);
          return;
        }
        // Text frame — validate against Zod schema, never trust the wire.
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(ev.data as string);
        } catch (e) {
          log.warn("Voice WS: malformed JSON frame", { error: String(e) });
          return;
        }
        const result = voiceMessageSchema.safeParse(parsedJson);
        if (!result.success) {
          log.warn("Voice WS: unknown message shape", {
            error: result.error.issues[0]?.message,
          });
          return;
        }
        const msg = result.data;
        switch (msg.type) {
          case "session_started":
            log.info("session_started", {
              session_id: msg.session_id,
              conversation_id: msg.conversation_id,
            });
            break;
          case "transcript":
            appendTranscript(msg.source, msg.text);
            if (msg.source === "agent") setIsAgentSpeaking(true);
            break;
          case "chart_ready":
            log.info("chart_ready", { chart_id: msg.chart_id });
            setToolInFlight({ active: false });
            opts.onChartReady(msg as ChartReadyMessage);
            break;
          case "tool_started":
            log.info("tool_started", { tool: msg.tool });
            setToolInFlight({ active: true, tool: msg.tool });
            break;
          case "tool_failed":
            log.warn("tool_failed", { tool: msg.tool, reason: msg.reason });
            setToolInFlight({ active: false });
            break;
          case "editorial_ready":
            log.info("editorial_ready");
            setToolInFlight({ active: false });
            opts.onEditorialReady?.(msg.editorial);
            break;
          case "action_download_chart_png":
            log.info("action_download_chart_png", { chart_id: msg.chart_id });
            opts.onDownloadChartPng?.(msg.chart_id ?? null);
            break;
          case "action_toggle_theme":
            log.info("action_toggle_theme");
            opts.onToggleTheme?.();
            break;
          // Phase 2 — canvas action surface. Each callback reads canvas
          // state via refs (set up in canvas/page.tsx per Task 7a), so
          // closures captured at session start stay correct as charts
          // / theme / editorial mutate.
          case "action_delete_chart":
            log.info("action_delete_chart", { chart_id: msg.chart_id });
            opts.onDeleteChart?.(msg.chart_id ?? null);
            break;
          case "action_clear_canvas":
            log.info("action_clear_canvas");
            opts.onClearCanvas?.();
            break;
          case "action_new_conversation":
            log.info("action_new_conversation");
            opts.onNewConversation?.();
            break;
          case "action_zoom_to":
            log.info("action_zoom_to", { level: msg.level });
            opts.onZoomTo?.(msg.level);
            break;
          case "action_download_editorial_pdf":
            log.info("action_download_editorial_pdf");
            opts.onDownloadEditorialPdf?.();
            break;
          case "interrupted":
            log.info("interrupted");
            playback.stopAudio();
            finalizeAgentTurn();
            break;
          case "turn_complete":
            // Agent finished its current reply. Close the current
            // agent-bubble so the next agent turn starts a fresh bubble.
            finalizeAgentTurn();
            break;
          case "session_ended":
            log.info("session_ended", { reason: msg.reason });
            void stop(msg.reason ?? "server_closed");
            break;
          case "session_error":
            log.error("session_error", { message: msg.message });
            void stop("error");
            break;
        }
      };

      ws.onerror = (e) => {
        log.error("Voice WS error", { e: String(e) });
      };

      ws.onclose = () => {
        log.info("Voice WS closed");
        if (
          phaseRef.current === "connecting" ||
          phaseRef.current === "active"
        ) {
          void stop("ws_closed");
        }
      };
    },
    [
      capture,
      playback,
      appendTranscript,
      finalizeAgentTurn,
      stop,
      setPhaseBoth,
    ],
  );

  const sendTextInput = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "text_input", text }));
  }, []);

  // Unmount safety — if the canvas is destroyed (route nav, hot-reload)
  // while voice is connecting/active, release the mic and close the WS.
  // capture/playback hooks ALSO have their own unmount teardown, but the
  // WS only this hook owns.
  useEffect(() => {
    return () => {
      const ws = wsRef.current;
      if (ws) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "end_session" }));
          }
          ws.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
      if (ampRafRef.current !== null) {
        cancelAnimationFrame(ampRafRef.current);
        ampRafRef.current = null;
      }
      phaseRef.current = "idle";
    };
  }, []);

  return {
    phase,
    isActive: phase === "active",
    isAgentSpeaking,
    transcript,
    amplitude,
    toolInFlight,
    start,
    stop,
    sendTextInput,
  };
}
