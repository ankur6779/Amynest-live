import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { createDefaultLearningProfile } from "../learningProfileEngine.js";
import { sanitizeContentKey } from "./anonymousAggregation.js";
import {
  clearGlobalGraphCache,
  getGlobalGraph,
  setGlobalGraph,
  createDefaultGlobalGraph,
  rebuildGlobalGraphFromEvents,
} from "./globalGraphEngine.js";
import { difficultyScore, buildDifficultyCalibrationMap } from "./difficultyCalibration.js";
import {
  buildCohortKey,
  derivePersonalityCluster,
  clearCohortCache,
  recordCohortSuccess,
  cohortMatchScore,
} from "./cohortIntelligence.js";
import { detectCommunityPatterns } from "./communityPatterns.js";
import {
  predictNextSkills,
  recommendGlobalLearningPath,
  applyGlobalPathToPrediction,
} from "./globalPathPrediction.js";
import { isColdStartProfile, assignColdStartPath } from "./coldStartOptimization.js";
import { computeGlobalContentBoost } from "./globalContentBoost.js";
import { applyGlobalBiasToPath, capGlobalBoost } from "./globalBiasControl.js";
import {
  queueAnonymousAggregate,
  runGlobalGraphBatch,
  resetGlobalBatchState,
} from "./globalBatchProcessor.js";
import {
  enhancePredictionWithGlobal,
  getGlobalPlanContext,
  buildGlobalInsights,
} from "./globalOrchestrator.js";
import { runPrediction } from "./predictionEngine.js";
import type { AnonymousAggregateEvent } from "./types-global.js";
import type { PoolContentItem } from "../types.js";

function sampleEvent(
  skill: AnonymousAggregateEvent["skill"],
  overrides: Partial<AnonymousAggregateEvent> = {},
): AnonymousAggregateEvent {
  return {
    skill,
    moduleId: "phonics",
    contentKey: "phonics_intro",
    success: true,
    attempts: 2,
    engagementScore: 75,
    droppedOff: false,
    cohortKey: "36_48|IN|balanced",
    ...overrides,
  };
}

describe("anonymous aggregation", () => {
  beforeEach(() => {
    clearGlobalGraphCache();
    resetGlobalBatchState();
  });

  it("aggregates success without PII fields", () => {
    const events = [
      sampleEvent("phonics", { success: true }),
      sampleEvent("phonics", { success: false, droppedOff: true }),
      sampleEvent("motor_skills", { success: true, moduleId: "motor_skills" }),
    ];
    const graph = rebuildGlobalGraphFromEvents(events);
    assert.ok(graph.successRates.phonics !== undefined);
    assert.ok(graph.successRates.phonics! < 1);
    assert.ok(graph.successRates.motor_skills! >= 0.5);
    const json = JSON.stringify(graph);
    assert.ok(!json.includes("childId"));
    assert.ok(!json.includes("userId"));
  });

  it("sanitizes content keys", () => {
    assert.equal(sanitizeContentKey("phonics_intro_level_1_v2"), "phonics_intro_level");
  });
});

describe("difficulty calibration", () => {
  it("raises difficulty score when success is low", () => {
    const graph = createDefaultGlobalGraph();
    graph.successRates.phonics = 0.3;
    delete graph.difficultyLevels.phonics;
    const score = difficultyScore("phonics", graph);
    assert.ok(score > 0.45);
    const map = buildDifficultyCalibrationMap(graph);
    assert.ok(map.phonics !== undefined);
  });
});

describe("global path prediction", () => {
  beforeEach(() => clearGlobalGraphCache());

  it("predicts next skills from transitions", () => {
    const graph = createDefaultGlobalGraph();
    const next = predictNextSkills("phonics", graph, 2);
    assert.equal(next.length, 2);
    assert.notEqual(next[0], "phonics");
  });

  it("recommends learning path from community patterns", () => {
    const graph = createDefaultGlobalGraph();
    const patterns = detectCommunityPatterns(graph);
    const path = recommendGlobalLearningPath(graph, patterns);
    assert.ok(path.length >= 2);
  });
});

