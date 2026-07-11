import { getCached, setCached, cacheKey, rangeKey } from "../growth-dashboard/cache.js";
import { computeGrowthDashboard } from "../growth-dashboard/index.js";
import { computeExperimentIntelligence } from "../growth-observatory/experiment-intelligence.js";
import { parseGrowthTimeRange } from "../growth-dashboard/timeRange.js";
import { computeFinancialKpis } from "./financial-kpis.js";
import { computeSubscriptionFunnel } from "./subscription-funnel.js";
import { computeCohortEconomics } from "./cohort-economics.js";
import { computeFeatureRevenueAttribution } from "./feature-attribution.js";
import { computeChurnIntelligence } from "./churn-intelligence.js";
import { buildPricingExperimentAttribution } from "./experiment-attribution.js";
import { buildFounderFinanceBrief } from "./founder-finance-brief.js";
import type { RevenueIntelligencePayload } from "./types.js";

function buildDataGaps(dashboard: Awaited<ReturnType<typeof computeGrowthDashboard>>): string[] {
  const gaps: string[] = [];
  if (dashboard.subscriptions.paidUsers === 0) {
    gaps.push("MRR/ARPPU — estimated from catalog; no paid subs to validate");
  }
  gaps.push("Actual transaction revenue — NOT VERIFIED (no cash ledger in analytics; use billing_audit_events for refunds only)");
  gaps.push("Acquisition source LTV / payback — NOT VERIFIED (no ad spend integration)");
  gaps.push("Child age revenue cohorts — NOT VERIFIED");
  if (!dashboard.campaigns.available) {
    gaps.push("Meta/Google Ads revenue attribution — NOT VERIFIED");
  }
  return gaps;
}

export async function computeRevenueIntelligence(input: {
  preset?: string;
  start?: string;
  end?: string;
}): Promise<RevenueIntelligencePayload> {
  const range = parseGrowthTimeRange(input);
  const key = cacheKey("revenue-intelligence", rangeKey(range.start, range.end));
  const cached = getCached<RevenueIntelligencePayload>(key);
  if (cached) return cached;

  const dashboard = await computeGrowthDashboard(input);

  const [
    financialKpis,
    subscriptionFunnel,
    cohortEconomics,
    featureAttribution,
    churnIntelligence,
    experiments,
  ] = await Promise.all([
    computeFinancialKpis(range, dashboard),
    computeSubscriptionFunnel(range),
    computeCohortEconomics(range),
    computeFeatureRevenueAttribution(range),
    computeChurnIntelligence(range, dashboard),
    computeExperimentIntelligence(range),
  ]);

  const experimentAttribution = buildPricingExperimentAttribution(experiments);

  const financeBrief = buildFounderFinanceBrief({
    dashboard,
    financialKpis,
    funnel: subscriptionFunnel,
    featureAttribution,
    churn: churnIntelligence,
    experiments: experimentAttribution,
    mrrHistoryDays: 30,
  });

  const payload: RevenueIntelligencePayload = {
    generatedAt: new Date().toISOString(),
    timeRange: {
      startIso: range.start.toISOString(),
      endIso: range.end.toISOString(),
      label: range.label,
    },
    financialKpis,
    subscriptionFunnel,
    cohortEconomics,
    featureAttribution,
    churnIntelligence,
    experimentAttribution,
    financeBrief,
    dataGaps: buildDataGaps(dashboard),
  };

  setCached(key, payload);
  return payload;
}

export type { RevenueIntelligencePayload } from "./types.js";
