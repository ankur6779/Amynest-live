/**
 * resolveSleepExperience — Sleep Experience Definition pack.
 * Consumes pack-owned ExperienceDefinition via Resolver registration.
 * Does not modify Template Engine. No UI. No routing. No surface integration.
 */

import { resolveExperience } from "@/v2/experience-resolver";
import {
  SLEEP_CAPABILITIES,
  SLEEP_CONTENT_CONTRACT,
  SLEEP_EXPERIENCE_ID,
  SLEEP_EXPERIENCE_VERSION,
  SLEEP_JOURNEY_CONTRACT,
  SLEEP_PACK_VERSION,
  SLEEP_SHARED_EXPERIENCE_ID,
  SLEEP_SURFACE_MAP,
  type SleepSurfaceBinding,
  type SleepSurfaceId,
} from "./contracts";
import { ensureSleepExperienceDefinitionRegistered } from "./definition";
import { freezeDeep } from "./freeze";
import {
  recordSleepPackHealth,
  recordUnknownSleepContentLookup,
} from "./health-state";
import type {
  ResolveSleepExperienceOptions,
  SleepExperiencePack,
} from "./types";

/**
 * Resolve the Sleep Experience Pack (definition only — reusable later by surfaces).
 */
export function resolveSleepExperience(
  options: ResolveSleepExperienceOptions = {},
): SleepExperiencePack {
  ensureSleepExperienceDefinitionRegistered();
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const record = options.recordHealth ?? true;

  const resolved = resolveExperience(
    {
      experienceId: SLEEP_EXPERIENCE_ID,
      priority: options.priority ?? 1,
      recommendedJourney: SLEEP_SHARED_EXPERIENCE_ID,
      premiumState: "supported",
    },
    { now, recordHealth: false },
  );

  const pack = freezeDeep({
    experienceId: SLEEP_EXPERIENCE_ID,
    experienceVersion: SLEEP_EXPERIENCE_VERSION,
    sharedExperienceId: SLEEP_SHARED_EXPERIENCE_ID,
    experienceType: "sleep",
    packVersion: SLEEP_PACK_VERSION,
    premiumState: "supported",
    capabilities: SLEEP_CAPABILITIES,
    content: SLEEP_CONTENT_CONTRACT,
    journey: SLEEP_JOURNEY_CONTRACT,
    surfaces: SLEEP_SURFACE_MAP,
    resolved,
    metadata: Object.freeze({
      version: SLEEP_EXPERIENCE_VERSION,
      sharedExperienceId: SLEEP_SHARED_EXPERIENCE_ID,
      domain: "sleep",
    }),
    generatedAt,
  }) satisfies SleepExperiencePack;

  if (record) recordSleepPackHealth(pack);
  return pack;
}

/** Look up a known content topic id. Unknown → null + health counter. */
export function getSleepContentTopic(
  topicId: string,
  pack?: SleepExperiencePack | null,
): string | null {
  const source = pack ?? resolveSleepExperience({ recordHealth: false });
  if (source.content.topicIds.includes(topicId)) return topicId;
  recordUnknownSleepContentLookup();
  return null;
}

export function getSleepSurfaceBinding(
  surfaceId: SleepSurfaceId | string,
  pack?: SleepExperiencePack | null,
): SleepSurfaceBinding | null {
  const source = pack ?? resolveSleepExperience({ recordHealth: false });
  switch (surfaceId) {
    case "today":
      return source.surfaces.today;
    case "amy_coach":
      return source.surfaces.amyCoach;
    case "ask_amy":
      return source.surfaces.askAmy;
    case "for_child":
      return source.surfaces.forChild;
    default:
      return null;
  }
}
