import {
  db,
  subscriptionsTable,
  usageDailyTable,
  childrenTable,
  adminPremiumGrantsTable,
  type Subscription,
} from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";

// Drizzle's transaction object exposes the same query API as `db`, so the
// service helpers below accept either. We type it loosely to avoid leaking
// drizzle-internal generics through the public API.
type DbExec = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type Plan = "free" | "monthly" | "six_month" | "yearly";
export type Status = "free" | "trialing" | "active" | "past_due" | "canceled";

export const PLAN_PRICES: Record<Exclude<Plan, "free">, { amount: number; period: string }> = {
  monthly: { amount: 199, period: "month" },
  six_month: { amount: 999, period: "6 months" },
  yearly: { amount: 1599, period: "year" },
};

export const FREE_LIMITS = {
  // Daily cap for free Amy AI messages — resets every UTC day.
  aiQueriesPerDay: 10,
  childrenMax: 1,
  routinesMax: 1,
  hubArticlesMax: 3,
  trialDays: 3,
};

/**
 * Per-feature free-use cap. Global Paywall rule:
 *   - AI chat: 10 messages per day (daily reset).
 *   - Routine generation + behavior log: ONE use per lifetime, then locked.
 *
 * Keys MUST match the `feature` column in `usage_daily`.
 */
export const FREE_FEATURE_LIMITS = {
  ai_query: 10,
  routine_generate: 1,
  behavior_log: 1,
  // 1 free TTS audio lesson per day (resets UTC midnight). The web/mobile
  // audio-lesson screens call /api/features/audio_lesson/consume before
  // playback to reserve the slot — premium users bypass entirely.
  audio_lesson: 1,
} as const;

export type FeatureKey = keyof typeof FREE_FEATURE_LIMITS;

/**
 * Scope of each feature's counter bucket.
 *   - "daily"    → resets every UTC midnight (one row per user/feature/day).
 *   - "lifetime" → never resets (single bucket key "lifetime").
 */
export const FEATURE_SCOPE: Record<FeatureKey, "daily" | "lifetime"> = {
  ai_query: "daily",
  routine_generate: "lifetime",
  behavior_log: "lifetime",
  audio_lesson: "daily",
};

export type FeatureUsage = {
  used: number;
  remaining: number | null; // null = unlimited (premium)
  limit: number;
  locked: boolean; // true when free user has consumed the trial
};

export type EntitlementSummary = {
  plan: Plan;
  status: Status;
  isPremium: boolean;
  isTrialing: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Payment provider for the active subscription. Used by the client to
   *  decide whether server-side cancellation is possible (razorpay) or the
   *  user must cancel through their device's app store (revenuecat). */
  provider: "none" | "manual" | "razorpay" | "revenuecat";
  limits: typeof FREE_LIMITS;
  usage: {
    // Today's AI message count (resets every UTC day).
    aiQueriesToday: number;
    aiQueriesRemaining: number | null; // null = unlimited
    // Global Paywall: per-feature lifetime usage state.
    features: Record<FeatureKey, FeatureUsage>;
  };
};

function todayUtc(): string {
  // YYYY-MM-DD in UTC for daily-scoped features.
  return new Date().toISOString().slice(0, 10);
}

function bucketKeyFor(feature: FeatureKey): string {
  return FEATURE_SCOPE[feature] === "daily" ? todayUtc() : "lifetime";
}

function nextResetAtFor(feature: FeatureKey): string | null {
  if (FEATURE_SCOPE[feature] !== "daily") return null;
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  ));
  return next.toISOString();
}

export { nextResetAtFor };

export async function getOrCreateSubscription(
  userId: string,
  dbExec: DbExec = db,
): Promise<Subscription> {
  const existing = await dbExec
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  const [created] = await dbExec
    .insert(subscriptionsTable)
    .values({ userId, plan: "free", status: "free", provider: "none" })
    .returning();
  return created;
}

/**
 * Returns the ID of the user's "first" child — defined as the child with the
 * earliest `createdAt` (same ordering used by GET /children in the UI). This
 * is the single child free-plan users are allowed to access. Returns null when
 * the user has no children.
 */
export async function getFirstChildId(userId: string): Promise<number | null> {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .orderBy(asc(childrenTable.createdAt), asc(childrenTable.id))
    .limit(1);
  return rows[0]?.id ?? null;
}

