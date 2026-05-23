import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  normalizeFeatures,
  extractNbaFeatures,
  FEATURE_DIM,
  slope,
  computeTrendFeatures,
  computeActionStability,
  normalizeRewardValue,
} from "./featureExtractor.js";
import {
  createDefaultModelWeights,
  GradientBoostedActionModel,
  resetSharedActionModel,
  computeRewardVariance,
  resolveLearningRate,
} from "./model.js";
import {
  computeRewardSignal,
  computeContextAwareReward,
} from "./trainingPipeline.js";
import { evaluateHybridRealtimeDecision, weightedSelect, DEFAULT_MIN_ML_WEIGHT } from "./hybridDecision.js";
import { applySafetyScorePenalties } from "./safetyGuard.js";
import {
  ucbSelect,
  createBanditState,
  guidedExplorationSelect,
  weightedSelection,
} from "./banditEngine.js";
import { applyOscillationGuard, countDirectionChanges } from "./oscillationGuard.js";
import { buildSegmentKey, resetSegmentModelRegistry } from "./segmentModels.js";
import { resolveEffectiveMlFlags, resetDeploymentSafety, configureDeploymentSafety, ML_ROLLOUT_STAGES } from "./deploymentSafety.js";
import { NBA_ACTIONS } from "./types.js";
import { isChildInMlTraffic, clearBanditState } from "./nbaEngine.js";
import { clearMlMetrics, computeMlMetrics } from "./metrics.js";
import { createDefaultLearningProfile } from "../learningProfileEngine.js";
import { createAttentionState } from "../realtime/attentionEngine.js";
import type { RealtimeSessionState } from "../realtime/types.js";
import { DEFAULT_ML_EXPERIMENTS } from "./types.js";
import { resetGlobalTrainingPipeline } from "./trainingPipeline.js";

function mockState(): RealtimeSessionState {
  const profile = createDefaultLearningProfile("ml-child");
  return {
    childId: "ml-child",
    sessionPlan: [
      { slot: "warmup", moduleId: "phonics", contentId: "c1", contentType: "learning", difficulty: "easy" },
      { slot: "core", moduleId: "motor_skills", contentId: "c2", contentType: "interactive", difficulty: "medium" },
    ],
    currentIndex: 0,
    profile,
    attention: createAttentionState(),
    liveDifficulty: {
      baseDifficulty: "easy",
      baseLevel: 2,
      liveLevel: 2,
      liveDifficulty: "easy",
      adjustments: 0,
    },
    recentEvents: [],
    explorationRate: 0.2,
    startedAt: Date.now(),
    lastEventAt: Date.now(),
    ageBand: "24_36",
    developmentStage: "toddler",
    recentNbaActions: [],
  };
}

describe("featureExtractor", () => {
  it("normalizes all features to 0-1", () => {
    const state = mockState();
    const features = extractNbaFeatures(
      state,
      {
        type: "CONTENT_STARTED",
        childId: "ml-child",
        contentId: "c1",
        moduleId: "phonics",
        timestamp: Date.now(),
      },
      state.attention,
      { ageBand: "24_36", developmentStage: "toddler", countryCode: "US" },
    );
    const norm = normalizeFeatures(features);
    assert.equal(norm.values.length, FEATURE_DIM);
    for (let i = 0; i < norm.values.length; i++) {
      assert.ok(norm.values[i]! >= 0 && norm.values[i]! <= 1);
    }
    assert.ok(features.segmentKey.includes("24_36"));
  });

  it("computes trend slopes in 0-1 range", () => {
    const trends = computeTrendFeatures(
      [
        { type: "CONTENT_SKIPPED", childId: "c", contentId: "1", moduleId: "phonics", timestamp: 1 },
        { type: "CONTENT_SKIPPED", childId: "c", contentId: "2", moduleId: "phonics", timestamp: 2 },
        { type: "CONTENT_COMPLETED", childId: "c", contentId: "3", moduleId: "phonics", timestamp: 3, metadata: { responseTime: 2000 } },
      ],
      0.7,
    );
    assert.ok(trends.skipTrend >= 0 && trends.skipTrend <= 1);
    assert.ok(trends.engagementTrend >= 0 && trends.engagementTrend <= 1);
  });

  it("slope helper returns mid value for flat series", () => {
    assert.equal(slope([0.5, 0.5, 0.5]), 0.5);
  });
});

