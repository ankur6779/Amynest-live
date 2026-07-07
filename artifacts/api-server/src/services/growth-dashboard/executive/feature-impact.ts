import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { FeatureImpact, GrowthTimeRange } from "../types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "../sqlHelpers.js";

const FEATURE_QUERIES: Array<{
  key: string;
  label: string;
  eventFilter: string;
}> = [
  { key: "routine_generator", label: "Routine Generator", eventFilter: "event_name = 'routine_generated'" },
  {
    key: "speech_coach",
    label: "Speech Coach",
    eventFilter: "event_name = 'speech_coach_v2_session_start'",
  },
  {
    key: "nutrition_hub",
    label: "Nutrition Hub",
    eventFilter: "(event_name = 'screen_view' AND props->>'screen' ILIKE '%nutrition%')",
  },
  {
    key: "parent_hub",
    label: "Parent Hub",
    eventFilter: "(event_name = 'screen_view' AND props->>'screen' ILIKE '%parenting-hub%')",
  },
  {
    key: "stories",
    label: "Stories",
    eventFilter: "(event_name = 'screen_view' AND props->>'screen' ILIKE '%stories%')",
  },
  {
    key: "worksheets",
    label: "Worksheets",
    eventFilter: "event_name = 'asset_download'",
  },
];

async function featureImpactRow(
  def: (typeof FEATURE_QUERIES)[number],
  range: GrowthTimeRange,
  baselineTrialPct: number,
  baselineSubPct: number,
  baselineRetentionPct: number,
): Promise<FeatureImpact> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();

  const res = await db.execute(sql`
    WITH window_events AS (
      SELECT user_id, event_name, props, session_id
      FROM analytics_events
      WHERE server_ts >= ${start}::timestamptz
        AND server_ts <= ${end}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
    ),
    feature_users AS (
      SELECT DISTINCT user_id FROM window_events WHERE ${sql.raw(def.eventFilter)}
    ),
    trials AS (
      SELECT DISTINCT user_id FROM window_events
      WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started'
    ),
    subs AS (
      SELECT DISTINCT user_id FROM window_events
      WHERE event_name = 'upgrade_completed'
        OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success')
    ),
    retained AS (
      SELECT DISTINCT fu.user_id
      FROM feature_users fu
      JOIN analytics_events ae ON ae.user_id = fu.user_id
      WHERE ae.server_ts >= (${start}::timestamptz + interval '1 day')
        AND ae.server_ts <= (${end}::timestamptz + interval '7 day')
        AND ${ANALYTICS_NOISE_FILTER}
    ),
    usage AS (
      SELECT count(*)::int AS cnt FROM window_events WHERE ${sql.raw(def.eventFilter)}
    ),
    repeats AS (
      SELECT user_id FROM window_events WHERE ${sql.raw(def.eventFilter)}
      GROUP BY user_id HAVING count(*) > 1
    ),
    session_dur AS (
      SELECT avg((props->>'duration_ms')::numeric)::float AS avg_ms
      FROM window_events
      WHERE ${sql.raw(def.eventFilter)} AND props ? 'duration_ms'
    )
    SELECT
      (SELECT count(*)::int FROM feature_users) AS users,
      (SELECT cnt FROM usage) AS usage,
      (SELECT count(*)::int FROM repeats) AS repeat_users,
      (SELECT avg_ms FROM session_dur) AS avg_ms,
      (SELECT count(*)::int FROM feature_users fu JOIN trials t ON t.user_id = fu.user_id) AS trial_users,
      (SELECT count(*)::int FROM feature_users fu JOIN subs s ON s.user_id = fu.user_id) AS sub_users,
      (SELECT count(*)::int FROM retained) AS retained_users
  `);

  const r = (res.rows[0] ?? {}) as Record<string, unknown>;
  const users = rowNum(r, "users");
  const usage = rowNum(r, "usage");
  const repeatUsers = rowNum(r, "repeat_users");
  const trialUsers = rowNum(r, "trial_users");
  const subUsers = rowNum(r, "sub_users");
  const retainedUsers = rowNum(r, "retained_users");

  const trialCorr = pctRate(trialUsers, users);
  const subCorr = pctRate(subUsers, users);
  const retCorr = pctRate(retainedUsers, users);

  const uplift =
    (trialCorr ?? 0) - baselineTrialPct + (subCorr ?? 0) - baselineSubPct + (retCorr ?? 0) - baselineRetentionPct;
  const businessImpactScore = Math.max(
    0,
    Math.min(100, Math.round(users * 0.3 + usage * 0.1 + uplift * 2)),
  );

  return {
    key: def.key,
    label: def.label,
    users,
    usage,
    repeatUsagePct: pctRate(repeatUsers, users),
    avgSessionSec: r.avg_ms != null ? Math.round(Number(r.avg_ms) / 1000) : null,
    trialCorrelationPct: trialCorr,
    subscriptionCorrelationPct: subCorr,
    retentionCorrelationPct: retCorr,
    businessImpactScore,
  };
}

export async function computeFeatureImpact(range: GrowthTimeRange): Promise<FeatureImpact[]> {
  const baselineRes = await db.execute(sql`
    WITH window_events AS (
      SELECT user_id, event_name, props
      FROM analytics_events
      WHERE server_ts >= ${range.start.toISOString()}::timestamptz
        AND server_ts <= ${range.end.toISOString()}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
    ),
    all_users AS (SELECT count(DISTINCT user_id)::int AS cnt FROM window_events),
    trials AS (
      SELECT count(DISTINCT user_id)::int AS cnt FROM window_events
      WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started'
    ),
    subs AS (
      SELECT count(DISTINCT user_id)::int AS cnt FROM window_events
      WHERE event_name = 'upgrade_completed'
        OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success')
    )
    SELECT
      (SELECT cnt FROM all_users) AS users,
      (SELECT cnt FROM trials) AS trials,
      (SELECT cnt FROM subs) AS subs
  `);
  const b = (baselineRes.rows[0] ?? {}) as Record<string, unknown>;
  const baseUsers = rowNum(b, "users");
  const baselineTrialPct = pctRate(rowNum(b, "trials"), baseUsers) ?? 0;
  const baselineSubPct = pctRate(rowNum(b, "subs"), baseUsers) ?? 0;
  const baselineRetentionPct = 0;

  const rows = await Promise.all(
    FEATURE_QUERIES.map((def) =>
      featureImpactRow(def, range, baselineTrialPct, baselineSubPct, baselineRetentionPct),
    ),
  );

  return rows.sort((a, b) => b.businessImpactScore - a.businessImpactScore);
}
