/**
 * Product-spine helpers shared by ingest and identity stitch.
 * Identity fields are resolved on the server. Client copies are stripped.
 */
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export const PRODUCT_SPINE_SCHEMA_VERSION = "1.1.0";

const SENSITIVE_KEY =
  /^(email|phone|mobile|child_?name|name|message|prompt|transcript|token|jwt|password|authorization|firebase_?token|id_token|access_token|refresh_token|card|cvv|pan|diagnosis|medication|conversation|question|answer|content)$/i;

const CLIENT_IDENTITY_KEYS = new Set([
  "user_id",
  "userId",
  "firebase_uid",
  "firebaseUid",
  "canonical_user_id",
  "canonicalUserId",
  "app_user_id",
  "appUserId",
  "revenuecat_id",
  "rc_app_user_id",
]);

/** Props copied onto columns and kept in JSONB. Not identity authority. */
export const SPINE_ALLOWLIST = [
  "page_name",
  "page_path",
  "previous_page",
  "next_page",
  "referrer_page",
  "route_transition_id",
  "feature_name",
  "page_visit_id",
  "page_duration_ms",
  "active_duration_ms",
  "time_on_screen_ms",
  "interaction_type",
  "install_source",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "campaign_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "first_touch_at",
  "last_touch_source",
  "last_touch_medium",
  "last_touch_campaign",
  "last_touch_campaign_id",
  "last_touch_gclid",
  "last_touch_gbraid",
  "last_touch_wbraid",
  "last_touch_at",
  "attribution_status",
  "network_type",
  "event_schema_version",
  "os_version",
  "device_model",
  "webview_version",
  "app_build",
  "device_id",
  "anonymous_device_id",
  "installation_id",
  "session_id",
  "route",
  "screen",
  "path",
  "event_id",
] as const;

const PURCHASE_EVENTS = new Set([
  "purchase_success",
  "upgrade_completed",
  "subscription_active",
  "subscription_cancelled",
]);

let spineColumnsCache: boolean | null = null;

export function resetAnalyticsSpineColumnCache(): void {
  spineColumnsCache = null;
}

export async function analyticsSpineColumnsReady(): Promise<boolean> {
  if (spineColumnsCache !== null) return spineColumnsCache;
  try {
    const res = await db.execute(sql`
      SELECT 1 AS ok
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'analytics_events'
        AND column_name = 'event_id'
      LIMIT 1
    `);
    spineColumnsCache = res.rows.length > 0;
  } catch {
    spineColumnsCache = false;
  }
  return spineColumnsCache;
}

function clipString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function clipInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

export function scrubServerAnalyticsProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (SENSITIVE_KEY.test(key) || CLIENT_IDENTITY_KEYS.has(key)) continue;
    if (typeof value === "string") {
      if (value.includes("@") && value.length > 6) continue;
      out[key] = value.slice(0, 512);
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 32);
    } else if (value && typeof value === "object") {
      out[key] = scrubServerAnalyticsProps(value as Record<string, unknown>);
    }
  }
  return out;
}

export function pickSpineProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of SPINE_ALLOWLIST) {
    if (props[key] !== undefined) out[key] = props[key];
  }
  return out;
}

export function textProp(props: Record<string, unknown>, key: string, max = 256): string | null {
  return clipString(props[key], max);
}

export function durationProp(props: Record<string, unknown>): number | null {
  return (
    clipInt(props.page_duration_ms) ??
    clipInt(props.active_duration_ms) ??
    clipInt(props.time_on_screen_ms) ??
    clipInt(props.duration_ms)
  );
}

export type SpineColumnValues = {
  eventId: string | null;
  anonymousDeviceId: string | null;
  canonicalUserId: string | null;
  firebaseUid: string | null;
  pageName: string | null;
  pagePath: string | null;
  previousPage: string | null;
  referrerPage: string | null;
  routeTransitionId: string | null;
  featureName: string | null;
  pageVisitId: string | null;
  pageDurationMs: number | null;
  interactionType: string | null;
  appBuild: string | null;
  osVersion: string | null;
  deviceModel: string | null;
  webviewVersion: string | null;
  installSource: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  campaignId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  attributionStatus: string | null;
  networkType: string | null;
  eventSchemaVersion: string | null;
  ingestionStatus: string;
};

