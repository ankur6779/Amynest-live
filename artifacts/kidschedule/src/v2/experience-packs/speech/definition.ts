/**
 * Speech ExperienceDefinition — pack-owned source of truth.
 * Implements shared ExperienceDefinition (definitionVersion).
 * Also registers with Template Engine for createExperience (Speech public API unchanged).
 */

import {
  EXPERIENCE_DEFINITION_VERSION,
  type ExperienceDefinition,
} from "@/v2/experience-definition";
import { registerExperienceDefinition as registerResolverDefinition } from "@/v2/experience-resolver";
import {
  registerExperienceDefinition as registerTemplateDefinition,
  type ExperienceDefinition as TemplateExperienceDefinition,
} from "@/v2/experience-template";
import {
  SPEECH_CONTENT_CONTRACT,
  SPEECH_EXPERIENCE_ID,
  SPEECH_EXPERIENCE_VERSION,
  SPEECH_JOURNEY_CONTRACT,
  SPEECH_SHARED_EXPERIENCE_ID,
  SPEECH_SURFACE_MAP,
} from "./contracts";

export const SPEECH_EXPERIENCE_DEFINITION: ExperienceDefinition = Object.freeze({
  definitionVersion: EXPERIENCE_DEFINITION_VERSION,
  experienceId: SPEECH_EXPERIENCE_ID,
  experienceType: "speech",
  contentId: SPEECH_CONTENT_CONTRACT.contentId,
  journeyId: SPEECH_JOURNEY_CONTRACT.journeyId,
  surfaceBindings: Object.freeze({
    today: SPEECH_SURFACE_MAP.today,
    amyCoach: SPEECH_SURFACE_MAP.amyCoach,
    askAmy: SPEECH_SURFACE_MAP.askAmy,
    forChild: SPEECH_SURFACE_MAP.forChild,
  }),
  premiumState: "none",
  capabilities: Object.freeze([
    "mission",
    "coach_support",
    "guide_context",
    "child_activities",
  ]),
  metadata: Object.freeze({
    sharedExperienceId: SPEECH_SHARED_EXPERIENCE_ID,
    experienceVersion: SPEECH_EXPERIENCE_VERSION,
    domain: SPEECH_CONTENT_CONTRACT.domain,
    journeyStages: SPEECH_JOURNEY_CONTRACT.stageIds.join(","),
  }),
  version: SPEECH_EXPERIENCE_VERSION,
});

/** Template-engine shape (no definitionVersion) — factory compatibility only. */
export const SPEECH_TEMPLATE_EXPERIENCE_DEFINITION: TemplateExperienceDefinition =
  Object.freeze({
    experienceId: SPEECH_EXPERIENCE_DEFINITION.experienceId,
    experienceType: SPEECH_EXPERIENCE_DEFINITION.experienceType,
    contentId: SPEECH_EXPERIENCE_DEFINITION.contentId,
    journeyId: SPEECH_EXPERIENCE_DEFINITION.journeyId,
    surfaceBindings: SPEECH_EXPERIENCE_DEFINITION.surfaceBindings,
    premiumState: SPEECH_EXPERIENCE_DEFINITION.premiumState,
    capabilities: SPEECH_EXPERIENCE_DEFINITION.capabilities,
    metadata: SPEECH_EXPERIENCE_DEFINITION.metadata,
    version: SPEECH_EXPERIENCE_DEFINITION.version,
  });

/** Idempotent — safe after test registry clears. */
export function ensureSpeechExperienceDefinitionRegistered(): void {
  registerResolverDefinition(SPEECH_EXPERIENCE_DEFINITION);
  registerTemplateDefinition(SPEECH_TEMPLATE_EXPERIENCE_DEFINITION);
}

ensureSpeechExperienceDefinitionRegistered();
