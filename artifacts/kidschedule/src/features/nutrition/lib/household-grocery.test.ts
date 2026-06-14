import { describe, expect, it } from "vitest";
import {
  buildHouseholdGrocery,
  buildHouseholdTiffinPlans,
  collectWeekMeals,
} from "@/features/nutrition/lib/household-grocery";
import { generateGroceryList } from "@/features/nutrition/lib/grocery-generator";

describe("household-grocery", () => {
  const childA = {
    childId: 1,
    name: "Aarav",
    ageGroupId: "school_6_10" as const,
    foodStyle: "south_indian",
    memoryEntries: [],
  };

  const childB = {
    childId: 2,
    name: "Mira",
    ageGroupId: "preschool_3_6" as const,
    foodStyle: "south_indian",
    memoryEntries: [],
  };

  it("collectWeekMeals returns meals from plan", () => {
    const meals = collectWeekMeals("school_6_10", "south_indian", true);
    expect(meals.length).toBeGreaterThan(0);
  });

  it("buildHouseholdGrocery uses single-pass aggregation without per-child inflation", () => {
    const merged = buildHouseholdGrocery([childA, childB], 4, true);
    const totalItems = merged.reduce((n, g) => n + g.items.length, 0);
    expect(totalItems).toBeGreaterThan(0);

    const twinA = { ...childA, childId: 10, name: "TwinA" };
    const twinB = { ...childA, childId: 11, name: "TwinB" };
    const twinC = { ...childA, childId: 12, name: "TwinC" };
    const household3 = buildHouseholdGrocery([twinA, twinB, twinC], 5, true);
    const single = generateGroceryList({
      weekMeals: collectWeekMeals("school_6_10", "south_indian", true),
      familySize: 5,
    });
    const milkH = household3.flatMap((g) => g.items).find((i) => i.name === "Milk");
    const milkS = single.flatMap((g) => g.items).find((i) => i.name === "Milk");
    if (milkH && milkS) {
      expect(milkH.quantity).toBe(milkS.quantity);
    }
  });

  it("buildHouseholdTiffinPlans returns per-child tiffin weeks", () => {
    const plans = buildHouseholdTiffinPlans([childA, childB], true);
    expect(plans).toHaveLength(2);
    expect(plans[0]!.days).toHaveLength(5);
    expect(plans[1]!.days).toHaveLength(5);
  });
});
