/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Analytics agent — natural language to chart, scoped to the caller.
 */

import crypto from 'crypto';
import db, { pool } from '../db.js';
import { getAIResponse } from './ai.js';
import { schemaPromptFor, type Role } from './analyticsSchema.js';
import { guardSql, SqlGuardError } from './analyticsSqlGuard.js';

export type ChartType =
  | 'bar'
  | 'bar-stacked'
  | 'line'
  | 'area'
  | 'area-stacked'
  | 'pie'
  | 'donut'
  | 'kpi'
  | 'table'
  | 'scatter'
  | 'multi-panel';

export interface SeriesFormat {
  dataKey: string;
  label: string;
  format?: 'number' | 'currency' | 'percentage' | 'duration' | 'datetime';
}

export interface ChartSpec {
  chartType: ChartType;
  title: string;
  description?: string;
  config: {
    xAxisKey?: string;
    series: SeriesFormat[];
    panels?: ChartSpec[];
  };
  sql: string;
}

export interface LockedContext {
  /** Which chart the context came from. */
  chartId: string;
  /** Field that was filtered on (e.g. "muscle_group"). */
  field: string;
  /** Selected value (e.g. "Chest"). */
  value: string | number;
  /** Human label, used in suggestion prompts. */
  label?: string;
}

export interface AnalyticsQueryRequest {
  question: string;
  conversationId: string;
  lockedContext?: LockedContext | null;
}

export interface AnalyticsResponse {
  spec: ChartSpec;
  data: Array<Record<string, unknown>>;
  explanation: string;
  followUpSuggestions: string[];
  clarificationQuestion?: string;
  /**
   * Conversational answer for questions that can't (or shouldn't) be rendered
   * as a chart — e.g. "what's the weather today" or "how do I add a new
   * trainer". The frontend renders this as a chat bubble without putting a
   * chart on the canvas.
   */
  chatResponse?: string;
  metadata: {
    latencyMs: number;
    sqlRetries: number;
    conversationId: string;
    requestId: string;
    chartId: string;
    tables: string[];
  };
}

interface ConversationMemoryEntry {
  chartId: string;
  question: string;
  spec: ChartSpec;
  explanation: string;
  /** Top-level summary of returned rows (first 5) so the LLM has factual context. */
  sample: Array<Record<string, unknown>>;
}

const CONVERSATIONS = new Map<string, ConversationMemoryEntry[]>();
const CONVERSATION_TTL_MS = 60 * 60 * 1000; // 1h
const CONVERSATION_LAST_TOUCHED = new Map<string, number>();

function touchConversation(id: string): void {
  CONVERSATION_LAST_TOUCHED.set(id, Date.now());
  // Lazy GC
  if (CONVERSATION_LAST_TOUCHED.size > 200) {
    const cutoff = Date.now() - CONVERSATION_TTL_MS;
    for (const [k, t] of CONVERSATION_LAST_TOUCHED) {
      if (t < cutoff) {
        CONVERSATIONS.delete(k);
        CONVERSATION_LAST_TOUCHED.delete(k);
      }
    }
  }
}

export function resetConversation(id: string): void {
  CONVERSATIONS.delete(id);
  CONVERSATION_LAST_TOUCHED.delete(id);
}

