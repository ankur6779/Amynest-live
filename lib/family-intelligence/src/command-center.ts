import type { FamilyIntelligenceSnapshot } from "./types.js";

export interface CommandCenterView {
  familyHealth: {
    score: number;
    trend7d: number;
    trendLabel: string;
    components: FamilyIntelligenceSnapshot["health"]["components"];
  };
  risk: {
    overall: number;
    primary: string;
    breakdown: {
      routine: number;
      learning: number;
      parentChurn: number;
      subscription: number;
    };
  };
  growth: {
    successMetrics: FamilyIntelligenceSnapshot["successMetrics"];
    moments: FamilyIntelligenceSnapshot["moments"];
  };
  goals: FamilyIntelligenceSnapshot["goals"];
  predictions: FamilyIntelligenceSnapshot["predictiveInterventions"];
  recommendedActions: FamilyIntelligenceSnapshot["allActions"];
  orchestration: FamilyIntelligenceSnapshot["orchestration"];
  digitalTwin: FamilyIntelligenceSnapshot["digitalTwin"];
  weeklyReport: FamilyIntelligenceSnapshot["weeklyReport"];
  computedAt: string;
}

export function buildCommandCenter(snapshot: FamilyIntelligenceSnapshot): CommandCenterView {
  const trendLabel =
    snapshot.health.trend7d >= 5 ? "improving" :
    snapshot.health.trend7d <= -5 ? "declining" : "stable";

  return {
    familyHealth: {
      score: snapshot.health.score,
      trend7d: snapshot.health.trend7d,
      trendLabel,
      components: snapshot.health.components,
    },
    risk: {
      overall: snapshot.risks.overallRisk,
      primary: snapshot.risks.primaryRisk,
      breakdown: {
        routine: snapshot.risks.routineCollapseRisk,
        learning: snapshot.risks.learningDisengagementRisk,
        parentChurn: snapshot.risks.parentChurnRisk,
        subscription: snapshot.risks.subscriptionChurnRisk,
      },
    },
    growth: {
      successMetrics: snapshot.successMetrics,
      moments: snapshot.moments,
    },
    goals: snapshot.goals,
    predictions: snapshot.predictiveInterventions,
    recommendedActions: snapshot.allActions,
    orchestration: snapshot.orchestration,
    digitalTwin: snapshot.digitalTwin,
    weeklyReport: snapshot.weeklyReport,
    computedAt: snapshot.computedAt,
  };
}
