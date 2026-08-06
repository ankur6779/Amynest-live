/**
 * Build Firebase Analytics params from a validated V2 record.
 * Propagates version · journey · context. Strips child PII.
 */

import { FORBIDDEN_PII_PAYLOAD_KEYS } from "../../payload-validator";
import type { V2AnalyticsRecord } from "../../types";

export type FirebaseParamValue = string | number;

/** GA4 caps we respect (string values truncated). */
const MAX_PARAM_KEYS = 25;
const MAX_STRING_LEN = 100;

const FORBIDDEN = new Set<string>(FORBIDDEN_PII_PAYLOAD_KEYS);

function sanitizeKey(key: string): string | null {
  const k = key.trim().slice(0, 40);
  if (!k) return null;
  if (FORBIDDEN.has(k)) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(k)) return null;
  return k;
}

function toParamValue(value: unknown): FirebaseParamValue | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    return s.length > MAX_STRING_LEN ? s.slice(0, MAX_STRING_LEN) : s;
  }
  return null;
}

/**
 * Envelope + business payload for DebugView.
 * Never includes child name / free-text worry / email.
 */
export function buildFirebaseParams(
  record: V2AnalyticsRecord,
): Record<string, FirebaseParamValue> {
  const out: Record<string, FirebaseParamValue> = {
    event_version: record.eventVersion,
    layer: record.layer,
    owner: record.owner,
    anonymous_id: record.context.anonymousId,
    session_id: record.context.sessionId,
    platform: record.context.platform,
    analytics_flag: "analytics_v2_core",
    once_key: record.onceKey.slice(0, MAX_STRING_LEN),
  };

  if (record.context.journeyId) {
    out.journey_id = record.context.journeyId;
  }
  if (
    typeof record.context.journeyVersion === "number" &&
    Number.isFinite(record.context.journeyVersion)
  ) {
    out.journey_version = record.context.journeyVersion;
  }
  if (record.context.appVersion) {
    out.app_version = record.context.appVersion;
  }
  if (record.context.accountId) {
    out.user_id = record.context.accountId;
  }

  for (const [rawKey, rawVal] of Object.entries(record.payload)) {
    if (Object.keys(out).length >= MAX_PARAM_KEYS) break;
    const key = sanitizeKey(rawKey);
    if (!key) continue;
    if (key in out) continue;
    const val = toParamValue(rawVal);
    if (val === null) continue;
    out[key] = val;
  }

  return out;
}
