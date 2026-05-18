import type { Request, Response, NextFunction, RequestHandler } from "express";
import { logger } from "../lib/logger.js";
import { sendSafeError } from "../lib/safe-api-response.js";

/**
 * Wraps async route handlers so rejections never become unhandledRejection crashes.
 */
export function asyncRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch((err: unknown) => {
      if (res.headersSent) {
        next(err);
        return;
      }
      const message = err instanceof Error ? err.message : "Something went wrong, try again";
      logger.error(
        {
          evt: "async_route_error",
          method: req.method,
          path: req.originalUrl?.split("?")[0],
          message: message.slice(0, 300),
        },
        "Async route failed",
      );
      sendSafeError(res, 500, "Something went wrong, try again", true);
    });
  };
}
