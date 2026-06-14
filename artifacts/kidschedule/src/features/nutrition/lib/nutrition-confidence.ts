import type { AgeGroupId } from "@/lib/nutrition-data";
import type { WeeklyTrendDay } from "@/features/nutrition/lib/nutrition-streak";
import { nutrientDisplayName } from "@/features/nutrition/lib/focus-nutrient-engine";

export type ConfidenceLevel = "building" | "steady" | "strong";

export interface NutritionConfidenceInput {
  dailyScore: number;
  weeklyTrend: WeeklyTrendDay[];
  streak: number;
  ageGroupId: AgeGroupId;
  /** Fraction of last 7 days with any check-in (0–1). */
  mealConsistency: number;
}

export interface NutritionConfidenceResult {
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  focusArea: string;
  summary: string;
}

function averageActiveScore(days: WeeklyTrendDay[]): number {
  const active = days.filter((d) => d.checked > 0);
  if (active.length === 0) return 0;
  return active.reduce((s, d) => s + d.score, 0) / active.length;
}

function trendDirection(days: WeeklyTrendDay[]): "up" | "flat" | "down" {
  const active = days.filter((d) => d.checked > 0);
  if (active.length < 2) return "flat";
  const firstHalf = active.slice(0, Math.floor(active.length / 2));
  const secondHalf = active.slice(Math.floor(active.length / 2));
  const avg1 = firstHalf.reduce((s, d) => s + d.score, 0) / firstHalf.length;
  const avg2 = secondHalf.reduce((s, d) => s + d.score, 0) / secondHalf.length;
  if (avg2 - avg1 >= 8) return "up";
  if (avg1 - avg2 >= 8) return "down";
  return "flat";
}

function levelFromScore(score: number): ConfidenceLevel {
  if (score >= 75) return "strong";
  if (score >= 50) return "steady";
  return "building";
}

function pickFocusArea(
  days: WeeklyTrendDay[],
  mealConsistency: number,
  ageGroupId: AgeGroupId,
): string {
  const proteinDays = days.filter((d) => d.checked >= 4).length;
  if (mealConsistency < 0.4) return "variety";
  if (proteinDays < 3) return "protein";
  if (ageGroupId.startsWith("infant") || ageGroupId === "toddler_1_3") return "iron";
  if (averageActiveScore(days) < 60) return "variety";
  return "protein";
}

function buildSummary(
  level: ConfidenceLevel,
  focusArea: string,
  streak: number,
  direction: "up" | "flat" | "down",
): string {
  const focusLabel = nutrientDisplayName(focusArea).toLowerCase();

  if (level === "strong") {
    if (streak >= 3) {
      return `Strong week with ${streak} consistent days. Continue offering ${focusLabel}-rich foods.`;
    }
    return `Strong week. Continue offering ${focusLabel}-rich foods.`;
  }

  if (level === "steady") {
    if (direction === "up") {
      return "Steady progress this week. Small daily check-ins are working.";
    }
    return `Steady rhythm. Focus on ${focusLabel} variety this week.`;
  }

  if (direction === "up") {
    return "Building confidence. Momentum is growing — keep gentle daily check-ins.";
  }
  return "Building confidence. Focus on variety this week — one small win at a time.";
}

export function computeNutritionConfidence(
  input: NutritionConfidenceInput,
): NutritionConfidenceResult {
  const { dailyScore, weeklyTrend, streak, mealConsistency } = input;

  const weekAvg = averageActiveScore(weeklyTrend);
  const trendScore = weekAvg;
  const streakBonus = Math.min(streak * 4, 20);
  const consistencyScore = mealConsistency * 100;

  const raw =
    dailyScore * 0.25 +
    trendScore * 0.35 +
    consistencyScore * 0.25 +
    streakBonus * 0.15;

  const confidenceScore = Math.round(Math.max(0, Math.min(100, raw)));
  const confidenceLevel = levelFromScore(confidenceScore);
  const focusArea = pickFocusArea(weeklyTrend, mealConsistency, input.ageGroupId);
  const summary = buildSummary(
    confidenceLevel,
    focusArea,
    streak,
    trendDirection(weeklyTrend),
  );

  return { confidenceScore, confidenceLevel, focusArea, summary };
}

export function computeMealConsistency(days: WeeklyTrendDay[]): number {
  if (days.length === 0) return 0;
  const logged = days.filter((d) => d.checked > 0 || d.minDayMet).length;
  return logged / days.length;
}
