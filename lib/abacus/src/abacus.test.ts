// Unit tests for @workspace/abacus.
//
// Run from the repo root with:
//   node --test --experimental-strip-types lib/abacus/src/abacus.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  abacusFromValue,
  abacusValue,
  buildAbacusTutorPrompt,
  buildLessonScript,
  clearAbacus,
  digitToRod,
  emptyAbacus,
  generateChallenge,
  generateProblem,
  getLevel,
  highestUnlockedLevel,
  isAbacusEligible,
  isLevelUnlocked,
  LEVELS,
  POINTS_CORRECT,
  POINTS_FAST_BONUS,
  rng,
  rodValue,
  scoreAnswer,
  setLowerCount,
  summarizeSession,
  toggleUpper,
  type LevelId,
} from "./index.ts";

describe("rod & abacus value", () => {
  it("rodValue: empty rod is 0", () => {
    assert.equal(rodValue({ upper: 0, lower: 0 }), 0);
  });

  it("rodValue: upper bead is worth 5", () => {
    assert.equal(rodValue({ upper: 1, lower: 0 }), 5);
  });

  it("rodValue: 5 + 4 lower = 9 max", () => {
    assert.equal(rodValue({ upper: 1, lower: 4 }), 9);
  });

  it("digitToRod round-trips every digit", () => {
    for (let d = 0; d <= 9; d++) {
      assert.equal(rodValue(digitToRod(d)), d);
    }
  });

  it("digitToRod throws on out-of-range", () => {
    assert.throws(() => digitToRod(10));
    assert.throws(() => digitToRod(-1));
  });

  it("abacusValue: 3 rods = 537", () => {
    const state = abacusFromValue(537, 3);
    assert.equal(abacusValue(state), 537);
  });

  it("abacusValue: 5 rods = 9999", () => {
    const state = abacusFromValue(9999, 5);
    assert.equal(abacusValue(state), 9999);
  });

  it("abacusFromValue throws when value > rod capacity", () => {
    assert.throws(() => abacusFromValue(1000, 2));
  });

  it("emptyAbacus / clearAbacus produce zero", () => {
    assert.equal(abacusValue(emptyAbacus(3)), 0);
    assert.equal(abacusValue(clearAbacus(abacusFromValue(421, 3))), 0);
  });
});

describe("bead toggle helpers (immutable)", () => {
  it("toggleUpper flips the heaven bead and does not mutate input", () => {
    const before = emptyAbacus(2);
    const after = toggleUpper(before, 0);
    assert.equal(before[0].upper, 0);
    assert.equal(after[0].upper, 1);
    assert.equal(rodValue(after[0]), 5);
  });

  it("setLowerCount clamps to 0..4 and sets the count", () => {
    const s0 = emptyAbacus(1);
    assert.equal(setLowerCount(s0, 0, 7)[0].lower, 4);
    assert.equal(setLowerCount(s0, 0, -3)[0].lower, 0);
    assert.equal(setLowerCount(s0, 0, 3)[0].lower, 3);
  });

  it("toggle / setLower combine: 5 + 4 = 9 on rod 0", () => {
    let s = emptyAbacus(1);
    s = toggleUpper(s, 0);
    s = setLowerCount(s, 0, 4);
    assert.equal(abacusValue(s), 9);
  });
});

describe("level definitions", () => {
  it("exposes 5 levels in canonical order", () => {
    assert.equal(LEVELS.length, 5);
    assert.deepEqual(LEVELS.map((l) => l.id), [1, 2, 3, 4, 5]);
  });

  it("getLevel finds each level", () => {
    for (const lvl of LEVELS) {
      assert.equal(getLevel(lvl.id).slug, lvl.slug);
    }
  });

  it("isLevelUnlocked: only level 1 with no completions", () => {
    assert.equal(isLevelUnlocked(1, []), true);
    assert.equal(isLevelUnlocked(2, []), false);
    assert.equal(isLevelUnlocked(5, []), false);
  });

  it("isLevelUnlocked: requires the previous level passed", () => {
    assert.equal(isLevelUnlocked(2, [1]), true);
    assert.equal(isLevelUnlocked(3, [1, 2]), true);
    assert.equal(isLevelUnlocked(3, [1]), false);
    assert.equal(isLevelUnlocked(5, [1, 2, 3, 4]), true);
  });

  it("highestUnlockedLevel mirrors the gating rules", () => {
    assert.equal(highestUnlockedLevel([]), 1);
    assert.equal(highestUnlockedLevel([1]), 2);
    assert.equal(highestUnlockedLevel([1, 2, 3]), 4);
    assert.equal(highestUnlockedLevel([1, 2, 3, 4]), 5);
  });
});

