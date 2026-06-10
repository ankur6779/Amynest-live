import { enqueueBullMqJob, getBullMqQueueStats } from "./index.js";
import {
  getQueueMode,
  isBullMqActive,
  isQueueProcessingEnabled,
  isWorkerEnabled,
} from "./mode.js";
import { isApiQueueBootstrapComplete } from "./bootstrap.js";
import {
  enqueueMemoryJob,
  getMemoryQueueStats,
  scheduleMemoryDrain,
} from "./memory-queue.js";
import type { AiJobType, EnqueueResult } from "./types.js";

export { scheduleMemoryDrain as scheduleDrain };
export {
  getQueueMode,
  isBullMqActive,
  isInProcessQueueMode,
  isQueueProcessingEnabled,
  isWorkerEnabled,
} from "./mode.js";

export type EnqueueAiJobOptions = {
  /** When set, BullMQ uses this job id — enables dedup for static-audio generation. */
  deterministicJobId?: string;
};

export async function enqueueAiJob(
  type: AiJobType,
  userId: string,
  payload: unknown,
  options?: EnqueueAiJobOptions,
): Promise<EnqueueResult> {
  if (isWorkerEnabled() && !isApiQueueBootstrapComplete()) {
    return {
      jobId: "",
      status: "failed",
      deferred: true,
      retryAfterMs: 0,
      error: "queue_bootstrap_pending",
    };
  }
  if (!isQueueProcessingEnabled()) {
    return {
      jobId: "",
      status: "failed",
      deferred: true,
      retryAfterMs: 0,
    };
  }
  if (isBullMqActive()) {
    return enqueueBullMqJob(type, userId, payload, options?.deterministicJobId);
  }
  const mode = getQueueMode();
  if (mode === "memory" || mode === "inline") {
    return enqueueMemoryJob(type, userId, payload);
  }
  return {
    jobId: "",
    status: "failed",
    deferred: true,
    retryAfterMs: 0,
  };
}

export async function getQueueStats(): Promise<Record<string, unknown>> {
  if (isBullMqActive()) {
    const bull = await getBullMqQueueStats();
    return { mode: "bullmq", ...bull };
  }
  return getMemoryQueueStats();
}

export { resetMemoryQueue as resetAiJobQueue } from "./memory-queue.js";
