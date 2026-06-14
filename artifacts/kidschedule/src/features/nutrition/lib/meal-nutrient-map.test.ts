import { describe, expect, it } from "vitest";
import {
  mapMealToNutrients,
  normalizeMealName,
  nutrientBenefitLabels,
} from "@/features/nutrition/lib/meal-nutrient-map";

describe("meal-nutrient-map", () => {
  it("maps dal khichdi to iron and protein", () => {
    expect(mapMealToNutrients("Mashed moong dal khichdi (rice + moong + ghee)")).toEqual(
      expect.arrayContaining(["iron", "protein"]),
    );
  });

  it("maps ragi porridge to calcium and iron", () => {
    expect(mapMealToNutrients("Ragi porridge with breast milk")).toEqual(
      expect.arrayContaining(["calcium", "iron"]),
    );
  });

  it("returns sensible defaults for unknown meals", () => {
    const nutrients = mapMealToNutrients("Special family dish");
    expect(nutrients.length).toBeGreaterThan(0);
  });

  it("normalizes meal names consistently", () => {
    expect(normalizeMealName("  Ragi  Porridge!!! ")).toBe("ragi porridge");
  });

  it("labels nutrients for display", () => {
    expect(nutrientBenefitLabels(["iron", "protein"])).toEqual(["Iron", "Protein"]);
  });

  it("maps paneer meals to calcium", () => {
    expect(mapMealToNutrients("Roti + palak paneer + dal")).toContain("calcium");
  });
});