const SQL_SYSTEM_PROMPT = (role: Role, today: string) => `You are AbiliFit Analytics — an expert data analyst that translates fitness questions into safe Postgres SQL and selects the best chart for the answer.

Today's date is ${today}.

The caller is a ${role}. They asked a question about their fitness data. You will:
1. Generate ONE valid Postgres SELECT statement (or a WITH ... SELECT) that answers it.
2. Pick the best chart type for the answer.
3. Briefly explain the result in one sentence.
4. Suggest 5 follow-up questions the user is likely to ask next.

# Rules — read them carefully
- Read-only. No INSERT, UPDATE, DELETE, DDL, SET, COPY — none.
- Use ONLY the tables and columns described in the schema below.
${role === 'admin' ? `
- ADMIN ROLE: you are a general-purpose, smart admin assistant. You have unrestricted READ access to every table in the schema below. You do NOT need to filter by $USER_ID.
- If the question is data-shaped (counts, distributions, trends, breakdowns about the platform's users/sessions/profiles), generate SQL and pick a chart.
- If the question is NOT data-shaped (small talk, "what's the weather", "how do I X", policy questions, jokes), DO NOT invent a SQL query — return ONLY a chat_response. Answer concisely and helpfully from your general knowledge. If you genuinely don't know (e.g. live weather, today's market), say so plainly and suggest an alternative.
- Health/medical questions about users live in trainee_profiles. To find "healthy" users use \`COALESCE(trim(medical_conditions::text), '') IN ('', '[]') AND COALESCE(trim(injured_limbs::text), '') IN ('', '[]')\`. To unpack the most common conditions, unnest the JSON array: \`SELECT cond, COUNT(*) FROM trainee_profiles tp, jsonb_array_elements_text(NULLIF(tp.medical_conditions, '')::jsonb) AS cond GROUP BY cond\`.
- For admin queries that touch personally identifiable columns (email), aggregate or limit rather than dumping per-user rows.
- Never SELECT message content (messages.content is intentionally not in the schema). Aggregate by id/sender_id/created_at only.
` : `
- ALWAYS reference the literal placeholder \`$USER_ID\` (unquoted) where you need the caller's id. The runtime substitutes it with a bind parameter.
- Scoping by role:
  * TRAINEE — every non-global table must filter by its scope column = $USER_ID (e.g. \`WHERE sh.user_id = $USER_ID\`).
  * TRAINER — same pattern for the trainer's OWN data (\`sessions.trainer_id = $USER_ID\`, \`reviews.reviewee_id = $USER_ID\`).
    To pull a trainer's CLIENTS' data (their strength_history, daily_tasks, achievements, etc.) you MUST go through coach_requests:
    \`\`\`sql
    SELECT sh.muscle_group, SUM(sh.weight * sh.reps) AS volume
    FROM strength_history sh
    JOIN coach_requests cr ON cr.trainee_id = sh.user_id
    WHERE cr.trainer_id = $USER_ID AND cr.status = 'accepted'
    GROUP BY sh.muscle_group
    ORDER BY volume DESC
    \`\`\`
    The runtime accepts this join pattern (cr.trainer_id = $USER_ID AND cr.status = 'accepted') as scope; you do NOT also need user_id = $USER_ID on the trainee tables.
`}- Choose column aliases that make readable axis labels (lower_snake or short Title).
- Return numbers as numbers, dates ISO-formatted. CAST when needed.
- **Wrap every numeric aggregate in COALESCE(...,0)** so empty tables yield 0 instead of NULL — e.g. \`COALESCE(SUM(weight * reps), 0) AS total_volume\`, \`COALESCE(COUNT(*), 0) AS total_reviews\`, \`COALESCE(AVG(rating), 0) AS avg_rating\`.
- Add ORDER BY where it matters; never return more than ~50 grouped rows.
- For time series, bucket by day/week/month explicitly using \`date_trunc\`.
- For KPI charts (single number) prefer a SELECT with no FROM-less subqueries and ensure exactly ONE row comes back.

# Chart types and when to use each
- "kpi": single number (e.g. "total volume this month")
- "bar": comparing categories (5–20 groups)
- "bar-stacked": comparing categories with sub-groups stacked inside each bar
- "line" / "area": time series with one or more series
- "area-stacked": time series with multiple series stacked (great for composition over time)
- "pie" / "donut": share of total across 2–8 categories
- "scatter": correlation between two numeric variables (xAxisKey = x-axis, series[0] = y-axis, series[1] = optional bubble size)
- "multi-panel": a dashboard of 2–4 sub-charts displayed in a grid. Set config.panels to an array of ChartSpec objects, each with its own chartType/config/sql.
- "table": detailed rows the user explicitly asked to see

# Schema
${schemaPromptFor(role)}

# Output format
Return ONLY a JSON object — no markdown, no commentary.

For a DATA question (you'll generate a chart):
{
  "spec": {
    "chartType": "<one of bar|bar-stacked|line|area|area-stacked|pie|donut|kpi|table|scatter|multi-panel>",
    "title": "<chart title>",
    "description": "<one-line subtitle, optional>",
    "config": {
      "xAxisKey": "<column name used as x-axis / category key, omit for kpi>",
      "series": [
        { "dataKey": "<column name>", "label": "<human label>", "format": "number|currency|percentage|duration|datetime" }
      ]
    },
    "sql": "<the SELECT statement, using $USER_ID where needed>"
  },
  "explanation": "<one-sentence explanation>",
  "follow_up_suggestions": ["<q1>", "<q2>", "<q3>"],
  "clarification_question": null,
  "chat_response": null
}

For a GENERAL/conversational question (no chart needed — e.g. "what's the weather", "how do I onboard a trainer", small talk):
{
  "spec": null,
  "explanation": "",
  "follow_up_suggestions": ["<3 admin-useful follow-ups>"],
  "clarification_question": null,
  "chat_response": "<your concise, helpful answer — 1-3 sentences>"
}

If the question is ambiguous, set "clarification_question" to a single question you'd ask. If you can't answer factually (live data you don't have access to), say so in chat_response and offer the closest data question we COULD answer.`;

