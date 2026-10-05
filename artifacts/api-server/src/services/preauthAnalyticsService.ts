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
import { recordPreauthAttribution } from "./acquisitionAttributionService";

/** Events allowed before sign-in (install + onboarding + conversion spine). */
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
  "onboarding_started",
  "child_created",
  "onboarding_completed",
  "first_plan_generated",
  "first_plan_action_started",
  "first_plan_action_completed",
  "first_value_achieved",
  "paywall_view",
  "paywall_dismiss",
  "premium_paywall_viewed",
  "subscribe_clicked",
  "checkout_started",
  "upgrade_started",
  "speech_coach_v2_session_start",
  "speech_coach_trial_started",
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

/** Never accept client-owned identity, revenue, or entitlement as truth. */
const STRIP_PREAUTH_PROP_KEYS = new Set([
  "user_id",
  "userId",
  "firebase_uid",
  "firebaseUid",
  "canonical_user_id",
  "canonicalUserId",
  "app_user_id",
  "appUserId",
  "revenue",
  "value",
  "price",
  "amount",
  "currency",
  "subscription_status",
  "entitlement",
  "entitlement_state",
  "revenuecat_id",
  "rc_app_user_id",
]);

export function isValidPreauthDeviceId(deviceId: string): boolean {
  return DEVICE_ID_PATTERN.test(deviceId);
}

export function sanitizePreauthEvents(events: RawAnalyticsEvent[]): RawAnalyticsEvent[] {
  return events.map((ev) => {
    if (!ev.props) return ev;
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(ev.props)) {
      if (STRIP_PREAUTH_PROP_KEYS.has(key)) continue;
      props[key] = value;
    }
    return { ...ev, props };
  });
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
  const sanitized = sanitizePreauthEvents(events);
  const { allowed, rejected } = filterPreauthEvents(sanitized);
  const summary = await ingestAnalyticsEvents(allowed, {
    userId: preauthUserId(ctx.deviceId),
    platform: ctx.platform,
    appVersion: ctx.appVersion,
  });
  void recordPreauthAttribution(ctx.deviceId, allowed);
  return { ...summary, rejectedPreauthPolicy: rejected };
}
