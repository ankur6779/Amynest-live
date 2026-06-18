import { z } from "zod";

/**
 * AmyNest analytics taxonomy — the single source of truth for product
 * analytics events. Imported by BOTH the API server (to validate ingested
 * events) and the web app (to get typed `track()` calls), so the two can
 * never drift.
 *
 * This layer is pure measurement. It lives above the frozen routine engine
 * and MUST NOT feed routine generation.
 *
 * Adding an event:
 *   1. Add a prop schema below.
 *   2. Register it in ANALYTICS_EVENTS with its category.
 *   3. Both client typing and server validation update automatically.
 */

export const ANALYTICS_EVENT_CATEGORIES = [
  "session",
  "routine",
  "feedback",
  "premium",
  "growth",
] as const;

export type AnalyticsEventCategory = (typeof ANALYTICS_EVENT_CATEGORIES)[number];

const routineMode = z.enum(["ai", "rule", "fallback"]);
const routineDateMode = z.enum(["today", "past", "future"]);
const feedbackSignal = z.enum([
  "worked_well",
  "loved_this",
  "too_tiring",
  "skipped",
  "bedtime_smooth",
]);

/**
 * Per-event property schemas. Schemas are intentionally non-strict
 * (unknown/forward-compat keys are allowed) but every *declared* key is
 * type-validated so data-quality checks catch malformed payloads.
 */
