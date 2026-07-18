import type { AiJobRecord, AiJobStatus } from "./types.js";
import { getRedisConnection, isRedisQueueEnabled } from "./redis.js";
import { isCacheDisabled } from "../services/admin-ops-store.js";

const JOB_KEY_PREFIX = "job:";
const USER_ACTIVE_PREFIX = "ai:user:";
const FINALIZE_LOCK_PREFIX = "job:finalize:";
const TTL_SEC_DEFAULT = Number(process.env.AI_JOB_RESULT_TTL_SEC ?? "600");
const TTL_SEC_LONG = Number(process.env.AI_JOB_RESULT_TTL_LONG_SEC ?? "900");

const LONG_TTL_JOB_TYPES = new Set([
  "tts.pregenerate",
  "audio.warmup",
  "audio-lessons.pregenerate",
  "ai-coach.pregenerate_audio",
  "ai-coach.pregenerate_infant_audio",
]);

const MAX_USER_ACTIVE_JOBS = Number(process.env.AI_MAX_USER_ACTIVE_JOBS ?? "4");

function jobResultTtlSec(type?: string): number {
  if (type && LONG_TTL_JOB_TYPES.has(type)) return TTL_SEC_LONG;
  return TTL_SEC_DEFAULT;
}

export class JobRecordPersistenceError extends Error {
  readonly code: "job_records_disabled" | "redis_unavailable";

  constructor(code: "job_records_disabled" | "redis_unavailable", message: string) {
    super(message);
    this.name = "JobRecordPersistenceError";
    this.code = code;
  }
}

export function isJobRecordPersistenceBlocked(): boolean {
  return isCacheDisabled();
}

function jobKey(jobId: string): string {
  return `${JOB_KEY_PREFIX}${jobId}`;
}

function userActiveKey(userId: string): string {
  return `${USER_ACTIVE_PREFIX}${userId.trim() || "anonymous"}:active_count`;
}

export async function saveJobRecord(record: AiJobRecord): Promise<void> {
  if (!isRedisQueueEnabled()) {
    throw new JobRecordPersistenceError("redis_unavailable", "REDIS_URL is not configured");
  }
  if (isCacheDisabled()) {
    throw new JobRecordPersistenceError(
      "job_records_disabled",
      "Job record persistence is disabled (cacheDisabled admin flag)",
    );
  }
  const redis = getRedisConnection();
  await redis.set(jobKey(record.id), JSON.stringify(record), "EX", jobResultTtlSec(record.type));
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

async function maybeRefundLoadMoreQuota(job: AiJobRecord): Promise<void> {
  try {
    const { refundLoadMoreQuotaFromJob } = await import(
      "../services/learningLoadMoreService.js"
    );
    await refundLoadMoreQuotaFromJob(job);
  } catch (err) {
    const { logger } = await import("../lib/logger.js");
    logger.warn(
      {
        evt: "load_more.quota_refund_failed",
        jobId: job.id,
        message: err instanceof Error ? err.message : String(err),
      },
      "load-more quota refund failed",
    );
  }
}

async function readJobRecord(jobId: string): Promise<AiJobRecord | undefined> {
  if (isRedisQueueEnabled()) {
    return getJobRecord(jobId);
  }
  const { getJob } = await import("./ai-job-store.js");
  return getJob(jobId);
}

async function writeJobRecord(record: AiJobRecord): Promise<void> {
  if (isRedisQueueEnabled()) {
    await saveJobRecord(record);
    return;
  }
  const { updateJob } = await import("./ai-job-store.js");
  updateJob(record.id, record);
}

/** Single-flight lock so concurrent poll GETs do not double-apply side effects. */
export async function tryAcquirePollFinalizeLock(jobId: string): Promise<boolean> {
  if (!isRedisQueueEnabled()) return true;
  const redis = getRedisConnection();
  const ok = await redis.set(`${FINALIZE_LOCK_PREFIX}${jobId}`, "1", "EX", 120, "NX");
  return ok === "OK";
}

/** Wait for another poll request to finish finalize + apiResult cache. */
export async function waitForPollApiResult(
  jobId: string,
  timeoutMs: number,
): Promise<AiJobRecord | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await readJobRecord(jobId);
    if (job?.apiResult !== undefined) return job;
    await new Promise((r) => setTimeout(r, 50));
  }
  return readJobRecord(jobId);
}

export async function patchJobRecord(
  jobId: string,
  patch: Partial<
    Pick<
      AiJobRecord,
      | "status"
      | "result"
      | "apiResult"
      | "sideEffectsApplied"
      | "error"
      | "timedOut"
      | "payload"
    >
  >,
): Promise<AiJobRecord | undefined> {
  const existing = await readJobRecord(jobId);
  if (!existing) return undefined;
  const updated: AiJobRecord = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  await writeJobRecord(updated);
  if (
    updated.status === "completed" ||
    updated.status === "failed" ||
    updated.status === "timed_out"
  ) {
    await releaseUserSlot(updated.userId);
    if (updated.type === "ai-coach.initial_wins") {
      void (async () => {
        const { clearCoachActiveGenerationForJob } = await import(
          "../lib/coach-active-generation.js"
        );
        await clearCoachActiveGenerationForJob(updated.payload);
      })();
    }
    if (updated.status === "failed" || updated.status === "timed_out") {
      void maybeRefundLoadMoreQuota(updated);
    }
  }
  return updated;
}

/** Per-user cap on concurrently active jobs (queued + processing). */
export async function tryAcquireUserSlot(userId: string): Promise<boolean> {
  if (!isRedisQueueEnabled()) return true;
  const redis = getRedisConnection();
  const key = userActiveKey(userId);
  const n = await redis.incr(key);
  await redis.expire(key, TTL_SEC_LONG);
  if (n <= MAX_USER_ACTIVE_JOBS) return true;
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
