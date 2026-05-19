"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Download } from "lucide-react";
import type { RefObject } from "react";
import { useState } from "react";
import { downloadElementAsPNG } from "@/lib/download";
import { createLogger } from "@/lib/logger";

const log = createLogger("download-button");

type Props = {
  targetRef: RefObject<HTMLDivElement | null>;
  filename: string;
};

export function DownloadButton({ targetRef, filename }: Props) {
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");

  const handleClick = async () => {
    if (!targetRef.current || status !== "idle") return;
    setStatus("saving");
    try {
      await downloadElementAsPNG(targetRef.current, filename);
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1500);
    } catch (err) {
      log.error("PNG capture failed", { error: String(err) });
      setStatus("idle");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "saving"}
      aria-label="Download chart as PNG"
      title="Download as PNG"
      data-html2canvas-ignore
      className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-muted-foreground opacity-50 transition-all hover:bg-muted hover:text-foreground hover:opacity-100 disabled:cursor-wait"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
          className="block"
        >
          {status === "done" ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
