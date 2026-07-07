import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { FunnelStage, GrowthTimeRange } from "./types.js";
import { ANALYTICS_NOISE_FILTER, pctChange, pctRate, rowNum } from "./sqlHelpers.js";

type FunnelDef = {
  key: string;
  label: string;
  available: boolean;
  sql: ReturnType<typeof sql>;
};

async function countUsers(query: ReturnType<typeof sql>, range: GrowthTimeRange): Promise<number> {
  const res = await db.execute(sql`
    SELECT count(DISTINCT user_id)::int AS users
    FROM analytics_events
    WHERE ${query}
      AND server_ts >= ${range.start.toISOString()}::timestamptz
      AND server_ts <= ${range.end.toISOString()}::timestamptz
      AND ${ANALYTICS_NOISE_FILTER}
  `);
  return rowNum((res.rows[0] ?? {}) as Record<string, unknown>, "users");
}

const FUNNEL_DEFS: FunnelDef[] = [
  {
    key: "impressions",
    label: "Impressions",
    available: false,
    sql: sql`false`,
  },
  {
    key: "clicks",
    label: "Clicks",
    available: false,
    sql: sql`false`,
  },
  {
    key: "store_visit",
    label: "Store Visit",
    available: true,
    sql: sql`event_name IN ('play_store_click', 'growth_funnel_event') AND props->>'step' IN ('store_visit', 'play_store_click')`,
  },
  {
    key: "install",
    label: "Install",
    available: true,
    sql: sql`event_name = 'device_registered'`,
  },
  {
    key: "first_open",
    label: "First Open",
    available: true,
    sql: sql`event_name = 'first_open'`,
  },
  {
    key: "signup",
    label: "Signup",
    available: true,
    sql: sql`event_name IN ('pre_signup_signup_completed', 'pre_signup_login_completed') OR (event_name = 'screen_view' AND props->>'screen' IN ('/sign-up', '/sign-in'))`,
  },
  {
    key: "onboarding_completed",
    label: "Onboarding Completed",
    available: true,
    sql: sql`(event_name = 'onboarding_funnel_event' AND props->>'step' = 'finish_clicked') OR (event_name = 'onboarding_milestone' AND props->>'milestone' = 'completed')`,
  },
  {
    key: "routine_generated",
    label: "Routine Generated",
    available: true,
    sql: sql`event_name = 'routine_generated'`,
  },
  {
    key: "speech_coach_started",
    label: "Speech Coach Started",
    available: true,
    sql: sql`event_name = 'speech_coach_v2_session_start'`,
  },
  {
    key: "nutrition_hub_used",
    label: "Nutrition Hub Used",
    available: true,
    sql: sql`(event_name = 'screen_view' AND props->>'screen' ILIKE '%nutrition%') OR (event_name = 'feature_open' AND props->>'feature' ILIKE '%nutrition%')`,
  },
  {
    key: "worksheet_downloaded",
    label: "Worksheet Downloaded",
    available: true,
    sql: sql`event_name = 'asset_download' AND (props->>'asset_type' ILIKE '%worksheet%' OR props->>'type' ILIKE '%worksheet%')`,
  },
  {
    key: "trial_started",
    label: "Trial Started",
    available: true,
    sql: sql`(event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started') OR event_name = 'speech_coach_trial_started'`,
  },
  {
    key: "subscription_purchased",
    label: "Subscription Purchased",
    available: true,
    sql: sql`event_name IN ('upgrade_completed') OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success')`,
  },
  {
    key: "renewed",
    label: "Renewed",
    available: true,
    sql: sql`event_name = 'subscription_funnel_event' AND props->>'step' IN ('renewal', 'renewed', 'subscription_renewed')`,
  },
];

export async function computeFunnel(range: GrowthTimeRange): Promise<FunnelStage[]> {
  const counts = await Promise.all(
    FUNNEL_DEFS.map(async (def) => {
      if (!def.available) {
        return { def, current: 0, previous: 0 };
      }
      const [current, previous] = await Promise.all([
        countUsers(def.sql, range),
        countUsers(def.sql, {
          ...range,
          start: range.previousStart,
          end: range.previousEnd,
        }),
      ]);
      return { def, current, previous };
    }),
  );

  const firstAvailable = counts.find((c) => c.def.available && c.current > 0);
  const baseUsers = firstAvailable?.current ?? counts.find((c) => c.def.key === "install")?.current ?? 0;

  return counts.map((item, idx) => {
    const prevStage = counts[idx - 1];
    const prevUsers = idx === 0 ? item.current : (prevStage?.current ?? 0);
    const conversionPct =
      idx === 0 || !item.def.available
        ? item.def.available && baseUsers > 0
          ? pctRate(item.current, baseUsers)
          : null
        : pctRate(item.current, prevUsers);
    const dropPct =
      idx > 0 && prevUsers > 0 && item.def.available
        ? pctRate(prevUsers - item.current, prevUsers)
        : null;
    return {
      key: item.def.key,
      label: item.def.label,
      users: item.def.available ? item.current : 0,
      conversionPct,
      dropPct,
      trendPct: item.def.available ? pctChange(item.current, item.previous) : null,
      available: item.def.available,
    };
  });
}
