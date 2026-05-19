"use client";

import { useMemo } from "react";
import type { ChartSpec } from "@/lib/api-types";
import { BarChartPrimitive } from "./bar-chart-primitive";
import { KPIPrimitive } from "./kpi-primitive";
import { LineChartPrimitive } from "./line-chart-primitive";
import { PieChartPrimitive } from "./pie-chart-primitive";
import { TablePrimitive } from "./table-primitive";

type Props = {
  spec: ChartSpec;
  data: Array<Record<string, unknown>>;
  // For chartType="multi-panel": positional rows-array per panel,
  // matching spec.config.panels order. Required for correct rendering;
  // absent means render with empty per-panel data (legacy fallback).
  panelData?: Array<Array<Record<string, unknown>>>;
};

export function ChartRenderer({ spec, data, panelData }: Props) {
  // Stable reference so primitives don't re-trigger their entrance animations.
  // (Hook called unconditionally — Rules-of-Hooks safe.)
  const filtered = useMemo(() => data, [data]);

  if (spec.chartType === "multi-panel") {
    const panels = spec.config.panels ?? [];
    if (panels.length === 0) {
      return <div className="text-sm text-slate-500">Empty multi-panel.</div>;
    }
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {panels.map((panel, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200/80 bg-white p-4"
          >
            <div className="mb-2 text-sm font-medium text-slate-900">
              {panel.title}
            </div>
            <ChartRenderer spec={panel} data={panelData?.[i] ?? []} />
          </div>
        ))}
      </div>
    );
  }

  switch (spec.chartType) {
    case "bar":
      return <BarChartPrimitive spec={spec} data={filtered} />;
    case "bar-stacked":
      return <BarChartPrimitive spec={spec} data={filtered} stacked />;
    case "line":
      return <LineChartPrimitive spec={spec} data={filtered} />;
    case "area":
      return <LineChartPrimitive spec={spec} data={filtered} areaFill />;
    case "area-stacked":
      return <LineChartPrimitive spec={spec} data={filtered} areaFill stacked />;
    case "pie":
      return <PieChartPrimitive spec={spec} data={filtered} />;
    case "donut":
      return <PieChartPrimitive spec={spec} data={filtered} donut />;
    case "kpi":
      return <KPIPrimitive spec={spec} data={filtered} />;
    case "table":
      return <TablePrimitive spec={spec} data={filtered} />;
    case "scatter":
      // Scatter not implemented yet — fall back to table.
      return <TablePrimitive spec={spec} data={filtered} />;
    default:
      return <TablePrimitive spec={spec} data={filtered} />;
  }
}
