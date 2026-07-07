import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "./types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "./sqlHelpers.js";

export async function computeGeography(range: GrowthTimeRange) {
  const res = await db.execute(sql`
    WITH user_country AS (
      SELECT DISTINCT ON (ae.user_id)
        ae.user_id,
        coalesce(nullif(trim(ae.props->>'country'), ''), nullif(trim(pp.country), ''), 'unknown') AS country,
        nullif(trim(ae.props->>'region'), '') AS state,
        nullif(trim(ae.props->>'city'), '') AS city
      FROM analytics_events ae
      LEFT JOIN parent_profiles pp ON pp.user_id = ae.user_id
      WHERE ae.server_ts >= ${range.start.toISOString()}::timestamptz
        AND ae.server_ts <= ${range.end.toISOString()}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      ORDER BY ae.user_id, ae.server_ts DESC
    ),
    revenue AS (
      SELECT
        coalesce(nullif(trim(pp.country), ''), 'unknown') AS country,
        sum(CASE s.plan
          WHEN 'monthly' THEN 199
          WHEN 'six_month' THEN 999
          WHEN 'yearly' THEN 1499
          ELSE 0 END)::int AS revenue
      FROM subscriptions s
      LEFT JOIN parent_profiles pp ON pp.user_id = s.user_id
      WHERE s.subscription_state = 'ACTIVE'
      GROUP BY 1
    ),
    retention AS (
      WITH first_seen AS (
        SELECT user_id, min(server_ts)::date AS cohort_day
        FROM analytics_events
        WHERE ${ANALYTICS_NOISE_FILTER}
        GROUP BY user_id
      ),
      activity AS (
        SELECT DISTINCT user_id, server_ts::date AS day FROM analytics_events WHERE ${ANALYTICS_NOISE_FILTER}
      )
      SELECT
        uc.country,
        count(DISTINCT fs.user_id) FILTER (WHERE fs.cohort_day <= now()::date - 7)::int AS eligible,
        count(DISTINCT a7.user_id)::int AS retained
      FROM user_country uc
      JOIN first_seen fs ON fs.user_id = uc.user_id
      LEFT JOIN activity a7 ON a7.user_id = fs.user_id AND a7.day = fs.cohort_day + 7
      GROUP BY uc.country
    )
    SELECT
      uc.country,
      max(uc.state) AS state,
      max(uc.city) AS city,
      count(DISTINCT uc.user_id)::int AS users,
      coalesce(max(r.revenue), 0)::int AS revenue,
      CASE WHEN max(ret.eligible) > 0
        THEN round(100.0 * max(ret.retained) / max(ret.eligible), 1)
        ELSE NULL END AS retention_d7
    FROM user_country uc
    LEFT JOIN revenue r ON r.country = uc.country
    LEFT JOIN retention ret ON ret.country = uc.country
    GROUP BY uc.country
    ORDER BY users DESC
    LIMIT 50
  `);

  return res.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      country: String(r.country),
      state: r.state ? String(r.state) : null,
      city: r.city ? String(r.city) : null,
      users: rowNum(r, "users"),
      revenue: rowNum(r, "revenue"),
      retentionD7: r.retention_d7 != null ? Number(r.retention_d7) : null,
    };
  });
}