function buildHistoryBlock(history: ConversationMemoryEntry[]): string {
  if (!history.length) return '';
  const lines: string[] = ['## Previous turns in this conversation'];
  history.slice(-5).forEach((h, i) => {
    lines.push(`Q${i + 1}: ${h.question}`);
    lines.push(`Chart: ${h.spec.chartType} — ${h.spec.title}`);
    lines.push(`Result sample: ${JSON.stringify(h.sample.slice(0, 3))}`);
  });
  return lines.join('\n');
}

function buildLockedContextBlock(locked?: LockedContext | null): string {
  if (!locked) return '';
  return `## Locked context\nThe user clicked on a chart element and locked this filter for follow-up questions:\n- field: ${locked.field}\n- value: ${JSON.stringify(locked.value)}\n${locked.label ? `- label: ${locked.label}\n` : ''}Where it's sensible, narrow the new query so it respects this filter (e.g. add a matching WHERE clause).`;
}

function safeJsonParse<T = unknown>(raw: string): T | null {
  try {
    const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    return JSON.parse(trimmed) as T;
  } catch {
    // Try to grab the first {...} block.
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch { /* fallthrough */ }
    }
    return null;
  }
}

interface LLMResult {
  spec: ChartSpec;
  explanation: string;
  follow_up_suggestions?: string[];
  clarification_question?: string | null;
}

