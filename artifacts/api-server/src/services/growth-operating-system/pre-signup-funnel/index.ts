/**
 * Pre-signup notification funnel + health metrics for Growth OS (Phase A).
 */
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "../../growth-dashboard/types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "../../growth-dashboard/sqlHelpers.js";

export type PreSignupFunnelStage = {
  key: string;
  label: string;
  users: number;
  conversionPct: number | null;
  dropPct: number | null;
  broken: boolean;
  brokenReason: string | null;
};

export type PreSignupHealthMetrics = {
  permissionRate: number | null;
  schedulingRate: number | null;
  deliveryRate: number | null;
  openRate: number | null;
  signupRate: number | null;
  trialRate: number | null;
  conversionRate: number | null;
  attributionRate: number | null;
  overallHealthScore: number;
  alertRaised: boolean;
};

export type PreSignupAndroidSummary = {
  androidFirstOpens: number;
  permissionChecked: number;
  permissionGrantedPct: number | null;
  campaignEligiblePct: number | null;
  campaignScheduledPct: number | null;
  nativeScheduleSuccessPct: number | null;
  deliveredPct: number | null;
  openedPct: number | null;
  signupStartedPct: number | null;
  healthScore: number;
  lastFailureReason: string | null;
  topBlockReason: string | null;
};

export type PreSignupFunnelPayload = {
  stages: PreSignupFunnelStage[];
  health: PreSignupHealthMetrics;
  android: PreSignupAndroidSummary;
  generatedAt: string;
};

const ANDROID_PLATFORM_FILTER = sql`(
  platform ILIKE '%android%'
  OR props->>'platform' ILIKE '%android%'
)`;

const DISTINCT_ACTOR = sql`COALESCE(NULLIF(props->>'device_id', ''), user_id)`;

type StageDef = {
  key: string;
  label: string;
  sql: ReturnType<typeof sql>;
  minConversionPct?: number;
};

const STAGE_DEFS: StageDef[] = [
  {
    key: "install",
    label: "Install",
    sql: sql`event_name IN ('device_registered', 'first_open', 'install_source')`,
  },
  {
    key: "permission_granted",
    label: "Permission Granted",
    sql: sql`event_name = 'pre_signup_permission_checked' AND props->>'permission_status' = 'granted'`,
    minConversionPct: 15,
  },
  {
    key: "campaign_eligible",
    label: "Campaign Eligible",
    sql: sql`event_name = 'pre_signup_campaign_eligible'`,
    minConversionPct: 50,
  },
  {
    key: "campaign_scheduled",
    label: "Campaign Scheduled",
    sql: sql`event_name = 'pre_signup_notification_scheduled'`,
    minConversionPct: 80,
  },
  {
    key: "delivered",
    label: "Delivered",
    sql: sql`event_name = 'pre_signup_notification_delivered'`,
    minConversionPct: 30,
  },
  {
    key: "opened",
    label: "Opened",
    sql: sql`event_name = 'pre_signup_notification_opened'`,
    minConversionPct: 10,
  },
  {
    key: "signup_started",
    label: "Signup Started",
    sql: sql`event_name = 'pre_signup_signup_started'`,
    minConversionPct: 20,
  },
  {
    key: "signup_completed",
    label: "Signup Completed",
    sql: sql`event_name IN ('pre_signup_signup_completed', 'pre_signup_login_completed')`,
    minConversionPct: 30,
  },
  {
    key: "trial_started",
    label: "Trial Started",
    sql: sql`(event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started') OR event_name = 'speech_coach_trial_started'`,
    minConversionPct: 5,
  },
  {
    key: "paid",
    label: "Paid",
    sql: sql`event_name IN ('upgrade_completed') OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success')`,
    minConversionPct: 1,
  },
];

