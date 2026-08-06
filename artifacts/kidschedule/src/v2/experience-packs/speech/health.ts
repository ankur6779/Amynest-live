import { SPEECH_PACK_VERSION } from "./contracts";
import { getSpeechHealthCounters } from "./health-state";
import type { SpeechExperienceHealth } from "./types";

export function getSpeechExperienceHealth(): SpeechExperienceHealth {
  const c = getSpeechHealthCounters();
  return Object.freeze({
    packResolves: c.packResolves,
    surfaceBindings: c.surfaceBindings,
    unknownSurfaceLookups: c.unknownSurfaceLookups,
    packVersion: SPEECH_PACK_VERSION,
  });
}