const EVENT_PROP_SCHEMAS = {
  // ── session ──────────────────────────────────────────────────────────
  app_open: z.object({
    cold: z.boolean().optional(),
    referrer: z.string().max(256).optional(),
  }),
  session_start: z.object({
    durationSinceLastMs: z.number().int().nonnegative().optional(),
  }),

  // ── routine lifecycle ────────────────────────────────────────────────
  routine_generated: z.object({
    routineId: z.number().int().optional(),
    childId: z.number().int().optional(),
    mode: routineMode.optional(),
    itemCount: z.number().int().nonnegative().optional(),
    source: z.string().max(64).optional(),
  }),
  routine_viewed: z.object({
    routineId: z.number().int().optional(),
    childId: z.number().int().optional(),
    dateMode: routineDateMode.optional(),
    itemCount: z.number().int().nonnegative().optional(),
  }),
  routine_item_completed: z.object({
    routineId: z.number().int().optional(),
    childId: z.number().int().optional(),
    activityKey: z.string().max(160).optional(),
    category: z.string().max(64).optional(),
  }),
  routine_item_skipped: z.object({
    routineId: z.number().int().optional(),
    childId: z.number().int().optional(),
    activityKey: z.string().max(160).optional(),
    category: z.string().max(64).optional(),
  }),

  // ── feedback loop (Priority 1) ───────────────────────────────────────
  routine_feedback_submitted: z.object({
    routineId: z.number().int().optional(),
    childId: z.number().int().optional(),
    signal: feedbackSignal,
    activityKey: z.string().max(160).nullable().optional(),
    scope: z.enum(["routine", "activity"]).optional(),
  }),

  // ── premium funnel ───────────────────────────────────────────────────
  premium_paywall_viewed: z.object({
    source: z.string().max(64).optional(),
  }),
  premium_cta_clicked: z.object({
    source: z.string().max(64).optional(),
  }),

  // ── device limits ──────────────────────────────────────────────────────
  device_registered: z.object({
    platform: z.string().max(32).optional(),
  }),
  device_removed: z.object({
    deviceId: z.string().max(128).optional(),
  }),
  device_limit_reached: z.object({
    limit: z.number().int().positive().optional(),
    activeCount: z.number().int().nonnegative().optional(),
    platform: z.string().max(32).optional(),
  }),
  device_replaced: z.object({
    removedDeviceId: z.string().max(128).optional(),
    platform: z.string().max(32).optional(),
  }),
  device_limit_bypass_attempt: z.object({
    plan: z.string().max(32).optional(),
    activeDeviceCount: z.number().int().nonnegative().optional(),
    attemptedDevicePlatform: z.string().max(32).optional(),
    appVersion: z.string().max(32).nullable().optional(),
    reason: z.enum(["register_rejected", "replace_initiated", "missing_header"]).optional(),
  }),

  // ── growth / ASO ─────────────────────────────────────────────────────
  install_source: z.object({
    source: z.string().max(64).optional(),
    utm_source: z.string().max(128).optional(),
    utm_medium: z.string().max(128).optional(),
    utm_campaign: z.string().max(128).optional(),
    ref: z.string().max(32).optional(),
    landing_path: z.string().max(256).optional(),
    play_referrer: z.string().max(512).optional(),
  }),
  review_prompt_shown: z.object({
    trigger: z.string().max(64).optional(),
  }),
  review_completed: z.object({
    trigger: z.string().max(64).optional(),
  }),
  review_prompt_dismissed: z.object({
    trigger: z.string().max(64).optional(),
    reason: z.string().max(64).optional(),
  }),
  referral_sent: z.object({
    channel: z.string().max(32).optional(),
    code: z.string().max(32).optional(),
  }),
  referral_accepted: z.object({
    code: z.string().max(32).optional(),
  }),
  play_store_click: z.object({
    location: z.string().max(64).optional(),
    page: z.string().max(64).optional(),
    utm_source: z.string().max(128).optional(),
    utm_campaign: z.string().max(128).optional(),
  }),
  premium_conversion: z.object({
    source: z.string().max(64).optional(),
  }),
  growth_milestone_reached: z.object({
    milestone: z.string().max(64).optional(),
    source: z.string().max(64).optional(),
  }),
  streak_updated: z.object({
    streak_days: z.number().int().nonnegative().optional(),
    source: z.string().max(64).optional(),
  }),
  achievement_unlocked: z.object({
    badge: z.string().max(64).optional(),
    label: z.string().max(128).optional(),
    source: z.string().max(64).optional(),
  }),
  onboarding_milestone: z.object({
    milestone: z.string().max(64).optional(),
  }),

  // ── pre-signup re-engagement (native local notifications) ─────────────
  pre_signup_notification_scheduled: z.object({
    variant: z.string().max(8).optional(),
    count: z.number().int().nonnegative().optional(),
    milestones: z.string().max(128).optional(),
    device_id: z.string().max(128).optional(),
    campaign: z.string().max(64).optional(),
  }),
  pre_signup_notification_delivered: z.object({
    variant: z.string().max(8).optional(),
    milestone: z.string().max(32).optional(),
    notification_id: z.string().max(64).optional(),
    source: z.string().max(32).optional(),
    device_id: z.string().max(128).optional(),
    campaign: z.string().max(64).optional(),
  }),
  pre_signup_notification_opened: z.object({
    variant: z.string().max(8).optional(),
    milestone: z.string().max(32).optional(),
    notification_id: z.string().max(64).optional(),
    source: z.string().max(32).optional(),
    device_id: z.string().max(128).optional(),
    campaign: z.string().max(64).optional(),
  }),
  pre_signup_notification_dismissed: z.object({
    variant: z.string().max(8).optional(),
    milestone: z.string().max(32).optional(),
    notification_id: z.string().max(64).optional(),
    source: z.string().max(32).optional(),
    device_id: z.string().max(128).optional(),
    campaign: z.string().max(64).optional(),
  }),
  pre_signup_signup_started: z.object({
    had_attribution: z.boolean().optional(),
    device_id: z.string().max(128).optional(),
    campaign: z.string().max(64).optional(),
  }),
  pre_signup_signup_completed: z.object({
    device_id: z.string().max(128).optional(),
    campaign: z.string().max(64).optional(),
  }),
  pre_signup_login_completed: z.object({
    device_id: z.string().max(128).optional(),
    campaign: z.string().max(64).optional(),
  }),
  pre_signup_signup_conversion: z.object({
    variant: z.string().max(8).optional(),
    milestone: z.string().max(32).optional(),
    notification_id: z.string().max(64).optional(),
    device_id: z.string().max(128).optional(),
    campaign: z.string().max(64).optional(),
  }),

  // ── Speech Coach V2 (Realtime) ─────────────────────────────────────────
  speech_coach_v2_session_start: z.object({
    childId: z.number().int().optional(),
    sessionId: z.string().max(64).optional(),
    ageBand: z.string().max(8).optional(),
  }),
  speech_coach_v2_session_complete: z.object({
    childId: z.number().int().optional(),
    sessionId: z.string().max(64).optional(),
    durationSeconds: z.number().int().nonnegative().optional(),
    starsEarned: z.number().int().nonnegative().optional(),
    phaseReached: z.string().max(64).optional(),
  }),
  speech_coach_v2_daily_limit: z.object({
    childId: z.number().int().optional(),
    isTrial: z.boolean().optional(),
  }),
  speech_coach_v2_reconnect: z.object({
    childId: z.number().int().optional(),
    sessionId: z.string().max(64).optional(),
  }),
  speech_coach_v2_ttfa: z.object({
    childId: z.number().int().optional(),
    sessionId: z.string().max(64).optional(),
    ttfaMs: z.number().int().nonnegative().optional(),
  }),
  speech_coach_trial_started: z.object({
    childId: z.number().int().optional(),
  }),
  speech_coach_trial_limit_hit: z.object({
    childId: z.number().int().optional(),
  }),
  speech_coach_upgrade_shown: z.object({
    childId: z.number().int().optional(),
    source: z.string().max(64).optional(),
  }),
  speech_coach_upgrade_clicked: z.object({
    childId: z.number().int().optional(),
    source: z.string().max(64).optional(),
  }),
  speech_coach_paid_usage: z.object({
    childId: z.number().int().optional(),
  }),
  speech_coach_v2_false_interrupt: z.object({
    childId: z.number().int().optional(),
    sessionId: z.string().max(64).optional(),
    speechDurationMs: z.number().int().nonnegative().optional(),
    amySpeaking: z.boolean().optional(),
  }),
  speech_coach_v2_vad_trigger: z.object({
    childId: z.number().int().optional(),
    sessionId: z.string().max(64).optional(),
    amySpeaking: z.boolean().optional(),
    event: z.enum(["speech_started", "speech_stopped"]).optional(),
    speechDurationMs: z.number().int().nonnegative().optional(),
  }),
  speech_coach_v2_child_speech_detected: z.object({
    childId: z.number().int().optional(),
    sessionId: z.string().max(64).optional(),
    transcriptLength: z.number().int().nonnegative().optional(),
  }),
  speech_coach_v2_token_usage: z.object({
    childId: z.number().int().optional(),
    sessionId: z.string().max(64).optional(),
    inputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    estimatedCostInr: z.number().nonnegative().optional(),
  }),
} as const;

