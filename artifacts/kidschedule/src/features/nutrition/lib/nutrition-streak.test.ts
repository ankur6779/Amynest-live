import { describe, expect, it } from "vitest";
import {
  buildWeeklyTrendFromHistory,
  computeCurrentStreak,
  computeMinDayMet,
  historyToStreakRows,
  isStreakQualifyingDay,
} from "@/features/nutrition/lib/nutrition-streak";

describe("nutrition-streak", () => {
  it("qualifies streak days with score >= 50 or min day met", () => {
    expect(isStreakQualifyingDay(50, false)).toBe(true);
    expect(isStreakQualifyingDay(10, true)).toBe(true);
    expect(isStreakQualifyingDay(10, false)).toBe(false);
  });

  it("computeMinDayMet requires at least one check", () => {
    expect(computeMinDayMet(0)).toBe(false);
    expect(computeMinDayMet(1)).toBe(true);
  });

  it("computeCurrentStreak from history rows", () => {
    const rows = historyToStreakRows(
      {
        "2026-06-13": { score: 75, checked: 6 },
        "2026-06-12": { score: 25, checked: 2 },
        "2026-06-11": { score: 0, checked: 0 },
      },
      { dateKey: "2026-06-14", score: 100, checked: 8, minDayMet: true },
    );
    expect(computeCurrentStreak(rows, "2026-06-14")).toBe(3);
  });

  it("buildWeeklyTrendFromHistory spans seven days", () => {
    const days = buildWeeklyTrendFromHistory(
      { "2026-06-14": { score: 50, checked: 4 } },
      { dateKey: "2026-06-14", score: 50, checked: 4, minDayMet: true },
      "2026-06-14",
    );
    expect(days).toHaveLength(7);
    expect(days[6]?.score).toBe(50);
  });
});
