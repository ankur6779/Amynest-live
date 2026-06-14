import type { AgeGroupId } from "@/lib/nutrition-data";
import type { WeeklyTrendDay } from "@/features/nutrition/lib/nutrition-streak";
import {
  computeMealConsistency,
  computeNutritionConfidence,
  type ConfidenceLevel,
} from "@/features/nutrition/lib/nutrition-confidence";
import {
  aggregateChecklistHits,
  selectFocusNutrient,
} from "@/features/nutrition/lib/focus-nutrient-engine";
import { mealAcceptanceRate } from "@/features/nutrition/lib/nutrition-memory";
import type { MealMemoryEntry } from "@/features/nutrition/lib/nutrition-memory";
import { computeNutritionScore } from "@/features/nutrition/lib/nutrition-score";
import { computeMinDayMet, computeCurrentStreak, historyToStreakRows } from "@/features/nutrition/lib/nutrition-streak";
import { loadNutritionScoreStore } from "@/features/nutrition/lib/nutrition-score-storage";

export interface HouseholdChildRow {
  childId: number;
  name: string;
  ageGroupId: AgeGroupId;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  focusNutrient: string;
  acceptanceRate: number;
}

export function buildChildNutritionSnapshot(input: {
  childId: number;
  name: string;
  ageGroupId: AgeGroupId;
  todayKey: string;
  memoryEntries: MealMemoryEntry[];
}): HouseholdChildRow {
  const store = loadNutritionScoreStore(input.childId);
  const live = computeNutritionScore(store.checklist);
  const liveToday = {
    dateKey: input.todayKey,
    score: live.score,
    checked: live.checked,
    minDayMet: computeMinDayMet(live.checked),
  };
  const history = store.history;
  const weeklyTrend: WeeklyTrendDay[] = buildWeekFromStore(store, input.todayKey, liveToday);

  const { checklistHits, daysLogged } = aggregateChecklistHits(
    weeklyTrend,
    store.checklist,
    input.todayKey,
  );

  const focus = selectFocusNutrient({
    ageGroupId: input.ageGroupId,
    weeklyTrend,
    checklistHits,
    daysLogged,
  });

  const confidence = computeNutritionConfidence({
    dailyScore: live.score,
    weeklyTrend,
    streak: computeCurrentStreak(historyToStreakRows(history, liveToday), input.todayKey),
    ageGroupId: input.ageGroupId,
    mealConsistency: computeMealConsistency(weeklyTrend),
  });

  return {
    childId: input.childId,
    name: input.name,
    ageGroupId: input.ageGroupId,
    confidenceScore: confidence.confidenceScore,
    confidenceLevel: confidence.confidenceLevel,
    focusNutrient: focus.nutrientName,
    acceptanceRate: mealAcceptanceRate(input.memoryEntries),
  };
}

function buildWeekFromStore(
  store: ReturnType<typeof loadNutritionScoreStore>,
  todayKey: string,
  liveToday: { dateKey: string; score: number; checked: number; minDayMet: boolean },
): WeeklyTrendDay[] {
  const days: WeeklyTrendDay[] = [];
  const end = new Date(todayKey);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const snap =
      dateKey === todayKey
        ? liveToday
        : store.history[dateKey];
    days.push({
      dateKey,
      score: snap?.score ?? 0,
      minDayMet: snap?.minDayMet ?? false,
      checked: snap?.checked ?? 0,
    });
  }

  return days;
}

export function shouldShowHouseholdBoard(childCount: number): boolean {
  return childCount > 1;
}
