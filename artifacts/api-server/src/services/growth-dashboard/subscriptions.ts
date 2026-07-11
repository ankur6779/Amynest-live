import { sql } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RAZORPAY_PLAN_PRICES_INR } from "../subscriptionService.js";
import type { GrowthTimeRange } from "./types.js";
import { pctRate, rowNum } from "./sqlHelpers.js";

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

export async function computeSubscriptions(range: GrowthTimeRange) {
  const [stateRes, trialConvRes, renewalRes, countryRes, platformRes] = await Promise.all([
    db.execute(sql`
      SELECT
        count(*) FILTER (WHERE subscription_state = 'FREE' OR status = 'free')::int AS free_users,
        count(*) FILTER (WHERE subscription_state = 'TRIAL' OR status = 'trialing')::int AS trial_users,
        count(*) FILTER (WHERE subscription_state = 'ACTIVE' OR status = 'active')::int AS paid_users,
        count(*) FILTER (WHERE subscription_state = 'EXPIRED')::int AS expired_users,
        count(*) FILTER (WHERE subscription_state IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD'))::int AS active_users
      FROM subscriptions
    `),
    db.execute(sql`
      SELECT
        count(*) FILTER (WHERE subscription_state = 'TRIAL')::int AS trials,
        count(*) FILTER (WHERE subscription_state = 'ACTIVE')::int AS paid
      FROM subscriptions
      WHERE updated_at >= ${range.start.toISOString()}::timestamptz
        AND updated_at <= ${range.end.toISOString()}::timestamptz
    `),
    db.execute(sql`
      SELECT
        count(*) FILTER (WHERE last_event_type ILIKE '%RENEW%')::int AS renewals,
        count(*) FILTER (WHERE subscription_state IN ('CANCELLED', 'EXPIRED'))::int AS cancellations,
        count(*)::int AS total_events
      FROM subscriptions
      WHERE updated_at >= ${range.start.toISOString()}::timestamptz
        AND updated_at <= ${range.end.toISOString()}::timestamptz
    `),
    db.execute(sql`
      SELECT
        coalesce(nullif(trim(pp.country), ''), 'unknown') AS country,
        count(DISTINCT s.user_id)::int AS users,
        sum(CASE s.plan
          WHEN 'monthly' THEN ${RAZORPAY_PLAN_PRICES_INR.monthly.amount}
          WHEN 'six_month' THEN ${RAZORPAY_PLAN_PRICES_INR.six_month.amount}
          WHEN 'yearly' THEN ${RAZORPAY_PLAN_PRICES_INR.yearly.amount}
          ELSE 0 END)::int AS revenue
      FROM subscriptions s
      LEFT JOIN parent_profiles pp ON pp.user_id = s.user_id
      WHERE s.subscription_state = 'ACTIVE'
      GROUP BY 1
      ORDER BY revenue DESC
      LIMIT 20
    `),
    db.execute(sql`
      SELECT
        coalesce(nullif(trim(store), ''), 'unknown') AS platform,
        count(*)::int AS users,
        sum(CASE plan
          WHEN 'monthly' THEN ${RAZORPAY_PLAN_PRICES_INR.monthly.amount}
          WHEN 'six_month' THEN ${RAZORPAY_PLAN_PRICES_INR.six_month.amount}
          WHEN 'yearly' THEN ${RAZORPAY_PLAN_PRICES_INR.yearly.amount}
          ELSE 0 END)::int AS revenue
      FROM subscriptions
      WHERE subscription_state = 'ACTIVE'
      GROUP BY 1
      ORDER BY users DESC
    `),
  ]);

  const state = (stateRes.rows[0] ?? {}) as Record<string, unknown>;
  const trialConv = (trialConvRes.rows[0] ?? {}) as Record<string, unknown>;
  const renewal = (renewalRes.rows[0] ?? {}) as Record<string, unknown>;

  const paidPlans = await db
    .select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.subscriptionState, "ACTIVE"));

  let mrr = 0;
  for (const row of paidPlans) {
    mrr += planMonthlyInr(row.plan ?? "monthly");
  }

  const trials = rowNum(trialConv, "trials");
  const paid = rowNum(trialConv, "paid");
  const renewals = rowNum(renewal, "renewals");
  const cancellations = rowNum(renewal, "cancellations");
  const totalEvents = rowNum(renewal, "total_events");

  return {
    freeUsers: rowNum(state, "free_users"),
    trialUsers: rowNum(state, "trial_users"),
    paidUsers: rowNum(state, "paid_users"),
    expiredUsers: rowNum(state, "expired_users"),
    activeUsers: rowNum(state, "active_users"),
    mrr: Math.round(mrr),
    arr: Math.round(mrr * 12),
    conversionPct: pctRate(paid, trials + paid),
    renewalPct: pctRate(renewals, totalEvents),
    cancellationPct: pctRate(cancellations, totalEvents),
    revenueByCountry: countryRes.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        country: String(r.country),
        revenue: rowNum(r, "revenue"),
        users: rowNum(r, "users"),
      };
    }),
    revenueByPlatform: platformRes.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        platform: String(r.platform),
        revenue: rowNum(r, "revenue"),
        users: rowNum(r, "users"),
      };
    }),
  };
}
