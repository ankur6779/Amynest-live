/**
 * Canonical conversion funnel — one name per step.
 * Attaches guest/auth, platform, attribution, and premium state.
 * Does not replace the analytics service; it is the funnel entry point.
 */
import { track } from "@/lib/analytics";
import type { AnalyticsEventName } from "@workspace/analytics-taxonomy";
import {
  getInstallAttribution,
  getInstallSourceLabel,
} from "@/lib/install-attribution";
import { getAnalyticsService } from "@/lib/analytics/analytics-service";
import { hasUsableAuthSession } from "@/lib/firebase-auth-listener";
import type { CanonicalFunnelEvent } from "@workspace/analytics-taxonomy";
import { markFirstPlanActionStarted } from "@/lib/subscription-funnel-storage";

const firedOnce = new Set<string>();

export type FunnelProps = Record<string, string | number | boolean | undefined | null>;

function resolveAuthState(): "guest" | "authenticated" | "unknown" {
  if (typeof window === "undefined") return "unknown";
  try {
    if (hasUsableAuthSession()) return "authenticated";
  } catch {
    /* fall through */
  }
  return "guest";
}

export function buildFunnelContext(): Record<string, string | number | boolean> {
  const attr = getInstallAttribution();
  const ctx = getAnalyticsService().getContext();
  const out: Record<string, string | number | boolean> = {
    auth_state: resolveAuthState(),
    platform: ctx.platform,
    install_source: getInstallSourceLabel(attr),
  };
  if (ctx.subscriptionState) out.subscription_state = ctx.subscriptionState;
  if (attr?.utmSource) out.utm_source = attr.utmSource;
  if (attr?.utmMedium) out.utm_medium = attr.utmMedium;
  if (attr?.utmCampaign) out.utm_campaign = attr.utmCampaign;
  if (attr?.gclid) out.gclid = attr.gclid;
  if (attr?.fbclid) out.fbclid = attr.fbclid;
  return out;
}

function clean(props: FunnelProps): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

/** Map existing emitters onto the canonical name — never invent a second funnel. */
export const FUNNEL_LEGACY_ALIASES: Partial<Record<CanonicalFunnelEvent, AnalyticsEventName[]>> = {
  first_open: ["first_open"],
  first_value_achieved: ["first_value_achieved"],
  paywall_view: ["premium_paywall_viewed"],
  subscribe_clicked: ["premium_cta_clicked"],
  checkout_started: ["upgrade_started"],
  purchase_success: ["upgrade_completed"],
};

export function trackConversionFunnel(
  event: CanonicalFunnelEvent,
  props: FunnelProps = {},
  opts?: { onceKey?: string },
): void {
  if (opts?.onceKey) {
    const key = `${event}:${opts.onceKey}`;
    if (firedOnce.has(key)) return;
    firedOnce.add(key);
  }
  const payload = { ...buildFunnelContext(), ...clean(props) };
  track(event as AnalyticsEventName, payload as never);
  if (event === "first_plan_action_started") {
    markFirstPlanActionStarted();
  }
}

export function trackPaywallViewCanonical(reason?: string, source?: string): void {
  trackConversionFunnel("paywall_view", { reason, source });
}

export function trackPaywallDismissCanonical(reason?: string, source?: string): void {
  trackConversionFunnel("paywall_dismiss", { reason, source });
}

export function resetConversionFunnelOnceForTests(): void {
  firedOnce.clear();
}
