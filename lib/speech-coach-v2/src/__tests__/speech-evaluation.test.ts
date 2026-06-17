import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateSpeechResponse } from "../speech-evaluation";

describe("evaluateSpeechResponse", () => {
  it("scores exact match highly", () => {
    const result = evaluateSpeechResponse({
      expected: "ball",
      transcript: "ball",
      rawTranscript: "ball",
      timing: { responseSeconds: 1.5 },
    });
    assert.equal(result.pronunciationEstimate, 100);
    assert.ok(result.overallScore >= 85);
    assert.equal(result.needsRetry, false);
    assert.equal(result.scoringConfidence, "HIGH");
  });

  it("scores partial match with retry suggestion", () => {
    const result = evaluateSpeechResponse({
      expected: "I want water",
      transcript: "want water",
      rawTranscript: "want water",
      timing: { responseSeconds: 4 },
    });
    assert.ok(result.transcriptAccuracy >= 50);
    assert.ok(result.completionScore >= 50);
  });

  it('does not give perfect pronunciation for "I waaaant wader"', () => {
    const result = evaluateSpeechResponse({
      expected: "I want water",
      transcript: "I want water",
      rawTranscript: "I waaaant wader",
      timing: { responseSeconds: 3.5, hadDisfluency: true },
    });
    assert.equal(result.transcriptAccuracy, 100);
    assert.ok(result.pronunciationEstimate < 80, "pronunciation must not be perfect");
    assert.equal(result.scoringConfidence, "LOW");
    assert.equal(result.needsRetry, true);
    assert.match(result.childFeedback, /practice/i);
  });

  it("separates transcript accuracy from pronunciation estimate", () => {
    const result = evaluateSpeechResponse({
      expected: "library",
      transcript: "library",
      rawTranscript: "libary",
      timing: { responseSeconds: 2 },
    });
    assert.ok(result.transcriptAccuracy >= 85);
    assert.ok(result.pronunciationEstimate < result.transcriptAccuracy);
  });

  it("never returns empty feedback", () => {
    const result = evaluateSpeechResponse({
      expected: "cat",
      transcript: "",
    });
    assert.ok(result.childFeedback.length > 0);
    assert.equal(result.needsRetry, true);
  });
});
