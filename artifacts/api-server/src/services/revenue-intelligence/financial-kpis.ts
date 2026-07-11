import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { RAZORPAY_PLAN_PRICES_INR } from "../subscriptionService.js";
import type { GrowthDashboardPayload } from "../growth-dashboard/types.js";
import type { GrowthTimeRange } from "../growth-dashboard/types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "../growth-dashboard/sqlHelpers.js";
import type { FinancialMetric } from "./types.js";
import { classifyEstimated, classifyEvidence, metric } from "./safety.js";

function planMonthlyInr(plan: string): number {
  switch (plan) {
    case "monthly":
      return RAZORPAY_PLAN_PRICES_INR.monthly.amount;
    case "six_month":
      return RAZORPAY_PLAN_PRICES_INR.six_month.amount / 6;
    case "yearly":
      return RAZORPAY_PLAN_PRICES_INR.yearly.amount / 12;
    default:
      return 0;
  }
}

export async function computeFinancialKpis(
  range: GrowthTimeRange,
  dashboard: GrowthDashboardPayload,
): Promise<FinancialMetric[]> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();
  const subs = dashboard.subscriptions;
  const kpis = dashboard.kpis;

  const [purchaseRes, subLengthRes, recoveryRes] = await Promise.all([
    db.execute(sql`
      SELECT
        count(DISTINCT user_id) FILTER (WHERE props->>'step' = 'purchase_success')::int AS success,
        count(DISTINCT user_id) FILTER (WHERE props->>'step' = 'purchase_failed')::int AS failed,
        count(DISTINCT user_id) FILTER (WHERE props->>'step' = 'checkout_started')::int AS checkout
      FROM analytics_events
      WHERE event_name = 'subscription_funnel_event'
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
    `),
    db.execute(sql`
      SELECT
        avg(extract(epoch from (coalesce(cancelled_at, expired_at, now()) - created_at)) / 86400.0)::float AS avg_days
      FROM subscriptions
      WHERE subscription_state IN ('ACTIVE', 'CANCELLED', 'EXPIRED')
        AND plan IN ('monthly', 'six_month', 'yearly')
    `),
    db.execute(sql`
      SELECT
        count(*) FILTER (WHERE props->>'step' = 'purchase_failed')::int AS failed,
        count(*) FILTER (WHERE props->>'step' = 'purchase_success'
          AND user_id IN (
            SELECT user_id FROM analytics_events
            WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_failed'
              AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
          ))::int AS recovered
      FROM analytics_events
      WHERE event_name = 'subscription_funnel_event'
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
    `),
  ]);

  const p = (purchaseRes.rows[0] ?? {}) as Record<string, unknown>;
  const sl = (subLengthRes.rows[0] ?? {}) as Record<string, unknown>;
  const rec = (recoveryRes.rows[0] ?? {}) as Record<string, unknown>;

  const success = rowNum(p, "success");
  const failed = rowNum(p, "failed");
  const recovered = rowNum(rec, "recovered");
  const failedTotal = rowNum(rec, "failed");

  const installs = kpis.downloads?.value ?? 0;
  const trials = subs.trialUsers;
  const paid = subs.paidUsers;
  const dau = kpis.dau?.value ?? 0;

  const mrrClass = classifyEvidence({
    measured: true,
    sampleSize: paid,
    minSample: 1,
  });

  const refundCount = kpis.refunds?.value ?? 0;
  const refundDenom = success + failed;
  const refundRate = pctRate(refundCount, refundDenom > 0 ? refundDenom : paid);

  return [
    metric("mrr", "MRR", subs.mrr, kpis.mrr?.previous ?? subs.mrr, "inr", mrrClass === "not_verified" ? "estimated" : mrrClass, "subscriptions ACTIVE × catalog plan monthly INR", paid === 0 ? "Estimated from catalog — no paid subs" : null),
    metric("arr", "ARR", subs.arr, kpis.arr?.previous ?? subs.arr, "inr", mrrClass === "not_verified" ? "estimated" : mrrClass, "MRR × 12"),
    metric("daily_revenue", "Daily Revenue (est.)", paid > 0 ? Math.round(subs.mrr / 30) : 0, null, "inr", "estimated", "MRR / 30 — not actual cash ledger"),
    metric("weekly_revenue", "Weekly Revenue (est.)", paid > 0 ? Math.round((subs.mrr / 30) * 7) : 0, null, "inr", "estimated", "MRR / 30 × 7"),
    metric("monthly_revenue", "Monthly Revenue (est.)", subs.mrr, null, "inr", mrrClass === "not_verified" ? "estimated" : mrrClass, "Active subscriber MRR snapshot"),
    metric("revenue_per_install", "Revenue / Install", installs > 0 ? Math.round((subs.mrr / installs) * 100) / 100 : null, null, "inr", classifyEstimated(installs), "MRR / installs in window"),
    metric("revenue_per_trial", "Revenue / Trial", trials > 0 ? Math.round((subs.mrr / trials) * 100) / 100 : null, null, "inr", classifyEstimated(trials), "MRR / trial users"),
    metric("revenue_per_active_user", "Revenue / Active User", dau > 0 ? Math.round((subs.mrr / dau) * 100) / 100 : null, null, "inr", classifyEstimated(dau), "MRR / DAU"),
    metric("arppu", "ARPPU", paid > 0 ? Math.round(subs.mrr / paid) : null, null, "inr", classifyEvidence({ measured: true, sampleSize: paid }), "MRR / paid subscribers"),
    metric("avg_subscription_length", "Avg Subscription Length", sl.avg_days != null ? Math.round(Number(sl.avg_days)) : null, null, "days", classifyEvidence({ measured: true, sampleSize: paid }), "subscriptions created_at → cancel/expiry"),
    metric("renewal_rate", "Renewal Rate", subs.renewalPct, null, "pct", classifyEstimated(subs.paidUsers), "subscriptions last_event_type RENEW heuristic"),
    metric("refund_rate", "Refund Rate", refundRate, null, "pct", refundCount > 0 ? "measured" : "not_verified", "billing_audit_events refund count", refundCount === 0 ? "No refunds in window" : null),
    metric("failed_purchases", "Failed Purchases", failed, null, "count", failed > 0 ? "measured" : "not_verified", "subscription_funnel_event purchase_failed"),
    metric("recovery_rate", "Recovery Rate", pctRate(recovered, failedTotal), null, "pct", failedTotal >= 5 ? "measured" : "not_verified", "purchase_success after prior purchase_failed", failedTotal < 5 ? "NOT ENOUGH EVIDENCE" : null),
    metric("trial_to_paid", "Trial → Paid", subs.conversionPct, null, "pct", classifyEstimated(trials + paid), "subscriptions TRIAL vs ACTIVE"),
  ];
}