describe("problem generation", () => {
  it("generateProblem: numbers level emits an integer in range and 1 rod", () => {
    const p = generateProblem(1, rng(7));
    assert.equal(p.rods, 1);
    assert.ok(Number.isInteger(p.answer));
    assert.ok(p.answer >= 0 && p.answer <= 9);
  });

  it("generateProblem: addition stays within a single rod", () => {
    for (let s = 1; s < 50; s++) {
      const p = generateProblem(2, rng(s));
      assert.ok(p.answer >= 0 && p.answer <= 9, `seed ${s}: ${p.answer}`);
    }
  });

  it("generateProblem: subtraction never goes negative", () => {
    for (let s = 1; s < 100; s++) {
      const p = generateProblem(3, rng(s));
      assert.ok(p.answer >= 0, `seed ${s}: ${p.answer}`);
    }
  });

  it("generateProblem: multidigit fits in 3 rods (≤999)", () => {
    for (let s = 1; s < 50; s++) {
      const p = generateProblem(4, rng(s));
      assert.ok(p.answer >= 0 && p.answer <= 999, `seed ${s}: ${p.answer}`);
      assert.equal(p.rods, 3);
    }
  });

  it("generateChallenge: returns the configured count, deterministic per seed", () => {
    const a = generateChallenge(2, 12345);
    const b = generateChallenge(2, 12345);
    assert.equal(a.length, getLevel(2).challengeCount);
    assert.deepEqual(
      a.map((p) => p.prompt),
      b.map((p) => p.prompt),
    );
  });
});

describe("scoring", () => {
  it("wrong answer = 0 points", () => {
    const r = scoreAnswer({
      correct: false,
      elapsedMs: 100,
      limitMs: 10000,
      fastBonusFraction: 0.5,
    });
    assert.equal(r.points, 0);
    assert.equal(r.fastBonus, false);
  });

  it("correct + slow = base points only", () => {
    const r = scoreAnswer({
      correct: true,
      elapsedMs: 9000,
      limitMs: 10000,
      fastBonusFraction: 0.5,
    });
    assert.equal(r.points, POINTS_CORRECT);
    assert.equal(r.fastBonus, false);
  });

  it("correct + fast = base + bonus", () => {
    const r = scoreAnswer({
      correct: true,
      elapsedMs: 4000,
      limitMs: 10000,
      fastBonusFraction: 0.5,
    });
    assert.equal(r.points, POINTS_CORRECT + POINTS_FAST_BONUS);
    assert.equal(r.fastBonus, true);
    assert.equal(r.bonusPoints, POINTS_FAST_BONUS);
  });

  it("summarizeSession: perfect → label perfect & passed", () => {
    const sum = summarizeSession(2, [
      { correct: true, points: 15 },
      { correct: true, points: 15 },
      { correct: true, points: 10 },
      { correct: true, points: 10 },
      { correct: true, points: 15 },
    ]);
    assert.equal(sum.accuracyPct, 100);
    assert.equal(sum.label, "perfect");
    assert.equal(sum.passed, true);
    assert.equal(sum.totalPoints, 65);
  });

  it("summarizeSession: under threshold → keep_going & not passed", () => {
    const sum = summarizeSession(2, [
      { correct: true, points: 10 },
      { correct: false, points: 0 },
      { correct: false, points: 0 },
      { correct: false, points: 0 },
      { correct: false, points: 0 },
    ]);
    assert.equal(sum.accuracyPct, 20);
    assert.equal(sum.label, "keep_going");
    assert.equal(sum.passed, false);
  });

  it("summarizeSession: at unlock threshold → passed", () => {
    const sum = summarizeSession(2, [
      { correct: true, points: 10 },
      { correct: true, points: 10 },
      { correct: true, points: 10 },
      { correct: true, points: 10 },
      { correct: false, points: 0 },
    ]);
    // 80% with default 70% threshold → passes & label "great"
    assert.equal(sum.passed, true);
    assert.equal(sum.label, "great");
  });
});

describe("lesson scripts", () => {
  it("every level has a lesson with at least 3 steps", () => {
    for (const lvl of LEVELS) {
      const script = buildLessonScript(lvl.id);
      assert.equal(script.level, lvl.id);
      assert.ok(script.steps.length >= 3);
      for (const step of script.steps) {
        assert.ok(step.text.length > 0);
        assert.ok(Array.isArray(step.state));
      }
    }
  });
});

describe("age + tutor helpers", () => {
  it("isAbacusEligible: 4–10 inclusive", () => {
    assert.equal(isAbacusEligible(3), false);
    assert.equal(isAbacusEligible(4), true);
    assert.equal(isAbacusEligible(10), true);
    assert.equal(isAbacusEligible(11), false);
  });

  it("buildAbacusTutorPrompt: language affects system prompt", () => {
    const en = buildAbacusTutorPrompt({
      level: 2 as LevelId,
      ageYears: 6,
      language: "en",
      question: "How do I add 7?",
    });
    const hi = buildAbacusTutorPrompt({
      level: 2 as LevelId,
      ageYears: 6,
      language: "hi",
      question: "How do I add 7?",
    });
    assert.match(en.system, /clear, simple English/);
    assert.match(hi.system, /Hindi/);
    assert.equal(en.user, "How do I add 7?");
  });

  it("buildAbacusTutorPrompt: caps user message length", () => {
    const long = "x".repeat(2000);
    const out = buildAbacusTutorPrompt({
      level: 1 as LevelId,
      ageYears: 5,
      language: "en",
      question: long,
    });
    assert.ok(out.user.length <= 500);
  });
});
