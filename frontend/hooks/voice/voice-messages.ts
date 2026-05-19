import { z } from "zod";

// Discriminated union for every JSON frame the voice WS may send.
// Binary frames (audio bytes) are routed separately — never reach here.

const sessionStartedSchema = z.object({
  type: z.literal("session_started"),
  session_id: z.string(),
  conversation_id: z.string(),
});

const transcriptSchema = z.object({
  type: z.literal("transcript"),
  source: z.enum(["user", "agent"]),
  text: z.string(),
});

const chartReadySchema = z.object({
  type: z.literal("chart_ready"),
  chart_id: z.string(),
  chart_spec: z.unknown(),
  data: z.array(z.record(z.string(), z.unknown())),
  panel_data: z
    .array(z.array(z.record(z.string(), z.unknown())))
    .nullable()
    .optional(),
  explanation: z.string(),
});

const interruptedSchema = z.object({
  type: z.literal("interrupted"),
});

const turnCompleteSchema = z.object({
  type: z.literal("turn_complete"),
});

const toolStartedSchema = z.object({
  type: z.literal("tool_started"),
  tool: z.enum(["query_data", "generate_editorial"]),
  question_preview: z.string().optional(),
});

const toolFailedSchema = z.object({
  type: z.literal("tool_failed"),
  tool: z.string().optional(),
  reason: z.string(),
});

const editorialReadySchema = z.object({
  type: z.literal("editorial_ready"),
  editorial: z.record(z.string(), z.unknown()),
});

const actionDownloadChartPngSchema = z.object({
  type: z.literal("action_download_chart_png"),
  chart_id: z.string().nullable().optional(),
});

const actionToggleThemeSchema = z.object({
  type: z.literal("action_toggle_theme"),
});

// Phase 2 — canvas action surface
const actionDeleteChartSchema = z.object({
  type: z.literal("action_delete_chart"),
  chart_id: z.string().nullable().optional(),
});

const actionClearCanvasSchema = z.object({
  type: z.literal("action_clear_canvas"),
});

const actionNewConversationSchema = z.object({
  type: z.literal("action_new_conversation"),
});

const actionZoomToSchema = z.object({
  type: z.literal("action_zoom_to"),
  level: z.number().int().min(25).max(200),
});

const actionDownloadEditorialPdfSchema = z.object({
  type: z.literal("action_download_editorial_pdf"),
});

const sessionEndedSchema = z.object({
  type: z.literal("session_ended"),
  reason: z.string().optional(),
});

const sessionErrorSchema = z.object({
  type: z.literal("session_error"),
  message: z.string(),
});

export const voiceMessageSchema = z.discriminatedUnion("type", [
  sessionStartedSchema,
  transcriptSchema,
  chartReadySchema,
  interruptedSchema,
  turnCompleteSchema,
  toolStartedSchema,
  toolFailedSchema,
  editorialReadySchema,
  actionDownloadChartPngSchema,
  actionToggleThemeSchema,
  // Phase 2
  actionDeleteChartSchema,
  actionClearCanvasSchema,
  actionNewConversationSchema,
  actionZoomToSchema,
  actionDownloadEditorialPdfSchema,
  sessionEndedSchema,
  sessionErrorSchema,
]);

export type VoiceTool = "query_data" | "generate_editorial";
export type ToolInFlight = { active: false } | { active: true; tool: VoiceTool };

export type VoiceMessage = z.infer<typeof voiceMessageSchema>;
export type ChartReadyMessage = z.infer<typeof chartReadySchema>;
