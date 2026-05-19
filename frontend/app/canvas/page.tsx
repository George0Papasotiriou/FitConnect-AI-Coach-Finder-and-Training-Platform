"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIThinkingPanel } from "@/components/ai-thinking-panel";
import { ApertureLogo } from "@/components/aperture-logo";
import {
  ChartCard,
  type ChartCardData,
} from "@/components/charts/chart-card";
import { Chatbox } from "@/components/chatbox";
import { EditorialOverlay } from "@/components/editorial/editorial-overlay";
import { SuggestionPills } from "@/components/suggestion-pills";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlassButton } from "@/components/ui/glass-button";
import { VoiceOverlay } from "@/components/voice/voice-overlay";
import {
  useVoiceSession,
  type VoiceChartReady,
  VoiceMicPermissionError,
} from "@/hooks/voice/use-voice-session";
import {
  generateEditorial,
  postQuery,
  resetConversation,
} from "@/lib/api-client";
import type {
  ChartSpec,
  EditorialResponse,
  QueryResponse,
} from "@/lib/api-types";
import { EditorialResponseSchema } from "@/lib/api-types";
import { downloadElementAsPNG } from "@/lib/download";
import { createLogger } from "@/lib/logger";

const log = createLogger("canvas");

type ChartEntry = {
  id: string;
  response: QueryResponse;
  question: string;
};

type PanelState = {
  sql: string | null;
  status: "idle" | "thinking" | "rendering" | "done";
  latencyMs?: number;
  retries?: number;
};

const WIDE_THRESHOLD = 8;
const SCROLL_TOP_VISIBLE_PX = 600;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

function clampZoom(z: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(z * 10) / 10));
}

