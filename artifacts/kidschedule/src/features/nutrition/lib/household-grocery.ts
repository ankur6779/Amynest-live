import type { GroupedGroceryList } from "@/features/nutrition/lib/grocery-generator";
import { generateGroceryList, mergeGroceryLists } from "@/features/nutrition/lib/grocery-generator";
import type { MealMemoryEntry } from "@/features/nutrition/lib/nutrition-memory";
import { getMealPlan, type AgeGroupId } from "@/lib/nutrition-data";
import type { TiffinDay } from "@/features/nutrition/lib/tiffin-planner";
import { planSchoolTiffinWeek } from "@/features/nutrition/lib/tiffin-planner";

export interface HouseholdChildPlan {
  childId: number;
  name: string;
  ageGroupId: AgeGroupId;
  foodStyle: string;
  memoryEntries: MealMemoryEntry[];
}

function collectWeekMeals(ageGroupId: AgeGroupId, foodStyle: string, isVeg = true): string[] {
  const plan = getMealPlan(ageGroupId, foodStyle);
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

function collectWeekLunches(ageGroupId: AgeGroupId, foodStyle: string, isVeg = true): string[] {
  const plan = getMealPlan(ageGroupId, foodStyle);
  if (!plan) return [];
  return plan.days
    .map((d) => (isVeg ? d.veg.lunch : d.nonVeg.lunch))
    .filter((v): v is string => !!v);
}

export function buildHouseholdGrocery(
  children: HouseholdChildPlan[],
  familySize: number,
): GroupedGroceryList[] {
  const lists = children.map((c) =>
    generateGroceryList({
      weekMeals: collectWeekMeals(c.ageGroupId, c.foodStyle),
      familySize: Math.max(2, Math.ceil(familySize / Math.max(1, children.length))),
      memoryEntries: c.memoryEntries,
    }),
  );
  return mergeGroceryLists(lists);
}

export function buildHouseholdTiffinPlans(
  children: HouseholdChildPlan[],
): Array<{ childId: number; name: string; days: TiffinDay[] }> {
  return children
    .map((c) => ({
      childId: c.childId,
      name: c.name,
      days: planSchoolTiffinWeek({
        ageGroupId: c.ageGroupId,
        foodStyle: c.foodStyle,
        weekLunches: collectWeekLunches(c.ageGroupId, c.foodStyle),
        memoryEntries: c.memoryEntries,
      }),
    }))
    .filter((p) => p.days.length > 0);
}

export { collectWeekMeals, collectWeekLunches };
