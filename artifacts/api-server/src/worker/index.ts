/**
 * AI worker service — processes BullMQ queue when REDIS_URL is set.
 *
 *   pnpm --filter @workspace/api-server worker:start
 *
 * Render: separate service, same REDIS_URL as API, start command above.
 */
import { logAmynestEnvironment } from "../lib/loadEnv.js";
import { logger } from "../lib/logger.js";
import { registerProcessErrorHandlers } from "../utils/async-errors.js";
import { startMemoryMonitor } from "../utils/memory-monitor.js";
import { getQueueMode, mustUseBullMq } from "../queue/mode.js";
import { isRedisQueueEnabled, verifyRedisConnection } from "../queue/redis.js";
import { scheduleMemoryDrain, getMemoryQueueStats } from "../queue/memory-queue.js";
import { startBullMqWorker, stopBullMqWorker } from "./bullmq-worker.js";
import { closeRedisConnection } from "../queue/redis.js";

async function startWorker(): Promise<void> {
  registerProcessErrorHandlers();
  logAmynestEnvironment();
  startMemoryMonitor();

  const queueMode = getQueueMode();
  console.log("Queue mode:", queueMode);
  console.log("Redis connected:", isRedisQueueEnabled());

  if (mustUseBullMq() && !isRedisQueueEnabled()) {
    throw new Error(
      "REDIS_URL is required in production for the AI worker. Set REDIS_URL on the Worker service.",
    );
  }

  if (isRedisQueueEnabled()) {
    const pingOk = await verifyRedisConnection();
    if (!pingOk) {
      throw new Error("Redis connection failed — worker cannot start");
    }
    startBullMqWorker();
    console.log("BullMQ worker started");
    logger.info({ evt: "ai_worker.mode", mode: "bullmq" }, "AI worker running (BullMQ + Redis)");
    return;
  }

  logger.warn(
    { evt: "ai_worker.mode", mode: "memory" },
    "REDIS_URL not set — using in-memory drain (dev only)",
  );
  setInterval(() => {
    scheduleMemoryDrain();
    const stats = getMemoryQueueStats();
    if (stats.activeCount > 0 || stats.pendingCount > 0) {
      logger.debug({ evt: "ai_worker.memory_tick", ...stats }, "Memory worker tick");
    }
  }, 250);
}

startWorker().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error({ err, message }, "AI worker failed to start");
  console.error("AI worker failed to start:", message);
  process.exit(1);
});

async function shutdown(): Promise<void> {
  logger.info({ evt: "ai_worker.shutdown" }, "AI worker shutting down");
  await stopBullMqWorker();
  await closeRedisConnection();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
