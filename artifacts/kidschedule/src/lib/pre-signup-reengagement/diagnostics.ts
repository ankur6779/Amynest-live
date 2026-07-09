/**
 * Phase A production diagnostics for pre-signup re-engagement.
 * Session-scoped dedupe prevents event spam on visibility / permission churn.
 */

import { track } from "@/lib/analytics";
import { getOrCreateDeviceId } from "@/lib/device-id";
import {
  getWrapperVersion,
  isAmyNestWrapper,
  type NativePushPermission,
} from "@/lib/native-push-bridge";
import { detectDevicePlatform } from "@/lib/device-id";
import { isPreSignupDiagnosticsEnabled } from "@/lib/pre-signup-feature-flags";
import type { PreSignupSegment } from "./types";

const SESSION_DEDUPE_KEY = "amynest:pre_signup_diag_dedupe:v1";

export type PreSignupPermissionSource =
  | "android_push"
  | "browser_notification"
  | "capacitor_local"
  | "unavailable";

export type PreSignupPermissionApi =
  | "AndroidPush.getPermissionStatus"
  | "Notification.permission"
  | "LocalNotifications.checkPermissions"
  | "none";

export type PreSignupBlockReason =
  | "feature_flag_off"
  | "not_wrapper"
  | "authenticated"
  | "signup_completed"
  | "permission_denied"
  | "permission_default"
  | "segment_ineligible"
  | "campaign_expired"
  | "no_pending_milestones"
  | "schedule_failed";

export type PreSignupNativeScheduleResult =
  | "submitted"
  | "skipped_no_bridge"
  | "skipped_permission"
  | "capacitor_scheduled"
  | "capacitor_empty"
  | "capacitor_failed";

export type PreSignupLifecycleState =
  | "disabled"
  | "idle"
  | "checking_permission"
  | "blocked"
  | "eligible"
  | "scheduling"
  | "scheduled"
  | "exited";

export type PreSignupDebugSnapshot = {
  segment: PreSignupSegment | null;
  permissionSource: PreSignupPermissionSource;
  permissionStatus: NativePushPermission | "unknown";
  permissionApiUsed: PreSignupPermissionApi;
  campaignEligible: boolean;
  campaignBlockReason: PreSignupBlockReason | null;
  campaignActive: boolean;
  scheduledNotifications: number;
  nativeScheduleResult: PreSignupNativeScheduleResult | null;
  scheduleFailureReason: string | null;
  pendingAlarmCount: number;
  analyticsQueuePending: number;
  lastDiagnosticEvent: string | null;
  lastDiagnosticAt: string | null;
  featureFlags: { parent: boolean; permNative: boolean; diagnostics: boolean };
  lifecycleState: PreSignupLifecycleState;
  wrapperDetected: boolean;
  platform: string;
  androidApiLevel: number | null;
  wrapperVersion: string | null;
};

let debugSnapshot: PreSignupDebugSnapshot = buildEmptySnapshot();
let lastDiagnosticEvent: string | null = null;
let lastDiagnosticAt: string | null = null;

function buildEmptySnapshot(): PreSignupDebugSnapshot {
  return {
    segment: null,
    permissionSource: "unavailable",
    permissionStatus: "unknown",
    permissionApiUsed: "none",
    campaignEligible: false,
    campaignBlockReason: null,
    campaignActive: false,
    scheduledNotifications: 0,
    nativeScheduleResult: null,
    scheduleFailureReason: null,
    pendingAlarmCount: 0,
    analyticsQueuePending: 0,
    lastDiagnosticEvent: null,
    lastDiagnosticAt: null,
    featureFlags: { parent: false, permNative: false, diagnostics: false },
    lifecycleState: "disabled",
    wrapperDetected: false,
    platform: detectDevicePlatform(),
    androidApiLevel: detectAndroidApiLevel(),
    wrapperVersion: getWrapperVersion(),
  };
}

