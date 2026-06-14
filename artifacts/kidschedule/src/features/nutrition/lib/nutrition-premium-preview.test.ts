import { describe, expect, it } from "vitest";
import { buildNutritionPremiumPreview } from "@/features/nutrition/lib/nutrition-premium-preview";

describe("nutrition-premium-preview", () => {
  it("uses real household and grocery data when available", () => {
    const preview = buildNutritionPremiumPreview({
      householdRows: [
        {
          childId: 1,
          name: "Aarav",
          ageGroupId: "school_6_10",
          confidenceScore: 72,
          confidenceLevel: "steady",
          focusNutrient: "Iron",
          acceptanceRate: 80,
        },
      ],
      ageGroupId: "school_6_10",
      foodStyle: "south_indian",
      memoryEntries: [],
      familySize: 4,
    });

    expect(preview.hasData).toBe(true);
    expect(preview.householdRows[0]?.name).toBe("Aarav");
    expect(preview.groceryHighlights.length).toBeGreaterThan(0);
    expect(preview.shareMealPreview).toBeTruthy();
  });

  it("hasData false without plan data", () => {
    const preview = buildNutritionPremiumPreview({
      householdRows: [],
      ageGroupId: "infant_0_6m",
      foodStyle: "indian",
      memoryEntries: [],
      familySize: 2,
    });
    expect(preview.hasData).toBe(false);
  });
});
