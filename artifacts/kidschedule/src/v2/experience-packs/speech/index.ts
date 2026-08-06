/**
 * Speech Experience Pack (Sprint A10.2).
 * One experience · multiple surfaces · IDs only.
 * Speech owns surfaces. No UI. No routing. No execution.
 */

export {
  SPEECH_CONTENT_CONTRACT,
  SPEECH_EXPERIENCE_ID,
  SPEECH_EXPERIENCE_VERSION,
  SPEECH_JOURNEY_CONTRACT,
  SPEECH_PACK_VERSION,
  SPEECH_SHARED_EXPERIENCE_ID,
  SPEECH_SURFACE_MAP,
  type SpeechContentContract,
  type SpeechJourneyContract,
  type SpeechSurfaceBinding,
  type SpeechSurfaceId,
  type SpeechSurfaceMap,
} from "./contracts";

export {
  ensureSpeechExperienceDefinitionRegistered,
  SPEECH_EXPERIENCE_DEFINITION,
  SPEECH_TEMPLATE_EXPERIENCE_DEFINITION,
} from "./definition";

export type {
  ResolveSpeechExperienceOptions,
  SpeechExperienceDiffEntry,
  SpeechExperienceHealth,
  SpeechExperiencePack,
  SpeechExperienceValidationIssue,
  SpeechExperienceValidationResult,
} from "./types";

export {
  getSpeechSurfaceBinding,
  resolveSpeechExperience,
} from "./resolve";
export { validateSpeechExperience } from "./validate";
export { compareSpeechExperience } from "./compare";
export { getSpeechExperienceHealth } from "./health";
export {
  clearSpeechExperiencePackStateForTests,
  getSpeechExperience,
} from "./health-state";
export { isAmySpeechExperiencePackEnabled } from "./flags";
