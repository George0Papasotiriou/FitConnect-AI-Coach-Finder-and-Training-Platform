"use client";

import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { VoiceIndicator } from "./voice-indicator";

type Props = {
  active: boolean;
  amplitude: number;
  disabled?: boolean;
  onToggle: () => void;
};

/**
 * Mic toggle. Inactive → standard outline mic. Active → monochrome glass
 * pulse (foreground-tinted, no coloured hue) with an amplitude meter
 * inside that doubles as the visible "I'm listening" signal.
 */
export function VoiceButton({ active, amplitude, disabled, onToggle }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={active ? "End voice mode" : "Start voice mode"}
      whileHover={disabled ? undefined : { scale: 1.06 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      {active && (
        <>
          {/* Inner soft halo — monochrome, derives from --foreground */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              boxShadow:
                "0 0 0 1px rgba(var(--glass-border), 0.9), 0 0 14px 1px rgba(var(--glass-border), 0.5)",
            }}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Outer expanding ring — quiet pulse */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-[-5px] rounded-full"
            style={{
              border: "1px solid rgba(var(--glass-border), 0.55)",
            }}
            animate={{
              scale: [1, 1.18, 1],
              opacity: [0.35, 0, 0.35],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      <span className="relative z-10 flex items-center justify-center text-foreground">
        {active ? (
          <span className="flex h-4 w-4 items-center justify-center">
            <VoiceIndicator amplitude={amplitude} active />
          </span>
        ) : disabled ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </span>
    </motion.button>
  );
}
