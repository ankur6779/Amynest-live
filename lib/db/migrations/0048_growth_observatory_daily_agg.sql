-- Growth Observatory: daily event aggregates for fast executive KPI queries.
-- Refresh after bulk analytics backfills or via scheduled job (see docs/growth-observatory.md).

CREATE MATERIALIZED VIEW IF NOT EXISTS growth_observatory_daily_agg AS
SELECT
  server_ts::date AS day,
  event_name,
  coalesce(platform, 'unknown') AS platform,
  count(DISTINCT user_id)::int AS distinct_users,
  count(*)::int AS event_count
FROM analytics_events
WHERE server_ts >= (now()::date - interval '400 days')
GROUP BY 1, 2, 3;

CREATE UNIQUE INDEX IF NOT EXISTS growth_observatory_daily_agg_day_event_platform_idx
  ON growth_observatory_daily_agg (day, event_name, platform);

CREATE INDEX IF NOT EXISTS growth_observatory_daily_agg_day_idx
  ON growth_observatory_daily_agg (day);

-- Concurrent refresh (non-blocking reads) after initial populate:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY growth_observatory_daily_agg;
