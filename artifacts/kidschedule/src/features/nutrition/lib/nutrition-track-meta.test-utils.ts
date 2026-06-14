import { computeNutritionScore } from "@/features/nutrition/lib/nutrition-score";
import {
  dateKeyLocal,
  getStoreHistory,
  loadNutritionScoreStore,
} from "@/features/nutrition/lib/nutrition-score-storage";
import {
  buildWeeklyTrendFromHistory,
  computeCurrentStreak,
  computeMinDayMet,
  historyToStreakRows,
} from "@/features/nutrition/lib/nutrition-streak";

/** Shared local meta computation for track consistency tests. */
export function computeLocalMetaForTest(childId: number) {
  const store = loadNutritionScoreStore(childId);
  const today = dateKeyLocal();
  const live = computeNutritionScore(store.checklist);
  const liveToday = {
    dateKey: today,
    score: live.score,
    checked: live.checked,
    minDayMet: computeMinDayMet(live.checked),
  };
  const history = getStoreHistory(childId);
  const streak = computeCurrentStreak(historyToStreakRows(history, liveToday), today);
  const days = buildWeeklyTrendFromHistory(history, liveToday, today);
  return { streak, days };
}
