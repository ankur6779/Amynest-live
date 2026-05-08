/**
 * Adaptive Family Intelligence — Phase 1 service layer.
 *
 * Owns:
 *   - Loading the child intelligence snapshot (goals + energy profile + recent signals)
 *   - Updating the structured parent goals
 *   - Upserting daily behavioral signals (mood / focus / sleep / completion / screen / tantrum)
 *   - Recomputing the child's basic energy profile from recent signals
 *
 * Phase 1 keeps the energy-profile heuristic deliberately simple — it ships
 * useful defaults from day one and gets meaningfully smarter once the parent
 * has logged ≥3 signals. Phase 2 will add per-routine completion timestamps
 * and goal-aware band selection.
 */

import { eq, and, desc, gte, sql } from "drizzle-orm";
import { db, childrenTable, childDailySignalsTable } from "@workspace/db";
import type { ChildDailySignal } from "@workspace/db";

export type ParentGoalCode =
  | "improve_sleep"
  | "reduce_tantrums"
  | "improve_focus"
  | "reduce_screen_time"
  | "increase_independence";

export const PARENT_GOAL_CODES: readonly ParentGoalCode[] = [
  "improve_sleep",
  "reduce_tantrums",
  "improve_focus",
  "reduce_screen_time",
  "increase_independence",
] as const;

export type EnergyProfile = {
  peakFocusStart: string | null;
  peakFocusEnd: string | null;
  lowEnergyStart: string | null;
  lowEnergyEnd: string | null;
  calmWindowStart: string | null;
  calmWindowEnd: string | null;
  sampleCount: number;
  lastComputedAt: string | null;
};

export type ChildIntelligenceSnapshot = {
  childId: number;
  parentGoals: ParentGoalCode[];
  energyProfile: EnergyProfile | null;
  recentSignals: Array<{
    date: string;
    mood: number | null;
    focusScore: number | null;
    sleepQuality: number | null;
    completionPct: number | null;
    screenMinutes: number | null;
    tantrumCount: number;
    notes: string | null;
  }>;
};

const SIGNAL_HISTORY_DAYS = 14;
const MIN_SAMPLES_FOR_PROFILE = 3;

/** Today as a YYYY-MM-DD local-date string. */
export function todayDateStr(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** YYYY-MM-DD string `daysBack` days before today. */
function daysAgoDateStr(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function sanitizeGoals(input: unknown): ParentGoalCode[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<ParentGoalCode>();
  for (const v of input) {
    if (typeof v === "string" && (PARENT_GOAL_CODES as readonly string[]).includes(v)) {
      set.add(v as ParentGoalCode);
    }
  }
  return Array.from(set);
}

function sanitizeEnergyProfile(input: unknown): EnergyProfile | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  return {
    peakFocusStart: typeof o.peakFocusStart === "string" ? o.peakFocusStart : null,
    peakFocusEnd: typeof o.peakFocusEnd === "string" ? o.peakFocusEnd : null,
    lowEnergyStart: typeof o.lowEnergyStart === "string" ? o.lowEnergyStart : null,
    lowEnergyEnd: typeof o.lowEnergyEnd === "string" ? o.lowEnergyEnd : null,
    calmWindowStart: typeof o.calmWindowStart === "string" ? o.calmWindowStart : null,
    calmWindowEnd: typeof o.calmWindowEnd === "string" ? o.calmWindowEnd : null,
    sampleCount: typeof o.sampleCount === "number" ? o.sampleCount : 0,
    lastComputedAt: typeof o.lastComputedAt === "string" ? o.lastComputedAt : null,
  };
}

function signalToEntry(s: ChildDailySignal): ChildIntelligenceSnapshot["recentSignals"][number] {
  return {
    date: s.date,
    mood: s.mood,
    focusScore: s.focusScore,
    sleepQuality: s.sleepQuality,
    completionPct: s.completionPct,
    screenMinutes: s.screenMinutes,
    tantrumCount: s.tantrumCount,
    notes: s.notes,
  };
}

/**
 * Verify the child belongs to the user. Returns the child row, or null.
 */
export async function loadOwnedChild(childId: number, userId: string) {
  const [child] = await db
    .select()
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)));
  return child ?? null;
}

