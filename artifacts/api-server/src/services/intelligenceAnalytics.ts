/**
 * Adaptive Family Intelligence — Phase 2 analytics service.
 *
 * Pure-ish helpers (DB calls isolated to the *Async functions) that power:
 *   1. Adaptive scheduling     → applyEnergyCurveToItems
 *   2. Weekly intelligence     → computeWeeklyReport
 *   3. Risk-window predictor   → computeRiskWindows
 *   4. Behavior↔routine corr   → computeBehaviorCorrelation
 *
 * All numeric outputs are rounded to 1 decimal where applicable. Functions
 * never throw on empty input — they return well-formed empty / no-op results.
 */

import { and, eq, gte, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  childDailySignalsTable,
  routinesTable,
  behaviorsTable,
} from "@workspace/db";
import type { ChildDailySignal } from "@workspace/db";
import type { EnergyProfile, ParentGoalCode } from "./childIntelligenceService.js";

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export type AnalyticsRoutineItem = {
  time: string; // "HH:MM"
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: string;
  // pass-through
  [k: string]: unknown;
};

const LEARNING_CATEGORIES = new Set([
  "learning",
  "study",
  "education",
  "skill",
  "homework",
  "academic",
  "math",
  "reading",
]);

const REST_CATEGORIES = new Set([
  "rest",
  "nap",
  "sleep",
  "quiet",
  "relax",
  "wind-down",
  "story",
]);

// ─────────────────────────────────────────────────────────────────────────────
// 1. Adaptive scheduling — applyEnergyCurveToItems
// ─────────────────────────────────────────────────────────────────────────────

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map((s) => Number(s));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

function isInWindow(t: string, start: string, end: string): boolean {
  const x = timeToMin(t);
  const a = timeToMin(start);
  const b = timeToMin(end);
  if (x < 0 || a < 0 || b < 0) return false;
  return x >= a && x < b;
}

/**
 * Reanchor the first learning-category item into the peak-focus window, and
 * the first rest-category item into the low-energy window — by swapping its
 * `time` with the item currently sitting in that window.
 *
 * Conservative: at most one swap per window. Items array never changes
 * length; only the `time` field is rotated. Original ordering is then
 * recovered by sorting on `time` ascending so the front-end timeline stays
 * monotonic.
 *
 * No-op when sampleCount < 3 (energy profile not yet trustworthy) or when
 * the relevant window endpoints are missing.
 */
export function applyEnergyCurveToItems(
  items: readonly AnalyticsRoutineItem[],
  energyProfile: EnergyProfile | null,
): { items: AnalyticsRoutineItem[]; adaptations: string[] } {
  const out: AnalyticsRoutineItem[] = items.map((it) => ({ ...it }));
  const adaptations: string[] = [];
  if (!energyProfile || energyProfile.sampleCount < 3) {
    return { items: out, adaptations };
  }

  const trySwap = (
    catSet: Set<string>,
    winStart: string | null,
    winEnd: string | null,
    label: string,
    altStart: string | null = null,
    altEnd: string | null = null,
  ): void => {
    if (!winStart || !winEnd) return;
    const targetIdx = out.findIndex((it) =>
      catSet.has((it.category ?? "").toLowerCase()),
    );
    if (targetIdx < 0) return;
    if (isInWindow(out[targetIdx].time, winStart, winEnd)) return; // already aligned
    if (altStart && altEnd && isInWindow(out[targetIdx].time, altStart, altEnd)) {
      return; // already in an acceptable alternate window — leave it alone
    }
    const slotIdx = out.findIndex(
      (it, i) =>
        i !== targetIdx &&
        isInWindow(it.time, winStart, winEnd) &&
        !catSet.has((it.category ?? "").toLowerCase()),
    );
    if (slotIdx < 0) return;
    const tA = out[targetIdx].time;
    const tB = out[slotIdx].time;
    out[targetIdx] = { ...out[targetIdx], time: tB };
    out[slotIdx] = { ...out[slotIdx], time: tA };
    adaptations.push(
      `energy:${label}:${out[targetIdx].activity}@${tB}`,
    );
  };

  trySwap(
    LEARNING_CATEGORIES,
    energyProfile.peakFocusStart,
    energyProfile.peakFocusEnd,
    "peak_focus",
  );
  trySwap(
    REST_CATEGORIES,
    energyProfile.lowEnergyStart,
    energyProfile.lowEnergyEnd,
    "low_energy",
    energyProfile.calmWindowStart,
    energyProfile.calmWindowEnd,
  );

  out.sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
  return { items: out, adaptations };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Weekly intelligence report
// ─────────────────────────────────────────────────────────────────────────────

export type WeeklyReport = {
  childId: number;
  rangeStart: string; // YYYY-MM-DD inclusive
  rangeEnd: string; // YYYY-MM-DD inclusive
  signalDays: number; // # of days with any signal in the range
  streakDays: number; // current consecutive days with signal ending today
  averages: {
    mood: number | null;
    focusScore: number | null;
    sleepQuality: number | null;
    completionPct: number | null;
    screenMinutes: number | null;
    tantrumsPerDay: number | null;
  };
  deltas: {
    mood: number | null;
    focusScore: number | null;
    sleepQuality: number | null;
    completionPct: number | null;
    tantrumsPerDay: number | null;
  };
  goalProgress: Array<{
    goal: ParentGoalCode;
    direction: "up" | "down" | "flat" | "unknown";
    note: string;
  }>;
};

function dateNDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function avg(nums: readonly (number | null | undefined)[]): number | null {
  const xs = nums.filter((n): n is number => typeof n === "number");
  if (xs.length === 0) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
}

function delta(curr: number | null, prev: number | null): number | null {
  if (curr === null || prev === null) return null;
  return Math.round((curr - prev) * 10) / 10;
}

function computeStreak(signals: readonly ChildDailySignal[]): number {
  const dates = new Set(signals.map((s) => s.date));
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    if (dates.has(dateNDaysAgo(i))) streak++;
    else if (i === 0) continue; // grace for missing today
    else break;
  }
  return streak;
}

