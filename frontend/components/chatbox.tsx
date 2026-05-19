"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VoiceButton } from "@/components/voice/voice-button";
import { createLogger } from "@/lib/logger";

const log = createLogger("chatbox");

type Props = {
  onSubmit: (question: string) => void | Promise<void>;
  pending: boolean;
  notice?: string | null;
  /** Editorial flow — handler + state. Optional so this component still
   *  works on routes that don't surface editorial generation. */
  onGenerateReport?: () => void;
  reportEnabled?: boolean;
  reportLoading?: boolean;
  /** Voice mode — handler + state. Optional. */
  onToggleVoice?: () => void;
  voiceActive?: boolean;
  voiceAmplitude?: number;
  voiceDisabled?: boolean;
};

function TypingDots() {
  return (
    <span aria-hidden className="inline-flex items-center gap-1 pl-2 pr-1">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-typing-dot-1" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-typing-dot-2" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-typing-dot-3" />
    </span>
  );
}

const GLASS_BACKGROUND =
  "linear-gradient(135deg, rgba(var(--glass-bg), 0.85) 0%, rgba(var(--glass-bg), 0.65) 100%)";
const GLASS_BORDER = "1px solid rgba(var(--glass-border), 0.6)";
const GLASS_SHADOW = [
  "0 8px 30px rgba(0,0,0,0.08)",
  "inset 0 1px 0 rgba(var(--glass-border), 0.8)",
  "inset 0 -1px 0 rgba(0,0,0,0.04)",
].join(", ");

export function Chatbox({
  onSubmit,
  pending,
  notice,
  onGenerateReport,
  reportEnabled = false,
  reportLoading = false,
  onToggleVoice,
  voiceActive = false,
  voiceAmplitude = 0,
  voiceDisabled = false,
}: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    log.info("Query submitted from input", {
      chars: trimmed.length,
      voice: voiceActive,
    });
    setValue("");
    void onSubmit(trimmed);
  };

  const reportDisabled = !onGenerateReport || !reportEnabled || reportLoading;
  const reportTooltip = reportLoading
    ? "Crafting the briefing…"
    : !reportEnabled
      ? "Run a few queries first"
      : "Generate report";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="fixed bottom-16 left-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 md:bottom-20"
    >
      {/* Editorial loading "bubble" — rendered like a model message,
          above the chatbox, in the same slot as the clarification notice. */}
      <AnimatePresence>
        {reportLoading && (
          <motion.div
            key="report-loading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-2 mb-2 flex items-center gap-3 rounded-2xl px-5 py-4 text-[15px] leading-relaxed text-foreground"
            style={{
              background: GLASS_BACKGROUND,
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: GLASS_BORDER,
              boxShadow: GLASS_SHADOW,
            }}
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-500" />
            <span>Crafting your editorial briefing… (~30s)</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-2 mb-2 rounded-2xl px-5 py-4 text-[15px] leading-relaxed text-foreground"
            style={{
              background: GLASS_BACKGROUND,
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: GLASS_BORDER,
              boxShadow: GLASS_SHADOW,
            }}
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="flex items-center gap-2 rounded-full px-4 py-3 transition-shadow duration-300"
        style={{
          background: GLASS_BACKGROUND,
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: GLASS_BORDER,
          boxShadow: GLASS_SHADOW,
        }}
      >
        {pending && <TypingDots />}
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ask anything about your data..."
          rows={1}
          disabled={pending}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
        />

        {onGenerateReport && (
          <Tooltip>
            <TooltipTrigger
              render={
                <motion.button
                  type="button"
                  onClick={() => {
                    if (reportDisabled) return;
                    onGenerateReport();
                  }}
                  disabled={reportDisabled}
                  aria-label="Generate report"
                  whileHover={reportDisabled ? undefined : { scale: 1.1 }}
                  whileTap={reportDisabled ? undefined : { scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                />
              }
            >
              {reportLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </TooltipTrigger>
            <TooltipContent>{reportTooltip}</TooltipContent>
          </Tooltip>
        )}

        {onToggleVoice && (
          <VoiceButton
            active={voiceActive}
            amplitude={voiceAmplitude}
            disabled={voiceDisabled || pending}
            onToggle={onToggleVoice}
          />
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || pending}
          aria-label="Send"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
