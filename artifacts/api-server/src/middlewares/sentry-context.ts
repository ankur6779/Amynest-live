import type { Request, Response, NextFunction } from "express";
import { Sentry, hashUserIdForSentry, isSentryEnabled } from "../lib/sentry.js";
import { getAuth } from "../lib/auth.js";

export function sentryRequestMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!isSentryEnabled()) {
    next();
    return;
  }
  const path = req.originalUrl?.split("?")[0] ?? req.path;
  const traceId =
    (typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"]) ||
    (typeof req.headers["x-amynest-coach-trace-id"] === "string" &&
      req.headers["x-amynest-coach-trace-id"]) ||
    undefined;

  Sentry.getCurrentScope().setTag("http.route", path);
  Sentry.getCurrentScope().setTag("http.method", req.method);
  if (traceId) Sentry.getCurrentScope().setTag("traceId", traceId);

  try {
    const { userId } = getAuth(req);
    const hashed = hashUserIdForSentry(userId);
    if (hashed) Sentry.getCurrentScope().setUser({ id: hashed });
  } catch {
    /* auth optional on public routes */
  }
  next();
}

export function setupSentryExpressErrorHandler(app: import("express").Express): void {
  if (!isSentryEnabled()) return;
  Sentry.setupExpressErrorHandler(app);
}
