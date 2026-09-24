import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthAlert } from "../../growth-dashboard/types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "../../growth-dashboard/sqlHelpers.js";
import {
  ADS_CONVERSION_CATALOG,
  type AdsConversionCatalogRow,
  type AdsHealthEventKey,
} from "./catalog.js";
import {
  MIN_USERS_FOR_QUALITY_SIGNAL,
  buildAdsConversionAlerts,
  recommendQualitySignal,
  type AdsHealthVolumeRow,
} from "./alerts.js";

export type AdsHealthStatus =
  | "LIVE"
  | "READY_FOR_IMPORT"
  | "TRACKING_ADDED"
  | "INSUFFICIENT_DATA"
  | "NOT_SUITABLE"
  | "NOT_IMPORTED";

export type AdsConversionHealthRow = {
  event: AdsHealthEventKey;
  label: string;
  firebase: "PASS" | "AUTO" | "ADDED" | "NOT_EMITTED" | "DATA_NOT_VERIFIED";
  ga4: "DATA_NOT_VERIFIED";
  postgres: "PASS" | "ZERO" | "DATA_NOT_VERIFIED";
  googleAds: "IMPORTED_PRIMARY" | "IMPORTED_SECONDARY" | "IMPORTED_ALL_CONVERSIONS" | "NOT_IMPORTED";
  primarySecondary: string;
  volume7d: number | "DATA_NOT_VERIFIED";
  volume30d: number | "DATA_NOT_VERIFIED";
  uniqueUsers30d: number | "DATA_NOT_VERIFIED";
  repeatRate: number | null | "DATA_NOT_VERIFIED";
  lastSeen: string | "DATA_NOT_VERIFIED" | null;
  adsVolume7d: "DATA_NOT_VERIFIED";
  adsVolume30d: "DATA_NOT_VERIFIED";
  status: AdsHealthStatus;
  recommendedAdsStatus: AdsConversionCatalogRow["recommendedAdsStatus"];
  firebaseEvent: string | null;
  adsConversionActionId: string | null;
};

export type AdsFunnelRate = {
  from: AdsHealthEventKey;
  to: AdsHealthEventKey;
  fromUsers: number;
  toUsers: number;
  ratePct: number | null;
  status: "OK" | "INSUFFICIENT_DATA";
};

export type AdsConversionHealthPayload = {
  generatedAt: string;
  campaignId: "23986249354";
  campaignUntouched: true;
  reportingDelay: {
    eventTime: string;
    adsReportedTime: "DATA_NOT_VERIFIED";
    attributionWindowDays: { click: number; view: number };
    note: string;
  };
  rows: AdsConversionHealthRow[];
  alerts: GrowthAlert[];
  rates: AdsFunnelRate[];
  qualitySignal: {
    event: AdsHealthEventKey | null;
    reason: string;
    enoughData: boolean;
  };
  sources: {
    postgres: "analytics_events";
    firebase: "DATA_NOT_VERIFIED";
    ga4: "DATA_NOT_VERIFIED";
    googleAdsVolumes: "DATA_NOT_VERIFIED";
    revenueCat: "DATA_NOT_VERIFIED";
  };
};

function resolveStatus(
  catalog: AdsConversionCatalogRow,
  users30d: number,
): AdsHealthStatus {
  if (catalog.recommendedAdsStatus === "Not suitable") return "NOT_SUITABLE";
  if (catalog.adsImport === "IMPORTED_PRIMARY" || catalog.adsImport === "IMPORTED_SECONDARY") {
    return "LIVE";
  }
  if (catalog.adsImport === "IMPORTED_ALL_CONVERSIONS") return "LIVE";
  if (catalog.firebaseCodePath === "ADDED" && users30d < MIN_USERS_FOR_QUALITY_SIGNAL) {
    return "TRACKING_ADDED";
  }
  if (users30d >= MIN_USERS_FOR_QUALITY_SIGNAL && catalog.adsImport === "NOT_IMPORTED") {
    return "READY_FOR_IMPORT";
  }
  if (catalog.adsImport === "NOT_IMPORTED" && catalog.firebaseCodePath === "PASS") {
    return users30d >= MIN_USERS_FOR_QUALITY_SIGNAL ? "READY_FOR_IMPORT" : "INSUFFICIENT_DATA";
  }
  if (catalog.adsImport === "NOT_IMPORTED") return "NOT_IMPORTED";
  return "INSUFFICIENT_DATA";
}

function firebaseCell(catalog: AdsConversionCatalogRow): AdsConversionHealthRow["firebase"] {
  if (catalog.firebaseCodePath === "AUTO") return "AUTO";
  if (catalog.firebaseCodePath === "PASS") return "PASS";
  if (catalog.firebaseCodePath === "ADDED") return "ADDED";
  return "NOT_EMITTED";
}

