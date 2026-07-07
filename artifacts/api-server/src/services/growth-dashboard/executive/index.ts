import { computeCtoOps } from "./cto-ops.js";
import { computeFeatureImpact } from "./feature-impact.js";
import { computeBusinessHealth, computeGrowthScore } from "./health-score.js";
import {
  generateAlerts,
  generateAmyInsights,
  generateRecommendations,
  generateRootCauses,
} from "./intelligence.js";
import { computePredictions } from "./predictions.js";
import { attachGrowthScoreToSummary, computeExecutiveSummary } from "./summary.js";
import { computeExecutiveTimeline } from "./timeline.js";
import type { ExecutiveIntelligence, GrowthDashboardPayload, GrowthTimeRange } from "../types.js";

export async function buildExecutiveIntelligence(
  range: GrowthTimeRange,
  data: {
    kpis: GrowthDashboardPayload["kpis"];
    funnel: GrowthDashboardPayload["funnel"];
    campaigns: GrowthDashboardPayload["campaigns"];
    retention: GrowthDashboardPayload["retention"];
    previousRetention: GrowthDashboardPayload["retention"];
    features: GrowthDashboardPayload["features"];
    subscriptions: GrowthDashboardPayload["subscriptions"];
    performance: GrowthDashboardPayload["performance"];
    devices: GrowthDashboardPayload["devices"];
    charts: GrowthDashboardPayload["charts"];
  },
): Promise<ExecutiveIntelligence> {
  const growthScore = computeGrowthScore(data);
  const baseSummary = await computeExecutiveSummary(data.kpis, data.subscriptions, data.funnel);
  const summary = attachGrowthScoreToSummary(baseSummary, growthScore.overall);
  const businessHealth = computeBusinessHealth({
    growthScore,
    kpis: data.kpis,
    funnel: data.funnel,
    retention: data.retention,
    performance: data.performance,
  });

  const [featureImpact, timeline, ctoOps] = await Promise.all([
    computeFeatureImpact(range),
    computeExecutiveTimeline(range),
    computeCtoOps({ performance: data.performance, devices: data.devices }),
  ]);

  const amyInsights = generateAmyInsights({
    funnel: data.funnel,
    features: data.features,
    kpis: data.kpis,
    retention: data.retention,
    previousRetention: data.previousRetention,
  });

  const rootCauses = generateRootCauses({
    funnel: data.funnel,
    features: data.features,
    kpis: data.kpis,
    performance: data.performance,
    retention: data.retention,
  });

  const recommendations = generateRecommendations({
    campaigns: data.campaigns,
    funnel: data.funnel,
    features: data.features,
    kpis: data.kpis,
    performance: data.performance,
    retention: data.retention,
  });

  const alerts = generateAlerts({
    kpis: data.kpis,
    retention: data.retention,
    performance: data.performance,
    subscriptions: data.subscriptions,
  });

  const predictions = computePredictions({
    kpis: data.kpis,
    subscriptions: data.subscriptions,
    charts: data.charts,
  });

  return {
    summary,
    businessHealth,
    growthScore,
    amyInsights,
    rootCauses,
    recommendations,
    featureImpact,
    timeline,
    alerts,
    predictions,
    ctoOps,
  };
}