describe("action stability", () => {
  it("computes stability penalty from direction changes", () => {
    const s = computeActionStability([
      "INCREASE_DIFFICULTY",
      "DECREASE_DIFFICULTY",
      "INCREASE_DIFFICULTY",
    ]);
    assert.ok(s.actionChangeFrequency >= 1);
    assert.equal(s.stabilityPenalty, s.actionChangeFrequency * 0.2);
  });

  it("oscillation guard prefers KEEP_AS_IS", () => {
    const guarded = applyOscillationGuard("INCREASE_DIFFICULTY", [
      "INCREASE_DIFFICULTY",
      "DECREASE_DIFFICULTY",
      "INCREASE_DIFFICULTY",
    ]);
    assert.equal(guarded, "KEEP_AS_IS");
  });

  it("countDirectionChanges tracks flips", () => {
    assert.ok(countDirectionChanges(["INCREASE_DIFFICULTY", "DECREASE_DIFFICULTY"]) >= 1);
  });
});

describe("model", () => {
  beforeEach(() => {
    resetSharedActionModel();
    resetSegmentModelRegistry();
  });

  it("predict returns action and confidence", () => {
    const model = new GradientBoostedActionModel(createDefaultModelWeights());
    const state = mockState();
    const features = extractNbaFeatures(
      state,
      {
        type: "CONTENT_COMPLETED",
        childId: "ml-child",
        contentId: "c1",
        moduleId: "phonics",
        timestamp: Date.now(),
        metadata: { responseTime: 800, correct: true },
      },
      state.attention,
      { ageBand: "24_36", developmentStage: "toddler" },
    );
    const pred = model.predict(normalizeFeatures(features));
    assert.ok(pred.confidence > 0);
    assert.ok(pred.action);
  });

  it("skips online update when batch below minimum", () => {
    const model = new GradientBoostedActionModel(createDefaultModelWeights());
    const norm = normalizeFeatures(
      extractNbaFeatures(
        mockState(),
        {
          type: "CONTENT_STARTED",
          childId: "ml-child",
          contentId: "c1",
          moduleId: "phonics",
          timestamp: Date.now(),
        },
        createAttentionState(),
        { ageBand: "24_36", developmentStage: "toddler" },
      ),
    );
    const before = model.version;
    const ok = model.safeOnlineUpdate(norm, "KEEP_AS_IS", 0.5, { minBatchSize: 20, batchRewards: [0.5] });
    assert.equal(ok, false);
    assert.equal(model.version, before);
  });

  it("reduces learning rate on high reward variance", () => {
    const low = resolveLearningRate(0.1, 0.98, [0.1, 0.2, 0.15]);
    const high = resolveLearningRate(0.1, 0.98, [-1, 1.5, -0.5, 1.2]);
    assert.ok(high < low);
    assert.ok(computeRewardVariance([-1, 1.5]) > 0.35);
  });
});

describe("context-aware reward", () => {
  it("assigns +1.2 normalized cap for completion at skill", () => {
    const r = computeContextAwareReward({
      outcome: { completed: true, skipped: false, idle: false, engagementDelta: 0 },
      difficultyLevel: 3,
      skillLevel: 2,
    });
    assert.equal(r.rawReward, 1.2);
    assert.equal(r.normalizedReward, 1.2);
  });

  it("assigns +0.6 when completed below skill", () => {
    const r = computeContextAwareReward({
      outcome: { completed: true, skipped: false, idle: false, engagementDelta: 0 },
      difficultyLevel: 1,
      skillLevel: 3,
    });
    assert.equal(r.rawReward, 0.6);
  });

  it("assigns -1 for skip", () => {
    assert.equal(
      computeRewardSignal({ completed: false, skipped: true, idle: false, engagementDelta: 0 }),
      -1,
    );
  });

  it("assigns -0.7 for idle", () => {
    const r = computeContextAwareReward({
      outcome: { completed: false, skipped: false, idle: true, engagementDelta: 0 },
      difficultyLevel: 2,
      skillLevel: 2,
    });
    assert.equal(r.rawReward, -0.7);
  });

  it("clamps normalized reward to [-1, 1.5]", () => {
    const r = computeContextAwareReward({
      outcome: {
        completed: true,
        skipped: false,
        idle: false,
        engagementDelta: 20,
        engagementHigh: true,
        exploredContent: true,
      },
      difficultyLevel: 3,
      skillLevel: 2,
    });
    assert.ok(r.rawReward > 1.5);
    assert.equal(r.normalizedReward, normalizeRewardValue(r.rawReward));
    assert.ok(r.normalizedReward <= 1.5);
  });
});

