/**
 * Standalone AI worker — run separately on Render when AMYNEST_AI_WORKER_MODE=standalone.
 *
 *   pnpm --filter @workspace/api-server worker:start
 */
import { logAmynestEnvironment } from "../lib/loadEnv.js";
import { logger } from "../lib/logger.js";
import { registerProcessErrorHandlers } from "../utils/async-errors.js";
import { startMemoryMonitor } from "../utils/memory-monitor.js";
import { scheduleDrain, getQueueStats } from "../queue/ai-job-queue.js";

registerProcessErrorHandlers();
logAmynestEnvironment();
startMemoryMonitor();

logger.info({ evt: "ai_worker.standalone_start" }, "Standalone AI worker starting");

setInterval(() => {
  scheduleDrain();
  const stats = getQueueStats();
  if (stats.activeCount > 0 || stats.pendingCount > 0) {
    logger.debug({ evt: "ai_worker.tick", ...stats }, "Worker tick");
  }
}, 250);

process.on("SIGTERM", () => {
  logger.info({ evt: "ai_worker.sigterm" }, "AI worker shutting down");
  process.exit(0);
});
