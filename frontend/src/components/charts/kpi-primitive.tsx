"use client";

import type { ChartSpec } from "@/lib/api-types";
import { formatValue } from "@/lib/format";

type Props = {
  spec: ChartSpec;
  data: Array<Record<string, unknown>>;
};

export function KPIPrimitive({ spec, data }: Props) {
  const seriesList = spec.config.series;
  const firstRow = data[0];

  // Single-KPI layout (preserve original look): one big number.
  if (seriesList.length <= 1) {
    const series = seriesList[0];
    const rawValue =
      series && firstRow ? firstRow[series.dataKey] : undefined;
    const display = formatValue(rawValue, series?.format);
    return (
      <div className="flex flex-col gap-2 px-2 py-4">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {series?.label ?? spec.title}
        </span>
        <span className="font-serif text-5xl tracking-tight text-foreground md:text-6xl">
          {display}
        </span>
        {spec.description && (
          <span className="text-xs text-muted-foreground">
            {spec.description}
          </span>
        )}
      </div>
    );
  }

  // Multi-KPI grid. Each series → one tile, value read from row 0.
  // Top-hairline-per-tile reads cleanly across rows; no awkward first-child
  // exception needed.
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {seriesList.map((s) => {
        const rawValue = firstRow ? firstRow[s.dataKey] : undefined;
        const display = formatValue(rawValue, s.format);
        return (
          <div
            key={s.dataKey}
            className="flex flex-col gap-1.5 border-t border-border/40 pt-3"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {s.label}
            </span>
            <span className="font-serif text-3xl tracking-tight text-foreground tabular-nums md:text-4xl">
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
}
