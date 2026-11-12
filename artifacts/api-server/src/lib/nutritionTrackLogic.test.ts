import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildWeeklyTrend,
  computeCurrentStreak,
  computeMinDayMet,
  isStreakQualifyingDay,
  shouldRejectStaleNutritionWrite,
} from "./nutritionTrackLogic.js";

test("computeMinDayMet is true when at least one item checked", () => {
  assert.equal(computeMinDayMet(0), false);
  assert.equal(computeMinDayMet(1), true);
});

test("shouldRejectStaleNutritionWrite rejects when server is newer or tied", () => {
  assert.equal(shouldRejectStaleNutritionWrite(5000, 4000), true);
  assert.equal(shouldRejectStaleNutritionWrite(5000, 5000), true);
  assert.equal(shouldRejectStaleNutritionWrite(4000, 5000), false);
  assert.equal(shouldRejectStaleNutritionWrite(5000, undefined), false);
  assert.equal(shouldRejectStaleNutritionWrite(5000, 0), false);
});

test("isStreakQualifyingDay accepts score >= 50 or min day met", () => {
  assert.equal(isStreakQualifyingDay(50, false), true);
  assert.equal(isStreakQualifyingDay(30, true), true);
  assert.equal(isStreakQualifyingDay(30, false), false);
});

test("computeCurrentStreak counts consecutive qualifying days", () => {
  const rows = [
    { dateKey: "2026-06-14", score: 88, minDayMet: true },
    { dateKey: "2026-06-13", score: 50, minDayMet: true },
    { dateKey: "2026-06-12", score: 25, minDayMet: true },
    { dateKey: "2026-06-11", score: 40, minDayMet: false },
  ];
  assert.equal(computeCurrentStreak(rows, "2026-06-14"), 3);
});

test("computeCurrentStreak grace for in-progress today", () => {
  const rows = [
    { dateKey: "2026-06-13", score: 75, minDayMet: true },
    { dateKey: "2026-06-12", score: 60, minDayMet: true },
  ];
  assert.equal(computeCurrentStreak(rows, "2026-06-14"), 2);
});

test("buildWeeklyTrend returns seven days ending at date", () => {
  const rows = [
    {
      dateKey: "2026-06-14",
      score: 75,
      minDayMet: true,
      checklist: { breakfast: true, protein: true, dairy: true },
    },
  ];
  const days = buildWeeklyTrend(rows, "2026-06-14");
  assert.equal(days.length, 7);
  assert.equal(days[6]?.dateKey, "2026-06-14");
  assert.equal(days[6]?.score, 75);
  assert.equal(days[6]?.checked, 3);
});
