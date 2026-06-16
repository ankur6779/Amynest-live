import { Worker } from "bullmq";
import { logger } from "../lib/logger.js";
import {
  AI_JOBS_QUEUE_NAME,
  type AiJobQueuePayload,
} from "../queue/index.js";
import { getBullMqRedisConnection, isRedisQueueEnabled } from "../queue/redis.js";
import { processAiJob } from "./ai-service.js";

const CONCURRENCY = Number(process.env.AI_MAX_CONCURRENT_JOBS ?? "5");

let worker: Worker<AiJobQueuePayload> | undefined;
let workerRunning = false;

export function isBullMqWorkerRegistered(): boolean {
  return workerRunning && worker !== undefined;
}

export function startBullMqWorker(): Worker<AiJobQueuePayload> {
  if (!isRedisQueueEnabled()) {
    throw new Error("REDIS_URL required for BullMQ worker");
  }
  if (worker) return worker;

  worker = new Worker<AiJobQueuePayload>(
    AI_JOBS_QUEUE_NAME,
    async (job) => processAiJob(job.data),
    {
      connection: getBullMqRedisConnection(),
      concurrency: CONCURRENCY,
    },
  );
  workerRunning = true;

  worker.on("completed", (job) => {
    logger.info({ evt: "bullmq.completed", jobId: job.id }, "BullMQ job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      {
        evt: "bullmq.failed",
        jobId: job?.id,
        message: err.message,
        attemptsMade: job?.attemptsMade,
      },
      "BullMQ job failed",
    );
    void (async () => {
      const attempts = job?.opts?.attempts ?? 3;
      const made = job?.attemptsMade ?? 0;
      if (job?.data && made >= attempts) {
        const { recordDlqEntry } = await import("../queue/dlq-store.js");
        await recordDlqEntry({
          jobId: job.data.jobId,
          type: job.data.type,
          userId: job.data.userId,
          reason: "exhausted_retries",
          route: job.data.type,
          payload: job.data.payload,
          error: err.message,
          attemptsMade: made,
        });
      }
      if (job?.data) {
        const { captureBullMqJobFailure } = await import("../lib/sentry.js");
        captureBullMqJobFailure(err, {
          jobId: job.data.jobId,
          type: job.data.type,
          userId: job.data.userId,
        });
      }
    })();
  });

  worker.on("error", (err) => {
    logger.error({ evt: "bullmq.worker_error", err }, "BullMQ worker error");
  });

  console.log("BullMQ worker started");
  logger.info(
    { evt: "bullmq.worker_started", concurrency: CONCURRENCY, queue: AI_JOBS_QUEUE_NAME },
    "BullMQ AI worker started",
  );

  return worker;
}

export async function stopBullMqWorker(): Promise<void> {
  if (worker) {
    workerRunning = false;
    await worker.close();
    worker = undefined;
  }
}