export function isPremiumNow(s: Subscription): boolean {
  // Referral bonus time grants premium independently of the paid status.
  if (s.bonusExpiresAt && s.bonusExpiresAt.getTime() > Date.now()) return true;
  if (s.status === "active") return true;
  if (s.status === "trialing" && s.trialEndsAt && s.trialEndsAt.getTime() > Date.now()) return true;
  // Cancelled / past_due subscriptions retain premium until the paid period ends.
  if (
    (s.status === "canceled" || s.status === "past_due") &&
    s.currentPeriodEnd &&
    s.currentPeriodEnd.getTime() > Date.now()
  ) {
    return true;
  }
  return false;
}

/**
 * Extends the user's bonus premium expiry by `days`. The bonus expiry is
 * tracked separately from the paid currentPeriodEnd so a paid renewal webhook
 * never shrinks bonus time. Can be called inside or outside a transaction.
 */
export async function extendBonusPremium(
  userId: string,
  days: number,
  dbExec: DbExec = db,
): Promise<Date> {
  const sub = await getOrCreateSubscription(userId, dbExec);
  const now = Date.now();
  const base = Math.max(now, sub.bonusExpiresAt ? sub.bonusExpiresAt.getTime() : 0);
  const next = new Date(base + days * 24 * 60 * 60 * 1000);
  await dbExec
    .update(subscriptionsTable)
    .set({ bonusExpiresAt: next, updatedAt: new Date() })
    .where(eq(subscriptionsTable.userId, userId));
  return next;
}

/** Generic per-feature usage read (uses each feature's configured bucket). */
export async function getFeatureUsage(userId: string, feature: FeatureKey): Promise<number> {
  const day = bucketKeyFor(feature);
  const rows = await db
    .select({ count: usageDailyTable.count })
    .from(usageDailyTable)
    .where(
      and(
        eq(usageDailyTable.userId, userId),
        eq(usageDailyTable.day, day),
        eq(usageDailyTable.feature, feature),
      ),
    )
    .limit(1);
  return rows[0]?.count ?? 0;
}

/**
 * Generic atomic increment using ON CONFLICT — safe under concurrent calls.
 *
 * NOTE: the count is clamped at 0 (`GREATEST(0, count + by)`) so concurrent
 * refund paths (e.g. featureGate's res.end interceptor + a route's manual
 * refund on disconnect) cannot drive the counter negative and hand out extra
 * free uses. Initial inserts are clamped at max(0, by) too.
 */
export async function incrementFeatureUsage(
  userId: string,
  feature: FeatureKey,
  by = 1,
): Promise<number> {
  const day = bucketKeyFor(feature);
  const result = await db
    .insert(usageDailyTable)
    .values({ userId, feature, day, count: Math.max(0, by) })
    .onConflictDoUpdate({
      target: [usageDailyTable.userId, usageDailyTable.day, usageDailyTable.feature],
      set: {
        count: sql`GREATEST(0, ${usageDailyTable.count} + ${by})`,
        updatedAt: new Date(),
      },
    })
    .returning({ count: usageDailyTable.count });
  return result[0]?.count ?? Math.max(0, by);
}

// Backwards-compat aliases (existing call sites use these names).
export async function getAiUsageToday(userId: string): Promise<number> {
  return getFeatureUsage(userId, "ai_query");
}
export async function incrementAiUsage(userId: string, by = 1): Promise<number> {
  return incrementFeatureUsage(userId, "ai_query", by);
}

export async function getEntitlements(userId: string): Promise<EntitlementSummary> {
  const featureKeys = Object.keys(FREE_FEATURE_LIMITS) as FeatureKey[];
  const [sub, ...featureCounts] = await Promise.all([
    getOrCreateSubscription(userId),
    ...featureKeys.map((f) => getFeatureUsage(userId, f)),
  ]);
  const isPremium = isPremiumNow(sub);
  const isTrialing = sub.status === "trialing" && !!sub.trialEndsAt && sub.trialEndsAt.getTime() > Date.now();

  const features = {} as Record<FeatureKey, FeatureUsage>;
  featureKeys.forEach((key, i) => {
    const used = featureCounts[i] ?? 0;
    const limit = FREE_FEATURE_LIMITS[key];
    features[key] = {
      used,
      limit,
      remaining: isPremium ? null : Math.max(0, limit - used),
      locked: !isPremium && used >= limit,
    };
  });

  return {
    plan: sub.plan as Plan,
    status: sub.status as Status,
    isPremium,
    isTrialing,
    trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
    currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd === 1,
    provider: (sub.provider ?? "none") as EntitlementSummary["provider"],
    limits: FREE_LIMITS,
    usage: {
      aiQueriesToday: features.ai_query.used,
      aiQueriesRemaining: features.ai_query.remaining,
      features,
    },
  };
}

