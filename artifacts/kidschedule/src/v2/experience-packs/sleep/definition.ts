/**
 * Sleep ExperienceDefinition — pack-owned source of truth.
 * Registered with Experience Resolver (consume only). Never authored in catalog.
 */

import {
  EXPERIENCE_DEFINITION_VERSION,
  type ExperienceDefinition,
} from "@/v2/experience-definition";
import { registerExperienceDefinition } from "@/v2/experience-resolver";
import {
  SLEEP_CAPABILITIES,
  SLEEP_CONTENT_CONTRACT,
  SLEEP_EXPERIENCE_ID,
  SLEEP_EXPERIENCE_VERSION,
  SLEEP_JOURNEY_CONTRACT,
  SLEEP_SHARED_EXPERIENCE_ID,
  SLEEP_SURFACE_MAP,
} from "./contracts";

export const SLEEP_EXPERIENCE_DEFINITION: ExperienceDefinition = Object.freeze({
  definitionVersion: EXPERIENCE_DEFINITION_VERSION,
  experienceId: SLEEP_EXPERIENCE_ID,
  experienceType: "sleep",
  contentId: SLEEP_CONTENT_CONTRACT.contentId,
  journeyId: SLEEP_JOURNEY_CONTRACT.journeyId,
  surfaceBindings: Object.freeze({
    today: SLEEP_SURFACE_MAP.today,
    amyCoach: SLEEP_SURFACE_MAP.amyCoach,
    askAmy: SLEEP_SURFACE_MAP.askAmy,
    forChild: SLEEP_SURFACE_MAP.forChild,
  }),
  premiumState: "supported",
  capabilities: SLEEP_CAPABILITIES,
  metadata: Object.freeze({
    sharedExperienceId: SLEEP_SHARED_EXPERIENCE_ID,
    experienceVersion: SLEEP_EXPERIENCE_VERSION,
    domain: SLEEP_CONTENT_CONTRACT.domain,
    journeyStages: SLEEP_JOURNEY_CONTRACT.stageIds.join(","),
    version: SLEEP_EXPERIENCE_VERSION,
  }),
  version: SLEEP_EXPERIENCE_VERSION,
});

/** Idempotent — safe after test registry clears. */
export function ensureSleepExperienceDefinitionRegistered(): void {
  registerExperienceDefinition(SLEEP_EXPERIENCE_DEFINITION);
}

ensureSleepExperienceDefinitionRegistered();
