/** Days of premium granted per referral milestone (3 valid + 1 paid). */
export const REFERRAL_REWARD_DAYS = 30;

/** Referrals required for one milestone (counts referrals in valid OR paid status). */
export const REFERRAL_VALID_THRESHOLD = 3;

/** Of the valid referrals, how many must have paid for one milestone. */
export const REFERRAL_PAID_THRESHOLD = 1;

/** Cumulative cap on referral rewards a single user can earn (3 = 90 days). */
export const REFERRAL_REWARD_CAP = 3;

/** Referred users must attribute within this many days of account creation. */
export const REFERRAL_ATTRIBUTION_WINDOW_DAYS = 30;

/** Max new attributions per referrer per UTC day (abuse guard). */
export const REFERRER_DAILY_ATTRIBUTION_CAP = 20;

export type ReferralIdentity = {
  emailVerified: boolean;
  phoneNumber: string | null;
};

/** Valid referral requires verified email or phone OTP sign-in. */
export function isReferralIdentityVerified(identity: ReferralIdentity): boolean {
  return identity.emailVerified === true || !!identity.phoneNumber?.trim();
}

/**
 * Compute how many full reward milestones a user has EARNED based on their
 * current referral counts. One milestone = REFERRAL_VALID_THRESHOLD valid
 * referrals AND REFERRAL_PAID_THRESHOLD paid referrals.
 */
export function computeEarnedMilestones(valid: number, paid: number): number {
  const fromValid = Math.floor(valid / REFERRAL_VALID_THRESHOLD);
  const fromPaid = Math.floor(paid / REFERRAL_PAID_THRESHOLD);
  return Math.min(fromValid, fromPaid, REFERRAL_REWARD_CAP);
}

/** RevenueCat: free trials / intro $0 purchases do not count as paid referrals. */
export function revenueCatCountsForReferralPaid(event: {
  type?: string;
  period_type?: string;
  price?: number;
}): boolean {
  const type = String(event.type ?? "");
  if (type !== "INITIAL_PURCHASE") return true;

  const periodType = String(event.period_type ?? "").toUpperCase();
  if (periodType === "TRIAL") return false;
  if (periodType === "INTRO" && (event.price ?? 0) <= 0) return false;
  if ((event.price ?? 1) <= 0) return false;
  return true;
}
