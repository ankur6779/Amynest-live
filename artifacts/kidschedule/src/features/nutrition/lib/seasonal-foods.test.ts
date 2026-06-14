import { describe, expect, it } from "vitest";
import {
  getIndiaSeason,
  getSeasonalFoodTips,
  prioritizeMealsBySeason,
  seasonalHighlight,
  seasonalMealScore,
} from "@/features/nutrition/lib/seasonal-foods";

describe("seasonal-foods", () => {
  it("maps months to India seasons", () => {
    expect(getIndiaSeason(new Date("2026-05-15"))).toBe("summer");
    expect(getIndiaSeason(new Date("2026-08-01"))).toBe("monsoon");
    expect(getIndiaSeason(new Date("2026-12-10"))).toBe("winter");
  });

  it("scores summer meals higher for cooling foods", () => {
    expect(seasonalMealScore("Curd rice with cucumber", "summer")).toBeGreaterThan(
      seasonalMealScore("Paratha with ghee", "summer"),
    );
  });

  it("prioritizes in-season meals from plan pool", () => {
    const meals = ["Roti + sabzi", "Watermelon + curd", "Bread toast"];
    const ordered = prioritizeMealsBySeason(meals, "summer");
    expect(ordered[0]).toMatch(/watermelon|curd/i);
  });

  it("returns highlight for seasonal match", () => {
    expect(seasonalHighlight("Palak paratha", "winter")).toBeTruthy();
    expect(seasonalHighlight("Plain toast", "winter")).toBeNull();
  });

  it("returns season tips", () => {
    expect(getSeasonalFoodTips("monsoon").length).toBeGreaterThan(0);
  });
});
