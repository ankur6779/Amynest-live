import { describe, expect, it } from "vitest";
import {
  buildParentRetentionSnapshot,
  computeSkillBreakdown,
  defaultLearningState,
  defaultRewardState,
  mathConfidenceStars,
  recordPlaygroundSession,
} from "@workspace/math-playground";

describe("parent retention dashboard data", () => {
  it("builds snapshot with skill breakdown after sessions", () => {
    let learning = defaultLearningState();
    learning = recordPlaygroundSession(learning, {
      activityId: "counting_adventure",
      completedAt: Date.now(),
      hintsUsed: 0,
      durationMs: 60_000,
      success: true,
      tierUsed: "standard",
    });
    learning = recordPlaygroundSession(learning, {
      activityId: "addition_lab",
      completedAt: Date.now(),
      hintsUsed: 1,
      durationMs: 90_000,
      success: true,
      tierUsed: "guided",
    });

    const breakdown = computeSkillBreakdown(learning);
    expect(breakdown.counting).toBeGreaterThan(0);
    expect(breakdown.addition).toBeGreaterThan(0);

    const snapshot = buildParentRetentionSnapshot(learning, defaultRewardState(), 6);
    expect(snapshot.sessionCount).toBe(2);
    expect(snapshot.mathConfidenceStars).toBe(mathConfidenceStars(breakdown));
    expect(snapshot.recommendedActivityId).toBeTruthy();
    expect(["improving", "stable", "needs_practice"]).toContain(snapshot.recommendedTrend);
  });

  it("returns confidence stars between 1 and 5", () => {
    const snapshot = buildParentRetentionSnapshot(defaultLearningState(), defaultRewardState(), 5);
    expect(snapshot.mathConfidenceStars).toBeGreaterThanOrEqual(1);
    expect(snapshot.mathConfidenceStars).toBeLessThanOrEqual(5);
  });
});