/**
 * Build a basic energy profile from the last 14 days of signals.
 *
 * Heuristic (Phase 1, deliberately simple):
 *   - sampleCount < 3                → all windows null (return early; show defaults in UI)
 *   - avg sleepQuality < 3           → peakFocus shifted later (10:00–12:00) — child is sluggish in morning
 *   - else                           → peakFocus 09:00–11:00 (universal preschool/school-age sweet spot)
 *   - avg tantrumCount > 1.0         → lowEnergy 15:00–17:00 (late-afternoon crash)
 *   - else                           → lowEnergy 13:00–15:00 (post-lunch dip — universal)
 *   - calmWindow                     → 19:00–20:00 (pre-bed wind down) once sampleCount ≥ 3
 *
 * Phase 2 will replace this with per-routine completion-timestamp clustering.
 */
export function deriveEnergyProfile(
  signals: readonly Pick<ChildDailySignal, "sleepQuality" | "tantrumCount">[],
): EnergyProfile {
  const sampleCount = signals.length;
  const now = new Date().toISOString();

  if (sampleCount < MIN_SAMPLES_FOR_PROFILE) {
    return {
      peakFocusStart: null,
      peakFocusEnd: null,
      lowEnergyStart: null,
      lowEnergyEnd: null,
      calmWindowStart: null,
      calmWindowEnd: null,
      sampleCount,
      lastComputedAt: now,
    };
  }

  const sleepScores = signals
    .map((s) => s.sleepQuality)
    .filter((v): v is number => typeof v === "number");
  const avgSleep = sleepScores.length > 0
    ? sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length
    : 3;

  const avgTantrums = signals.reduce((a, b) => a + (b.tantrumCount ?? 0), 0) / sampleCount;

  const peakFocusStart = avgSleep < 3 ? "10:00" : "09:00";
  const peakFocusEnd = avgSleep < 3 ? "12:00" : "11:00";
  const lowEnergyStart = avgTantrums > 1 ? "15:00" : "13:00";
  const lowEnergyEnd = avgTantrums > 1 ? "17:00" : "15:00";

  return {
    peakFocusStart,
    peakFocusEnd,
    lowEnergyStart,
    lowEnergyEnd,
    calmWindowStart: "19:00",
    calmWindowEnd: "20:00",
    sampleCount,
    lastComputedAt: now,
  };
}

/**
 * Recompute and persist the child's energy profile from recent signals.
 * Called after every signal upsert.
 */
export async function recomputeAndPersistEnergyProfile(
  childId: number,
): Promise<EnergyProfile> {
  const since = daysAgoDateStr(SIGNAL_HISTORY_DAYS);
  const recent = await db
    .select({
      sleepQuality: childDailySignalsTable.sleepQuality,
      tantrumCount: childDailySignalsTable.tantrumCount,
    })
    .from(childDailySignalsTable)
    .where(
      and(
        eq(childDailySignalsTable.childId, childId),
        gte(childDailySignalsTable.date, since),
      ),
    );

  const profile = deriveEnergyProfile(recent);
  await db
    .update(childrenTable)
    .set({ energyProfile: profile })
    .where(eq(childrenTable.id, childId));
  return profile;
}

/**
 * Load a full intelligence snapshot for a child.
 * Caller must have already verified ownership.
 */
export async function getChildIntelligenceSnapshot(
  childId: number,
  child: { parentGoals: unknown; energyProfile: unknown },
): Promise<ChildIntelligenceSnapshot> {
  const since = daysAgoDateStr(SIGNAL_HISTORY_DAYS);
  const recentRows = await db
    .select()
    .from(childDailySignalsTable)
    .where(
      and(
        eq(childDailySignalsTable.childId, childId),
        gte(childDailySignalsTable.date, since),
      ),
    )
    .orderBy(desc(childDailySignalsTable.date))
    .limit(SIGNAL_HISTORY_DAYS);

  return {
    childId,
    parentGoals: sanitizeGoals(child.parentGoals),
    energyProfile: sanitizeEnergyProfile(child.energyProfile),
    recentSignals: recentRows.map(signalToEntry),
  };
}