export function spineColumnsFromProps(
  props: Record<string, unknown>,
  identity: {
    userId: string;
    deviceId?: string | null;
    eventId?: string | null;
  },
): SpineColumnValues {
  const authenticated = identity.userId.length > 0 && !identity.userId.startsWith("device:");
  const device =
    clipString(identity.deviceId, 128) ??
    textProp(props, "anonymous_device_id", 128) ??
    textProp(props, "device_id", 128);
  return {
    eventId: clipString(identity.eventId, 64),
    anonymousDeviceId: device,
    canonicalUserId: authenticated ? identity.userId.slice(0, 128) : null,
    firebaseUid: authenticated ? identity.userId.slice(0, 128) : null,
    pageName: textProp(props, "page_name") ?? textProp(props, "screen"),
    pagePath: textProp(props, "page_path", 512) ?? textProp(props, "path", 512),
    previousPage: textProp(props, "previous_page"),
    referrerPage: textProp(props, "referrer_page"),
    routeTransitionId: textProp(props, "route_transition_id", 64),
    featureName: textProp(props, "feature_name", 80) ?? textProp(props, "feature", 80),
    pageVisitId: textProp(props, "page_visit_id", 64),
    pageDurationMs: durationProp(props),
    interactionType: textProp(props, "interaction_type", 64),
    appBuild: textProp(props, "app_build", 32) ?? textProp(props, "build_number", 32),
    osVersion: textProp(props, "os_version", 64) ?? textProp(props, "os", 64),
    deviceModel: textProp(props, "device_model", 64),
    webviewVersion: textProp(props, "webview_version", 64),
    installSource: textProp(props, "install_source", 64),
    gclid: textProp(props, "gclid", 128),
    gbraid: textProp(props, "gbraid", 128),
    wbraid: textProp(props, "wbraid", 128),
    campaignId: textProp(props, "campaign_id", 64),
    utmSource: textProp(props, "utm_source", 128),
    utmMedium: textProp(props, "utm_medium", 128),
    utmCampaign: textProp(props, "utm_campaign", 128),
    attributionStatus: textProp(props, "attribution_status", 64),
    networkType: textProp(props, "network_type", 32),
    eventSchemaVersion:
      textProp(props, "event_schema_version", 16) ?? PRODUCT_SPINE_SCHEMA_VERSION,
    ingestionStatus: "accepted",
  };
}

export function applyServerIdentity(
  props: Record<string, unknown>,
  identity: { userId: string; deviceId?: string | null; eventId?: string | null },
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...props };
  const authenticated = identity.userId.length > 0 && !identity.userId.startsWith("device:");
  if (authenticated) {
    next.canonical_user_id = identity.userId;
    next.firebase_uid = identity.userId;
  } else {
    delete next.canonical_user_id;
    delete next.firebase_uid;
  }
  const device =
    identity.deviceId?.trim() ||
    (typeof next.anonymous_device_id === "string" ? next.anonymous_device_id : "") ||
    (typeof next.device_id === "string" ? next.device_id : "");
  if (device) {
    next.anonymous_device_id = device.slice(0, 128);
    if (!next.device_id) next.device_id = device.slice(0, 128);
  }
  if (identity.eventId) next.event_id = identity.eventId.slice(0, 64);
  if (!next.event_schema_version) next.event_schema_version = PRODUCT_SPINE_SCHEMA_VERSION;
  return next;
}

export function transactionIdOf(props: Record<string, unknown>): string | null {
  return textProp(props, "transaction_id", 128);
}

export function purchaseDedupeKey(
  eventName: string,
  props: Record<string, unknown>,
): string | null {
  const txn = transactionIdOf(props);
  if (!txn) return null;
  if (eventName === "subscription_funnel_event") {
    if (props.step !== "purchase_success") return null;
    return `subscription_funnel_event:purchase_success:${txn}`;
  }
  if (PURCHASE_EVENTS.has(eventName)) return `${eventName}:${txn}`;
  return null;
}

export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  if (code === "23505") return true;
  const message = err instanceof Error ? err.message : String(err);
  return /duplicate key|unique constraint/i.test(message);
}

/**
 * Verified paid acquisition requires a click id.
 * A campaign id or utm source alone is not Google Ads evidence.
 */
export function classifyAcquisition(props: Record<string, unknown>): string {
  const gclid = textProp(props, "gclid", 128);
  const gbraid = textProp(props, "gbraid", 128);
  const wbraid = textProp(props, "wbraid", 128);
  if (gclid || gbraid || wbraid) return "verified_paid";
  const source = (textProp(props, "install_source", 64) ?? "").toLowerCase();
  if (source === "organic" || source === "referral" || source === "play_referrer") return source;
  if (!source || source === "unknown") return "attribution_unknown";
  if (source === "google_ads" || source === "meta_ads") return "attribution_unknown";
  return source;
}