export default function CanvasPage() {
  // resolvedTheme is always "dark" | "light" — even when `theme === "system"`,
  // which would otherwise break the toggle comparison.
  const { setTheme, resolvedTheme } = useTheme();
  const [charts, setCharts] = useState<ChartEntry[]>([]);

  // Refs mirror state for voice callbacks. The voice hook is started
  // ONCE per session; closures captured at `voice.start(...)` time
  // would otherwise see stale values forever. useEffect keeps each ref
  // in lockstep with its state.
  const themeRef = useRef<string | undefined>(resolvedTheme);
  const chartsRef = useRef<ChartEntry[]>(charts);
  useEffect(() => {
    themeRef.current = resolvedTheme;
  }, [resolvedTheme]);
  useEffect(() => {
    chartsRef.current = charts;
  }, [charts]);

  // Counter the voice path bumps to ask the EditorialOverlay to fire
  // its own download (same flow as the in-overlay button). Starts at 0
  // (which the overlay's effect ignores); each voice request increments.
  const [pdfDownloadRequestId, setPdfDownloadRequestId] = useState(0);
  const [panel, setPanel] = useState<PanelState>({
    sql: null,
    status: "idle",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [conversationId, setConversationId] = useState<string>("");

  // Editorial state
  const [editorial, setEditorial] = useState<EditorialResponse | null>(null);
  const [editorialLoading, setEditorialLoading] = useState(false);
  const [editorialError, setEditorialError] = useState<string | null>(null);

  // Voice callback reads this via ref to gate download_editorial_pdf
  // without re-running the callback identity.
  const editorialRef = useRef<EditorialResponse | null>(editorial);
  useEffect(() => {
    editorialRef.current = editorial;
  }, [editorial]);

  // Voice mode
  const voice = useVoiceSession();
  const [voiceToast, setVoiceToast] = useState<string | null>(null);

  const latestChartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setConversationId(crypto.randomUUID());
  }, []);

  useEffect(() => {
    if (charts.length === 0) return;
    latestChartRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [charts.length]);

  useEffect(() => {
    const handler = () =>
      setShowScrollTop(window.scrollY > SCROLL_TOP_VISIBLE_PX);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setZoom((z) => {
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        return clampZoom(z + delta);
      });
    };
    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  }, []);

  const zoomIn = () => setZoom((z) => clampZoom(z + ZOOM_STEP));
  const zoomOut = () => setZoom((z) => clampZoom(z - ZOOM_STEP));
  const zoomReset = () => setZoom(1);

  const handleVoiceChartReady = useCallback(
    (payload: VoiceChartReady) => {
      const spec = payload.chart_spec as ChartSpec;
      // Build a QueryResponse-shaped entry so the existing render path works.
      const fakeResponse: QueryResponse = {
        spec,
        data: payload.data,
        panel_data: payload.panel_data ?? undefined,
        explanation: payload.explanation,
        follow_up_hint: undefined,
        clarification_question: undefined,
        narrative_html: undefined,
        metadata: {
          latency_ms: 0,
          token_cost: 0,
          sql_retries: 0,
          conversation_id: conversationId,
          request_id: payload.chart_id,
          chart_id: payload.chart_id,
        },
      };
      setCharts((prev) => [
        ...prev,
        { id: payload.chart_id, response: fakeResponse, question: "voice" },
      ]);
    },
    [conversationId],
  );

  const handleToggleVoice = useCallback(async () => {
    // Single-flight: the hook also guards via phaseRef, but blocking at
    // the call site avoids creating wasted promises during rapid clicks.
    if (voice.phase === "connecting" || voice.phase === "closing") {
      return;
    }
    if (voice.phase === "active") {
      await voice.stop("user_toggle");
      return;
    }
    try {
      await voice.start({
        conversationId,
        onChartReady: handleVoiceChartReady,
        onEditorialReady: (raw) => {
          // Voice path: backend pushes the same EditorialResponse shape
          // the HTTP /api/editorial returns. Re-validate at the consumer
          // boundary (we already do loose parse at the WS boundary).
          const parsed = EditorialResponseSchema.safeParse(raw);
          if (!parsed.success) {
            log.warn("editorial_ready failed Zod parse at canvas", {
              issues: parsed.error.issues.slice(0, 3),
            });
            setVoiceToast("Editorial arrived but couldn't be displayed.");
            window.setTimeout(() => setVoiceToast(null), 4000);
            return;
          }
          setEditorial(parsed.data);
        },
        onDownloadChartPng: (chartId) => {
          // Read charts via ref to avoid the stale-closure trap — the
          // voice session was started ONCE; React state captured at that
          // moment never updates inside this callback.
          const list = chartsRef.current;
          const id = chartId ?? list[list.length - 1]?.id;
          if (!id) {
            log.warn("download_chart_png with no chart available");
            return;
          }
          const node = document.querySelector<HTMLElement>(
            `[data-chart-id="${id}"]`,
          );
          if (!node) {
            log.warn("download_chart_png: chart node not found", { id });
            return;
          }
          const entry = list.find((c) => c.id === id);
          const filename = entry?.response.spec.title ?? "chart";
          void downloadElementAsPNG(node, filename);
        },
        onToggleTheme: () => {
          // Read resolvedTheme via ref — captured-at-start `theme`
          // would always show the original value, making this toggle
          // one-directional. resolvedTheme is also more reliable than
          // raw `theme` because it normalizes "system" → "dark"/"light".
          const current = themeRef.current;
          const next = current === "dark" ? "light" : "dark";
          log.info("voice: toggle_theme", { from: current, to: next });
          setTheme(next);
        },
        // ---- Phase 2 canvas action surface ----
        onDeleteChart: (chartId) => {
          // Resolve target via chartsRef (avoids stale-closure trap).
          const list = chartsRef.current;
          const targetId = chartId ?? list[list.length - 1]?.id;
          if (!targetId) {
            log.warn("delete_chart with no chart available");
            return;
          }
          log.info("voice: delete_chart", { chart_id: targetId });
          setCharts((prev) => prev.filter((c) => c.id !== targetId));
        },
        onClearCanvas: () => {
          log.info("voice: clear_canvas");
          setCharts([]);
        },
        onNewConversation: () => {
          // Inline reset — same effect as the chrome's New-conversation
          // button. Use functional setState for conversationId so the
          // reset hits whatever the current id is, not the one captured
          // when voice started. Voice will tear down naturally via the
          // session change (no explicit stop here — Gemini's verbal
          // "starting fresh" confirm should land before the WS closes).
          log.info("voice: new_conversation");
          setCharts([]);
          setPanel({ sql: null, status: "idle" });
          setError(null);
          setEditorial(null);
          setEditorialError(null);
          setZoom(1);
          setConversationId((oldId) => {
            if (oldId) void resetConversation(oldId);
            return crypto.randomUUID();
          });
        },
        onZoomTo: (level) => {
          // Backend already clamps 25..200; mirror that here for defense
          // in depth, then map to the fractional zoom this page uses.
          const clampedPct = Math.max(25, Math.min(200, Math.round(level)));
          const next = clampZoom(clampedPct / 100);
          log.info("voice: zoom_to", { requested: level, applied: next });
          setZoom(next);
        },
        onDownloadEditorialPdf: () => {
          // Guard via ref — Gemini may try to download before any
          // editorial exists, or after the user closed the overlay
          // (setEditorial(null)). Either way, no-op gracefully.
          if (!editorialRef.current) {
            log.warn("download_editorial_pdf with no editorial generated");
            return;
          }
          log.info("voice: download_editorial_pdf");
          setPdfDownloadRequestId((n) => n + 1);
        },
        onEnd: (reason) => {
          if (reason === "user_toggle") return;
          // Map reason → human copy. The "closed" / "ws_closed" paths
          // typically mean Gemini's session dropped (keepalive timeout
          // on their side). Tap mic again to reconnect — single-fire
          // sessions, no auto-reconnect.
          const message =
            reason === "idle_timeout"
              ? "Voice paused — no audio for 60s. Tap the mic to resume."
              : reason === "error"
                ? "Voice session error. Tap the mic to start a new one."
                : "Voice session ended. Tap the mic to start a new one.";
          setVoiceToast(message);
          window.setTimeout(() => setVoiceToast(null), 5000);
        },
      });
    } catch (err) {
      if (err instanceof VoiceMicPermissionError) {
        log.warn("Mic permission denied");
        setVoiceToast("Microphone access required for voice mode.");
      } else {
        log.error("Voice start failed", { error: String(err) });
        setVoiceToast("Couldn't start voice mode.");
      }
      window.setTimeout(() => setVoiceToast(null), 4000);
    }
    // `theme` and `charts` intentionally NOT in deps — read via
    // themeRef / chartsRef inside callbacks. setTheme has a stable
    // identity from next-themes so it doesn't need to be listed either.
  }, [voice, conversationId, handleVoiceChartReady, setTheme]);

  const handleSubmit = async (question: string) => {
    // While voice mode is connecting/active/closing, do NOT fall through
    // to the HTTP path — that would race two pipelines on the same
    // conversation_id. Only `active` actually forwards to Gemini; the
    // brief connecting/closing windows silently swallow the input.
    if (voice.phase !== "idle") {
      if (voice.phase === "active") {
        log.info("Typed query routed through voice WS", {
          chars: question.length,
        });
        voice.sendTextInput(question);
      }
      return;
    }

    log.info("Query submitted", { question, conversation_id: conversationId });
    setPending(true);
    setError(null);
    setPanel({ sql: null, status: "thinking" });

    try {
      const response = await postQuery(question, conversationId || undefined);
      log.info("Response received", {
        title: response.spec.title,
        rows: response.data.length,
        retries: response.metadata.sql_retries,
        latency: response.metadata.latency_ms,
      });

      if (response.clarification_question || !response.spec.sql) {
        setPanel({
          sql: null,
          status: "done",
          latencyMs: response.metadata.latency_ms,
          retries: response.metadata.sql_retries,
        });
        setError(response.clarification_question ?? response.explanation);
        return;
      }

      setPanel({
        sql: response.spec.sql,
        status: "rendering",
        latencyMs: response.metadata.latency_ms,
        retries: response.metadata.sql_retries,
      });

      const halfStream = Math.min(response.spec.sql.length * 6, 1200);
      window.setTimeout(() => {
        setCharts((prev) => [
          ...prev,
          { id: response.metadata.request_id, response, question },
        ]);
        setPanel((p) => ({ ...p, status: "done" }));
      }, halfStream);
    } catch (err) {
      log.error("Query failed", { error: String(err) });
      setError("Sorry — something went wrong with that query.");
      setPanel({ sql: null, status: "idle" });
    } finally {
      setPending(false);
    }
  };

  const handleSuggestion = (query: string) => {
    log.info("Suggestion pill clicked", { query });
    void handleSubmit(query);
  };

  const handleNewConversation = async () => {
    log.info("New conversation requested", { old_id: conversationId });
    if (voice.isActive) {
      await voice.stop("new_conversation");
    }
    if (conversationId) {
      await resetConversation(conversationId);
    }
    setCharts([]);
    setPanel({ sql: null, status: "idle" });
    setError(null);
    setEditorial(null);
    setEditorialError(null);
    setZoom(1);
    setConversationId(crypto.randomUUID());
  };

  const handleGenerateReport = async () => {
    if (charts.length < 2 || editorialLoading) return;
    log.info("Editorial requested", {
      conversation_id: conversationId,
      chart_count: charts.length,
    });
    setEditorialLoading(true);
    setEditorialError(null);
    try {
      const result = await generateEditorial(conversationId);
      setEditorial(result);
    } catch (err) {
      log.error("Editorial generation failed", { error: String(err) });
      setEditorialError(
        err instanceof Error ? err.message : "Failed to generate report",
      );
    } finally {
      setEditorialLoading(false);
    }
  };

  // ChartCardData derivation for the editorial document — surfaces
  // backend chart_id so editorial sections can match. Threads panel_data
  // so multi-panel charts can still render inside the editorial document.
  const editorialCharts = useMemo<ChartCardData[]>(
    () =>
      charts
        .filter((c) => c.response.metadata.chart_id)
        .map((c) => ({
          chartId: c.response.metadata.chart_id ?? c.id,
          spec: c.response.spec,
          data: c.response.data,
          panelData: c.response.panel_data ?? undefined,
        })),
    [charts],
  );

  const zoomAtMin = zoom <= ZOOM_MIN;
  const zoomAtMax = zoom >= ZOOM_MAX;

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 h-full w-full overflow-hidden"
        style={{ background: "var(--background)" }}
      >
        <div className="dot-grid absolute inset-0 opacity-60" />

        <div
          className="absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--aurora-1) 40%, transparent), color-mix(in oklch, var(--aurora-1) 20%, transparent), transparent)",
          }}
        />

        <div
          className="absolute -bottom-40 -left-40 h-[700px] w-[700px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--aurora-2) 30%, transparent), color-mix(in oklch, var(--aurora-2) 15%, transparent), transparent)",
          }}
        />

        <div
          className="absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--aurora-3) 25%, transparent), color-mix(in oklch, var(--aurora-3) 10%, transparent), transparent)",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-0 mx-auto max-w-7xl px-4 pt-16 pb-56 md:px-8 md:pt-20"
      >
        {charts.length === 0 && (
          <div className="font-mono text-sm text-muted-foreground">
            {"// Canvas ready. Ask your data anything."}
          </div>
        )}

        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            transition: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {charts.map((entry, i) => {
              const spec = entry.response.spec;
              const isWide =
                spec.chartType === "multi-panel" ||
                entry.response.data.length > WIDE_THRESHOLD;
              const isLast = i === charts.length - 1;
              return (
                <div
                  key={entry.id}
                  ref={isLast ? latestChartRef : undefined}
                  data-chart-id={entry.id}
                  className={isWide ? "lg:col-span-2" : ""}
                >
                  <ChartCard
                    spec={spec}
                    data={entry.response.data}
                    panelData={entry.response.panel_data ?? undefined}
                    explanation={entry.response.explanation}
                    index={i}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {charts.length > 0 && (
          <motion.div
            key="chrome"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="fixed top-8 right-8 left-8 z-40 flex items-center justify-between gap-3 md:top-10 md:right-52 md:left-52">
              <GlassButton size="sm" tone="light" className="font-mono">
                <span className="hidden lg:inline">Conversation · </span>
                {charts.length}{" "}
                {charts.length === 1 ? "query" : "queries"}
              </GlassButton>

              <GlassButton
                size="sm"
                tone="light"
                className="font-mono"
                onClick={() => {
                  void handleNewConversation();
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">New conversation</span>
                  <span className="lg:hidden">New</span>
                </span>
              </GlassButton>
            </div>

            <div
              className="fixed top-10 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-1 rounded-full px-1 py-1 md:flex"
              style={{
                background: `linear-gradient(135deg,
                  rgba(var(--glass-bg), 0.7),
                  rgba(var(--glass-bg), 0.5))`,
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(var(--glass-border), 0.4)",
              }}
            >
              <motion.button
                type="button"
                onClick={zoomOut}
                disabled={zoomAtMin}
                aria-label="Zoom out"
                whileHover={zoomAtMin ? undefined : { scale: 1.15 }}
                whileTap={zoomAtMin ? undefined : { scale: 0.88 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Minus className="h-3 w-3" />
              </motion.button>
              <motion.button
                type="button"
                onDoubleClick={zoomReset}
                title="Double-click to reset"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="min-w-[40px] cursor-pointer px-2 text-center font-mono text-xs text-muted-foreground tabular-nums transition-colors select-none hover:text-foreground"
              >
                {Math.round(zoom * 100)}%
              </motion.button>
              <motion.button
                type="button"
                onClick={zoomIn}
                disabled={zoomAtMax}
                aria-label="Zoom in"
                whileHover={zoomAtMax ? undefined : { scale: 1.15 }}
                whileTap={zoomAtMax ? undefined : { scale: 0.88 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus className="h-3 w-3" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Link
        href="/"
        aria-label="Aperture — back to landing"
        className="fixed bottom-4 left-4 z-40 md:bottom-6 md:left-6"
      >
        <motion.div
          whileHover={{ scale: 1.15, rotate: -8 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 450, damping: 22 }}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ApertureLogo size={28} />
        </motion.div>
      </Link>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll to top"
            className="fixed bottom-32 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full md:bottom-36 md:left-6"
            style={{
              background: `linear-gradient(135deg, rgba(var(--glass-bg), 0.9) 0%, rgba(var(--glass-bg), 0.7) 100%)`,
              backdropFilter: "blur(18px) saturate(180%)",
              WebkitBackdropFilter: "blur(18px) saturate(180%)",
              border: "1px solid rgba(var(--glass-border), 0.7)",
              boxShadow: [
                "0 6px 20px rgba(0,0,0,0.08)",
                "inset 0 1px 0 rgba(var(--glass-border), 0.9)",
              ].join(", "),
              color: "var(--foreground)",
            }}
          >
            <ArrowUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <ThemeToggle />

      <AIThinkingPanel
        sql={panel.sql}
        status={panel.status}
        latencyMs={panel.latencyMs}
        retries={panel.retries}
      />

      <SuggestionPills
        onSelect={handleSuggestion}
        visible={charts.length === 0 && !pending && !voice.isActive}
      />

      <VoiceOverlay
        visible={voice.isActive}
        transcript={voice.transcript}
        amplitude={voice.amplitude}
        isAgentSpeaking={voice.isAgentSpeaking}
        toolInFlight={voice.toolInFlight}
      />

      <Chatbox
        onSubmit={handleSubmit}
        pending={pending && !voice.isActive}
        notice={voiceToast ?? error}
        onGenerateReport={() => {
          void handleGenerateReport();
        }}
        reportEnabled={charts.length >= 2}
        reportLoading={editorialLoading}
        onToggleVoice={() => {
          void handleToggleVoice();
        }}
        voiceActive={voice.isActive}
        voiceAmplitude={voice.amplitude}
        voiceDisabled={
          voice.phase === "connecting" || voice.phase === "closing"
        }
      />

      {/* Editorial overlay */}
      <AnimatePresence>
        {(editorialLoading || editorial) && (
          <EditorialOverlay
            editorial={editorial}
            charts={editorialCharts}
            loading={editorialLoading}
            onClose={() => setEditorial(null)}
            downloadRequestId={pdfDownloadRequestId}
          />
        )}
      </AnimatePresence>

      {/* Editorial error notice */}
      <AnimatePresence>
        {editorialError && !editorial && (
          <motion.div
            key="editorial-error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed right-4 bottom-32 z-50 max-w-sm rounded-2xl px-4 py-3 text-xs text-foreground md:right-6 md:bottom-36"
            style={{
              background: `linear-gradient(135deg, rgba(var(--glass-bg), 0.9) 0%, rgba(var(--glass-bg), 0.7) 100%)`,
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(var(--glass-border), 0.6)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.10)",
            }}
            onClick={() => setEditorialError(null)}
          >
            <div className="flex items-start gap-2">
              <span className="mt-[5px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>{editorialError}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
