/**
 * Process-local experience resolver health — developer only.
 */

import { clearExperienceDefinitionRegistryForTests } from "./definition-registry";
import type { ResolvedExperience } from "./types";

let resolvedExperiences = 0;
let missingContent = 0;
let unknownExperience = 0;
let lastResolved: ResolvedExperience | null = null;

export function recordExperienceResolverHealth(
  experience: ResolvedExperience,
): void {
  lastResolved = experience;
  resolvedExperiences += 1;
  if (experience.missingContent) missingContent += 1;
  if (experience.unknown) unknownExperience += 1;
}

export function getResolvedExperience(): ResolvedExperience | null {
  return lastResolved;
}

export function getExperienceResolverHealthCounters(): {
  resolvedExperiences: number;
  missingContent: number;
  unknownExperience: number;
} {
  return { resolvedExperiences, missingContent, unknownExperience };
}

export function clearExperienceResolverStateForTests(): void {
  resolvedExperiences = 0;
  missingContent = 0;
  unknownExperience = 0;
  lastResolved = null;
  clearExperienceDefinitionRegistryForTests();
}
