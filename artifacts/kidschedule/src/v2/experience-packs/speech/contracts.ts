/**
 * Speech Experience contracts — IDs only.
 * Speech owns surfaces. Surfaces do not own Speech.
 * Never imports Today / Coach / Ask Amy / For Child modules.
 */

export const SPEECH_EXPERIENCE_ID = "speech_mission" as const;
export const SPEECH_EXPERIENCE_VERSION = "v1" as const;
export const SPEECH_SHARED_EXPERIENCE_ID = "speech_daily" as const;

export const SPEECH_PACK_VERSION = "amy_speech_experience_pack.v1" as const;

/** Content identity contract — machine only. */
export type SpeechContentContract = Readonly<{
  contentId: "content.speech_mission.v1";
  contentVersion: typeof SPEECH_EXPERIENCE_VERSION;
  domain: "speech";
  sharedExperienceId: typeof SPEECH_SHARED_EXPERIENCE_ID;
}>;

export const SPEECH_CONTENT_CONTRACT: SpeechContentContract = Object.freeze({
  contentId: "content.speech_mission.v1",
  contentVersion: SPEECH_EXPERIENCE_VERSION,
  domain: "speech",
  sharedExperienceId: SPEECH_SHARED_EXPERIENCE_ID,
});

/** Journey identity contract — machine only. */
export type SpeechJourneyContract = Readonly<{
  journeyId: typeof SPEECH_SHARED_EXPERIENCE_ID;
  journeyVersion: typeof SPEECH_EXPERIENCE_VERSION;
  /** Ordered stage ids — not UI steps. */
  stageIds: ReadonlyArray<string>;
}>;

export const SPEECH_JOURNEY_CONTRACT: SpeechJourneyContract = Object.freeze({
  journeyId: SPEECH_SHARED_EXPERIENCE_ID,
  journeyVersion: SPEECH_EXPERIENCE_VERSION,
  stageIds: Object.freeze([
    "speech_mission_daily",
    "speech_coach_support",
    "speech_guide_context",
    "speech_child_activities",
  ]),
});

export type SpeechSurfaceId =
  | "today"
  | "amy_coach"
  | "ask_amy"
  | "for_child";

/**
 * One surface binding — IDs only.
 * No component imports. No routes executed. No rendering.
 */
export type SpeechSurfaceBinding = Readonly<{
  surfaceId: SpeechSurfaceId;
  /** Role of Speech on this surface. */
  role: string;
  /** Surface card / slot identity (string id only). */
  surfaceSlotId: string;
  /** Optional journey / context / activity set id. */
  bindingId: string;
}>;

/**
 * Speech → surfaces map.
 * Speech owns these bindings; surfaces consume later.
 */
export type SpeechSurfaceMap = Readonly<{
  today: SpeechSurfaceBinding;
  amyCoach: SpeechSurfaceBinding;
  askAmy: SpeechSurfaceBinding;
  forChild: SpeechSurfaceBinding;
}>;

export const SPEECH_SURFACE_MAP: SpeechSurfaceMap = Object.freeze({
  today: Object.freeze({
    surfaceId: "today",
    role: "mission_card",
    surfaceSlotId: "v2-today-mission",
    bindingId: "speech_today_mission",
  }),
  amyCoach: Object.freeze({
    surfaceId: "amy_coach",
    role: "speech_coaching_journey",
    surfaceSlotId: "amy_coach_speech_journey",
    bindingId: "speech_coach_journey",
  }),
  askAmy: Object.freeze({
    surfaceId: "ask_amy",
    role: "speech_guidance_context",
    surfaceSlotId: "ask_amy_speech_context",
    bindingId: "speech_ask_amy_context",
  }),
  forChild: Object.freeze({
    surfaceId: "for_child",
    role: "speech_activities",
    surfaceSlotId: "for_child_speech_activities",
    bindingId: "speech_for_child_activities",
  }),
});
