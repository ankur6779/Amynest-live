/**
 * Process-local Speech pack health — developer only.
 */

import type { SpeechExperiencePack } from "./types";

let packResolves = 0;
let surfaceBindings = 0;
let unknownSurfaceLookups = 0;
let lastPack: SpeechExperiencePack | null = null;

export function recordSpeechPackHealth(pack: SpeechExperiencePack): void {
  lastPack = pack;
  packResolves += 1;
  surfaceBindings += 4; // today, coach, ask amy, for child
}

export function recordUnknownSurfaceLookup(): void {
  unknownSurfaceLookups += 1;
}

export function getSpeechExperience(): SpeechExperiencePack | null {
  return lastPack;
}

export function getSpeechHealthCounters(): {
  packResolves: number;
  surfaceBindings: number;
  unknownSurfaceLookups: number;
} {
  return { packResolves, surfaceBindings, unknownSurfaceLookups };
}

export function clearSpeechExperiencePackStateForTests(): void {
  packResolves = 0;
  surfaceBindings = 0;
  unknownSurfaceLookups = 0;
  lastPack = null;
}