/**
 * Replace the child's structured parent-selected optimization goals.
 * Returns the refreshed snapshot.
 */
export async function setParentGoals(
  childId: number,
  goals: ParentGoalCode[],
): Promise<void> {
  const sanitized = sanitizeGoals(goals);
  await db
    .update(childrenTable)
    .set({ parentGoals: sanitized })
    .where(eq(childrenTable.id, childId));
}

/**
 * Upsert (childId, date) signal — provided fields overwrite, omitted fields
 * are preserved if a row already exists for that date.
 */
export async function upsertChildDailySignal(
  childId: number,
  body: {
    date?: string | null;
    mood?: number | null;
    focusScore?: number | null;
    sleepQuality?: number | null;
    completionPct?: number | null;
    screenMinutes?: number | null;
    tantrumCount?: number | null;
    notes?: string | null;
  },
): Promise<void> {
  const date = (body.date ?? todayDateStr()).slice(0, 10);
  const now = new Date();

  // Build "set on conflict" map — only include keys the caller actually sent
  // so `undefined` doesn't blow away an existing value.
  const updateSet: Record<string, unknown> = { updatedAt: now };
  if (body.mood !== undefined) updateSet.mood = body.mood;
  if (body.focusScore !== undefined) updateSet.focusScore = body.focusScore;
  if (body.sleepQuality !== undefined) updateSet.sleepQuality = body.sleepQuality;
  if (body.completionPct !== undefined) updateSet.completionPct = body.completionPct;
  if (body.screenMinutes !== undefined) updateSet.screenMinutes = body.screenMinutes;
  if (body.tantrumCount !== undefined && body.tantrumCount !== null) {
    updateSet.tantrumCount = body.tantrumCount;
  }
  if (body.notes !== undefined) updateSet.notes = body.notes;

  await db
    .insert(childDailySignalsTable)
    .values({
      childId,
      date,
      mood: body.mood ?? null,
      focusScore: body.focusScore ?? null,
      sleepQuality: body.sleepQuality ?? null,
      completionPct: body.completionPct ?? null,
      screenMinutes: body.screenMinutes ?? null,
      tantrumCount: body.tantrumCount ?? 0,
      notes: body.notes ?? null,
    })
    .onConflictDoUpdate({
      target: [childDailySignalsTable.childId, childDailySignalsTable.date],
      set: updateSet,
    });
}

/**
 * Convenience: load the most recent signal for a child (used by the routine
 * generator to drive `previousDayContext`).
 */
export async function getMostRecentSignal(
  childId: number,
): Promise<ChildDailySignal | null> {
  const [row] = await db
    .select()
    .from(childDailySignalsTable)
    .where(eq(childDailySignalsTable.childId, childId))
    .orderBy(desc(childDailySignalsTable.date))
    .limit(1);
  return row ?? null;
}

/**
 * Map a 1–5 sleepQuality / mood / focusScore signal into the buckets the
 * existing routine generator already understands.
 */
export function signalToPreviousDayContext(
  signal: Pick<ChildDailySignal, "sleepQuality" | "mood" | "completionPct">,
): {
  sleepQuality?: "good" | "poor" | "average";
  moodScore?: "happy" | "tired" | "cranky" | "normal";
  activityCompletion?: number;
} {
  const out: ReturnType<typeof signalToPreviousDayContext> = {};
  if (typeof signal.sleepQuality === "number") {
    out.sleepQuality =
      signal.sleepQuality >= 4 ? "good"
      : signal.sleepQuality <= 2 ? "poor"
      : "average";
  }
  if (typeof signal.mood === "number") {
    out.moodScore =
      signal.mood >= 4 ? "happy"
      : signal.mood === 3 ? "normal"
      : signal.mood === 2 ? "tired"
      : "cranky";
  }
  if (typeof signal.completionPct === "number") {
    out.activityCompletion = Math.max(0, Math.min(100, signal.completionPct));
  }
  return out;
}

// Touch unused import so tree-shakers don't drop it (used in optional helpers).
void sql;
