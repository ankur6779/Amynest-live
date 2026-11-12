import type { Subscription } from "@workspace/db";
import { isStatePremium } from "./subscriptionStateService.js";

export function hasValidPaidPeriodEnd(s: Subscription): boolean {
  return !!s.currentPeriodEnd && s.currentPeriodEnd.getTime() > Date.now();
}

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERNAL_TRIAL_DAYS = 3;

function internalTrialCapEnforcedAfterMs(): number {
  const raw = process.env.INTERNAL_TRIAL_CAP_ENFORCED_AFTER;
  if (raw) {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.parse("2026-07-26T00:00:00.000Z");
}

function isGrandfatheredInternalTrial(s: Subscription): boolean {
  if (s.status !== "trialing") return false;
  if (s.provider !== "none" && s.provider !== "manual") return false;
  if (!s.trialEndsAt) return false;
  const trialStartMs =
    s.trialEndsAt.getTime() - INTERNAL_TRIAL_DAYS * DAY_MS;
  return trialStartMs < internalTrialCapEnforcedAfterMs();
}

/**
 * Internal 3-day age/manual trial — feature caps apply, not full premium.
 */
export function isInternalTrialNow(s: Subscription): boolean {
  if (isGrandfatheredInternalTrial(s)) return false;
  const now = Date.now();
  return (
    s.status === "trialing" &&
    (s.provider === "none" || s.provider === "manual") &&
    !!s.trialEndsAt &&
    s.trialEndsAt.getTime() > now
  );
}

/**
 * Whether healStaleSubscriptionRecord must leave this row alone.
 * Active trials (including capped internal trials where isPremiumNow=false)
 * must never be rewritten to EXPIRED — that causes false "Trial Ended" paywalls.
 */
export function shouldPreserveActiveTrial(s: Subscription): boolean {
  if (isInternalTrialNow(s)) return true;
  if (
    s.status === "trialing"
    && !!s.trialEndsAt
    && s.trialEndsAt.getTime() > Date.now()
  ) {
    return true;
  }
  return false;
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
  if (isInternalTrialNow(s)) return false;
  if (isGrandfatheredInternalTrial(s)) {
    return !!s.trialEndsAt && s.trialEndsAt.getTime() > Date.now();
  }

  const hasExplicitV2State =
    s.provider === "revenuecat" ||
    s.subscriptionState !== "FREE" ||
    !!s.expiresAt ||
    !!s.gracePeriodExpiresAt;
  if (hasExplicitV2State && s.subscriptionState !== "FREE") {
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
