import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getUnlocks,
  computeMasteryScore,
  buildLearningProfile,
  recordActivityCompletion,
  defaultSectionProgress,
  isRevisionDay,
} from "./index.js";

describe("getUnlocks — free journey backward compat", () => {
  it("caps numbers at 5 on journey day 1", () => {
    const u = getUnlocks({
      age: 5,
      journeyDay: 1,
      masteryScore: 0,
      streakDays: 0,
      completedActivities: [],
      sectionProgress: defaultSectionProgress(),
      isPremium: false,
    });
    assert.equal(u.numbersMax, 5);
    assert.equal(u.numbersStage, "1-5");
  });

  it("extends numbers for premium mastery", () => {
    const sp = defaultSectionProgress();
    sp.math = { level: 6, masteryPct: 70, activitiesCompleted: 20, lastActivityId: "n1" };
    const u = getUnlocks({
      age: 7,
      journeyDay: 5,
      masteryScore: 65,
      streakDays: 10,
      completedActivities: ["a", "b"],
      sectionProgress: sp,
      isPremium: true,
      childId: 42,
      dateIso: "2026-05-28",
    });
    assert.ok(u.numbersMax >= 20);
    assert.ok(u.todaysUnlocks.length >= 3);
    assert.ok(u.nextSessionUnlocks.length >= 2);
  });
});

describe("mastery", () => {
  it("revision day when multiple weak sections", () => {
    const sp = defaultSectionProgress();
    sp.math = { level: 2, masteryPct: 30, activitiesCompleted: 5, lastActivityId: null };
    sp.phonics = { level: 2, masteryPct: 35, activitiesCompleted: 4, lastActivityId: null };
    assert.equal(isRevisionDay(sp, 50), true);
  });

  it("recordActivityCompletion bumps XP and mastery", () => {
    const profile = buildLearningProfile(1, { journeyDay: 2 }, 6);
    const next = recordActivityCompletion(profile, "math_q1", "math", true);
    assert.ok((next.totalXP ?? 0) > profile.totalXP);
    assert.ok((next.masteryScore ?? 0) >= profile.masteryScore);
  });
});

describe("computeMasteryScore", () => {
  it("returns 0 for empty profile", () => {
    assert.equal(
      computeMasteryScore(defaultSectionProgress(), [], 0),
      0,
    );
  });
});
