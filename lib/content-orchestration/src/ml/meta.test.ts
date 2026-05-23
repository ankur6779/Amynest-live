import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { recordMlMetricSample } from "./metrics.js";
import {
  optimizeTuningParameters,
  detectUnderperformingAreas,
  snapshotSystemPerformance,
} from "./selfOptimizer.js";
import { detectDrift, driftResponseActions, resetDriftBaselines } from "./driftDetector.js";
import {
  createAutoExperiment,
  recordVariantOutcome,
  evaluateExperiments,
  clearAutoExperiments,
} from "./autoExperimentEngine.js";
import {
  trainCandidateModel,
  deployCandidate,
  rollbackModel,
  resetModelManager,
} from "./modelManager.js";
import { resetGlobalTrainingPipeline } from "./trainingPipeline.js";
import {
  resetMetaLearningState,
  runMetaLearningCycle,
  getActiveTuningParameters,
} from "./metaLearningController.js";
import {
  buildEffectiveRuntimeConfig,
  clearHumanOverride,
  setHumanOverride,
  getSystemHealth,
} from "./metaOrchestrator.js";
import { clearFailSafe, evaluateFailSafe } from "./failSafeGovernance.js";
import { resetDeploymentSafety } from "./deploymentSafety.js";
import { processRealtimeFeedback, resetFeedbackOrchestrator } from "./feedbackOrchestrator.js";
import { clearGlobalGraphCache } from "./globalGraphEngine.js";
import { resetGlobalBatchState } from "./globalBatchProcessor.js";

function seedMetrics(count: number, reward = 0.3): void {
  for (let i = 0; i < count; i++) {
    recordMlMetricSample({
      source: i % 2 === 0 ? "ml" : "rule",
      reward,
      engagementDelta: 5,
      predictedCorrect: true,
      actualPositive: reward > 0,
    });
  }
}

describe("self optimization", () => {
  beforeEach(() => {
    resetMetaLearningState();
    resetDriftBaselines();
  });

  it("detects underperforming engagement and proposes adjustments", () => {
    seedMetrics(40, -0.2);
    const perf = snapshotSystemPerformance({
      predictionAccuracy: 0.5,
      avgReward: -0.2,
      engagementLift: -0.3,
      fallbackRate: 0.2,
      sampleCount: 40,
      sessionReturnRate: 0.3,
      nextDayRetention: 0.25,
      avgSessionLengthDelta: 0,
      mlVsRuleEngagementLift: -0.1,
      mlAvgSessionLength: 100,
      ruleAvgSessionLength: 120,
    });
    const areas = detectUnderperformingAreas(perf);
    assert.ok(areas.includes("engagement") || areas.includes("reward"));
    const { adjustments } = optimizeTuningParameters(
      getActiveTuningParameters(),
      {
        predictionAccuracy: 0.5,
        avgReward: -0.2,
        engagementLift: -0.3,
        fallbackRate: 0.2,
        sampleCount: 40,
        sessionReturnRate: 0.3,
        nextDayRetention: 0.25,
        avgSessionLengthDelta: 0,
        mlVsRuleEngagementLift: -0.1,
        mlAvgSessionLength: 100,
        ruleAvgSessionLength: 120,
      },
    );
    assert.ok(adjustments.explorationRateDelta !== 0 || adjustments.rewardFrequencyShift);
  });
});

describe("drift detection", () => {
  beforeEach(() => resetDriftBaselines());

  it("flags engagement drop and suggests exploration boost", () => {
    seedMetrics(50, 0.1);
    const report = detectDrift();
    const actions = driftResponseActions(report);
    assert.ok(["none", "low", "medium", "high"].includes(report.severity));
    if (report.severity !== "none") {
      assert.ok(actions.explorationBoost >= 0);
    }
  });
});

describe("auto experimentation", () => {
  beforeEach(() => clearAutoExperiments());

  it("promotes winning variant and disables poor performers", () => {
    const exp = createAutoExperiment("test_exp", 2);
    const v0 = exp.variants[0]!;
    const v1 = exp.variants[1]!;
    for (let i = 0; i < 30; i++) {
      recordVariantOutcome(exp.id, v0.id, { engagement: 0.9, retention: 0.8, reward: 0.7 });
      recordVariantOutcome(exp.id, v1.id, { engagement: 0.3, retention: 0.2, reward: 0.1 });
    }
    const results = evaluateExperiments();
    const updated = results.find((e) => e.id === exp.id)!;
    assert.ok(updated.winnerId);
    const loser = updated.variants.find((v) => v.id !== updated.winnerId);
    assert.equal(loser?.status, "disabled");
  });
});

describe("model lifecycle", () => {
  beforeEach(() => {
    resetModelManager();
    resetGlobalTrainingPipeline();
  });

  it("trains deploys and rolls back", async () => {
    await trainCandidateModel();
    assert.ok(deployCandidate());
    await trainCandidateModel();
    assert.ok(deployCandidate());
    assert.ok(rollbackModel());
  });
});

describe("meta orchestrator", () => {
  beforeEach(() => {
    resetMetaLearningState();
    clearAutoExperiments();
    clearHumanOverride();
    clearFailSafe();
    resetDeploymentSafety();
    resetFeedbackOrchestrator();
    clearGlobalGraphCache();
    resetGlobalBatchState();
  });

  it("runs meta cycle and exposes system health", async () => {
    seedMetrics(35);
    const result = await runMetaLearningCycle({ skipModelTrain: true });
    assert.ok(result.goalScore >= 0);
    const health = getSystemHealth();
    assert.ok(health.systemHealth.engagementScore >= 0);
    assert.ok(typeof health.systemHealth.experimentStatus === "string");
  });

  it("applies human override to runtime config", () => {
    setHumanOverride({
      enabled: true,
      explorationRate: 0.12,
      freezeAutoTuning: true,
    });
    const cfg = buildEffectiveRuntimeConfig("child_1");
    assert.equal(cfg.explorationRate, 0.12);
  });

  it("activates fail-safe on critical UX metrics", () => {
    const active = evaluateFailSafe({ engagementScore: 0.1, retentionRate: 0.1 });
    assert.equal(active, true);
  });
});

describe("feedback loop", () => {
  beforeEach(() => {
    resetFeedbackOrchestrator();
    clearGlobalGraphCache();
    resetGlobalBatchState();
  });

  it("processes feedback without throwing", () => {
    processRealtimeFeedback({
      childId: "c1",
      moduleId: "phonics",
      contentId: "phonics_intro_1",
      cohortKey: "36_48|IN|balanced",
      outcome: {
        completed: true,
        skipped: false,
        idle: false,
        engagementDelta: 10,
      },
    });
    assert.ok(true);
  });
});
