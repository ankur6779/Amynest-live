/**
 * Adaptive Difficulty — controlled duration tuning from activity history.
 */
import {
  clampDurationForCategory,
  isLockedScheduleItem,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";
import type { ActivityHistoryEntry, RoutineActivityHistory } from "./routine-behavior-signature.js";

export type DifficultyAdjustment = {
  activity: string;
  category: string;
  previousDuration: number;
  newDuration: number;
  direction: "increase" | "decrease" | "lighten";
  reason: string;
};

export type DifficultyAdjustResult = {
  items: RoutineScheduleItem[];
  adjustments: DifficultyAdjustment[];
};

const STUDY_CATS = new Set(["study", "school"]);
const PLAY_CATS = new Set(["play", "outdoor", "creative", "exercise", "activity"]);

const LIGHTEN_LABELS: Record<string, { activity: string; category: string }> = {
  study: { activity: "Light reading & review", category: "study" },
  play: { activity: "Calm creative play", category: "creative" },
  exercise: { activity: "Gentle movement break", category: "rest" },
};

function isPinnedItem(item: RoutineScheduleItem): boolean {
  if (isLockedScheduleItem(item)) return true;
  const cat = (item.category ?? "").toLowerCase();
  return (
    cat === "sleep" ||
    cat === "school" ||
    cat === "meal" ||
    cat === "tiffin" ||
    /\b(breakfast|lunch|dinner|tiffin|wake|sleep|bedtime)\b/i.test(item.activity)
  );
}

function historyStats(
  activity: string,
  category: string,
  entries: ActivityHistoryEntry[],
): { completed: number; skipped: number; total: number } {
  const related = entries.filter(
    (e) =>
      e.activity.toLowerCase() === activity.toLowerCase() ||
      e.category.toLowerCase() === category.toLowerCase(),
  );
  if (related.length === 0) {
    const byCat = entries.filter((e) => e.category.toLowerCase() === category.toLowerCase());
    return {
      completed: byCat.filter((e) => e.completed).length,
      skipped: byCat.filter((e) => e.skipped).length,
      total: byCat.length,
    };
  }
  return {
    completed: related.filter((e) => e.completed).length,
    skipped: related.filter((e) => e.skipped).length,
    total: related.length,
  };
}

function maxDeltaRatio(baseline: Map<string, number>, activity: string, next: number): boolean {
  const base = baseline.get(activity);
  if (base == null || base === 0) return true;
  const change = Math.abs(next - base) / base;
  return change <= 0.2;
}

/**
 * Tunes durations from history. Respects category clamps; max ~20% drift from baseline.
 */
export function adjustActivityDifficulty(
  items: RoutineScheduleItem[],
  history: RoutineActivityHistory,
  opts?: {
    baselineDurations?: Map<string, number>;
    maxTotalDriftPct?: number;
  },
): DifficultyAdjustResult {
  const baseline =
    opts?.baselineDurations ??
    new Map(items.map((i) => [i.activity, i.duration ?? 30]));
  const adjustments: DifficultyAdjustment[] = [];
  const entries = history.entries;

  const adjusted = items.map((item) => {
    if (isPinnedItem(item)) return item;

    const cat = (item.category ?? "").toLowerCase();
    if (!STUDY_CATS.has(cat) && !PLAY_CATS.has(cat) && cat !== "exercise") {
      return item;
    }

    const stats = historyStats(item.activity, cat, entries);
    if (stats.total === 0) return item;

    const skipRate = stats.skipped / stats.total;
    const completeRate = stats.completed / stats.total;
    let duration = item.duration ?? 30;
    const prev = duration;

    if (completeRate >= 0.75 && skipRate < 0.2) {
      const bump = STUDY_CATS.has(cat) ? 1.12 : 1.1;
      duration = clampDurationForCategory(cat, Math.round(duration * bump));
      if (maxDeltaRatio(baseline, item.activity, duration)) {
        adjustments.push({
          activity: item.activity,
          category: cat,
          previousDuration: prev,
          newDuration: duration,
          direction: "increase",
          reason: "Activity consistently completed — slight duration increase",
        });
        return { ...item, duration };
      }
    }

    if (skipRate >= 0.4) {
      if (skipRate >= 0.6 && (STUDY_CATS.has(cat) || PLAY_CATS.has(cat))) {
        const lighten = LIGHTEN_LABELS[cat] ?? LIGHTEN_LABELS.play!;
        adjustments.push({
          activity: item.activity,
          category: cat,
          previousDuration: prev,
          newDuration: clampDurationForCategory(lighten.category, Math.round(prev * 0.8)),
          direction: "lighten",
          reason: "Frequently skipped — converted to lighter version",
        });
        return {
          ...item,
          activity: lighten.activity,
          category: lighten.category,
          duration: clampDurationForCategory(
            lighten.category,
            Math.round(prev * 0.8),
          ),
        };
      }
      duration = clampDurationForCategory(cat, Math.round(duration * 0.85));
      if (maxDeltaRatio(baseline, item.activity, duration)) {
        adjustments.push({
          activity: item.activity,
          category: cat,
          previousDuration: prev,
          newDuration: duration,
          direction: "decrease",
          reason: "Often skipped — shortened duration",
        });
        return { ...item, duration };
      }
    }

    return item;
  });

  return { items: adjusted, adjustments };
}

export function snapshotDurations(
  items: RoutineScheduleItem[],
): Map<string, number> {
  return new Map(items.map((i) => [i.activity, i.duration ?? 30]));
}

export function totalDurationDriftPct(
  baseline: Map<string, number>,
  items: RoutineScheduleItem[],
): number {
  let baseSum = 0;
  let delta = 0;
  for (const item of items) {
    const b = baseline.get(item.activity);
    if (b == null) continue;
    baseSum += b;
    delta += Math.abs((item.duration ?? 30) - b);
  }
  if (baseSum === 0) return 0;
  return delta / baseSum;
}
