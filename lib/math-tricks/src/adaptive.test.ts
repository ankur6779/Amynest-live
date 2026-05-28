import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyLearningSignal,
  createLearningSignals,
  deriveAdaptationProfile,
  type ChildLearningSignals,
} from "./adaptive.js";

test("age baseline sets starting abstraction", () => {
  assert.ok(createLearningSignals(3).abstractionLevel < createLearningSignals(7).abstractionLevel);
});

test("repeated struggle raises frustration and lowers confidence", () => {
  let s = createLearningSignals(6);
  s = applyLearningSignal(s, { type: "incorrect" });
  s = applyLearningSignal(s, { type: "retry" });
  s = applyLearningSignal(s, { type: "hesitation", ms: 9000 });
  assert.ok(s.frustrationRisk > 0.4);
  assert.ok(s.confidenceEstimate < 0.5);
});

test("struggling profile is slower, more concrete, strongly scaffolded", () => {
  let s = createLearningSignals(6);
  for (let i = 0; i < 4; i++) s = applyLearningSignal(s, { type: "incorrect" });
  const p = deriveAdaptationProfile(s, 6);
  assert.ok(p.stepDurationScale > 1);
  assert.equal(p.scaffoldingLevel, "strong");
  assert.equal(p.narrationDensity, "high");
});

test("confident profile is faster, more symbolic, lightly scaffolded", () => {
  let s = createLearningSignals(7);
  s = applyLearningSignal(s, { type: "correct", firstTry: true });
  s = applyLearningSignal(s, { type: "correct", firstTry: true });
  const p = deriveAdaptationProfile(s, 7);
  assert.ok(p.stepDurationScale < 1);
  assert.equal(p.scaffoldingLevel, "minimal");
  assert.ok(p.abstractionLevel >= 0.8);
});

test("signals stay within 0..1 bounds", () => {
  let s: ChildLearningSignals = createLearningSignals(5);
  for (let i = 0; i < 50; i++) s = applyLearningSignal(s, { type: "incorrect" });
  assert.ok(s.frustrationRisk <= 1 && s.confidenceEstimate >= 0);
});
