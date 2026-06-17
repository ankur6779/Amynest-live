import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildParentDashboard, weeklyImprovement } from "../analytics";

describe("parent dashboard analytics", () => {
  it("builds server-verified dashboard fields", () => {
    const dashboard = buildParentDashboard({
      todayPracticeSeconds: 300,
      monthPracticeSeconds: 1200,
      wordsPracticed: 42,
      recentOverallScores: [80, 85, 90, 88],
      recentAccuracyScores: [78, 82, 88, 86],
      recentFluencyScores: [70, 75, 80, 78],
      recentConfidenceScores: [72, 76, 82, 80],
      recentSpeakingRateScores: [68, 74, 79, 77],
      priorWeekOverallScores: [70, 72, 75],
      priorMonthOverallScores: [65, 68, 70],
      dailyStreak: 3,
      weeklyStreak: 2,
      badges: ["clear_speaker"],
    });

    assert.equal(dashboard.todayPracticeSeconds, 300);
    assert.equal(dashboard.monthPracticeSeconds, 1200);
    assert.ok(dashboard.topStrengths.length >= 0);
    assert.ok(dashboard.confidenceTrend.length > 0);
    assert.ok(dashboard.weeklyImprovement > 0);
  });

  it("computes weekly improvement from server scores", () => {
    const delta = weeklyImprovement([90, 88, 92], [70, 72, 74]);
    assert.ok(delta > 15);
  });
});
