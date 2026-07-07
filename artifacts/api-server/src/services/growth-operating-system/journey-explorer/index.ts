import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "../../growth-dashboard/types.js";
import { ANALYTICS_NOISE_FILTER, rowNum } from "../../growth-dashboard/sqlHelpers.js";

export type JourneyFilters = {
  country?: string;
  platform?: string;
  campaign?: string;
  appVersion?: string;
  feature?: string;
};

export type JourneyStep = {
  step: string;
  users: number;
  pct: number | null;
};

export async function exploreJourney(
  range: GrowthTimeRange,
  filters: JourneyFilters,
): Promise<{ steps: JourneyStep[]; filters: JourneyFilters; totalUsers: number }> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();

  const country = filters.country?.trim() || null;
  const platform = filters.platform?.trim() || null;
  const campaign = filters.campaign?.trim() || null;
  const appVersion = filters.appVersion?.trim() || null;

  const res = await db.execute(sql`
    WITH base AS (
      SELECT user_id, event_name, props, platform AS evt_platform, app_version
      FROM analytics_events
      WHERE server_ts >= ${start}::timestamptz
        AND server_ts <= ${end}::timestamptz
        AND ${ANALYTICS_NOISE_FILTER}
        AND (${country}::text IS NULL OR props->>'country' ILIKE ${country ? `%${country}%` : "%"})
        AND (${platform}::text IS NULL OR platform ILIKE ${platform ?? "%"})
        AND (${appVersion}::text IS NULL OR app_version ILIKE ${appVersion ?? "%"})
        AND (${campaign}::text IS NULL OR props->>'utm_campaign' ILIKE ${campaign ? `%${campaign}%` : "%"})
    ),
    steps AS (
      SELECT 'Install' AS step, count(DISTINCT user_id)::int AS users FROM base WHERE event_name = 'device_registered'
      UNION ALL SELECT 'First Open', count(DISTINCT user_id) FROM base WHERE event_name = 'first_open'
      UNION ALL SELECT 'Signup', count(DISTINCT user_id) FROM base WHERE event_name IN ('pre_signup_signup_completed', 'pre_signup_login_completed')
      UNION ALL SELECT 'Onboarding Done', count(DISTINCT user_id) FROM base WHERE event_name = 'onboarding_funnel_event' AND props->>'step' = 'finish_clicked'
      UNION ALL SELECT 'Routine', count(DISTINCT user_id) FROM base WHERE event_name = 'routine_generated'
      UNION ALL SELECT 'Trial', count(DISTINCT user_id) FROM base WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started'
      UNION ALL SELECT 'Subscription', count(DISTINCT user_id) FROM base WHERE event_name IN ('upgrade_completed') OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success')
    )
    SELECT step, users FROM steps ORDER BY users DESC
  `);

  const stepsRaw = res.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return { step: String(r.step), users: rowNum(r, "users") };
  });
  const totalUsers = stepsRaw[0]?.users ?? 0;
  const steps: JourneyStep[] = stepsRaw.map((s) => ({
    ...s,
    pct: totalUsers > 0 ? Math.round((s.users / totalUsers) * 1000) / 10 : null,
  }));

  return { steps, filters, totalUsers };
}

export async function listJourneyFilterOptions(range: GrowthTimeRange) {
  const start = range.start.toISOString();
  const end = range.end.toISOString();
  const res = await db.execute(sql`
    SELECT
      array_agg(DISTINCT nullif(trim(props->>'country'), '')) FILTER (WHERE props->>'country' IS NOT NULL) AS countries,
      array_agg(DISTINCT nullif(trim(platform), '')) FILTER (WHERE platform IS NOT NULL) AS platforms,
      array_agg(DISTINCT nullif(trim(app_version), '')) FILTER (WHERE app_version IS NOT NULL) AS versions,
      array_agg(DISTINCT nullif(trim(props->>'utm_campaign'), '')) FILTER (WHERE props->>'utm_campaign' IS NOT NULL) AS campaigns
    FROM analytics_events
    WHERE server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
      AND ${ANALYTICS_NOISE_FILTER}
  `);
  const r = (res.rows[0] ?? {}) as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean).slice(0, 30) : []);
  return {
    countries: arr(r.countries),
    platforms: arr(r.platforms),
    versions: arr(r.versions),
    campaigns: arr(r.campaigns),
  };
}
