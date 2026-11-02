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
  "page_view",
  "page_exit",
  "navigation",
  "feature_viewed",
  "feature_started",
  "feature_interaction",
  "feature_completed",
  "feature_abandoned",
  "feature_error",
  "button_click",
  "search_query",
  "scroll_milestone",
  "app_background",
  "app_foreground",
  "session_heartbeat",
  "onboarding_step_completed",
  "first_feature_used",
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
  "game_opened",
  "game_started",
  "game_completed",
  "game_result",
  "game_abandoned",
  "talking_amy_session_started",
  "talking_amy_first_interaction",
  "talking_amy_session_completed",
  "talking_amy_session_abandoned",
  "health_lab_tool_opened",
  "health_lab_assessment_started",
  "health_lab_assessment_completed",
  "nutrition_tool_opened",
  "nutrition_plan_generated",
  "nutrition_plan_saved",
  "infant_action",
  "discovery_completed",
  "learning_activity_started",
  "learning_activity_completed",
  "speech_session_progress",
  "speech_session_abandoned",
  "coloring_activity_started",
  "coloring_activity_completed",
  "coloring_preview_opened",
  "story_opened",
  "video_started",
  "video_completed",
  "worksheet_opened",
  "worksheet_downloaded",
  "worksheet_generation_failed",
  "ask_amy_message_sent",
  "ask_amy_response_received",
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
  "childId",
  "child_id",
  "child_ref",
  "childRef",
  "child_name",
  "childName",
  "diagnosis",
  "medication",
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

type PreauthPersist = typeof ingestAnalyticsEvents;
type PreauthAttribution = typeof recordPreauthAttribution;

let persistPreauthEvents: PreauthPersist = ingestAnalyticsEvents;
let persistPreauthAttribution: PreauthAttribution = recordPreauthAttribution;

/** Test seam. Production callers keep the database implementations. */
export function setPreauthPersistenceForTests(
  persist: PreauthPersist | null,
  attribution: PreauthAttribution | null = null,
): void {
  persistPreauthEvents = persist ?? ingestAnalyticsEvents;
  persistPreauthAttribution = attribution ?? recordPreauthAttribution;
}

export async function ingestPreauthAnalyticsEvents(
  events: RawAnalyticsEvent[],
  ctx: Omit<AnalyticsIngestContext, "userId"> & { deviceId: string },
): Promise<AnalyticsIngestSummary & { rejectedPreauthPolicy: number }> {
  const sanitized = sanitizePreauthEvents(events);
  const { allowed, rejected } = filterPreauthEvents(sanitized);
  const summary = await persistPreauthEvents(allowed, {
    userId: preauthUserId(ctx.deviceId),
    platform: ctx.platform,
    appVersion: ctx.appVersion,
    deviceId: ctx.deviceId,
  });
  void persistPreauthAttribution(ctx.deviceId, allowed);
  return { ...summary, rejectedPreauthPolicy: rejected };
}
