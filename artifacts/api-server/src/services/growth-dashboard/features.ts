import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { FeatureMetric, GrowthTimeRange } from "./types.js";
import { ANALYTICS_NOISE_FILTER, pctChange, pctRate, rowNum } from "./sqlHelpers.js";

const FEATURE_DEFS: Array<{
  key: string;
  label: string;
  eventNames: string[];
  completeEvents: string[];
  screenLike?: string;
}> = [
  {
    key: "routine_generator",
    label: "Routine Generator",
    eventNames: ["routine_generation_started", "routine_generated"],
    completeEvents: ["routine_generated"],
    screenLike: "/routines/generate",
  },
  {
    key: "speech_coach",
    label: "Speech Coach",
    eventNames: ["speech_coach_v2_session_start", "speech_coach_v2_session_complete"],
    completeEvents: ["speech_coach_v2_session_complete"],
    screenLike: "/speech-coach",
  },
  {
    key: "nutrition_hub",
    label: "Nutrition Hub",
    eventNames: ["feature_open", "feature_complete", "screen_view"],
    completeEvents: ["feature_complete"],
    screenLike: "nutrition",
  },
  {
    key: "parent_hub",
    label: "Parent Hub",
    eventNames: ["screen_view", "feature_open"],
    completeEvents: ["feature_complete"],
    screenLike: "/parenting-hub",
  },
  {
    key: "stories",
    label: "Stories",
    eventNames: ["feature_open", "screen_view"],
    completeEvents: ["feature_complete"],
    screenLike: "/stories",
  },
  {
    key: "worksheets",
    label: "Worksheets",
    eventNames: ["asset_download", "screen_view"],
    completeEvents: ["asset_download"],
    screenLike: "worksheet",
  },
  {
    key: "downloads",
    label: "Downloads",
    eventNames: ["asset_download"],
    completeEvents: ["asset_download"],
  },
];

async function featureCounts(
  def: (typeof FEATURE_DEFS)[number],
  range: GrowthTimeRange,
): Promise<{ dau: number; completed: number; opens: number; avgMs: number | null; repeatUsers: number }> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();
  const events = def.eventNames.map((e) => `'${e}'`).join(",");
  const completes = def.completeEvents.map((e) => `'${e}'`).join(",");
  const screenClause = def.screenLike
    ? sql`OR (event_name = 'screen_view' AND props->>'screen' ILIKE ${`%${def.screenLike}%`})`
    : sql``;

  const res = await db.execute(sql`
    WITH scoped AS (
      SELECT user_id, event_name, props
      FROM analytics_events
      WHERE server_ts >= ${start}::timestamptz
        AND server_ts <= ${end}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
        AND (
          event_name IN (${sql.raw(events)})
          ${screenClause}
        )
    ),
    repeats AS (
      SELECT user_id FROM scoped
      WHERE event_name IN (${sql.raw(completes)})
      GROUP BY user_id HAVING count(*) > 1
    )
    SELECT
      count(DISTINCT user_id)::int AS dau,
      count(DISTINCT user_id) FILTER (WHERE event_name IN (${sql.raw(completes)}))::int AS completed,
      count(*)::int AS opens,
      avg((props->>'duration_ms')::numeric) FILTER (
        WHERE props ? 'duration_ms' AND event_name IN (${sql.raw(completes)})
      )::float AS avg_ms,
      (SELECT count(*)::int FROM repeats) AS repeat_users
    FROM scoped
  `);

  const r = (res.rows[0] ?? {}) as Record<string, unknown>;
  return {
    dau: rowNum(r, "dau"),
    completed: rowNum(r, "completed"),
    opens: rowNum(r, "opens"),
    avgMs: r.avg_ms != null ? Number(r.avg_ms) : null,
    repeatUsers: rowNum(r, "repeat_users"),
  };
}

export async function computeFeatures(range: GrowthTimeRange): Promise<FeatureMetric[]> {
  const results = await Promise.all(
    FEATURE_DEFS.map(async (def) => {
      const [current, previous] = await Promise.all([
        featureCounts(def, range),
        featureCounts(def, {
          ...range,
          start: range.previousStart,
          end: range.previousEnd,
        }),
      ]);
      return {
        key: def.key,
        label: def.label,
        dau: current.dau,
        completionPct: pctRate(current.completed, Math.max(current.opens, current.dau)),
        avgTimeSec: current.avgMs != null ? Math.round(current.avgMs / 1000) : null,
        repeatUsagePct: pctRate(current.repeatUsers, current.completed),
        trendPct: pctChange(current.dau, previous.dau),
      };
    }),
  );
  return results;
}
