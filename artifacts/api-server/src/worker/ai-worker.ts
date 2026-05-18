import { logger } from "../lib/logger.js";
import { getQueueStats, scheduleDrain } from "../queue/ai-job-queue.js";

/**
 * Embedded AI worker — drains the in-memory queue in-process.
 * For standalone mode, run `pnpm --filter @workspace/api-server worker:start`.
 */
export function startEmbeddedAiWorker(): void {
  const mode = process.env.AMYNEST_AI_WORKER_MODE ?? "embedded";
  if (mode === "off") {
    logger.info({ evt: "ai_worker.disabled" }, "AI worker disabled");
    return;
  }
  if (mode === "standalone") {
    logger.info(
      { evt: "ai_worker.standalone" },
      "API process not draining AI queue — use worker:start",
    );
    return;
  }

  logger.info(
    { evt: "ai_worker.embedded", stats: getQueueStats() },
    "Embedded AI worker active",
  );

  setInterval(() => {
    scheduleDrain();
  }, 500).unref?.();
}
