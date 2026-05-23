import {
  buildFamilyGraph,
  getFamilyGraph,
  getLearningGraph,
  getInternalComparisons,
  toFamilyGraphRecord,
  getFamilyGraphStore,
} from "./familyGraphEngine.js";
import { crossChildSignalsForChild } from "./siblingInfluence.js";
import { buildParentDashboard } from "./familyInsightsEngine.js";
import { predictFamilyRisk, familyWideExperienceAdjustment } from "./familyPrediction.js";
import { applyCrossChildToPrediction } from "./crossChildPersonalization.js";
import { suggestSharedContent } from "./resourceOptimization.js";
import type {
  ChildFamilySnapshot,
  FamilyApiPayload,
  FamilyId,
  ParentDashboardPayload,
} from "./types-family.js";
import type { PredictionOutput } from "./types-prediction.js";

export type RefreshFamilyContextResult = {
  graph: ReturnType<typeof getFamilyGraph>;
  learningGraph: ReturnType<typeof getLearningGraph>;
  dashboard: ParentDashboardPayload;
  familyRisk: ReturnType<typeof predictFamilyRisk>;
  sharedContent: ReturnType<typeof suggestSharedContent>;
};

/**
 * Full family intelligence refresh (parent-scoped).
 */
export async function refreshFamilyIntelligence(
  familyId: FamilyId,
  snapshots: ChildFamilySnapshot[],
): Promise<RefreshFamilyContextResult> {
  const graph = buildFamilyGraph(familyId, snapshots);
  const learningGraph = getLearningGraph(familyId)!;
  const dashboard = buildParentDashboard(graph, learningGraph, snapshots);
  const familyRisk = predictFamilyRisk(snapshots, graph);
  const sharedContent = suggestSharedContent(learningGraph, snapshots);

  const record = toFamilyGraphRecord(familyId, dashboard.insights);
  record.insights = dashboard.insights;
  await getFamilyGraphStore().upsert(record);

  return {
    graph,
    learningGraph,
    dashboard,
    familyRisk,
    sharedContent,
  };
}

export function toFamilyApiPayload(
  dashboard: ParentDashboardPayload,
): FamilyApiPayload {
  return {
    family: {
      insights: dashboard.insights,
      recommendations: dashboard.recommendations,
      childComparisons: dashboard.childComparisons,
      familySummary: dashboard.familySummary,
    },
  };
}

/**
 * Apply family signals to a child's prediction (child-first, gentle nudge).
 */
export function enhancePredictionWithFamily(
  childId: string,
  familyId: FamilyId,
  prediction: PredictionOutput,
  snapshots: ChildFamilySnapshot[],
): PredictionOutput {
  const graph = getFamilyGraph(familyId);
  const learningGraph = getLearningGraph(familyId);
  if (!graph || !learningGraph) return prediction;

  const comparisons = getInternalComparisons(familyId);
  const signals = crossChildSignalsForChild(
    childId,
    graph,
    comparisons,
    snapshots,
  );
  return applyCrossChildToPrediction(
    prediction,
    signals,
    learningGraph,
    childId,
  );
}

export function getFamilyWideBoosts(familyId: FamilyId, snapshots: ChildFamilySnapshot[]) {
  const graph = getFamilyGraph(familyId);
  if (!graph) return { explorationBoostAll: 0, rewardBoostAll: 0 };
  const risk = predictFamilyRisk(snapshots, graph);
  return familyWideExperienceAdjustment(risk);
}
