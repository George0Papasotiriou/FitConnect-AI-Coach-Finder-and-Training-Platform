"use client";

import { cubicBezier, motion } from "framer-motion";
import { useRef } from "react";
import type { ChartSpec } from "@/lib/api-types";
import { ChartRenderer } from "./chart-renderer";
import { DownloadButton } from "./download-button";

/** Minimum shape needed to render a chart anywhere outside the
 *  canvas (e.g. inside the editorial document). */
export type ChartCardData = {
  chartId: string;
  spec: ChartSpec;
  data: Array<Record<string, unknown>>;
  panelData?: Array<Array<Record<string, unknown>>>;
};

type Props = {
  spec: ChartSpec;
  data: Array<Record<string, unknown>>;
  panelData?: Array<Array<Record<string, unknown>>>;
  explanation: string;
  index: number;
};

const easeIntoFocus = cubicBezier(0.22, 1, 0.36, 1);

export function ChartCard({
  spec,
  data,
  panelData,
  explanation,
  index,
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  return (
    <motion.div
      initial={{
        y: 100,
        scale: 0.95,
        rotateX: 30,
        filter: "blur(8px)",
        opacity: 0,
      }}
      animate={{
        y: 0,
        scale: 1,
        rotateX: 0,
        filter: "blur(0px)",
        opacity: 1,
      }}
      transition={{
        duration: 0.7,
        ease: easeIntoFocus,
        delay: index * 0.1,
      }}
      style={{ perspective: 900, willChange: "transform, filter" }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="relative cursor-default overflow-hidden"
    >
      <motion.div
        ref={cardRef}
        className="relative p-6"
        style={{
          background: "var(--card)",
          borderRadius: "16px",
          border: "1px solid rgba(var(--glass-border), 0.4)",
          color: "var(--card-foreground)",
        }}
        // Soft monochrome arrival glow — a 1.2s pulse so newly-landed
        // charts catch the eye even if Gemini didn't narrate. Settles
        // into the resting box-shadow afterward. Theme-aware: the glow
        // is foreground-tinted via --glass-border at low alpha.
        initial={{
          boxShadow: [
            "0 0 0 0 rgba(var(--glass-border), 0.0)",
            "0 4px 24px rgba(0,0,0,0.04)",
            "0 1px 3px rgba(0,0,0,0.06)",
            "inset 0 1px 0 rgba(255,255,255,0.8)",
          ].join(", "),
        }}
        animate={{
          boxShadow: [
            // peak: visible monochrome halo
            [
              "0 0 0 6px rgba(var(--glass-border), 0.22)",
              "0 8px 36px rgba(var(--glass-border), 0.18)",
              "0 4px 24px rgba(0,0,0,0.04)",
              "0 1px 3px rgba(0,0,0,0.06)",
              "inset 0 1px 0 rgba(255,255,255,0.8)",
            ].join(", "),
            // resting state
            [
              "0 0 0 0 rgba(var(--glass-border), 0.0)",
              "0 4px 24px rgba(0,0,0,0.04)",
              "0 1px 3px rgba(0,0,0,0.06)",
              "inset 0 1px 0 rgba(255,255,255,0.8)",
            ].join(", "),
          ],
        }}
        transition={{
          duration: 1.2,
          ease: easeIntoFocus,
          times: [0.35, 1],
          delay: index * 0.1 + 0.3,
        }}
      >
        <DownloadButton targetRef={cardRef} filename={spec.title} />

        <div className="mb-4 pr-8">
          <h3 className="text-base font-medium text-foreground md:text-lg">
            {spec.title}
          </h3>
          {spec.description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {spec.description}
            </p>
          )}
        </div>
        <ChartRenderer spec={spec} data={data} panelData={panelData} />
        {explanation && (
          <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            {explanation}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
