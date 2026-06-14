import { useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { computeNutritionScore } from "@/features/nutrition/lib/nutrition-score";
import {
  dateKeyLocal,
  getStoreHistory,
  loadNutritionScoreStore,
  subscribeNutritionScore,
} from "@/features/nutrition/lib/nutrition-score-storage";
import {
  buildWeeklyTrendFromHistory,
  computeCurrentStreak,
  computeMinDayMet,
  historyToStreakRows,
} from "@/features/nutrition/lib/nutrition-streak";
import { mergeWeeklyTrendFromServer } from "@/features/nutrition/lib/nutrition-sync";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import type { WeeklyTrendDay } from "@/features/nutrition/lib/nutrition-streak";

/** Local store is authoritative; server merges in via hydrate/mergeWeeklyTrendFromServer. */
function computeLocalMeta(childId: number) {
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

export function useNutritionTrackMeta() {
  const { childId } = useNutritionContext();
  const authFetch = useAuthFetch();
  const [streak, setStreak] = useState(0);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendDay[]>([]);

  useEffect(() => {
    if (!childId) {
      setStreak(0);
      setWeeklyTrend([]);
      return;
    }

    const refreshLocal = () => {
      const meta = computeLocalMeta(childId);
      setStreak(meta.streak);
      setWeeklyTrend(meta.days);
    };

    refreshLocal();
    return subscribeNutritionScore(refreshLocal);
  }, [childId]);

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;

    void mergeWeeklyTrendFromServer(childId, authFetch).then(() => {
      if (cancelled || !childId) return;
      const meta = computeLocalMeta(childId);
      setStreak(meta.streak);
      setWeeklyTrend(meta.days);
    });

    return () => {
      cancelled = true;
    };
  }, [childId, authFetch]);

  return { streak, weeklyTrend };
}
