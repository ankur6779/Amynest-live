import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { CohortRetentionRow, GrowthTimeRange, RetentionSummary } from "./types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "./sqlHelpers.js";

const RETENTION_DAYS = [1, 3, 7, 14, 30] as const;

async function aggregateRetentionRates(windowDays: number): Promise<RetentionSummary> {
  const res = await db.execute(sql`
    WITH first_seen AS (
      SELECT user_id, min(server_ts)::date AS cohort_day
      FROM analytics_events
      WHERE ${ANALYTICS_NOISE_FILTER}
      GROUP BY user_id
    ),
    activity AS (
      SELECT DISTINCT user_id, server_ts::date AS day
      FROM analytics_events
      WHERE ${ANALYTICS_NOISE_FILTER}
    ),
    cohorts AS (
      SELECT
        fs.user_id,
        fs.cohort_day,
        max(CASE WHEN a.day = fs.cohort_day + 1 THEN 1 ELSE 0 END) AS d1,
        max(CASE WHEN a.day = fs.cohort_day + 3 THEN 1 ELSE 0 END) AS d3,
        max(CASE WHEN a.day = fs.cohort_day + 7 THEN 1 ELSE 0 END) AS d7,
        max(CASE WHEN a.day = fs.cohort_day + 14 THEN 1 ELSE 0 END) AS d14,
        max(CASE WHEN a.day = fs.cohort_day + 30 THEN 1 ELSE 0 END) AS d30
      FROM first_seen fs
      LEFT JOIN activity a ON a.user_id = fs.user_id
      WHERE fs.cohort_day >= (now()::date - ${windowDays})
      GROUP BY fs.user_id, fs.cohort_day
    )
    SELECT
      count(*) FILTER (WHERE cohort_day <= now()::date - 1)::int AS d1_eligible,
      sum(d1) FILTER (WHERE cohort_day <= now()::date - 1)::int AS d1_retained,
      count(*) FILTER (WHERE cohort_day <= now()::date - 3)::int AS d3_eligible,
      sum(d3) FILTER (WHERE cohort_day <= now()::date - 3)::int AS d3_retained,
      count(*) FILTER (WHERE cohort_day <= now()::date - 7)::int AS d7_eligible,
      sum(d7) FILTER (WHERE cohort_day <= now()::date - 7)::int AS d7_retained,
      count(*) FILTER (WHERE cohort_day <= now()::date - 14)::int AS d14_eligible,
      sum(d14) FILTER (WHERE cohort_day <= now()::date - 14)::int AS d14_retained,
      count(*) FILTER (WHERE cohort_day <= now()::date - 30)::int AS d30_eligible,
      sum(d30) FILTER (WHERE cohort_day <= now()::date - 30)::int AS d30_retained
    FROM cohorts
  `);
  const r = (res.rows[0] ?? {}) as Record<string, unknown>;
  return {
    d1: pctRate(rowNum(r, "d1_retained"), rowNum(r, "d1_eligible")),
    d3: pctRate(rowNum(r, "d3_retained"), rowNum(r, "d3_eligible")),
    d7: pctRate(rowNum(r, "d7_retained"), rowNum(r, "d7_eligible")),
    d14: pctRate(rowNum(r, "d14_retained"), rowNum(r, "d14_eligible")),
    d30: pctRate(rowNum(r, "d30_retained"), rowNum(r, "d30_eligible")),
  };
}

