import {
  db,
  subscriptionsTable,
  referralsTable,
  childrenTable,
  usageDailyTable,
  routinesTable,
  type Referral,
  type Subscription,
} from "@workspace/db";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  getOrCreateSubscription,
  isPremiumNow,
  extendBonusPremium,
} from "./subscriptionService";
import { createGiftToken } from "./giftTokenService";
import { dispatchNotification } from "./notificationDispatchService";
import { logger } from "../lib/logger";
import {
  REFERRAL_REWARD_DAYS,
  REFERRAL_VALID_THRESHOLD,
  REFERRAL_PAID_THRESHOLD,
  REFERRAL_REWARD_CAP,
  REFERRAL_ATTRIBUTION_WINDOW_DAYS,
  REFERRER_DAILY_ATTRIBUTION_CAP,
  isReferralIdentityVerified,
  computeEarnedMilestones,
  type ReferralIdentity,
} from "./referralPolicy";

export {
  REFERRAL_REWARD_DAYS,
  REFERRAL_VALID_THRESHOLD,
  REFERRAL_PAID_THRESHOLD,
  REFERRAL_REWARD_CAP,
  REFERRAL_ATTRIBUTION_WINDOW_DAYS,
  REFERRER_DAILY_ATTRIBUTION_CAP,
  isReferralIdentityVerified,
  computeEarnedMilestones,
  revenueCatCountsForReferralPaid,
} from "./referralPolicy";
export type { ReferralIdentity } from "./referralPolicy";

/** Length of the human-readable referral code (uppercase alphanumeric). */
const CODE_LEN = 7;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit confusing chars

const REFERRAL_ATTRIBUTION_WINDOW_MS = REFERRAL_ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function randomCode(len = CODE_LEN): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

// ─── Qualifying activity ─────────────────────────────────────────────────────

/**
 * At least one meaningful app action: child profile, feature usage, or saved routine.
 */
export async function hasQualifyingReferralActivity(userId: string): Promise<boolean> {
  const [childRow, usageRow, routineRow] = await Promise.all([
    db
      .select({ id: childrenTable.id })
      .from(childrenTable)
      .where(eq(childrenTable.userId, userId))
      .limit(1),
    db
      .select({ id: usageDailyTable.id })
      .from(usageDailyTable)
      .where(and(eq(usageDailyTable.userId, userId), sql`${usageDailyTable.count} > 0`))
      .limit(1),
    db
      .select({ id: routinesTable.id })
      .from(routinesTable)
      .innerJoin(childrenTable, eq(childrenTable.id, routinesTable.childId))
      .where(eq(childrenTable.userId, userId))
      .limit(1),
  ]);
  return childRow.length > 0 || usageRow.length > 0 || routineRow.length > 0;
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
            sql`${subscriptionsTable.referralCode} IS NULL`,
          ),
        )
        .returning();
      if (updated?.referralCode) return updated.referralCode;
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

async function countReferrerAttributionsToday(referrerUserId: string): Promise<number> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(referralsTable)
    .where(
      and(
        eq(referralsTable.referrerUserId, referrerUserId),
        gte(referralsTable.createdAt, dayStart),
      ),
    );
  return rows[0]?.n ?? 0;
}

// ─── Attribution ─────────────────────────────────────────────────────────────

export type AttributeResult =
  | { ok: true; alreadyAttributed: boolean; referrerUserId: string }
  | {
      ok: false;
      reason:
        | "invalid_code"
        | "self_referral"
        | "already_referred_by_other"
        | "attribution_window_expired"
        | "referrer_daily_cap";
    };

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

  const existing = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referredUserId, referredUserId))
    .limit(1);

  if (existing[0]) {
    if (existing[0].referrerUserId === referrer.userId) {
      return { ok: true, alreadyAttributed: true, referrerUserId: referrer.userId };
    }
    return { ok: false, reason: "already_referred_by_other" };
  }

  const referredSub = await getOrCreateSubscription(referredUserId);
  const accountAgeMs = Date.now() - referredSub.createdAt.getTime();
  if (accountAgeMs > REFERRAL_ATTRIBUTION_WINDOW_MS) {
    return { ok: false, reason: "attribution_window_expired" };
  }

  const todayCount = await countReferrerAttributionsToday(referrer.userId);
  if (todayCount >= REFERRER_DAILY_ATTRIBUTION_CAP) {
    return { ok: false, reason: "referrer_daily_cap" };
  }

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

  const reread = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referredUserId, referredUserId))
    .limit(1);
  if (reread[0]?.referrerUserId === referrer.userId) {
    return { ok: true, alreadyAttributed: true, referrerUserId: referrer.userId };
  }
  return { ok: false, reason: "already_referred_by_other" };
}

