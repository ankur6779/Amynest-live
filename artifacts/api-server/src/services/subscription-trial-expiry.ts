import type { Subscription } from "@workspace/db";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Minimum lived duration before an EXPIRED internal trial counts as a real
 * completed trial. Instant heal-false-positives expire within seconds/minutes
 * of row creation; natural 3-day trials live much longer.
 */
export const MIN_NATURAL_INTERNAL_TRIAL_MS = DAY_MS;

/**
 * True when EXPIRED (or expiredAt) reflects a trial that actually ran for a
 * meaningful window — NOT an instantaneous heal false-positive.
 *
 * Failsafe: missing timestamps → false (never claim Trial Ended).
 */
export function isNaturallyCompletedTrialExpiry(sub: Subscription): boolean {
  if (!sub.expiredAt || !sub.createdAt) return false;
  const livedMs = sub.expiredAt.getTime() - sub.createdAt.getTime();
  if (!Number.isFinite(livedMs) || livedMs < 0) return false;
  return livedMs >= MIN_NATURAL_INTERNAL_TRIAL_MS;
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
