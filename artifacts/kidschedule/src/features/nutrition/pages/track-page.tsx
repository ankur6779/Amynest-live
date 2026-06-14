import { cn } from "@/lib/utils";
import {
  NUTRITION_HUB_ACCENT,
  hubAccentBarClasses,
  hubSectionCardClasses,
} from "@/lib/parent-hub-premium";
import { NutritionScoreSection } from "@/features/nutrition/components/track/nutrition-score-section";
import { WeeklyNutritionStory } from "@/features/nutrition/components/track/weekly-nutrition-story";
import { NutritionTimeline } from "@/features/nutrition/components/track/nutrition-timeline";
import { NutritionAchievementCard } from "@/features/nutrition/components/track/nutrition-achievement-card";
import { MonthlyNutritionReview } from "@/features/nutrition/components/track/monthly-nutrition-review";
import { NutritionPremiumPreview } from "@/features/nutrition/components/premium/nutrition-premium-preview";
import { MealMemorySummaryCard } from "@/features/nutrition/components/track/meal-memory-summary";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";

export function TrackPage() {
  const { ageGroupId } = useNutritionContext();

  return (
    <div className="space-y-3 sm:space-y-4 hub-page-enter">
      <WeeklyNutritionStory />
      <NutritionAchievementCard />
      <MonthlyNutritionReview />
      <NutritionPremiumPreview />
      <MealMemorySummaryCard />
      <NutritionTimeline />
      <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "overflow-hidden")}>
        <div className="flex">
          <div className={hubAccentBarClasses(NUTRITION_HUB_ACCENT)} />
          <div className="min-w-0 flex-1 p-4 sm:p-6">
            <NutritionScoreSection ageGroupId={ageGroupId} />
          </div>
        </div>
      </div>
    </div>
  );
}
