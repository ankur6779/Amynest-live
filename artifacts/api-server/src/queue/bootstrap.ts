import { logger } from "../lib/logger.js";
import { getAiJobsQueue } from "./index.js";
import { getQueueMode, isBullMqActive, mustUseBullMq } from "./mode.js";
import { getRedisUrl, verifyRedisConnection } from "./redis.js";

export type QueueHealthSnapshot = {
  status: "ok" | "degraded";
  redis: boolean;
  queueMode: "bullmq" | "memory";
  workerExpected: boolean;
  redisPing?: boolean;
  bullmq?: Record<string, number>;
};

/** API startup: fail fast if production has no Redis; verify connection when configured. */
export async function bootstrapApiQueue(): Promise<QueueHealthSnapshot> {
  const queueMode = getQueueMode();
  const redisUrl = getRedisUrl();
  const workerExpected = queueMode === "bullmq";

  console.log("Queue mode:", queueMode);
  console.log("Redis connected:", !!redisUrl);

  let redisPing = false;
  if (isBullMqActive()) {
    try {
      redisPing = await verifyRedisConnection();
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ evt: "queue.bootstrap_failed", message }, "Redis/BullMQ init failed");
      if (mustUseBullMq()) {
        throw new Error(`Redis queue failed to initialize: ${message}`);
      }
    }
  } else {
    logger.warn(
      { evt: "queue.bootstrap", queueMode: "memory" },
      "In-memory AI queue (development only)",
    );
  }

  return {
    status: redisPing || !workerExpected ? "ok" : "degraded",
    redis: !!redisUrl && redisPing,
    queueMode,
    workerExpected,
    redisPing,
  };
}

export async function getQueueHealthSnapshot(): Promise<QueueHealthSnapshot> {
  const queueMode = getQueueMode();
  const redisUrl = !!getRedisUrl();
  let redisPing = false;
  let bullmq: Record<string, number> | undefined;

  if (queueMode === "bullmq") {
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
