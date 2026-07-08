import type { Entitlements } from "@/hooks/use-subscription";

/** Paid provider that later canceled / past_due — server fields only. */
function isLapsedSubscriber(entitlements: Entitlements): boolean {
  if (entitlements.isPremium) return false;
  if (entitlements.provider === "none" || entitlements.provider === "manual") return false;
  return entitlements.status === "canceled" || entitlements.status === "past_due";
}

/**
 * Resolve gate for winback UI.
 * Winback must NEVER evaluate eligibility against placeholder / loading FREE.
 */
export type WinbackResolveState = {
  /** Feature flag VITE_FF_SUB_WINBACK_MODAL */
  featureEnabled: boolean;
  /** Auth session ready and signed in */
  isSignedIn: boolean;
  /** React Query: subscription query finished at least once */
  isFetched: boolean;
  /** React Query: currently showing placeholderData (not server truth) */
  isPlaceholderData: boolean;
  /** React Query: fetch in flight (initial or refresh) */
  isFetching: boolean;
  /** Recently dismissed / cooldown */
  dismissedRecently: boolean;
};

export type WinbackBlockReason =
  | "feature_flag_off"
  | "not_signed_in"
  | "entitlements_loading"
  | "entitlements_placeholder"
  | "entitlements_refreshing"
  | "dismissed_recently"
  | "is_premium"
  | "active_trial"
  | "not_eligible";

export type WinbackEligibleReason = "subscription_expired" | "lapsed_subscriber";

export type WinbackEligibilityResult =
  | { show: false; reason: WinbackBlockReason }
  | { show: true; reason: WinbackEligibleReason };

/**
 * Server-confirmed expired internal trial.
 * LocalStorage must NOT participate — avoids free-placeholder race on app_open.
 */
export function isServerConfirmedExpiredTrial(
  entitlements: Entitlements | null | undefined,
): boolean {
  if (!entitlements) return false;
  if (entitlements.isPremium || entitlements.isPremiumSubscriber) return false;
  if (entitlements.isTrialing || entitlements.isTrialActive) return false;
  if (entitlements.status === "trialing") return false;
  if (entitlements.internalTrialExpired === true) return true;
  if (entitlements.subscriptionState === "EXPIRED") return true;
  return false;
}

/** Entitlements are fully resolved from the server (not empty placeholder FREE). */
export function areEntitlementsResolved(state: WinbackResolveState): boolean {
  return (
    state.isSignedIn &&
    state.isFetched &&
    !state.isPlaceholderData &&
    !state.isFetching
  );
}

/**
 * Pure winback eligibility. Call only after UI has resolve inputs from useSubscription.
 * Safe default: if status is unknown / loading → DO NOTHING (show: false).
 */
export function evaluateWinbackEligibility(
  entitlements: Entitlements | null | undefined,
  resolve: WinbackResolveState,
): WinbackEligibilityResult {
  if (!resolve.featureEnabled) {
    return { show: false, reason: "feature_flag_off" };
  }
  if (!resolve.isSignedIn) {
    return { show: false, reason: "not_signed_in" };
  }
  if (!resolve.isFetched || resolve.isPlaceholderData) {
    return {
      show: false,
      reason: resolve.isPlaceholderData
        ? "entitlements_placeholder"
        : "entitlements_loading",
    };
  }
  if (resolve.isFetching) {
    return { show: false, reason: "entitlements_refreshing" };
  }
  if (!entitlements) {
    return { show: false, reason: "entitlements_loading" };
  }
  if (resolve.dismissedRecently) {
    return { show: false, reason: "dismissed_recently" };
  }
  // Internal age trials set isPremium=true — check trial before premium.
  if (
    entitlements.isTrialing ||
    entitlements.isTrialActive ||
    entitlements.status === "trialing" ||
    entitlements.subscriptionState === "TRIAL"
  ) {
    return { show: false, reason: "active_trial" };
  }
  if (entitlements.isPremium || entitlements.isPremiumSubscriber) {
    return { show: false, reason: "is_premium" };
  }

  if (isServerConfirmedExpiredTrial(entitlements)) {
    return { show: true, reason: "subscription_expired" };
  }
  if (isLapsedSubscriber(entitlements)) {
    return { show: true, reason: "lapsed_subscriber" };
  }

  return { show: false, reason: "not_eligible" };
}

/** Map block reasons to diagnostic subscription funnel events. */
export function winbackDiagnosticEvent(
  result: WinbackEligibilityResult,
): "winback_blocked_loading" | "winback_blocked_trial" | "winback_shown" | null {
  if (result.show) return "winback_shown";
  switch (result.reason) {
    case "entitlements_loading":
    case "entitlements_placeholder":
    case "entitlements_refreshing":
      return "winback_blocked_loading";
    case "active_trial":
      return "winback_blocked_trial";
    default:
      return null;
  }
}
