import {
  db,
  subscriptionsTable,
  referralsTable,
  type Referral,
  type Subscription,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import {
  getOrCreateSubscription,
  isPremiumNow,
  extendBonusPremium,
} from "./subscriptionService";
import { createGiftToken } from "./giftTokenService";

type DbExec = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─── Tunable constants ───────────────────────────────────────────────────────

/** Days of premium granted per referral milestone (3 valid + 1 paid). */
export const REFERRAL_REWARD_DAYS = 30;

/** Referrals required for one milestone (counts referrals in valid OR paid status). */
export const REFERRAL_VALID_THRESHOLD = 3;

/** Of the valid referrals, how many must have paid for one milestone. */
export const REFERRAL_PAID_THRESHOLD = 1;

/** Cumulative cap on referral rewards a single user can earn (3 = 90 days). */
export const REFERRAL_REWARD_CAP = 3;

/** Length of the human-readable referral code (uppercase alphanumeric). */
const CODE_LEN = 7;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit confusing chars

function randomCode(len = CODE_LEN): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

// ─── Code allocation ─────────────────────────────────────────────────────────

/**
 * Returns the user's referral code, generating + persisting one on first call.
 * Retries on the (extremely unlikely) collision against the unique index.
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await getOrCreateSubscription(userId);
  if (existing.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomCode();
    try {
      const [updated] = await db
        .update(subscriptionsTable)
        .set({ referralCode: candidate, updatedAt: new Date() })
        .where(
          and(
            eq(subscriptionsTable.userId, userId),
            // only assign if still null — keeps the operation idempotent under
            // concurrent calls
            sql`${subscriptionsTable.referralCode} IS NULL`,
          ),
        )
        .returning();
      if (updated?.referralCode) return updated.referralCode;
      // someone else assigned it concurrently — re-read
      const fresh = await getOrCreateSubscription(userId);
      if (fresh.referralCode) return fresh.referralCode;
    } catch {
      // unique violation — try another candidate
    }
  }
  throw new Error("failed_to_allocate_referral_code");
}

async function findUserByReferralCode(code: string): Promise<Subscription | null> {
  const rows = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.referralCode, code.toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Attribution ─────────────────────────────────────────────────────────────

export type AttributeResult =
  | { ok: true; alreadyAttributed: boolean; referrerUserId: string }
  | { ok: false; reason: "invalid_code" | "self_referral" | "already_referred_by_other" };

/**
 * Records that `referredUserId` was referred by the owner of `code`.
 * Idempotent: re-running with the same (referredUserId, referrerUserId) is a no-op.
 */
export async function attributeReferral(
  referredUserId: string,
  code: string,
): Promise<AttributeResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, reason: "invalid_code" };
  const referrer = await findUserByReferralCode(normalized);
  if (!referrer) return { ok: false, reason: "invalid_code" };
  if (referrer.userId === referredUserId) return { ok: false, reason: "self_referral" };

  // Atomic insert: if a row already exists for this referredUserId we get
  // zero rows back and re-read to determine whether it was the same referrer
  // (idempotent success) or a different one (conflict).
  const inserted = await db
    .insert(referralsTable)
    .values({
      referrerUserId: referrer.userId,
      referredUserId,
      code: normalized,
      status: "pending",
    })
    .onConflictDoNothing({ target: referralsTable.referredUserId })
    .returning({ id: referralsTable.id });

  if (inserted.length > 0) {
    return { ok: true, alreadyAttributed: false, referrerUserId: referrer.userId };
  }

  const existing = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referredUserId, referredUserId))
    .limit(1);
  if (existing[0]?.referrerUserId === referrer.userId) {
    return { ok: true, alreadyAttributed: true, referrerUserId: referrer.userId };
  }
  return { ok: false, reason: "already_referred_by_other" };
}

// ─── Status transitions ──────────────────────────────────────────────────────

/**
 * Promote pending → valid for the given referred user (if they have one).
 * Safe to call on every "first-feature-use" trigger.
 */
export async function markReferralValid(referredUserId: string): Promise<void> {
  const updated = await db
    .update(referralsTable)
    .set({ status: "valid", validatedAt: new Date() })
    .where(
      and(
        eq(referralsTable.referredUserId, referredUserId),
        eq(referralsTable.status, "pending"),
      ),
    )
    .returning({ referrerUserId: referralsTable.referrerUserId });

  const referrerId = updated[0]?.referrerUserId;
  if (referrerId) {
    await tryGrantReferralReward(referrerId);
  }
}

/**
 * Promote pending|valid → paid for the given referred user. Called from the
 * subscription activation path (paid subscription via webhook).
 */
export async function markReferralPaid(referredUserId: string): Promise<void> {
  const now = new Date();
  const updated = await db
    .update(referralsTable)
    .set({
      status: "paid",
      paidAt: now,
      // ensure validatedAt is filled so the row counts as valid too
      validatedAt: sql`COALESCE(${referralsTable.validatedAt}, ${now})`,
    })
    .where(
      and(
        eq(referralsTable.referredUserId, referredUserId),
        sql`${referralsTable.status} IN ('pending', 'valid')`,
      ),
    )
    .returning({ referrerUserId: referralsTable.referrerUserId });

  const referrerId = updated[0]?.referrerUserId;
  if (referrerId) {
    await tryGrantReferralReward(referrerId);
  }
}

