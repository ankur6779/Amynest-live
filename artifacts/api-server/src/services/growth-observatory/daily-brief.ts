import type { GrowthDashboardPayload } from "../growth-dashboard/types.js";
import type { GrowthObservatoryPayload, ObservatoryAlert, OpportunityItem } from "./types.js";
import type { FunnelIntelStage } from "./types.js";

export function buildDailyExecutiveBrief(input: {
  observatory: Pick<
    GrowthObservatoryPayload,
    "healthScores" | "alerts" | "opportunities" | "funnel" | "dataGaps"
  >;
  dashboard: GrowthDashboardPayload;
  date?: string;
}): import("./types.js").DailyExecutiveBrief {
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const scores = input.observatory.healthScores;

  const improvements: string[] = [];
  const regressions: string[] = [];

  for (const stage of input.observatory.funnel.stages) {
    if (stage.trendVs7d != null && stage.trendVs7d >= 10) {
      improvements.push(`${stage.label} +${stage.trendVs7d}% (7d)`);
    }
    if (stage.trendVs7d != null && stage.trendVs7d <= -10) {
      regressions.push(`${stage.label} ${stage.trendVs7d}% (7d)`);
    }
  }

  const critical = input.observatory.alerts.filter((a) => a.category === "critical");
  const topOpp: OpportunityItem | undefined =
    input.observatory.opportunities.growth[0] ??
    input.observatory.opportunities.revenue[0] ??
    input.observatory.opportunities.retention[0];

  const blocked = [
    ...input.observatory.dataGaps,
    ...(input.dashboard.campaigns.available
      ? []
      : ["Ad spend / CPI / ROAS — NOT VERIFIED (no ad platform integration)"]),
  ];

  return {
    date,
    overallHealthScore: scores.overall,
    scores: {
      growth: scores.growth,
      retention: scores.retention,
      revenue: scores.revenue,
      reliability: scores.reliability,
    },
    biggestImprovement: improvements[0] ?? "No significant 7-day improvements detected",
    biggestRegression:
      regressions[0] ??
      (input.observatory.funnel.largestRegression
        ? `${input.observatory.funnel.largestRegression.label} drop ${input.observatory.funnel.largestRegression.dropPct ?? "N/A"}%`
        : "No significant 7-day regressions detected"),
    highestPriorityToday:
      critical[0]?.title ?? topOpp?.title ?? "Monitor activation funnel stability",
    topRecommendedAction:
      critical[0]?.message ?? topOpp?.evidence ?? "Review Growth Observatory alerts daily.",
    blockedItems: blocked.slice(0, 6),
    expectedBusinessImpact: topOpp?.estimatedImpact ?? "Stabilize core funnel before scaling acquisition",
    executiveSummary: [
      `Product health score ${scores.overall}/100.`,
      `Growth ${scores.growth}, Retention ${scores.retention}, Revenue ${scores.revenue}, Reliability ${scores.reliability}.`,
      critical.length > 0
        ? `${critical.length} critical alert(s) require attention.`
        : "No critical alerts in the latest window.",
      `MRR estimate ₹${input.dashboard.subscriptions.mrr}, DAU ${input.dashboard.kpis.dau?.value ?? "N/A"}.`,
    ].join(" "),
  };
}

export function findLargestRegression(stages: FunnelIntelStage[]): FunnelIntelStage | null {
  let worst: FunnelIntelStage | null = null;
  let worstTrend: number | null = null;
  for (const s of stages) {
    if (s.trendVs7d != null && s.trendVs7d < -10) {
      if (worstTrend == null || s.trendVs7d < worstTrend) {
        worstTrend = s.trendVs7d;
        worst = s;
      }
    }
  }
  if (worst) return worst;
  let maxDrop = 0;
  for (const s of stages) {
    if (s.dropPct != null && s.dropPct > maxDrop) {
      maxDrop = s.dropPct;
      worst = s;
    }
  }
  return worst;
}
