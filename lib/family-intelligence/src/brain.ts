import type { FamilyIntelligenceInput, FamilyIntelligenceSnapshot } from "./types.js";
import { computeHealthScore } from "./health-score.js";
import { assessFamilyRisk, generateInterventionPlans } from "./risk-engine.js";
import { detectFamilyMoments } from "./moment-detection.js";
import { buildDigitalTwin, applyMemoryToTwin } from "./digital-twin.js";
import { prioritizeActions, selectTopAction } from "./action-prioritizer.js";
import { buildOrchestrationPlan } from "./orchestrator.js";
import { generateWeeklyReport } from "./weekly-report.js";
import { generatePredictiveInterventions } from "./predictive-interventions.js";
import { alignGoalsWithSignals } from "./goal-engine.js";
import { computeSuccessMetrics } from "./success-metrics.js";
import { memoryInfluencedStrategy } from "./memory-system.js";

export const FAMILY_INTELLIGENCE_ENGINE_VERSION = "family-intelligence-v1";

/**
 * Unified Family Intelligence Layer — single brain for all product decisions.
 */
export function computeFamilyIntelligence(
  input: FamilyIntelligenceInput,
): FamilyIntelligenceSnapshot {
  const health = computeHealthScore(input);
  const risks = assessFamilyRisk(input);
  const interventionPlans = generateInterventionPlans(risks, input);
  const moments = detectFamilyMoments(input);
  const goals = alignGoalsWithSignals(input);
  const predictiveInterventions = generatePredictiveInterventions(input);

  let digitalTwin = buildDigitalTwin(input, input.recentMemory);
  digitalTwin = applyMemoryToTwin(digitalTwin, input.recentMemory);

  const memoryHints = memoryInfluencedStrategy(input.recentMemory);
  if (memoryHints.preferredLearningStyle) {
    digitalTwin.learningStyle = memoryHints.preferredLearningStyle;
  }
  if (memoryHints.preferredNotificationStyle) {
    digitalTwin.engagementStyle = memoryHints.preferredNotificationStyle;
  }

  const allActions = prioritizeActions(risks, interventionPlans, input);
  const topAction = selectTopAction(allActions);
  const orchestration = buildOrchestrationPlan(topAction, moments, goals, input);
  const weeklyReport = generateWeeklyReport(input, health);
  const successMetrics = computeSuccessMetrics(input, health);

  return {
    userId: input.userId,
    primaryChildId: input.primaryChildId,
    childName: input.childName,
    health,
    risks,
    interventionPlans,
    moments,
    digitalTwin,
    topAction,
    allActions,
    weeklyReport,
    predictiveInterventions,
    goals,
    successMetrics,
    memory: input.recentMemory,
    orchestration,
    engineVersion: FAMILY_INTELLIGENCE_ENGINE_VERSION,
    computedAt: new Date().toISOString(),
  };
}

export function getTopPriorityForNotifications(
  snapshot: FamilyIntelligenceSnapshot,
): { goal: string | null; suppressLowPriority: boolean } {
  const top = snapshot.topAction;
  if (!top) {
    return { goal: null, suppressLowPriority: false };
  }
  return {
    goal: top.category,
    suppressLowPriority: top.suppressOthers,
  };
}
