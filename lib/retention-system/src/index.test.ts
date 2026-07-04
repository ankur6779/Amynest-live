import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  completeDailyGoal,
  canUseStreakShield,
  recordDailyCheckin,
  shieldAvailable,
  todayIso,
  type RetentionState,
} from "./index.js";

function baseState(overrides: Partial<RetentionState> = {}): RetentionState {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    lastCheckinDate: null,
    shieldUsedMonth: null,
    totalStars: 0,
    totalCoins: 0,
    parentXp: 0,
    dailyGoals: { routine: false, story: false, activity: false, speech: false },
    goalsDate: null,
    achievements: [],
    inactiveDays: 0,
    winbackLevel: 0,
    ...overrides,
  };
}

describe("recordDailyCheckin", () => {
  it("starts streak on first check-in", () => {
    const r = recordDailyCheckin(baseState(), undefined, new Date("2026-07-04T08:00:00"));
    assert.equal(r.streakStarted, true);
    assert.equal(r.next.currentStreak, 1);
    assert.equal(r.rewards.stars, 5);
  });

  it("extends streak on consecutive day", () => {
    const s = baseState({ currentStreak: 2, lastActiveDate: "2026-07-03", longestStreak: 2 });
    const r = recordDailyCheckin(s, undefined, new Date("2026-07-04T08:00:00"));
    assert.equal(r.streakExtended, true);
    assert.equal(r.next.currentStreak, 3);
  });

  it("uses shield when missing one day", () => {
    const s = baseState({ currentStreak: 5, lastActiveDate: "2026-07-02", longestStreak: 5 });
    const r = recordDailyCheckin(s, { useShield: true }, new Date("2026-07-04T08:00:00"));
    assert.equal(r.shieldUsed, true);
    assert.equal(r.next.currentStreak, 6);
  });

  it("resets streak after two missed days without shield", () => {
    const s = baseState({ currentStreak: 5, lastActiveDate: "2026-07-01" });
    const r = recordDailyCheckin(s, undefined, new Date("2026-07-04T08:00:00"));
    assert.equal(r.streakLost, true);
    assert.equal(r.next.currentStreak, 1);
  });

  it("is idempotent same day", () => {
    const s = baseState({ lastCheckinDate: todayIso(new Date("2026-07-04")) });
    const r = recordDailyCheckin(s, undefined, new Date("2026-07-04T12:00:00"));
    assert.equal(r.alreadyCheckedIn, true);
    assert.equal(r.rewards.stars, 0);
  });
});

describe("shieldAvailable", () => {
  it("allows one shield per month", () => {
    assert.equal(shieldAvailable(null, new Date("2026-07-04")), true);
    assert.equal(shieldAvailable("2026-07", new Date("2026-07-10")), false);
    assert.equal(shieldAvailable("2026-07", new Date("2026-08-01")), true);
  });
});

describe("canUseStreakShield", () => {
  it("true when one day missed and shield available", () => {
    const s = baseState({ currentStreak: 4, lastActiveDate: "2026-07-02" });
    assert.equal(canUseStreakShield(s, new Date("2026-07-04")), true);
  });

  it("false when already checked in today", () => {
    const s = baseState({
      currentStreak: 4,
      lastActiveDate: "2026-07-02",
      lastCheckinDate: todayIso(new Date("2026-07-04")),
    });
    assert.equal(canUseStreakShield(s, new Date("2026-07-04")), false);
  });
});

describe("completeDailyGoal", () => {
  it("awards goal rewards once", () => {
    const r = completeDailyGoal(baseState(), "routine", new Date("2026-07-04"));
    assert.equal(r.next.dailyGoals.routine, true);
    assert.ok(r.rewards.coins > 0);
  });
});
