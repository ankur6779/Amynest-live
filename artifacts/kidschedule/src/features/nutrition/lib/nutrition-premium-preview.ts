import type { AgeGroupId } from "@/lib/nutrition-data";
import { getMealPlan } from "@/lib/nutrition-data";
import { generateGroceryList } from "@/features/nutrition/lib/grocery-generator";
import { collectWeekMeals } from "@/features/nutrition/lib/household-grocery";
import type { HouseholdChildRow } from "@/features/nutrition/lib/household-aggregation";
import type { MealMemoryEntry } from "@/features/nutrition/lib/nutrition-memory";
import { pickTonightDinner } from "@/features/nutrition/lib/meal-recommendation";
import { getMondayBasedDayIndex } from "@/features/nutrition/lib/age-band-map";

export interface NutritionPremiumPreviewData {
  householdRows: HouseholdChildRow[];
  groceryHighlights: string[];
  shareMealPreview: string | null;
  hasData: boolean;
}

export function buildNutritionPremiumPreview(input: {
  householdRows: HouseholdChildRow[];
  ageGroupId: AgeGroupId;
  foodStyle: string;
  memoryEntries: MealMemoryEntry[];
  familySize: number;
}): NutritionPremiumPreviewData {
  const { householdRows, ageGroupId, foodStyle, memoryEntries, familySize } = input;

  const weekMeals = collectWeekMeals(ageGroupId, foodStyle);
  const groceryGroups = generateGroceryList({
    weekMeals,
    familySize,
    memoryEntries,
  });
  const groceryHighlights = groceryGroups
    .flatMap((g) => g.items)
    .slice(0, 4)
    .map((i) => i.display);

  const plan = getMealPlan(ageGroupId, foodStyle);
  let shareMealPreview: string | null = null;
  if (plan) {
    const dayIdx = getMondayBasedDayIndex();
    const picked = pickTonightDinner(plan.days, dayIdx, true, memoryEntries);
    shareMealPreview = picked.mealName;
  }

  const hasData =
    householdRows.length > 0 ||
    groceryHighlights.length > 0 ||
    !!shareMealPreview;

  return {
    householdRows,
    groceryHighlights,
    shareMealPreview,
    hasData,
  };
}