async function generateSpec(
  role: Role,
  question: string,
  history: ConversationMemoryEntry[],
  locked?: LockedContext | null,
): Promise<LLMResult> {
  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt = SQL_SYSTEM_PROMPT(role, today);
  const userPrompt = [
    buildHistoryBlock(history),
    buildLockedContextBlock(locked),
    `## New question\n${question}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const raw = await getAIResponse(userPrompt, systemPrompt, 800);
  if (!raw) {
    throw new Error('Empty response from analytics LLM.');
  }
  const parsed = safeJsonParse<LLMResult & { chat_response?: string }>(raw);
  // Handle chat responses (non-data questions)
  if (parsed?.chat_response && !parsed.spec) {
    return {
      spec: { chartType: 'kpi' as ChartType, title: '', config: { series: [] }, sql: '' },
      explanation: parsed.chat_response,
      follow_up_suggestions: parsed.follow_up_suggestions,
      clarification_question: null,
    };
  }
  if (!parsed || !parsed.spec) {
    throw new Error('Analytics LLM returned malformed JSON.');
  }
  return parsed;
}

/**
 * Generate suggestion pills given the current canvas state (recent charts +
 * optional locked context). Returns a short list of question strings.
 */
export async function generateSuggestions(
  role: Role,
  conversationId: string,
  locked?: LockedContext | null,
): Promise<string[]> {
  const history = CONVERSATIONS.get(conversationId) ?? [];
  const systemPrompt = `You are AbiliFit Analytics. Given the conversation so far and any locked context, suggest 8 short follow-up questions the ${role} is most likely to ask. Each question must be answerable from the schema below. Mix broad exploratory questions with specific drill-down questions. If there is locked context, make at least 3 questions specific to the locked filter.
${schemaPromptFor(role)}

Return ONLY a JSON array of 8 strings — no commentary, no markdown.`;

  const userPrompt = [
    buildHistoryBlock(history),
    buildLockedContextBlock(locked),
    history.length === 0
      ? '## Status\nNo charts yet. Suggest first questions a ' + role + ' would ask.'
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const raw = await getAIResponse(userPrompt, systemPrompt);
    const parsed = safeJsonParse<unknown>(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string').slice(0, 8);
    }
  } catch (err) {
    console.warn('[analytics] suggestions failed', err);
  }
  return defaultSuggestions(role);
}

function defaultSuggestions(role: Role): string[] {
  if (role === 'admin') {
    return [
      'How many users are registered, broken down by role?',
      'Show new user signups per week over the last 3 months.',
      'What is the distribution of trainee fitness levels?',
      'Top 10 trainers by rating with at least 3 reviews.',
      'How many sessions completed per week platform-wide?',
      'Revenue by month from completed payments.',
      'What is the user retention rate month-over-month?',
      'Which muscle groups are most popular across all trainees?',
    ];
  }
  if (role === 'trainer') {
    return [
      'How many sessions did I run this month?',
      'Show me my average review rating over time.',
      'Which of my clients logged the most training volume this month?',
      'How many sessions per week have I delivered this quarter?',
      'What are the most trained muscle groups across my clients?',
      'Show my client completion rate for assigned tasks.',
      'How does my session count compare month-over-month?',
      'Which client has the longest active streak right now?',
    ];
  }
  return [
    'Show my total training volume each week for the last 3 months.',
    'Which muscle groups have I worked the most this month?',
    'How many daily tasks have I completed each day this week?',
    'What\'s my heaviest lift per exercise this year?',
    'Show my workout streak over the past month.',
    'How much total weight have I lifted this month?',
    'Compare my volume this month vs last month per muscle group.',
    'What exercises have I done the most reps on?',
  ];
}

/**
 * Execute a guarded SQL against the AbiliFit Postgres pool with a per-statement
 * timeout. Returns rows as plain objects (already snake_case from Postgres —
 * we DO NOT camelCase here because the LLM picked the column aliases).
 */
/**
 * Postgres returns NULL for `SUM/AVG/COUNT` on empty groups, and returns
 * NUMERIC/BIGINT as JavaScript strings. The chart layer can't make sense of
 * either — KPIs render as "—" for null, and bar/line charts choke when the
 * y-axis is a string. So we normalise:
 *
 *  - For every value column referenced in spec.config.series:
 *    * coerce string-numeric values to numbers
 *    * NULL / undefined → 0
 *  - For the xAxisKey: leave strings alone, but coerce Date objects to ISO.
 */
function normalizeRows(
  rows: Array<Record<string, unknown>>,
  spec?: { chartType?: string; config?: { xAxisKey?: string; series?: Array<{ dataKey: string }> } },
): Array<Record<string, unknown>> {
  if (!rows.length || !spec?.config) return rows;
  const valueKeys = new Set((spec.config.series ?? []).map((s) => s.dataKey));
  const xKey = spec.config.xAxisKey;
  const isKpi = spec.chartType === 'kpi';
  return rows.map((row) => {
    const out: Record<string, unknown> = { ...row };
    for (const k of valueKeys) {
      const v = out[k];
      if (v === null || v === undefined) {
        out[k] = isKpi ? 0 : null;
      } else if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
        out[k] = Number(v);
      }
    }
    if (xKey && out[xKey] instanceof Date) {
      out[xKey] = (out[xKey] as Date).toISOString();
    }
    return out;
  });
}

async function executeAnalyticsSql(
  sql: string,
  userId: string,
  role: Role,
): Promise<Array<Record<string, unknown>>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query('SET LOCAL statement_timeout = 5000'); // 5s
    // Admin queries don't reference $1 (no $USER_ID); send an empty params array.
    const usesUserIdBind = /\$1\b/.test(sql);
    const params = usesUserIdBind ? [userId] : [];
    const result = await client.query(sql, params);
    void role; // currently unused — kept for future role-scoped logging
    await client.query('COMMIT');
    return result.rows as Array<Record<string, unknown>>;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * The main entry point. Run a NL question, return a chart + data + suggestions.
 */
export async function runAnalyticsQuery(
  userId: string,
  role: Role,
  req: AnalyticsQueryRequest,
): Promise<AnalyticsResponse> {
  const startedAt = Date.now();
  touchConversation(req.conversationId);
  const history = CONVERSATIONS.get(req.conversationId) ?? [];

  // 1. Ask LLM for spec.
  const llm = await generateSpec(role, req.question, history, req.lockedContext);

  // 2. If LLM asked for clarification, return that without executing.
  if (llm.clarification_question && llm.clarification_question.trim()) {
    return {
      spec: llm.spec,
      data: [],
      explanation: llm.explanation ?? '',
      followUpSuggestions: llm.follow_up_suggestions ?? defaultSuggestions(role),
      clarificationQuestion: llm.clarification_question,
      metadata: {
        latencyMs: Date.now() - startedAt,
        sqlRetries: 0,
        conversationId: req.conversationId,
        requestId: crypto.randomUUID(),
        chartId: crypto.randomUUID(),
        tables: [],
      },
    };
  }

  // 3. Guard SQL.
  let guarded;
  try {
    guarded = guardSql(llm.spec.sql, role);
  } catch (err) {
    if (err instanceof SqlGuardError) {
      // Bubble up as clarification — better UX than a 500.
      return {
        spec: llm.spec,
        data: [],
        explanation: '',
        followUpSuggestions: defaultSuggestions(role),
        clarificationQuestion: `I couldn't safely run that query: ${err.message} Could you rephrase?`,
        metadata: {
          latencyMs: Date.now() - startedAt,
          sqlRetries: 0,
          conversationId: req.conversationId,
          requestId: crypto.randomUUID(),
          chartId: crypto.randomUUID(),
          tables: [],
        },
      };
    }
    throw err;
  }

  // 4. Execute.
  let rows: Array<Record<string, unknown>> = [];
  let sqlRetries = 0;
  try {
    rows = await executeAnalyticsSql(guarded.sql, userId, role);
    rows = normalizeRows(rows, llm.spec);
  } catch (err: any) {
    console.error('[analytics] SQL exec failed:', err?.message ?? err);
    // One retry: ask the LLM to fix the query knowing the error.
    sqlRetries = 1;
    try {
      const retryPrompt = `The SQL you generated failed with: ${err?.message ?? String(err)}\nFix the SQL and return the same JSON shape as before. Question: ${req.question}`;
      const retry = await getAIResponse(retryPrompt, SQL_SYSTEM_PROMPT(role, new Date().toISOString().slice(0, 10)));
      const parsed = safeJsonParse<LLMResult>(retry);
      if (parsed?.spec?.sql) {
        const guardedRetry = guardSql(parsed.spec.sql, role);
        rows = await executeAnalyticsSql(guardedRetry.sql, userId, role);
        rows = normalizeRows(rows, parsed.spec);
        llm.spec = parsed.spec;
        llm.explanation = parsed.explanation ?? llm.explanation;
        guarded.sql = guardedRetry.sql;
      } else {
        throw err;
      }
    } catch (err2: any) {
      return {
        spec: llm.spec,
        data: [],
        explanation: '',
        followUpSuggestions: defaultSuggestions(role),
        clarificationQuestion: `I couldn't run that query — could you try asking it a different way?`,
        metadata: {
          latencyMs: Date.now() - startedAt,
          sqlRetries,
          conversationId: req.conversationId,
          requestId: crypto.randomUUID(),
          chartId: crypto.randomUUID(),
          tables: guarded.tables,
        },
      };
    }
  }

  const chartId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const finalSpec: ChartSpec = { ...llm.spec, sql: guarded.sql };

  // 5. Persist into conversation memory.
  const next = [
    ...history,
    {
      chartId,
      question: req.question,
      spec: finalSpec,
      explanation: llm.explanation ?? '',
      sample: rows.slice(0, 5),
    },
  ].slice(-12); // cap memory
  CONVERSATIONS.set(req.conversationId, next);

  return {
    spec: finalSpec,
    data: rows,
    explanation: llm.explanation ?? '',
    followUpSuggestions: llm.follow_up_suggestions?.length
      ? llm.follow_up_suggestions
      : defaultSuggestions(role),
    metadata: {
      latencyMs: Date.now() - startedAt,
      sqlRetries,
      conversationId: req.conversationId,
      requestId,
      chartId,
      tables: guarded.tables,
    },
  };
}

