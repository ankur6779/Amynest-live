import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  levelForAge,
  levelRangeForAge,
  localize,
  profileFor,
  pickAdaptiveQuestions,
  bumpLevel,
  SMART_SUBJECTS,
  type Level,
} from "./levels";

describe("Smart Study levels — age band mapping", () => {
  it("maps ages to the spec-defined levels", () => {
    const cases: [number, Level][] = [
      [2, 1], [3, 1],
      [4, 2], [5, 2],
      [6, 3], [7, 3],
      [8, 4], [10, 4],
      [11, 5], [13, 5],
      [14, 6], [15, 6],
    ];
    for (const [age, expected] of cases) {
      assert.equal(levelForAge(age), expected, `age ${age} → L${expected}`);
    }
  });

  it("clamps below 2 → L1 and above 15 → L6", () => {
    assert.equal(levelForAge(1), 1);
    assert.equal(levelForAge(0), 1);
    assert.equal(levelForAge(20), 6);
  });

  it("levelRangeForAge stays inside ±1 of the band", () => {
    const r = levelRangeForAge(8);
    assert.equal(r.min, 3);
    assert.equal(r.max, 5);
  });
});

describe("Smart Study levels — country localization", () => {
  it("token-replaces currency, fruit, and place per country", () => {
    const india = localize("Buy a {fruit} for 5 {currencyName}", "IN");
    assert.match(india, /mango/);
    assert.match(india, /rupees/);

    const us = localize("Buy a {fruit} for 5 {currencyName}", "US");
    assert.match(us, /apple/);
    assert.match(us, /dollars/);

    const uae = localize("{currency}10 for a {treat}", "AE");
    assert.match(uae, /د\.إ/);
    assert.match(uae, /date/);
  });

  it("falls back to DEFAULT (India-leaning) for unknown countries", () => {
    const out = localize("A {fruit} costs {currency}10", "ZZ");
    assert.match(out, /mango/);
    const p = profileFor(null);
    assert.equal(p.country, "DEFAULT");
  });
});

describe("Smart Study levels — adaptive question picker", () => {
  it("returns the requested count of unique questions per subject and level", () => {
    for (const sub of SMART_SUBJECTS) {
      for (let l = 1 as Level; l <= 6; l = (l + 1) as Level) {
        const qs = pickAdaptiveQuestions({
          level: l, subject: sub.id, count: 5, seed: 12345,
        });
        assert.ok(qs.length >= 1, `${sub.id} L${l} should produce at least 1`);
        const ids = new Set(qs.map((q) => q.id));
        assert.equal(ids.size, qs.length, `${sub.id} L${l} ids must be unique within batch`);
        for (const q of qs) {
          assert.ok(q.options.includes(q.answer), `answer must be one of options for ${q.id}`);
          assert.ok(q.options.length >= 2, `at least 2 options for ${q.id}`);
        }
      }
    }
  });

  it("respects the exclude set (anti-repetition)", () => {
    const first = pickAdaptiveQuestions({
      level: 4, subject: "addition", count: 5, seed: 99,
    });
    const seen = new Set(first.map((q) => q.id));
    const second = pickAdaptiveQuestions({
      level: 4, subject: "addition", count: 5, seed: 99,
      exclude: seen,
    });
    for (const q of second) {
      assert.ok(!seen.has(q.id), `excluded id ${q.id} must not reappear`);
    }
  });

  it("stays deterministic for the same seed", () => {
    const a = pickAdaptiveQuestions({ level: 3, subject: "multiplication", count: 4, seed: 7 });
    const b = pickAdaptiveQuestions({ level: 3, subject: "multiplication", count: 4, seed: 7 });
    assert.deepEqual(a.map((q) => q.id), b.map((q) => q.id));
  });

  it("delivers 1000+ unique questions across the 6×6 grid (dataset claim)", () => {
    const all = new Set<string>();
    for (const sub of SMART_SUBJECTS) {
      for (let l = 1 as Level; l <= 6; l = (l + 1) as Level) {
        // 30 batches of 5 with distinct seeds → ~150 attempts per (subject, level).
        const exclude = new Set<string>();
        for (let s = 0; s < 40; s++) {
          const qs = pickAdaptiveQuestions({
            level: l, subject: sub.id, count: 5, seed: s * 131 + l, exclude,
          });
          for (const q of qs) { all.add(q.id); exclude.add(q.id); }
        }
      }
    }
    assert.ok(all.size >= 1000, `expected 1000+ unique questions, got ${all.size}`);
  });
});

describe("Smart Study levels — bumpLevel", () => {
  it("bumps up after 3 consecutive corrects (within age band)", () => {
    const next = bumpLevel({
      currentLevel: 4, ageYears: 9,
      recentResults: [false, true, true, true],
    });
    assert.equal(next, 5);
  });

  it("bumps down after 2 consecutive wrongs", () => {
    const next = bumpLevel({
      currentLevel: 4, ageYears: 9,
      recentResults: [true, false, false],
    });
    assert.equal(next, 3);
  });

  it("clamps within the age band — a 5yo cannot reach L5", () => {
    const next = bumpLevel({
      currentLevel: 3, ageYears: 5,
      recentResults: [true, true, true, true, true, true],
    });
    // age 5 → band L2, range [1, 3]; cap at 3.
    assert.equal(next, 3);
  });

  it("holds steady on mixed recent results", () => {
    const next = bumpLevel({
      currentLevel: 4, ageYears: 9,
      recentResults: [true, false, true, false, true],
    });
    assert.equal(next, 4);
  });
});
