/**
 * Product analytics for /admin/growth. Every number is a SQL aggregate over
 * analytics_events. Empty ranges return zeros, not sample data.
 */
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { getAnalyticsQuality } from "../analyticsIngestService";
import { parseGrowthTimeRange } from "./timeRange.js";
import { ANALYTICS_NOISE_FILTER, rowNum } from "./sqlHelpers.js";

const PAGE_EVENTS = sql`event_name IN ('screen_view', 'page_view')`;
const EXIT_EVENTS = sql`event_name IN ('screen_leave', 'page_exit')`;
const ACTIVITY = sql`event_name NOT IN ('device_header_missing', 'session_heartbeat')`;

function iso(d: Date): string {
  return d.toISOString();
}

function rowsOf(result: { rows: unknown[] }): Record<string, unknown>[] {
  return result.rows as Record<string, unknown>[];
}

export async function computeProductAnalytics(input: {
  preset?: string;
  start?: string;
  end?: string;
}) {
  const range = parseGrowthTimeRange(input);
  const start = iso(range.start);
  const end = iso(range.end);
  const endDate = range.end;
  const dauStart = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
  const wauStart = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const mauStart = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [executive, pages, flow, features, journey, retention, acquisition, sourceConversion, technical] =
    await Promise.all([
      db.execute(sql`
        SELECT
          count(DISTINCT user_id) FILTER (WHERE event_name = 'first_open')::int AS first_opens,
          count(DISTINCT user_id) FILTER (
            WHERE ${ACTIVITY} AND server_ts >= ${iso(dauStart)}::timestamptz
          )::int AS dau,
          count(DISTINCT user_id) FILTER (
            WHERE ${ACTIVITY} AND server_ts >= ${iso(wauStart)}::timestamptz
          )::int AS wau,
          count(DISTINCT user_id) FILTER (
            WHERE ${ACTIVITY} AND server_ts >= ${iso(mauStart)}::timestamptz
          )::int AS mau,
          count(DISTINCT user_id) FILTER (
            WHERE event_name IN ('pre_signup_signup_completed', 'child_created', 'onboarding_completed')
          )::int AS new_signups,
          count(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL)::int AS active_sessions,
          count(DISTINCT user_id) FILTER (
            WHERE event_name IN ('purchase_success', 'upgrade_completed', 'subscription_active')
          )::int AS paid_users,
          count(DISTINCT user_id) FILTER (
            WHERE event_name IN ('onboarding_completed', 'first_feature_used', 'feature_started')
          )::int AS activated_users,
          count(DISTINCT user_id) FILTER (
            WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started'
          )::int AS store_trial_starts,
          count(DISTINCT user_id) FILTER (
            WHERE event_name = 'speech_coach_trial_started'
          )::int AS speech_trial_starts,
          count(DISTINCT user_id) FILTER (
            WHERE event_name IN ('purchase_success', 'upgrade_completed')
              AND coalesce(props->>'source', '') = 'server'
              AND upper(coalesce(props->>'period_type', '')) <> 'TRIAL'
          )::int AS paid_conversions,
          count(*) FILTER (
            WHERE event_name = 'subscription_funnel_event'
              AND props->>'step' IN ('refund', 'subscription_cancelled')
          )::int AS refund_or_cancel_events
        FROM analytics_events
        WHERE server_ts >= ${start}::timestamptz
          AND server_ts <= ${end}::timestamptz
          AND ${ANALYTICS_NOISE_FILTER}
      `),
      db.execute(sql`
        WITH views AS (
          SELECT
            coalesce(props->>'page_name', props->>'screen', 'unknown') AS page_name,
            count(*)::int AS views,
            count(DISTINCT user_id)::int AS unique_users
          FROM analytics_events
          WHERE ${PAGE_EVENTS}
            AND server_ts >= ${start}::timestamptz
            AND server_ts <= ${end}::timestamptz
          GROUP BY 1
        ),
        exits AS (
          SELECT
            coalesce(props->>'page_name', props->>'screen', 'unknown') AS page_name,
            coalesce(round(avg(
              coalesce(
                NULLIF(props->>'active_duration_ms', '')::numeric,
                NULLIF(props->>'page_duration_ms', '')::numeric,
                NULLIF(props->>'time_on_screen_ms', '')::numeric
              )
            ))::int, 0) AS avg_active_ms
          FROM analytics_events
          WHERE ${EXIT_EVENTS}
            AND server_ts >= ${start}::timestamptz
            AND server_ts <= ${end}::timestamptz
          GROUP BY 1
        )
        SELECT v.page_name, v.views, v.unique_users, coalesce(e.avg_active_ms, 0) AS avg_active_ms
        FROM views v
        LEFT JOIN exits e ON e.page_name = v.page_name
        ORDER BY v.views DESC
        LIMIT 40
      `),
      db.execute(sql`
        SELECT
          coalesce(props->>'previous_page', props->>'from_route', '(entry)') AS from_page,
          coalesce(props->>'page_name', props->>'screen', props->>'to_route', 'unknown') AS to_page,
          count(*)::int AS transitions
        FROM analytics_events
        WHERE event_name IN ('page_view', 'navigation')
          AND server_ts >= ${start}::timestamptz
          AND server_ts <= ${end}::timestamptz
        GROUP BY 1, 2
        ORDER BY transitions DESC
        LIMIT 40
      `),
      db.execute(sql`
        SELECT
          coalesce(props->>'feature_name', props->>'feature', props->>'feature_id', event_name) AS feature_name,
          count(*) FILTER (WHERE event_name IN ('feature_viewed', 'feature_open'))::int AS views,
          count(DISTINCT user_id)::int AS unique_users,
          count(*) FILTER (WHERE event_name IN ('feature_started', 'feature_open'))::int AS starts,
          count(*) FILTER (WHERE event_name IN ('feature_completed', 'feature_complete'))::int AS completions,
          count(*) FILTER (WHERE event_name = 'feature_abandoned')::int AS abandoned,
          count(DISTINCT user_id) FILTER (
            WHERE event_name IN ('feature_started', 'feature_open', 'feature_completed', 'feature_complete')
              AND user_id IN (
                SELECT user_id FROM analytics_events
                WHERE event_name IN ('purchase_success', 'upgrade_completed')
                  AND coalesce(props->>'source', '') = 'server'
                  AND upper(coalesce(props->>'period_type', '')) <> 'TRIAL'
                  AND server_ts >= ${start}::timestamptz
                  AND server_ts <= ${end}::timestamptz
              )
          )::int AS paid_users,
          coalesce(round(avg(NULLIF(props->>'duration_ms', '')::numeric))::int, 0) AS avg_duration_ms
        FROM analytics_events
        WHERE server_ts >= ${start}::timestamptz
          AND server_ts <= ${end}::timestamptz
          AND (
            event_name LIKE 'feature_%'
            OR event_name IN ('feature_open', 'feature_complete')
            OR jsonb_exists(props, 'feature_name')
          )
        GROUP BY 1
        ORDER BY unique_users DESC
        LIMIT 40
      `),
      db.execute(sql`
        SELECT
          count(DISTINCT user_id) FILTER (WHERE event_name = 'first_open')::int AS first_open,
          count(DISTINCT user_id) FILTER (
            WHERE event_name IN ('pre_signup_signup_completed', 'pre_signup_signup_started', 'child_created')
          )::int AS signup,
          count(DISTINCT user_id) FILTER (WHERE event_name = 'onboarding_completed')::int AS onboarding_completed,
          count(DISTINCT user_id) FILTER (
            WHERE event_name IN ('first_feature_used', 'feature_started', 'feature_open')
          )::int AS first_feature,
          count(DISTINCT user_id) FILTER (
            WHERE event_name IN ('paywall_view', 'premium_paywall_viewed')
          )::int AS paywall,
          count(DISTINCT user_id) FILTER (
            WHERE event_name IN ('checkout_started', 'subscribe_clicked', 'upgrade_started')
          )::int AS checkout,
          count(DISTINCT user_id) FILTER (
            WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started'
          )::int AS trial_starts,
          count(DISTINCT user_id) FILTER (
            WHERE event_name IN ('purchase_success', 'upgrade_completed')
              AND coalesce(props->>'source', '') = 'server'
              AND upper(coalesce(props->>'period_type', '')) <> 'TRIAL'
          )::int AS paid_conversions,
          count(DISTINCT user_id) FILTER (
            WHERE event_name IN ('purchase_success', 'upgrade_completed')
              OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success')
          )::int AS purchase
        FROM analytics_events
        WHERE server_ts >= ${start}::timestamptz
          AND server_ts <= ${end}::timestamptz
          AND ${ANALYTICS_NOISE_FILTER}
      `),
      db.execute(sql`
        WITH firsts AS (
          SELECT user_id, min(server_ts) AS first_at
          FROM analytics_events
          WHERE event_name = 'first_open'
          GROUP BY user_id
        ),
        cohort AS (
          SELECT user_id, first_at
          FROM firsts
          WHERE first_at >= ${start}::timestamptz
            AND first_at <= ${end}::timestamptz
        ),
        activity AS (
          SELECT DISTINCT user_id, server_ts::date AS day
          FROM analytics_events
          WHERE ${ACTIVITY}
        )
        SELECT
          count(*)::int AS cohort_size,
          count(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM activity a
              WHERE a.user_id = c.user_id AND a.day = (c.first_at::date + 1)
            )
          )::int AS d1,
          count(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM activity a
              WHERE a.user_id = c.user_id AND a.day = (c.first_at::date + 3)
            )
          )::int AS d3,
          count(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM activity a
              WHERE a.user_id = c.user_id AND a.day = (c.first_at::date + 7)
            )
          )::int AS d7,
          count(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM activity a
              WHERE a.user_id = c.user_id AND a.day = (c.first_at::date + 14)
            )
          )::int AS d14,
          count(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM activity a
              WHERE a.user_id = c.user_id AND a.day = (c.first_at::date + 30)
            )
          )::int AS d30
        FROM cohort c
      `),
      db.execute(sql`
        SELECT
          CASE
            WHEN coalesce(props->>'gclid', '') <> ''
              OR coalesce(props->>'gbraid', '') <> ''
              OR coalesce(props->>'wbraid', '') <> '' THEN 'verified_paid'
            WHEN lower(coalesce(props->>'install_source', '')) IN ('organic', 'referral', 'play_referrer')
              THEN lower(props->>'install_source')
            ELSE 'attribution_unknown'
          END AS bucket,
          coalesce(nullif(props->>'campaign_id', ''), '(none)') AS campaign_id,
          count(DISTINCT user_id)::int AS users
        FROM analytics_events
        WHERE event_name IN ('first_open', 'install_source')
          AND server_ts >= ${start}::timestamptz
          AND server_ts <= ${end}::timestamptz
        GROUP BY 1, 2
        ORDER BY users DESC
        LIMIT 40
      `),
      db.execute(sql`
        WITH touches AS (
          SELECT DISTINCT ON (user_id)
            user_id,
            CASE
              WHEN coalesce(props->>'gclid', '') <> ''
                OR coalesce(props->>'gbraid', '') <> ''
                OR coalesce(props->>'wbraid', '') <> '' THEN 'verified_paid'
              WHEN lower(coalesce(props->>'install_source', '')) IN ('organic', 'referral', 'play_referrer')
                THEN lower(props->>'install_source')
              ELSE 'attribution_unknown'
            END AS bucket
          FROM analytics_events
          WHERE event_name IN ('first_open', 'install_source')
            AND server_ts >= ${start}::timestamptz
            AND server_ts <= ${end}::timestamptz
          ORDER BY user_id, server_ts ASC
        ),
        outcomes AS (
          SELECT
            user_id,
            bool_or(event_name IN ('pre_signup_signup_completed', 'child_created')) AS signup,
            bool_or(event_name IN ('paywall_view', 'premium_paywall_viewed')) AS paywall,
            bool_or(event_name IN ('checkout_started', 'subscribe_clicked', 'upgrade_started')) AS checkout,
            bool_or(
              event_name IN ('purchase_success', 'upgrade_completed')
              AND coalesce(props->>'source', '') = 'server'
              AND upper(coalesce(props->>'period_type', '')) <> 'TRIAL'
            ) AS paid
          FROM analytics_events
          WHERE server_ts >= ${start}::timestamptz
            AND server_ts <= ${end}::timestamptz
          GROUP BY user_id
        )
        SELECT
          t.bucket,
          count(*)::int AS installs,
          count(*) FILTER (WHERE o.signup)::int AS signups,
          count(*) FILTER (WHERE o.paywall)::int AS paywall,
          count(*) FILTER (WHERE o.checkout)::int AS checkout,
          count(*) FILTER (WHERE o.paid)::int AS paid
        FROM touches t
        LEFT JOIN outcomes o ON o.user_id = t.user_id
        GROUP BY t.bucket
        ORDER BY installs DESC
      `),
      db.execute(sql`
        SELECT
          coalesce(nullif(platform, ''), 'unknown') AS platform,
          coalesce(nullif(app_version, ''), 'unknown') AS app_version,
          count(*)::int AS events,
          count(DISTINCT user_id)::int AS users
        FROM analytics_events
        WHERE server_ts >= ${start}::timestamptz
          AND server_ts <= ${end}::timestamptz
          AND ${ANALYTICS_NOISE_FILTER}
        GROUP BY 1, 2
        ORDER BY events DESC
        LIMIT 30
      `),
    ]);

  const returning = await db.execute(sql`
    SELECT count(*)::int AS returning_users
    FROM (
      SELECT user_id
      FROM analytics_events
      WHERE server_ts >= ${start}::timestamptz
        AND server_ts <= ${end}::timestamptz
        AND ${ACTIVITY}
      GROUP BY user_id
      HAVING count(DISTINCT server_ts::date) > 1
    ) r
  `);

  const duplicates = await db.execute(sql`
    SELECT count(*)::int AS duplicate_groups
    FROM (
      SELECT props->>'event_id' AS event_id
      FROM analytics_events
      WHERE server_ts >= ${start}::timestamptz
        AND server_ts <= ${end}::timestamptz
        AND coalesce(props->>'event_id', '') <> ''
      GROUP BY 1
      HAVING count(*) > 1
    ) d
  `);

  const exec = rowsOf(executive)[0] ?? {};
  const journeyRow = rowsOf(journey)[0] ?? {};
  const retentionRow = rowsOf(retention)[0] ?? {};
  const quality = getAnalyticsQuality();
  const received = quality.accepted + quality.rejected.unknownEvent + quality.rejected.invalidProps + quality.rejected.tooLarge;

  return {
    generatedAt: new Date().toISOString(),
    timeRange: {
      preset: range.preset,
      start,
      end,
      label: range.label,
    },
    source: "analytics_events",
    executive: {
      firstOpens: rowNum(exec, "first_opens"),
      dau: rowNum(exec, "dau"),
      wau: rowNum(exec, "wau"),
      mau: rowNum(exec, "mau"),
      newSignups: rowNum(exec, "new_signups"),
      activeSessions: rowNum(exec, "active_sessions"),
      returningUsers: rowNum(rowsOf(returning)[0] ?? {}, "returning_users"),
      paidUsers: rowNum(exec, "paid_users"),
      activatedUsers: rowNum(exec, "activated_users"),
      storeTrialStarts: rowNum(exec, "store_trial_starts"),
      speechTrialStarts: rowNum(exec, "speech_trial_starts"),
      paidConversions: rowNum(exec, "paid_conversions"),
      refundOrCancelEvents: rowNum(exec, "refund_or_cancel_events"),
    },
    pages: rowsOf(pages).map((row) => ({
      pageName: String(row.page_name ?? "unknown"),
      views: rowNum(row, "views"),
      uniqueUsers: rowNum(row, "unique_users"),
      avgActiveMs: rowNum(row, "avg_active_ms"),
    })),
    navigation: rowsOf(flow).map((row) => ({
      from: String(row.from_page ?? ""),
      to: String(row.to_page ?? ""),
      transitions: rowNum(row, "transitions"),
    })),
    features: rowsOf(features).map((row) => ({
      featureName: String(row.feature_name ?? "unknown"),
      views: rowNum(row, "views"),
      uniqueUsers: rowNum(row, "unique_users"),
      starts: rowNum(row, "starts"),
      completions: rowNum(row, "completions"),
      abandoned: rowNum(row, "abandoned"),
      avgDurationMs: rowNum(row, "avg_duration_ms"),
      paidUsers: rowNum(row, "paid_users"),
    })),
    journey: {
      firstOpen: rowNum(journeyRow, "first_open"),
      signup: rowNum(journeyRow, "signup"),
      onboardingCompleted: rowNum(journeyRow, "onboarding_completed"),
      firstFeature: rowNum(journeyRow, "first_feature"),
      paywall: rowNum(journeyRow, "paywall"),
      checkout: rowNum(journeyRow, "checkout"),
      trialStarts: rowNum(journeyRow, "trial_starts"),
      paidConversions: rowNum(journeyRow, "paid_conversions"),
      purchase: rowNum(journeyRow, "purchase"),
    },
    retention: {
      cohortSize: rowNum(retentionRow, "cohort_size"),
      d1: rowNum(retentionRow, "d1"),
      d3: rowNum(retentionRow, "d3"),
      d7: rowNum(retentionRow, "d7"),
      d14: rowNum(retentionRow, "d14"),
      d30: rowNum(retentionRow, "d30"),
    },
    acquisition: rowsOf(acquisition).map((row) => ({
      bucket: String(row.bucket ?? "attribution_unknown"),
      campaignId: String(row.campaign_id ?? "(none)"),
      users: rowNum(row, "users"),
    })),
    sourceConversion: rowsOf(sourceConversion).map((row) => ({
      bucket: String(row.bucket ?? "attribution_unknown"),
      installs: rowNum(row, "installs"),
      signups: rowNum(row, "signups"),
      paywall: rowNum(row, "paywall"),
      checkout: rowNum(row, "checkout"),
      paid: rowNum(row, "paid"),
    })),
    availability: {
      mrr: {
        state: "not_collected" as const,
        reason:
          "analytics_events does not store subscription price history. The Subscriptions section estimates MRR from plan names times Razorpay list prices. That estimate is not store proceeds and is not shown here as zero.",
      },
      refundAmount: {
        state: "not_collected" as const,
        reason:
          "Refund webhooks record a funnel step. They do not record a refunded amount, so refund revenue is not zero.",
      },
      deviceQueue: {
        state: "not_collected" as const,
        reason: "The durable queue lives on the device. This API cannot see it.",
      },
      historicalPaidPeriod: {
        state: "partial" as const,
        reason:
          "Server purchase rows written before period_type was stored cannot be separated from free trials. New RevenueCat TRIAL initial purchases are excluded.",
      },
    },
    technical: {
      processQuality: quality,
      ingestionSuccessRate: received === 0 ? null : Math.round((quality.accepted / received) * 1000) / 1000,
      duplicateEventGroups: rowNum(rowsOf(duplicates)[0] ?? {}, "duplicate_groups"),
      queueBacklog: null,
      queueBacklogNote: "The durable queue lives on the device. This API reports server accept/reject counts since process start.",
      coverage: rowsOf(technical).map((row) => ({
        platform: String(row.platform ?? "unknown"),
        appVersion: String(row.app_version ?? "unknown"),
        events: rowNum(row, "events"),
        users: rowNum(row, "users"),
      })),
    },
  };
}
