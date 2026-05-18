import { logger } from "../lib/logger.js";
import { isProductionDeployment } from "../queue/mode.js";
import { isBullMqActive } from "../queue/ai-job-queue.js";
import { scheduleMemoryDrain, getMemoryQueueStats } from "../queue/memory-queue.js";

/**
 * Embedded in-memory worker — only when REDIS_URL is unset (local dev).
 * Production: set REDIS_URL + run `pnpm worker:start` as a separate Render service.
 */
export function startEmbeddedAiWorker(): void {
  if (isProductionDeployment()) {
    return;
  }

  if (isBullMqActive()) {
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
