import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "../../growth-dashboard/types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "../../growth-dashboard/sqlHelpers.js";

export type CohortType = "install" | "signup" | "subscription";

export type CohortExplorerRow = {
  cohort: string;
  cohortSize: number;
  d1: number | null;
  d7: number | null;
  d30: number | null;
  subscriptionRate: number | null;
  revenueUsers: number;
};

export async function exploreCohorts(
  range: GrowthTimeRange,
  cohortType: CohortType,
  limit = 12,
): Promise<CohortExplorerRow[]> {
  const eventFilter =
    cohortType === "install"
      ? sql`event_name = 'device_registered'`
      : cohortType === "signup"
        ? sql`event_name IN ('pre_signup_signup_completed', 'pre_signup_login_completed')`
        : sql`event_name IN ('upgrade_completed') OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success')`;

  const res = await db.execute(sql`
    WITH cohort_users AS (
      SELECT user_id, min(server_ts)::date AS cohort_day
      FROM analytics_events
      WHERE ${eventFilter}
        AND server_ts >= ${range.start.toISOString()}::timestamptz
        AND server_ts <= ${range.end.toISOString()}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY user_id
    ),
    activity AS (
      SELECT DISTINCT user_id, server_ts::date AS day
      FROM analytics_events WHERE ${ANALYTICS_NOISE_FILTER}
    ),
    subs AS (
      SELECT DISTINCT user_id FROM analytics_events
      WHERE event_name IN ('upgrade_completed')
        OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success')
    )
    SELECT
      to_char(cu.cohort_day, 'YYYY-MM-DD') AS cohort,
      count(DISTINCT cu.user_id)::int AS cohort_size,
      count(DISTINCT a1.user_id)::int AS d1,
      count(DISTINCT a7.user_id)::int AS d7,
      count(DISTINCT a30.user_id)::int AS d30,
      count(DISTINCT s.user_id)::int AS revenue_users
    FROM cohort_users cu
    LEFT JOIN activity a1 ON a1.user_id = cu.user_id AND a1.day = cu.cohort_day + 1
    LEFT JOIN activity a7 ON a7.user_id = cu.user_id AND a7.day = cu.cohort_day + 7
    LEFT JOIN activity a30 ON a30.user_id = cu.user_id AND a30.day = cu.cohort_day + 30
    LEFT JOIN subs s ON s.user_id = cu.user_id
    GROUP BY cu.cohort_day
    ORDER BY cu.cohort_day DESC
    LIMIT ${limit}
  `);

  return res.rows.map((row) => {
    const r = row as Record<string, unknown>;
    const size = rowNum(r, "cohort_size");
    return {
      cohort: String(r.cohort),
      cohortSize: size,
      d1: pctRate(rowNum(r, "d1"), size),
      d7: pctRate(rowNum(r, "d7"), size),
      d30: pctRate(rowNum(r, "d30"), size),
      subscriptionRate: pctRate(rowNum(r, "revenue_users"), size),
      revenueUsers: rowNum(r, "revenue_users"),
    };
  });
}
