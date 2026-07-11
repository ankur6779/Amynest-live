import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "../growth-dashboard/types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "../growth-dashboard/sqlHelpers.js";

export type PeriodCounts = {
  current: number;
  previous: number;
  day1: number;
  day7: number;
  day30: number;
};

async function countDistinctUsers(
  condition: ReturnType<typeof sql>,
  range: GrowthTimeRange,
): Promise<PeriodCounts> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();
  const prevStart = range.previousStart.toISOString();
  const prevEnd = range.previousEnd.toISOString();
  const day1End = new Date(range.end);
  day1End.setUTCDate(day1End.getUTCDate() - 1);
  const day1Start = new Date(day1End);
  day1Start.setUTCDate(day1Start.getUTCDate() - 1);
  const day7Start = new Date(range.end);
  day7Start.setUTCDate(day7Start.getUTCDate() - 7);
  const day30Start = new Date(range.end);
  day30Start.setUTCDate(day30Start.getUTCDate() - 30);

  const res = await db.execute(sql`
    SELECT
      count(DISTINCT user_id) FILTER (
        WHERE server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
      )::int AS current,
      count(DISTINCT user_id) FILTER (
        WHERE server_ts >= ${prevStart}::timestamptz AND server_ts <= ${prevEnd}::timestamptz
      )::int AS previous,
      count(DISTINCT user_id) FILTER (
        WHERE server_ts >= ${day1Start.toISOString()}::timestamptz AND server_ts <= ${day1End.toISOString()}::timestamptz
      )::int AS day1,
      count(DISTINCT user_id) FILTER (
        WHERE server_ts >= ${day7Start.toISOString()}::timestamptz AND server_ts <= ${end}::timestamptz
      )::int AS day7,
      count(DISTINCT user_id) FILTER (
        WHERE server_ts >= ${day30Start.toISOString()}::timestamptz AND server_ts <= ${end}::timestamptz
      )::int AS day30
    FROM analytics_events
    WHERE ${condition}
      AND ${ANALYTICS_NOISE_FILTER}
  `);
  const r = (res.rows[0] ?? {}) as Record<string, unknown>;
  return {
    current: rowNum(r, "current"),
    previous: rowNum(r, "previous"),
    day1: rowNum(r, "day1"),
    day7: rowNum(r, "day7"),
    day30: rowNum(r, "day30"),
  };
}

function pctChange(current: number, baseline: number): number | null {
  if (baseline === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - baseline) / baseline) * 1000) / 10;
}

export type FunnelStageCounts = {
  key: string;
  label: string;
  users: PeriodCounts;
  available: boolean;
};

const FUNNEL_STAGES: Array<{
  key: string;
  label: string;
  condition: ReturnType<typeof sql>;
  available?: boolean;
}> = [
  { key: "install", label: "Install", condition: sql`event_name = 'device_registered'` },
  { key: "first_open", label: "First Open", condition: sql`event_name = 'first_open'` },
  {
    key: "signup",
    label: "Signup",
    condition: sql`(
      event_name IN ('pre_signup_signup_completed', 'pre_signup_login_completed')
      OR (event_name = 'onboarding_milestone' AND props->>'milestone' = 'signup_completed')
    )`,
  },
  {
    key: "onboarding_completed",
    label: "Onboarding Completed",
    condition: sql`(
      (event_name = 'onboarding_funnel_event' AND props->>'step' = 'finish_clicked')
      OR (event_name = 'onboarding_milestone' AND props->>'milestone' = 'completed')
    )`,
  },
  {
    key: "dashboard_view",
    label: "Dashboard",
    condition: sql`(
      event_name = 'dashboard_view'
      OR (event_name = 'screen_view' AND props->>'screen' = '/dashboard')
    )`,
  },
  {
    key: "routine_cta",
    label: "Routine CTA",
    condition: sql`event_name = 'routine_cta_clicked'`,
  },
  {
    key: "routine_started",
    label: "Routine Started",
    condition: sql`event_name = 'routine_generation_started'`,
  },
  {
    key: "routine_completed",
    label: "Routine Generated",
    condition: sql`(
      event_name IN ('routine_generated', 'routine_generation_completed')
    )`,
  },
  {
    key: "first_value",
    label: "First Value Achieved",
    condition: sql`event_name = 'first_value_achieved'`,
  },
  {
    key: "second_session",
    label: "Second Session",
    condition: sql`event_name = 'session_start'`,
  },
  {
    key: "trial_started",
    label: "Trial Started",
    condition: sql`(
      (event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started')
      OR event_name = 'speech_coach_trial_started'
    )`,
  },
  {
    key: "purchase",
    label: "Purchase",
    condition: sql`(
      event_name = 'upgrade_completed'
      OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success')
    )`,
  },
];

export async function computeObservatoryFunnelCounts(
  range: GrowthTimeRange,
): Promise<FunnelStageCounts[]> {
  const results = await Promise.all(
    FUNNEL_STAGES.map(async (stage) => ({
      key: stage.key,
      label: stage.label,
      users: await countDistinctUsers(stage.condition, range),
      available: stage.available !== false,
    })),
  );
  return results;
}

