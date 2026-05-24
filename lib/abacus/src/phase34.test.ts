import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateAbacusBadges, ABACUS_BADGES } from "./badges.ts";
import { inferTutorAbacusVisual } from "./tutor-visual.ts";
import { resolveAbacusLanguage } from "./language.ts";

describe("abacus badges", () => {
  it("awards first_correct and daily_goal", () => {
    const ids = evaluateAbacusBadges({
      totalCorrect: 2,
      completedLevels: [],
      bestScores: {},
      streakDays: 1,
      dailyCorrect: 5,
      dailyGoal: 5,
    });
    assert.ok(ids.includes("first_correct"));
    assert.ok(ids.includes("daily_goal"));
  });

  it("returns badges in display order", () => {
    const ids = evaluateAbacusBadges({
      totalCorrect: 10,
      completedLevels: [1],
      bestScores: { "1": { points: 100, accuracyPct: 100 } },
      streakDays: 7,
      dailyCorrect: 5,
      dailyGoal: 5,
    });
    assert.equal(ids.length, ABACUS_BADGES.length);
  });
});

describe("tutor visual", () => {
  it("parses lower bead instructions", () => {
    const v = inferTutorAbacusVisual("Push 3 lower beads up on the ones rod.", 1);
    assert.ok(v);
    assert.equal(v!.state[0].lower, 3);
  });

  it("parses equals answer", () => {
    const v = inferTutorAbacusVisual("Great — the answer is 7!", 1);
    assert.ok(v);
    assert.equal(v!.caption, "Answer: 7");
  });
});

describe("abacus language", () => {
  it("maps hi locale", () => {
    assert.equal(resolveAbacusLanguage("hi-IN"), "hi");
    assert.equal(resolveAbacusLanguage("en-US"), "en");
  });
});
