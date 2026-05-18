import { logger } from "../lib/logger.js";
import { isRedisQueueEnabled } from "../queue/redis.js";
import { scheduleMemoryDrain, getMemoryQueueStats } from "../queue/memory-queue.js";

/**
 * Embedded in-memory worker — only when REDIS_URL is unset (local dev).
 * Production: set REDIS_URL + run `pnpm worker:start` as a separate Render service.
 */
export function startEmbeddedAiWorker(): void {
  if (isRedisQueueEnabled()) {
    logger.info(
      { evt: "ai_worker.api_mode", mode: "bullmq" },
      "REDIS_URL set — API enqueues only; run worker:start separately",
    );
    return;
  }

  const mode = process.env.AMYNEST_AI_WORKER_MODE ?? "embedded";
  if (mode === "off") {
    logger.info({ evt: "ai_worker.disabled" }, "AI worker disabled");
    return;
  }

  logger.info(
    { evt: "ai_worker.embedded", stats: getMemoryQueueStats() },
    "Embedded memory AI worker active (dev)",
  );

  setInterval(() => {
    scheduleMemoryDrain();
  }, 500).unref?.();
}