export type AnalyticsEventName = keyof typeof EVENT_PROP_SCHEMAS;

const EVENT_CATEGORY: Record<AnalyticsEventName, AnalyticsEventCategory> = {
  app_open: "session",
  session_start: "session",
  routine_generated: "routine",
  routine_viewed: "routine",
  routine_item_completed: "routine",
  routine_item_skipped: "routine",
  routine_feedback_submitted: "feedback",
  premium_paywall_viewed: "premium",
  premium_cta_clicked: "premium",
  device_registered: "premium",
  device_removed: "premium",
  device_limit_reached: "premium",
  device_replaced: "premium",
  device_limit_bypass_attempt: "premium",
  install_source: "growth",
  review_prompt_shown: "growth",
  review_completed: "growth",
  review_prompt_dismissed: "growth",
  referral_sent: "growth",
  referral_accepted: "growth",
  play_store_click: "growth",
  premium_conversion: "growth",
  growth_milestone_reached: "growth",
  streak_updated: "growth",
  achievement_unlocked: "growth",
  onboarding_milestone: "growth",
  pre_signup_notification_scheduled: "growth",
  pre_signup_notification_delivered: "growth",
  pre_signup_notification_opened: "growth",
  pre_signup_notification_dismissed: "growth",
  pre_signup_signup_started: "growth",
  pre_signup_signup_completed: "growth",
  pre_signup_login_completed: "growth",
  pre_signup_signup_conversion: "growth",
  speech_coach_v2_session_start: "session",
  speech_coach_v2_session_complete: "session",
  speech_coach_v2_daily_limit: "session",
  speech_coach_v2_reconnect: "session",
  speech_coach_v2_ttfa: "session",
  speech_coach_trial_started: "session",
  speech_coach_trial_limit_hit: "session",
  speech_coach_upgrade_shown: "premium",
  speech_coach_upgrade_clicked: "premium",
  speech_coach_paid_usage: "session",
  speech_coach_v2_false_interrupt: "session",
  speech_coach_v2_vad_trigger: "session",
  speech_coach_v2_child_speech_detected: "session",
  speech_coach_v2_token_usage: "session",
};

export const ANALYTICS_EVENT_NAMES = Object.keys(
  EVENT_PROP_SCHEMAS,
) as AnalyticsEventName[];

/** Map of event name → its zod props schema. */
export const ANALYTICS_EVENTS = EVENT_PROP_SCHEMAS;

/** Typed props for a given event, e.g. AnalyticsEventProps<"routine_viewed">. */
export type AnalyticsEventProps<E extends AnalyticsEventName> = z.infer<
  (typeof EVENT_PROP_SCHEMAS)[E]
>;

export function isKnownAnalyticsEvent(
  name: string,
): name is AnalyticsEventName {
  return Object.prototype.hasOwnProperty.call(EVENT_PROP_SCHEMAS, name);
}

export function analyticsEventCategory(
  name: AnalyticsEventName,
): AnalyticsEventCategory {
  return EVENT_CATEGORY[name];
}

export type AnalyticsValidationResult =
  | { valid: true; name: AnalyticsEventName; category: AnalyticsEventCategory; props: Record<string, unknown> }
  | { valid: false; reason: "unknown_event" | "invalid_props"; errors?: string[] };

/**
 * Validate a single event against the taxonomy. Used by the server ingest
 * path to gate writes and by tests. Unknown event names and props that fail
 * their schema are both rejected (and should be counted for data quality).
 */
export function validateAnalyticsEvent(
  name: string,
  props: unknown,
): AnalyticsValidationResult {
  if (!isKnownAnalyticsEvent(name)) {
    return { valid: false, reason: "unknown_event" };
  }
  const schema = EVENT_PROP_SCHEMAS[name];
  const parsed = schema.safeParse(props ?? {});
  if (!parsed.success) {
    return {
      valid: false,
      reason: "invalid_props",
      errors: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
      ),
    };
  }
  return {
    valid: true,
    name,
    category: EVENT_CATEGORY[name],
    props: parsed.data as Record<string, unknown>,
  };
}

/** Max accepted batch size for a single ingest request. */
export const ANALYTICS_MAX_BATCH = 50;
/** Serialized props larger than this (bytes) are rejected as malformed. */
export const ANALYTICS_MAX_PROPS_BYTES = 8_000;
