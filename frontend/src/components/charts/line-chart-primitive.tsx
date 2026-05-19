"use client";

import {
  Area,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
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
  areaFill?: boolean;
  stacked?: boolean;
};

export function LineChartPrimitive({
  spec,
  data,
  areaFill = false,
  stacked = false,
}: Props) {
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
  const firstFormat = config.series[0]?.format;
  const allSameFormat =
    config.series.length > 0 &&
    config.series.every((s) => s.format === firstFormat);
  const yAxisFormat = allSameFormat ? firstFormat : undefined;

  return (
    <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
      <RechartsLineChart
        accessibilityLayer
        data={data}
        margin={{ left: 12, right: 12, top: 8, bottom: 4 }}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickFormatter={(v) => formatValue(v, yAxisFormat)}
        />
        <ChartTooltip
          cursor={{ strokeOpacity: 0.2 }}
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
        {config.series.map((s) =>
          areaFill ? (
            <Area
              key={s.dataKey}
              dataKey={s.dataKey}
              type="monotone"
              fill={`var(--color-${s.dataKey})`}
              fillOpacity={0.18}
              stroke={`var(--color-${s.dataKey})`}
              strokeWidth={2}
              stackId={stacked ? "stack" : undefined}
              animationDuration={600}
            />
          ) : (
            <Line
              key={s.dataKey}
              dataKey={s.dataKey}
              type="monotone"
              stroke={`var(--color-${s.dataKey})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              animationDuration={600}
            />
          ),
        )}
      </RechartsLineChart>
    </ChartContainer>
  );
}
