import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange, SeriesPoint } from "./types.js";
import { ANALYTICS_NOISE_FILTER, rowNum } from "./sqlHelpers.js";

function toSeries(rows: Record<string, unknown>[], valueKey = "value"): SeriesPoint[] {
  return rows.map((r) => ({
    day: String(r.day),
    value: rowNum(r, valueKey),
  }));
}

export async function computeCharts(range: GrowthTimeRange) {
  const start = range.start.toISOString();
  const end = range.end.toISOString();

  const [
    dauRes,
    wauRes,
    revenueRes,
    subGrowthRes,
    featureRes,
    routineRes,
    trialRes,
    purchaseRes,
    retentionRes,
    sessionsRes,
  ] = await Promise.all([
    db.execute(sql`
      SELECT to_char(server_ts::date, 'YYYY-MM-DD') AS day,
             count(DISTINCT user_id)::int AS value
      FROM analytics_events
      WHERE server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY 1
    `),
    db.execute(sql`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day, count(DISTINCT ae.user_id)::int AS value
      FROM generate_series(${start}::date, ${end}::date, '1 day') AS d(day)
      LEFT JOIN analytics_events ae
        ON ae.server_ts::date BETWEEN d.day - 6 AND d.day
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY 1
    `),
    db.execute(sql`
      SELECT to_char(server_ts::date, 'YYYY-MM-DD') AS day,
             count(DISTINCT user_id)::int AS value
      FROM analytics_events
      WHERE (event_name = 'upgrade_completed'
        OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success'))
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
      GROUP BY 1 ORDER BY 1
    `),
    db.execute(sql`
      SELECT to_char(updated_at::date, 'YYYY-MM-DD') AS day,
             count(*) FILTER (WHERE subscription_state = 'ACTIVE')::int AS value
      FROM subscriptions
      WHERE updated_at >= ${start}::timestamptz AND updated_at <= ${end}::timestamptz
      GROUP BY 1 ORDER BY 1
    `),
    db.execute(sql`
      SELECT to_char(server_ts::date, 'YYYY-MM-DD') AS day,
             count(DISTINCT user_id)::int AS value
      FROM analytics_events
      WHERE event_name IN ('feature_open', 'feature_complete')
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY 1
    `),
    db.execute(sql`
      SELECT to_char(server_ts::date, 'YYYY-MM-DD') AS day,
             count(DISTINCT user_id)::int AS value
      FROM analytics_events
      WHERE event_name = 'routine_generated'
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
      GROUP BY 1 ORDER BY 1
    `),
    db.execute(sql`
      SELECT to_char(server_ts::date, 'YYYY-MM-DD') AS day,
             count(DISTINCT user_id)::int AS value
      FROM analytics_events
      WHERE (event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started')
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
      GROUP BY 1 ORDER BY 1
    `),
    db.execute(sql`
      SELECT to_char(server_ts::date, 'YYYY-MM-DD') AS day,
             count(DISTINCT user_id)::int AS value
      FROM analytics_events
      WHERE (event_name = 'upgrade_completed'
        OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success'))
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
      GROUP BY 1 ORDER BY 1
    `),
    db.execute(sql`
      WITH first_seen AS (
        SELECT user_id, min(server_ts)::date AS cohort_day
        FROM analytics_events WHERE ${ANALYTICS_NOISE_FILTER} GROUP BY user_id
      ),
      activity AS (
        SELECT DISTINCT user_id, server_ts::date AS day FROM analytics_events WHERE ${ANALYTICS_NOISE_FILTER}
      )
      SELECT to_char(fs.cohort_day, 'YYYY-MM-DD') AS day,
             CASE WHEN count(*) > 0
               THEN round(100.0 * count(DISTINCT a1.user_id) / count(*), 1)
               ELSE 0 END::float AS value
      FROM first_seen fs
      LEFT JOIN activity a1 ON a1.user_id = fs.user_id AND a1.day = fs.cohort_day + 1
      WHERE fs.cohort_day >= ${start}::date AND fs.cohort_day <= ${end}::date
      GROUP BY fs.cohort_day ORDER BY fs.cohort_day
    `),
    db.execute(sql`
      SELECT to_char(server_ts::date, 'YYYY-MM-DD') AS day,
             count(DISTINCT session_id)::int AS value
      FROM analytics_events
      WHERE session_id IS NOT NULL
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY 1
    `),
  ]);

  return {
    dau: toSeries(dauRes.rows as Record<string, unknown>[]),
    wau: toSeries(wauRes.rows as Record<string, unknown>[]),
    revenue: toSeries(revenueRes.rows as Record<string, unknown>[]),
    subscriptionGrowth: toSeries(subGrowthRes.rows as Record<string, unknown>[]),
    featureUsage: toSeries(featureRes.rows as Record<string, unknown>[]),
    routineGenerated: toSeries(routineRes.rows as Record<string, unknown>[]),
    trialStarted: toSeries(trialRes.rows as Record<string, unknown>[]),
    subscriptionPurchased: toSeries(purchaseRes.rows as Record<string, unknown>[]),
    retention: toSeries(retentionRes.rows as Record<string, unknown>[]),
    sessions: toSeries(sessionsRes.rows as Record<string, unknown>[]),
  };
}
