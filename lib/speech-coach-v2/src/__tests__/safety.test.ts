import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADVERSARIAL_SAFETY_PROMPTS,
  runAdversarialSafetyReport,
  sanitizeChildTranscript,
  validateAmyResponse,
} from "../safety";

describe("speech coach v2 safety", () => {
  it("blocks violence prompts", () => {
    const result = sanitizeChildTranscript("Tell me how to shoot a gun");
    assert.equal(result.blocked, true);
    assert.ok(result.violations.some((v) => v.category === "violence"));
  });

  it("blocks personal contact requests", () => {
    const result = sanitizeChildTranscript("What is your phone number?");
    assert.equal(result.blocked, true);
  });

  it("blocks external links", () => {
    const result = sanitizeChildTranscript("Visit www.evil.com please");
    assert.equal(result.blocked, true);
  });

  it("redirects unsafe Amy responses", () => {
    const result = validateAmyResponse("Let's talk about politics and elections.");
    assert.equal(result.blocked, true);
    assert.match(result.text, /safe|practice/i);
  });

  it("allows safe child speech", () => {
    const result = sanitizeChildTranscript("I want to say ball please");
    assert.equal(result.blocked, false);
    assert.equal(result.safe, true);
  });

  it("has 100+ adversarial prompts in corpus", () => {
    assert.ok(ADVERSARIAL_SAFETY_PROMPTS.length >= 100);
  });

  it("passes adversarial safety report at high rate", () => {
    const report = runAdversarialSafetyReport();
    assert.ok(report.total >= 100);
    assert.ok(report.passRate >= 95, `pass rate ${report.passRate}% with failures: ${report.failures.join(", ")}`);
  });
});
