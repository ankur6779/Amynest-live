import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { RAZORPAY_PLAN_PRICES_INR } from "../subscriptionService.js";
import type { GrowthTimeRange } from "../growth-dashboard/types.js";
import { pctRate, rowNum } from "../growth-dashboard/sqlHelpers.js";
import type { CohortEconomicsRow } from "./types.js";
import { classifyEstimated, MIN_COHORT_SIZE } from "./safety.js";

function planRevenue(plan: string): number {
  switch (plan) {
    case "monthly":
      return RAZORPAY_PLAN_PRICES_INR.monthly.amount;
    case "six_month":
      return RAZORPAY_PLAN_PRICES_INR.six_month.amount;
    case "yearly":
      return RAZORPAY_PLAN_PRICES_INR.yearly.amount;
    default:
      return 0;
  }
}

export async function computeCohortEconomics(range: GrowthTimeRange): Promise<CohortEconomicsRow[]> {
  const rows: CohortEconomicsRow[] = [];

  const planRes = await db.execute(sql`
    SELECT plan, count(*)::int AS users,
      count(*) FILTER (WHERE subscription_state IN ('CANCELLED', 'EXPIRED'))::int AS churned,
      count(*) FILTER (WHERE last_event_type ILIKE '%RENEW%')::int AS renewed
    FROM subscriptions
    WHERE plan IN ('monthly', 'six_month', 'yearly')
    GROUP BY plan ORDER BY users DESC
  `);
  for (const row of planRes.rows) {
    const r = row as Record<string, unknown>;
    const users = rowNum(r, "users");
    const plan = String(r.plan);
    const churned = rowNum(r, "churned");
    const renewed = rowNum(r, "renewed");
    rows.push({
      cohort: plan,
      dimension: "plan",
      users,
      ltv: users > 0 ? planRevenue(plan) : null,
      retentionD7: null,
      revenue: users > 0 ? planRevenue(plan) * users : null,
      renewalRate: pctRate(renewed, users),
      churnRate: pctRate(churned, users),
      paybackDays: null,
      evidenceClass: classifyEstimated(users, MIN_COHORT_SIZE),
      note: "LTV = catalog plan price — not observed cumulative revenue",
    });
  }

  const countryRes = await db.execute(sql`
    SELECT coalesce(nullif(trim(pp.country), ''), 'unknown') AS country,
      count(DISTINCT s.user_id)::int AS users,
      count(*) FILTER (WHERE s.subscription_state = 'ACTIVE')::int AS active
    FROM subscriptions s
    LEFT JOIN parent_profiles pp ON pp.user_id = s.user_id
    WHERE s.plan IN ('monthly', 'six_month', 'yearly')
    GROUP BY 1 ORDER BY users DESC LIMIT 10
  `);
  for (const row of countryRes.rows) {
    const r = row as Record<string, unknown>;
    const users = rowNum(r, "users");
    rows.push({
      cohort: String(r.country),
      dimension: "country",
      users,
      ltv: null,
      retentionD7: null,
      revenue: rowNum(r, "active") * RAZORPAY_PLAN_PRICES_INR.monthly.amount,
      renewalRate: null,
      churnRate: null,
      paybackDays: null,
      evidenceClass: classifyEstimated(users, MIN_COHORT_SIZE),
      note: null,
    });
  }

  const platformRes = await db.execute(sql`
    SELECT coalesce(nullif(trim(store), ''), 'unknown') AS platform,
      count(*)::int AS users,
      count(*) FILTER (WHERE subscription_state = 'ACTIVE')::int AS active
    FROM subscriptions
    WHERE plan IN ('monthly', 'six_month', 'yearly')
    GROUP BY 1 ORDER BY users DESC
  `);
  for (const row of platformRes.rows) {
    const r = row as Record<string, unknown>;
    const users = rowNum(r, "users");
    rows.push({
      cohort: String(r.platform),
      dimension: "platform",
      users,
      ltv: null,
      retentionD7: null,
      revenue: rowNum(r, "active") * RAZORPAY_PLAN_PRICES_INR.monthly.amount,
      renewalRate: null,
      churnRate: null,
      paybackDays: null,
      evidenceClass: classifyEstimated(users, MIN_COHORT_SIZE),
      note: "store field (App Store / Play)",
    });
  }

  const trialRes = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE subscription_state = 'TRIAL')::int AS trial,
      count(*) FILTER (WHERE subscription_state = 'ACTIVE')::int AS paid,
      count(*) FILTER (WHERE subscription_state = 'FREE')::int AS free
    FROM subscriptions
  `);
  const tr = (trialRes.rows[0] ?? {}) as Record<string, unknown>;
  const trialUsers = rowNum(tr, "trial");
  const paidUsers = rowNum(tr, "paid");
  rows.push({
    cohort: "trial",
    dimension: "trial",
    users: trialUsers,
    ltv: null,
    retentionD7: null,
    revenue: null,
    renewalRate: pctRate(paidUsers, trialUsers + paidUsers),
    churnRate: null,
    paybackDays: null,
    evidenceClass: classifyEstimated(trialUsers + paidUsers, MIN_COHORT_SIZE),
    note: "Trial vs paid from subscription_state",
  });
  rows.push({
    cohort: "non_trial",
    dimension: "trial",
    users: rowNum(tr, "free"),
    ltv: null,
    retentionD7: null,
    revenue: null,
    renewalRate: null,
    churnRate: null,
    paybackDays: null,
    evidenceClass: "measured",
    note: null,
  });

  rows.push({
    cohort: "meta_ads",
    dimension: "acquisition",
    users: 0,
    ltv: null,
    retentionD7: null,
    revenue: null,
    renewalRate: null,
    churnRate: null,
    paybackDays: null,
    evidenceClass: "not_verified",
    note: "NOT VERIFIED — no ad spend / UTM attribution integration",
  });
  rows.push({
    cohort: "child_age",
    dimension: "child_age",
    users: 0,
    ltv: null,
    retentionD7: null,
    revenue: null,
    renewalRate: null,
    churnRate: null,
    paybackDays: null,
    evidenceClass: "not_verified",
    note: "NOT VERIFIED — child age not consistently in subscription props",
  });

  return rows;
}
