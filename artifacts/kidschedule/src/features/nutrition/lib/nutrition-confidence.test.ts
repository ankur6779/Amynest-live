import { describe, expect, it } from "vitest";
import {
  computeMealConsistency,
  computeNutritionConfidence,
} from "@/features/nutrition/lib/nutrition-confidence";

const sampleTrend = [
  { dateKey: "2026-06-08", score: 40, minDayMet: true, checked: 3 },
  { dateKey: "2026-06-09", score: 50, minDayMet: true, checked: 4 },
  { dateKey: "2026-06-10", score: 55, minDayMet: true, checked: 4 },
  { dateKey: "2026-06-11", score: 60, minDayMet: true, checked: 5 },
  { dateKey: "2026-06-12", score: 70, minDayMet: true, checked: 6 },
  { dateKey: "2026-06-13", score: 75, minDayMet: true, checked: 6 },
  { dateKey: "2026-06-14", score: 80, minDayMet: true, checked: 7 },
];

describe("nutrition-confidence", () => {
  it("computes meal consistency from logged days", () => {
    expect(computeMealConsistency(sampleTrend)).toBe(1);
    expect(
      computeMealConsistency([
        { dateKey: "a", score: 0, minDayMet: false, checked: 0 },
        { dateKey: "b", score: 50, minDayMet: true, checked: 4 },
      ]),
    ).toBe(0.5);
  });

  it("returns strong level for high scores and consistency", () => {
    const strongTrend = sampleTrend.map((d) => ({ ...d, score: 85, checked: 7 }));
    const result = computeNutritionConfidence({
      dailyScore: 90,
      weeklyTrend: strongTrend,
      streak: 7,
      ageGroupId: "preschool_3_6",
      mealConsistency: 1,
    });
    expect(result.confidenceLevel).toBe("strong");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(75);
    expect(result.summary).not.toMatch(/danger|deficiency|diagnos/i);
  });

  it("returns building level for low activity without alarm language", () => {
    const result = computeNutritionConfidence({
      dailyScore: 25,
      weeklyTrend: [{ dateKey: "2026-06-14", score: 25, minDayMet: true, checked: 2 }],
      streak: 0,
      ageGroupId: "toddler_1_3",
      mealConsistency: 0.14,
    });
    expect(result.confidenceLevel).toBe("building");
    expect(result.summary.toLowerCase()).toContain("building");
  });

  it("never uses medical phrasing in summary", () => {
    const result = computeNutritionConfidence({
      dailyScore: 10,
      weeklyTrend: [],
      streak: 0,
      ageGroupId: "infant_6_12",
      mealConsistency: 0,
    });
    expect(result.summary).not.toMatch(/anaemia|disease|deficiency|diagnos|treat/i);
  });
});
