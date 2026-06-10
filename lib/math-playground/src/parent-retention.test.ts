import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultRewardState } from "./reward-rules.ts";
import {
  buildParentRetentionSnapshot,
  computeSkillBreakdown,
  deriveSkillTrend,
  mathConfidenceStars,
} from "./parent-retention.ts";
import { defaultLearningState, recordPlaygroundSession } from "./adaptive.ts";

describe("math-playground parent-retention", () => {
  it("computes skill breakdown from activity stats", () => {
    let learning = defaultLearningState();
    learning = recordPlaygroundSession(learning, {
      activityId: "counting_adventure",
      completedAt: Date.now(),
      hintsUsed: 0,
      durationMs: 20_000,
      success: true,
      tierUsed: "standard",
    });
    const breakdown = computeSkillBreakdown(learning);
    assert.ok(breakdown.counting > 0);
    assert.equal(breakdown.addition, 0);
  });

  it("maps average mastery to confidence stars", () => {
    assert.equal(
      mathConfidenceStars({
        counting: 95,
        addition: 92,
        subtraction: 0,
        multiplication: 0,
        division: 0,
        patterns: 93,
      }),
      5,
    );
    assert.equal(
      mathConfidenceStars({
        counting: 48,
        addition: 42,
        subtraction: 0,
        multiplication: 0,
        division: 0,
        patterns: 0,
      }),
      2,
    );
  });

  it("detects improving trend from session history", () => {
    let learning = defaultLearningState();
    const base = Date.now();
    for (let i = 0; i < 5; i++) {
      learning = recordPlaygroundSession(learning, {
        activityId: "addition_lab",
        completedAt: base - (10 + i) * 1000,
        hintsUsed: 0,
        durationMs: 20_000,
        success: false,
        tierUsed: "standard",
      });
    }
    for (let i = 0; i < 5; i++) {
      learning = recordPlaygroundSession(learning, {
        activityId: "addition_lab",
        completedAt: base - i * 1000,
        hintsUsed: 0,
        durationMs: 20_000,
        success: true,
        tierUsed: "standard",
      });
    }
    assert.equal(deriveSkillTrend(learning, "addition"), "improving");
  });

  it("builds parent retention snapshot", () => {
    let learning = defaultLearningState();
    learning = recordPlaygroundSession(learning, {
      activityId: "counting_adventure",
      completedAt: Date.now(),
      hintsUsed: 0,
      durationMs: 20_000,
      success: true,
      tierUsed: "standard",
    });
    const snapshot = buildParentRetentionSnapshot(learning, defaultRewardState(), 5);
    assert.ok(snapshot.mathConfidenceStars >= 1 && snapshot.mathConfidenceStars <= 5);
    assert.equal(snapshot.sessionCount, 1);
    assert.ok(snapshot.recommendedActivityId);
    assert.ok(["improving", "stable", "needs_practice"].includes(snapshot.recommendedTrend));
  });
});
