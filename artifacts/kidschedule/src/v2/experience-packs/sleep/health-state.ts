import type { SleepExperiencePack } from "./types";

let packResolves = 0;
let surfaceBindings = 0;
let unknownContentLookups = 0;
let lastPack: SleepExperiencePack | null = null;

export function recordSleepPackHealth(pack: SleepExperiencePack): void {
  lastPack = pack;
  packResolves += 1;
  surfaceBindings += 4;
}

export function recordUnknownSleepContentLookup(): void {
  unknownContentLookups += 1;
}

export function getSleepExperience(): SleepExperiencePack | null {
  return lastPack;
}

export function getSleepHealthCounters(): {
  packResolves: number;
  surfaceBindings: number;
  unknownContentLookups: number;
} {
  return { packResolves, surfaceBindings, unknownContentLookups };
}

export function clearSleepExperiencePackStateForTests(): void {
  packResolves = 0;
  surfaceBindings = 0;
  unknownContentLookups = 0;
  lastPack = null;
}
