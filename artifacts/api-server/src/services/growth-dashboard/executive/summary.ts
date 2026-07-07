import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { RAZORPAY_PLAN_PRICES_INR } from "../../subscriptionService.js";
import type { ExecutiveMetric, ExecutiveSummary, GrowthDashboardPayload } from "../types.js";
import { ANALYTICS_NOISE_FILTER, pctChange, rowNum } from "../sqlHelpers.js";

const MONTHLY_REVENUE_EST = RAZORPAY_PLAN_PRICES_INR.monthly.amount;

function metric(
  key: string,
  label: string,
  current: number | null,
  previous: number | null,
): ExecutiveMetric {
  return {
    key,
    label,
    value: current,
    previous,
    changePct: current != null && previous != null ? pctChange(current, previous) : null,
  };
}

export async function computeExecutiveSummary(
  kpis: GrowthDashboardPayload["kpis"],
  subscriptions: GrowthDashboardPayload["subscriptions"],
  funnel: GrowthDashboardPayload["funnel"],
): Promise<ExecutiveSummary> {
  const todayRes = await db.execute(sql`
    SELECT
      count(DISTINCT user_id) FILTER (
        WHERE (event_name = 'upgrade_completed'
          OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success'))
          AND server_ts::date = current_date
      )::int AS revenue_events_today,
      count(DISTINCT user_id) FILTER (
        WHERE (event_name = 'upgrade_completed'
          OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success'))
          AND server_ts::date = current_date - 1
      )::int AS revenue_events_yesterday
    FROM analytics_events
    WHERE ${ANALYTICS_NOISE_FILTER}
  `);
  const rev = (todayRes.rows[0] ?? {}) as Record<string, unknown>;
  const todayRevenue = rowNum(rev, "revenue_events_today") * MONTHLY_REVENUE_EST;
  const yesterdayRevenue = rowNum(rev, "revenue_events_yesterday") * MONTHLY_REVENUE_EST;

  const routineStage = funnel.find((f) => f.key === "routine_generated");
  const signupStage = funnel.find((f) => f.key === "signup");

  const metrics: ExecutiveMetric[] = [
    metric("todayRevenue", "Today's Revenue", todayRevenue, yesterdayRevenue),
    metric("yesterdayRevenue", "Yesterday Revenue", yesterdayRevenue, null),
    metric("newUsers", "New Users", kpis.newUsers?.value ?? null, kpis.newUsers?.previous ?? null),
    metric(
      "returningUsers",
      "Returning Users",
      kpis.returningUsers?.value ?? null,
      kpis.returningUsers?.previous ?? null,
    ),
    metric("installs", "Installs", kpis.downloads?.value ?? null, kpis.downloads?.previous ?? null),
    metric("signups", "Signups", signupStage?.users ?? null, null),
    metric(
      "routineGenerated",
      "Routine Generated",
      routineStage?.users ?? null,
      null,
    ),
    metric(
      "trialsStarted",
      "Trial Started",
      kpis.trialsStarted?.value ?? null,
      kpis.trialsStarted?.previous ?? null,
    ),
    metric(
      "paidSubscribers",
      "Paid Subscribers",
      kpis.paidSubscribers?.value ?? null,
      kpis.paidSubscribers?.previous ?? null,
    ),
    metric("mrr", "MRR", subscriptions.mrr, subscriptions.mrr),
    metric("arr", "ARR", subscriptions.arr, subscriptions.arr),
    metric(
      "crashFreePct",
      "Crash Free %",
      kpis.crashFreePct?.value ?? null,
      kpis.crashFreePct?.previous ?? null,
    ),
  ];

  const revChange = pctChange(todayRevenue, yesterdayRevenue);
  const revenueTrend: ExecutiveSummary["revenueTrend"] =
    revChange == null || Math.abs(revChange) < 3 ? "flat" : revChange > 0 ? "up" : "down";

  return { metrics, revenueTrend };
}

export function attachGrowthScoreToSummary(
  summary: ExecutiveSummary,
  overallScore: number,
): ExecutiveSummary {
  return {
    ...summary,
    metrics: [
      ...summary.metrics,
      metric("growthScore", "Overall Growth Score", overallScore, null),
    ],
  };
}