function describeGoalProgress(
  goal: ParentGoalCode,
  curr: WeeklyReport["averages"],
  prev: WeeklyReport["averages"],
): { direction: "up" | "down" | "flat" | "unknown"; note: string } {
  switch (goal) {
    case "improve_sleep": {
      const d = delta(curr.sleepQuality, prev.sleepQuality);
      if (d === null) return { direction: "unknown", note: `goal:improve_sleep:no_data` };
      if (d >= 0.3) return { direction: "up", note: `goal:improve_sleep:up:${d}` };
      if (d <= -0.3) return { direction: "down", note: `goal:improve_sleep:down:${d}` };
      return { direction: "flat", note: `goal:improve_sleep:flat` };
    }
    case "reduce_tantrums": {
      const d = delta(curr.tantrumsPerDay, prev.tantrumsPerDay);
      if (d === null) return { direction: "unknown", note: `goal:reduce_tantrums:no_data` };
      // Lower tantrums = better, so invert direction
      if (d <= -0.3) return { direction: "up", note: `goal:reduce_tantrums:up:${d}` };
      if (d >= 0.3) return { direction: "down", note: `goal:reduce_tantrums:down:${d}` };
      return { direction: "flat", note: `goal:reduce_tantrums:flat` };
    }
    case "improve_focus": {
      const d = delta(curr.focusScore, prev.focusScore);
      if (d === null) return { direction: "unknown", note: `goal:improve_focus:no_data` };
      if (d >= 0.3) return { direction: "up", note: `goal:improve_focus:up:${d}` };
      if (d <= -0.3) return { direction: "down", note: `goal:improve_focus:down:${d}` };
      return { direction: "flat", note: `goal:improve_focus:flat` };
    }
    case "reduce_screen_time": {
      const d = delta(curr.screenMinutes, prev.screenMinutes);
      if (d === null) return { direction: "unknown", note: `goal:reduce_screen_time:no_data` };
      if (d <= -10) return { direction: "up", note: `goal:reduce_screen_time:up:${d}` };
      if (d >= 10) return { direction: "down", note: `goal:reduce_screen_time:down:${d}` };
      return { direction: "flat", note: `goal:reduce_screen_time:flat` };
    }
    case "increase_independence": {
      const d = delta(curr.completionPct, prev.completionPct);
      if (d === null) return { direction: "unknown", note: `goal:increase_independence:no_data` };
      if (d >= 5) return { direction: "up", note: `goal:increase_independence:up:${d}` };
      if (d <= -5) return { direction: "down", note: `goal:increase_independence:down:${d}` };
      return { direction: "flat", note: `goal:increase_independence:flat` };
    }
  }
}

