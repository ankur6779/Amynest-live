import { describe, expect, it } from "vitest";
import { getNutritionCountryProfile } from "@workspace/nutrition-localization";
import { generateMealPrepSuggestions } from "@/features/nutrition/lib/meal-prep";

describe("meal-prep", () => {
  const india = getNutritionCountryProfile("IN");
  const us = getNutritionCountryProfile("US");

  it("suggests soaking dal for Indian weekly meals", () => {
    const tasks = generateMealPrepSuggestions([
      "Dal rice",
      "Moong dal khichdi",
      "Toor dal + roti",
    ], india);
    expect(tasks.some((t) => t.id === "soak-dal")).toBe(true);
  });

  it("suggests rajma soak when pulses appear", () => {
    const tasks = generateMealPrepSuggestions([
      "Rajma rice for lunch",
      "Chole with bhature",
    ], india);
    expect(tasks.some((t) => t.id === "soak-rajma")).toBe(true);
  });

  it("suggests batter prep for idli/dosa weeks in India", () => {
    const tasks = generateMealPrepSuggestions(["Idli + chutney", "Dosa for breakfast"], india);
    expect(tasks.some((t) => t.id === "prep-batter")).toBe(true);
  });

  it("US prep suggests lunchbox components not dal soak", () => {
    const tasks = generateMealPrepSuggestions([
      "Turkey sandwich",
      "Cheese wrap for school lunch",
      "PB&J sandwich",
    ], us);
    expect(tasks.some((t) => t.id === "prep-lunchboxes")).toBe(true);
    expect(tasks.some((t) => t.id === "soak-dal")).toBe(false);
  });

  it("falls back to country staples review task", () => {
    const tasks = generateMealPrepSuggestions(["Bread and jam"], us);
    expect(tasks.some((t) => t.id === "review-plan")).toBe(true);
    expect(tasks[0]?.detail).toMatch(/Milk|Bread|Eggs/i);
  });
});
