import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveAdaptivityTierV4,
  recordPlaygroundSessionV4,
} from "./adaptive-v4.ts";
import { defaultLearningState, deriveAdaptivityTier } from "./adaptive.ts";

describe("math-playground adaptive-v4", () => {
  it("matches base tier when v4 signals are absent", () => {
    let learning = defaultLearningState();
    for (let i = 0; i < 3; i++) {
      learning = recordPlaygroundSessionV4(learning, {
        activityId: "addition_lab",
        completedAt: Date.now() + i,
        hintsUsed: 0,
        durationMs: 25_000,
        success: true,
        tierUsed: "standard",
      });
    }
    assert.equal(
      deriveAdaptivityTierV4("addition_lab", learning),
      deriveAdaptivityTier("addition_lab", learning),
    );
  });

  it("lowers tier when recent sessions show struggle signals", () => {
    let learning = defaultLearningState();
    for (let i = 0; i < 3; i++) {
      learning = recordPlaygroundSessionV4(learning, {
        activityId: "counting_adventure",
        completedAt: Date.now() + i,
        hintsUsed: 2,
        durationMs: 45_000,
        success: i < 2,
        tierUsed: "standard",
        responseTimeMs: 25_000,
        retryCount: 3,
        voiceConfidence: 0.3,
        playMode: "voice",
      });
    }
    assert.equal(deriveAdaptivityTierV4("counting_adventure", learning), "ease");
  });

  it("raises tier when fast learner signals dominate", () => {
    let learning = defaultLearningState();
    for (let i = 0; i < 5; i++) {
      learning = recordPlaygroundSessionV4(learning, {
        activityId: "counting_adventure",
        completedAt: Date.now() + i,
        hintsUsed: 0,
        durationMs: 12_000,
        success: true,
        tierUsed: "standard",
        responseTimeMs: 4_000,
        retryCount: 0,
        voiceConfidence: 0.92,
        playMode: "voice",
      });
    }
    assert.equal(deriveAdaptivityTierV4("counting_adventure", learning), "stretch");
  });
});
