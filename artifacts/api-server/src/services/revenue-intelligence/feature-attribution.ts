import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "../growth-dashboard/types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "../growth-dashboard/sqlHelpers.js";
import type { FeatureRevenueAttribution } from "./types.js";
import { classifyEstimated, MIN_PURCHASE_EVENTS } from "./safety.js";

const CORRELATION_DISCLAIMER =
  "Correlation only — feature usage preceding purchase does not prove causation.";

const FEATURES: Array<{ feature: string; label: string; filter: string }> = [
  { feature: "routine_generation", label: "Routine Generation", filter: "event_name IN ('routine_generated', 'routine_generation_completed')" },
  { feature: "parent_hub", label: "Parent Hub", filter: "event_name = 'screen_view' AND props->>'screen' ILIKE '%parenting-hub%'" },
  { feature: "speech_coach", label: "Speech Coach", filter: "event_name = 'speech_coach_v2_session_start'" },
  { feature: "worksheets", label: "Worksheets", filter: "event_name = 'asset_download'" },
  { feature: "stories", label: "Stories", filter: "event_name = 'screen_view' AND props->>'screen' ILIKE '%stories%'" },
  { feature: "nutrition", label: "Nutrition", filter: "event_name = 'screen_view' AND props->>'screen' ILIKE '%nutrition%'" },
  { feature: "ai_coach", label: "AI Coach", filter: "event_name IN ('speech_coach_started', 'infant_coach_session_start')" },
];

export async function computeFeatureRevenueAttribution(
  range: GrowthTimeRange,
): Promise<FeatureRevenueAttribution[]> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();

  const results: FeatureRevenueAttribution[] = [];

  for (const def of FEATURES) {
    const res = await db.execute(sql`
      WITH purchasers AS (
        SELECT DISTINCT user_id, min(server_ts) AS purchased_at
        FROM analytics_events
        WHERE (event_name = 'upgrade_completed'
          OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success'))
          AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
          AND ${ANALYTICS_NOISE_FILTER}
        GROUP BY user_id
      ),
      feature_before AS (
        SELECT count(DISTINCT p.user_id)::int AS users
        FROM purchasers p
        WHERE EXISTS (
          SELECT 1 FROM analytics_events ae
          WHERE ae.user_id = p.user_id
            AND ae.server_ts < p.purchased_at
            AND ae.server_ts >= ${start}::timestamptz
            AND ${sql.raw(def.filter)}
        )
      ),
      trial_users AS (
        SELECT count(DISTINCT ae.user_id)::int AS users
        FROM analytics_events ae
        WHERE ae.server_ts >= ${start}::timestamptz AND ae.server_ts <= ${end}::timestamptz
          AND ${sql.raw(def.filter)}
          AND ae.user_id IN (
            SELECT user_id FROM analytics_events
            WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started'
          )
      ),
      feature_users AS (
        SELECT count(DISTINCT user_id)::int AS users
        FROM analytics_events
        WHERE server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
          AND ${ANALYTICS_NOISE_FILTER} AND (${sql.raw(def.filter)})
      ),
      total_purchasers AS (SELECT count(*)::int AS c FROM purchasers)
      SELECT
        (SELECT users FROM feature_before) AS before_purchase,
        (SELECT users FROM feature_users) AS feature_users,
        (SELECT users FROM trial_users) AS trial_corr,
        (SELECT c FROM total_purchasers) AS total_purchasers
    `);

    const r = (res.rows[0] ?? {}) as Record<string, unknown>;
    const beforePurchase = rowNum(r, "before_purchase");
    const totalPurchasers = rowNum(r, "total_purchasers");
    const featureUsers = rowNum(r, "feature_users");
    const trialCorr = rowNum(r, "trial_corr");

    results.push({
      feature: def.feature,
      label: def.label,
      usersBeforePurchase: beforePurchase,
      purchaseCorrelationPct: pctRate(beforePurchase, totalPurchasers),
      trialCorrelationPct: pctRate(trialCorr, featureUsers),
      rank: 0,
      evidenceClass: classifyEstimated(totalPurchasers, MIN_PURCHASE_EVENTS),
      disclaimer: CORRELATION_DISCLAIMER,
    });
  }

  return results
    .sort((a, b) => (b.purchaseCorrelationPct ?? 0) - (a.purchaseCorrelationPct ?? 0))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
