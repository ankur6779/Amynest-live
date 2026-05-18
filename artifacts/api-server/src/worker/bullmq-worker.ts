import { Worker } from "bullmq";
import { logger } from "../lib/logger.js";
import {
  AI_JOBS_QUEUE_NAME,
  type AiJobQueuePayload,
} from "../queue/index.js";
import { getRedisConnection, isRedisQueueEnabled } from "../queue/redis.js";
import { processAiJob } from "./ai-service.js";

const CONCURRENCY = Number(process.env.AI_MAX_CONCURRENT_JOBS ?? "3");

let worker: Worker<AiJobQueuePayload> | undefined;

export function startBullMqWorker(): Worker<AiJobQueuePayload> {
  if (!isRedisQueueEnabled()) {
    throw new Error("REDIS_URL required for BullMQ worker");
  }
  if (worker) return worker;

  worker = new Worker<AiJobQueuePayload>(
    AI_JOBS_QUEUE_NAME,
    async (job) => processAiJob(job.data),
    {
      connection: getRedisConnection(),
      concurrency: CONCURRENCY,
    },
  );

  worker.on("completed", (job) => {
    logger.info({ evt: "bullmq.completed", jobId: job.id }, "BullMQ job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      {
        evt: "bullmq.failed",
        jobId: job?.id,
        message: err.message,
      },
      "BullMQ job failed",
    );
  });

  worker.on("error", (err) => {
    logger.error({ evt: "bullmq.worker_error", err }, "BullMQ worker error");
  });

  logger.info(
    { evt: "bullmq.worker_started", concurrency: CONCURRENCY, queue: AI_JOBS_QUEUE_NAME },
    "BullMQ AI worker started",
  );

  return worker;
}

export async function stopBullMqWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = undefined;
  }
}
