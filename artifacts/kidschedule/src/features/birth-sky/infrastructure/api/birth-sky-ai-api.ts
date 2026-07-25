/**
 * Birth Sky AI HTTP/SSE client (Pack 6).
 */

import { getApiUrl } from "@/lib/api";
import { parseApiJson } from "@/lib/safe-json-response";
import type { AuthFetchFn } from "./birth-sky-api";
import type {
  AiEntitlementMirror,
  BirthSkyConversation,
  BirthSkyMessage,
} from "../../domain/models/conversation";
import type { BirthSkyStreamContextPayload } from "../../application/ai/assemble-context";

export async function fetchBirthSkyAiEntitlement(
  authFetch: AuthFetchFn,
  profileId: string,
): Promise<AiEntitlementMirror> {
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/profiles/${profileId}/ai-entitlement`),
  );
  if (!res.ok) throw new Error(`ai_entitlement_failed:${res.status}`);
  return parseApiJson<AiEntitlementMirror>(res);
}

export async function listBirthSkyConversations(
  authFetch: AuthFetchFn,
  profileId: string,
): Promise<BirthSkyConversation[]> {
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/profiles/${profileId}/conversations`),
  );
  if (!res.ok) throw new Error(`list_conversations_failed:${res.status}`);
  const body = await parseApiJson<{ conversations: BirthSkyConversation[] }>(res);
  return body.conversations ?? [];
}

export async function getBirthSkyConversation(
  authFetch: AuthFetchFn,
  conversationId: string,
): Promise<{ conversation: BirthSkyConversation; messages: BirthSkyMessage[] }> {
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/conversations/${conversationId}`),
  );
  if (!res.ok) throw new Error(`get_conversation_failed:${res.status}`);
  return parseApiJson(res);
}

export async function createBirthSkyConversation(
  authFetch: AuthFetchFn,
  profileId: string,
  entryPoint: string,
): Promise<BirthSkyConversation> {
  const res = await authFetch(getApiUrl("/api/birth-sky/conversations"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, entryPoint }),
  });
  if (!res.ok) throw new Error(`create_conversation_failed:${res.status}`);
  const body = await parseApiJson<{ conversation: BirthSkyConversation }>(res);
  return body.conversation;
}

export type StreamHandlers = {
  onJob: (data: {
    jobId: string;
    deliveryId: string;
    contextSchemaVersion: string;
  }) => void;
  onChunk: (data: { chunkSequence: number; delta: string; jobId: string }) => void;
  onDone: (data: {
    jobId: string;
    deliveryId: string;
    messageId: string;
    modelVersion: string;
    contextSchemaVersion: string;
    snapshotVersion: string;
    engineVersion: string;
    consumeEligible: boolean;
    finalText?: string;
  }) => void;
  onModerated: (data: {
    jobId: string;
    deliveryId: string;
    code: string;
    messageId: string;
    consumeEligible: boolean;
  }) => void;
  onError: (data: { error: string; status?: string; jobId?: string }) => void;
};

export async function streamBirthSkyMessage(
  authFetch: AuthFetchFn,
  conversationId: string,
  context: BirthSkyStreamContextPayload,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<{ status: number; paywalled: boolean }> {
  // Long timeout: stream may run up to server AI timeout (~30s) + buffer.
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/conversations/${conversationId}/messages/stream`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(context),
      signal,
    },
    120_000,
  );

  if (res.status === 402) {
    return { status: 402, paywalled: true };
  }
  if (!res.ok || !res.body) {
    handlers.onError({ error: `stream_http_${res.status}` });
    return { status: res.status, paywalled: false };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (event: string, data: Record<string, unknown>) => {
    if (event === "job") {
      handlers.onJob(data as Parameters<StreamHandlers["onJob"]>[0]);
    } else if (event === "chunk") {
      handlers.onChunk(data as Parameters<StreamHandlers["onChunk"]>[0]);
    } else if (event === "done") {
      handlers.onDone(data as Parameters<StreamHandlers["onDone"]>[0]);
    } else if (event === "moderated") {
      handlers.onModerated(data as Parameters<StreamHandlers["onModerated"]>[0]);
    } else if (event === "error") {
      handlers.onError(data as Parameters<StreamHandlers["onError"]>[0]);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const lines = part.split("\n");
      let event = "message";
      let dataLine = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      try {
        dispatch(event, JSON.parse(dataLine) as Record<string, unknown>);
      } catch {
        /* ignore malformed chunk */
      }
    }
  }

  return { status: 200, paywalled: false };
}

export async function ackBirthSkyDelivery(
  authFetch: AuthFetchFn,
  deliveryId: string,
  body: { profileId: string; conversationId: string; jobId: string },
): Promise<{
  aiInsightsUsedCount: number;
  consumedFreeInsight: boolean;
  alreadyAcked: boolean;
  isPremium: boolean;
}> {
  const res = await authFetch(getApiUrl(`/api/birth-sky/deliveries/${deliveryId}/ack`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ack_failed:${res.status}`);
  return parseApiJson(res);
}

export async function cancelBirthSkyJob(
  authFetch: AuthFetchFn,
  jobId: string,
): Promise<void> {
  await authFetch(getApiUrl(`/api/birth-sky/jobs/${jobId}/cancel`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}
