/**
 * Process-local factory health — developer only.
 */

import type { ResolvedExperiencePackage } from "./types";

let createdPackages = 0;
let invalidDefinitions = 0;
let unknownDefinitions = 0;
let lastPackage: ResolvedExperiencePackage | null = null;

export function recordFactoryCreated(pkg: ResolvedExperiencePackage): void {
  createdPackages += 1;
  lastPackage = pkg;
}

export function recordInvalidDefinition(): void {
  invalidDefinitions += 1;
}

export function recordUnknownDefinition(): void {
  unknownDefinitions += 1;
}

export function getLastResolvedPackage(): ResolvedExperiencePackage | null {
  return lastPackage;
}

export function getFactoryHealthCounters(): {
  createdPackages: number;
  invalidDefinitions: number;
  unknownDefinitions: number;
} {
  return { createdPackages, invalidDefinitions, unknownDefinitions };
}

export function clearExperienceFactoryStateForTests(): void {
  createdPackages = 0;
  invalidDefinitions = 0;
  unknownDefinitions = 0;
  lastPackage = null;
}
