import { queueClientLog } from "@/lib/client-logs";
import { isIndiaRegion } from "@/lib/geo";
import { isCapacitorIosShell } from "@/lib/device-lite";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import type { PaywallReason } from "@/contexts/paywall-context";
import type { Plan } from "@/hooks/use-subscription";

export type SubscriptionAnalyticsEvent =
  | "paywall_opened"
  | "paywall_reason"
  | "plan_card_viewed"
  | "plan_selected"
  | "annual_default_shown"
  | "annual_selected"
  | "trial_started"
  | "trial_converted"
  | "trial_expired"
  | "checkout_started"
  | "purchase_success"
  | "purchase_failed"
  | "cancel_started"
  | "cancel_agent_opened"
  | "cancel_agent_reason_selected"
  | "cancel_agent_retained"
  | "cancel_agent_annual_accepted"
  | "cancel_agent_feedback_submitted"
  | "cancel_agent_feedback_skipped"
  | "cancel_agent_store_redirect"
  | "cancel_save_offer_shown"
  | "cancel_save_offer_accepted"
  | "cancel_continue"
  | "cancel_confirmed"
  | "annual_upgrade"
  | "winback_shown"
  | "winback_clicked"
  | "winback_converted"
  | "post_purchase_upsell_shown"
  | "post_purchase_upsell_accepted"
  | "post_purchase_upsell_dismissed";

export type SubscriptionAnalyticsPayload = {
  event: SubscriptionAnalyticsEvent;
  reason?: PaywallReason | string;
  plan?: Plan | string;
  source?: string;
  platform?: string;
  country?: string;
  extra?: Record<string, string | number | boolean>;
};

function detectPlatform(): string {
  if (isCapacitorIosShell()) return "ios";
  if (isNativeAmyNestShell()) return "android";
  return "web";
}

function detectCountry(): string {
  return isIndiaRegion() ? "IN" : "GLOBAL";
}

/** Central subscription funnel analytics — persisted via /api/logs. */
export function trackSubscriptionEvent(payload: SubscriptionAnalyticsPayload): void {
  const meta: Record<string, unknown> = {
    event: payload.event,
    reason: payload.reason,
    plan: payload.plan,
    source: payload.source,
    platform: payload.platform ?? detectPlatform(),
    country: payload.country ?? detectCountry(),
    ...payload.extra,
    at: new Date().toISOString(),
  };

  queueClientLog({
    type: "subscription_funnel",
    message: payload.event,
    context: payload.source ?? "subscription_funnel",
    meta,
  });

  if (import.meta.env.DEV) {
    console.info("[subscription-analytics]", meta);
  }
}

/** Optional RevenueCat subscriber attributes (Android bridge when available). */
export async function syncRevenueCatSubscriptionAttributes(
  attrs: Record<string, string>,
): Promise<void> {
  if (typeof window === "undefined") return;
  const billing = (
    window as Window & {
      AmyNestBillingNative?: {
        setAttributes?: (a: Record<string, string>) => Promise<{ ok: boolean }>;
      };
    }
  ).AmyNestBillingNative;
  if (!billing?.setAttributes) return;
  try {
    await billing.setAttributes(attrs);
  } catch {
    /* best-effort */
  }
}
