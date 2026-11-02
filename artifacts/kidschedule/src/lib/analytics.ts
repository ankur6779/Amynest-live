import {
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from "@workspace/analytics-taxonomy";
import { getAnalyticsService } from "@/lib/analytics/analytics-service";
import type { AuthFetchFn } from "@/lib/analytics/constants";

/**
 * Product analytics client facade — all calls delegate to AnalyticsService.
 * Typed, batched, offline-capable. Event names and prop shapes come from
 * @workspace/analytics-taxonomy (the same definitions the server validates).
 *
 * Pure measurement — analytics never influences routine generation.
 */

export type { AnalyticsEventName, AnalyticsEventProps };

/**
 * Record a product analytics event. Type-safe: `name` must be a taxonomy
 * event and `props` must match its schema.
 */
export function track<E extends AnalyticsEventName>(
  name: E,
  props: AnalyticsEventProps<E>,
): void {
  getAnalyticsService().track(name, props);
}

/**
 * Flush queued events to the server. Retains auth fetch for offline retry.
 */
export async function flushAnalytics(
  authFetch?: AuthFetchFn,
): Promise<void> {
  await getAnalyticsService().flush(authFetch);
}

/**
 * Emit app_open + session_start once per session (guarded).
 */
export function trackAppOpen(): void {
  getAnalyticsService().trackAppOpen();
}

/** Canonical product-analytics entry points. All of them go through AnalyticsService. */
export function trackEvent<E extends AnalyticsEventName>(
  eventName: E,
  properties: AnalyticsEventProps<E>,
): void {
  getAnalyticsService().trackEvent(eventName, properties);
}

export function trackPageView(
  pageName: string,
  properties: Record<string, unknown> = {},
): void {
  getAnalyticsService().trackPageView(pageName, properties);
}

export function trackFeatureUsage(
  featureName: string,
  action: "viewed" | "started" | "interaction" | "completed" | "abandoned" | "error",
  properties: Record<string, unknown> = {},
): void {
  getAnalyticsService().trackFeatureUsage(featureName, action, properties);
}

export function trackError(
  errorType: string,
  properties: Record<string, unknown> = {},
): void {
  const allowed = ["react", "api", "ai", "network", "database", "unhandled", "unknown"] as const;
  const errorClass = (allowed as readonly string[]).includes(errorType)
    ? (errorType as (typeof allowed)[number])
    : "unknown";
  const message = typeof properties.message === "string" ? properties.message : errorType;
  getAnalyticsService().trackError(errorClass, message, {
    route: typeof properties.route === "string" ? properties.route : undefined,
    feature: typeof properties.feature === "string" ? properties.feature : undefined,
    statusCode: typeof properties.statusCode === "number" ? properties.statusCode : undefined,
  });
}

export function startSession(): void {
  getAnalyticsService().startSession();
}

export function endSession(): void {
  getAnalyticsService().endSession();
}

export { getAnalyticsService } from "@/lib/analytics/analytics-service";
