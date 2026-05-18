import { logger } from "../lib/logger.js";

/** Prevent process exit on stray promise rejections in AI paths. */
export function registerProcessErrorHandlers(): void {
  process.on("unhandledRejection", (reason) => {
    logger.error(
      {
        evt: "unhandled_rejection",
        reason: reason instanceof Error ? reason.message : String(reason),
      },
      "Unhandled promise rejection",
    );
  });

  process.on("uncaughtException", (err) => {
    logger.error({ evt: "uncaught_exception", err }, "Uncaught exception");
  });
}
