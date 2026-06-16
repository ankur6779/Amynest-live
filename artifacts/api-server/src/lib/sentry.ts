import { createHash } from "node:crypto";
import * as Sentry from "@sentry/node";

let enabled = false;
let initialized = false;

export function hashUserIdForSentry(userId: string | null | undefined): string | undefined {
  if (!userId?.trim()) return undefined;
  const salt = process.env.SENTRY_USER_HASH_SALT ?? "amynest";
  return createHash("sha256").update(`${salt}:${userId.trim()}`).digest("hex").slice(0, 16);
}

function resolveRelease(): string | undefined {
  return (
    process.env.SENTRY_RELEASE?.trim() ||
    process.env.RENDER_GIT_COMMIT?.trim() ||
    process.env.GITHUB_SHA?.trim() ||
    undefined
  );
}

function shouldDropEvent(event: Sentry.ErrorEvent, hint: Sentry.EventHint): boolean {
  const original = hint.originalException;
  if (original instanceof Error) {
    if (original.name === "AbortError") return true;
    if (/aborted|AbortSignal|polling cancelled/i.test(original.message)) return true;
  }
  const status =
    event.contexts?.response?.status_code ??
    (event.tags?.http_status as number | undefined);
  if (typeof status === "number" && status >= 400 && status < 500) return true;
  return false;
}

/** Must run once before Express routes are registered. */
export function initApiSentry(): void {
  if (initialized) return;
  initialized = true;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.AMYNEST_ENV ?? process.env.NODE_ENV ?? "development",
    release: resolveRelease(),
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
    beforeSend(event, hint) {
      if (shouldDropEvent(event, hint)) return null;
      return event;
    },
  });
  enabled = true;
}

export function initWorkerSentry(): void {
  initApiSentry();
}

export function isSentryEnabled(): boolean {
  return enabled;
}

export function captureApiException(
  err: unknown,
  context?: {
    route?: string;
    traceId?: string;
    userId?: string | null;
    tags?: Record<string, string>;
  },
): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context?.route) scope.setTag("route", context.route);
    if (context?.traceId) scope.setTag("traceId", context.traceId);
    const hashed = hashUserIdForSentry(context?.userId);
    if (hashed) scope.setUser({ id: hashed });
    if (context?.tags) {
      for (const [k, v] of Object.entries(context.tags)) scope.setTag(k, v);
    }
    Sentry.captureException(err);
  });
}

export function captureBullMqJobFailure(
  err: unknown,
  meta: { jobId: string; type: string; userId?: string },
): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    scope.setTag("bullmq.jobId", meta.jobId);
    scope.setTag("bullmq.type", meta.type);
    const hashed = hashUserIdForSentry(meta.userId);
    if (hashed) scope.setUser({ id: hashed });
    Sentry.captureException(err);
  });
}

export { Sentry };
