/**
 * Talk-with-Amy access clock — first actual converse, not subscription.createdAt.
 *
 * Stores a one-shot unix-seconds stamp in existing usage_daily (no schema change).
 * Feature string is intentionally NOT in FREE_FEATURE_LIMITS so entitlements
 * never expose a fake quota.
 *
 * Authority: server Date.now() / UTC. Reinstall/login persist by userId.
 */
import { and, asc, eq } from "drizzle-orm";
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
 * Earliest converse-seconds row createdAt — backward compat for users who
 * already talked before this stamp existed. Kickoff-only (0s) has no row.
 */
async function inferFirstUseFromConverseHistory(userId: string): Promise<number | null> {
  const rows = await db
    .select({ createdAt: usageDailyTable.createdAt })
    .from(usageDailyTable)
    .where(
      and(
        eq(usageDailyTable.userId, userId),
        eq(usageDailyTable.feature, "speech_conversation_seconds"),
      ),
    )
    .orderBy(asc(usageDailyTable.createdAt))
    .limit(1);
  const at = rows[0]?.createdAt;
  if (!at) return null;
  const unix = Math.floor(at.getTime() / 1000);
  return unix > 0 ? unix : null;
}

/**
 * Stamp first actual Talk session (including kickoff). Insert-if-absent; never increment.
 * Returns unix seconds of first use.
 */
export async function ensureConversationFirstUseUnix(userId: string): Promise<number> {
  const existing = await readStampUnix(userId);
  if (existing) return existing;
  const inferred = await inferFirstUseFromConverseHistory(userId);
  const unix = inferred ?? Math.floor(Date.now() / 1000);
  return persistStampUnix(userId, unix);
}

export async function peekConversationFirstUseMs(userId: string): Promise<number | null> {
  const unix = await readStampUnix(userId);
  if (unix) return unix * 1000;
  const inferred = await inferFirstUseFromConverseHistory(userId);
  return inferred != null ? inferred * 1000 : null;
}
