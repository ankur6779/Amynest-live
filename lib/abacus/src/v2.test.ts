import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateChallenge,
  recommendedLevelForAge,
  resolveAgeLevelAccess,
  minAgeForLevel,
  verifyChallengeAnswers,
  inferTutorAbacusVisual,
} from "./index.ts";

describe("abacus V2 age adaptive", () => {
  it("recommends level 1 for toddlers", () => {
    assert.equal(recommendedLevelForAge(2), 1);
    assert.equal(recommendedLevelForAge(3), 1);
  });

  it("scales recommendations with age", () => {
    assert.equal(recommendedLevelForAge(5), 2);
    assert.equal(recommendedLevelForAge(8), 5);
    assert.equal(recommendedLevelForAge(10), 7);
  });

  it("soft-locks above recommended unless overridden", () => {
    const locked = resolveAgeLevelAccess({
      level: 5,
      ageYears: 4,
      minAgeForLevel: minAgeForLevel(5),
      progressionUnlocked: true,
      parentOverride: false,
    });
    assert.equal(locked.softLocked, true);
    assert.match(locked.message, /age 8/i);

    const open = resolveAgeLevelAccess({
      level: 5,
      ageYears: 4,
      minAgeForLevel: minAgeForLevel(5),
      progressionUnlocked: true,
      parentOverride: true,
    });
    assert.equal(open.softLocked, false);
  });
});

describe("abacus V2 challenge verify", () => {
  it("re-scores a perfect session from seed", () => {
    const seed = 42;
    const level = 1 as const;
    const problems = generateChallenge(level, seed);
    const verified = verifyChallengeAnswers({
      level,
      seed,
      answers: problems.map((p) => p.answer),
      elapsedMs: problems.map(() => 1000),
    });
    assert.equal(verified.ok, true);
    assert.equal(verified.passed, true);
    assert.equal(verified.accuracyPct, 100);
    assert.ok(verified.totalPoints > 0);
  });

  it("rejects answer count mismatch", () => {
    const verified = verifyChallengeAnswers({
      level: 1,
      seed: 1,
      answers: [1],
      elapsedMs: [100],
    });
    assert.equal(verified.ok, false);
    assert.equal(verified.reason, "answer_count_mismatch");
  });
});

describe("abacus V2 tutor visual hindi", () => {
  it("infers beads from hindi-style instructions", () => {
    const visual = inferTutorAbacusVisual("3 neeche wali beads upar dhakelo", 1);
    assert.ok(visual);
    assert.equal(visual?.state[0]?.lower, 3);
  });
});
