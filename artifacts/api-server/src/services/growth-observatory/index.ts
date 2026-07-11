import { sql } from "drizzle-orm";
import { getCached, setCached, cacheKey, rangeKey } from "../growth-dashboard/cache.js";
import { computeGrowthDashboard } from "../growth-dashboard/index.js";
import { parseGrowthTimeRange } from "../growth-dashboard/timeRange.js";
import { pctRate } from "../growth-dashboard/sqlHelpers.js";
import type { ObservatoryTrend } from "./types.js";
import { generateObservatoryAlerts } from "./alerts.js";
import { computeCohortIntelligence } from "./cohort-intelligence.js";
import { buildDailyExecutiveBrief, findLargestRegression } from "./daily-brief.js";
import { computeExperimentIntelligence } from "./experiment-intelligence.js";
import {
  buildFunnelIntelStages,
  computeActivationMetrics,
  computeHistoricalSeries,
  computeObservatoryFunnelCounts,
} from "./funnel-intelligence.js";
import { generateOpportunities } from "./opportunities.js";
import { computeObservatoryPredictions, computePurchaseFailureRate } from "./predictions.js";
import { buildDataGaps, computeProductHealthMetrics } from "./product-health.js";
import type { DailyExecutiveBrief, GrowthObservatoryPayload } from "./types.js";

function trendFromValue(
  value: number | null,
  previous: number | null,
  changePct: number | null,
  verified = true,
  note: string | null = null,
): ObservatoryTrend {
  return { value, previous, changePct, trend1d: null, trend7d: changePct, trend30d: null, verified, note };
}

