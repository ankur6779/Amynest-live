import { describe, expect, it } from "vitest";
import {
  getIndiaSeason,
  getSeasonForCountry,
  getSeasonalFoodTips,
  prioritizeMealsBySeason,
  seasonalHighlight,
  seasonalMealScore,
} from "@/features/nutrition/lib/seasonal-foods";
import { getNutritionCountryProfile } from "@workspace/nutrition-localization";

describe("seasonal-foods", () => {
  const india = getNutritionCountryProfile("IN");

  it("maps months to India seasons", () => {
    expect(getIndiaSeason(new Date("2026-05-15"))).toBe("summer");
    expect(getIndiaSeason(new Date("2026-08-01"))).toBe("monsoon");
    expect(getIndiaSeason(new Date("2026-12-10"))).toBe("winter");
  });

  it("scores summer meals higher for cooling foods in India", () => {
    expect(seasonalMealScore("Curd rice with cucumber", "summer", india)).toBeGreaterThan(
      seasonalMealScore("Paratha with ghee", "summer", india),
    );
  });

  it("prioritizes in-season meals from plan pool", () => {
    const meals = ["Roti + sabzi", "Watermelon + curd", "Bread toast"];
    const ordered = prioritizeMealsBySeason(meals, "summer", india);
    expect(ordered[0]).toMatch(/watermelon|curd/i);
  });

  it("returns highlight for seasonal match", () => {
    expect(seasonalHighlight("Palak paratha", "winter", india)).toBeTruthy();
    expect(seasonalHighlight("Plain toast", "winter", india)).toBeNull();
  });

  it("returns season tips", () => {
    expect(getSeasonalFoodTips("monsoon", india).length).toBeGreaterThan(0);
  });

  it("Australia summer in December", () => {
    const au = getNutritionCountryProfile("AU");
    expect(getSeasonForCountry(au, new Date("2026-12-15"))).toBe("summer");
  });
});
