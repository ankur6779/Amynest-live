import type { NutritionCountryProfile } from "@workspace/nutrition-localization";
import { NUTRITION_COUNTRY_PROFILES } from "@workspace/nutrition-localization";
import { normalizeMealName } from "@/features/nutrition/lib/meal-nutrient-map";

export interface MealPrepTask {
  id: string;
  title: string;
  detail: string;
  dayHint: "Saturday" | "Sunday" | "Weekend";
}

export function generateMealPrepSuggestions(
  weekMeals: string[],
  countryProfile: NutritionCountryProfile = NUTRITION_COUNTRY_PROFILES.GLOBAL,
): MealPrepTask[] {
  const tasks: MealPrepTask[] = [];
  const normalized = weekMeals.map(normalizeMealName).join(" ");

  for (const pattern of countryProfile.mealPrepPatterns) {
    const matches = normalized.match(pattern.pattern) ?? [];
    if (matches.length >= pattern.minMatches) {
      tasks.push({
        id: pattern.id,
        title: pattern.title,
        detail: pattern.detail,
        dayHint: pattern.dayHint,
      });
    }
  }

  if (tasks.length === 0 && weekMeals.length > 0) {
    const staples = countryProfile.groceryStaples.join(", ");
    tasks.push({
      id: "review-plan",
      title: "Review the week's meal plan",
      detail: `Check staples — ${staples} — before shopping.`,
      dayHint: "Weekend",
    });
  }

  return tasks;
}
