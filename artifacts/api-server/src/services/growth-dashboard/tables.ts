import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "./types.js";
import { ANALYTICS_NOISE_FILTER, rowNum } from "./sqlHelpers.js";

export async function computeTables(range: GrowthTimeRange) {
  const start = range.start.toISOString();
  const end = range.end.toISOString();

  const [countries, devices, versions, screens, events, referrers, campaigns] = await Promise.all([
    db.execute(sql`
      SELECT coalesce(nullif(trim(props->>'country'), ''), nullif(trim(pp.country), ''), 'unknown') AS country,
             count(DISTINCT ae.user_id)::int AS users,
             0::int AS revenue
      FROM analytics_events ae
      LEFT JOIN parent_profiles pp ON pp.user_id = ae.user_id
      WHERE ae.server_ts >= ${start}::timestamptz AND ae.server_ts <= ${end}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY users DESC LIMIT 20
    `),
    db.execute(sql`
      SELECT coalesce(nullif(trim(platform), ''), 'unknown') AS device,
             count(DISTINCT user_id)::int AS users
      FROM analytics_events
      WHERE server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY users DESC LIMIT 20
    `),
    db.execute(sql`
      SELECT coalesce(nullif(trim(app_version), ''), 'unknown') AS version,
             count(DISTINCT user_id)::int AS users
      FROM analytics_events
      WHERE server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY users DESC LIMIT 20
    `),
    db.execute(sql`
      SELECT coalesce(props->>'screen', 'unknown') AS screen,
             count(DISTINCT user_id)::int AS users,
             count(*)::int AS views
      FROM analytics_events
      WHERE event_name = 'screen_view'
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
      GROUP BY 1 ORDER BY views DESC LIMIT 20
    `),
    db.execute(sql`
      SELECT event_name AS event,
             count(DISTINCT user_id)::int AS users,
             count(*)::int AS count
      FROM analytics_events
      WHERE server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
      GROUP BY 1 ORDER BY count DESC LIMIT 25
    `),
    db.execute(sql`
      SELECT coalesce(nullif(trim(props->>'utm_source'), ''), nullif(trim(props->>'referrer'), ''), 'direct') AS referrer,
             count(DISTINCT user_id)::int AS users
      FROM analytics_events
      WHERE event_name IN ('install_source', 'first_open')
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
      GROUP BY 1 ORDER BY users DESC LIMIT 20
    `),
    db.execute(sql`
      SELECT coalesce(nullif(trim(props->>'utm_campaign'), ''), 'organic') AS campaign,
             count(DISTINCT user_id)::int AS users,
             count(DISTINCT user_id) FILTER (WHERE event_name = 'device_registered')::int AS installs
      FROM analytics_events
      WHERE event_name IN ('install_source', 'device_registered')
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
      GROUP BY 1 ORDER BY users DESC LIMIT 20
    `),
  ]);

  return {
    topCountries: countries.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return { country: String(r.country), users: rowNum(r, "users"), revenue: rowNum(r, "revenue") };
    }),
    topDevices: devices.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return { device: String(r.device), users: rowNum(r, "users") };
    }),
    topAppVersions: versions.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return { version: String(r.version), users: rowNum(r, "users") };
    }),
    topScreens: screens.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return { screen: String(r.screen), users: rowNum(r, "users"), views: rowNum(r, "views") };
    }),
    topEvents: events.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return { event: String(r.event), users: rowNum(r, "users"), count: rowNum(r, "count") };
    }),
    topReferrers: referrers.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return { referrer: String(r.referrer), users: rowNum(r, "users") };
    }),
    topCampaigns: campaigns.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        campaign: String(r.campaign),
        users: rowNum(r, "users"),
        installs: rowNum(r, "installs"),
      };
    }),
  };
}
