"use client";

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  type ChartConfig as ShadcnChartConfig,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartSpec } from "@/lib/api-types";
import { formatValue } from "@/lib/format";

type Props = {
  spec: ChartSpec;
  data: Array<Record<string, unknown>>;
  stacked?: boolean;
};

const ANGLED_THRESHOLD = 8;

export function BarChartPrimitive({ spec, data, stacked = false }: Props) {
  const { config } = spec;

  const chartConfig: ShadcnChartConfig = config.series.reduce(
    (acc: ShadcnChartConfig, s, i) => {
      acc[s.dataKey] = {
        label: s.label,
        color: `var(--chart-${(i % 5) + 1})`,
      };
      return acc;
    },
    {},
  );

  const xKey = config.xAxisKey ?? "";
  // Only apply a Y-axis format when ALL series share the same format.
  // Mixed formats (e.g., percentage + raw count) would otherwise misrender.
  const firstFormat = config.series[0]?.format;
  const allSameFormat =
    config.series.length > 0 &&
    config.series.every((s) => s.format === firstFormat);
  const yAxisFormat = allSameFormat ? firstFormat : undefined;

  const angled = data.length > ANGLED_THRESHOLD;

  return (
    <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
      <RechartsBarChart
        accessibilityLayer
        data={data}
        margin={{
          left: 12,
          right: 12,
          top: 8,
          bottom: angled ? 28 : 4,
        }}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={angled ? 12 : 8}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          angle={angled ? -35 : 0}
          textAnchor={angled ? "end" : "middle"}
          interval={0}
          height={angled ? 76 : 30}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickFormatter={(v) => formatValue(v, yAxisFormat)}
        />
        <ChartTooltip
          cursor={{ fillOpacity: 0.05 }}
          content={
            <ChartTooltipContent
              formatter={(value: any, name: any) => {
                const series = config.series.find((s) => s.dataKey === name);
                const label = series?.label ?? String(name);
                const formatted = formatValue(value, series?.format);
                return (
                  <div className="flex w-full min-w-[160px] items-center justify-between gap-6">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="font-mono text-xs font-medium tabular-nums text-foreground">
                      {formatted}
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        {config.series.length > 1 && (
          <ChartLegend content={<ChartLegendContent />} />
        )}
        {config.series.map((s) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            fill={`var(--color-${s.dataKey})`}
            radius={[4, 4, 0, 0]}
            stackId={stacked ? "stack" : undefined}
            animationDuration={500}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  );
}