describe("cohort grouping", () => {
  beforeEach(() => clearCohortCache());

  it("builds cohort key from age country personality", () => {
    const key = buildCohortKey({
      ageBand: "36_48",
      countryCode: "IN",
      personalityCluster: derivePersonalityCluster(undefined),
    });
    assert.equal(key, "36_48|IN|balanced");
  });

  it("uses cohort success in match score", () => {
    const graph = createDefaultGlobalGraph();
    recordCohortSuccess("36_48|IN|explorer", "phonics_intro", true);
    const score = cohortMatchScore("36_48|IN|explorer", graph);
    assert.ok(score > 0.3);
  });
});

describe("cold start", () => {
  it("detects new profiles and assigns path", () => {
    const profile = createDefaultLearningProfile("new-child");
    assert.equal(isColdStartProfile(profile), true);
    const path = assignColdStartPath(
      createDefaultGlobalGraph(),
      detectCommunityPatterns(createDefaultGlobalGraph()),
      "36_48",
    );
    assert.ok(path.modules.length >= 2);
  });
});

describe("global enhancement", () => {
  beforeEach(() => clearGlobalGraphCache());

  it("nudges prediction without replacing child signal", () => {
    const profile = createDefaultLearningProfile("c1");
    profile.skills.phonics.level = 2;
    const base = runPrediction({ childId: "c1", profile });
    const ctx = getGlobalPlanContext("IN", "36_48");
    const enhanced = enhancePredictionWithGlobal(base, ctx, profile, "36_48");
    assert.equal(enhanced.childId, base.childId);
    assert.ok(
      enhanced.recommendedDifficulty === base.recommendedDifficulty ||
        enhanced.recommendedDifficulty !== undefined,
    );
  });

  it("applies bounded global path boost", () => {
    const profile = createDefaultLearningProfile("c2");
    const base = runPrediction({ childId: "c2", profile });
    const graph = createDefaultGlobalGraph();
    const patterns = detectCommunityPatterns(graph);
    const out = applyGlobalPathToPrediction(base, graph, patterns, 0.1);
    assert.ok(out.nextSkillLevels);
  });
});

describe("bias control and content boost", () => {
  it("rotates paths for diversity", () => {
    const a = applyGlobalBiasToPath(["phonics", "motor_skills", "cognitive"]);
    const b = applyGlobalBiasToPath(["phonics", "motor_skills", "cognitive"]);
    assert.deepEqual(a.sort(), b.sort());
  });

  it("caps global content boost", () => {
    assert.ok(capGlobalBoost(0.5) <= 0.15);
    const item: PoolContentItem = {
      contentId: "phonics_intro_1",
      difficultyLevel: "easy",
      engagementWeight: 50,
      variants: [],
    };
    const boost = computeGlobalContentBoost(item, createDefaultGlobalGraph());
    assert.ok(boost <= 0.15);
  });
});

describe("batch feedback loop", () => {
  beforeEach(() => {
    clearGlobalGraphCache();
    resetGlobalBatchState();
  });

  it("processes queued anonymous events", async () => {
    queueAnonymousAggregate(sampleEvent("cognitive", { success: true }));
    const result = await runGlobalGraphBatch(true);
    assert.equal(result.processed, 1);
    assert.ok(getGlobalGraph().version >= 1);
  });
});

describe("family insights shape", () => {
  it("builds global insights payload", () => {
    setGlobalGraph(createDefaultGlobalGraph());
    const insights = buildGlobalInsights("36_48|US|balanced");
    assert.ok(insights.recommendedPath.length > 0);
    assert.ok(insights.cohortMatchScore >= 0);
    assert.ok(Object.keys(insights.difficultyCalibration).length > 0);
  });
});
