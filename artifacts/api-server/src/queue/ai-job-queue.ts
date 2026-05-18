import { enqueueBullMqJob, getBullMqQueueStats } from "./index.js";
import { getQueueMode, isBullMqActive } from "./mode.js";
import {
  enqueueMemoryJob,
  getMemoryQueueStats,
  scheduleMemoryDrain,
} from "./memory-queue.js";
import type { AiJobType, EnqueueResult } from "./types.js";

export { scheduleMemoryDrain as scheduleDrain };
export { getQueueMode, isBullMqActive } from "./mode.js";

export async function enqueueAiJob(
  type: AiJobType,
  userId: string,
  payload: unknown,
): Promise<EnqueueResult> {
  if (isBullMqActive()) {
    return enqueueBullMqJob(type, userId, payload);
  }
  return enqueueMemoryJob(type, userId, payload);
}

export async function getQueueStats(): Promise<Record<string, unknown>> {
  if (isBullMqActive()) {
    const bull = await getBullMqQueueStats();
    return { mode: "bullmq", ...bull };
  }
  return getMemoryQueueStats();
}

export { resetMemoryQueue as resetAiJobQueue } from "./memory-queue.js";
