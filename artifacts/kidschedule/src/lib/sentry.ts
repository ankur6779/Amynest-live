import * as Sentry from "@sentry/react";

let enabled = false;

function resolveRelease(): string | undefined {
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="app-build-version"]')?.getAttribute("content");
    if (meta) return meta;
  }
  return import.meta.env.VITE_SENTRY_RELEASE ?? import.meta.env.VITE_APP_BUILD_VERSION;
}

function shouldDropEvent(event: Sentry.ErrorEvent, hint: Sentry.EventHint): boolean {
  const original = hint.originalException;
  if (original instanceof Error) {
    if (original.name === "AbortError") return true;
    if (/aborted|AbortSignal|polling cancelled/i.test(original.message)) return true;
  }
  return false;
}

export function initWebSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn || !import.meta.env.PROD) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_AMYNEST_ENV ?? import.meta.env.MODE ?? "production",
    release: resolveRelease(),
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE ?? "0.1"),
    beforeSend(event, hint) {
      if (shouldDropEvent(event, hint)) return null;
      return event;
    },
  });
  enabled = true;
}

export function isWebSentryEnabled(): boolean {
  return enabled;
}

export function setWebSentryUser(hashedUserId: string | undefined): void {
  if (!enabled || !hashedUserId) return;
  Sentry.setUser({ id: hashedUserId });
}

export function captureWebException(
  err: unknown,
  context?: { route?: string; traceId?: string; tags?: Record<string, string> },
): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context?.route) scope.setTag("route", context.route);
    if (context?.traceId) scope.setTag("traceId", context.traceId);
    if (context?.tags) {
      for (const [k, v] of Object.entries(context.tags)) scope.setTag(k, v);
    }
    Sentry.captureException(err);
  });
}

export { Sentry };
