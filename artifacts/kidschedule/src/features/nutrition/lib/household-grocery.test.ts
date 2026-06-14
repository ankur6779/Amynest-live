import { describe, expect, it } from "vitest";
import {
  buildHouseholdGrocery,
  buildHouseholdTiffinPlans,
  collectWeekMeals,
} from "@/features/nutrition/lib/household-grocery";

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
    const meals = collectWeekMeals("school_6_10", "south_indian");
    expect(meals.length).toBeGreaterThan(0);
  });

  it("buildHouseholdGrocery merges lists from multiple children", () => {
    const merged = buildHouseholdGrocery([childA, childB], 4);
    const totalItems = merged.reduce((n, g) => n + g.items.length, 0);
    expect(totalItems).toBeGreaterThan(0);
    const single = buildHouseholdGrocery([childA], 4);
    const singleCount = single.reduce((n, g) => n + g.items.length, 0);
    expect(totalItems).toBeGreaterThanOrEqual(singleCount);
  });

  it("buildHouseholdTiffinPlans returns per-child tiffin weeks", () => {
    const plans = buildHouseholdTiffinPlans([childA, childB]);
    expect(plans).toHaveLength(2);
    expect(plans[0]!.days).toHaveLength(5);
    expect(plans[1]!.days).toHaveLength(5);
  });
});
