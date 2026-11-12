/**
 * Speech Coach V2 lifetime first-use — 90 seconds total, per account (userId).
 *
 * Stores consumed seconds in existing usage_daily (no schema change).
 * Feature string is intentionally NOT in FREE_FEATURE_LIMITS so entitlements
 * never expose a daily quota.
 *
 * Premium / trialing users must never call charge helpers.
 * Peeking (usage GET / page open) does not increment.
 *
 * Do NOT seed the lifetime bucket from speech_coach_v2_daily_usage /
 * sessions history. Those tables accumulate paid/trial practice too, so
 * inferring would permanently burn the free 90s demo after entitlement lapse.
 * Only explicit free-path charges (and an existing lifetime row) count.
 */
import { and, eq } from "drizzle-orm";
import {
  db,
  usageDailyTable,
} from "@workspace/db";
import {
  SPEECH_COACH_V2_FIRST_USE_DAY,
  SPEECH_COACH_V2_FIRST_USE_FEATURE,
  SPEECH_COACH_V2_FIRST_USE_SECONDS,
  capFirstUseCharge,
  firstUseRemainingSeconds,
} from "./speechCoachV2FirstUseWindow.js";

export {
  SPEECH_COACH_V2_FIRST_USE_DAY,
  SPEECH_COACH_V2_FIRST_USE_EXHAUSTED_MESSAGE,
  SPEECH_COACH_V2_FIRST_USE_FEATURE,
  SPEECH_COACH_V2_FIRST_USE_SECONDS,
  capFirstUseCharge,
  firstUseIsExhausted,
  firstUseRemainingSeconds,
} from "./speechCoachV2FirstUseWindow.js";

type DbExec = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function readLifetimeUsed(exec: DbExec, userId: string): Promise<number | null> {
  const rows = await exec
    .select({ count: usageDailyTable.count })
    .from(usageDailyTable)
    .where(
      and(
        eq(usageDailyTable.userId, userId),
        eq(usageDailyTable.day, SPEECH_COACH_V2_FIRST_USE_DAY),
        eq(usageDailyTable.feature, SPEECH_COACH_V2_FIRST_USE_FEATURE),
      ),
    )
    .limit(1);
  const n = rows[0]?.count;
  return n == null ? null : Math.max(0, n);
}

/**
 * Read lifetime seconds used. Does not increment.
 * Missing lifetime row ⇒ 0 (do not infer from paid/trial session history).
 */
export async function peekSpeechCoachV2FirstUseUsed(userId: string): Promise<number> {
  const existing = await readLifetimeUsed(db, userId);
  if (existing != null) return Math.min(SPEECH_COACH_V2_FIRST_USE_SECONDS, existing);
  return 0;
}

export async function peekSpeechCoachV2FirstUseRemaining(userId: string): Promise<number> {
  const used = await peekSpeechCoachV2FirstUseUsed(userId);
  return firstUseRemainingSeconds(used);
}

/**
 * Charge actual session seconds into the lifetime bucket (transaction-safe).
 * Never charges more than remaining. Opening the page must not call this.
 */
export async function chargeSpeechCoachV2FirstUseSeconds(
  exec: DbExec,
  userId: string,
  requestedDelta: number,
): Promise<{ chargedSeconds: number; usedAfter: number; remainingAfter: number }> {
  const existing = await readLifetimeUsed(exec, userId);
  const seed = existing ?? 0;
  await exec
    .insert(usageDailyTable)
    .values({
      userId,
      feature: SPEECH_COACH_V2_FIRST_USE_FEATURE,
      day: SPEECH_COACH_V2_FIRST_USE_DAY,
      count: seed,
    })
    .onConflictDoNothing();

  const rows = await exec
    .select({ count: usageDailyTable.count, id: usageDailyTable.id })
    .from(usageDailyTable)
    .where(
      and(
        eq(usageDailyTable.userId, userId),
        eq(usageDailyTable.day, SPEECH_COACH_V2_FIRST_USE_DAY),
        eq(usageDailyTable.feature, SPEECH_COACH_V2_FIRST_USE_FEATURE),
      ),
    )
    .for("update")
    .limit(1);

  const used = rows[0]?.count ?? seed;
  const result = capFirstUseCharge(used, requestedDelta);
  if (rows[0] && result.chargedSeconds > 0) {
    await exec
      .update(usageDailyTable)
      .set({ count: result.usedAfter, updatedAt: new Date() })
      .where(eq(usageDailyTable.id, rows[0].id));
  }
  return result;
}
