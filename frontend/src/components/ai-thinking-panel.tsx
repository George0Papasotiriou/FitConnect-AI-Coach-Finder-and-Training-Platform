"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Code2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createLogger } from "@/lib/logger";

const log = createLogger("ai-panel");

type Props = {
  sql: string | null;
  status: "idle" | "thinking" | "rendering" | "done";
  latencyMs?: number;
  retries?: number;
};

const CHAR_INTERVAL_MS = 12;

const TOGGLE_BG =
  "linear-gradient(135deg, rgba(var(--glass-bg), 0.85) 0%, rgba(var(--glass-bg), 0.65) 100%)";
const ASIDE_BG =
  "linear-gradient(135deg, rgba(var(--glass-bg), 0.78) 0%, rgba(var(--glass-bg), 0.62) 100%)";

export function AIThinkingPanel({ sql, status, latencyMs, retries }: Props) {
  const [open, setOpen] = useState(false);
  const [streamed, setStreamed] = useState("");

  useEffect(() => {
    if (status === "thinking" || status === "rendering") {
      setOpen(true);
    }
  }, [status]);

  useEffect(() => {
    if (!sql) {
      setStreamed("");
      return;
    }
    setStreamed("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setStreamed(sql.slice(0, i));
      if (i >= sql.length) {
        window.clearInterval(id);
        log.debug("SQL stream complete", { chars: sql.length });
      }
    }, CHAR_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [sql]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          log.debug("Panel toggled", { open: next });
          setOpen(next);
        }}
        className="fixed top-10 right-4 z-40 hidden h-10 items-center gap-2 rounded-full px-3 font-mono text-xs text-muted-foreground transition-colors hover:opacity-90 md:flex"
        style={{
          background: TOGGLE_BG,
          backdropFilter: "blur(14px) saturate(180%)",
          WebkitBackdropFilter: "blur(14px) saturate(180%)",
          border: "1px solid rgba(var(--glass-border), 0.4)",
        }}
        aria-expanded={open}
      >
        <Code2 className="h-3.5 w-3.5" />
        AI thinking
        {status !== "idle" && (
          <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
        )}
        <ChevronRight
          className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-0 right-0 z-30 h-full w-[90vw] max-w-md overflow-y-auto p-6 pt-20"
            style={{
              background: ASIDE_BG,
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              borderLeft: "1px solid rgba(var(--glass-border), 0.4)",
            }}
          >
            <div className="mb-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
              SQL
            </div>
            <div className="mb-3 h-5 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={status}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  className="inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground"
                >
                  {status === "idle" && "// awaiting query"}
                  {status === "thinking" && (
                    <>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                      thinking
                    </>
                  )}
                  {status === "rendering" && (
                    <>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" />
                      generating SQL
                    </>
                  )}
                  {status === "done" && (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      done
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
            </div>
            <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-foreground">
              {streamed ||
                (status === "idle"
                  ? "// awaiting query..."
                  : "// generating...")}
              {sql && streamed.length < sql.length && (
                <span className="animate-pulse">▍</span>
              )}
            </pre>

            {(latencyMs !== undefined || (retries !== undefined && retries > 0)) &&
              status === "done" && (
                <div className="mt-6 space-y-1 border-t border-border pt-4 font-mono text-[11px] text-muted-foreground">
                  {latencyMs !== undefined && <div>latency: {latencyMs}ms</div>}
                  {retries !== undefined && retries > 0 && (
                    <div>retries: {retries}</div>
                  )}
                </div>
              )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
