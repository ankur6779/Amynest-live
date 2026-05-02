/**
 * Spelling Mastery v2 — pure-logic regression tests.
 *
 * The session endpoints themselves require Firebase auth + a live DB row
 * for the child, which our test rig can't easily produce. So we cover
 * the logic that the trust model depends on:
 *
 *   - normaliseSpellingGuess: must accept benign casing/whitespace
 *     differences but reject anything that isn't actually the same word.
 *   - computeCompetitionScore: deterministic from (correct, duration);
 *     a tampered client posting a faster duration must produce a
 *     bounded, predictable score change.
 *   - applyAttempt: stars / level / streak / badges progress correctly
 *     on a sequence of attempts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normaliseSpellingGuess,
  computeCompetitionScore,
  applyAttempt,
} from "./spelling";

describe("normaliseSpellingGuess", () => {
  it("treats trailing whitespace as equal", () => {
    assert.equal(normaliseSpellingGuess("ship "), normaliseSpellingGuess("ship"));
    assert.equal(normaliseSpellingGuess("  ship\n"), normaliseSpellingGuess("ship"));
  });

  it("treats casing as equal", () => {
    assert.equal(normaliseSpellingGuess("Ship"), normaliseSpellingGuess("ship"));
    assert.equal(normaliseSpellingGuess("SHIP"), normaliseSpellingGuess("ship"));
  });

  it("strips internal whitespace (a kid typing 'sh ip')", () => {
    assert.equal(normaliseSpellingGuess("sh ip"), normaliseSpellingGuess("ship"));
    assert.equal(normaliseSpellingGuess("s h i p"), normaliseSpellingGuess("ship"));
  });

  it("rejects an actually-different word", () => {
    assert.notEqual(
      normaliseSpellingGuess("shop"),
      normaliseSpellingGuess("ship"),
    );
    assert.notEqual(
      normaliseSpellingGuess("ships"),
      normaliseSpellingGuess("ship"),
    );
  });

  it("normalises NFKC so visually identical unicode matches", () => {
    // Full-width 's' (U+FF53) should normalise to ASCII 's' under NFKC.
    assert.equal(
      normaliseSpellingGuess("\uFF53hip"),
      normaliseSpellingGuess("ship"),
    );
  });
});

describe("computeCompetitionScore", () => {
  it("awards 100 points per correct word as the base", () => {
    // 0 correct -> 0 score regardless of duration
    assert.equal(computeCompetitionScore(0, 30), 0);
    // 10 correct, very long duration -> just the base 1000 (speed bonus = 0)
    assert.equal(computeCompetitionScore(10, 6000), 1000);
  });

  it("adds a speed bonus that decays with duration", () => {
    const fast = computeCompetitionScore(10, 30);
    const slow = computeCompetitionScore(10, 120);
    assert.ok(fast > slow, `fast (${fast}) should beat slow (${slow})`);
    assert.ok(fast >= 1000, "fast run still includes the 100×correct base");
  });

  it("clamps duration so a sub-second run can't divide-by-zero", () => {
    // Even a 0s duration must be a finite number, not Infinity.
    const score = computeCompetitionScore(10, 0);
    assert.ok(Number.isFinite(score));
    assert.ok(score >= 1000);
  });

  it("is deterministic — same inputs, same output", () => {
    assert.equal(
      computeCompetitionScore(7, 45),
      computeCompetitionScore(7, 45),
    );
  });
});

describe("applyAttempt — stars/level/streak progression", () => {
  type Attempt = ReturnType<typeof applyAttempt>;
  const zero: Attempt = {
    totalCorrect: 0,
    totalAttempts: 0,
    totalStars: 0,
    currentLevel: 1,
    currentStreak: 0,
    bestStreak: 0,
    badges: [],
    starsEarnedThisAttempt: 0,
  };

  it("awards 1 star for a correct attempt, 0 for wrong", () => {
    const ok = applyAttempt(zero, true);
    assert.equal(ok.starsEarnedThisAttempt, 1);
    assert.equal(ok.totalStars, 1);
    const bad = applyAttempt(zero, false);
    assert.equal(bad.starsEarnedThisAttempt, 0);
    assert.equal(bad.totalStars, 0);
  });

  it("breaks streak on a wrong answer", () => {
    let s: Attempt = zero;
    s = applyAttempt(s, true);
    s = applyAttempt(s, true);
    assert.equal(s.currentStreak, 2);
    s = applyAttempt(s, false);
    assert.equal(s.currentStreak, 0);
    assert.equal(s.bestStreak, 2);
  });

  it("awards a 2-star bonus on a streak-of-5 boundary", () => {
    let s: Attempt = zero;
    for (let i = 0; i < 4; i++) s = applyAttempt(s, true);
    assert.equal(s.currentStreak, 4);
    // 5th correct: bonus
    s = applyAttempt(s, true);
    assert.equal(s.currentStreak, 5);
    assert.equal(s.starsEarnedThisAttempt, 2);
    // 6th correct: back to 1
    s = applyAttempt(s, true);
    assert.equal(s.starsEarnedThisAttempt, 1);
  });

  it("levels up at 10 stars (1 per level)", () => {
    let s: Attempt = zero;
    // 9 correct, no streak bonus alignment yet -> stars climb but level stays
    for (let i = 0; i < 9; i++) s = applyAttempt(s, true);
    // After 9 correct in a row we got the 5-bonus once: 8 + 2 = 10 stars
    assert.equal(s.totalStars, 10);
    assert.equal(s.currentLevel, 2);
  });

  it("awards milestone badges deterministically", () => {
    let s: Attempt = zero;
    s = applyAttempt(s, true);
    assert.ok(s.badges.includes("first_word"), "first correct -> first_word");
    // Build a 5-streak
    let t: Attempt = zero;
    for (let i = 0; i < 5; i++) t = applyAttempt(t, true);
    assert.ok(t.badges.includes("spelling_star"), "streak 5 -> spelling_star");
  });
});
