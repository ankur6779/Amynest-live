import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeMasteryScore,
  defaultActivityStats,
  defaultLearningState,
  deriveAdaptivityTier,
  pickDailyTaskIds,
  pickWeakActivities,
  recordPlaygroundSession,
} from "./adaptive.ts";

describe("math-playground adaptive", () => {
  it("lowers tier after hint-heavy sessions", () => {
    let learning = defaultLearningState();
    learning = recordPlaygroundSession(learning, {
      activityId: "addition_lab",
      completedAt: Date.now(),
      hintsUsed: 2,
      durationMs: 30_000,
      success: true,
      tierUsed: "standard",
    });
    learning = recordPlaygroundSession(learning, {
      activityId: "addition_lab",
      completedAt: Date.now(),
      hintsUsed: 3,
      durationMs: 40_000,
      success: true,
      tierUsed: "standard",
    });
    assert.equal(deriveAdaptivityTier("addition_lab", learning), "ease");
  });

  it("raises tier after strong streak", () => {
    let learning = defaultLearningState();
    for (let i = 0; i < 5; i++) {
      learning = recordPlaygroundSession(learning, {
        activityId: "counting_adventure",
        completedAt: Date.now() + i,
        hintsUsed: 0,
        durationMs: 20_000,
        success: true,
        tierUsed: "standard",
      });
    }
    assert.equal(deriveAdaptivityTier("counting_adventure", learning), "stretch");
  });

  it("prioritises weak activities for daily mix", () => {
    let learning = defaultLearningState();
    learning = recordPlaygroundSession(learning, {
      activityId: "addition_lab",
      completedAt: Date.now() - 3 * 86_400_000,
      hintsUsed: 4,
      durationMs: 50_000,
      success: true,
      tierUsed: "ease",
    });
    const tasks = pickDailyTaskIds(learning, 6, 4);
    assert.equal(tasks[0], "addition_lab");
  });

  it("computes mastery with hint penalty", () => {
    const stats = {
      ...defaultActivityStats(),
      attempts: 4,
      successes: 3,
      hintsTotal: 6,
    };
    const score = computeMasteryScore(stats);
    assert.ok(score < 75);
    assert.ok(score > 30);
  });

  it("finds weak activities below mastery threshold", () => {
    let learning = defaultLearningState();
    learning = {
      ...learning,
      activityStats: {
        subtraction_garden: {
          ...defaultActivityStats(),
          attempts: 3,
          successes: 2,
          hintsTotal: 4,
          masteryScore: 45,
          lastPlayedAt: Date.now(),
        },
      },
    };
    const weak = pickWeakActivities(learning, 7, 2);
    assert.ok(weak.includes("subtraction_garden"));
  });
});
