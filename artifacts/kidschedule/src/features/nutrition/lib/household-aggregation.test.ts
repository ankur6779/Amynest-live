import { describe, expect, it } from "vitest";
import {
  buildChildNutritionSnapshot,
  shouldShowHouseholdBoard,
} from "@/features/nutrition/lib/household-aggregation";

describe("household-aggregation", () => {
  it("shows board only for multiple children", () => {
    expect(shouldShowHouseholdBoard(1)).toBe(false);
    expect(shouldShowHouseholdBoard(2)).toBe(true);
  });

  it("builds snapshot with NCI fields", () => {
    const row = buildChildNutritionSnapshot({
      childId: 99,
      name: "Maya",
      ageGroupId: "preschool_3_6",
      todayKey: "2026-06-14",
      memoryEntries: [],
    });
    expect(row.name).toBe("Maya");
    expect(row.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(row.focusNutrient).toBeTruthy();
  });
});