export async function computeGrowthObservatory(input: {
  preset?: string;
  start?: string;
  end?: string;
}): Promise<GrowthObservatoryPayload> {
  const range = parseGrowthTimeRange(input);
  const key = cacheKey("growth-observatory", rangeKey(range.start, range.end));
  const cached = getCached<GrowthObservatoryPayload>(key);
  if (cached) return cached;

  const periodDays = Math.max(
    1,
    Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000),
  );

  const dashboard = await computeGrowthDashboard(input);
  const exec = dashboard.executive;

  const [
    funnelCounts,
    activation,
    experiments,
    cohorts,
    historicalDau,
    historicalRoutines,
    historicalTrials,
    historicalPurchases,
    purchaseFailureRate,
    productHealth,
  ] = await Promise.all([
    computeObservatoryFunnelCounts(range),
    computeActivationMetrics(range),
    computeExperimentIntelligence(range),
    computeCohortIntelligence(range),
    computeHistoricalSeries(sql`true`, 90),
    computeHistoricalSeries(sql`event_name IN ('routine_generated', 'routine_generation_completed')`, 90),
    computeHistoricalSeries(
      sql`event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started'`,
      90,
    ),
    computeHistoricalSeries(
      sql`(event_name = 'upgrade_completed' OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success'))`,
      90,
    ),
    computePurchaseFailureRate(range),
    computeProductHealthMetrics({
      kpis: dashboard.kpis,
      performance: dashboard.performance,
      periodDays,
    }),
  ]);

  const funnelStages = buildFunnelIntelStages(funnelCounts);
  const largestRegression = findLargestRegression(funnelStages);

  const firstValueUsers =
    funnelCounts.find((f) => f.key === "first_value")?.users.current ?? 0;

  const dataGaps = buildDataGaps({
    campaignsAvailable: dashboard.campaigns.available,
    startupSample: 0,
    firstValueEvents: firstValueUsers,
    purchaseTotal: funnelCounts.find((f) => f.key === "purchase")?.users.current ?? 0,
  });

  const alerts = generateObservatoryAlerts({
    funnel: funnelStages,
    dashboard,
    startupFailureRate: productHealth.startupFailureRate,
    purchaseFailureRate,
  });

  const opportunities = generateOpportunities({ funnel: funnelStages, dashboard, alerts });

  const predictions = computeObservatoryPredictions({
    dashboard,
    dauSeriesDays: historicalDau.length,
  });

  const payload: GrowthObservatoryPayload = {
    generatedAt: new Date().toISOString(),
    timeRange: {
      ...range,
      startIso: range.start.toISOString(),
      endIso: range.end.toISOString(),
    },
    healthScores: {
      overall: exec.businessHealth.score,
      growth: exec.growthScore.categories.find((c) => c.key === "acquisition")?.score ?? exec.growthScore.overall,
      retention: exec.growthScore.categories.find((c) => c.key === "retention")?.score ?? 0,
      revenue: exec.growthScore.categories.find((c) => c.key === "revenue")?.score ?? 0,
      reliability: exec.growthScore.categories.find((c) => c.key === "reliability")?.score ?? 0,
    },
    acquisition: {
      installs: trendFromValue(dashboard.kpis.downloads?.value ?? null, dashboard.kpis.downloads?.previous ?? null, dashboard.kpis.downloads?.changePct ?? null),
      firstOpens: trendFromValue(dashboard.kpis.appOpens?.value ?? null, dashboard.kpis.appOpens?.previous ?? null, dashboard.kpis.appOpens?.changePct ?? null),
      signupRate: trendFromValue(
        funnelCounts.find((f) => f.key === "install")?.users.current
          ? pctRate(
              funnelCounts.find((f) => f.key === "signup")?.users.current ?? 0,
              funnelCounts.find((f) => f.key === "install")?.users.current ?? 0,
            )
          : null,
        null,
        null,
        (funnelCounts.find((f) => f.key === "install")?.users.current ?? 0) > 0,
      ),
      costPerInstall: trendFromValue(null, null, null, false, "NOT VERIFIED — no ad spend data"),
      costPerSignup: trendFromValue(null, null, null, false, "NOT VERIFIED"),
      organicVsPaid: trendFromValue(null, null, null, false, "NOT VERIFIED — no attribution integration"),
    },
    activation: {
      metrics: {
        dashboardReachPct: trendFromValue(activation.dashboardReachPct, null, null),
        routineCtaPct: trendFromValue(activation.routineCtaPct, null, null),
        routineStartedPct: trendFromValue(activation.routineStartedPct, null, null),
        routineCompletedPct: trendFromValue(activation.routineCompletedPct, null, null),
        firstValueAchievedPct: trendFromValue(activation.firstValuePct, null, null),
      },
      timeToFirstValueMedianMin: activation.timeToFirstValueMedianMin,
      timeToFirstValueP95Min: activation.timeToFirstValueP95Min,
    },
    retention: {
      dau: trendFromValue(dashboard.kpis.dau?.value ?? null, dashboard.kpis.dau?.previous ?? null, dashboard.kpis.dau?.changePct ?? null),
      wau: trendFromValue(dashboard.kpis.wau?.value ?? null, null, null),
      mau: trendFromValue(dashboard.kpis.mau?.value ?? null, null, null),
      d1: trendFromValue(dashboard.retention.summary.d1, null, null),
      d3: trendFromValue(dashboard.retention.summary.d3, null, null),
      d7: trendFromValue(dashboard.retention.summary.d7, null, null),
      d14: trendFromValue(dashboard.retention.summary.d14, null, null),
      d30: trendFromValue(dashboard.retention.summary.d30, null, null),
      avgSessionLengthSec: trendFromValue(
        dashboard.kpis.avgSessionDuration?.value ?? null,
        dashboard.kpis.avgSessionDuration?.previous ?? null,
        dashboard.kpis.avgSessionDuration?.changePct ?? null,
      ),
      sessionsPerUser: trendFromValue(
        dashboard.kpis.sessions?.value != null && dashboard.kpis.dau?.value
          ? Math.round((dashboard.kpis.sessions.value / dashboard.kpis.dau.value) * 10) / 10
          : null,
        null,
        null,
      ),
    },
    revenue: {
      trialStarted: trendFromValue(dashboard.kpis.trialsStarted?.value ?? null, dashboard.kpis.trialsStarted?.previous ?? null, dashboard.kpis.trialsStarted?.changePct ?? null),
      trialActive: trendFromValue(dashboard.subscriptions.trialUsers, null, null),
      trialExpired: trendFromValue(dashboard.subscriptions.expiredUsers, null, null),
      trialToPaidPct: trendFromValue(dashboard.subscriptions.conversionPct, null, null),
      mrr: trendFromValue(dashboard.subscriptions.mrr, null, null),
      arr: trendFromValue(dashboard.subscriptions.arr, null, null),
      revenuePerInstall: trendFromValue(
        dashboard.kpis.downloads?.value
          ? Math.round((dashboard.subscriptions.mrr / dashboard.kpis.downloads.value) * 100) / 100
          : null,
        null,
        null,
        dashboard.kpis.downloads?.value != null && dashboard.kpis.downloads.value > 0,
      ),
      revenuePerTrial: trendFromValue(
        dashboard.subscriptions.trialUsers > 0
          ? Math.round((dashboard.subscriptions.mrr / dashboard.subscriptions.trialUsers) * 100) / 100
          : null,
        null,
        null,
        dashboard.subscriptions.trialUsers > 0,
      ),
      arpu: trendFromValue(
        dashboard.subscriptions.paidUsers > 0
          ? Math.round((dashboard.subscriptions.mrr / dashboard.subscriptions.paidUsers) * 100) / 100
          : null,
        null,
        null,
        dashboard.subscriptions.paidUsers > 0,
      ),
      purchaseSuccessPct: trendFromValue(
        purchaseFailureRate != null ? 100 - purchaseFailureRate : null,
        null,
        null,
        purchaseFailureRate != null,
      ),
      purchaseFailurePct: trendFromValue(purchaseFailureRate, null, null, purchaseFailureRate != null),
    },
    productHealth: {
      crashFreePct: productHealth.crashFreePct,
      startupSuccessPct: productHealth.startupSuccessPct,
      startupFailurePct: productHealth.startupFailurePct,
      blankScreenPct: productHealth.blankScreenPct,
      authFailurePct: productHealth.authFailurePct,
      apiFailureCount: productHealth.apiFailureCount,
      avgApiLatencyMs: productHealth.avgApiLatencyMs,
    },
    funnel: { stages: funnelStages, largestRegression },
    experiments,
    cohorts,
    alerts,
    opportunities,
    predictions,
    historicalTrends: {
      dau: historicalDau,
      routines: historicalRoutines,
      trials: historicalTrials,
      purchases: historicalPurchases,
    },
    dataGaps,
    breakdown: {
      countries: dashboard.tables.topCountries.slice(0, 10),
      platforms: dashboard.devices.platforms.slice(0, 8),
    },
  };

  setCached(key, payload);
  return payload;
}

export async function computeDailyBrief(input?: {
  preset?: string;
  start?: string;
  end?: string;
}): Promise<DailyExecutiveBrief> {
  const observatory = await computeGrowthObservatory(input ?? { preset: "last_7_days" });
  const dashboard = await computeGrowthDashboard(input ?? { preset: "last_7_days" });
  return buildDailyExecutiveBrief({ observatory, dashboard });
}

export type { GrowthObservatoryPayload, DailyExecutiveBrief } from "./types.js";
