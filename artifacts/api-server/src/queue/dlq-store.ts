import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger.js";
import { hashUserIdForSentry } from "../lib/sentry.js";
import { getRedisConnection, isRedisQueueEnabled } from "./redis.js";
import type { AiJobType } from "./types.js";

const DLQ_LIST_KEY = "ai:dlq:entries";
const DLQ_MAX = Number(process.env.AI_DLQ_MAX_ENTRIES ?? "500");

export type DlqReason = "timed_out" | "failed" | "exhausted_retries";

export type DlqEntry = {
  id: string;
  jobId: string;
  type: AiJobType | string;
  userIdHash?: string;
  reason: DlqReason;
  route?: string;
  payloadSummary: string;
  error?: string;
  timestamp: number;
  attemptsMade?: number;
};

function summarizePayload(payload: unknown): string {
  try {
    const raw = JSON.stringify(payload);
    return raw.length > 400 ? `${raw.slice(0, 400)}…` : raw;
  } catch {
    return "[unserializable]";
  }
}

export async function recordDlqEntry(input: {
  jobId: string;
  type: AiJobType | string;
  userId?: string;
  reason: DlqReason;
  route?: string;
  payload: unknown;
  error?: string;
  attemptsMade?: number;
}): Promise<void> {
  const entry: DlqEntry = {
    id: randomUUID(),
    jobId: input.jobId,
    type: input.type,
    userIdHash: hashUserIdForSentry(input.userId),
    reason: input.reason,
    route: input.route,
    payloadSummary: summarizePayload(input.payload),
    error: input.error?.slice(0, 500),
    timestamp: Date.now(),
    attemptsMade: input.attemptsMade,
  };

  if (!isRedisQueueEnabled()) {
    logger.warn({ evt: "ai.dlq.skipped", reason: "redis_unavailable", entry }, "DLQ entry not persisted");
    return;
  }

  try {
    const redis = getRedisConnection();
    await redis.lpush(DLQ_LIST_KEY, JSON.stringify(entry));
    await redis.ltrim(DLQ_LIST_KEY, 0, Math.max(0, DLQ_MAX - 1));
    logger.info({ evt: "ai.dlq.recorded", jobId: input.jobId, reason: input.reason }, "DLQ entry recorded");
  } catch (err) {
    logger.warn(
      {
        evt: "ai.dlq.persist_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      "failed to persist DLQ entry",
    );
  }
}

export async function listDlqEntries(limit = 50): Promise<DlqEntry[]> {
  if (!isRedisQueueEnabled()) return [];
  const raw = await getRedisConnection().lrange(DLQ_LIST_KEY, 0, Math.max(0, limit - 1));
  const out: DlqEntry[] = [];
  for (const line of raw) {
    try {
      out.push(JSON.parse(line) as DlqEntry);
    } catch {
      /* skip corrupt */
    }
  }
  return out;
}

export async function replayDlqEntry(id: string): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  if (!isRedisQueueEnabled()) return { ok: false, error: "redis_unavailable" };
  const redis = getRedisConnection();
  const raw = await redis.lrange(DLQ_LIST_KEY, 0, DLQ_MAX - 1);
  let target: DlqEntry | undefined;
  let targetIndex = -1;
  for (let i = 0; i < raw.length; i++) {
    try {
      const parsed = JSON.parse(raw[i]!) as DlqEntry;
      if (parsed.id === id) {
        target = parsed;
        targetIndex = i;
        break;
      }
    } catch {
      /* skip */
    }
  }
  if (!target || targetIndex < 0) return { ok: false, error: "not_found" };

  try {
    const { getJobRecord } = await import("./job-results.js");
    const record = await getJobRecord(target.jobId);
    if (!record?.payload) return { ok: false, error: "payload_missing" };
    const { enqueueBullMqJob } = await import("./index.js");
    const result = await enqueueBullMqJob(
      target.type as AiJobType,
      record.userId,
      record.payload,
    );
    if (result.status === "failed" && result.deferred) {
      return { ok: false, error: "queue_deferred" };
    }
    await redis.lrem(DLQ_LIST_KEY, 1, raw[targetIndex]!);
    return { ok: true, jobId: result.jobId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
