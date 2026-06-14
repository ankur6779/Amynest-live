import { describe, expect, it } from "vitest";
import { buildMonthlyNutritionReview } from "@/features/nutrition/lib/monthly-nutrition-review";

describe("monthly-nutrition-review", () => {
  it("builds review from memory and history", () => {
    const review = buildMonthlyNutritionReview({
      memoryEntries: [
        {
          dateKey: "2026-06-01",
          mealSlot: "dinner",
          mealName: "Dal Khichdi",
          mealKey: "dal khichdi",
          outcome: "loved",
          updatedAt: "2026-06-01T12:00:00Z",
        },
        {
          dateKey: "2026-06-03",
          mealSlot: "dinner",
          mealName: "Dal Khichdi",
          mealKey: "dal khichdi",
          outcome: "some",
          updatedAt: "2026-06-03T12:00:00Z",
        },
      ],
      history: {
        "2026-06-01": { score: 70, checked: 4, total: 7, minDayMet: true },
        "2026-06-02": { score: 80, checked: 5, total: 7, minDayMet: true },
        "2026-06-03": { score: 60, checked: 3, total: 7, minDayMet: true },
      },
      ageGroupId: "school_6_10",
      streak: 2,
      ref: new Date("2026-06-10"),
    });

    expect(review.hasData).toBe(true);
    expect(review.topAcceptedMeal).toMatch(/Dal Khichdi/i);
    expect(review.topAcceptedCount).toBeGreaterThan(0);
    expect(review.mealConsistencyPct).toBeGreaterThan(0);
  });

  it("returns hasData false when empty", () => {
    const review = buildMonthlyNutritionReview({
      memoryEntries: [],
      history: {},
      ageGroupId: "school_6_10",
      streak: 0,
    });
    expect(review.hasData).toBe(false);
  });
});
