import type { Subscription } from "@workspace/db";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Minimum scheduled trial window before EXPIRED counts as a real completed trial.
 * Instant heal-false-positives never retain a trialEndsAt that lived a full day.
 */
export const MIN_NATURAL_INTERNAL_TRIAL_MS = DAY_MS;

/**
 * True when EXPIRED reflects a trial that actually ran to its scheduled end —
 * NOT an instantaneous heal false-positive that wiped trialEndsAt.
 *
 * Failsafe: missing trialEndsAt / expiredAt → false (never claim Trial Ended).
 * Row age alone is NOT enough: age-trial backdating + poisoned EXPIRED on
 * accounts ≥1d old previously produced false Trial Ended paywalls.
 */
export function isNaturallyCompletedTrialExpiry(sub: Subscription): boolean {
  if (!sub.expiredAt || !sub.trialEndsAt || !sub.createdAt) return false;
  const trialEndMs = sub.trialEndsAt.getTime();
  const expiredMs = sub.expiredAt.getTime();
  const createdMs = sub.createdAt.getTime();
  if (![trialEndMs, expiredMs, createdMs].every(Number.isFinite)) return false;
  if (expiredMs < trialEndMs) return false;
  // Scheduled trial window itself must have been ≥1 day (rejects instant poison).
  const scheduledMs = trialEndMs - createdMs;
  if (scheduledMs < MIN_NATURAL_INTERNAL_TRIAL_MS) return false;
  return true;
}

/**
 * Rows that look "EXPIRED" but never completed a real trial window.
 * These must be repaired to FREE so brand-new users see the free-trial paywall.
 */
export function isFalselyExpiredInternalTrial(sub: Subscription): boolean {
  if ((sub.provider ?? "none") !== "none") return false;
  if (sub.status !== "free") return false;
  const marked =
    sub.subscriptionState === "EXPIRED" || Boolean(sub.expiredAt);
  if (!marked) return false;
  if (isNaturallyCompletedTrialExpiry(sub)) return false;
  return true;
}

/**
 * Server flag for clients: only true after a naturally completed *internal*
 * trial (provider=none). Never true for:
 * - unknown / instantaneous EXPIRED heal artifacts
 * - RevenueCat / Razorpay / store expiry (different conversion surface)
 * - paid subscribers
 */
export function computeInternalTrialExpiredFlag(
  sub: Subscription,
  isPremiumSubscriber: boolean,
): boolean {
  if (isPremiumSubscriber) return false;
  // Store / paid-provider expiry must NOT drive the internal "Trial Ended" UI.
  if ((sub.provider ?? "none") !== "none") return false;
  if (sub.subscriptionState !== "EXPIRED" && !sub.expiredAt) return false;
  return isNaturallyCompletedTrialExpiry(sub);
}
