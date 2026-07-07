import { getAnalyticsService } from "@/lib/analytics/analytics-service";
import { resolveAppVersion } from "@/lib/analytics/context";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import type {
  ValueBridgeMoment,
  ValueBridgeSource,
  ValueBridgeSuppressionReason,
} from "@/lib/value-bridge";

export type ValueBridgeAnalyticsEvent =
  | "value_bridge_shown"
  | "value_bridge_clicked"
  | "value_bridge_dismissed"
  | "value_bridge_eligible"
  | "value_bridge_suppressed"
  | "value_bridge_not_shown";

export type ValueBridgeAnalyticsMeta = {
  route: string;
  trialState?: string;
  subscriptionState?: string;
  userId?: string | null;
};

type ValueBridgeEventExtra = Record<string, string | number | boolean>;

function baseExtra(meta: ValueBridgeAnalyticsMeta): Record<string, string> {
  const ctx = getAnalyticsService().getContext();
  return {
    route: meta.route.slice(0, 120),
    trial_state: meta.trialState ?? "unknown",
    subscription_state:
      meta.subscriptionState ?? ctx.subscriptionState ?? "unknown",
    ...(meta.userId ? { user_id: meta.userId } : {}),
    app_version: ctx.appVersion || resolveAppVersion(),
    timestamp: new Date().toISOString(),
  };
}

function stringifyExtra(
  extra?: ValueBridgeEventExtra,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!extra) return out;
  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined) continue;
    out[key] = String(value).slice(0, 64);
  }
  return out;
}

function emit(
  event: ValueBridgeAnalyticsEvent,
  source: ValueBridgeSource,
  meta: ValueBridgeAnalyticsMeta,
  extra?: ValueBridgeEventExtra,
): void {
  trackSubscriptionEvent({
    event,
    source,
    extra: {
      ...baseExtra(meta),
      ...stringifyExtra(extra),
    },
  });
}

/** Trial user hit a valid value moment trigger (routine_completion | weekly_summary). */
export function trackValueBridgeEligible(
  moment: ValueBridgeMoment,
  meta: ValueBridgeAnalyticsMeta,
): void {
  emit("value_bridge_eligible", moment, meta, { moment });
}

/** Eligible user suppressed by frequency, priority, or cooldown rules. */
export function trackValueBridgeSuppressed(
  reason: ValueBridgeSuppressionReason,
  source: ValueBridgeSource,
  meta: ValueBridgeAnalyticsMeta,
  extra?: ValueBridgeEventExtra,
): void {
  emit("value_bridge_suppressed", source, meta, { reason, ...extra });
}

/** Ineligible path — flag off, not trial, paid, invalid moment, etc. */
export function trackValueBridgeNotShown(
  reason: ValueBridgeSuppressionReason,
  source: ValueBridgeSource,
  meta: ValueBridgeAnalyticsMeta,
  extra?: ValueBridgeEventExtra,
): void {
  emit("value_bridge_not_shown", source, meta, { reason, ...extra });
}

export function trackValueBridgeEvent(
  event: ValueBridgeAnalyticsEvent,
  source: ValueBridgeSource,
  meta: ValueBridgeAnalyticsMeta,
  extra?: ValueBridgeEventExtra,
): void {
  emit(event, source, meta, extra);
}
