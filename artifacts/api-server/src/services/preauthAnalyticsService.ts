/**
 * Pre-authentication analytics ingest — device-scoped events before Firebase
 * sign-in. Uses stable `device:{deviceId}` user ids so install funnels can be
 * measured without waiting for signup.
 */
import {
  ingestAnalyticsEvents,
  type AnalyticsIngestContext,
  type AnalyticsIngestSummary,
  type RawAnalyticsEvent,
} from "./analyticsIngestService";

/** Events allowed before sign-in (install + onboarding spine only). */
export const PREAUTH_ANALYTICS_EVENTS = new Set([
  "first_open",
  "app_open",
  "session_start",
  "session_end",
  "install_source",
  "screen_view",
  "screen_leave",
  "navigation",
  "onboarding_funnel_event",
  "growth_funnel_event",
  "pre_signup_notification_scheduled",
  "pre_signup_notification_delivered",
  "pre_signup_notification_opened",
  "pre_signup_notification_dismissed",
  "pre_signup_signup_started",
  "pre_signup_signup_completed",
  "pre_signup_login_completed",
  "pre_signup_signup_conversion",
  "pre_signup_permission_checked",
  "pre_signup_campaign_blocked",
  "pre_signup_campaign_eligible",
  "pre_signup_native_schedule_result",
]);

const DEVICE_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

export function isValidPreauthDeviceId(deviceId: string): boolean {
  return DEVICE_ID_PATTERN.test(deviceId);
}

export function preauthUserId(deviceId: string): string {
  return `device:${deviceId}`;
}

export function filterPreauthEvents(events: RawAnalyticsEvent[]): {
  allowed: RawAnalyticsEvent[];
  rejected: number;
} {
  const allowed: RawAnalyticsEvent[] = [];
  let rejected = 0;
  for (const ev of events) {
    if (PREAUTH_ANALYTICS_EVENTS.has(ev.name)) {
      allowed.push(ev);
    } else {
      rejected += 1;
    }
  }
  return { allowed, rejected };
}

export async function ingestPreauthAnalyticsEvents(
  events: RawAnalyticsEvent[],
  ctx: Omit<AnalyticsIngestContext, "userId"> & { deviceId: string },
): Promise<AnalyticsIngestSummary & { rejectedPreauthPolicy: number }> {
  const { allowed, rejected } = filterPreauthEvents(events);
  const summary = await ingestAnalyticsEvents(allowed, {
    userId: preauthUserId(ctx.deviceId),
    platform: ctx.platform,
    appVersion: ctx.appVersion,
  });
  return { ...summary, rejectedPreauthPolicy: rejected };
}