/**
 * Checks if the given email has a manual premium grant in `admin_premium_grants`.
 * If so, and the user's current subscription is not already active, upgrades it
 * to active/yearly with a far-future period end. Idempotent — safe to call on
 * every entitlement fetch.
 */
export async function maybeAutoGrantPremium(
  userId: string,
  email: string | null,
): Promise<void> {
  if (!email) return;
  const grant = await db
    .select()
    .from(adminPremiumGrantsTable)
    .where(eq(adminPremiumGrantsTable.email, email.toLowerCase().trim()))
    .limit(1);
  if (!grant[0]) return;
  const sub = await getOrCreateSubscription(userId);
  if (sub.status === "active") return;
  const plan = (grant[0].plan as Exclude<Plan, "free">) ?? "yearly";
  await db
    .update(subscriptionsTable)
    .set({
      plan,
      status: "active",
      provider: "manual",
      currentPeriodEnd: new Date("2099-12-31T23:59:59.000Z"),
      cancelAtPeriodEnd: 0,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.userId, userId));
}

export async function startTrial(userId: string): Promise<Subscription> {
  const sub = await getOrCreateSubscription(userId);
  // Only allow starting trial once, from the free state
  if (sub.status !== "free") return sub;
  const trialEnd = new Date(Date.now() + FREE_LIMITS.trialDays * 24 * 60 * 60 * 1000);
  const [updated] = await db
    .update(subscriptionsTable)
    .set({
      status: "trialing",
      plan: "monthly",
      trialEndsAt: trialEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.userId, userId))
    .returning();
  return updated;
}

/**
 * Stub for direct activation (e.g. from a payment-provider webhook).
 * Until Stripe/RevenueCat is wired up, this is unused. Kept here so the
 * route layer has a clean call site.
 */
export async function activateSubscription(
  userId: string,
  plan: Exclude<Plan, "free">,
  opts: { provider?: "stripe" | "revenuecat" | "razorpay"; periodEnd?: Date; providerCustomerId?: string; providerSubscriptionId?: string } = {},
  dbExec: DbExec = db,
): Promise<Subscription> {
  const existing = await getOrCreateSubscription(userId, dbExec);
  // Idempotency: if the subscription is already active on the same plan and
  // the same provider subscription id, and the period_end is not moving
  // backwards, treat this as a no-op. This protects against a webhook for
  // the SAME charge being delivered twice (e.g. retried after a network
  // blip) from clobbering newer state written by a later webhook.
  const sameProviderSub =
    !!opts.providerSubscriptionId &&
    existing.providerSubscriptionId === opts.providerSubscriptionId;
  const samePlan = existing.plan === plan;
  const periodNotRegressing =
    !opts.periodEnd ||
    !existing.currentPeriodEnd ||
    opts.periodEnd.getTime() >= existing.currentPeriodEnd.getTime();
  if (
    existing.status === "active" &&
    samePlan &&
    sameProviderSub &&
    periodNotRegressing &&
    (!opts.periodEnd ||
      (existing.currentPeriodEnd &&
        existing.currentPeriodEnd.getTime() === opts.periodEnd.getTime()))
  ) {
    return existing;
  }
  const [updated] = await dbExec
    .update(subscriptionsTable)
    .set({
      plan,
      status: "active",
      provider: opts.provider ?? "none",
      providerCustomerId: opts.providerCustomerId ?? null,
      providerSubscriptionId: opts.providerSubscriptionId ?? null,
      currentPeriodEnd: opts.periodEnd ?? null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.userId, userId))
    .returning();

  // Referral system hook: mark this user's referral row as paid (no-op if
  // they weren't referred by anyone). Done OUTSIDE the dbExec so a webhook
  // transaction stays small and the reward grant runs on the main
  // connection. Failures here must not break activation, so swallow.
  try {
    const { markReferralPaid } = await import("./referralService");
    await markReferralPaid(userId);
  } catch {
    // best-effort
  }

  return updated;
}