async function queryVolume(catalog: AdsConversionCatalogRow): Promise<AdsHealthVolumeRow> {
  const match = sql.raw(catalog.analyticsEventSql);
  const res = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE server_ts >= now() - interval '7 days')::int AS events_7d,
      count(*) FILTER (WHERE server_ts >= now() - interval '30 days')::int AS events_30d,
      count(DISTINCT user_id) FILTER (WHERE server_ts >= now() - interval '7 days')::int AS users_7d,
      count(DISTINCT user_id) FILTER (WHERE server_ts >= now() - interval '30 days')::int AS users_30d,
      count(*) FILTER (
        WHERE server_ts >= now() - interval '14 days'
          AND server_ts < now() - interval '7 days'
      )::int AS events_prior_7d,
      max(server_ts) FILTER (WHERE server_ts >= now() - interval '30 days') AS last_seen
    FROM analytics_events
    WHERE ${match}
      AND ${ANALYTICS_NOISE_FILTER}
  `);
  const row = (res.rows[0] ?? {}) as Record<string, unknown>;
  let duplicatePurchaseGroups = 0;
  if (catalog.key === "purchase") {
    const dup = await db.execute(sql`
      SELECT count(*)::int AS groups
      FROM (
        SELECT user_id, props->>'transaction_id' AS tx
        FROM analytics_events
        WHERE event_name = 'upgrade_completed'
          AND props->>'transaction_id' IS NOT NULL
          AND props->>'transaction_id' <> ''
          AND server_ts >= now() - interval '7 days'
          AND ${ANALYTICS_NOISE_FILTER}
        GROUP BY user_id, props->>'transaction_id'
        HAVING count(*) > 1
      ) d
    `);
    duplicatePurchaseGroups = rowNum((dup.rows[0] ?? {}) as Record<string, unknown>, "groups");
  }
  const lastSeenRaw = row.last_seen;
  return {
    key: catalog.key,
    events7d: rowNum(row, "events_7d"),
    events30d: rowNum(row, "events_30d"),
    users7d: rowNum(row, "users_7d"),
    users30d: rowNum(row, "users_30d"),
    eventsPrior7d: rowNum(row, "events_prior_7d"),
    lastSeen: lastSeenRaw instanceof Date ? lastSeenRaw.toISOString() : lastSeenRaw ? String(lastSeenRaw) : null,
    duplicatePurchaseGroups,
  };
}

function rate(
  from: AdsHealthVolumeRow | undefined,
  to: AdsHealthVolumeRow | undefined,
  fromKey: AdsHealthEventKey,
  toKey: AdsHealthEventKey,
): AdsFunnelRate {
  const fromUsers = from?.users30d ?? 0;
  const toUsers = to?.users30d ?? 0;
  const enough = fromUsers >= MIN_USERS_FOR_QUALITY_SIGNAL;
  return {
    from: fromKey,
    to: toKey,
    fromUsers,
    toUsers,
    ratePct: enough ? pctRate(toUsers, fromUsers) : null,
    status: enough ? "OK" : "INSUFFICIENT_DATA",
  };
}

export async function computeAdsConversionHealth(): Promise<AdsConversionHealthPayload> {
  const volumes = await Promise.all(ADS_CONVERSION_CATALOG.map((row) => queryVolume(row)));
  const byKey = new Map(volumes.map((v) => [v.key, v]));
  const alerts = buildAdsConversionAlerts(volumes);

  const rows: AdsConversionHealthRow[] = ADS_CONVERSION_CATALOG.map((catalog) => {
    const vol = byKey.get(catalog.key)!;
    const repeatRate =
      vol.users30d > 0 ? Math.round((vol.events30d / vol.users30d) * 10) / 10 : null;
    return {
      event: catalog.key,
      label: catalog.label,
      firebase: firebaseCell(catalog),
      ga4: "DATA_NOT_VERIFIED",
      postgres: vol.events30d > 0 ? "PASS" : "ZERO",
      googleAds: catalog.adsImport,
      primarySecondary: catalog.adsPrimarySecondary,
      volume7d: vol.events7d,
      volume30d: vol.events30d,
      uniqueUsers30d: vol.users30d,
      repeatRate,
      lastSeen: vol.lastSeen,
      adsVolume7d: "DATA_NOT_VERIFIED",
      adsVolume30d: "DATA_NOT_VERIFIED",
      status: resolveStatus(catalog, vol.users30d),
      recommendedAdsStatus: catalog.recommendedAdsStatus,
      firebaseEvent: catalog.firebaseEvent,
      adsConversionActionId: catalog.adsConversionActionId,
    };
  });

  const install = byKey.get("play_install");
  const signup = byKey.get("signup_completed");
  const routine = byKey.get("routine_generated");
  const firstPlan = byKey.get("first_plan_generated");
  const trial = byKey.get("trial_started");
  const checkout = byKey.get("begin_checkout");
  const purchase = byKey.get("purchase");

  const rates: AdsFunnelRate[] = [
    rate(install, signup, "play_install", "signup_completed"),
    rate(install, routine, "play_install", "routine_generated"),
    rate(install, trial, "play_install", "trial_started"),
    rate(install, checkout, "play_install", "begin_checkout"),
    rate(install, purchase, "play_install", "purchase"),
    rate(signup, trial, "signup_completed", "trial_started"),
    rate(routine ?? firstPlan, trial, "routine_generated", "trial_started"),
    rate(trial, purchase, "trial_started", "purchase"),
    rate(checkout, purchase, "begin_checkout", "purchase"),
  ];

  return {
    generatedAt: new Date().toISOString(),
    campaignId: "23986249354",
    campaignUntouched: true,
    reportingDelay: {
      eventTime: "client + server analytics_events.server_ts",
      adsReportedTime: "DATA_NOT_VERIFIED",
      attributionWindowDays: { click: 30, view: 1 },
      note: "Firebase app conversions often appear in Google Ads 3–24 hours later. Play installs can take up to 24 hours. Do not treat a conversion as missing immediately after the product event.",
    },
    rows,
    alerts,
    rates,
    qualitySignal: recommendQualitySignal(volumes),
    sources: {
      postgres: "analytics_events",
      firebase: "DATA_NOT_VERIFIED",
      ga4: "DATA_NOT_VERIFIED",
      googleAdsVolumes: "DATA_NOT_VERIFIED",
      revenueCat: "DATA_NOT_VERIFIED",
    },
  };
}

export { ADS_CONVERSION_CATALOG };
export type { AdsHealthEventKey };
