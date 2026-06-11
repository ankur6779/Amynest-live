import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultLearningState,
  recordPlaygroundSession,
} from "@workspace/math-playground";
import { computeSchoolReadiness } from "./school-readiness-engine.ts";
import { detectLearningGaps } from "./learning-gap-detector.ts";

describe("school-readiness-engine", () => {
  it("returns score between 0 and 100", () => {
    const result = computeSchoolReadiness(defaultLearningState());
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.ok(["early", "developing", "ready", "highly_ready"].includes(result.band));
    assert.equal(result.dimensions.length, 7);
  });

  it("improves with successful sessions", () => {
    let learning = defaultLearningState();
    for (let i = 0; i < 5; i++) {
      learning = recordPlaygroundSession(learning, {
        activityId: "counting_adventure",
        completedAt: Date.now() - i * 60_000,
        hintsUsed: 0,
        durationMs: 90_000,
        success: true,
        tierUsed: "standard",
      });
    }
    const result = computeSchoolReadiness(learning);
    assert.ok(result.score >= 45);
    assert.equal(result.sessionCount, 5);
  });
});

describe("learning-gap-detector", () => {
  it("detects gaps after hint-heavy failures", () => {
    let learning = defaultLearningState();
    for (let i = 0; i < 4; i++) {
      learning = recordPlaygroundSession(learning, {
        activityId: "addition_lab",
        completedAt: Date.now() - i * 60_000,
        hintsUsed: 2,
        durationMs: 120_000,
        success: false,
        tierUsed: "ease",
        retryCount: 2,
      });
    }
    const gaps = detectLearningGaps(learning, 6);
    assert.ok(gaps.gaps.some((g) => g.skill === "addition"));
    assert.ok(gaps.recommendedFocus.length > 0);
  });
});
