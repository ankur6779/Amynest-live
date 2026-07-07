import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { PLAN_PRICES, RAZORPAY_PLAN_PRICES_INR } from "../subscriptionService.js";
import type { GrowthTimeRange, TrendValue } from "./types.js";
import { ANALYTICS_NOISE_FILTER, pctChange, rowNum } from "./sqlHelpers.js";

function trend(current: number, previous: number): TrendValue {
  return { value: current, previous, changePct: pctChange(current, previous) };
}

function monthlyRevenueInr(plan: string): number {
  switch (plan) {
    case "monthly":
      return RAZORPAY_PLAN_PRICES_INR.monthly.amount;
    case "six_month":
      return RAZORPAY_PLAN_PRICES_INR.six_month.amount / 6;
    case "yearly":
      return RAZORPAY_PLAN_PRICES_INR.yearly.amount / 12;
    default:
      return PLAN_PRICES.monthly.amount;
  }
}

export async function computeKpis(range: GrowthTimeRange): Promise<Record<string, TrendValue>> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();
  const prevStart = range.previousStart.toISOString();
  const prevEnd = range.previousEnd.toISOString();

  const [activeRes, sessionRes, newUsersRes, returningRes, opensRes, subsRes, crashRes, revenueRes, purchaseRes, refundsRes] =
    await Promise.all([
      db.execute(sql`
        SELECT
          count(DISTINCT user_id) FILTER (WHERE server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz)::int AS dau,
          count(DISTINCT user_id) FILTER (WHERE server_ts >= ${prevStart}::timestamptz AND server_ts <= ${prevEnd}::timestamptz)::int AS dau_prev,
          count(DISTINCT user_id) FILTER (WHERE server_ts >= (${end}::timestamptz - interval '7 day'))::int AS wau,
          count(DISTINCT user_id) FILTER (WHERE server_ts >= (${end}::timestamptz - interval '30 day'))::int AS mau
        FROM analytics_events
        WHERE ${ANALYTICS_NOISE_FILTER}
      `),
      db.execute(sql`
        SELECT
          count(DISTINCT session_id) FILTER (WHERE server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz AND session_id IS NOT NULL)::int AS sessions,
          count(DISTINCT session_id) FILTER (WHERE server_ts >= ${prevStart}::timestamptz AND server_ts <= ${prevEnd}::timestamptz AND session_id IS NOT NULL)::int AS sessions_prev,
          coalesce(avg((props->>'duration_ms')::numeric) FILTER (WHERE event_name = 'session_end' AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz AND props ? 'duration_ms'), 0)::float AS avg_session_ms,
          coalesce(avg((props->>'duration_ms')::numeric) FILTER (WHERE event_name = 'session_end' AND server_ts >= ${prevStart}::timestamptz AND server_ts <= ${prevEnd}::timestamptz AND props ? 'duration_ms'), 0)::float AS avg_session_ms_prev
        FROM analytics_events
        WHERE ${ANALYTICS_NOISE_FILTER}
      `),
      db.execute(sql`
        SELECT
          count(DISTINCT user_id) FILTER (WHERE first_ts >= ${start}::timestamptz AND first_ts <= ${end}::timestamptz)::int AS new_users,
          count(DISTINCT user_id) FILTER (WHERE first_ts >= ${prevStart}::timestamptz AND first_ts <= ${prevEnd}::timestamptz)::int AS new_users_prev
        FROM (
          SELECT user_id, min(server_ts) AS first_ts
          FROM analytics_events WHERE ${ANALYTICS_NOISE_FILTER} GROUP BY user_id
        ) fs
      `),
      db.execute(sql`
        SELECT count(DISTINCT ae.user_id)::int AS returning_users
        FROM analytics_events ae
        JOIN (
          SELECT user_id, min(server_ts) AS first_ts
          FROM analytics_events WHERE ${ANALYTICS_NOISE_FILTER} GROUP BY user_id
        ) fs ON fs.user_id = ae.user_id
        WHERE ae.server_ts >= ${start}::timestamptz AND ae.server_ts <= ${end}::timestamptz
          AND fs.first_ts < ${start}::timestamptz
          AND ${ANALYTICS_NOISE_FILTER}
      `),
      db.execute(sql`
        SELECT
          count(DISTINCT user_id) FILTER (WHERE event_name = 'first_open' AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz)::int AS first_opens,
          count(DISTINCT user_id) FILTER (WHERE event_name = 'first_open' AND server_ts >= ${prevStart}::timestamptz AND server_ts <= ${prevEnd}::timestamptz)::int AS first_opens_prev,
          count(DISTINCT user_id) FILTER (WHERE event_name = 'device_registered' AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz)::int AS downloads,
          count(DISTINCT user_id) FILTER (WHERE event_name = 'device_registered' AND server_ts >= ${prevStart}::timestamptz AND server_ts <= ${prevEnd}::timestamptz)::int AS downloads_prev,
          count(DISTINCT user_id) FILTER (WHERE event_name = 'app_open' AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz)::int AS app_opens,
          count(DISTINCT user_id) FILTER (WHERE event_name = 'app_open' AND server_ts >= ${prevStart}::timestamptz AND server_ts <= ${prevEnd}::timestamptz)::int AS app_opens_prev
        FROM analytics_events
        WHERE ${ANALYTICS_NOISE_FILTER}
      `),
      db.execute(sql`
        SELECT
          count(*) FILTER (WHERE subscription_state = 'ACTIVE')::int AS paid,
          count(*) FILTER (WHERE subscription_state = 'TRIAL' AND updated_at >= ${start}::timestamptz AND updated_at <= ${end}::timestamptz)::int AS trials_started,
          count(*) FILTER (WHERE subscription_state = 'TRIAL' AND updated_at >= ${prevStart}::timestamptz AND updated_at <= ${prevEnd}::timestamptz)::int AS trials_started_prev,
          count(*) FILTER (WHERE subscription_state = 'ACTIVE' AND updated_at >= ${start}::timestamptz AND updated_at <= ${end}::timestamptz)::int AS trials_converted,
          count(*) FILTER (WHERE subscription_state = 'ACTIVE' AND updated_at >= ${prevStart}::timestamptz AND updated_at <= ${prevEnd}::timestamptz)::int AS trials_converted_prev,
          count(*) FILTER (WHERE last_event_type ILIKE '%RENEW%' AND last_event_at >= ${start}::timestamptz AND last_event_at <= ${end}::timestamptz)::int AS renewals,
          count(*) FILTER (WHERE subscription_state IN ('CANCELLED', 'EXPIRED') AND updated_at >= ${start}::timestamptz AND updated_at <= ${end}::timestamptz)::int AS churn,
          count(*) FILTER (WHERE subscription_state IN ('CANCELLED', 'EXPIRED') AND updated_at >= ${prevStart}::timestamptz AND updated_at <= ${prevEnd}::timestamptz)::int AS churn_prev
        FROM subscriptions
      `),
      db.execute(sql`
        SELECT
          count(*) FILTER (WHERE created_at >= ${start}::timestamptz AND created_at <= ${end}::timestamptz)::int AS crashes,
          count(*) FILTER (WHERE created_at >= ${prevStart}::timestamptz AND created_at <= ${prevEnd}::timestamptz)::int AS crashes_prev
        FROM crash_events
      `),
      db.execute(sql`
        SELECT plan, count(*)::int AS cnt
        FROM subscriptions
        WHERE subscription_state = 'ACTIVE' AND plan IN ('monthly', 'six_month', 'yearly')
        GROUP BY plan
      `),
      db.execute(sql`
        SELECT
          count(DISTINCT user_id) FILTER (WHERE server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz)::int AS revenue_events,
          count(DISTINCT user_id) FILTER (WHERE server_ts >= ${prevStart}::timestamptz AND server_ts <= ${prevEnd}::timestamptz)::int AS revenue_events_prev
        FROM analytics_events
        WHERE (event_name = 'upgrade_completed'
          OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success'))
          AND ${ANALYTICS_NOISE_FILTER}
      `),
      db.execute(sql`
        SELECT count(*)::int AS cnt FROM billing_audit_events
        WHERE event_name ILIKE '%refund%'
          AND created_at >= ${start}::timestamptz AND created_at <= ${end}::timestamptz
      `),
    ]);

  const a = (activeRes.rows[0] ?? {}) as Record<string, unknown>;
  const s = (sessionRes.rows[0] ?? {}) as Record<string, unknown>;
  const nu = (newUsersRes.rows[0] ?? {}) as Record<string, unknown>;
  const ret = (returningRes.rows[0] ?? {}) as Record<string, unknown>;
  const o = (opensRes.rows[0] ?? {}) as Record<string, unknown>;
  const sub = (subsRes.rows[0] ?? {}) as Record<string, unknown>;
  const cr = (crashRes.rows[0] ?? {}) as Record<string, unknown>;
  const p = (purchaseRes.rows[0] ?? {}) as Record<string, unknown>;
  const rf = (refundsRes.rows[0] ?? {}) as Record<string, unknown>;

  let mrr = 0;
  for (const row of revenueRes.rows) {
    const r = row as Record<string, unknown>;
    mrr += monthlyRevenueInr(String(r.plan)) * rowNum(r, "cnt");
  }

  const appOpens = rowNum(o, "app_opens");
  const crashes = rowNum(cr, "crashes");
  const crashFreePct =
    appOpens > 0 ? Math.round(((appOpens - Math.min(crashes, appOpens)) / appOpens) * 1000) / 10 : null;

  const revenueEvents = rowNum(p, "revenue_events");
  const revenueEventsPrev = rowNum(p, "revenue_events_prev");

  return {
    dau: trend(rowNum(a, "dau"), rowNum(a, "dau_prev")),
    mau: trend(rowNum(a, "mau"), rowNum(a, "mau")),
    wau: trend(rowNum(a, "wau"), rowNum(a, "wau")),
    newUsers: trend(rowNum(nu, "new_users"), rowNum(nu, "new_users_prev")),
    returningUsers: trend(rowNum(ret, "returning_users"), 0),
    sessions: trend(rowNum(s, "sessions"), rowNum(s, "sessions_prev")),
    avgSessionDuration: trend(
      Math.round(Number(s.avg_session_ms ?? 0) / 1000),
      Math.round(Number(s.avg_session_ms_prev ?? 0) / 1000),
    ),
    crashFreePct: trend(crashFreePct ?? 0, 0),
    subscriptionRevenue: trend(
      revenueEvents * monthlyRevenueInr("monthly"),
      revenueEventsPrev * monthlyRevenueInr("monthly"),
    ),
    mrr: trend(Math.round(mrr), Math.round(mrr)),
    arr: trend(Math.round(mrr * 12), Math.round(mrr * 12)),
    trialsStarted: trend(rowNum(sub, "trials_started"), rowNum(sub, "trials_started_prev")),
    trialsConverted: trend(rowNum(sub, "trials_converted"), rowNum(sub, "trials_converted_prev")),
    paidSubscribers: trend(rowNum(sub, "paid"), rowNum(sub, "paid")),
    renewals: trend(rowNum(sub, "renewals"), 0),
    churn: trend(rowNum(sub, "churn"), rowNum(sub, "churn_prev")),
    refunds: trend(rowNum(rf, "cnt"), 0),
    downloads: trend(rowNum(o, "downloads"), rowNum(o, "downloads_prev")),
    appOpens: trend(appOpens, rowNum(o, "app_opens_prev")),
  };
}
