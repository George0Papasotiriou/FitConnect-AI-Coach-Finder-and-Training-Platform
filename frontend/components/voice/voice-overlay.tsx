"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { TranscriptTurn } from "@/hooks/voice/use-voice-session";
import type { ToolInFlight } from "@/hooks/voice/voice-messages";

type Props = {
  visible: boolean;
  transcript: TranscriptTurn[];
  amplitude: number;
  isAgentSpeaking: boolean;
  toolInFlight?: ToolInFlight;
};

const MAX_VISIBLE_TURNS = 6;

const GLASS_BACKGROUND =
  "linear-gradient(135deg, rgba(var(--glass-bg), 0.85) 0%, rgba(var(--glass-bg), 0.65) 100%)";
const GLASS_BORDER = "1px solid rgba(var(--glass-border), 0.6)";
const GLASS_SHADOW = [
  "0 12px 40px rgba(0,0,0,0.10)",
  "inset 0 1px 0 rgba(var(--glass-border), 0.8)",
  "inset 0 -1px 0 rgba(0,0,0,0.04)",
].join(", ");

/**
 * Voice mode transcript overlay. Slides up above the chatbox while voice
 * is active. Same glass treatment as the chatbox itself so the two
 * surfaces read as one composite control. Monochrome palette — every
 * accent derives from --foreground, never a coloured hue, so the overlay
 * sits cleanly in both light and dark themes.
 */
export function VoiceOverlay({
  visible,
  transcript,
  amplitude,
  isAgentSpeaking,
  toolInFlight = { active: false },
}: Props) {
  const pillLabel =
    toolInFlight.active && toolInFlight.tool === "generate_editorial"
      ? "composing briefing"
      : "analyzing";
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [transcript.length]);

  const visibleTurns = transcript.slice(-MAX_VISIBLE_TURNS);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="voice-overlay"
          initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 18, filter: "blur(6px)" }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-32 left-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 md:bottom-36"
        >
          <div
            className="rounded-3xl px-5 pt-5 pb-4"
            style={{
              background: GLASS_BACKGROUND,
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: GLASS_BORDER,
              boxShadow: GLASS_SHADOW,
            }}
          >
            <div
              ref={scrollerRef}
              className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1"
            >
              {visibleTurns.length === 0 && (
                <div className="py-2 text-center font-serif text-[15px] italic text-muted-foreground/70">
                  {isAgentSpeaking ? "Listening…" : "Go ahead — speak."}
                </div>
              )}
              {visibleTurns.map((turn, i) => {
                const isLatest = i === visibleTurns.length - 1;
                const isAgent = turn.source === "agent";
                return (
                  <motion.div
                    key={turn.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: isLatest ? 1 : 0.62, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className={`flex ${
                      isAgent ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-[14px] leading-relaxed text-foreground ${
                        isAgent
                          ? "bg-foreground/[0.04] font-serif italic"
                          : "bg-foreground/[0.08] font-sans"
                      }`}
                      style={{
                        border: isLatest
                          ? "1px solid rgba(var(--glass-border), 0.95)"
                          : "1px solid rgba(var(--glass-border), 0.45)",
                        boxShadow: isLatest
                          ? "inset 0 1px 0 rgba(var(--glass-border), 0.7)"
                          : undefined,
                      }}
                    >
                      {turn.text}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Analyzing pill — monochrome, theme-aware, fades in
                while a NON_BLOCKING tool call is in flight. */}
            <AnimatePresence>
              {toolInFlight.active && (
                <motion.div
                  key="analyzing-pill"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="mt-3 flex items-center justify-center"
                >
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                    style={{
                      background: "rgba(var(--glass-bg), 0.6)",
                      border: "1px solid rgba(var(--glass-border), 0.55)",
                    }}
                  >
                    <motion.span
                      className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/70"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    {pillLabel}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Amplitude bar — monochrome, foreground-tinted, smoothly
                tracks audio level (capture or playback). */}
            <div
              className="mt-4 h-[2px] w-full overflow-hidden rounded-full"
              style={{ background: "rgba(var(--glass-border), 0.35)" }}
            >
              <motion.div
                className="h-full rounded-full bg-foreground"
                animate={{
                  width: `${Math.min(100, amplitude * 140)}%`,
                  opacity: 0.35 + Math.min(0.45, amplitude * 1.2),
                }}
                transition={{ duration: 0.12, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
