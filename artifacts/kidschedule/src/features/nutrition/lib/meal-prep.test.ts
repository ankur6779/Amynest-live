import { describe, expect, it } from "vitest";
import { generateMealPrepSuggestions } from "@/features/nutrition/lib/meal-prep";

describe("meal-prep", () => {
  it("suggests soaking dal when dal appears often", () => {
    const tasks = generateMealPrepSuggestions([
      "Palak dal + rice",
      "Moong dal khichdi",
      "Toor dal with roti",
    ]);
    expect(tasks.some((t) => t.id === "soak-dal")).toBe(true);
  });

  it("suggests vegetable prep for veg-heavy weeks", () => {
    const tasks = generateMealPrepSuggestions([
      "Carrot beans sabzi",
      "Palak vegetable curry",
      "Mixed vegetable khichdi",
      "Gobi sabzi",
    ]);
    expect(tasks.some((t) => t.id === "prep-veg")).toBe(true);
  });

  it("suggests idli batter prep", () => {
    const tasks = generateMealPrepSuggestions(["Idli + chutney", "Dosa for breakfast"]);
    expect(tasks.some((t) => t.id === "prep-batter")).toBe(true);
  });

  it("falls back to review plan when no prep rules match", () => {
    const tasks = generateMealPrepSuggestions(["Bread and jam"]);
    expect(tasks.some((t) => t.id === "review-plan")).toBe(true);
  });
});
