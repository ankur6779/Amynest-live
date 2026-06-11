import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultLearningState,
  defaultRewardState,
  recordPlaygroundSession,
} from "@workspace/math-playground";
import { buildParentLearningReport, shouldGenerateParentReport } from "./parent-report-builder.ts";
import { buildRecommendations } from "./recommendation-engine.ts";
import { buildProgressForecast } from "./progress-forecast.ts";
import { refreshPlaygroundIntelligence } from "./intelligence-orchestrator.ts";

describe("parent-report-builder", () => {
  it("generates report with skill age estimate", () => {
    let learning = defaultLearningState();
    for (let i = 0; i < 3; i++) {
      learning = recordPlaygroundSession(learning, {
        activityId: "addition_lab",
        completedAt: Date.now() - i * 60_000,
        hintsUsed: 0,
        durationMs: 80_000,
        success: true,
        tierUsed: "standard",
      });
    }
    const report = buildParentLearningReport(learning, 5.1);
    assert.ok(report.estimatedSkillAgeYears > 0);
    assert.equal(report.childAgeYears, 5.1);
    assert.ok(report.schoolReadiness.score >= 0);
  });

  it("triggers every 10 sessions", () => {
    assert.equal(shouldGenerateParentReport(undefined, 9), false);
    assert.equal(shouldGenerateParentReport(undefined, 10), true);
    assert.equal(
      shouldGenerateParentReport({ parentReports: [{ sessionsIncluded: 10 } as never], sessionsSinceLastReport: 0 }, 10),
      false,
    );
  });
});

describe("recommendation-engine", () => {
  it("builds daily weekly monthly bundle", () => {
    const bundle = buildRecommendations(defaultLearningState(), 5);
    assert.equal(bundle.items.length, 3);
    assert.ok(bundle.items.some((i) => i.horizon === "daily"));
  });
});

describe("progress-forecast", () => {
  it("projects readiness forward", () => {
    const forecast = buildProgressForecast(defaultLearningState());
    assert.ok(forecast.forecast30 >= forecast.currentReadiness);
    assert.ok(forecast.forecast90 >= forecast.forecast30);
  });
});

describe("intelligence-orchestrator", () => {
  it("refreshes intelligence state after session", () => {
    let learning = defaultLearningState();
    for (let i = 0; i < 10; i++) {
      learning = recordPlaygroundSession(learning, {
        activityId: "counting_adventure",
        completedAt: Date.now() - i * 60_000,
        hintsUsed: 0,
        durationMs: 70_000,
        success: true,
        tierUsed: "standard",
      });
    }

    const result = refreshPlaygroundIntelligence({
      state: {
        version: 4,
        childId: 1,
        rewards: defaultRewardState(),
        learning,
      },
      ageYears: 5,
      childDisplayName: "Ava",
      afterSessionComplete: true,
    });

    assert.ok(result.intelligence.schoolReadiness);
    assert.ok(result.intelligence.learningGaps);
    assert.equal(result.parentReportGenerated, true);
  });
});
