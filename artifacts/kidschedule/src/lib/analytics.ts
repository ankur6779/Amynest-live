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

export { getAnalyticsService } from "@/lib/analytics/analytics-service";
