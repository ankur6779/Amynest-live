import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthDashboardPayload } from "../growth-dashboard/types.js";
import type { GrowthTimeRange } from "../growth-dashboard/types.js";
import { rowNum } from "../growth-dashboard/sqlHelpers.js";
import type { ChurnRiskUser } from "./types.js";
import { classifyEstimated, MIN_COHORT_SIZE } from "./safety.js";

export async function computeChurnIntelligence(
  range: GrowthTimeRange,
  dashboard: GrowthDashboardPayload,
): Promise<{
  renewalRisk: ChurnRiskUser[];
  trialConversionLikely: ChurnRiskUser[];
  subscribersAtRisk: ChurnRiskUser[];
  paymentFailures: number;
  inactiveSubscribers: number;
}> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();

  const [paymentRes, inactiveRes, graceRes, trialEngRes] = await Promise.all([
    db.execute(sql`
      SELECT count(DISTINCT user_id)::int AS users
      FROM analytics_events
      WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_failed'
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
    `),
    db.execute(sql`
      SELECT count(*)::int AS users FROM subscriptions
      WHERE subscription_state = 'ACTIVE'
        AND updated_at < (now() - interval '14 days')
    `),
    db.execute(sql`
      SELECT count(*)::int AS users FROM subscriptions
      WHERE subscription_state IN ('GRACE_PERIOD', 'CANCELLED') OR cancel_at_period_end = true
    `),
    db.execute(sql`
      SELECT count(DISTINCT s.user_id)::int AS engaged
      FROM subscriptions s
      JOIN analytics_events ae ON ae.user_id = s.user_id
      WHERE s.subscription_state = 'TRIAL'
        AND ae.server_ts >= (now() - interval '7 days')
    `),
  ]);

  const paymentFailures = rowNum((paymentRes.rows[0] ?? {}) as Record<string, unknown>, "users");
  const inactiveSubscribers = rowNum((inactiveRes.rows[0] ?? {}) as Record<string, unknown>, "users");
  const graceUsers = rowNum((graceRes.rows[0] ?? {}) as Record<string, unknown>, "users");
  const trialEngaged = rowNum((trialEngRes.rows[0] ?? {}) as Record<string, unknown>, "engaged");
  const trialTotal = dashboard.subscriptions.trialUsers;

  const renewalRisk: ChurnRiskUser[] = [];
  if (graceUsers > 0) {
    renewalRisk.push({
      segment: "grace_period_or_cancel_pending",
      users: graceUsers,
      riskScore: 75,
      confidencePct: graceUsers >= MIN_COHORT_SIZE ? 80 : 50,
      signals: ["GRACE_PERIOD", "cancel_at_period_end"],
      status: graceUsers >= MIN_COHORT_SIZE ? "measured" : "estimated",
    });
  }
  if (inactiveSubscribers > 0) {
    renewalRisk.push({
      segment: "inactive_active_subscribers",
      users: inactiveSubscribers,
      riskScore: 60,
      confidencePct: inactiveSubscribers >= 5 ? 70 : 40,
      signals: ["no subscription row update 14d+"],
      status: inactiveSubscribers >= 5 ? "estimated" : "not_verified",
    });
  }

  const trialConversionLikely: ChurnRiskUser[] = [];
  if (trialTotal > 0) {
    const engagedPct = trialTotal > 0 ? Math.round((trialEngaged / trialTotal) * 100) : 0;
    trialConversionLikely.push({
      segment: "trial_engaged_7d",
      users: trialEngaged,
      riskScore: 100 - engagedPct,
      confidencePct: trialTotal >= MIN_COHORT_SIZE ? 65 : 35,
      signals: [`${engagedPct}% trial users active in 7d`],
      status: trialTotal >= MIN_COHORT_SIZE ? "estimated" : "not_verified",
    });
    trialConversionLikely.push({
      segment: "trial_inactive",
      users: Math.max(0, trialTotal - trialEngaged),
      riskScore: 85,
      confidencePct: trialTotal >= MIN_COHORT_SIZE ? 60 : 30,
      signals: ["no analytics activity 7d"],
      status: trialTotal >= MIN_COHORT_SIZE ? "estimated" : "not_verified",
    });
  }

  const subscribersAtRisk: ChurnRiskUser[] = [];
  if (paymentFailures > 0) {
    subscribersAtRisk.push({
      segment: "payment_failed",
      users: paymentFailures,
      riskScore: 90,
      confidencePct: paymentFailures >= 5 ? 85 : 50,
      signals: ["purchase_failed events"],
      status: paymentFailures >= 5 ? "measured" : "estimated",
    });
  }

  const churnCount = dashboard.kpis.churn?.value ?? 0;
  if (churnCount > 0) {
    subscribersAtRisk.push({
      segment: "recent_churn",
      users: churnCount,
      riskScore: 70,
      confidencePct: classifyEstimated(churnCount) === "measured" ? 75 : 45,
      signals: ["CANCELLED/EXPIRED in window"],
      status: classifyEstimated(churnCount),
    });
  }

  if (
    renewalRisk.length === 0 &&
    trialConversionLikely.length === 0 &&
    subscribersAtRisk.length === 0
  ) {
    renewalRisk.push({
      segment: "insufficient_data",
      users: 0,
      riskScore: 0,
      confidencePct: 0,
      signals: ["NOT ENOUGH EVIDENCE"],
      status: "not_verified",
    });
  }

  return {
    renewalRisk,
    trialConversionLikely,
    subscribersAtRisk,
    paymentFailures,
    inactiveSubscribers,
  };
}
