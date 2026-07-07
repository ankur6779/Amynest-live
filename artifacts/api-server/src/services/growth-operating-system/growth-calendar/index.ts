import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange, TimelineEvent } from "../../growth-dashboard/types.js";
import { ANALYTICS_NOISE_FILTER } from "../../growth-dashboard/sqlHelpers.js";
import { computeExecutiveTimeline } from "../../growth-dashboard/executive/timeline.js";

export type GrowthCalendarEvent = {
  id: string;
  timestamp: string;
  category:
    | "deployment"
    | "campaign"
    | "release"
    | "subscription"
    | "traffic"
    | "crash"
    | "revenue";
  title: string;
  detail: string;
};

export async function buildGrowthCalendar(range: GrowthTimeRange): Promise<GrowthCalendarEvent[]> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();
  const events: GrowthCalendarEvent[] = [];

  const timeline = await computeExecutiveTimeline(range);
  for (const t of timeline) {
    let category: GrowthCalendarEvent["category"] = "traffic";
    if (t.label.toLowerCase().includes("crash") || t.label.toLowerCase().includes("error")) {
      category = "crash";
    } else if (t.label.toLowerCase().includes("purchase") || t.label.toLowerCase().includes("revenue")) {
      category = "revenue";
    } else if (t.label.toLowerCase().includes("install")) {
      category = "traffic";
    }
    events.push({
      id: `tl_${t.timestamp}_${category}`,
      timestamp: t.timestamp,
      category,
      title: t.label,
      detail: t.detail,
    });
  }

  const versionRes = await db.execute(sql`
    SELECT app_version, min(server_ts) AS first_seen, count(DISTINCT user_id)::int AS users
    FROM analytics_events
    WHERE app_version IS NOT NULL AND app_version != ''
      AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
      AND ${ANALYTICS_NOISE_FILTER}
    GROUP BY app_version
    HAVING min(server_ts) >= ${start}::timestamptz
    ORDER BY first_seen DESC
    LIMIT 10
  `);
  for (const row of versionRes.rows) {
    const r = row as Record<string, unknown>;
    const ts = r.first_seen instanceof Date ? r.first_seen.toISOString() : String(r.first_seen);
    events.push({
      id: `rel_${r.app_version}`,
      timestamp: ts,
      category: "release",
      title: `App version ${String(r.app_version)} adoption`,
      detail: `${Number(r.users)} users on first seen in window`,
    });
  }

  const subRes = await db.execute(sql`
    SELECT date_trunc('day', updated_at) AS day, count(*)::int AS cnt
    FROM subscriptions
    WHERE subscription_state = 'ACTIVE'
      AND updated_at >= ${start}::timestamptz AND updated_at <= ${end}::timestamptz
    GROUP BY 1 ORDER BY 1 DESC LIMIT 10
  `);
  for (const row of subRes.rows) {
    const r = row as Record<string, unknown>;
    const ts = r.day instanceof Date ? r.day.toISOString() : String(r.day);
    events.push({
      id: `sub_${ts}`,
      timestamp: ts,
      category: "subscription",
      title: "Subscription activity",
      detail: `${Number(r.cnt)} subscription updates`,
    });
  }

  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export type { TimelineEvent };
