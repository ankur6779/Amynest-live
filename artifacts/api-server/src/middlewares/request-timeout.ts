import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

const REQUEST_TIMEOUT_MS = Number(process.env.API_REQUEST_TIMEOUT_MS ?? "5000");
const LONG_REQUEST_TIMEOUT_MS = Number(process.env.API_LONG_REQUEST_TIMEOUT_MS ?? "40000");

/** AI / routine routes wait up to ~8s server-side; 5s global timeout caused 504s on iOS. */
const LONG_RUNNING_PATH_PREFIXES = [
  "/api/routines/generate-ai",
];

function resolveTimeoutMs(req: Request): number {
  const path = req.originalUrl?.split("?")[0] ?? "";
  if (LONG_RUNNING_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return LONG_REQUEST_TIMEOUT_MS;
  }
  return REQUEST_TIMEOUT_MS;
}

/**
 * Abort slow requests so hung DB/Redis/external calls cannot pile up and OOM the process.
 */
export function requestTimeout(req: Request, res: Response, next: NextFunction): void {
  const timeoutMs = resolveTimeoutMs(req);
  const timer = setTimeout(() => {
    if (res.headersSent) return;
    logger.warn(
      {
        evt: "request.timeout",
        method: req.method,
        path: req.originalUrl?.split("?")[0],
        timeoutMs,
      },
      "Request timed out",
    );
    res.status(504).json({
      error: "request_timeout",
      message: "Request took too long. Please retry.",
      fallback: true,
    });
  }, timeoutMs);

  const clear = () => clearTimeout(timer);
  res.on("finish", clear);
  res.on("close", clear);
  next();
}
