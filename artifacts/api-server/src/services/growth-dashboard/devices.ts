import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "./types.js";
import { ANALYTICS_NOISE_FILTER, rowNum } from "./sqlHelpers.js";

export async function computeDevices(range: GrowthTimeRange) {
  const [platforms, browsers, appVersions, screenSizes, osVersions] = await Promise.all([
    db.execute(sql`
      SELECT
        coalesce(nullif(trim(platform), ''), 'unknown') AS platform,
        count(DISTINCT user_id)::int AS users,
        count(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL)::int AS sessions
      FROM analytics_events
      WHERE server_ts >= ${range.start.toISOString()}::timestamptz
        AND server_ts <= ${range.end.toISOString()}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY users DESC LIMIT 20
    `),
    db.execute(sql`
      SELECT
        coalesce(nullif(trim(props->>'browser'), ''), 'unknown') AS browser,
        count(DISTINCT user_id)::int AS users
      FROM analytics_events
      WHERE server_ts >= ${range.start.toISOString()}::timestamptz
        AND server_ts <= ${range.end.toISOString()}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY users DESC LIMIT 20
    `),
    db.execute(sql`
      SELECT
        coalesce(nullif(trim(app_version), ''), 'unknown') AS version,
        count(DISTINCT user_id)::int AS users
      FROM analytics_events
      WHERE server_ts >= ${range.start.toISOString()}::timestamptz
        AND server_ts <= ${range.end.toISOString()}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY users DESC LIMIT 20
    `),
    db.execute(sql`
      SELECT
        coalesce(nullif(trim(props->>'screen_size'), ''), nullif(trim(props->>'viewport'), ''), 'unknown') AS size,
        count(DISTINCT user_id)::int AS users
      FROM analytics_events
      WHERE server_ts >= ${range.start.toISOString()}::timestamptz
        AND server_ts <= ${range.end.toISOString()}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY users DESC LIMIT 15
    `),
    db.execute(sql`
      SELECT
        coalesce(nullif(trim(props->>'os'), ''), 'unknown') AS os,
        count(DISTINCT user_id)::int AS users
      FROM analytics_events
      WHERE server_ts >= ${range.start.toISOString()}::timestamptz
        AND server_ts <= ${range.end.toISOString()}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY users DESC LIMIT 20
    `),
  ]);

  return {
    platforms: platforms.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return { platform: String(r.platform), users: rowNum(r, "users"), sessions: rowNum(r, "sessions") };
    }),
    browsers: browsers.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return { browser: String(r.browser), users: rowNum(r, "users") };
    }),
    appVersions: appVersions.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return { version: String(r.version), users: rowNum(r, "users") };
    }),
    screenSizes: screenSizes.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return { size: String(r.size), users: rowNum(r, "users") };
    }),
    osVersions: osVersions.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return { os: String(r.os), users: rowNum(r, "users") };
    }),
  };
}
