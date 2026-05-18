import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

const REQUEST_TIMEOUT_MS = Number(process.env.API_REQUEST_TIMEOUT_MS ?? "5000");

/**
 * Abort slow requests so hung DB/Redis/external calls cannot pile up and OOM the process.
 */
export function requestTimeout(req: Request, res: Response, next: NextFunction): void {
  const timer = setTimeout(() => {
    if (res.headersSent) return;
    logger.warn(
      {
        evt: "request.timeout",
        method: req.method,
        path: req.originalUrl?.split("?")[0],
        timeoutMs: REQUEST_TIMEOUT_MS,
      },
      "Request timed out",
    );
    res.status(504).json({
      error: "request_timeout",
      message: "Request took too long. Please retry.",
      fallback: true,
    });
  }, REQUEST_TIMEOUT_MS);

  const clear = () => clearTimeout(timer);
  res.on("finish", clear);
  res.on("close", clear);
  next();
}
