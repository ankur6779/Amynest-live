import { useMemo } from "react";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { useNutritionDailyScore } from "@/features/nutrition/hooks/use-nutrition-daily-score";
import { useNutritionTrackMeta } from "@/features/nutrition/hooks/use-nutrition-track-meta";
import {
  computeMealConsistency,
  computeNutritionConfidence,
  type NutritionConfidenceResult,
} from "@/features/nutrition/lib/nutrition-confidence";
import {
  aggregateChecklistHits,
  selectFocusNutrient,
  type FocusNutrientResult,
} from "@/features/nutrition/lib/focus-nutrient-engine";
import {
  generateWeeklyNutritionStory,
  type WeeklyNutritionStory,
} from "@/features/nutrition/lib/nutrition-story";
import { dateKeyLocal } from "@/features/nutrition/lib/nutrition-score-storage";

export interface NutritionIntelligence {
  confidence: NutritionConfidenceResult;
  focus: FocusNutrientResult;
  story: WeeklyNutritionStory;
}

export function useNutritionConfidence(): NutritionIntelligence {
  const { ageGroupId } = useNutritionContext();
  const { score, checkList } = useNutritionDailyScore();
  const { streak, weeklyTrend } = useNutritionTrackMeta();
  const todayKey = dateKeyLocal();

  return useMemo(() => {
    const mealConsistency = computeMealConsistency(weeklyTrend);
    const { checklistHits, daysLogged } = aggregateChecklistHits(
      weeklyTrend,
      checkList,
      todayKey,
    );

    const focus = selectFocusNutrient({
      ageGroupId,
      weeklyTrend,
      checklistHits,
      daysLogged,
    });

    const confidence = computeNutritionConfidence({
      dailyScore: score,
      weeklyTrend,
      streak,
      ageGroupId,
      mealConsistency,
    });

    const story = generateWeeklyNutritionStory({
      weeklyTrend,
      streak,
      focusNutrientId: focus.nutrientId,
      checklistHits,
      daysLogged,
    });

    return { confidence, focus, story };
  }, [ageGroupId, score, checkList, streak, weeklyTrend, todayKey]);
}
