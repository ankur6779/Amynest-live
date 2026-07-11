import type { GrowthObservatoryPayload } from "../growth-observatory/types.js";
import type { OpportunityItem } from "../growth-observatory/types.js";
import type { ScoredOpportunity } from "./types.js";
import {
  computePriorityScore,
  confidenceLabel,
  validateEvidence,
} from "./safety.js";

function scoreOpportunityItem(
  item: OpportunityItem,
  categoryWeights: {
    revenue: number;
    retention: number;
    activation: number;
    technical: number;
  },
): ScoredOpportunity {
  const confMap = { high: 85, medium: 65, low: 45 };
  const confidence = confMap[item.confidence];
  const businessImpact = Math.min(100, item.affectedUsers * 2);

  const scores = {
    businessImpact,
    confidence,
    effort: item.engineeringEffort === "S" ? 90 : item.engineeringEffort === "M" ? 60 : 35,
    revenueImpact: categoryWeights.revenue,
    retentionImpact: categoryWeights.retention,
    activationImpact: categoryWeights.activation,
    technicalRisk: categoryWeights.technical,
  };

  const priorityScore = computePriorityScore({
    ...scores,
    effort: item.engineeringEffort,
    affectedUsers: item.affectedUsers,
  });

  return {
    id: `opp_${item.category}_${item.rank}`,
    title: item.title,
    category: item.category,
    evidence: item.evidence,
    affectedUsers: item.affectedUsers,
    priorityScore,
    scores,
    estimatedImpact: item.estimatedImpact,
    engineeringEffort: item.engineeringEffort,
    confidenceLabel: item.confidence,
    status: validateEvidence({
      verified: item.verified,
      users: item.affectedUsers,
      confidence,
    }),
  };
}

export function rankOpportunities(observatory: GrowthObservatoryPayload): ScoredOpportunity[] {
  const all: OpportunityItem[] = [
    ...observatory.opportunities.growth,
    ...observatory.opportunities.revenue,
    ...observatory.opportunities.retention,
    ...observatory.opportunities.technical,
  ];

  const weightsByCategory = {
    growth: { revenue: 20, retention: 40, activation: 90, technical: 10 },
    revenue: { revenue: 95, retention: 30, activation: 40, technical: 15 },
    retention: { revenue: 35, retention: 95, activation: 50, technical: 10 },
    technical: { revenue: 25, retention: 40, activation: 60, technical: 90 },
  };

  return all
    .map((item) =>
      scoreOpportunityItem(item, weightsByCategory[item.category]),
    )
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((item, i) => ({ ...item, id: `opp_rank_${i + 1}` }));
}
