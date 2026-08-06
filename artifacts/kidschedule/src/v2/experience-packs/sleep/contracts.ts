/**
 * Sleep Experience contracts — IDs only.
 * Speech is the golden reference. No UI imports. No prompts. No LLM output.
 */

export const SLEEP_EXPERIENCE_ID = "sleep_support" as const;
export const SLEEP_EXPERIENCE_VERSION = "v1" as const;
export const SLEEP_SHARED_EXPERIENCE_ID = "sleep_daily" as const;

export const SLEEP_PACK_VERSION = "amy_sleep_experience_pack.v1" as const;

/** Content identity — IDs only. No generated text. */
export type SleepContentContract = Readonly<{
  contentId: "content.sleep_support.v1";
  contentVersion: typeof SLEEP_EXPERIENCE_VERSION;
  domain: "sleep";
  sharedExperienceId: typeof SLEEP_SHARED_EXPERIENCE_ID;
  /** Content topic ids — not copy. */
  topicIds: ReadonlyArray<string>;
}>;

export const SLEEP_CONTENT_CONTRACT: SleepContentContract = Object.freeze({
  contentId: "content.sleep_support.v1",
  contentVersion: SLEEP_EXPERIENCE_VERSION,
  domain: "sleep",
  sharedExperienceId: SLEEP_SHARED_EXPERIENCE_ID,
  /** Phase 1.2 — Sleep Domain subdomain ids (still sleep_support). */
  topicIds: Object.freeze([
    "bedtime_resistance",
    "night_waking",
    "early_waking",
    "nap_refusal",
    "sleep_regression",
    "routine_building",
    "sleep_anxiety",
    "travel_sleep",
    "transition_to_own_bed",
  ]),
});

/** Journey stages — IDs only. */
export type SleepJourneyContract = Readonly<{
  journeyId: typeof SLEEP_SHARED_EXPERIENCE_ID;
  journeyVersion: typeof SLEEP_EXPERIENCE_VERSION;
  stageIds: ReadonlyArray<string>;
}>;

export const SLEEP_JOURNEY_CONTRACT: SleepJourneyContract = Object.freeze({
  journeyId: SLEEP_SHARED_EXPERIENCE_ID,
  journeyVersion: SLEEP_EXPERIENCE_VERSION,
  stageIds: Object.freeze([
    "discover",
    "understand",
    "plan",
    "practice",
    "review",
    "maintain",
  ]),
});

export type SleepSurfaceId =
  | "today"
  | "amy_coach"
  | "ask_amy"
  | "for_child";

export type SleepSurfaceBinding = Readonly<{
  surfaceId: SleepSurfaceId;
  role: string;
  surfaceSlotId: string;
  bindingId: string;
}>;

export type SleepSurfaceMap = Readonly<{
  today: SleepSurfaceBinding;
  amyCoach: SleepSurfaceBinding;
  askAmy: SleepSurfaceBinding;
  forChild: SleepSurfaceBinding;
}>;

export const SLEEP_SURFACE_MAP: SleepSurfaceMap = Object.freeze({
  today: Object.freeze({
    surfaceId: "today",
    role: "sleep_card",
    surfaceSlotId: "v2-today-sleep",
    bindingId: "sleep_today_support",
  }),
  amyCoach: Object.freeze({
    surfaceId: "amy_coach",
    role: "sleep_coaching_journey",
    surfaceSlotId: "amy_coach_sleep_journey",
    bindingId: "sleep_coach_journey",
  }),
  askAmy: Object.freeze({
    surfaceId: "ask_amy",
    role: "sleep_guidance_context",
    surfaceSlotId: "ask_amy_sleep_context",
    bindingId: "sleep_ask_amy_context",
  }),
  forChild: Object.freeze({
    surfaceId: "for_child",
    role: "sleep_activities",
    surfaceSlotId: "for_child_sleep_activities",
    bindingId: "sleep_for_child_activities",
  }),
});

export const SLEEP_CAPABILITIES = Object.freeze([
  "sleep_guidance",
  "bedtime_routine",
  "night_waking",
  "nap_support",
] as const);
