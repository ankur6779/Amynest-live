import type { SegmentRemoteConfig } from "./types.js";
import { DEFAULT_SEGMENT_REMOTE_CONFIG } from "./types.js";

function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return fallback;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Server-side notification CRM remote config.
 * Env vars override defaults; future: Firebase RC sync.
 */
export function loadSegmentRemoteConfig(): SegmentRemoteConfig {
  const mode = segmentationMode();
  return {
    ...DEFAULT_SEGMENT_REMOTE_CONFIG,
    enabled: mode !== "off",
    maxNonCriticalPerDay: envInt("NOTIF_SEGMENT_CAP_REGISTERED", 2),
    morningHourLocal: envInt("NOTIF_CRM_MORNING_HOUR", 8),
    eveningHourLocal: envInt("NOTIF_CRM_EVENING_HOUR", 18),
    abVariant: process.env.NOTIF_CRM_AB_VARIANT?.trim() || "control",
  };
}

export type SegmentationMode = "off" | "shadow" | "enforce";

export function segmentationMode(): SegmentationMode {
  const raw = (process.env.NOTIF_SEGMENTATION_ENABLED ?? "false").toLowerCase();
  if (raw === "shadow" || raw === "enforce" || raw === "true") {
    return raw === "true" ? "enforce" : (raw as SegmentationMode);
  }
  return "off";
}

export function preSignupServerFcmEnabled(): boolean {
  return envBool("NOTIF_PRESIGNUP_SERVER_FCM", false);
}

/** Public payload for GET /api/remote-config/notifications */
export function getNotificationsRemoteConfigPayload() {
  const cfg = loadSegmentRemoteConfig();
  return {
    segmentationEnabled: cfg.enabled,
    mode: segmentationMode(),
    maxNonCriticalPerDay: cfg.maxNonCriticalPerDay,
    morningHourLocal: cfg.morningHourLocal,
    eveningHourLocal: cfg.eveningHourLocal,
    journeysEnabled: cfg.journeysEnabled,
    abVariant: cfg.abVariant,
    preSignupServerFcm: preSignupServerFcmEnabled(),
  };
}
