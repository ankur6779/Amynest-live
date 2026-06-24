import type { PaywallReason } from "@/contexts/paywall-context";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { FF_PAYWALL_MODAL_FOR_LOCKS } from "@/lib/subscription-feature-flags";

export type GateErrorBody = {
  error?: string;
  feature?: string;
  message?: string;
};

export function isSubscriptionGateResponse(status: number, body?: GateErrorBody): boolean {
  const err = body?.error ?? "";
  if (status === 403 && err === "premium_required") return true;
  if (status !== 402) return false;
  return (
    err === "feature_locked" ||
    err === "routine_locked" ||
    err === "ai_quota_exceeded" ||
    err.includes("locked")
  );
}

export function mapFeatureToPaywallReason(feature?: string): PaywallReason {
  switch (feature) {
    case "infant_ai_query":
      return "infant_ai_quota";
    case "ai_query":
      return "ai_quota";
    case "routine_generate":
      return "routines_limit";
    case "hub_speech_session":
    case "hub_speech_coach":
      return "speech_coach";
    case "behavior_log":
      return "behavior_locked";
    case "audio_lesson":
      return "audio_lessons";
    case "kids_how_pdf":
      return "hub_locked";
    case "nutrition_pdf":
      return "nutrition_library";
    case "infant_sleep_coach":
      return "infant_sleep_coach";
    case "infant_feeding_plan":
      return "infant_feeding_plan";
    default:
      if (feature?.startsWith("learning_load_more")) return "learning_locked";
      if (feature?.startsWith("hub_")) return "hub_locked";
      return "feature";
  }
}

/** High-intent surfaces: modal paywall. Browse/settings may still use /pricing. */
export function openSubscriptionGate(opts: {
  reason: PaywallReason;
  source: string;
  usePaywallModal?: boolean;
  navigatePricing?: (path: string) => void;
  module?: string;
  action?: string;
  entitlementState?: "free" | "premium" | "trial" | "unknown";
}): void {
  trackSubscriptionEvent({
    event: "paywall_reason",
    reason: opts.reason,
    source: opts.source,
  });

  const useModal = opts.usePaywallModal ?? FF_PAYWALL_MODAL_FOR_LOCKS;
  if (useModal) {
    window.dispatchEvent(
      new CustomEvent("amynest:open-paywall", {
        detail: {
          reason: opts.reason,
          source: opts.source,
          module: opts.module,
          action: opts.action,
          entitlementState: opts.entitlementState,
        },
      }),
    );
    return;
  }
  opts.navigatePricing?.(`/pricing?reason=${opts.reason}`);
}

export function handleSubscriptionGateError(
  status: number,
  body: GateErrorBody | undefined,
  source: string,
  navigatePricing?: (path: string) => void,
): boolean {
  if (!isSubscriptionGateResponse(status, body)) return false;
  const reason = mapFeatureToPaywallReason(body?.feature);
  openSubscriptionGate({ reason, source, navigatePricing });
  return true;
}
