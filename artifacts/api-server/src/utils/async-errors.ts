import { logger } from "../lib/logger.js";
import { getMemorySnapshot } from "./memory-monitor.js";

let handlersRegistered = false;

/**
 * Keep the API process alive on stray async errors (Render will restart on OOM/kill).
 * Logs full stack + memory snapshot for crash analysis.
 */
export function registerProcessErrorHandlers(): void {
  if (handlersRegistered) return;
  handlersRegistered = true;

  process.on("unhandledRejection", (reason, promise) => {
    const asError = reason instanceof Error ? reason : null;
    logger.error(
      {
        evt: "unhandled_rejection",
        reasonType: asError ? asError.name : typeof reason,
        reason: asError ? asError.message : String(reason),
        stack: asError?.stack,
        memory: getMemorySnapshot(),
        uptimeSec: Math.round(process.uptime()),
        promiseDetail:
          promise && typeof promise === "object" ? String(promise) : undefined,
      },
      "Unhandled promise rejection",
    );
  });

  process.on("uncaughtException", (err, origin) => {
    logger.error(
      {
        evt: "uncaught_exception",
        err,
        origin,
        message: err.message,
        stack: err.stack,
        memory: getMemorySnapshot(),
        uptimeSec: Math.round(process.uptime()),
      },
      "Uncaught exception",
    );
  });
}