/** Used by the route to fetch user fields for the LLM context if needed. */
export async function getUserContextFor(userId: string): Promise<{ role: Role; name: string }> {
  const u = await db.get('SELECT name, role FROM users WHERE id = ?', userId);
  if (!u) throw new Error('User not found');
  return { role: u.role as Role, name: u.name as string };
}

/* ───────────────────────────────────────────────────────────────────────
 * Editorial briefing
 *
 * Given a conversation that contains at least 2 charts, produce a narrative
 * briefing (title, dek, sections per chart). Caller renders as overlay and/or
 * exports to PDF.
 * ──────────────────────────────────────────────────────────────────────── */

export interface EditorialSection {
  number: number;
  chartId: string;
  sectionKicker: string;
  headline: string;
  kpiValue: string;
  kpiLabel: string;
  lede: string;
  body: string;
  insight: string;
}

export interface EditorialResponse {
  title: string;
  dek: string;
  kicker: string;
  sections: EditorialSection[];
  methodologyNote: string;
  colophonStamp: string;
  metadata: {
    requestId: string;
    conversationId: string;
    chartCount: number;
    latencyMs: number;
  };
}

export interface EditorialResult {
  status: 'ok' | 'needs_more_charts' | 'error';
  editorial: EditorialResponse | null;
  chartCount: number;
  message?: string;
}

