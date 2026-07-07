import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { CampaignRow, GrowthTimeRange } from "./types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "./sqlHelpers.js";

export async function computeCampaigns(range: GrowthTimeRange): Promise<{
  available: boolean;
  rows: CampaignRow[];
  message: string | null;
}> {
  const res = await db.execute(sql`
    SELECT
      coalesce(nullif(trim(props->>'utm_campaign'), ''), nullif(trim(props->>'campaign'), ''), 'organic') AS campaign,
      coalesce(nullif(trim(props->>'utm_source'), ''), nullif(trim(props->>'source'), ''), 'unknown') AS platform,
      count(DISTINCT user_id) FILTER (WHERE event_name = 'install_source' OR event_name = 'device_registered')::int AS installs,
      count(DISTINCT user_id) FILTER (
        WHERE event_name IN ('pre_signup_signup_completed', 'pre_signup_login_completed')
      )::int AS signups,
      count(DISTINCT user_id) FILTER (WHERE event_name = 'routine_generated')::int AS routines,
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started'
      )::int AS trials,
      count(DISTINCT user_id) FILTER (
        WHERE event_name IN ('upgrade_completed')
          OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success')
      )::int AS subscriptions
    FROM analytics_events
    WHERE server_ts >= ${range.start.toISOString()}::timestamptz
      AND server_ts <= ${range.end.toISOString()}::timestamptz
      AND ${ANALYTICS_NOISE_FILTER}
      AND event_name IN (
        'install_source', 'device_registered', 'pre_signup_signup_completed',
        'pre_signup_login_completed', 'routine_generated', 'subscription_funnel_event',
        'upgrade_completed'
      )
    GROUP BY 1, 2
    ORDER BY installs DESC
    LIMIT 50
  `);

  if (res.rows.length === 0) {
    return {
      available: false,
      rows: [],
      message: "No campaign attribution data in selected window. UTM fields populate from install_source events.",
    };
  }

  const rows: CampaignRow[] = res.rows.map((row) => {
    const r = row as Record<string, unknown>;
    const installs = rowNum(r, "installs");
    const signups = rowNum(r, "signups");
    const routines = rowNum(r, "routines");
    const trials = rowNum(r, "trials");
    const subscriptions = rowNum(r, "subscriptions");
    return {
      campaign: String(r.campaign),
      platform: String(r.platform),
      spend: null,
      cpi: null,
      ctr: null,
      installs,
      signups,
      routinePct: pctRate(routines, installs),
      trialPct: pctRate(trials, installs),
      subscriptionPct: pctRate(subscriptions, installs),
      revenue: null,
      roas: null,
      ltv: null,
    };
  });

  return {
    available: true,
    rows,
    message: "Spend, CPI, CTR, ROAS, and LTV require ad platform integration. Attribution from install_source UTM fields.",
  };
}
