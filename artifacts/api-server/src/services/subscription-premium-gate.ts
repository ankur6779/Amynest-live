import type { Subscription } from "@workspace/db";

export function hasValidPaidPeriodEnd(s: Subscription): boolean {
  return !!s.currentPeriodEnd && s.currentPeriodEnd.getTime() > Date.now();
}

/**
 * Server-side premium check. Requires a time-bound entitlement — never treats
 * bare `status === "active"` without `currentPeriodEnd` (or bonus/trial) as premium.
 */
export function isPremiumNow(s: Subscription): boolean {
  const now = Date.now();
  if (s.bonusExpiresAt && s.bonusExpiresAt.getTime() > now) return true;
  if (s.status === "trialing" && s.trialEndsAt && s.trialEndsAt.getTime() > now) return true;
  if (s.status === "active" && hasValidPaidPeriodEnd(s)) return true;
  if (
    (s.status === "canceled" || s.status === "past_due") &&
    hasValidPaidPeriodEnd(s)
  ) {
    return true;
  }
  return false;
}