function readSessionDedupe(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_DEDUPE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeSessionDedupe(keys: Set<string>): void {
  try {
    sessionStorage.setItem(SESSION_DEDUPE_KEY, JSON.stringify([...keys].slice(-100)));
  } catch {
    /* ignore */
  }
}

function shouldEmitOnce(dedupeKey: string): boolean {
  const keys = readSessionDedupe();
  if (keys.has(dedupeKey)) return false;
  keys.add(dedupeKey);
  writeSessionDedupe(keys);
  return true;
}

function baseProps(): Record<string, string | number | boolean | undefined> {
  return {
    device_id: getOrCreateDeviceId(),
    campaign: "pre_signup_reengagement",
    wrapper_version: getWrapperVersion() ?? undefined,
    platform: detectDevicePlatform(),
    android_api_level: detectAndroidApiLevel() ?? undefined,
  };
}

function recordDiagnostic(name: string): void {
  lastDiagnosticEvent = name;
  lastDiagnosticAt = new Date().toISOString();
  debugSnapshot = {
    ...debugSnapshot,
    lastDiagnosticEvent: name,
    lastDiagnosticAt,
  };
}

function emitDiagnostic(
  eventName:
    | "pre_signup_permission_checked"
    | "pre_signup_campaign_blocked"
    | "pre_signup_campaign_eligible"
    | "pre_signup_native_schedule_result",
  props: Record<string, string | number | boolean | undefined>,
  dedupeKey: string,
): void {
  if (!isPreSignupDiagnosticsEnabled()) return;
  if (!shouldEmitOnce(dedupeKey)) return;
  track(eventName, { ...baseProps(), ...props });
  recordDiagnostic(eventName);
}

export function detectAndroidApiLevel(): number | null {
  if (typeof navigator === "undefined") return null;
  const match = navigator.userAgent.match(/Android (\d+)/);
  if (!match) return null;
  const level = Number(match[1]);
  return Number.isFinite(level) ? level : null;
}

export function updatePreSignupDebugSnapshot(
  patch: Partial<PreSignupDebugSnapshot>,
): PreSignupDebugSnapshot {
  debugSnapshot = { ...debugSnapshot, ...patch };
  return debugSnapshot;
}

export function getPreSignupDebugSnapshot(): PreSignupDebugSnapshot {
  return { ...debugSnapshot };
}

export function resetPreSignupDebugSnapshot(): void {
  debugSnapshot = buildEmptySnapshot();
}

export function trackPreSignupPermissionChecked(input: {
  permissionStatus: NativePushPermission | "unknown";
  permissionSource: PreSignupPermissionSource;
  permissionApiUsed: PreSignupPermissionApi;
}): void {
  updatePreSignupDebugSnapshot({
    permissionStatus: input.permissionStatus,
    permissionSource: input.permissionSource,
    permissionApiUsed: input.permissionApiUsed,
    lifecycleState: "checking_permission",
  });
  emitDiagnostic(
    "pre_signup_permission_checked",
    {
      permission_status: input.permissionStatus,
      permission_source: input.permissionSource,
      permission_api_used: input.permissionApiUsed,
    },
    `perm:${input.permissionSource}:${input.permissionStatus}`,
  );
}

export function trackPreSignupCampaignBlocked(reason: PreSignupBlockReason): void {
  updatePreSignupDebugSnapshot({
    campaignEligible: false,
    campaignBlockReason: reason,
    campaignActive: false,
    lifecycleState: "blocked",
  });
  emitDiagnostic(
    "pre_signup_campaign_blocked",
    { block_reason: reason },
    `blocked:${reason}`,
  );
}

export function trackPreSignupCampaignEligible(input: {
  segment: PreSignupSegment;
  scheduledCount: number;
}): void {
  updatePreSignupDebugSnapshot({
    segment: input.segment,
    campaignEligible: true,
    campaignBlockReason: null,
    campaignActive: true,
    scheduledNotifications: input.scheduledCount,
    pendingAlarmCount: input.scheduledCount,
    lifecycleState: "eligible",
  });
  emitDiagnostic(
    "pre_signup_campaign_eligible",
    {
      segment: input.segment,
      scheduled_count: input.scheduledCount,
    },
    `eligible:${input.segment}:${input.scheduledCount}`,
  );
}

export function trackPreSignupNativeScheduleResult(input: {
  result: PreSignupNativeScheduleResult;
  scheduleFailureReason?: string;
  pendingCount: number;
}): void {
  updatePreSignupDebugSnapshot({
    nativeScheduleResult: input.result,
    scheduleFailureReason: input.scheduleFailureReason ?? null,
    pendingAlarmCount: input.pendingCount,
    lifecycleState: input.result === "submitted" || input.result === "capacitor_scheduled"
      ? "scheduled"
      : "scheduling",
  });
  emitDiagnostic(
    "pre_signup_native_schedule_result",
    {
      native_schedule_result: input.result,
      schedule_failure_reason: input.scheduleFailureReason,
      pending_count: input.pendingCount,
    },
    `schedule:${input.result}:${input.pendingCount}`,
  );
}

export function setPreSignupAnalyticsQueuePending(count: number): void {
  updatePreSignupDebugSnapshot({ analyticsQueuePending: count });
}
