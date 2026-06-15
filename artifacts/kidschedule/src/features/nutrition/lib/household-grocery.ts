import type { GroupedGroceryList } from "@/features/nutrition/lib/grocery-generator";
import { generateGroceryList } from "@/features/nutrition/lib/grocery-generator";
import type { MealMemoryEntry } from "@/features/nutrition/lib/nutrition-memory";
import { getMealPlan, type AgeGroupId } from "@/lib/nutrition-data";
import type { TiffinDay } from "@/features/nutrition/lib/tiffin-planner";
import { planSchoolTiffinWeek } from "@/features/nutrition/lib/tiffin-planner";
import type { NutritionCountryProfile } from "@workspace/nutrition-localization";
import { NUTRITION_COUNTRY_PROFILES } from "@workspace/nutrition-localization";

export interface HouseholdChildPlan {
  childId: number;
  name: string;
  ageGroupId: AgeGroupId;
  foodStyle: string;
  memoryEntries: MealMemoryEntry[];
  countryProfile?: NutritionCountryProfile;
}

export function collectWeekMeals(
  ageGroupId: AgeGroupId,
  foodStyle: string,
  isVeg: boolean,
  countryProfile?: NutritionCountryProfile,
): string[] {
  const plan = getMealPlan(ageGroupId, foodStyle, countryProfile);
  if (!plan) return [];
  const meals: string[] = [];
  for (const day of plan.days) {
    const m = isVeg ? day.veg : day.nonVeg;
    for (const val of Object.values(m)) {
      if (typeof val === "string" && val.trim()) meals.push(val);
    }
  }
  return meals;
}

export function collectWeekLunches(
  ageGroupId: AgeGroupId,
  foodStyle: string,
  isVeg: boolean,
  countryProfile?: NutritionCountryProfile,
): string[] {
  const plan = getMealPlan(ageGroupId, foodStyle, countryProfile);
  if (!plan) return [];
  return plan.days
    .map((d) => (isVeg ? d.veg.lunch : d.nonVeg.lunch))
    .filter((v): v is string => !!v);
}

/** Union of unique meal strings across children — single aggregation pass (C3). */
export function collectHouseholdWeekMeals(
  children: HouseholdChildPlan[],
  isVeg: boolean,
): string[] {
  const seen = new Set<string>();
  const meals: string[] = [];
  for (const child of children) {
    for (const meal of collectWeekMeals(child.ageGroupId, child.foodStyle, isVeg, child.countryProfile)) {
      if (seen.has(meal)) continue;
      seen.add(meal);
      meals.push(meal);
    }
  }
  return meals;
}

export function buildHouseholdGrocery(
  children: HouseholdChildPlan[],
  familySize: number,
  isVeg: boolean,
  countryProfile?: NutritionCountryProfile,
): GroupedGroceryList[] {
  const weekMeals = collectHouseholdWeekMeals(children, isVeg);
  const memoryEntries = children.flatMap((c) => c.memoryEntries);
  const profile = countryProfile ?? children[0]?.countryProfile;
  return generateGroceryList({ weekMeals, familySize, memoryEntries, countryProfile: profile });
}

export function buildHouseholdTiffinPlans(
  children: HouseholdChildPlan[],
  isVeg: boolean,
): Array<{ childId: number; name: string; days: TiffinDay[] }> {
  return children
    .map((c) => ({
      childId: c.childId,
      name: c.name,
      days: planSchoolTiffinWeek({
        ageGroupId: c.ageGroupId,
        foodStyle: c.foodStyle,
        weekLunches: collectWeekLunches(c.ageGroupId, c.foodStyle, isVeg, c.countryProfile),
        countryProfile: c.countryProfile ?? NUTRITION_COUNTRY_PROFILES.GLOBAL,
        memoryEntries: c.memoryEntries,
      }),
    }))
    .filter((p) => p.days.length > 0);
}
