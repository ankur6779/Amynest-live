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
import { isRedisQueueEnabled } from "../queue/redis.js";
import { scheduleMemoryDrain, getMemoryQueueStats } from "../queue/memory-queue.js";
import { startBullMqWorker, stopBullMqWorker } from "./bullmq-worker.js";
import { closeRedisConnection } from "../queue/redis.js";

registerProcessErrorHandlers();
logAmynestEnvironment();
startMemoryMonitor();

if (isRedisQueueEnabled()) {
  startBullMqWorker();
  logger.info({ evt: "ai_worker.mode", mode: "bullmq" }, "AI worker running (BullMQ + Redis)");
} else {
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

async function shutdown(): Promise<void> {
  logger.info({ evt: "ai_worker.shutdown" }, "AI worker shutting down");
  await stopBullMqWorker();
  await closeRedisConnection();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
