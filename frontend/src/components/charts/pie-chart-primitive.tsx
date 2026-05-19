"use client";

import { Cell, Pie, PieChart as RechartsPieChart } from "recharts";
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
  donut?: boolean;
};

export function PieChartPrimitive({ spec, data, donut = false }: Props) {
  const { config } = spec;
  const nameKey = config.xAxisKey ?? "name";
  const valueKey = config.series[0]?.dataKey ?? "value";
  const valueFormat = config.series[0]?.format;

  const chartConfig: ShadcnChartConfig = data.reduce(
    (acc: ShadcnChartConfig, row, i) => {
      const k = String(row[nameKey] ?? `slice-${i}`);
      acc[k] = {
        label: k,
        color: `var(--chart-${(i % 5) + 1})`,
      };
      return acc;
    },
    {},
  );

  return (
    <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
      <RechartsPieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value: any, name: any) => {
                const label = String(name);
                const formatted = formatValue(value, valueFormat);
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
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          innerRadius={donut ? 60 : 0}
          outerRadius={100}
          strokeWidth={2}
          animationDuration={500}
        >
          {data.map((_row, i) => (
            <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </RechartsPieChart>
    </ChartContainer>
  );
}