describe("hybridDecision", () => {
  beforeEach(() => {
    clearMlMetrics();
    resetGlobalTrainingPipeline();
    clearBanditState("ml-child");
    resetDeploymentSafety();
    configureDeploymentSafety({
      rolloutStageIndex: ML_ROLLOUT_STAGES.length - 1,
      forceRuleFallback: false,
    });
    resetSegmentModelRegistry();
  });

  it("uses weighted hybrid blend when ML enabled and in traffic", () => {
    const state = mockState();
    const decision = evaluateHybridRealtimeDecision(
      state,
      {
        type: "CONTENT_COMPLETED",
        childId: "ml-child",
        contentId: "c1",
        moduleId: "phonics",
        timestamp: Date.now(),
        metadata: { responseTime: 500, correct: true },
      },
      state.attention,
      {
        mlFlags: {
          ...DEFAULT_ML_EXPERIMENTS,
          mlTrafficPercentage: 1,
          minMlParticipationWeight: DEFAULT_MIN_ML_WEIGHT,
        },
        ctx: { ageBand: "24_36", developmentStage: "toddler" },
        logTraining: false,
      },
    );
    assert.ok(decision.source === "ml" || decision.source === "rule");
    assert.ok(decision.confidence !== undefined);
    assert.ok((state.recentNbaActions?.length ?? 0) <= 3);
  });

  it("weighted hybrid selects ML at least min participation rate over many events", () => {
    const state = mockState();
    let mlCount = 0;
    const trials = 120;
    for (let i = 0; i < trials; i++) {
      const decision = evaluateHybridRealtimeDecision(
        state,
        {
          type: i % 3 === 0 ? "CONTENT_SKIPPED" : "CONTENT_COMPLETED",
          childId: "ml-child",
          contentId: "c1",
          moduleId: "phonics",
          timestamp: Date.now() + i,
          metadata: { responseTime: 500 + i, correct: i % 4 !== 0 },
        },
        state.attention,
        {
          mlFlags: {
            ...DEFAULT_ML_EXPERIMENTS,
            mlTrafficPercentage: 1,
            minMlParticipationWeight: DEFAULT_MIN_ML_WEIGHT,
          },
          ctx: { ageBand: "24_36", developmentStage: "toddler" },
          logTraining: false,
        },
      );
      if (decision.source === "ml") mlCount += 1;
    }
    const mlRate = mlCount / trials;
    assert.ok(
      mlRate >= DEFAULT_MIN_ML_WEIGHT - 0.12,
      `expected ML rate >= ${DEFAULT_MIN_ML_WEIGHT - 0.12}, got ${mlRate.toFixed(2)}`,
    );
  });

  it("weightedSelect returns candidate with proportional weights", () => {
    const picked = weightedSelect(
      [
        { weight: 0.7, source: "ml" as const, nbaAction: "KEEP_AS_IS" as const },
        { weight: 0.3, source: "rule" as const, nbaAction: "KEEP_AS_IS" as const },
      ],
      0.1,
    );
    assert.equal(picked.source, "ml");
  });

  it("falls back to rules when ML disabled", () => {
    const state = mockState();
    const decision = evaluateHybridRealtimeDecision(
      state,
      {
        type: "CONTENT_SKIPPED",
        childId: "ml-child",
        contentId: "c1",
        moduleId: "phonics",
        timestamp: Date.now(),
      },
      state.attention,
      {
        mlFlags: { ...DEFAULT_ML_EXPERIMENTS, mlEnabled: false },
        ctx: { ageBand: "24_36", developmentStage: "toddler" },
      },
    );
    assert.equal(decision.source, "rule");
    assert.equal(decision.fallbackUsed, true);
  });
});

