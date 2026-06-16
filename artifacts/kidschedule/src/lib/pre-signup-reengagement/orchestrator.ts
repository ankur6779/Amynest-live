import { Capacitor } from "@capacitor/core";
import { assignAbVariant } from "./content";
import {
  trackCampaignScheduled,
  trackPreSignupEvent,
  trackSignupConversionFromNotification,
  flushPendingPreSignupEventsOnSignup,
  handleNativePreSignupAnalyticsEvents,
} from "./analytics";
import {
  cancelPreSignupLocalNotifications,
  canUsePreSignupLocalNotifications,
  initPreSignupLocalNotificationListeners,
  resolvePreSignupNotificationPermission,
  schedulePreSignupLocalNotifications,
} from "./local-notifications";
import {
  milestoneNotificationId,
  buildCampaignSchedule,
  buildScheduleFingerprint,
  isCampaignExpired,
} from "./schedule";
import { evaluatePreSignupSegment, shouldExitPreSignupSegment } from "./segment";
import {
  clearPermissionDeniedExit,
  consumeAttribution,
  peekAttribution,
  persistAbVariant,
  readAbVariant,
  readCampaignState,
  recordFirstOpenIfNeeded,
  readInstallAtMs,
  writeCampaignState,
} from "./storage";
import {
  PRE_SIGNUP_SEGMENT,
  type PreSignupAudienceInput,
  type PreSignupCampaignState,
} from "./types";
import { getOrCreateDeviceId } from "@/lib/device-id";
import {
  getBrowserNotificationPermission,
  isAmyNestWrapper,
} from "@/lib/native-push-bridge";

function allMilestoneIds(): number[] {
  return [
    milestoneNotificationId("day0_2h"),
    milestoneNotificationId("day1"),
    milestoneNotificationId("day2"),
    milestoneNotificationId("day4"),
    milestoneNotificationId("day7"),
  ];
}

function resolveNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return getBrowserNotificationPermission() !== "denied";
}

export async function resolvePreSignupAudienceInput(
  overrides: Partial<PreSignupAudienceInput> = {},
): Promise<PreSignupAudienceInput> {
  const permission = await resolvePreSignupNotificationPermission();
  return {
    appInstalled: overrides.appInstalled ?? isAmyNestWrapper(),
    isAuthenticated: overrides.isAuthenticated ?? false,
    signupCompleted: overrides.signupCompleted ?? false,
    notificationsEnabled: overrides.notificationsEnabled ?? resolveNotificationsEnabled(),
    notificationsGranted: overrides.notificationsGranted ?? permission === "granted",
  };
}

/** @deprecated use resolvePreSignupAudienceInput */
export function buildAudienceInput(
  overrides: Partial<PreSignupAudienceInput> = {},
): PreSignupAudienceInput {
  const perm = getBrowserNotificationPermission();
  return {
    appInstalled: overrides.appInstalled ?? isAmyNestWrapper(),
    isAuthenticated: overrides.isAuthenticated ?? false,
    signupCompleted: overrides.signupCompleted ?? false,
    notificationsEnabled: overrides.notificationsEnabled ?? resolveNotificationsEnabled(),
    notificationsGranted: overrides.notificationsGranted ?? perm === "granted",
  };
}

/** Start or refresh the pre-signup local notification campaign. Idempotent. */
export async function syncPreSignupCampaign(
  audience: PreSignupAudienceInput,
): Promise<void> {
  if (!canUsePreSignupLocalNotifications()) return;

  if (shouldExitPreSignupSegment(audience)) {
    return;
  }

  const permission = await resolvePreSignupNotificationPermission();

  if (permission === "denied") {
    await exitPreSignupCampaign("permission_denied");
    return;
  }

  if (permission !== "granted") {
    return;
  }

  clearPermissionDeniedExit();

  const segment = evaluatePreSignupSegment(audience);
  if (!segment) return;

  await initPreSignupLocalNotificationListeners();

  const now = Date.now();
  const installAtMs = readInstallAtMs() ?? now;
  const firstOpenAtMs = recordFirstOpenIfNeeded(now);

  if (isCampaignExpired(installAtMs, now)) {
    await exitPreSignupCampaign("day7_complete");
    return;
  }

  let variant = readAbVariant();
  if (!variant) {
    variant = assignAbVariant(getOrCreateDeviceId());
    persistAbVariant(variant);
  }

  const existing = readCampaignState();
  const scheduled = buildCampaignSchedule({
    installAtMs,
    firstOpenAtMs,
    variant,
    nowMs: now,
    isAuthenticated: audience.isAuthenticated,
    signupCompleted: audience.signupCompleted,
    existing,
  });

  if (scheduled.length === 0) {
    if (existing?.segment === PRE_SIGNUP_SEGMENT) {
      writeCampaignState({
        ...existing,
        segment: PRE_SIGNUP_SEGMENT,
        completedAtMs: now,
        exitReason: "day7_complete",
      });
    }
    return;
  }

  const state: PreSignupCampaignState = {
    version: 2,
    segment: PRE_SIGNUP_SEGMENT,
    variant,
    installAtMs,
    firstOpenAtMs,
    campaignStartedAtMs: existing?.campaignStartedAtMs ?? now,
    scheduled,
  };

  const nextFingerprint = buildScheduleFingerprint(scheduled);
  const prevFingerprint = existing?.scheduled
    ? buildScheduleFingerprint(existing.scheduled)
    : null;

  writeCampaignState(state);

  if (prevFingerprint === nextFingerprint && existing?.segment === PRE_SIGNUP_SEGMENT) {
    return;
  }

  await cancelPreSignupLocalNotifications(allMilestoneIds());
  const ok = await schedulePreSignupLocalNotifications(scheduled);

  if (ok) {
    trackCampaignScheduled({
      variant,
      count: scheduled.length,
      milestones: scheduled.map((s) => s.milestone),
      fingerprint: nextFingerprint,
    });
  }
}

export async function exitPreSignupCampaign(
  reason: PreSignupCampaignState["exitReason"],
): Promise<void> {
  await cancelPreSignupLocalNotifications(allMilestoneIds());
  const existing = readCampaignState();
  if (existing) {
    writeCampaignState({
      ...existing,
      segment: "EXITED",
      completedAtMs: Date.now(),
      exitReason: reason,
      scheduled: existing.scheduled.map((s) => ({ ...s, status: "cancelled" })),
    });
  }
}

export function onPreSignupSignupStarted(): void {
  trackPreSignupEvent("signup_started", {
    had_attribution: !!peekAttribution(),
  });
}

export function onPreSignupSignupCompleted(): void {
  const attribution = consumeAttribution();
  const now = Date.now();

  trackPreSignupEvent("signup_completed", {});
  flushPendingPreSignupEventsOnSignup();

  if (attribution && now <= attribution.expiresAt) {
    trackSignupConversionFromNotification({
      notificationId: attribution.notificationId,
      milestone: attribution.milestone,
      variant: attribution.variant,
    });
  }

  void exitPreSignupCampaign("signup");
}

export function onPreSignupLoginCompleted(): void {
  trackPreSignupEvent("login_completed", {});
  void exitPreSignupCampaign("login");
}

if (typeof window !== "undefined") {
  window.addEventListener("amynest-pre-signup-native-events", (e: Event) => {
    const detail = (e as CustomEvent<{
      deliveries?: Array<Record<string, unknown>>;
      dismissals?: Array<Record<string, unknown>>;
    }>).detail;
    if (detail) handleNativePreSignupAnalyticsEvents(detail);
  });
}
