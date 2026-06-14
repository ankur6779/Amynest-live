import { describe, expect, it } from "vitest";
import {
  isMealDeprioritized,
  mealPreferenceScore,
  pickPreferredMeal,
  pickTonightDinner,
} from "@/features/nutrition/lib/meal-recommendation";

describe("meal-recommendation", () => {
  const entries = [
    {
      dateKey: "2026-06-01",
      mealSlot: "dinner",
      mealName: "Ragi porridge",
      mealKey: "ragi porridge",
      outcome: "skipped" as const,
      updatedAt: "2026-06-01T12:00:00Z",
    },
    {
      dateKey: "2026-06-02",
      mealSlot: "dinner",
      mealName: "Ragi porridge",
      mealKey: "ragi porridge",
      outcome: "skipped" as const,
      updatedAt: "2026-06-02T12:00:00Z",
    },
    {
      dateKey: "2026-06-03",
      mealSlot: "dinner",
      mealName: "Dal Khichdi",
      mealKey: "dal khichdi",
      outcome: "loved" as const,
      updatedAt: "2026-06-03T12:00:00Z",
    },
  ];

  it("deprioritizes repeatedly skipped meals", () => {
    expect(isMealDeprioritized("Ragi porridge", entries)).toBe(true);
    expect(isMealDeprioritized("Dal Khichdi", entries)).toBe(false);
  });

  it("scores loved meals higher", () => {
    expect(mealPreferenceScore("Dal Khichdi", entries)).toBeGreaterThan(
      mealPreferenceScore("Ragi porridge", entries),
    );
  });

  it("picks preferred meal from candidates", () => {
    expect(pickPreferredMeal(["Ragi porridge", "Dal Khichdi"], entries)).toBe("Dal Khichdi");
  });

  it("pickTonightDinner avoids deprioritized when alternatives exist", () => {
    const days = [
      {
        day: "Mon",
        veg: { dinner: "Ragi porridge", breakfast: "x", lunch: "y", snack: "z" },
        nonVeg: { dinner: "Ragi porridge", breakfast: "x", lunch: "y", snack: "z" },
      },
      {
        day: "Tue",
        veg: { dinner: "Dal Khichdi", breakfast: "x", lunch: "y", snack: "z" },
        nonVeg: { dinner: "Dal Khichdi", breakfast: "x", lunch: "y", snack: "z" },
      },
    ];
    const picked = pickTonightDinner(days, 0, true, entries);
    expect(picked.mealName).toBe("Dal Khichdi");
  });
});
