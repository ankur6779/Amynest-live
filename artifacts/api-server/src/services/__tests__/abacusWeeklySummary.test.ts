import { test } from "node:test";
import assert from "node:assert/strict";
import { computeChildSummary } from "../abacusWeeklySummary";

const now = Date.parse("2026-05-03T12:00:00.000Z");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const windowStart = now - WEEK_MS;
const inWindow = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
const beforeWindow = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

test("eligible child with no progress row → starter recommendation, hasProgress=false", () => {
  const s = computeChildSummary({
    childId: 1,
    childName: "Ada",
    childAge: 6,
    row: {
      currentLevel: 1,
      completedLevels: [],
      bestScores: {},
      totalCorrect: 0,
      totalAttempts: 0,
      totalPoints: 0,
      updatedAt: null,
    },
    windowStart,
  });
  assert.equal(s.hasProgress, false);
  assert.equal(s.currentLevel, 1);
  assert.equal(s.levelsCompletedTotal, 0);
  assert.equal(s.levelsCompletedThisWeek, 0);
  assert.equal(s.pointsThisWeek, 0);
  assert.equal(s.accuracyIsWeekly, false);
  assert.equal(s.accuracyPct, 0);
  assert.match(s.nextRecommendedAction, /Level 1/);
});

test("child with only old best-scores → falls back to lifetime accuracy, no weekly points", () => {
  const s = computeChildSummary({
    childId: 2,
    childName: "Bo",
    childAge: 8,
    row: {
      currentLevel: 2,
      completedLevels: [1],
      bestScores: {
        "1": { points: 50, accuracyPct: 90, completedAt: beforeWindow },
      },
      totalCorrect: 18,
      totalAttempts: 20,
      totalPoints: 50,
      updatedAt: beforeWindow,
    },
    windowStart,
  });
  assert.equal(s.hasProgress, true);
  assert.equal(s.pointsThisWeek, 0);
  assert.equal(s.levelsCompletedThisWeek, 0);
  assert.equal(s.accuracyIsWeekly, false);
  assert.equal(s.accuracyPct, 90); // 18/20 lifetime
  assert.equal(s.levelsCompletedTotal, 1);
});

test("child with weekly best-scores → weekly accuracy + points aggregated", () => {
  const s = computeChildSummary({
    childId: 3,
    childName: "Cy",
    childAge: 7,
    row: {
      currentLevel: 3,
      completedLevels: [1, 2],
      bestScores: {
        "1": { points: 40, accuracyPct: 80, completedAt: beforeWindow },
        "2": { points: 60, accuracyPct: 95, completedAt: inWindow },
        "3": { points: 30, accuracyPct: 75, completedAt: inWindow },
      },
      totalCorrect: 50,
      totalAttempts: 60,
      totalPoints: 130,
      updatedAt: inWindow,
    },
    windowStart,
  });
  assert.equal(s.accuracyIsWeekly, true);
  assert.equal(s.levelsCompletedThisWeek, 2);
  assert.equal(s.pointsThisWeek, 90); // 60 + 30
  assert.equal(s.accuracyPct, 85); // (95+75)/2
  assert.equal(s.levelsCompletedTotal, 2);
});

test("child who passed all 5 levels → mental-maths recommendation", () => {
  const s = computeChildSummary({
    childId: 4,
    childName: "Di",
    childAge: 10,
    row: {
      currentLevel: 5,
      completedLevels: [1, 2, 3, 4, 5],
      bestScores: {
        "5": { points: 100, accuracyPct: 92, completedAt: inWindow },
      },
      totalCorrect: 200,
      totalAttempts: 220,
      totalPoints: 500,
      updatedAt: inWindow,
    },
    windowStart,
  });
  assert.match(s.nextRecommendedAction, /mental/i);
  assert.equal(s.levelsCompletedTotal, 5);
});

test("currentLevel out of range is clamped into [1, 5]", () => {
  const high = computeChildSummary({
    childId: 5,
    childName: "Eva",
    childAge: 9,
    row: {
      currentLevel: 99,
      completedLevels: [],
      bestScores: {},
      totalCorrect: 0,
      totalAttempts: 0,
      totalPoints: 0,
      updatedAt: null,
    },
    windowStart,
  });
  assert.equal(high.currentLevel, 5);
  const low = computeChildSummary({
    childId: 6,
    childName: "Fox",
    childAge: 5,
    row: {
      currentLevel: 0,
      completedLevels: [],
      bestScores: {},
      totalCorrect: 0,
      totalAttempts: 0,
      totalPoints: 0,
      updatedAt: null,
    },
    windowStart,
  });
  assert.equal(low.currentLevel, 1);
});
