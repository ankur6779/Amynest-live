/**
 * resolveSpeechExperience — assemble Speech Experience Pack.
 * Internally uses Experience Template Engine (A10.3).
 * Public Speech APIs unchanged.
 */

import {
  createExperience,
  type ResolvedExperiencePackage,
} from "@/v2/experience-template";
import {
  SPEECH_CONTENT_CONTRACT,
  SPEECH_EXPERIENCE_ID,
  SPEECH_EXPERIENCE_VERSION,
  SPEECH_JOURNEY_CONTRACT,
  SPEECH_PACK_VERSION,
  SPEECH_SHARED_EXPERIENCE_ID,
  type SpeechSurfaceBinding,
  type SpeechSurfaceId,
} from "./contracts";
import {
  ensureSpeechExperienceDefinitionRegistered,
  SPEECH_TEMPLATE_EXPERIENCE_DEFINITION,
} from "./definition";
import { freezeDeep } from "./freeze";
import {
  recordSpeechPackHealth,
  recordUnknownSurfaceLookup,
} from "./health-state";
import type {
  ResolveSpeechExperienceOptions,
  SpeechExperiencePack,
} from "./types";

function toSpeechPack(
  pkg: ResolvedExperiencePackage,
): SpeechExperiencePack {
  return freezeDeep({
    experienceId: SPEECH_EXPERIENCE_ID,
    experienceVersion: SPEECH_EXPERIENCE_VERSION,
    sharedExperienceId: SPEECH_SHARED_EXPERIENCE_ID,
    packVersion: SPEECH_PACK_VERSION,
    content: SPEECH_CONTENT_CONTRACT,
    journey: SPEECH_JOURNEY_CONTRACT,
    surfaces: Object.freeze({
      today: pkg.surfaceBindings.today,
      amyCoach: pkg.surfaceBindings.amyCoach,
      askAmy: pkg.surfaceBindings.askAmy,
      forChild: pkg.surfaceBindings.forChild,
    }),
    resolved: pkg.resolved,
    generatedAt: pkg.generatedAt,
  });
}

/**
 * Resolve the Speech Experience Pack (reusable across surfaces).
 * Public contract identical to A10.2.
 */
export function resolveSpeechExperience(
  options: ResolveSpeechExperienceOptions = {},
): SpeechExperiencePack {
  ensureSpeechExperienceDefinitionRegistered();
  const pkg = createExperience(SPEECH_TEMPLATE_EXPERIENCE_DEFINITION, {
    now: options.now,
    priority: options.priority ?? 1,
    recordHealth: false,
  });

  const pack = toSpeechPack(pkg);

  if (options.recordHealth ?? true) {
    recordSpeechPackHealth(pack);
  }

  return pack;
}

/**
 * Look up a single surface binding from the pack map.
 * Unknown surface ids → null + health counter (never throws).
 */
export function getSpeechSurfaceBinding(
  surfaceId: SpeechSurfaceId | string,
  pack?: SpeechExperiencePack | null,
): SpeechSurfaceBinding | null {
  const source = pack ?? resolveSpeechExperience({ recordHealth: false });
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
      recordUnknownSurfaceLookup();
      return null;
  }
}
