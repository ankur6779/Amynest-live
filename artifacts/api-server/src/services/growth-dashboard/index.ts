import { computeCampaigns } from "./campaigns.js";
import { cacheKey, getCached, rangeKey, setCached } from "./cache.js";
import { computeCharts } from "./charts.js";
import { computeDevices } from "./devices.js";
import { computeFeatures } from "./features.js";
import { computeFunnel } from "./funnel.js";
import { computeGeography } from "./geo.js";
import { generateInsights } from "./insights.js";
import { computeKpis } from "./kpis.js";
import { computePerformance } from "./performance.js";
import { computeRetention } from "./retention.js";
import { computeSubscriptions } from "./subscriptions.js";
import { computeTables } from "./tables.js";
import { buildExecutiveIntelligence } from "./executive/index.js";
import { parseGrowthTimeRange } from "./timeRange.js";
import type { GrowthDashboardPayload, GrowthTimeRange } from "./types.js";

export type { GrowthDashboardPayload, GrowthTimePreset, GrowthTimeRange, ExecutiveIntelligence } from "./types.js";
export { parseGrowthTimeRange } from "./timeRange.js";

async function buildDashboard(range: GrowthTimeRange): Promise<GrowthDashboardPayload> {
  const [
    kpis,
    funnel,
    campaigns,
    retention,
    previousRetention,
    features,
    subscriptions,
    geography,
    devices,
    performance,
    charts,
    tables,
  ] = await Promise.all([
    computeKpis(range),
    computeFunnel(range),
    computeCampaigns(range),
    computeRetention(range),
    computeRetention({
      ...range,
      start: range.previousStart,
      end: range.previousEnd,
    }),
    computeFeatures(range),
    computeSubscriptions(range),
    computeGeography(range),
    computeDevices(range),
    computePerformance(range),
    computeCharts(range),
    computeTables(range),
  ]);

  const insights = generateInsights({
    range,
    funnel,
    features,
    retention: retention.summary,
    previousRetention: previousRetention.summary,
    kpis,
  });

  const executive = await buildExecutiveIntelligence(range, {
    kpis,
    funnel,
    campaigns,
    retention,
    previousRetention,
    features,
    subscriptions,
    performance,
    devices,
    charts,
  });

  return {
    generatedAt: new Date().toISOString(),
    timeRange: {
      preset: range.preset,
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      previousStart: range.previousStart.toISOString(),
      previousEnd: range.previousEnd.toISOString(),
      label: range.label,
    },
    kpis,
    funnel,
    campaigns,
    retention,
    features,
    subscriptions,
    geography,
    devices,
    performance,
    insights,
    charts,
    tables,
    executive,
  };
}

export async function computeGrowthDashboard(input: {
  preset?: string;
  start?: string;
  end?: string;
}): Promise<GrowthDashboardPayload> {
  const range = parseGrowthTimeRange(input);
  const key = cacheKey("growth-dashboard", rangeKey(range.start, range.end));
  const cached = getCached<GrowthDashboardPayload>(key);
  if (cached) return cached;

  const payload = await buildDashboard(range);
  setCached(key, payload);
  return payload;
}
