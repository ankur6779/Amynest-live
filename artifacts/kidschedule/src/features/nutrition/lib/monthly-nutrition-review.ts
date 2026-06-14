import type { MealMemoryEntry } from "@/features/nutrition/lib/nutrition-memory";
import { aggregateMealStats, filterEntriesForMonth } from "@/features/nutrition/lib/nutrition-memory";
import type { StoredDaySnapshot } from "@/features/nutrition/lib/nutrition-score-storage";
import {
  computeMealConsistency,
  computeNutritionConfidence,
  type ConfidenceLevel,
} from "@/features/nutrition/lib/nutrition-confidence";
import type { AgeGroupId } from "@/lib/nutrition-data";
import type { WeeklyTrendDay } from "@/features/nutrition/lib/nutrition-streak";
import { dateKeyLocal } from "@/features/nutrition/lib/nutrition-score-storage";

export type ConfidenceTrend = "up" | "flat" | "down";

export interface MonthlyNutritionReview {
  monthLabel: string;
  topAcceptedMeal: string | null;
  topAcceptedCount: number;
  strongestWeekLabel: string | null;
  strongestWeekAvgScore: number;
  confidenceTrend: ConfidenceTrend;
  confidenceLevel: ConfidenceLevel;
  mealConsistencyPct: number;
  hasData: boolean;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthEntries(
  history: Record<string, StoredDaySnapshot>,
  ref: Date,
): Array<{ dateKey: string; snap: StoredDaySnapshot }> {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  return Object.entries(history)
    .filter(([key]) => {
      const d = parseDateKey(key);
      return d.getFullYear() === y && d.getMonth() === m;
    })
    .map(([dateKey, snap]) => ({ dateKey, snap }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function buildWeekBuckets(
  rows: Array<{ dateKey: string; snap: StoredDaySnapshot }>,
): Array<{ label: string; avg: number; days: number }> {
  const buckets = new Map<string, { total: number; count: number; start: string }>();

  for (const { dateKey, snap } of rows) {
    if (snap.checked === 0 && snap.score === 0) continue;
    const d = parseDateKey(dateKey);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d);
    weekStart.setDate(diff);
    const key = formatDateKey(weekStart);
    const existing = buckets.get(key) ?? { total: 0, count: 0, start: key };
    existing.total += snap.score;
    existing.count++;
    buckets.set(key, existing);
  }

  return [...buckets.values()].map((b) => ({
    label: `Week of ${b.start.slice(5).replace("-", "/")}`,
    avg: b.count > 0 ? Math.round(b.total / b.count) : 0,
    days: b.count,
  }));
}

function confidenceTrendFromHistory(
  rows: Array<{ dateKey: string; snap: StoredDaySnapshot }>,
): ConfidenceTrend {
  if (rows.length < 4) return "flat";
  const mid = Math.floor(rows.length / 2);
  const first = rows.slice(0, mid);
  const second = rows.slice(mid);
  const avg = (part: typeof rows) => {
    const active = part.filter((r) => r.snap.checked > 0);
    if (active.length === 0) return 0;
    return active.reduce((s, r) => s + r.snap.score, 0) / active.length;
  };
  const diff = avg(second) - avg(first);
  if (diff >= 8) return "up";
  if (diff <= -8) return "down";
  return "flat";
}

function monthTrendDays(
  rows: Array<{ dateKey: string; snap: StoredDaySnapshot }>,
): WeeklyTrendDay[] {
  return rows.map(({ dateKey, snap }) => ({
    dateKey,
    score: snap.score,
    checked: snap.checked,
    minDayMet: snap.minDayMet ?? snap.checked >= 1,
  }));
}

export function buildMonthlyNutritionReview(input: {
  memoryEntries: MealMemoryEntry[];
  history: Record<string, StoredDaySnapshot>;
  ageGroupId: AgeGroupId;
  streak: number;
  ref?: Date;
}): MonthlyNutritionReview {
  const ref = input.ref ?? new Date();
  const monthLabel = ref.toLocaleString(undefined, { month: "long", year: "numeric" });
  const monthMemory = filterEntriesForMonth(input.memoryEntries, ref);
  const monthHistory = monthEntries(input.history, ref);

  const stats = aggregateMealStats(monthMemory);
  const topMeal = stats.find((s) => s.loved > 0 || s.some > 0) ?? stats[0];

  const weeks = buildWeekBuckets(monthHistory);
  const strongest = weeks.sort((a, b) => b.avg - a.avg)[0];

  const trendDays = monthTrendDays(monthHistory);
  const todayKey = dateKeyLocal(ref);
  const liveToday = monthHistory.find((r) => r.dateKey === todayKey);
  const dailyScore = liveToday?.snap.score ?? trendDays.at(-1)?.score ?? 0;

  const confidence = computeNutritionConfidence({
    dailyScore,
    weeklyTrend: trendDays.slice(-7),
    streak: input.streak,
    ageGroupId: input.ageGroupId,
    mealConsistency: computeMealConsistency(trendDays),
  });

  const hasData =
    monthMemory.length > 0 ||
    monthHistory.some((r) => r.snap.checked > 0);

  return {
    monthLabel,
    topAcceptedMeal: topMeal ? topMeal.mealName : null,
    topAcceptedCount: topMeal ? topMeal.loved + topMeal.some : 0,
    strongestWeekLabel: strongest?.label ?? null,
    strongestWeekAvgScore: strongest?.avg ?? 0,
    confidenceTrend: confidenceTrendFromHistory(monthHistory),
    confidenceLevel: confidence.confidenceLevel,
    mealConsistencyPct: Math.round(computeMealConsistency(trendDays) * 100),
    hasData,
  };
}
