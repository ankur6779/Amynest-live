/**
 * Canonical trial/paywall state machine.
 *
 * NEW_USER → FREE_TRIAL_AVAILABLE → START_FREE_TRIAL_PAYWALL
 *   → TRIAL_ACTIVE → TRIAL_EXPIRED → TRIAL_ENDED_PAYWALL
 *
 * Unknown billing NEVER maps to trial_ended.
 * Trial Ended requires server flag for a naturally completed trial.
 */
import type { Entitlements } from "@/hooks/use-subscription";
import { logSubscriptionDebug } from "@/lib/subscription-debug";

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

export type TrialPaywallResolveOpts = {
  entitlementsResolved?: boolean;
  /** Where the decision is being made (for diagnostics). */
  navigationSource?: string;
};

/**
 * Evidence that the user actually finished a trial (not a heal false-positive).
 * Server sets internalTrialExpired only after a natural trial window.
 */
export function hasCompletedTrialEvidence(
  entitlements: Entitlements | null | undefined,
): boolean {
  if (!entitlements) return false;
  if (entitlements.isPremiumSubscriber || entitlements.isPremium) return false;
  if (entitlements.isTrialing || entitlements.isTrialActive) return false;
  if (entitlements.status === "trialing") return false;
  // Server-authoritative: only true after natural trial completion.
  return entitlements.internalTrialExpired === true;
}

/**
 * Resolve paywall variant from entitlements.
 * When entitlements are unresolved/null → free_trial (optimistic failsafe).
 */
export function resolveTrialPaywallVariant(
  entitlements: Entitlements | null | undefined,
  opts?: TrialPaywallResolveOpts,
): TrialPaywallDecision {
  const resolved = opts?.entitlementsResolved !== false;

  if (!entitlements || !resolved) {
    return {
      variant: "free_trial",
      ready: false,
      reason: "billing_unknown_assume_eligible",
    };
  }

  if (entitlements.isPremiumSubscriber) {
    return { variant: "subscriber", ready: true, reason: "active_subscriber" };
  }

  // Paid premium (non-trial) — hide trial paywalls.
  if (entitlements.allPremiumAccess && !entitlements.isTrialing && !entitlements.isTrialActive) {
    return { variant: "subscriber", ready: true, reason: "all_premium_access" };
  }

  if (
    entitlements.isTrialing
    || entitlements.isTrialActive
    || entitlements.status === "trialing"
    || entitlements.subscriptionState === "TRIAL"
  ) {
    // Internal/preview trial can coexist with offering Play free-trial CTA.
    // Product state machine: still show free_trial paywall until Play/RC trial starts
    // unless they're a paid subscriber. Internal trialing → keep free_trial available
    // so post-onboarding always offers "Start Free Trial" via Google Play.
    if (entitlements.provider === "none" || entitlements.provider === "manual") {
      return {
        variant: "free_trial",
        ready: true,
        reason: "internal_trial_still_offer_play_trial",
      };
    }
    return { variant: "trial_active", ready: true, reason: "store_trial_in_progress" };
  }

  // Bare subscriptionState=EXPIRED WITHOUT internalTrialExpired is NOT enough —
  // that was the false-positive heal path. Require completed-trial evidence.
  if (hasCompletedTrialEvidence(entitlements)) {
    return {
      variant: "trial_ended",
      ready: true,
      reason: "naturally_completed_trial_expired",
    };
  }

  // Explicitly reject EXPIRED without evidence → free trial.
  if (entitlements.subscriptionState === "EXPIRED") {
    return {
      variant: "free_trial",
      ready: true,
      reason: "expired_without_natural_evidence_failsafe",
    };
  }

  return { variant: "free_trial", ready: true, reason: "never_started_trial" };
}

/** True when Trial Ended fullscreen/banner may show. */
export function shouldShowTrialEndedPaywall(
  entitlements: Entitlements | null | undefined,
  opts?: TrialPaywallResolveOpts,
): boolean {
  const decision = resolveTrialPaywallVariant(entitlements, opts);
  return decision.ready && decision.variant === "trial_ended";
}