describe("safetyGuard", () => {
  it("soft-penalizes increase at max difficulty instead of hard block", () => {
    const state = mockState();
    state.liveDifficulty.liveLevel = 5;
    const model = new GradientBoostedActionModel(createDefaultModelWeights());
    const features = extractNbaFeatures(
      state,
      {
        type: "CONTENT_COMPLETED",
        childId: "ml-child",
        contentId: "c1",
        moduleId: "phonics",
        timestamp: Date.now(),
      },
      state.attention,
      { ageBand: "0_24", developmentStage: "infant" },
    );
    const pred = model.predict(normalizeFeatures(features));
    const adjusted = applySafetyScorePenalties(pred, state, { ageBand: "0_24" });
    assert.ok((adjusted.probabilities.INCREASE_DIFFICULTY ?? 1) < (pred.probabilities.INCREASE_DIFFICULTY ?? 0));
  });
});

describe("bandit guided exploration", () => {
  it("weightedSelection respects weights", () => {
    const picks: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 200; i++) {
      const p = weightedSelection(
        [
          { action: "a", weight: 0.9 },
          { action: "b", weight: 0.1 },
        ],
        i / 200,
      );
      picks[p]! += 1;
    }
    assert.ok(picks.a! > picks.b!);
  });

  it("guided exploration can pick ML action", () => {
    const state = createBanditState();
    const probs = Object.fromEntries(NBA_ACTIONS.map((a) => [a, 1 / NBA_ACTIONS.length])) as Record<
      import("./types.js").NbaAction,
      number
    >;
    const sel = guidedExplorationSelect(
      {
        action: "KEEP_AS_IS",
        confidence: 0.85,
        probabilities: probs,
        rewardEstimate: 0.5,
      },
      state,
      0.05,
      0,
      0.01,
    );
    assert.ok(NBA_ACTIONS.includes(sel.action));
  });

  it("UCB selects an action", () => {
    const state = createBanditState();
    const probs = Object.fromEntries(NBA_ACTIONS.map((a) => [a, 1 / NBA_ACTIONS.length])) as Record<
      import("./types.js").NbaAction,
      number
    >;
    const sel = ucbSelect(
      {
        action: "KEEP_AS_IS",
        confidence: 0.5,
        probabilities: probs,
        rewardEstimate: 0.5,
      },
      state,
    );
    assert.ok(sel.action);
  });
});

describe("segment models", () => {
  it("builds segment key from age, country, stage", () => {
    const key = buildSegmentKey({
      ageBand: "36_48",
      developmentStage: "preschooler",
      countryCode: "IN",
    });
    assert.equal(key, "36_48|IN|preschooler");
  });
});

describe("deployment safety", () => {
  beforeEach(() => resetDeploymentSafety());

  it("resolves rollout traffic from stages", () => {
    const flags = resolveEffectiveMlFlags(DEFAULT_ML_EXPERIMENTS, undefined, {
      mlRolloutStage: "2",
    });
    assert.equal(flags.mlTrafficPercentage, ML_ROLLOUT_STAGES[2]);
  });
});

describe("ml traffic", () => {
  it("assigns stable bucket per child", () => {
    assert.equal(isChildInMlTraffic("abc", 1), true);
    assert.equal(isChildInMlTraffic("abc", 0), false);
  });
});

describe("metrics", () => {
  beforeEach(() => clearMlMetrics());

  it("returns extended long-term metric fields", () => {
    const m = computeMlMetrics();
    assert.ok("sessionReturnRate" in m);
    assert.ok("nextDayRetention" in m);
    assert.ok("avgSessionLengthDelta" in m);
  });
});
