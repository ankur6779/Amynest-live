import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "../growth-dashboard/types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "../growth-dashboard/sqlHelpers.js";
import type { CohortIntelRow } from "./types.js";

async function cohortByDimension(
  dimension: string,
  segmentExpr: ReturnType<typeof sql>,
  range: GrowthTimeRange,
): Promise<CohortIntelRow[]> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();

  const res = await db.execute(sql`
    WITH first_seen AS (
      SELECT user_id, min(server_ts)::date AS cohort_day
      FROM analytics_events WHERE ${ANALYTICS_NOISE_FILTER} GROUP BY user_id
    ),
    activity AS (
      SELECT DISTINCT user_id, server_ts::date AS day FROM analytics_events
    ),
    scoped AS (
      SELECT DISTINCT ae.user_id, ${segmentExpr} AS segment
      FROM analytics_events ae
      WHERE ae.server_ts >= ${start}::timestamptz AND ae.server_ts <= ${end}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
    ),
    routines AS (
      SELECT DISTINCT user_id FROM analytics_events
      WHERE event_name IN ('routine_generated', 'routine_generation_completed')
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
    ),
    trials AS (
      SELECT DISTINCT user_id FROM subscriptions
      WHERE subscription_state IN ('TRIAL', 'EXPIRED') OR trial_ends_at IS NOT NULL
    ),
    paid AS (
      SELECT DISTINCT user_id FROM subscriptions WHERE subscription_state = 'ACTIVE' AND provider = 'revenuecat'
    )
    SELECT
      s.segment,
      count(DISTINCT s.user_id)::int AS users,
      round(100.0 * count(DISTINCT CASE WHEN a.day = fs.cohort_day + 1 THEN s.user_id END)
        / nullif(count(DISTINCT s.user_id) FILTER (WHERE fs.cohort_day <= now()::date - 1), 0), 1) AS d1,
      round(100.0 * count(DISTINCT CASE WHEN a.day = fs.cohort_day + 7 THEN s.user_id END)
        / nullif(count(DISTINCT s.user_id) FILTER (WHERE fs.cohort_day <= now()::date - 7), 0), 1) AS d7,
      round(100.0 * count(DISTINCT r.user_id) / nullif(count(DISTINCT s.user_id), 0), 1) AS routine_rate,
      round(100.0 * count(DISTINCT t.user_id) / nullif(count(DISTINCT s.user_id), 0), 1) AS trial_rate,
      round(100.0 * count(DISTINCT p.user_id) / nullif(count(DISTINCT s.user_id), 0), 1) AS paid_rate
    FROM scoped s
    JOIN first_seen fs ON fs.user_id = s.user_id
    LEFT JOIN activity a ON a.user_id = s.user_id
    LEFT JOIN routines r ON r.user_id = s.user_id
    LEFT JOIN trials t ON t.user_id = s.user_id
    LEFT JOIN paid p ON p.user_id = s.user_id
    WHERE fs.cohort_day >= ${start}::date
    GROUP BY s.segment
    ORDER BY users DESC
    LIMIT 12
  `);

  return res.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      segment: String(r.segment ?? "unknown"),
      dimension,
      users: rowNum(r, "users"),
      d1: r.d1 != null ? Number(r.d1) : null,
      d7: r.d7 != null ? Number(r.d7) : null,
      routineRate: r.routine_rate != null ? Number(r.routine_rate) : null,
      trialRate: r.trial_rate != null ? Number(r.trial_rate) : null,
      paidRate: r.paid_rate != null ? Number(r.paid_rate) : null,
      verified: rowNum(r, "users") >= 10,
    };
  });
}

export async function computeCohortIntelligence(
  range: GrowthTimeRange,
): Promise<CohortIntelRow[]> {
  const [country, platform] = await Promise.all([
    cohortByDimension("country", sql`coalesce(nullif(props->>'country', ''), 'unknown')`, range),
    cohortByDimension("platform", sql`coalesce(platform, 'unknown')`, range),
  ]);

  return [...country, ...platform];
}
