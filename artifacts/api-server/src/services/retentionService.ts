/**
 * Retention measurement over the unified analytics_events spine.
 *
 * "Active" = any tracked analytics event for a user on a given calendar day
 * (server_ts). Provides DAU/WAU/MAU and day-1/7/30 cohort retention. This is
 * a measurement capability only — there is no dashboard UI, and nothing here
 * feeds routine generation.
 */
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export type DauPoint = { day: string; count: number };

export type RetentionCohort = {
  cohortDay: string;
  cohortSize: number;
  d1: number;
  d7: number;
  d30: number;
  matureD1: boolean;
  matureD7: boolean;
  matureD30: boolean;
};

export type RetentionRate = {
  /** Retained users / cohort users, across mature cohorts. Null if no mature cohorts yet. */
  rate: number | null;
  cohortUsers: number;
  retainedUsers: number;
};

export type RetentionReport = {
  generatedAt: string;
  windowDays: number;
  activeUsers: { dau: number; wau: number; mau: number };
  dauSeries: DauPoint[];
  cohorts: RetentionCohort[];
  retention: { d1: RetentionRate; d7: RetentionRate; d30: RetentionRate };
};

function rate(retained: number, cohort: number): RetentionRate {
  return {
    rate: cohort === 0 ? null : Math.round((retained / cohort) * 1000) / 1000,
    cohortUsers: cohort,
    retainedUsers: retained,
  };
}

export async function computeRetention(windowDays = 30): Promise<RetentionReport> {
  const days = Math.min(Math.max(Math.trunc(windowDays) || 30, 7), 180);

  const dauRes = await db.execute(sql`
    SELECT to_char(server_ts::date, 'YYYY-MM-DD') AS day,
           count(DISTINCT user_id)::int AS count
    FROM analytics_events
    WHERE server_ts >= now() - (${days} * interval '1 day')
    GROUP BY 1
    ORDER BY 1
  `);
  const dauSeries: DauPoint[] = dauRes.rows.map((r) => ({
    day: String((r as Record<string, unknown>).day),
    count: Number((r as Record<string, unknown>).count),
  }));

  const activeRes = await db.execute(sql`
    SELECT
      count(DISTINCT user_id) FILTER (WHERE server_ts >= now() - interval '1 day')::int AS dau,
      count(DISTINCT user_id) FILTER (WHERE server_ts >= now() - interval '7 day')::int AS wau,
      count(DISTINCT user_id) FILTER (WHERE server_ts >= now() - interval '30 day')::int AS mau
    FROM analytics_events
  `);
  const a = (activeRes.rows[0] ?? {}) as Record<string, unknown>;
  const activeUsers = {
    dau: Number(a.dau ?? 0),
    wau: Number(a.wau ?? 0),
    mau: Number(a.mau ?? 0),
  };

  const cohortRes = await db.execute(sql`
    WITH first_seen AS (
      SELECT user_id, min(server_ts)::date AS cohort_day
      FROM analytics_events
      GROUP BY user_id
    ),
    activity AS (
      SELECT DISTINCT user_id, server_ts::date AS day
      FROM analytics_events
    )
    SELECT
      to_char(fs.cohort_day, 'YYYY-MM-DD') AS cohort_day,
      count(DISTINCT fs.user_id)::int AS cohort_size,
      count(DISTINCT a1.user_id)::int AS d1,
      count(DISTINCT a7.user_id)::int AS d7,
      count(DISTINCT a30.user_id)::int AS d30,
      bool_or(fs.cohort_day <= (now()::date - 1)) AS mature_d1,
      bool_or(fs.cohort_day <= (now()::date - 7)) AS mature_d7,
      bool_or(fs.cohort_day <= (now()::date - 30)) AS mature_d30
    FROM first_seen fs
    LEFT JOIN activity a1 ON a1.user_id = fs.user_id AND a1.day = fs.cohort_day + 1
    LEFT JOIN activity a7 ON a7.user_id = fs.user_id AND a7.day = fs.cohort_day + 7
    LEFT JOIN activity a30 ON a30.user_id = fs.user_id AND a30.day = fs.cohort_day + 30
    WHERE fs.cohort_day >= (now()::date - ${days})
    GROUP BY fs.cohort_day
    ORDER BY fs.cohort_day
  `);

  const cohorts: RetentionCohort[] = cohortRes.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      cohortDay: String(r.cohort_day),
      cohortSize: Number(r.cohort_size),
      d1: Number(r.d1),
      d7: Number(r.d7),
      d30: Number(r.d30),
      matureD1: Boolean(r.mature_d1),
      matureD7: Boolean(r.mature_d7),
      matureD30: Boolean(r.mature_d30),
    };
  });

  // Aggregate retention only over cohorts old enough to have had the chance.
  let d1c = 0, d1r = 0, d7c = 0, d7r = 0, d30c = 0, d30r = 0;
  for (const c of cohorts) {
    if (c.matureD1) { d1c += c.cohortSize; d1r += c.d1; }
    if (c.matureD7) { d7c += c.cohortSize; d7r += c.d7; }
    if (c.matureD30) { d30c += c.cohortSize; d30r += c.d30; }
  }

  return {
    generatedAt: new Date().toISOString(),
    windowDays: days,
    activeUsers,
    dauSeries,
    cohorts,
    retention: {
      d1: rate(d1r, d1c),
      d7: rate(d7r, d7c),
      d30: rate(d30r, d30c),
    },
  };
}