// ─── Status transitions ──────────────────────────────────────────────────────

/**
 * Promote pending → valid when identity is verified and qualifying activity exists.
 * Safe to call repeatedly (idempotent).
 */
async function promoteReferralToValid(referredUserId: string): Promise<boolean> {
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
    return true;
  }
  return false;
}

/**
 * Promote pending → valid when identity is verified and qualifying activity exists.
 * Safe to call repeatedly (idempotent).
 */
export async function tryMarkReferralValidForUser(
  referredUserId: string,
  identity: ReferralIdentity,
): Promise<boolean> {
  if (!isReferralIdentityVerified(identity)) return false;
  if (!(await hasQualifyingReferralActivity(referredUserId))) return false;
  return promoteReferralToValid(referredUserId);
}

/**
 * Promote pending|valid → paid for the referred user (converted payment only).
 */
export async function markReferralPaid(
  referredUserId: string,
  opts: { countsAsPaid?: boolean } = {},
): Promise<void> {
  if (opts.countsAsPaid === false) return;

  const now = new Date();
  const updated = await db
    .update(referralsTable)
    .set({
      status: "paid",
      paidAt: now,
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

/** Best-effort paid mark — used when activateSubscription short-circuits idempotently. */
export async function ensureReferralPaidMarked(
  referredUserId: string,
  countsAsPaid: boolean,
): Promise<void> {
  if (!countsAsPaid) return;
  try {
    await markReferralPaid(referredUserId, { countsAsPaid: true });
  } catch (err) {
    logger.warn(
      { err, referredUserId },
      "ensureReferralPaidMarked failed",
    );
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

async function notifyReferralRewardUnlocked(
  referrerUserId: string,
  granted: number,
  milestoneIndex: number,
  isPaidReferrer: boolean,
): Promise<void> {
  try {
    const days = granted * REFERRAL_REWARD_DAYS;
    await dispatchNotification({
      userId: referrerUserId,
      category: "milestone",
      title: "Referral reward unlocked! 🎉",
      body: isPaidReferrer
        ? `You earned ${granted} gift token${granted === 1 ? "" : "s"} to share with friends.`
        : `You unlocked ${days} days of premium via referrals.`,
      deepLink: "/referrals",
      dedupKey: `referral_reward_${referrerUserId}_${milestoneIndex}`,
      bypassCategoryCheck: false,
    });
  } catch (err) {
    logger.warn({ err, referrerUserId }, "referral_reward_push_failed");
  }
}

/**
 * Idempotently grants any unclaimed reward milestones for the referrer.
 */
export async function tryGrantReferralReward(referrerUserId: string): Promise<number> {
  const sub = await getOrCreateSubscription(referrerUserId);
  const counts = await countReferrals(referrerUserId);
  const earned = computeEarnedMilestones(counts.valid, counts.paid);
  const already = sub.referralRewardsGranted ?? 0;
  const toGrant = earned - already;
  if (toGrant <= 0) return 0;

  const isPaid = isPremiumNow(sub);

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
      await extendBonusPremium(referrerUserId, toGrant * REFERRAL_REWARD_DAYS, tx);
    }
    return toGrant;
  });

  if (granted > 0 && isPaid) {
    for (let i = 0; i < granted; i++) {
      await createGiftToken(referrerUserId, REFERRAL_REWARD_DAYS);
    }
  }

  if (granted > 0) {
    await notifyReferralRewardUnlocked(referrerUserId, granted, already + granted, isPaid);
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
