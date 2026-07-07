import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateSuppression } from "./suppression-engine.js";
import type { Decision } from "../decision/decision-engine.js";

function decision(overrides: Partial<Decision> = {}): Decision {
  return { send: true, expectedValue: 0.6, reason: "positive_expected_value", factors: [], ...overrides };
}

test("allows when nothing suppresses", () => {
  const v = evaluateSuppression({ decision: decision() });
  assert.equal(v.suppress, false);
  assert.equal(v.reason, null);
});

test("sleep hours is the decisive reason", () => {
  const v = evaluateSuppression({ decision: decision(), inSleepHours: true, userActiveNow: true });
  assert.equal(v.suppress, true);
  assert.equal(v.reason, "sleep_hours");
  assert.ok(v.reasons.includes("user_active_now"));
});

test("quality failure suppresses", () => {
  const v = evaluateSuppression({
    decision: decision(),
    quality: { score: 20, passed: false, dimensions: {} as never, reasons: ["generic:open amynest"] },
  });
  assert.equal(v.suppress, true);
  assert.ok(v.reasons.includes("quality_below_threshold"));
});

test("repetitive content suppresses", () => {
  const v = evaluateSuppression({
    decision: decision(),
    diversity: { score: 20, repetitive: true, collisions: ["category", "wording"], rotateToward: [] },
  });
  assert.ok(v.reasons.includes("content_repetitive"));
});

test("negative expected value suppresses", () => {
  const v = evaluateSuppression({ decision: decision({ send: false, reason: "below_threshold" }) });
  assert.equal(v.suppress, true);
  assert.ok(v.reasons.includes("negative_expected_value"));
});

test("extremely low conversion probability suppresses", () => {
  const v = evaluateSuppression({ decision: decision(), conversionProbability: 0.01 });
  assert.ok(v.reasons.includes("conversion_probability_low"));
});
