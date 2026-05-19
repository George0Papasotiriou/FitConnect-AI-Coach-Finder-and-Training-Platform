"use client";

import type { ChartSpec } from "@/lib/api-types";
import { formatValue } from "@/lib/format";

type Props = {
  spec: ChartSpec;
  data: Array<Record<string, unknown>>;
};

export function TablePrimitive({ spec, data }: Props) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No rows.
      </div>
    );
  }

  const columns = Object.keys(data[0] ?? {});
  const formatFor = (col: string) => {
    if (col === spec.config.xAxisKey) return undefined;
    return spec.config.series.find((s) => s.dataKey === col)?.format;
  };
  const labelFor = (col: string) => {
    return spec.config.series.find((s) => s.dataKey === col)?.label ?? col;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-medium">
                {labelFor(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 50).map((row, i) => (
            <tr key={i} className="border-b border-border/60 hover:bg-muted">
              {columns.map((c) => (
                <td key={c} className="px-3 py-2 text-foreground">
                  {formatValue(row[c], formatFor(c))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 50 && (
        <div className="py-2 text-center text-xs text-muted-foreground">
          Showing first 50 of {data.length} rows
        </div>
      )}
    </div>
  );
}