const EDITORIAL_SYSTEM_PROMPT = (role: Role, today: string) => `You are a senior data journalist writing a one-page briefing for an AbiliFit ${role}. You receive a set of charts the user has already explored on their analytics canvas — each with a title, chart type, SQL, and aggregated sample rows. You weave the charts into a single cohesive editorial document with a strong narrative spine: a unifying headline, a dek that frames the period, and N section spreads — one per chart — each with its own headline, lede, narrative body, and pull-quote insight.

You are NOT writing a report. You are writing magazine prose. Monocle. The Economist. Bloomberg Businessweek. Confident, specific, lean. Active voice. Concrete numbers. No hedging. Every sentence earns its place.

Today's date is ${today}.

OUTPUT — emit ONE JSON object, no markdown, no commentary. Shape:
{
  "title": "<editorial headline. Max 8 words. A claim, not a category.>",
  "dek": "<standfirst, 1-2 sentences, max 240 chars, framing the through-line.>",
  "kicker": "<IBM Plex Mono uppercase. e.g. 'PLATFORM BRIEFING · MAY 2026' or 'TRAINING FIELD REPORT · WEEK 19'>",
  "sections": [
    {
      "number": 1,
      "chart_id": "<must match an input chart's chart_id>",
      "section_kicker": "<IBM Plex Mono category. e.g. 'ENGAGEMENT', 'RETENTION', 'TOP MUSCLE GROUPS'>",
      "headline": "<editorial title. Max 9 words. A claim.>",
      "kpi_value": "<single most important number, formatted. e.g. '76.2%', '+24 sessions'>",
      "kpi_label": "<uppercase tracked label. e.g. 'COMPLETION RATE', 'NEW SIGNUPS, MAY'>",
      "lede": "<2-3 sentences, ~280 chars. Open with the biggest number.>",
      "body": "<3-5 sentences, ~520 chars. Texture, comparison, context. May reference other sections by number ('see §03'). No bullets, no headers.>",
      "insight": "<1-2 sentences, ~200 chars. The interpretive bite — 'why this matters'.>"
    }
  ],
  "methodology_note": "<1-2 sentences. What window, how many queries informed this, any caveats.>",
  "colophon_stamp": "GENERATED BY ABILIFIT · ${new Date().toISOString().slice(0, 10)}"
}

STYLE RULES — sacred:
- Headlines are claims, not categories.
- Ledes lead with the biggest number.
- Active voice. Specific verbs. No "is" parades.
- Numbers are characters in the story, not decorations.
- No hedging. Be confident or be quiet.
- Section ordering follows chart creation order. Do not rearrange.
- The unifying headline ties at least 2 sections together — it's a thesis, not a summary.
- Cross-references between sections ("see §03") are encouraged.
- Insight callouts must earn attention.

BEHAVIORAL:
- If the input has fewer than 2 usable charts, return {"error":"needs_more_charts"}.
- If any chart's sample is empty, skip it silently and renumber.
- Never invent data. Use only what's in the input rows.
`;

