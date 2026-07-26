import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runEvaluation } from "./engine.js";
import { auditSafety } from "./safety.js";
import { GOLDEN_SCENARIOS } from "./scenarios.js";
import { EVALUATION_FRAMEWORK_VERSION } from "./types.js";

describe("AI Evaluation Framework", () => {
  it("has golden scenarios across age and question categories", () => {
    assert.ok(GOLDEN_SCENARIOS.length >= 8);
    const cats = new Set(GOLDEN_SCENARIOS.map((s) => s.category));
    for (const c of [
      "newborn",
      "toddler",
      "preschool",
      "school_age",
      "teen",
      "routine",
      "sleep",
      "behaviour",
      "astrology",
    ]) {
      assert.ok(cats.has(c as (typeof GOLDEN_SCENARIOS)[0]["category"]), c);
    }
  });

  it("safety audit catches missing flags and forbidden prose", () => {
    const ok = auditSafety({
      safetyFlags: [
        "no_absolute_predictions",
        "no_medical_diagnosis",
        "no_financial_advice",
        "no_fear_based_statements",
        "no_deterministic_future",
      ],
      avoidTopics: [
        "fatalistic_prediction",
        "medical_diagnosis",
        "financial_advice",
        "fear_based_framing",
      ],
      texts: ["Offer a calm wind-down."],
    });
    assert.equal(ok.score, 100);

    const bad = auditSafety({
      safetyFlags: [],
      avoidTopics: [],
      texts: ["They are destined to become a doctor."],
    });
    assert.ok(bad.score < 100);
    assert.ok(bad.violations.some((v) => v.includes("deterministic_future")));
  });

  it("runs full pipeline evaluation above threshold", () => {
    const report = runEvaluation({ threshold: 90 });
    assert.equal(report.evaluationFrameworkVersion, EVALUATION_FRAMEWORK_VERSION);
    assert.ok(report.scenarioResults.length === GOLDEN_SCENARIOS.length);
    assert.ok(report.overallScore >= 90, `score=${report.overallScore}`);
    assert.equal(report.failedScenarios.length, 0);
    assert.equal(report.passed, true);
    for (const s of report.scenarioResults) {
      assert.ok(s.overallScore >= 70, `${s.scenarioId}=${s.overallScore}`);
      assert.ok(s.metrics.some((m) => m.id === "safety" && m.score >= 80));
    }
  });

  it("is deterministic across evaluation runs", () => {
    const a = runEvaluation({ threshold: 90 });
    const b = runEvaluation({ threshold: 90 });
    assert.equal(a.overallScore, b.overallScore);
    assert.deepEqual(
      a.scenarioResults.map((s) => s.output.fingerprint),
      b.scenarioResults.map((s) => s.output.fingerprint),
    );
  });
});
