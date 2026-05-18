import type { Request, Response, RequestHandler } from "express";
import { logger } from "./logger.js";
import { sendSafeError } from "./safe-api-response.js";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

/**
 * Wrap route handlers: log errors, never throw past Express, optional JSON fallback.
 */
export function safeRoute(
  label: string,
  handler: AsyncHandler,
  fallback?: (req: Request, res: Response) => void,
): RequestHandler {
  return (_req, res, _next) => {
    void (async () => {
      try {
        await handler(_req, res);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(
          {
            evt: "route.error",
            label,
            message,
            path: _req.originalUrl?.split("?")[0],
          },
          "Route handler failed",
        );
        if (res.headersSent) return;
        if (fallback) {
          fallback(_req, res);
          return;
        }
        sendSafeError(res, 500, "Something went wrong. Please try again.", true);
      }
    })();
  };
}
