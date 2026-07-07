import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "../../growth-dashboard/types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "../../growth-dashboard/sqlHelpers.js";

export type FeatureImpactLabRow = {
  key: string;
  label: string;
  dau: number;
  wau: number;
  mau: number;
  avgSessionSec: number | null;
  repeatUsagePct: number | null;
  trialCorrelationPct: number | null;
  subscriptionCorrelationPct: number | null;
  retentionCorrelationPct: number | null;
  revenueContribution: number;
  rank: number;
  businessImpactScore: number;
};

const FEATURES: Array<{ key: string; label: string; filter: string }> = [
  { key: "routine_generator", label: "Routine Generator", filter: "event_name = 'routine_generated'" },
  { key: "speech_coach", label: "Speech Coach", filter: "event_name = 'speech_coach_v2_session_start'" },
  { key: "nutrition_hub", label: "Nutrition Hub", filter: "event_name = 'screen_view' AND props->>'screen' ILIKE '%nutrition%'" },
  { key: "parent_hub", label: "Parent Hub", filter: "event_name = 'screen_view' AND props->>'screen' ILIKE '%parenting-hub%'" },
  { key: "stories", label: "Stories", filter: "event_name = 'screen_view' AND props->>'screen' ILIKE '%stories%'" },
  { key: "worksheets", label: "Worksheets", filter: "event_name = 'asset_download'" },
];

async function featureLabRow(
  def: (typeof FEATURES)[number],
  range: GrowthTimeRange,
  end: string,
): Promise<Omit<FeatureImpactLabRow, "rank">> {
  const start = range.start.toISOString();
  const res = await db.execute(sql`
    WITH scoped AS (
      SELECT user_id, props FROM analytics_events
      WHERE server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER} AND (${sql.raw(def.filter)})
    ),
    trials AS (
      SELECT DISTINCT user_id FROM analytics_events
      WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started'
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
    ),
    subs AS (
      SELECT DISTINCT user_id FROM analytics_events
      WHERE (event_name = 'upgrade_completed' OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success'))
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
    ),
    repeats AS (
      SELECT user_id FROM scoped GROUP BY user_id HAVING count(*) > 1
    )
    SELECT
      count(DISTINCT user_id) FILTER (WHERE true)::int AS mau,
      count(DISTINCT user_id) FILTER (WHERE true)::int AS wau_placeholder,
      count(DISTINCT user_id)::int AS dau_placeholder,
      avg((props->>'duration_ms')::numeric) FILTER (WHERE props ? 'duration_ms')::float AS avg_ms,
      (SELECT count(*)::int FROM repeats) AS repeat_users,
      (SELECT count(*)::int FROM scoped s JOIN trials t ON t.user_id = s.user_id) AS trial_users,
      (SELECT count(*)::int FROM scoped s JOIN subs su ON su.user_id = s.user_id) AS sub_users
    FROM scoped
  `);

  const dauRes = await db.execute(sql`
    SELECT count(DISTINCT user_id)::int AS dau FROM analytics_events
    WHERE server_ts >= (${end}::timestamptz - interval '1 day') AND server_ts <= ${end}::timestamptz
      AND ${ANALYTICS_NOISE_FILTER} AND (${sql.raw(def.filter)})
  `);
  const wauRes = await db.execute(sql`
    SELECT count(DISTINCT user_id)::int AS wau FROM analytics_events
    WHERE server_ts >= (${end}::timestamptz - interval '7 day') AND server_ts <= ${end}::timestamptz
      AND ${ANALYTICS_NOISE_FILTER} AND (${sql.raw(def.filter)})
  `);

  const r = (res.rows[0] ?? {}) as Record<string, unknown>;
  const mau = rowNum(r, "mau");
  const dau = rowNum((dauRes.rows[0] ?? {}) as Record<string, unknown>, "dau");
  const wau = rowNum((wauRes.rows[0] ?? {}) as Record<string, unknown>, "wau");
  const trialUsers = rowNum(r, "trial_users");
  const subUsers = rowNum(r, "sub_users");
  const repeatUsers = rowNum(r, "repeat_users");
  const revenueContribution = subUsers * 199;

  const businessImpactScore = Math.max(
    0,
    Math.min(100, Math.round(dau * 0.4 + wau * 0.2 + subUsers * 5)),
  );

  return {
    key: def.key,
    label: def.label,
    dau,
    wau,
    mau,
    avgSessionSec: r.avg_ms != null ? Math.round(Number(r.avg_ms) / 1000) : null,
    repeatUsagePct: pctRate(repeatUsers, mau),
    trialCorrelationPct: pctRate(trialUsers, mau),
    subscriptionCorrelationPct: pctRate(subUsers, mau),
    retentionCorrelationPct: null,
    revenueContribution,
    businessImpactScore,
  };
}

export async function computeFeatureImpactLab(range: GrowthTimeRange): Promise<FeatureImpactLabRow[]> {
  const end = range.end.toISOString();
  const rows = await Promise.all(FEATURES.map((f) => featureLabRow(f, range, end)));
  const sorted = [...rows].sort((a, b) => b.businessImpactScore - a.businessImpactScore);
  return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
}