/** True when free-trial CTA may show (including optimistic unknown state). */
export function shouldShowFreeTrialPaywall(
  entitlements: Entitlements | null | undefined,
  opts?: TrialPaywallResolveOpts,
): boolean {
  const decision = resolveTrialPaywallVariant(entitlements, opts);
  return decision.variant === "free_trial";
}

/**
 * Post-onboarding routing: always offer free-trial paywall to non-subscribers
 * who haven't seen it — do NOT gate on canStartTrial (auto-trial / false EXPIRED).
 */
export function shouldRouteToPostOnboardingFreeTrial(input: {
  featureEnabled: boolean;
  alreadySeen: boolean;
  isPremiumSubscriber: boolean;
  /** When first-experience memory is still waiting to be felt on home. */
  deferForFirstExperience?: boolean;
}): boolean {
  if (!input.featureEnabled) return false;
  if (input.alreadySeen) return false;
  if (input.isPremiumSubscriber) return false;
  // Premium is relief after repeated trust — never an interruption of the first story.
  if (input.deferForFirstExperience) return false;
  return true;
}

/**
 * Pure message for the DEV Trial Ended guard. Returns null when the UI is allowed.
 * Exposed for tests (Vite may stub import.meta.env.DEV=false).
 */
export function trialEndedAssertViolation(
  entitlements: Entitlements | null | undefined,
  opts?: TrialPaywallResolveOpts & { surface?: string },
): string | null {
  if (opts?.entitlementsResolved === false) return null;
  if (!entitlements) return null;
  if (hasCompletedTrialEvidence(entitlements)) return null;

  const decision = resolveTrialPaywallVariant(entitlements, opts);
  return (
    `[P0] Trial Ended paywall blocked: brand-new / never-trialed user. ` +
    `surface=${opts?.surface ?? "unknown"} source=${opts?.navigationSource ?? "unknown"} ` +
    `resolver=${decision.variant}/${decision.reason} ` +
    `status=${entitlements?.status ?? "null"} ` +
    `subscriptionState=${entitlements?.subscriptionState ?? "null"} ` +
    `internalTrialExpired=${entitlements?.internalTrialExpired ?? false}`
  );
}

/**
 * DEV-only hard assertion: never allow Trial Ended UI for users without
 * completed-trial evidence. Call whenever the Trial Ended screen/banner is
 * about to render or redirect — crashes in development so this bug cannot
 * silently regress.
 */
export function assertTrialEndedAllowed(
  entitlements: Entitlements | null | undefined,
  opts?: TrialPaywallResolveOpts & { surface?: string },
): void {
  const message = trialEndedAssertViolation(entitlements, opts);
  if (!message) return;

  logSubscriptionDebug({
    phase: "trial_ended_assert_blocked",
    source: opts?.navigationSource ?? "assert",
    extra: {
      surface: opts?.surface ?? "unknown",
      status: entitlements?.status ?? "null",
      subscriptionState: entitlements?.subscriptionState ?? "null",
      internalTrialExpired: String(entitlements?.internalTrialExpired ?? false),
      provider: entitlements?.provider ?? "null",
    },
  });
  if (import.meta.env.DEV) {
    throw new Error(message);
  }
}

/** Structured diagnostics whenever a paywall variant is chosen. */
export function logTrialPaywallDecision(
  decision: TrialPaywallDecision,
  entitlements: Entitlements | null | undefined,
  opts?: TrialPaywallResolveOpts,
): void {
  logSubscriptionDebug({
    phase: "trial_paywall_variant_selected",
    source: opts?.navigationSource ?? "resolver",
    extra: {
      variant: decision.variant,
      reason: decision.reason,
      ready: decision.ready,
      entitlementsResolved: opts?.entitlementsResolved !== false,
      status: entitlements?.status ?? "null",
      subscriptionState: entitlements?.subscriptionState ?? "null",
      internalTrialExpired: String(entitlements?.internalTrialExpired ?? false),
      isTrialing: String(entitlements?.isTrialing ?? false),
      provider: entitlements?.provider ?? "null",
      isPremiumSubscriber: String(entitlements?.isPremiumSubscriber ?? false),
    },
  });
}
