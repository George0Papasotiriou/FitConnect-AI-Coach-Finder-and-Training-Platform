import { z } from "zod";

// Helper: optional string field tolerant of `null` from Pydantic (which
// emits null for absent optional values). Normalizes to undefined in TS.
const optionalString = () =>
  z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? undefined);

const seriesFormatSchema = z.enum([
  "currency",
  "percentage",
  "number",
  "duration",
  "datetime",
]);

const seriesConfigSchema = z.object({
  dataKey: z.string(),
  label: z.string(),
  format: seriesFormatSchema
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
});

const chartTypeSchema = z.enum([
  "bar",
  "bar-stacked",
  "line",
  "area",
  "area-stacked",
  "pie",
  "donut",
  "scatter",
  "kpi",
  "table",
  "multi-panel",
]);

export type ChartConfig = {
  xAxisKey?: string;
  series: Array<z.infer<typeof seriesConfigSchema>>;
  panels?: ChartSpec[];
};

export type ChartSpec = {
  chartType: z.infer<typeof chartTypeSchema>;
  title: string;
  description?: string;
  config: ChartConfig;
  sql: string;
};

const chartSpecSchema: z.ZodType<any, any, any> = z.lazy(() =>
  z.object({
    chartType: chartTypeSchema,
    title: z.string(),
    description: optionalString(),
    config: chartConfigSchema,
    sql: z.string(),
  }),
);

const chartConfigSchema: z.ZodType<any, any, any> = z.lazy(() =>
  z.object({
    xAxisKey: optionalString(),
    series: z.array(seriesConfigSchema),
    panels: z
      .array(chartSpecSchema)
      .nullable()
      .optional()
      .transform((v) => v ?? undefined),
  }),
);

export const queryResponseSchema = z.object({
  spec: chartSpecSchema,
  data: z.array(z.record(z.string(), z.unknown())),
  // For chartType="multi-panel" responses, one rows-array per panel in
  // the same order as spec.config.panels. Null/absent for single-panel.
  panel_data: z
    .array(z.array(z.record(z.string(), z.unknown())))
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
  explanation: z.string(),
  follow_up_hint: z.string().nullable().optional(),
  clarification_question: z.string().nullable().optional(),
  narrative_html: z.string().nullable().optional(),
  metadata: z.object({
    latency_ms: z.number(),
    token_cost: z.number(),
    sql_retries: z.number(),
    conversation_id: z.string(),
    request_id: z.string(),
    chart_id: z.string().nullable().optional(),
  }),
});

export type QueryResponse = z.infer<typeof queryResponseSchema>;

// ---------------------------------------------------------------------------
// Editorial (POST /api/editorial)
// ---------------------------------------------------------------------------

export const EditorialSectionSchema = z.object({
  number: z.number(),
  chart_id: z.string(),
  section_kicker: z.string(),
  headline: z.string(),
  kpi_value: z.string(),
  kpi_label: z.string(),
  lede: z.string(),
  body: z.string(),
  insight: z.string(),
});

export const EditorialResponseSchema = z.object({
  title: z.string(),
  dek: z.string(),
  kicker: z.string(),
  sections: z.array(EditorialSectionSchema),
  methodology_note: z.string(),
  colophon_stamp: z.string(),
  metadata: z.object({
    request_id: z.string(),
    conversation_id: z.string(),
    chart_count: z.number(),
    latency_ms: z.number(),
    token_cost_usd: z.number(),
  }),
});

export type EditorialSection = z.infer<typeof EditorialSectionSchema>;
export type EditorialResponse = z.infer<typeof EditorialResponseSchema>;
