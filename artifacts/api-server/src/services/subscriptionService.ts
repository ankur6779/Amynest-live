import {
  db,
  subscriptionsTable,
  usageDailyTable,
  childrenTable,
  adminPremiumGrantsTable,
  type Subscription,
} from "@workspace/db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { HUB_CONTENT_QUOTAS } from "@workspace/parent-hub-journey";
import {
  hasValidPaidPeriodEnd,
  isPremiumNow,
} from "./subscription-premium-gate.js";
import { UNLIMITED_DEVICES_EMAILS } from "./deviceLimitLogic.js";

export { hasValidPaidPeriodEnd, isPremiumNow } from "./subscription-premium-gate.js";

/** Env-configurable infant Baby Expert daily limit (A/B testing). Default 3. */
function resolveInfantAiDailyLimit(): number {
  const raw = process.env["INFANT_AI_DAILY_LIMIT"];
  if (!raw) return 3;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

export const INFANT_AI_DAILY_LIMIT = resolveInfantAiDailyLimit();

// Drizzle's transaction object exposes the same query API as `db`, so the
// service helpers below accept either. We type it loosely to avoid leaking
// drizzle-internal generics through the public API.
type DbExec = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type Plan = "free" | "monthly" | "six_month" | "yearly";
export type Status = "free" | "trialing" | "active" | "past_due" | "canceled";

/** Default display / store-reference prices (USD). Shown when RevenueCat live prices are unavailable. */
export const PLAN_PRICES: Record<
  Exclude<Plan, "free">,
  { amount: number; period: string; currency: "USD" }
> = {
  monthly: { amount: 4.99, period: "month", currency: "USD" },
  six_month: { amount: 24.99, period: "6 months", currency: "USD" },
  yearly: { amount: 39.99, period: "year", currency: "USD" },
};

/** India-only Razorpay checkout amounts (INR). Not used for default UI pricing. */
export const RAZORPAY_PLAN_PRICES_INR: Record<Exclude<Plan, "free">, { amount: number }> = {
  monthly: { amount: 199 },
  six_month: { amount: 999 },
  yearly: { amount: 1499 },
};

export function formatPlanPrice(
  amount: number,
  currency: string,
): string {
  if (currency === "USD") return `$${amount.toFixed(2)}`;
  if (currency === "INR") return `₹${amount}`;
  return `${currency} ${amount}`;
}

export const FREE_LIMITS = {
  // Daily cap for free Amy AI messages — resets every UTC day.
  aiQueriesPerDay: 10,
  /** Infant Baby Expert — separate pool for children under 24 months. */
  infantAiQueriesPerDay: INFANT_AI_DAILY_LIMIT,
  childrenMax: 1,
  devicesMax: 1,
  routinesMax: 2,
  hubArticlesMax: 3,
  trialDays: 3,
};

export const PREMIUM_LIMITS = {
  childrenMax: 2,
  devicesMax: 3,
} as const;

/** Future family plan — configurable default device cap. */
export const FAMILY_PLAN_LIMITS = {
  devicesMax: 6,
} as const;

export function resolveDevicesMax(isPremium: boolean, email?: string | null): number {
  if (email && UNLIMITED_DEVICES_EMAILS.has(email.toLowerCase().trim())) {
    return 999;
  }
  if (isPremium) return PREMIUM_LIMITS.devicesMax;
  return FREE_LIMITS.devicesMax;
}

/** Demo / QA accounts exempt from the premium child cap. */
export const UNLIMITED_CHILDREN_EMAILS = new Set([
  "demo@amynest.in",
]);

export function resolveChildrenMax(
  isPremium: boolean,
  email?: string | null,
): number {
  if (email && UNLIMITED_CHILDREN_EMAILS.has(email.toLowerCase().trim())) {
    return 999;
  }
  if (isPremium) return PREMIUM_LIMITS.childrenMax;
  return FREE_LIMITS.childrenMax;
}

/**
 * Per-feature free-use cap. Global Paywall rule:
 *   - AI chat: 10 messages per day (daily reset).
 *   - Routine generation: THREE uses during the 3-day free journey, then locked.
 *   - Behavior log: ONE use per lifetime, then locked.
 *
 * Keys MUST match the `feature` column in `usage_daily`.
 */
export const FREE_FEATURE_LIMITS = {
  ai_query: 10,
  infant_ai_query: INFANT_AI_DAILY_LIMIT,
  routine_generate: 3,
  behavior_log: 1,
  // 1 free TTS audio lesson per day (resets UTC midnight). The web/mobile
  // audio-lesson screens call /api/features/audio_lesson/consume before
  // playback to reserve the slot — premium users bypass entirely.
  audio_lesson: 1,
  /** OpenAI TTS cache misses per UTC day (free tier). Premium uses TTS_DAILY_MISS_LIMIT_PREMIUM. */
  tts_generation: 50,
  // ── Amy Speech Coach (Parent Hub Module) ──────────────────────────────
  // Free users get three lifetime practice sessions across all Speech Coach
  // sections (client + POST /speech/practice/log share hub_speech_session).
  hub_speech_session: HUB_CONTENT_QUOTAS.speechCoachSessions,
  hub_speech_coach: HUB_CONTENT_QUOTAS.speechCoachSessions,
  // ── Live Speech Coach conversation (cost guard) ────────────────────────
  // Daily TIME budget (in seconds) for the live ChatGPT-style talk bot.
  // Applies to ALL users (free + premium) to keep AI voice costs bounded.
  // Enforced directly in routes/speech-converse.ts — the "count" column here
  // stores seconds consumed today (resets at UTC midnight).
  speech_conversation_seconds: 300,
  /** Whisper / Scribe STT calls per UTC day (Speech Coach pronunciation checks). */
  speech_transcribe: 20,
  // ── Nutrition Hub (AI meal plan + family portions) ─────────────────────
  nutrition_week_plan: 1,    // one 7-day AI meal plan per lifetime
  nutrition_family_ai: 1,    // one AI family-portion lookup per lifetime
  // ── Learning hub AI load-more (1 free lifetime per section; premium 20/day) ─
  learning_load_more_smart_study: 1,
  learning_load_more_smart_math_tricks: 1,
  learning_load_more_olympiad: 1,
  learning_load_more_spelling: 1,
  learning_load_more_phonics: 1,
  learning_load_more_life_skills: 1,
  // ── Infant Premium MVP ───────────────────────────────────────────────────
  infant_sleep_coach: 1,
  infant_feeding_plan: 1,
} as const;

export type FeatureKey = keyof typeof FREE_FEATURE_LIMITS;

/**
 * Scope of each feature's counter bucket.
 *   - "daily"    → resets every UTC midnight (one row per user/feature/day).
 *   - "lifetime" → never resets (single bucket key "lifetime").
 */
export const FEATURE_SCOPE: Record<FeatureKey, "daily" | "lifetime"> = {
  ai_query: "daily",
  infant_ai_query: "daily",
  routine_generate: "lifetime",
  behavior_log: "lifetime",
  audio_lesson: "daily",
  tts_generation: "daily",
  hub_speech_session: "lifetime",
  hub_speech_coach: "lifetime",
  speech_conversation_seconds: "daily",
  speech_transcribe: "daily",
  nutrition_week_plan: "lifetime",
  nutrition_family_ai: "lifetime",
  learning_load_more_smart_study: "lifetime",
  learning_load_more_smart_math_tricks: "lifetime",
  learning_load_more_olympiad: "lifetime",
  learning_load_more_spelling: "lifetime",
  learning_load_more_phonics: "lifetime",
  learning_load_more_life_skills: "lifetime",
  infant_sleep_coach: "lifetime",
  infant_feeding_plan: "lifetime",
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
    /** Infant Baby Expert pool (child under 24 months). */
    infantAiQueriesToday: number;
    infantAiQueriesRemaining: number | null;
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

/** Premium STT daily cap (env override). Free tier uses FREE_FEATURE_LIMITS.speech_transcribe. */
export function speechTranscribeDailyLimit(isPremium: boolean): number {
  if (!isPremium) return FREE_FEATURE_LIMITS.speech_transcribe;
  const raw = process.env["SPEECH_TRANSCRIBE_DAILY_LIMIT_PREMIUM"];
  if (!raw) return 100;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 100;
}

export async function getOrCreateSubscription(
  userId: string,
  dbExec: DbExec = db,
  phoneNumber?: string | null,
): Promise<Subscription> {
  const existing = await dbExec
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .limit(1);
  if (existing[0]) {
    // Opportunistically save phone number if not yet stored.
    if (phoneNumber && !existing[0].phoneNumber) {
      await dbExec
        .update(subscriptionsTable)
        .set({ phoneNumber, updatedAt: new Date() })
        .where(eq(subscriptionsTable.userId, userId));
    }
    return existing[0];
  }
  const [created] = await dbExec
    .insert(subscriptionsTable)
    .values({ userId, plan: "free", status: "free", provider: "none", phoneNumber: phoneNumber ?? null })
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

/** Batch-read usage counters for many features in one query (entitlements hot path). */
export async function getFeatureUsageMap(
  userId: string,
  features: FeatureKey[],
): Promise<Partial<Record<FeatureKey, number>>> {
  if (features.length === 0) return {};
  const dayKeys = [...new Set(features.map((f) => bucketKeyFor(f)))];
  const rows = await db
    .select({
      feature: usageDailyTable.feature,
      day: usageDailyTable.day,
      count: usageDailyTable.count,
    })
    .from(usageDailyTable)
    .where(
      and(
        eq(usageDailyTable.userId, userId),
        inArray(usageDailyTable.feature, features),
        inArray(usageDailyTable.day, dayKeys),
      ),
    );
  const out: Partial<Record<FeatureKey, number>> = {};
  for (const feature of features) {
    out[feature] = 0;
  }
  for (const row of rows) {
    const feature = row.feature as FeatureKey;
    if (!features.includes(feature)) continue;
    if (row.day !== bucketKeyFor(feature)) continue;
    out[feature] = row.count ?? 0;
  }
  return out;
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

/**
 * Downgrade DB rows that say active/trialing but fail isPremiumNow (e.g. missing
 * or expired currentPeriodEnd). Runs on every entitlement read so bad state self-heals.
 */
export async function healStaleSubscriptionRecord(
  sub: Subscription,
  dbExec: DbExec = db,
): Promise<Subscription> {
  if (isPremiumNow(sub)) return sub;
  if (sub.status === "free") return sub;

  if (sub.provider === "manual" && sub.status === "active" && !hasValidPaidPeriodEnd(sub)) {
    const farFuture = new Date("2099-12-31T23:59:59.000Z");
    const [fixed] = await dbExec
      .update(subscriptionsTable)
      .set({ currentPeriodEnd: farFuture, updatedAt: new Date() })
      .where(eq(subscriptionsTable.userId, sub.userId))
      .returning();
    return fixed ?? sub;
  }

  if (!["revenuecat", "razorpay", "none"].includes(sub.provider ?? "none")) {
    return sub;
  }

  const [updated] = await dbExec
    .update(subscriptionsTable)
    .set({
      status: "free",
      plan: "free",
      provider: "none",
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: 0,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.userId, sub.userId))
    .returning();
  return updated ?? sub;
}

export async function getEntitlements(
  userId: string,
  email?: string | null,
): Promise<EntitlementSummary> {
  const featureKeys = Object.keys(FREE_FEATURE_LIMITS) as FeatureKey[];
  let sub = await getOrCreateSubscription(userId);
  sub = await healStaleSubscriptionRecord(sub);
  const isPremium = isPremiumNow(sub);
  const isTrialing = sub.status === "trialing" && !!sub.trialEndsAt && sub.trialEndsAt.getTime() > Date.now();

  const otherKeys = featureKeys.filter((k) => k !== "routine_generate");
  const { getRoutineGenerateEntitlement } = await import(
    "./routineJourneyService.js"
  );
  const [routineEntitlement, usageMap] = await Promise.all([
    getRoutineGenerateEntitlement(userId, isPremium),
    getFeatureUsageMap(userId, otherKeys),
  ]);

  const features = {} as Record<FeatureKey, FeatureUsage>;
  for (const key of featureKeys) {
    if (key === "routine_generate") {
      const { used, limit, locked } = routineEntitlement;
      features[key] = {
        used,
        limit,
        remaining: isPremium ? null : Math.max(0, limit - used),
        locked: !isPremium && locked,
      };
      continue;
    }
    const used = usageMap[key] ?? 0;
    const limit = FREE_FEATURE_LIMITS[key];
    features[key] = {
      used,
      limit,
      remaining: isPremium ? null : Math.max(0, limit - used),
      locked: !isPremium && used >= limit,
    };
  }

  return {
    plan: sub.plan as Plan,
    status: sub.status as Status,
    isPremium,
    isTrialing,
    trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
    currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd === 1,
    provider: (sub.provider ?? "none") as EntitlementSummary["provider"],
    limits: {
      ...FREE_LIMITS,
      childrenMax: resolveChildrenMax(isPremium, email),
      devicesMax: resolveDevicesMax(isPremium, email),
    },
    usage: {
      aiQueriesToday: features.ai_query.used,
      aiQueriesRemaining: features.ai_query.remaining,
      infantAiQueriesToday: features.infant_ai_query.used,
      infantAiQueriesRemaining: features.infant_ai_query.remaining,
      features,
    },
  };
}

/**
 * Returns true if this userId, email, or phone number is in the env-var allowlists:
 *   ADMIN_PREMIUM_UIDS   — comma-separated Firebase UIDs (works for phone-auth users)
 *   ADMIN_PREMIUM_EMAILS — comma-separated email addresses
 *   ADMIN_PREMIUM_PHONES — comma-separated E.164 phone numbers (e.g. +919876543210)
 * These are checked BEFORE the DB table so they work in production without a
 * DB migration (just set the env var and redeploy).
 */
// Hardcoded test/reviewer accounts that always get auto-granted Premium so
// QA and the Google Play reviewer can test paywalled features without
// requiring an env-var redeploy. Keep this list tiny.
const HARDCODED_PREMIUM_EMAILS = new Set([
  "demo@amynest.in",
  "googleplay.reviewer@amynest.app",
  "amynestreview@amynest.in",
]);

function isEnvGranted(userId: string, email: string | null, phoneNumber?: string | null): boolean {
  if (email && HARDCODED_PREMIUM_EMAILS.has(email.toLowerCase().trim())) return true;

  const uids = (process.env.ADMIN_PREMIUM_UIDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (uids.includes(userId)) return true;

  if (email) {
    const emails = (process.env.ADMIN_PREMIUM_EMAILS ?? "")
      .split(",")
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean);
    if (emails.includes(email.toLowerCase().trim())) return true;
  }

  if (phoneNumber) {
    const phones = (process.env.ADMIN_PREMIUM_PHONES ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (phones.includes(phoneNumber.trim())) return true;
  }

  return false;
}

/**
 * Checks if the given userId/email/phoneNumber has a manual premium grant —
 * first via env-var allowlists (ADMIN_PREMIUM_UIDS / ADMIN_PREMIUM_EMAILS /
 * ADMIN_PREMIUM_PHONES, works even in production without a DB migration),
 * then via the admin_premium_grants DB table (keyed by email or phone).
 * If granted and the subscription is not yet active, upgrades it to
 * active/yearly with a far-future period end. Idempotent.
 */
export async function maybeAutoGrantPremium(
  userId: string,
  email: string | null,
  phoneNumber?: string | null,
): Promise<void> {
  let plan: Exclude<Plan, "free"> = "yearly";

  if (isEnvGranted(userId, email, phoneNumber)) {
    // Fast-path: env var grant — no DB lookup needed.
  } else {
    // DB lookup: match by email OR by phone number (whichever is available).
    const conditions: ReturnType<typeof eq>[] = [];
    if (email) {
      conditions.push(eq(adminPremiumGrantsTable.email, email.toLowerCase().trim()));
    }
    if (phoneNumber) {
      conditions.push(eq(adminPremiumGrantsTable.phoneNumber, phoneNumber.trim()));
    }
    if (conditions.length === 0) return;

    const { or } = await import("drizzle-orm");
    const grant = await db
      .select()
      .from(adminPremiumGrantsTable)
      .where(or(...conditions))
      .limit(1);
    if (!grant[0]) return;
    plan = (grant[0].plan as Exclude<Plan, "free">) ?? "yearly";
  }

  const sub = await getOrCreateSubscription(userId, db, phoneNumber);
  if (sub.status === "active") return;
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
  opts: {
    provider?: "stripe" | "revenuecat" | "razorpay";
    periodEnd?: Date;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
    /** When false, referred-user row is not promoted to paid (e.g. RevenueCat trial). */
    countsForReferralPaid?: boolean;
  } = {},
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
    const countsForReferralPaid = opts.countsForReferralPaid !== false;
    try {
      const { ensureReferralPaidMarked } = await import("./referralService");
      await ensureReferralPaidMarked(userId, countsForReferralPaid);
    } catch {
      // best-effort
    }
    return existing;
  }
  const provider = opts.provider ?? "none";
  // Paid providers must include a future period end — prevents permanent premium
  // when webhooks/sync omit expiration_at_ms or expires_date.
  if (
    (provider === "revenuecat" || provider === "razorpay") &&
    (!opts.periodEnd || opts.periodEnd.getTime() <= Date.now())
  ) {
    const { logger } = await import("../lib/logger.js");
    logger.warn(
      { userId, plan, provider, periodEnd: opts.periodEnd?.toISOString() ?? null },
      "[subscription] refused activateSubscription without valid periodEnd",
    );
    return existing;
  }

  const [updated] = await dbExec
    .update(subscriptionsTable)
    .set({
      plan,
      status: "active",
      provider,
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
    await markReferralPaid(userId, {
      countsAsPaid: opts.countsForReferralPaid !== false,
    });
  } catch {
    // best-effort
  }

  return updated;
}
