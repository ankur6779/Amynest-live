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
import { dateKeyLocal, loadNutritionScoreStore } from "@/features/nutrition/lib/nutrition-score-storage";

export interface NutritionIntelligence {
  confidence: NutritionConfidenceResult;
  focus: FocusNutrientResult;
  story: WeeklyNutritionStory;
}

export function useNutritionConfidence(): NutritionIntelligence {
  const { ageGroupId, childId } = useNutritionContext();
  const { score, checkList } = useNutritionDailyScore();
  const { streak, weeklyTrend } = useNutritionTrackMeta();
  const todayKey = dateKeyLocal();

  return useMemo(() => {
    const dayChecklists = childId ? loadNutritionScoreStore(childId).dayChecklists : undefined;
    const mealConsistency = computeMealConsistency(weeklyTrend);
    const { checklistHits, daysLogged } = aggregateChecklistHits(
      weeklyTrend,
      checkList,
      todayKey,
      dayChecklists,
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
  }, [ageGroupId, childId, score, checkList, streak, weeklyTrend, todayKey]);
}
