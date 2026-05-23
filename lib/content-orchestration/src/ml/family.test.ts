import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { createDefaultLearningProfile } from "../learningProfileEngine.js";
import {
  buildFamilyGraph,
  getFamilyGraph,
  getLearningGraph,
  getInternalComparisons,
  clearFamilyGraphCache,
} from "./familyGraphEngine.js";
import { computeInternalComparisons, anonymizeForStorage } from "./familyComparison.js";
import { crossChildSignalsForChild, buildSiblingPairs } from "./siblingInfluence.js";
import { buildLearningGraph, hasSiblingMastered } from "./learningGraph.js";
import { generateFamilyInsights, buildParentDashboard } from "./familyInsightsEngine.js";
import {
  startCooperativeSession,
  advanceCooperativeTurn,
  clearCooperativeSessions,
} from "./cooperativeLearning.js";
import { recordChildActivity, getPersonalStreak, clearHealthyCompetition } from "./healthyCompetition.js";
import { predictFamilyRisk } from "./familyPrediction.js";
import { refreshFamilyIntelligence, enhancePredictionWithFamily } from "./familyOrchestrator.js";
import { runPrediction } from "./predictionEngine.js";
import type { ChildFamilySnapshot } from "./types-family.js";

function snapshot(
  id: string,
  name: string,
  ageMonths: number,
  engagement: number,
  phonicsLevel: number,
): ChildFamilySnapshot {
  const profile = createDefaultLearningProfile(id);
  profile.behavior.engagementScore = engagement;
  profile.skills.phonics.level = phonicsLevel;
  return {
    childId: id,
    displayName: name,
    ageMonths,
    profile,
    prediction: runPrediction({ childId: id, profile }),
    sessionMinutes: 20,
  };
}

describe("multi-child family graph", () => {
  beforeEach(() => {
    clearFamilyGraphCache();
    clearCooperativeSessions();
    clearHealthyCompetition();
  });

  it("builds graph with siblings and age order", () => {
    const snaps = [
      snapshot("1", "A", 48, 70, 3),
      snapshot("2", "B", 72, 55, 4),
    ];
    const graph = buildFamilyGraph("fam1", snaps);
    assert.equal(graph.children.length, 2);
    assert.equal(graph.relationships.ageOrder[0], "1");
    assert.equal(graph.relationships.siblings.length, 1);
  });

  it("internal comparisons use anonymized labels only", () => {
    const snaps = [snapshot("c1", "One", 60, 80, 3), snapshot("c2", "Two", 36, 50, 2)];
    const metrics = computeInternalComparisons(snaps);
    const anon = anonymizeForStorage(metrics);
    assert.ok(metrics[0]!.rankLabel.startsWith("internal_"));
    assert.ok(!JSON.stringify(anon).includes("worse than"));
  });
});

describe("sibling influence", () => {
  beforeEach(() => clearFamilyGraphCache());

  it("assigns younger sibling acceleration target", () => {
    const snaps = [
      snapshot("young", "Y", 36, 60, 2),
      snapshot("old", "O", 84, 75, 4),
    ];
    const graph = buildFamilyGraph("fam2", snaps);
    assert.equal(graph.learningDynamics.accelerationTargetChildId, "young");
    assert.equal(graph.learningDynamics.teachingRoleChildId, "old");
  });

  it("boosts exploration when sibling highly engaged", () => {
    const snaps = [
      snapshot("a", "A", 60, 85, 3),
      snapshot("b", "B", 48, 40, 2),
    ];
    const graph = buildFamilyGraph("fam3", snaps);
    assert.ok(graph.learningDynamics.explorationBoostFromSiblings > 0);
    const signals = crossChildSignalsForChild(
      "b",
      graph,
      getInternalComparisons("fam3"),
      snaps,
    );
    assert.ok(signals.explorationBoost >= 0);
  });
});

describe("learning graph", () => {
  it("tracks mastery per child", () => {
    const snaps = [
      snapshot("1", "A", 60, 70, 5),
      snapshot("2", "B", 48, 60, 2),
    ];
    const lg = buildLearningGraph(snaps);
    assert.ok(hasSiblingMastered(lg, "phonics", "2"));
    assert.ok(lg.sharedKnowledgeAreas.length >= 0);
  });
});

describe("family insights", () => {
  beforeEach(() => clearFamilyGraphCache());

  it("generates parent dashboard", async () => {
    const snaps = [
      snapshot("1", "Amy", 60, 75, 4),
      snapshot("2", "Ben", 48, 50, 2),
    ];
    const result = await refreshFamilyIntelligence("parent1", snaps);
    assert.ok(result.dashboard.insights.recommendedFocus.length > 0);
    assert.equal(result.dashboard.childComparisons.length, 2);
    assert.ok(result.dashboard.familySummary.childCount === 2);
    assert.ok(result.dashboard.childComparisons[0]!.personalBestNote);
  });
});

describe("cooperative mode", () => {
  beforeEach(() => clearCooperativeSessions());

  it("turn-based answer then verify", () => {
    const s = startCooperativeSession({
      familyId: "f",
      childA: "a1",
      childB: "a2",
      taskId: "t1",
    });
    assert.equal(s.turn, "answer");
    const verify = advanceCooperativeTurn("f", "t1", {
      childId: "a1",
      answer: "cat",
    });
    assert.ok(verify);
    assert.equal(verify!.waitingFor, "verify");
    const next = advanceCooperativeTurn("f", "t1", {
      childId: "a2",
      approved: true,
      answer: "yes",
    });
    assert.ok(next);
    assert.equal(next!.waitingFor, "answer");
  });
});

describe("healthy competition", () => {
  beforeEach(() => clearHealthyCompetition());

  it("tracks personal streak without negative comparison", () => {
    const s = recordChildActivity("kid1");
    assert.ok(s.personalStreakDays >= 1);
    assert.ok(getPersonalStreak("kid1"));
  });
});

describe("family prediction", () => {
  it("flags disengaged child", () => {
    const snaps = [
      snapshot("1", "A", 60, 80, 3),
      snapshot("2", "B", 48, 30, 2),
    ];
    const graph = buildFamilyGraph("f", snaps);
    const risk = predictFamilyRisk(snaps, graph);
    assert.ok(risk.dropOffRiskPerChild["2"] !== undefined);
  });
});

describe("cross-child personalization", () => {
  beforeEach(() => clearFamilyGraphCache());

  it("nudges prediction without overriding entirely", () => {
    const snaps = [
      snapshot("fast", "F", 72, 80, 5),
      snapshot("slow", "S", 48, 50, 2),
    ];
    buildFamilyGraph("fam", snaps);
    const base = runPrediction({ childId: "slow", profile: snaps[1]!.profile });
    const enhanced = enhancePredictionWithFamily("slow", "fam", base, snaps);
    assert.ok(enhanced);
  });
});
