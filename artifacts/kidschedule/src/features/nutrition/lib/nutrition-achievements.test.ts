import { describe, expect, it, beforeEach } from "vitest";
import {
  countLovedLunchesThisWeek,
  evaluateAchievements,
  hasNourishingWeek,
  nourishingWeekProgress,
  pickNextMilestone,
} from "@/features/nutrition/lib/nutrition-achievements";

describe("nutrition-achievements", () => {
  const history = {
    "2026-06-01": { score: 60, checked: 3, total: 7, minDayMet: true },
    "2026-06-02": { score: 55, checked: 2, total: 7, minDayMet: true },
    "2026-06-03": { score: 70, checked: 4, total: 7, minDayMet: true },
    "2026-06-04": { score: 50, checked: 1, total: 7, minDayMet: true },
    "2026-06-05": { score: 65, checked: 3, total: 7, minDayMet: true },
    "2026-06-06": { score: 40, checked: 0, total: 7, minDayMet: false },
    "2026-06-07": { score: 30, checked: 0, total: 7, minDayMet: false },
  };

  it("detects nourishing week with 5 qualifying days", () => {
    expect(hasNourishingWeek(history)).toBe(true);
  });

  it("tracks progress toward nourishing week", () => {
    const prog = nourishingWeekProgress(history, "2026-06-05");
    expect(prog.progress).toBeGreaterThan(0);
    expect(prog.label).toContain("/5");
  });

  it("unlocks seven day consistency at streak 7", () => {
    const states = evaluateAchievements(
      {
        streak: 7,
        history,
        memoryEntries: [],
        childrenCount: 1,
        householdMemoryEntries: 0,
        hasShoppingActivity: false,
        ageGroupId: "school_6_10",
        todayKey: "2026-06-07",
      },
      new Set(),
    );
    const streak = states.find((s) => s.id === "seven_day_consistency");
    expect(streak?.unlocked).toBe(true);
  });

  it("marks newly unlocked achievements", () => {
    const states = evaluateAchievements(
      {
        streak: 7,
        history,
        memoryEntries: [],
        childrenCount: 1,
        householdMemoryEntries: 0,
        hasShoppingActivity: true,
        ageGroupId: "school_6_10",
        todayKey: "2026-06-07",
      },
      new Set(),
    );
    expect(states.some((s) => s.newlyUnlocked)).toBe(true);
  });

  it("pickNextMilestone returns highest-progress locked item", () => {
    const states = evaluateAchievements(
      {
        streak: 3,
        history: {},
        memoryEntries: [],
        childrenCount: 2,
        householdMemoryEntries: 2,
        hasShoppingActivity: false,
        ageGroupId: "preschool_3_6",
        todayKey: "2026-06-07",
      },
      new Set(["seven_day_consistency"]),
    );
    const next = pickNextMilestone(states);
    expect(next).not.toBeNull();
    expect(next!.unlocked).toBe(false);
  });

  it("counts loved lunches in rolling week", () => {
    const entries = [
      {
        dateKey: "2026-06-05",
        mealSlot: "lunch",
        mealName: "Idli",
        mealKey: "idli",
        outcome: "loved" as const,
        updatedAt: "2026-06-05T12:00:00Z",
      },
      {
        dateKey: "2026-06-06",
        mealSlot: "lunch",
        mealName: "Rice",
        mealKey: "rice",
        outcome: "loved" as const,
        updatedAt: "2026-06-06T12:00:00Z",
      },
    ];
    expect(countLovedLunchesThisWeek(entries, "2026-06-07")).toBe(2);
  });
});