async function countDistinctUsers(
  query: ReturnType<typeof sql>,
  range: GrowthTimeRange,
): Promise<number> {
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

async function countAndroidActors(
  query: ReturnType<typeof sql>,
  range: GrowthTimeRange,
): Promise<number> {
  const res = await db.execute(sql`
    SELECT count(DISTINCT ${DISTINCT_ACTOR})::int AS users
    FROM analytics_events
    WHERE ${query}
      AND ${ANDROID_PLATFORM_FILTER}
      AND server_ts >= ${range.start.toISOString()}::timestamptz
      AND server_ts <= ${range.end.toISOString()}::timestamptz
      AND ${ANALYTICS_NOISE_FILTER}
  `);
  return rowNum((res.rows[0] ?? {}) as Record<string, unknown>, "users");
}

async function fetchLastAndroidFailureReason(range: GrowthTimeRange): Promise<string | null> {
  const res = await db.execute(sql`
    SELECT
      COALESCE(
        nullif(props->>'schedule_failure_reason', ''),
        nullif(props->>'native_schedule_result', '')
      ) AS reason
    FROM analytics_events
    WHERE event_name = 'pre_signup_native_schedule_result'
      AND ${ANDROID_PLATFORM_FILTER}
      AND (
        nullif(props->>'schedule_failure_reason', '') IS NOT NULL
        OR props->>'native_schedule_result' NOT IN ('submitted', 'capacitor_scheduled', 'capacitor_empty')
      )
      AND server_ts >= ${range.start.toISOString()}::timestamptz
      AND server_ts <= ${range.end.toISOString()}::timestamptz
      AND ${ANALYTICS_NOISE_FILTER}
    ORDER BY server_ts DESC
    LIMIT 1
  `);
  const reason = (res.rows[0] as Record<string, unknown> | undefined)?.reason;
  return typeof reason === "string" && reason.length > 0 ? reason : null;
}

async function fetchTopAndroidBlockReason(range: GrowthTimeRange): Promise<string | null> {
  const res = await db.execute(sql`
    SELECT props->>'block_reason' AS reason, count(*)::int AS n
    FROM analytics_events
    WHERE event_name = 'pre_signup_campaign_blocked'
      AND ${ANDROID_PLATFORM_FILTER}
      AND nullif(props->>'block_reason', '') IS NOT NULL
      AND server_ts >= ${range.start.toISOString()}::timestamptz
      AND server_ts <= ${range.end.toISOString()}::timestamptz
      AND ${ANALYTICS_NOISE_FILTER}
    GROUP BY 1
    ORDER BY n DESC, reason ASC
    LIMIT 1
  `);
  const reason = (res.rows[0] as Record<string, unknown> | undefined)?.reason;
  return typeof reason === "string" && reason.length > 0 ? reason : null;
}

async function countAttributionConversions(range: GrowthTimeRange): Promise<number> {
  const res = await db.execute(sql`
    SELECT count(DISTINCT user_id)::int AS users
    FROM analytics_events
    WHERE event_name = 'pre_signup_signup_conversion'
      AND server_ts >= ${range.start.toISOString()}::timestamptz
      AND server_ts <= ${range.end.toISOString()}::timestamptz
      AND ${ANALYTICS_NOISE_FILTER}
  `);
  return rowNum((res.rows[0] ?? {}) as Record<string, unknown>, "users");
}

function buildHealthScore(rates: {
  permissionRate: number | null;
  schedulingRate: number | null;
  deliveryRate: number | null;
  openRate: number | null;
  signupRate: number | null;
}): number {
  const weights = [
    { rate: rates.permissionRate, weight: 25, target: 40 },
    { rate: rates.schedulingRate, weight: 25, target: 70 },
    { rate: rates.deliveryRate, weight: 20, target: 50 },
    { rate: rates.openRate, weight: 15, target: 15 },
    { rate: rates.signupRate, weight: 15, target: 10 },
  ];
  let score = 0;
  let totalWeight = 0;
  for (const w of weights) {
    if (w.rate === null) continue;
    totalWeight += w.weight;
    const normalized = Math.min(100, (w.rate / w.target) * 100);
    score += normalized * (w.weight / 100);
  }
  if (totalWeight === 0) return 0;
  return Math.round((score / totalWeight) * 100);
}

export async function computePreSignupFunnel(
  range: GrowthTimeRange,
): Promise<PreSignupFunnelPayload> {
  const counts = await Promise.all(
    STAGE_DEFS.map(async (def) => ({
      def,
      users: await countDistinctUsers(def.sql, range),
    })),
  );

  const stages: PreSignupFunnelStage[] = counts.map((row, idx) => {
    const prev = idx > 0 ? counts[idx - 1]!.users : null;
    const conversionPct =
      prev !== null && prev > 0 ? pctRate(row.users, prev) : null;
    const dropPct =
      conversionPct !== null ? Math.round((100 - conversionPct) * 10) / 10 : null;

    const minExpected = row.def.minConversionPct;
    const broken =
      conversionPct !== null &&
      minExpected !== undefined &&
      prev !== null &&
      prev >= 5 &&
      conversionPct < minExpected;

    return {
      key: row.def.key,
      label: row.def.label,
      users: row.users,
      conversionPct,
      dropPct,
      broken,
      brokenReason: broken
        ? `Conversion ${conversionPct}% below minimum ${minExpected}%`
        : null,
    };
  });

  const byKey = Object.fromEntries(stages.map((s) => [s.key, s.users]));
  const permissionRate = pctRate(byKey.permission_granted ?? 0, byKey.install ?? 0);
  const schedulingRate = pctRate(
    byKey.campaign_scheduled ?? 0,
    byKey.campaign_eligible ?? 0,
  );
  const deliveryRate = pctRate(byKey.delivered ?? 0, byKey.campaign_scheduled ?? 0);
  const openRate = pctRate(byKey.opened ?? 0, byKey.delivered ?? 0);
  const signupRate = pctRate(byKey.signup_started ?? 0, byKey.opened ?? 0);
  const trialRate = pctRate(byKey.trial_started ?? 0, byKey.signup_completed ?? 0);
  const conversionRate = pctRate(byKey.paid ?? 0, byKey.trial_started ?? 0);

  const attributionUsers = await countAttributionConversions(range);
  const attributionRate = pctRate(attributionUsers, byKey.opened ?? 0);

  const overallHealthScore = buildHealthScore({
    permissionRate,
    schedulingRate,
    deliveryRate,
    openRate,
    signupRate,
  });

  const [
    androidFirstOpens,
    permissionChecked,
    permissionGranted,
    campaignEligible,
    campaignScheduled,
    nativeScheduleSuccess,
    nativeScheduleAttempts,
    delivered,
    opened,
    signupStarted,
    lastFailureReason,
    topBlockReason,
  ] = await Promise.all([
    countAndroidActors(sql`event_name = 'first_open'`, range),
    countAndroidActors(sql`event_name = 'pre_signup_permission_checked'`, range),
    countAndroidActors(
      sql`event_name = 'pre_signup_permission_checked' AND props->>'permission_status' = 'granted'`,
      range,
    ),
    countAndroidActors(sql`event_name = 'pre_signup_campaign_eligible'`, range),
    countAndroidActors(sql`event_name = 'pre_signup_notification_scheduled'`, range),
    countAndroidActors(
      sql`event_name = 'pre_signup_native_schedule_result' AND props->>'native_schedule_result' IN ('submitted', 'capacitor_scheduled')`,
      range,
    ),
    countAndroidActors(sql`event_name = 'pre_signup_native_schedule_result'`, range),
    countAndroidActors(sql`event_name = 'pre_signup_notification_delivered'`, range),
    countAndroidActors(sql`event_name = 'pre_signup_notification_opened'`, range),
    countAndroidActors(sql`event_name = 'pre_signup_signup_started'`, range),
    fetchLastAndroidFailureReason(range),
    fetchTopAndroidBlockReason(range),
  ]);

  const android: PreSignupAndroidSummary = {
    androidFirstOpens,
    permissionChecked,
    permissionGrantedPct: pctRate(permissionGranted, permissionChecked),
    campaignEligiblePct: pctRate(campaignEligible, permissionGranted),
    campaignScheduledPct: pctRate(campaignScheduled, campaignEligible),
    nativeScheduleSuccessPct: pctRate(nativeScheduleSuccess, nativeScheduleAttempts),
    deliveredPct: pctRate(delivered, campaignScheduled),
    openedPct: pctRate(opened, delivered),
    signupStartedPct: pctRate(signupStarted, opened),
    healthScore: overallHealthScore,
    lastFailureReason,
    topBlockReason,
  };

  return {
    stages,
    health: {
      permissionRate,
      schedulingRate,
      deliveryRate,
      openRate,
      signupRate,
      trialRate,
      conversionRate,
      attributionRate,
      overallHealthScore,
      alertRaised: overallHealthScore < 70,
    },
    android,
    generatedAt: new Date().toISOString(),
  };
}
