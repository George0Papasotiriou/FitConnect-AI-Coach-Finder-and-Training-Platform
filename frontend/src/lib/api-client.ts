import { env } from "@/lib/env";
import {
  EditorialResponseSchema,
  queryResponseSchema,
  type EditorialResponse,
  type QueryResponse,
} from "@/lib/api-types";
import { createLogger } from "@/lib/logger";

const log = createLogger("api-client");

function generateRequestId(): string {
  return crypto.randomUUID();
}

export async function postQuery(
  question: string,
  conversationId?: string,
): Promise<QueryResponse> {
  const requestId = generateRequestId();
  const url = `${env.NEXT_PUBLIC_BACKEND_URL}/api/query`;

  log.info("Submitting query", {
    request_id: requestId,
    url,
    question_len: question.length,
    conversation_id: conversationId ?? null,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
      body: JSON.stringify({
        question,
        conversation_id: conversationId ?? null,
      }),
    });

    if (!res.ok) {
      log.error("Query failed", {
        request_id: requestId,
        status: res.status,
      });
      throw new Error(`Query failed: ${res.status}`);
    }

    const json = await res.json();
    const parsed = queryResponseSchema.parse(json);
    log.info("Query succeeded", {
      request_id: requestId,
      latency_ms: parsed.metadata.latency_ms,
    });
    return parsed;
  } catch (err) {
    log.error("Query error", {
      request_id: requestId,
      error: String(err),
    });
    throw err;
  }
}

export async function generateEditorial(
  conversationId: string,
): Promise<EditorialResponse> {
  log.info("Editorial requested", { conversation_id: conversationId });
  const res = await fetch(
    `${env.NEXT_PUBLIC_BACKEND_URL}/api/editorial`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId }),
    },
  );
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    log.error("Editorial failed", { status: res.status, detail });
    const message =
      typeof detail === "object" &&
      detail !== null &&
      "detail" in detail &&
      typeof (detail as { detail: unknown }).detail === "object" &&
      (detail as { detail: { message?: unknown } }).detail !== null &&
      typeof (detail as { detail: { message?: unknown } }).detail.message ===
        "string"
        ? ((detail as { detail: { message: string } }).detail.message)
        : `Editorial generation failed (${res.status})`;
    throw new Error(message);
  }
  const json = await res.json();
  const parsed = EditorialResponseSchema.parse(json);
  log.info("Editorial received", {
    title: parsed.title,
    section_count: parsed.sections.length,
    latency_ms: parsed.metadata.latency_ms,
  });
  return parsed;
}

export async function resetConversation(conversationId: string): Promise<void> {
  const url = `${env.NEXT_PUBLIC_BACKEND_URL}/api/conversations/${conversationId}/reset`;
  try {
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      log.warn("Reset failed (non-2xx)", { conversation_id: conversationId, status: res.status });
      return;
    }
    log.info("Conversation reset on backend", { conversation_id: conversationId });
  } catch (err) {
    log.warn("Reset network error", { conversation_id: conversationId, error: String(err) });
  }
}
