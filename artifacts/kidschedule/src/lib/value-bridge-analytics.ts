import { getAnalyticsService } from "@/lib/analytics/analytics-service";
import { resolveAppVersion } from "@/lib/analytics/context";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import type { ValueBridgeSource } from "@/lib/value-bridge";

export type ValueBridgeAnalyticsEvent =
  | "value_bridge_shown"
  | "value_bridge_clicked"
  | "value_bridge_dismissed";

type ValueBridgeAnalyticsMeta = {
  route: string;
  trialState?: string;
  subscriptionState?: string;
  userId?: string | null;
};

function baseExtra(meta: ValueBridgeAnalyticsMeta): Record<string, string> {
  const ctx = getAnalyticsService().getContext();
  return {
    route: meta.route.slice(0, 120),
    trial_state: meta.trialState ?? "unknown",
    subscription_state: meta.subscriptionState ?? ctx.subscriptionState ?? "unknown",
    ...(meta.userId ? { user_id: meta.userId } : {}),
    app_version: ctx.appVersion || resolveAppVersion(),
    timestamp: new Date().toISOString(),
  };
}

export function trackValueBridgeEvent(
  event: ValueBridgeAnalyticsEvent,
  source: ValueBridgeSource,
  meta: ValueBridgeAnalyticsMeta,
): void {
  trackSubscriptionEvent({
    event,
    source,
    extra: baseExtra(meta),
  });
}
