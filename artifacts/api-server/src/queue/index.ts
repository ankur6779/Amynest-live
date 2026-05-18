/**
 * BullMQ + Redis AI job queue (Render: API enqueues, worker processes).
 * Falls back to in-memory queue when REDIS_URL is unset (local dev).
 */
import { Queue } from "bullmq";
import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger.js";
import type { AiJobType, EnqueueResult } from "./types.js";
import { getRedisConnection, isRedisQueueEnabled } from "./redis.js";
import {
  getJobRecord,
  saveJobRecord,
  tryAcquireUserSlot,
  releaseUserSlot,
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

export function getAiJobsQueue(): Queue<AiJobQueuePayload> {
  if (!isRedisQueueEnabled()) {
    throw new Error("Redis queue is not enabled");
  }
  if (!bullQueue) {
    bullQueue = new Queue<AiJobQueuePayload>(AI_JOBS_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "fixed", delay: 1000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      },
    });
  }
  return bullQueue;
}

export async function enqueueBullMqJob(
  type: AiJobType,
  userId: string,
  payload: unknown,
): Promise<EnqueueResult> {
  const uid = userId.trim() || "anonymous";
  const slotOk = await tryAcquireUserSlot(uid);
  if (!slotOk) {
    return {
      jobId: "",
      status: "failed",
      deferred: true,
      retryAfterMs: 2_000,
    };
  }

  const jobId = randomUUID();
  const now = Date.now();
  const record: AiJobRecord = {
    id: jobId,
    type,
    userId: uid,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await saveJobRecord(record);
    const queue = getAiJobsQueue();
    await queue.add(
      "process",
      { jobId, type, userId: uid, payload },
      { jobId },
    );
    logger.info(
      { evt: "ai_job.bullmq_enqueued", jobId, type, userId: uid },
      "AI job enqueued (BullMQ)",
    );
    return { jobId, status: "queued", deferred: false };
  } catch (err) {
    await releaseUserSlot(uid);
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ evt: "ai_job.enqueue_failed", message }, "BullMQ enqueue failed");
    throw err;
  }
}

export async function getBullMqQueueStats(): Promise<Record<string, number>> {
  if (!isRedisQueueEnabled()) return {};
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
  if (isRedisQueueEnabled()) {
    return getJobRecord(jobId);
  }
  const { getJob } = await import("./ai-job-store.js");
  return getJob(jobId);
}

export { isRedisQueueEnabled, getRedisConnection } from "./redis.js";
export {
  getJobRecord,
  saveJobRecord,
  patchJobRecord,
  waitForJobResult,
  isTerminalStatus,
} from "./job-results.js";
