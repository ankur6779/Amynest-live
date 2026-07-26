/**
 * Decide which trial/paywall surface to show.
 *
 * Failsafe: unknown billing → free trial (never default to "Trial Ended").
 * Only users with server-confirmed expired trials see the Trial Ended screen.
 */
import type { Entitlements } from "@/hooks/use-subscription";
import { isServerConfirmedExpiredTrial } from "@/lib/winback-eligibility";

export type TrialPaywallVariant =
  | "free_trial"
  | "trial_active"
  | "trial_ended"
  | "subscriber"
  | "unknown";

export type TrialPaywallDecision = {
  variant: TrialPaywallVariant;
  /** Safe to render monetization UI for this variant */
  ready: boolean;
  reason: string;
};

/**
 * Resolve paywall variant from entitlements.
 * When entitlements are unresolved/null → free_trial (optimistic failsafe).
 */
export function resolveTrialPaywallVariant(
  entitlements: Entitlements | null | undefined,
  opts?: { entitlementsResolved?: boolean },
): TrialPaywallDecision {
  const resolved = opts?.entitlementsResolved !== false;

  if (!entitlements || !resolved) {
    return {
      variant: "free_trial",
      ready: false,
      reason: "billing_unknown_assume_eligible",
    };
  }

  if (entitlements.isPremiumSubscriber || entitlements.allPremiumAccess) {
    return { variant: "subscriber", ready: true, reason: "active_subscriber" };
  }

  if (
    entitlements.isTrialing
    || entitlements.isTrialActive
    || entitlements.status === "trialing"
    || entitlements.subscriptionState === "TRIAL"
  ) {
    return { variant: "trial_active", ready: true, reason: "trial_in_progress" };
  }

  // Only server-confirmed expiry — never localStorage / cached guesses.
  if (isServerConfirmedExpiredTrial(entitlements)) {
    return { variant: "trial_ended", ready: true, reason: "server_confirmed_expired" };
  }

  if (entitlements.status === "free" || entitlements.plan === "free") {
    return { variant: "free_trial", ready: true, reason: "never_started_trial" };
  }

  // Unknown paid status without expiry → assume free-trial eligible (failsafe).
  return { variant: "free_trial", ready: true, reason: "failsafe_eligible" };
}

/** True when Trial Ended fullscreen/banner may show. */
export function shouldShowTrialEndedPaywall(
  entitlements: Entitlements | null | undefined,
  opts?: { entitlementsResolved?: boolean },
): boolean {
  const decision = resolveTrialPaywallVariant(entitlements, opts);
  return decision.ready && decision.variant === "trial_ended";
}

/** True when free-trial CTA may show (including optimistic unknown state). */
export function shouldShowFreeTrialPaywall(
  entitlements: Entitlements | null | undefined,
  opts?: { entitlementsResolved?: boolean },
): boolean {
  const decision = resolveTrialPaywallVariant(entitlements, opts);
  return decision.variant === "free_trial";
}
