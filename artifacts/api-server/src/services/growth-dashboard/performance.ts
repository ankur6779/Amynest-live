import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "./types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "./sqlHelpers.js";

export async function computePerformance(range: GrowthTimeRange) {
  const [perfRes, crashRes, errorRes, slowRes, networkRes, activeRes] = await Promise.all([
    db.execute(sql`
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY (props->>'duration_ms')::numeric) FILTER (
          WHERE event_name = 'performance_metric' AND props->>'metric' = 'startup_time'
        )::float AS ttfb_ms,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY (props->>'duration_ms')::numeric) FILTER (
          WHERE event_name = 'performance_metric' AND props->>'metric' = 'api_duration'
        )::float AS api_latency_ms
      FROM analytics_events
      WHERE server_ts >= ${range.start.toISOString()}::timestamptz
        AND server_ts <= ${range.end.toISOString()}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
    `),
    db.execute(sql`
      SELECT count(*)::int AS cnt FROM crash_events
      WHERE created_at >= ${range.start.toISOString()}::timestamptz
        AND created_at <= ${range.end.toISOString()}::timestamptz
    `),
    db.execute(sql`
      SELECT count(*)::int AS cnt FROM analytics_events
      WHERE event_name = 'error_captured'
        AND server_ts >= ${range.start.toISOString()}::timestamptz
        AND server_ts <= ${range.end.toISOString()}::timestamptz
    `),
    db.execute(sql`
      SELECT
        coalesce(props->>'screen', props->>'path', 'unknown') AS screen,
        count(*)::int AS cnt,
        avg((props->>'duration_ms')::numeric)::float AS avg_ms
      FROM analytics_events
      WHERE event_name = 'performance_metric'
        AND props->>'metric' = 'screen_render'
        AND (props->>'duration_ms')::numeric > 2000
        AND server_ts >= ${range.start.toISOString()}::timestamptz
        AND server_ts <= ${range.end.toISOString()}::timestamptz
      GROUP BY 1 ORDER BY cnt DESC LIMIT 10
    `),
    db.execute(sql`
      SELECT count(*)::int AS cnt FROM analytics_events
      WHERE event_name = 'error_captured'
        AND props->>'error_class' = 'network'
        AND server_ts >= ${range.start.toISOString()}::timestamptz
        AND server_ts <= ${range.end.toISOString()}::timestamptz
    `),
    db.execute(sql`
      SELECT count(DISTINCT user_id)::int AS users FROM analytics_events
      WHERE event_name = 'app_open'
        AND server_ts >= ${range.start.toISOString()}::timestamptz
        AND server_ts <= ${range.end.toISOString()}::timestamptz
    `),
  ]);

  const p = (perfRes.rows[0] ?? {}) as Record<string, unknown>;
  const crashes = rowNum((crashRes.rows[0] ?? {}) as Record<string, unknown>, "cnt");
  const jsErrors = rowNum((errorRes.rows[0] ?? {}) as Record<string, unknown>, "cnt");
  const networkErrors = rowNum((networkRes.rows[0] ?? {}) as Record<string, unknown>, "cnt");
  const activeUsers = rowNum((activeRes.rows[0] ?? {}) as Record<string, unknown>, "users");

  return {
    ttfbMs: p.ttfb_ms != null ? Math.round(Number(p.ttfb_ms)) : null,
    apiLatencyMs: p.api_latency_ms != null ? Math.round(Number(p.api_latency_ms)) : null,
    crashCount: crashes,
    jsErrors,
    slowScreens: slowRes.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        screen: String(r.screen),
        count: rowNum(r, "cnt"),
        avgMs: r.avg_ms != null ? Math.round(Number(r.avg_ms)) : null,
      };
    }),
    networkErrors,
    crashFreePct: pctRate(activeUsers - Math.min(crashes, activeUsers), activeUsers),
  };
}
