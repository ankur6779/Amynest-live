import { useMemo } from "react";
import { getMealPlan } from "@/lib/nutrition-data";
import type { AgeGroupId } from "@/lib/nutrition-data";
import type { NutritionCountryProfile } from "@workspace/nutrition-localization";
import { getMondayBasedDayIndex } from "@/features/nutrition/lib/age-band-map";
import { pickTonightDinner } from "@/features/nutrition/lib/meal-recommendation";
import { loadMealMemoryEntries } from "@/features/nutrition/lib/nutrition-memory-sync";

export function useTonightMeal(
  ageGroupId: AgeGroupId,
  foodStyle: string,
  childId?: number | null,
  isVeg = true,
  countryProfile?: NutritionCountryProfile | null,
) {
  return useMemo(() => {
    const plan = getMealPlan(ageGroupId, foodStyle, countryProfile);
    if (!plan) {
      return { mealName: null as string | null, lunchName: null as string | null, hasPlan: false };
    }
    const dayIdx = getMondayBasedDayIndex();
    const entries = childId ? loadMealMemoryEntries(childId) : [];
    const picked = pickTonightDinner(plan.days, dayIdx, isVeg, entries);
    const day = plan.days[picked.dayIndex] ?? plan.days[0];
    const meal = isVeg ? day!.veg : day!.nonVeg;

    return {
      mealName: picked.mealName ?? meal.dinner ?? null,
      lunchName: meal.lunch ?? null,
      hasPlan: true,
      dayLabel: picked.dayLabel ?? day!.day,
    };
  }, [ageGroupId, foodStyle, childId, isVeg, countryProfile]);
}