export async function generateEditorialBriefing(
  conversationId: string,
  role: Role,
): Promise<EditorialResult> {
  const started = Date.now();
  const history = CONVERSATIONS.get(conversationId) ?? [];
  const usable = history.filter((h) => h.sample.length > 0);

  if (usable.length < 2) {
    return {
      status: 'needs_more_charts',
      editorial: null,
      chartCount: usable.length,
      message: 'Run a couple more queries first — I need at least two charts to weave a briefing.',
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt = EDITORIAL_SYSTEM_PROMPT(role, today);

  const userPrompt = [
    `# Charts in this session (in order)`,
    ...usable.map(
      (h, i) =>
        `\n## §${i + 1} — chart_id: ${h.chartId}\n- title: ${h.spec.title}\n- chart_type: ${h.spec.chartType}\n- description: ${h.spec.description ?? ''}\n- user_question: ${h.question}\n- explanation: ${h.explanation}\n- sample_rows: ${JSON.stringify(h.sample.slice(0, 5))}`,
    ),
  ].join('\n');

  const raw = await getAIResponse(userPrompt, systemPrompt, 1500);
  if (!raw) {
    return { status: 'error', editorial: null, chartCount: usable.length, message: 'Empty response from LLM.' };
  }
  const parsed = safeJsonParse<any>(raw);
  if (!parsed) {
    return { status: 'error', editorial: null, chartCount: usable.length, message: 'Malformed JSON from LLM.' };
  }
  if (parsed.error === 'needs_more_charts') {
    return {
      status: 'needs_more_charts',
      editorial: null,
      chartCount: usable.length,
      message: parsed.message ?? 'Run a couple more queries first.',
    };
  }
  if (!Array.isArray(parsed.sections) || !parsed.title) {
    return { status: 'error', editorial: null, chartCount: usable.length, message: 'Editorial output missing required fields.' };
  }

  // Normalise the response into our camelCase shape.
  const sections: EditorialSection[] = (parsed.sections as any[])
    .filter((s) => s && typeof s === 'object')
    .map((s, i) => ({
      number: typeof s.number === 'number' ? s.number : i + 1,
      chartId: String(s.chart_id ?? s.chartId ?? ''),
      sectionKicker: String(s.section_kicker ?? s.sectionKicker ?? ''),
      headline: String(s.headline ?? ''),
      kpiValue: String(s.kpi_value ?? s.kpiValue ?? ''),
      kpiLabel: String(s.kpi_label ?? s.kpiLabel ?? ''),
      lede: String(s.lede ?? ''),
      body: String(s.body ?? ''),
      insight: String(s.insight ?? ''),
    }))
    .filter((s) => s.chartId && s.headline);

  if (sections.length < 2) {
    return { status: 'error', editorial: null, chartCount: usable.length, message: 'Editorial output didn\'t include enough sections.' };
  }

  const editorial: EditorialResponse = {
    title: String(parsed.title),
    dek: String(parsed.dek ?? ''),
    kicker: String(parsed.kicker ?? `${role.toUpperCase()} BRIEFING · ${today.slice(0, 7)}`),
    sections,
    methodologyNote: String(parsed.methodology_note ?? parsed.methodologyNote ?? ''),
    colophonStamp: String(parsed.colophon_stamp ?? parsed.colophonStamp ?? `GENERATED BY ABILIFIT · ${today}`),
    metadata: {
      requestId: crypto.randomUUID(),
      conversationId,
      chartCount: usable.length,
      latencyMs: Date.now() - started,
    },
  };
  return { status: 'ok', editorial, chartCount: usable.length };
}
