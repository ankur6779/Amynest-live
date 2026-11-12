/**
 * Talk-with-Amy access clock — first actual converse, not subscription.createdAt.
 *
 * Stores a one-shot unix-seconds stamp in existing usage_daily (no schema change).
 * Feature string is intentionally NOT in FREE_FEATURE_LIMITS so entitlements
 * never expose a fake quota.
 *
 * Authority: server Date.now() / UTC. Reinstall/login persist by userId.
 *
 * Do NOT infer the stamp from speech_conversation_seconds history. That bucket
 * also records premium practice, so seeding from it would immediately expire
 * the free 3-day window after entitlement lapse. Stamp only on free-path
 * converse when no lifetime row exists yet.
 */
import { and, eq } from "drizzle-orm";
import { db, usageDailyTable } from "@workspace/db";

export { conversationTrialWindow, FREE_CONVERSATION_TRIAL_DAYS } from "./speechConversationTrialWindow.js";

/** Not a FeatureKey — do not add to FREE_FEATURE_LIMITS. */
export const SPEECH_CONVERSATION_FIRST_USE_FEATURE = "speech_conversation_first_use";
export const SPEECH_CONVERSATION_FIRST_USE_DAY = "lifetime";

async function readStampUnix(userId: string): Promise<number | null> {
  const rows = await db
    .select({ count: usageDailyTable.count })
    .from(usageDailyTable)
    .where(
      and(
        eq(usageDailyTable.userId, userId),
        eq(usageDailyTable.day, SPEECH_CONVERSATION_FIRST_USE_DAY),
        eq(usageDailyTable.feature, SPEECH_CONVERSATION_FIRST_USE_FEATURE),
      ),
    )
    .limit(1);
  const n = rows[0]?.count;
  return n && n > 0 ? n : null;
}

async function persistStampUnix(userId: string, unixSeconds: number): Promise<number> {
  const existing = await readStampUnix(userId);
  if (existing) return existing;
  await db
    .insert(usageDailyTable)
    .values({
      userId,
      feature: SPEECH_CONVERSATION_FIRST_USE_FEATURE,
      day: SPEECH_CONVERSATION_FIRST_USE_DAY,
      count: unixSeconds,
    })
    .onConflictDoNothing();
  const after = await readStampUnix(userId);
  return after ?? unixSeconds;
}

/**
 * Stamp first actual Talk session (including kickoff). Insert-if-absent; never increment.
 * Returns unix seconds of first use. Does not reuse premium converse history.
 */
export async function ensureConversationFirstUseUnix(userId: string): Promise<number> {
  const existing = await readStampUnix(userId);
  if (existing) return existing;
  return persistStampUnix(userId, Math.floor(Date.now() / 1000));
}

export async function peekConversationFirstUseMs(userId: string): Promise<number | null> {
  const unix = await readStampUnix(userId);
  return unix ? unix * 1000 : null;
}