// ─── Reward grant ────────────────────────────────────────────────────────────

export type ReferralStats = {
  code: string;
  validReferrals: number;
  paidReferrals: number;
  rewardsGranted: number;
  rewardsAvailable: number;
  rewardCap: number;
  validThreshold: number;
  paidThreshold: number;
  rewardDays: number;
  bonusExpiresAt: string | null;
  isPremium: boolean;
};

async function countReferrals(referrerUserId: string): Promise<{ valid: number; paid: number }> {
  const rows = await db
    .select({
      valid: sql<number>`SUM(CASE WHEN ${referralsTable.status} IN ('valid','paid') THEN 1 ELSE 0 END)::int`,
      paid: sql<number>`SUM(CASE WHEN ${referralsTable.status} = 'paid' THEN 1 ELSE 0 END)::int`,
    })
    .from(referralsTable)
    .where(eq(referralsTable.referrerUserId, referrerUserId));
  return { valid: rows[0]?.valid ?? 0, paid: rows[0]?.paid ?? 0 };
}

/**
 * Compute how many full reward milestones a user has EARNED based on their
 * current referral counts. One milestone = REFERRAL_VALID_THRESHOLD valid
 * referrals AND REFERRAL_PAID_THRESHOLD paid referrals.
 */
function computeEarnedMilestones(valid: number, paid: number): number {
  const fromValid = Math.floor(valid / REFERRAL_VALID_THRESHOLD);
  const fromPaid = Math.floor(paid / REFERRAL_PAID_THRESHOLD);
  return Math.min(fromValid, fromPaid, REFERRAL_REWARD_CAP);
}

/**
 * Idempotently grants any unclaimed reward milestones for the referrer.
 *
 * Reward forks by subscriber status:
 *   • Free user  → extend bonusExpiresAt by REFERRAL_REWARD_DAYS per milestone
 *   • Paid user  → create one gift token per milestone (shareable with any friend)
 *
 * Returns the number of NEW milestones granted in this call.
 */
export async function tryGrantReferralReward(referrerUserId: string): Promise<number> {
  const sub = await getOrCreateSubscription(referrerUserId);
  const counts = await countReferrals(referrerUserId);
  const earned = computeEarnedMilestones(counts.valid, counts.paid);
  const already = sub.referralRewardsGranted ?? 0;
  const toGrant = earned - already;
  if (toGrant <= 0) return 0;

  const isPaid = isPremiumNow(sub);

  // Atomically bump the granted counter — only the row whose granted value
  // is still `already` will succeed, preventing double-grants under concurrent callers.
  // For free users, bonus days extension is inside the transaction.
  // For paid users, gift token creation happens AFTER the transaction commits
  // (gift tokens use their own DB connection and can't participate in the tx).
  const granted = await db.transaction(async (tx) => {
    const updated = await tx
      .update(subscriptionsTable)
      .set({
        referralRewardsGranted: already + toGrant,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptionsTable.userId, referrerUserId),
          eq(subscriptionsTable.referralRewardsGranted, already),
        ),
      )
      .returning({ id: subscriptionsTable.id });
    if (updated.length === 0) return 0;

    if (!isPaid) {
      // Free user: extend bonus premium so they get free premium access.
      await extendBonusPremium(referrerUserId, toGrant * REFERRAL_REWARD_DAYS, tx);
    }
    return toGrant;
  });

  if (granted > 0 && isPaid) {
    // Paid user: grant one shareable gift token per milestone, post-commit.
    for (let i = 0; i < granted; i++) {
      await createGiftToken(referrerUserId, REFERRAL_REWARD_DAYS);
    }
  }
  return granted;
}

// ─── Stats for dashboard ─────────────────────────────────────────────────────

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const code = await getOrCreateReferralCode(userId);
  const sub = await getOrCreateSubscription(userId);
  const counts = await countReferrals(userId);
  const earned = computeEarnedMilestones(counts.valid, counts.paid);
  const granted = sub.referralRewardsGranted ?? 0;
  const available = Math.max(0, earned - granted);
  return {
    code,
    validReferrals: counts.valid,
    paidReferrals: counts.paid,
    rewardsGranted: granted,
    rewardsAvailable: available,
    rewardCap: REFERRAL_REWARD_CAP,
    validThreshold: REFERRAL_VALID_THRESHOLD,
    paidThreshold: REFERRAL_PAID_THRESHOLD,
    rewardDays: REFERRAL_REWARD_DAYS,
    bonusExpiresAt: sub.bonusExpiresAt ? sub.bonusExpiresAt.toISOString() : null,
    isPremium: isPremiumNow(sub),
  };
}

export async function listReferrals(userId: string): Promise<Referral[]> {
  return db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerUserId, userId))
    .orderBy(sql`${referralsTable.createdAt} DESC`);
}