async function cohortRows(granularity: "week" | "month", limit: number): Promise<CohortRetentionRow[]> {
  const trunc = granularity === "week" ? "week" : "month";
  const res = await db.execute(sql`
    WITH first_seen AS (
      SELECT user_id, min(server_ts)::date AS cohort_day
      FROM analytics_events
      WHERE ${ANALYTICS_NOISE_FILTER}
      GROUP BY user_id
    ),
    activity AS (
      SELECT DISTINCT user_id, server_ts::date AS day
      FROM analytics_events
      WHERE ${ANALYTICS_NOISE_FILTER}
    ),
    grouped AS (
      SELECT
        to_char(date_trunc(${trunc}, fs.cohort_day), 'YYYY-MM-DD') AS cohort,
        count(DISTINCT fs.user_id)::int AS cohort_size,
        count(DISTINCT a1.user_id)::int AS d1,
        count(DISTINCT a3.user_id)::int AS d3,
        count(DISTINCT a7.user_id)::int AS d7,
        count(DISTINCT a14.user_id)::int AS d14,
        count(DISTINCT a30.user_id)::int AS d30
      FROM first_seen fs
      LEFT JOIN activity a1 ON a1.user_id = fs.user_id AND a1.day = fs.cohort_day + 1
      LEFT JOIN activity a3 ON a3.user_id = fs.user_id AND a3.day = fs.cohort_day + 3
      LEFT JOIN activity a7 ON a7.user_id = fs.user_id AND a7.day = fs.cohort_day + 7
      LEFT JOIN activity a14 ON a14.user_id = fs.user_id AND a14.day = fs.cohort_day + 14
      LEFT JOIN activity a30 ON a30.user_id = fs.user_id AND a30.day = fs.cohort_day + 30
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT ${limit}
    )
    SELECT * FROM grouped ORDER BY cohort ASC
  `);

  return res.rows.map((row) => {
    const r = row as Record<string, unknown>;
    const size = rowNum(r, "cohort_size");
    return {
      cohort: String(r.cohort),
      cohortSize: size,
      d1: pctRate(rowNum(r, "d1"), size),
      d3: pctRate(rowNum(r, "d3"), size),
      d7: pctRate(rowNum(r, "d7"), size),
      d14: pctRate(rowNum(r, "d14"), size),
      d30: pctRate(rowNum(r, "d30"), size),
    };
  });
}

async function heatmap(limit: number): Promise<
  Array<{ cohort: string; day: number; rate: number | null; users: number }>
> {
  const res = await db.execute(sql`
    WITH first_seen AS (
      SELECT user_id, min(server_ts)::date AS cohort_day
      FROM analytics_events
      WHERE ${ANALYTICS_NOISE_FILTER}
      GROUP BY user_id
    ),
    activity AS (
      SELECT DISTINCT user_id, server_ts::date AS day
      FROM analytics_events
      WHERE ${ANALYTICS_NOISE_FILTER}
    ),
    recent_cohorts AS (
      SELECT cohort_day, count(*)::int AS cohort_size
      FROM first_seen
      GROUP BY cohort_day
      ORDER BY cohort_day DESC
      LIMIT ${limit}
    )
    SELECT
      to_char(rc.cohort_day, 'YYYY-MM-DD') AS cohort,
      d.day_offset,
      rc.cohort_size AS users,
      count(DISTINCT a.user_id)::int AS retained
    FROM recent_cohorts rc
    CROSS JOIN (SELECT unnest(ARRAY[1,3,7,14,30]) AS day_offset) d
    LEFT JOIN first_seen fs ON fs.cohort_day = rc.cohort_day
    LEFT JOIN activity a ON a.user_id = fs.user_id AND a.day = fs.cohort_day + d.day_offset
    GROUP BY rc.cohort_day, d.day_offset, rc.cohort_size
    ORDER BY rc.cohort_day ASC, d.day_offset ASC
  `);

  return res.rows.map((row) => {
    const r = row as Record<string, unknown>;
    const users = rowNum(r, "users");
    const retained = rowNum(r, "retained");
    return {
      cohort: String(r.cohort),
      day: rowNum(r, "day_offset"),
      rate: pctRate(retained, users),
      users,
    };
  });
}

export async function computeRetention(range: GrowthTimeRange) {
  const windowDays = Math.max(
    30,
    Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000),
  );
  const [summary, weeklyCohorts, monthlyCohorts, heatmapData] = await Promise.all([
    aggregateRetentionRates(windowDays),
    cohortRows("week", 12),
    cohortRows("month", 12),
    heatmap(14),
  ]);
  return { summary, weeklyCohorts, monthlyCohorts, heatmap: heatmapData };
}

export { RETENTION_DAYS };
