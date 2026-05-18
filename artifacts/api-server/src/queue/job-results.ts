import type { AiJobRecord, AiJobStatus } from "./types.js";
import { getRedisConnection, isRedisQueueEnabled } from "./redis.js";

const JOB_KEY_PREFIX = "job:";
const USER_ACTIVE_PREFIX = "ai:user:";
const TTL_SEC = Number(process.env.AI_JOB_RESULT_TTL_SEC ?? "600");

function jobKey(jobId: string): string {
  return `${JOB_KEY_PREFIX}${jobId}`;
}

function userActiveKey(userId: string): string {
  return `${USER_ACTIVE_PREFIX}${userId.trim() || "anonymous"}:active_count`;
}

export async function saveJobRecord(record: AiJobRecord): Promise<void> {
  if (!isRedisQueueEnabled()) return;
  const redis = getRedisConnection();
  await redis.set(jobKey(record.id), JSON.stringify(record), "EX", TTL_SEC);
}

export async function getJobRecord(jobId: string): Promise<AiJobRecord | undefined> {
  if (!isRedisQueueEnabled()) return undefined;
  const redis = getRedisConnection();
  const raw = await redis.get(jobKey(jobId));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as AiJobRecord;
  } catch {
    return undefined;
  }
}

export async function patchJobRecord(
  jobId: string,
  patch: Partial<Pick<AiJobRecord, "status" | "result" | "error" | "timedOut">>,
): Promise<AiJobRecord | undefined> {
  const existing = await getJobRecord(jobId);
  if (!existing) return undefined;
  const updated: AiJobRecord = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  await saveJobRecord(updated);
  if (
    updated.status === "completed" ||
    updated.status === "failed" ||
    updated.status === "timed_out"
  ) {
    await releaseUserSlot(updated.userId);
  }
  return updated;
}

/** Per-user cap: 1 processing + 1 queued (max 2 active). */
export async function tryAcquireUserSlot(userId: string): Promise<boolean> {
  if (!isRedisQueueEnabled()) return true;
  const redis = getRedisConnection();
  const key = userActiveKey(userId);
  const n = await redis.incr(key);
  await redis.expire(key, TTL_SEC);
  if (n <= 2) return true;
  await redis.decr(key);
  return false;
}

export async function releaseUserSlot(userId: string): Promise<void> {
  if (!isRedisQueueEnabled()) return;
  const redis = getRedisConnection();
  const key = userActiveKey(userId);
  const n = await redis.decr(key);
  if (n <= 0) await redis.del(key);
}

export async function waitForJobResult(
  jobId: string,
  timeoutMs: number,
  pollMs = 150,
): Promise<AiJobRecord | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await getJobRecord(jobId);
    if (
      job &&
      (job.status === "completed" ||
        job.status === "failed" ||
        job.status === "timed_out")
    ) {
      return job;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return getJobRecord(jobId);
}

export function isTerminalStatus(status: AiJobStatus): boolean {
  return status === "completed" || status === "failed" || status === "timed_out";
}
