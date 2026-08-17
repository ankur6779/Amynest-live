/**
 * BullMQ + Redis AI job queue (Render: API enqueues, worker processes).
 * In-memory fallback only in development (production requires REDIS_URL).
 */
import { Queue } from "bullmq";
import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger.js";
import type { AiJobType, EnqueueResult } from "./types.js";
import { isBullMqActive } from "./mode.js";
import {
  ensureRedisReady,
  getBullMqRedisConnection,
  getRedisConnectionEpoch,
  isRedisClosedError,
  resetRedisConnection,
} from "./redis.js";
import {
  getJobRecord,
  saveJobRecord,
  tryAcquireUserSlot,
  releaseUserSlot,
  JobRecordPersistenceError,
} from "./job-results.js";
import type { AiJobRecord } from "./types.js";

export const AI_JOBS_QUEUE_NAME = "ai-jobs";

export type AiJobQueuePayload = {
  jobId: string;
  type: AiJobType;
  userId: string;
  payload: unknown;
};

let bullQueue: Queue<AiJobQueuePayload> | undefined;
let bullQueueEpoch = -1;

function createAiJobsQueue(): Queue<AiJobQueuePayload> {
  return new Queue<AiJobQueuePayload>(AI_JOBS_QUEUE_NAME, {
    connection: getBullMqRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
    },
  });
}

export function getAiJobsQueue(): Queue<AiJobQueuePayload> {
  if (!isBullMqActive()) {
    throw new Error("BullMQ queue is not active — set REDIS_URL");
  }
  const epoch = getRedisConnectionEpoch();
  if (bullQueue && bullQueueEpoch === epoch) return bullQueue;

  const previous = bullQueue;
  bullQueue = createAiJobsQueue();
  bullQueueEpoch = getRedisConnectionEpoch();
  if (previous) {
    void previous.close().catch(() => undefined);
  }
  return bullQueue;
}

export async function enqueueBullMqJob(
  type: AiJobType,
  userId: string,
  payload: unknown,
  deterministicJobId?: string,
): Promise<EnqueueResult> {
  const uid = userId.trim() || "anonymous";

  if (deterministicJobId) {
    try {
      const queue = getAiJobsQueue();
      const existing = await queue.getJob(deterministicJobId);
      if (existing) {
        const state = await existing.getState();
        if (state === "waiting" || state === "active" || state === "delayed") {
          return { jobId: deterministicJobId, status: "queued", deferred: false };
        }
      }
    } catch {
      /* proceed with enqueue */
    }
  }

  const slotOk = await tryAcquireUserSlot(uid);
  if (!slotOk) {
    return {
      jobId: "",
      status: "failed",
      deferred: true,
      retryAfterMs: 2_000,
    };
  }

  const jobId = deterministicJobId?.trim() || randomUUID();
  const now = Date.now();
  const record: AiJobRecord = {
    id: jobId,
    type,
    userId: uid,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    payload,
  };

  try {
    await saveJobRecord(record);
  } catch (err) {
    await releaseUserSlot(uid);
    if (err instanceof JobRecordPersistenceError) {
      logger.error(
        { evt: "ai_job.records_blocked", code: err.code, type, userId: uid },
        "BullMQ enqueue blocked — job records not persistable",
      );
      return {
        jobId: "",
        status: "failed",
        deferred: true,
        retryAfterMs: 0,
        error: err.code,
      };
    }
    throw err;
  }

  const jobOpts = {
    jobId,
    // Do not retain speech audio blobs in the completed BullMQ set.
    ...(type === "speech.transcribe"
      ? { removeOnComplete: true, removeOnFail: { count: 20 } }
      : {}),
  };

  try {
    await addBullMqJob({ jobId, type, userId: uid, payload }, jobOpts);
    const traceId =
      type === "ai-coach.initial_wins"
        ? (await import("../lib/coach-generate-trace.js")).extractCoachTraceIdFromPayload(payload)
        : undefined;
    if (traceId) {
      const { logCoachGenerateTrace } = await import("../lib/coach-generate-trace.js");
      logCoachGenerateTrace("bullmq.job_enqueued", {
        traceId,
        jobId,
        layer: "bullmq",
      });
    }
    console.log("Enqueueing job:", jobId);
    logger.info(
      { evt: "ai_job.bullmq_enqueued", jobId, type, userId: uid },
      "AI job enqueued (BullMQ)",
    );
    return { jobId, status: "queued", deferred: false };
  } catch (err) {
    if (isRedisClosedError(err)) {
      logger.warn(
        { evt: "ai_job.enqueue_redis_retry", jobId, type },
        "BullMQ enqueue hit a closed Redis connection — recreating queue",
      );
      resetRedisConnection();
      try {
        await ensureRedisReady("bullmq");
        await addBullMqJob({ jobId, type, userId: uid, payload }, jobOpts);
        logger.info(
          { evt: "ai_job.bullmq_enqueued", jobId, type, userId: uid, recovered: true },
          "AI job enqueued (BullMQ) after Redis reconnect",
        );
        return { jobId, status: "queued", deferred: false };
      } catch (retryErr) {
        await releaseUserSlot(uid);
        const message = retryErr instanceof Error ? retryErr.message : String(retryErr);
        logger.error({ evt: "ai_job.enqueue_failed", message }, "BullMQ enqueue failed");
        return {
          jobId: "",
          status: "failed",
          deferred: true,
          retryAfterMs: 0,
          error: "redis_unavailable",
        };
      }
    }
    await releaseUserSlot(uid);
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ evt: "ai_job.enqueue_failed", message }, "BullMQ enqueue failed");
    throw err;
  }
}

async function addBullMqJob(
  data: AiJobQueuePayload,
  opts: { jobId: string; removeOnComplete?: boolean | { count: number }; removeOnFail?: { count: number } },
): Promise<void> {
  const queue = getAiJobsQueue();
  await queue.add("process", data, opts);
}

export async function getBullMqQueueStats(): Promise<Record<string, number>> {
  if (!isBullMqActive()) return {};
  const queue = getAiJobsQueue();
  const counts = await queue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
  );
  return counts as Record<string, number>;
}

export async function getJobForApi(jobId: string): Promise<AiJobRecord | undefined> {
  if (isBullMqActive()) {
    return getJobRecord(jobId);
  }
  const { getJob } = await import("./ai-job-store.js");
  return getJob(jobId);
}

export { isRedisQueueEnabled, getRedisConnection } from "./redis.js";
export { getQueueMode, isBullMqActive, mustUseBullMq } from "./mode.js";
export {
  getJobRecord,
  saveJobRecord,
  patchJobRecord,
  waitForJobResult,
  isTerminalStatus,
  isJobRecordPersistenceBlocked,
  JobRecordPersistenceError,
} from "./job-results.js";
