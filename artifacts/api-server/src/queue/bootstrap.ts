import { logger } from "../lib/logger.js";
import { getAiJobsQueue } from "./index.js";
import {
  getQueueMode,
  isBullMqActive,
  isWorkerEnabled,
  markRedisBootstrapResult,
  mustUseBullMq,
} from "./mode.js";
import { getRedisUrl, verifyRedisConnection } from "./redis.js";

export type QueueHealthSnapshot = {
  status: "ok" | "degraded";
  redis: boolean;
  queueMode: "bullmq" | "memory" | "off";
  workerExpected: boolean;
  redisPing?: boolean;
  bullmq?: Record<string, number>;
};

/** API startup: connect to Redis only when worker + BullMQ are enabled. */
export async function bootstrapApiQueue(): Promise<QueueHealthSnapshot> {
  const redisUrl = getRedisUrl();

  if (!isWorkerEnabled()) {
    markRedisBootstrapResult(false);
    logger.info(
      { evt: "queue.bootstrap.skipped", reason: "WORKER_ENABLED=false" },
      "Redis/BullMQ bootstrap skipped — worker disabled",
    );
    return {
      status: "ok",
      redis: false,
      queueMode: "off",
      workerExpected: false,
      redisPing: false,
    };
  }

  const queueMode = getQueueMode();
  const workerExpected = queueMode === "bullmq";

  console.log("Queue mode:", queueMode);
  console.log("Redis connected:", !!redisUrl);
  console.log("Worker enabled:", isWorkerEnabled());

  let redisPing = false;
  if (isBullMqActive()) {
    try {
      redisPing = await verifyRedisConnection();
      markRedisBootstrapResult(redisPing);
      if (!redisPing) {
        logger.warn(
          { evt: "queue.bootstrap.redis_unstable" },
          "Redis ping failed — BullMQ disabled for this process (no retries)",
        );
      } else {
        getAiJobsQueue();
        logger.info(
          {
            evt: "queue.bootstrap",
            queueMode,
            redis: true,
            redisPing,
            workerExpected,
          },
          "API queue ready (BullMQ — AI runs on worker only)",
        );
      }
    } catch (err) {
      markRedisBootstrapResult(false);
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ evt: "queue.bootstrap_failed", message }, "Redis/BullMQ init failed");
      if (mustUseBullMq()) {
        throw new Error(`Redis queue failed to initialize: ${message}`);
      }
    }
  } else {
    markRedisBootstrapResult(false);
    logger.warn(
      { evt: "queue.bootstrap", queueMode },
      queueMode === "memory"
        ? "In-memory AI queue (development only)"
        : "AI queue off — no Redis/BullMQ load",
    );
  }

  const effectiveMode = getQueueMode();

  return {
    status: redisPing || effectiveMode !== "bullmq" ? "ok" : "degraded",
    redis: !!redisUrl && redisPing,
    queueMode: effectiveMode,
    workerExpected: effectiveMode === "bullmq",
    redisPing,
  };
}

export async function getQueueHealthSnapshot(): Promise<QueueHealthSnapshot> {
  const queueMode = getQueueMode();
  const redisUrl = !!getRedisUrl();
  let redisPing = false;
  let bullmq: Record<string, number> | undefined;

  if (isBullMqActive()) {
    try {
      redisPing = await verifyRedisConnection();
      const { getBullMqQueueStats } = await import("./index.js");
      bullmq = await getBullMqQueueStats();
    } catch {
      redisPing = false;
    }
  }

  return {
    status: queueMode === "bullmq" && !redisPing ? "degraded" : "ok",
    redis: redisUrl && redisPing,
    queueMode,
    workerExpected: queueMode === "bullmq",
    redisPing,
    bullmq,
  };
}
