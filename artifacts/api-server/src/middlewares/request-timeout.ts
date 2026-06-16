import type { Request, Response, NextFunction } from "express";
import { COACH_GATEWAY_TIMEOUT_MS } from "@workspace/coach-journey";
import { logger } from "../lib/logger.js";

const REQUEST_TIMEOUT_MS = Number(process.env.API_REQUEST_TIMEOUT_MS ?? "5000");
const LONG_REQUEST_TIMEOUT_MS = Number(
  process.env.API_LONG_REQUEST_TIMEOUT_MS ?? String(COACH_GATEWAY_TIMEOUT_MS),
);

/** Routes that may wait on AI workers — must exceed worker timeout (45s). */
const LONG_RUNNING_PATH_PREFIXES = [
  "/api/routines/generate-ai",
  "/api/coach/",
  "/api/ai-coach",
  "/api/result/",
  "/api/meals/",
  "/api/speech/",
  "/api/tts/",
  "/api/abacus/",
  "/api/infant-",
  "/api/audio-lessons/",
  "/api/phonics/",
  "/api/smart-study/",
  "/api/olympiad/",
  "/api/spelling/",
  "/api/explain/",
  "/api/ai/",
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
 * Coach paths use COACH_GATEWAY_TIMEOUT_MS (65s) so the gateway never fires before the worker (45s).
 */
export function requestTimeout(req: Request, res: Response, next: NextFunction): void {
  const timeoutMs = resolveTimeoutMs(req);
  const timer = setTimeout(() => {
    if (res.headersSent) return;
    void (async () => {
      const { readCoachTraceIdFromHeaders, logCoachGenerateTrace } = await import(
        "../lib/coach-generate-trace.js"
      );
      const traceId = readCoachTraceIdFromHeaders(req.headers);
      const path = req.originalUrl?.split("?")[0] ?? "";
      if (traceId && (path.startsWith("/api/coach/") || path.startsWith("/api/ai-coach"))) {
        logCoachGenerateTrace("render.middleware.request_timeout", {
          traceId,
          requestId: req.requestId,
          httpStatus: 504,
          timeoutMs,
          layer: "render.middleware",
          contentType: "application/json",
        });
      }
      logger.warn(
        {
          evt: "request.timeout",
          method: req.method,
          path,
          timeoutMs,
          traceId,
        },
        "Request timed out",
      );
      res.status(504).json({
        error: "request_timeout",
        message: "Request took too long. Please retry.",
        fallback: true,
        traceId,
      });
    })();
  }, timeoutMs);

  const clear = () => clearTimeout(timer);
  res.on("finish", clear);
  res.on("close", clear);
  next();
}
