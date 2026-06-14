import { AgeInfoCard } from "@/features/nutrition/components/shared/nutrition-hero";
import { ChildContextChip } from "@/features/nutrition/components/today/child-context-chip";
import { TodayScoreSummary } from "@/features/nutrition/components/today/today-score-summary";
import { NutritionInsightCard } from "@/features/nutrition/components/today/nutrition-insight-card";
import { WeeklyNutritionStory } from "@/features/nutrition/components/track/weekly-nutrition-story";
import {
  FocusNutrientCard,
  TonightMealHero,
  FamilyMealShortcut,
} from "@/features/nutrition/components/today/today-cards";
import { HouseholdNutritionBoard } from "@/features/nutrition/components/household/household-nutrition-board";
import { NutritionPremiumPreview } from "@/features/nutrition/components/premium/nutrition-premium-preview";

export function TodayPage() {
  return (
    <div className="space-y-3 sm:space-y-4 hub-page-enter">
      <ChildContextChip />
      <TodayScoreSummary />
      <NutritionPremiumPreview />
      <NutritionInsightCard />
      <WeeklyNutritionStory compact />
      <AgeInfoCard />
      <TonightMealHero />
      <FamilyMealShortcut />
      <FocusNutrientCard />
      <HouseholdNutritionBoard />
    </div>
  );
}