export function buildFunnelIntelStages(
  counts: FunnelStageCounts[],
): import("./types.js").FunnelIntelStage[] {
  return counts.map((stage, idx) => {
    const prevStage = idx > 0 ? counts[idx - 1] : null;
    const prevUsers = prevStage?.users.current ?? stage.users.current;
    return {
      key: stage.key,
      label: stage.label,
      users: stage.users.current,
      dropPct:
        idx > 0 && prevUsers > 0
          ? pctRate(prevUsers - stage.users.current, prevUsers)
          : null,
      conversionPct:
        idx === 0
          ? stage.users.current > 0
            ? 100
            : null
          : pctRate(stage.users.current, prevUsers),
      trendVsYesterday: pctChange(stage.users.current, stage.users.day1),
      trendVs7d: pctChange(stage.users.current, stage.users.day7),
      trendVs30d: pctChange(stage.users.current, stage.users.day30),
      available: stage.available,
    };
  });
}

export async function computeActivationMetrics(range: GrowthTimeRange) {
  const start = range.start.toISOString();
  const end = range.end.toISOString();

  const res = await db.execute(sql`
    WITH first_value AS (
      SELECT user_id, min(server_ts) AS achieved_at
      FROM analytics_events
      WHERE event_name = 'first_value_achieved'
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
      GROUP BY user_id
    ),
    first_seen AS (
      SELECT user_id, min(server_ts) AS first_ts
      FROM analytics_events
      WHERE ${ANALYTICS_NOISE_FILTER}
      GROUP BY user_id
    ),
    deltas AS (
      SELECT extract(epoch from (fv.achieved_at - fs.first_ts)) / 60.0 AS minutes
      FROM first_value fv
      JOIN first_seen fs ON fs.user_id = fv.user_id
    )
    SELECT
      count(*)::int AS first_value_users,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes)::float AS p50_min,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY minutes)::float AS p95_min
    FROM deltas
  `);

  const dashboard = await countDistinctUsers(
    sql`(event_name = 'dashboard_view' OR (event_name = 'screen_view' AND props->>'screen' = '/dashboard'))`,
    range,
  );
  const cta = await countDistinctUsers(sql`event_name = 'routine_cta_clicked'`, range);
  const started = await countDistinctUsers(sql`event_name = 'routine_generation_started'`, range);
  const completed = await countDistinctUsers(
    sql`event_name IN ('routine_generated', 'routine_generation_completed')`,
    range,
  );
  const firstValue = await countDistinctUsers(sql`event_name = 'first_value_achieved'`, range);

  const r = (res.rows[0] ?? {}) as Record<string, unknown>;

  const signup = await countDistinctUsers(
    sql`(
      event_name IN ('pre_signup_signup_completed', 'pre_signup_login_completed')
      OR (event_name = 'onboarding_milestone' AND props->>'milestone' = 'signup_completed')
    )`,
    range,
  );

  return {
    dashboardReachPct: pctRate(dashboard.current, signup.current),
    dashboardReachUsers: dashboard.current,
    routineCtaPct: pctRate(cta.current, dashboard.current),
    routineStartedPct: pctRate(started.current, dashboard.current),
    routineCompletedPct: pctRate(completed.current, dashboard.current),
    firstValuePct: pctRate(firstValue.current, dashboard.current),
    timeToFirstValueMedianMin: r.p50_min != null ? Math.round(Number(r.p50_min) * 10) / 10 : null,
    timeToFirstValueP95Min: r.p95_min != null ? Math.round(Number(r.p95_min) * 10) / 10 : null,
    counts: { dashboard, cta, started, completed, firstValue, signup },
  };
}

export async function computeHistoricalSeries(
  eventCondition: ReturnType<typeof sql>,
  days: number,
): Promise<import("./types.js").HistoricalTrendPoint[]> {
  const res = await db.execute(sql`
    WITH daily AS (
      SELECT
        server_ts::date AS day,
        count(DISTINCT user_id)::int AS value
      FROM analytics_events
      WHERE ${eventCondition}
        AND ${ANALYTICS_NOISE_FILTER}
        AND server_ts >= (now()::date - ${days})
      GROUP BY 1
      ORDER BY 1
    )
    SELECT
      to_char(day, 'YYYY-MM-DD') AS day,
      value,
      avg(value) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)::float AS ma7,
      avg(value) OVER (ORDER BY day ROWS BETWEEN 29 PRECEDING AND CURRENT ROW)::float AS ma30
    FROM daily
    ORDER BY day
  `);

  return res.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      day: String(r.day),
      value: rowNum(r, "value"),
      ma7: r.ma7 != null ? Math.round(Number(r.ma7) * 10) / 10 : null,
      ma30: r.ma30 != null ? Math.round(Number(r.ma30) * 10) / 10 : null,
    };
  });
}

export { pctChange };
