import type { Subscription } from "@workspace/db";
import { isStatePremium } from "./subscriptionStateService.js";

export function hasValidPaidPeriodEnd(s: Subscription): boolean {
  return !!s.currentPeriodEnd && s.currentPeriodEnd.getTime() > Date.now();
}

/**
 * Strict paid-subscriber check for assets that must not unlock via trials,
 * bonus grants, grace periods, journey access, or manual/promotional grants.
 */
export function isPremiumSubscriberNow(s: Subscription): boolean {
  const paidProvider = ["razorpay", "revenuecat", "stripe"].includes(s.provider ?? "");
  if (!paidProvider) return false;

  if (s.subscriptionState === "TRIAL" || s.subscriptionState === "GRACE_PERIOD") {
    return false;
  }

  const paidStateActive =
    s.subscriptionState === "ACTIVE" ||
    s.subscriptionState === "CANCELLED" ||
    s.status === "active";
  if (!paidStateActive) return false;

  const paidUntil = s.currentPeriodEnd ?? s.expiresAt;
  return Boolean(paidUntil && paidUntil.getTime() > Date.now());
}

/**
 * Server-side premium check. Requires a time-bound entitlement — never treats
 * bare `status === "active"` without `currentPeriodEnd` (or bonus/trial) as premium.
 */
export function isPremiumNow(s: Subscription): boolean {
  const hasExplicitV2State =
    (s.subscriptionState != null && s.subscriptionState !== "FREE") ||
    !!s.expiresAt ||
    !!s.gracePeriodExpiresAt;
  if (hasExplicitV2State) {
    return isStatePremium(s.subscriptionState, {
      currentPeriodEnd: s.currentPeriodEnd,
      expiresAt: s.expiresAt,
      gracePeriodExpiresAt: s.gracePeriodExpiresAt,
      trialEndsAt: s.trialEndsAt,
      bonusExpiresAt: s.bonusExpiresAt,
    });
  }
  const now = Date.now();
  if (s.bonusExpiresAt && s.bonusExpiresAt.getTime() > now) return true;
  if (s.status === "trialing" && s.trialEndsAt && s.trialEndsAt.getTime() > now) return true;
  if (s.status === "active" && hasValidPaidPeriodEnd(s)) return true;
  if ((s.status === "canceled" || s.status === "past_due") && hasValidPaidPeriodEnd(s)) return true;
  return false;
}
