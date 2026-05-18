import { logger } from "../lib/logger.js";
import { getMemorySnapshot } from "./memory-monitor.js";

let handlersRegistered = false;

/**
 * Keep the API process alive on stray async errors (Render will restart on OOM/kill).
 * Logs memory on critical failures for crash analysis.
 */
export function registerProcessErrorHandlers(): void {
  if (handlersRegistered) return;
  handlersRegistered = true;

  process.on("unhandledRejection", (reason) => {
    logger.error(
      {
        evt: "unhandled_rejection",
        reason: reason instanceof Error ? reason.message : String(reason),
        memory: getMemorySnapshot(),
      },
      "Unhandled promise rejection",
    );
    // Do not process.exit — keep API alive and return fallbacks to clients.
  });

  process.on("uncaughtException", (err) => {
    logger.error(
      { evt: "uncaught_exception", err, memory: getMemorySnapshot() },
      "Uncaught exception",
    );
    // Log only; Render will restart on true fatal faults. Avoid exit on transient errors.
  });
}
