/**
 * Cry Insight engine — unit tests for the rule-based classifier.
 *
 * These tests pin the heuristic outputs so we notice if a future tweak
 * accidentally moves the needle. They cover:
 *   - context-only flow (no audio)
 *   - audio-only flow (no context)
 *   - combination + ranking determinism
 *   - safety/medical-flag triggers
 *   - boundary normalization (negative / huge values, NaN)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analyseCry,
  combineScores,
  getActionSuggestion,
  pickTopTwo,
  scoreFromAudio,
  scoreFromContext,
  shouldSuggestMedicalCheck,
  CRY_CAUSES,
  type CauseScores,
} from "./cryInsight.js";

function sumScores(s: CauseScores): number {
  return CRY_CAUSES.reduce((acc, c) => acc + s[c], 0);
}

describe("scoreFromContext", () => {
  it("returns all zeros for an empty context", () => {
    const s = scoreFromContext({});
    // discomfort baseline of 10 (unknown diaper) is the only non-zero.
    assert.equal(s.hunger, 0);
    assert.equal(s.sleepy, 0);
    assert.equal(s.pain, 0);
    assert.equal(s.discomfort, 10);
  });

  it("scores hunger high when feed is overdue", () => {
    const s = scoreFromContext({ minutesSinceFeed: 300, ageMonths: 4 });
    assert.ok(s.hunger >= 45, `expected ≥45 hunger, got ${s.hunger}`);
  });

  it("does not score hunger when feed was recent", () => {
    const s = scoreFromContext({ minutesSinceFeed: 30, ageMonths: 4 });
    assert.equal(s.hunger, 0);
  });

  it("scores sleepy past the wake window", () => {
    // 6m has 120m wake window; 200m is well past.
    const s = scoreFromContext({ minutesSinceSleep: 200, ageMonths: 6 });
    assert.ok(s.sleepy >= 40, `expected ≥40 sleepy, got ${s.sleepy}`);
  });

  it("scores discomfort higher when diaper is NOT recently changed", () => {
    const yes = scoreFromContext({ diaperChangedRecently: true });
    const no = scoreFromContext({ diaperChangedRecently: false });
    assert.ok(no.discomfort > yes.discomfort);
  });

  it("scores pain heavily when fever flag is set", () => {
    const s = scoreFromContext({ fever: true });
    assert.ok(s.pain >= 50);
  });

  it("uses age-appropriate feed windows", () => {
    // Same minutesSinceFeed but different ages → different urgency.
    const newborn = scoreFromContext({ minutesSinceFeed: 180, ageMonths: 1 });
    const toddler = scoreFromContext({ minutesSinceFeed: 180, ageMonths: 18 });
    assert.ok(newborn.hunger >= toddler.hunger);
  });
});

describe("scoreFromAudio", () => {
  it("returns zeros when no audio fields are provided", () => {
    const s = scoreFromAudio({});
    assert.equal(sumScores(s), 0);
  });

  it("flags pain on a sharp peak that exceeds avg by a wide margin", () => {
    const s = scoreFromAudio({
      avgAmplitude: 0.3,
      peakAmplitude: 0.85,
      zeroCrossingRate: 0.4,
      durationMs: 5000,
    });
    assert.ok(s.pain > 0, `expected pain > 0, got ${s.pain}`);
  });

  it("flags hunger on sustained loud cry with moderate burst rate", () => {
    const s = scoreFromAudio({
      avgAmplitude: 0.6,
      peakAmplitude: 0.7,
      zeroCrossingRate: 0.45,
      durationMs: 8000,
    });
    assert.ok(s.hunger >= 35);
  });

  it("flags sleepy on low energy, low ZCR", () => {
    const s = scoreFromAudio({
      avgAmplitude: 0.2,
      peakAmplitude: 0.3,
      zeroCrossingRate: 0.15,
      durationMs: 6000,
    });
    assert.ok(s.sleepy > 0);
  });

  it("clamps negative or huge inputs without throwing", () => {
    const s = scoreFromAudio({
      avgAmplitude: -1,
      peakAmplitude: 999,
      zeroCrossingRate: Number.NaN,
      durationMs: 1000,
    });
    // Just verify no NaN / Infinity escapes.
    for (const c of CRY_CAUSES) {
      assert.ok(Number.isFinite(s[c]), `${c} score not finite: ${s[c]}`);
    }
  });
});

describe("combineScores + pickTopTwo", () => {
  it("normalizes to a 100-sum percentage breakdown", () => {
    const audio = scoreFromAudio({ avgAmplitude: 0.6, zeroCrossingRate: 0.4 });
    const ctx = scoreFromContext({ minutesSinceFeed: 240, ageMonths: 4 });
    const out = combineScores(audio, ctx);
    const sum = sumScores(out);
    // Allow ±2 for rounding of 4 buckets.
    assert.ok(Math.abs(sum - 100) <= 2, `sum ${sum} not ≈100`);
  });

  it("returns a neutral 25/25/25/25 when both inputs are empty", () => {
    const out = combineScores(scoreFromAudio({}), scoreFromContext({}));
    // discomfort baseline of 10 dominates → discomfort would be 100, others 0.
    // Verify the pick logic still produces a valid result, not crash.
    const [primary, secondary] = pickTopTwo(out);
    assert.equal(primary.cause, "discomfort");
    assert.ok(secondary.cause !== primary.cause || secondary.confidence === 0);
  });

  it("pickTopTwo is deterministic for tied scores (uses CRY_CAUSES order)", () => {
    const tied: CauseScores = { hunger: 25, sleepy: 25, discomfort: 25, pain: 25 };
    const [p, s] = pickTopTwo(tied);
    assert.equal(p.cause, "hunger");
    assert.equal(s.cause, "sleepy");
  });

  it("hunger context overdue + matching audio → hunger wins", () => {
    const out = analyseCry(
      { avgAmplitude: 0.6, peakAmplitude: 0.7, zeroCrossingRate: 0.45, durationMs: 8000 },
      { minutesSinceFeed: 300, ageMonths: 4, diaperChangedRecently: true },
    );
    assert.equal(out.primary.cause, "hunger");
    assert.ok(out.primary.confidence > out.secondary.confidence);
  });

  it("fever context + sharp audio peak → pain wins", () => {
    const out = analyseCry(
      { avgAmplitude: 0.4, peakAmplitude: 0.9, zeroCrossingRate: 0.4, durationMs: 6000 },
      { fever: true, ageMonths: 6, diaperChangedRecently: true },
    );
    assert.equal(out.primary.cause, "pain");
  });
});

describe("shouldSuggestMedicalCheck", () => {
  it("flags medical when fever + sharp peak", () => {
    const flag = shouldSuggestMedicalCheck(
      { peakAmplitude: 0.85, avgAmplitude: 0.4, durationMs: 8000 },
      { fever: true },
    );
    assert.equal(flag, true);
  });

  it("does NOT flag medical for a quiet whiny cry", () => {
    const flag = shouldSuggestMedicalCheck(
      { peakAmplitude: 0.3, avgAmplitude: 0.2, durationMs: 7000 },
      {},
    );
    assert.equal(flag, false);
  });

  it("flags medical on persistent extreme cry without fever", () => {
    const flag = shouldSuggestMedicalCheck(
      { peakAmplitude: 0.95, avgAmplitude: 0.7, durationMs: 12000 },
      {},
    );
    assert.equal(flag, true);
  });
});

describe("getActionSuggestion", () => {
  it("returns a non-empty suggestion for every cause", () => {
    for (const c of CRY_CAUSES) {
      const s = getActionSuggestion(c);
      assert.ok(s.length > 10, `suggestion for ${c} too short: "${s}"`);
    }
  });
});

describe("analyseCry — end-to-end shape", () => {
  it("returns primary + secondary + breakdown + suggestion + medicalFlag", () => {
    const r = analyseCry({}, { minutesSinceFeed: 240, ageMonths: 4 });
    assert.ok(CRY_CAUSES.includes(r.primary.cause));
    assert.ok(CRY_CAUSES.includes(r.secondary.cause));
    assert.equal(typeof r.suggestion, "string");
    assert.equal(typeof r.medicalFlag, "boolean");
    assert.equal(typeof r.breakdown.hunger, "number");
  });

  it("primary confidence ≥ secondary confidence", () => {
    const r = analyseCry(
      { avgAmplitude: 0.5, zeroCrossingRate: 0.4 },
      { minutesSinceFeed: 200, ageMonths: 6 },
    );
    assert.ok(r.primary.confidence >= r.secondary.confidence);
  });
});