/**
 * Build a 7-day weekly report for a child, with deltas computed against the
 * preceding 7-day window. Pulls from child_daily_signals + children.parentGoals.
 */
export async function computeWeeklyReport(childId: number): Promise<WeeklyReport> {
  const rangeEnd = dateNDaysAgo(0);
  const rangeStart = dateNDaysAgo(6);
  const prevStart = dateNDaysAgo(13);
  const prevEnd = dateNDaysAgo(7);

  const [signals, children] = await Promise.all([
    db
      .select()
      .from(childDailySignalsTable)
      .where(
        and(
          eq(childDailySignalsTable.childId, childId),
          gte(childDailySignalsTable.date, prevStart),
        ),
      ),
    db
      .select({ parentGoals: childrenTable.parentGoals })
      .from(childrenTable)
      .where(eq(childrenTable.id, childId))
      .limit(1),
  ]);

  const inRange = (s: ChildDailySignal, a: string, b: string) => s.date >= a && s.date <= b;
  const curr = signals.filter((s) => inRange(s, rangeStart, rangeEnd));
  const prev = signals.filter((s) => inRange(s, prevStart, prevEnd));

  const averages: WeeklyReport["averages"] = {
    mood: avg(curr.map((s) => s.mood)),
    focusScore: avg(curr.map((s) => s.focusScore)),
    sleepQuality: avg(curr.map((s) => s.sleepQuality)),
    completionPct: avg(curr.map((s) => s.completionPct)),
    screenMinutes: avg(curr.map((s) => s.screenMinutes)),
    tantrumsPerDay:
      curr.length === 0
        ? null
        : Math.round(
            (curr.reduce((a, b) => a + (b.tantrumCount ?? 0), 0) / curr.length) * 10,
          ) / 10,
  };
  const prevAverages: WeeklyReport["averages"] = {
    mood: avg(prev.map((s) => s.mood)),
    focusScore: avg(prev.map((s) => s.focusScore)),
    sleepQuality: avg(prev.map((s) => s.sleepQuality)),
    completionPct: avg(prev.map((s) => s.completionPct)),
    screenMinutes: avg(prev.map((s) => s.screenMinutes)),
    tantrumsPerDay:
      prev.length === 0
        ? null
        : Math.round(
            (prev.reduce((a, b) => a + (b.tantrumCount ?? 0), 0) / prev.length) * 10,
          ) / 10,
  };

  const deltas: WeeklyReport["deltas"] = {
    mood: delta(averages.mood, prevAverages.mood),
    focusScore: delta(averages.focusScore, prevAverages.focusScore),
    sleepQuality: delta(averages.sleepQuality, prevAverages.sleepQuality),
    completionPct: delta(averages.completionPct, prevAverages.completionPct),
    tantrumsPerDay: delta(averages.tantrumsPerDay, prevAverages.tantrumsPerDay),
  };

  const goals = (Array.isArray(children[0]?.parentGoals) ? children[0]!.parentGoals : []) as ParentGoalCode[];
  const goalProgress = goals.map((g) => {
    const { direction, note } = describeGoalProgress(g, averages, prevAverages);
    return { goal: g, direction, note };
  });

  return {
    childId,
    rangeStart,
    rangeEnd,
    signalDays: curr.length,
    streakDays: computeStreak(signals),
    averages,
    deltas,
    goalProgress,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Risk-window predictor (uses behavior_logs createdAt timestamps)
// ─────────────────────────────────────────────────────────────────────────────

export type RiskWindow = {
  startHour: number; // 0-23
  endHour: number; // 0-23 (exclusive)
  negativeCount: number;
  daysObserved: number;
  suggestion: string; // suggestion code, UI re-keys to localised string
};

/**
 * Detect 1–2 hour windows where negative behaviors cluster.
 * Buckets behaviors into 24 hour-bins, finds peaks ≥2 events spanning ≥2 days.
 */
export function detectRiskWindowsFromBehaviors(
  behaviors: readonly { type: string; createdAt: Date | string }[],
): RiskWindow[] {
  const negByHour = new Map<number, { count: number; dates: Set<string> }>();
  for (const b of behaviors) {
    if (b.type !== "negative") continue;
    const d = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const h = d.getHours();
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const slot = negByHour.get(h) ?? { count: 0, dates: new Set<string>() };
    slot.count++;
    slot.dates.add(key);
    negByHour.set(h, slot);
  }

  const windows: RiskWindow[] = [];
  for (const [h, slot] of negByHour.entries()) {
    if (slot.count < 2 || slot.dates.size < 2) continue;
    windows.push({
      startHour: h,
      endHour: h + 1,
      negativeCount: slot.count,
      daysObserved: slot.dates.size,
      suggestion:
        h < 11
          ? "risk:morning:add_calm_block"
          : h < 15
            ? "risk:midday:offer_snack_or_quiet"
            : h < 19
              ? "risk:afternoon:swap_demanding_for_outdoor"
              : "risk:evening:start_winddown_earlier",
    });
  }
  windows.sort((a, b) => b.negativeCount - a.negativeCount);
  return windows.slice(0, 3);
}

export async function computeRiskWindows(childId: number): Promise<RiskWindow[]> {
  const since = dateNDaysAgo(14);
  const rows = await db
    .select({
      type: behaviorsTable.type,
      createdAt: behaviorsTable.createdAt,
    })
    .from(behaviorsTable)
    .where(
      and(
        eq(behaviorsTable.childId, childId),
        gte(behaviorsTable.date, since),
      ),
    );
  return detectRiskWindowsFromBehaviors(rows);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Behavior ↔ routine correlation
// ─────────────────────────────────────────────────────────────────────────────

export type BehaviorCorrelation = {
  category: string;
  positive: number;
  negative: number;
  net: number; // positive - negative
};

/**
 * For each behavior in the past 30 days, find routine items that occurred in
 * the 2 hours BEFORE the behavior, and tally their categories against the
 * behavior type. Returns the top 5 categories by absolute net score.
 */
export function correlateBehaviorsWithItems(
  behaviors: readonly { type: string; createdAt: Date | string; date: string }[],
  routinesByDate: ReadonlyMap<string, readonly AnalyticsRoutineItem[]>,
): BehaviorCorrelation[] {
  const tally = new Map<string, { positive: number; negative: number }>();
  const WINDOW_MIN = 120;

  for (const b of behaviors) {
    if (b.type !== "positive" && b.type !== "negative") continue;
    const items = routinesByDate.get(b.date);
    if (!items || items.length === 0) continue;
    const d = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const bMin = d.getHours() * 60 + d.getMinutes();

    for (const it of items) {
      const itMin = timeToMin(it.time);
      if (itMin < 0) continue;
      const diff = bMin - itMin;
      if (diff < 0 || diff > WINDOW_MIN) continue;
      const cat = (it.category ?? "").toLowerCase();
      if (!cat) continue;
      const slot = tally.get(cat) ?? { positive: 0, negative: 0 };
      if (b.type === "positive") slot.positive++;
      else slot.negative++;
      tally.set(cat, slot);
    }
  }

  const result: BehaviorCorrelation[] = [];
  for (const [category, v] of tally.entries()) {
    result.push({
      category,
      positive: v.positive,
      negative: v.negative,
      net: v.positive - v.negative,
    });
  }
  result.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  return result.slice(0, 5);
}

export async function computeBehaviorCorrelation(
  childId: number,
): Promise<BehaviorCorrelation[]> {
  const since = dateNDaysAgo(30);
  const [behaviors, routines] = await Promise.all([
    db
      .select({
        type: behaviorsTable.type,
        date: behaviorsTable.date,
        createdAt: behaviorsTable.createdAt,
      })
      .from(behaviorsTable)
      .where(
        and(
          eq(behaviorsTable.childId, childId),
          gte(behaviorsTable.date, since),
        ),
      ),
    db
      .select({ date: routinesTable.date, items: routinesTable.items })
      .from(routinesTable)
      .where(
        and(
          eq(routinesTable.childId, childId),
          gte(routinesTable.date, since),
        ),
      ),
  ]);

  const byDate = new Map<string, AnalyticsRoutineItem[]>();
  for (const r of routines) {
    const items = Array.isArray(r.items) ? (r.items as AnalyticsRoutineItem[]) : [];
    byDate.set(r.date, items);
  }
  return correlateBehaviorsWithItems(behaviors, byDate);
}

// Silence unused import warning when sql template helpers are removed.
void sql;
