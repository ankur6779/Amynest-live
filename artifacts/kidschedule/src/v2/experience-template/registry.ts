/**
 * ExperienceRegistry — definition catalog.
 * Speech registers here; future packs add definitions only.
 */

import { freezeDeep } from "./freeze";
import type { ExperienceDefinition } from "./types";

const definitions = new Map<string, ExperienceDefinition>();

export function registerExperienceDefinition(
  definition: ExperienceDefinition,
): ExperienceDefinition {
  const frozen = freezeDeep(definition);
  definitions.set(frozen.experienceId, frozen);
  return frozen;
}

export function getExperienceDefinition(
  experienceId: string,
): ExperienceDefinition | null {
  return definitions.get(experienceId) ?? null;
}

export function getExperienceRegistry(): ReadonlyArray<ExperienceDefinition> {
  return Object.freeze([...definitions.values()]);
}

export function clearExperienceRegistryForTests(): void {
  definitions.clear();
}
