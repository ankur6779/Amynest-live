/**
 * Pack → Resolver definition consumption.
 * Experience Packs register definitions; catalog never authors pack facts.
 */

import {
  EXPERIENCE_DEFINITION_VERSION,
  type ExperienceDefinition,
} from "@/v2/experience-definition";
import type { ExperienceCatalogEntry } from "./catalog";

const packCatalogEntries = new Map<string, ExperienceCatalogEntry>();
const packDefinitions = new Map<string, ExperienceDefinition>();

function toCatalogEntry(
  definition: ExperienceDefinition,
): ExperienceCatalogEntry {
  return Object.freeze({
    experienceType: definition.experienceType,
    resolvedContentId: definition.contentId,
    recommendedJourney: definition.journeyId,
    featureIds: Object.freeze([] as string[]),
    routeIds: Object.freeze([] as string[]),
    toolIds: Object.freeze([] as string[]),
    availability: "available" as const,
    premiumState: definition.premiumState,
  });
}

/**
 * Consume an Experience Pack definition into the resolver catalog layer.
 * Ownership remains with the pack; resolver only indexes facts.
 */
export function registerExperienceDefinition(
  definition: ExperienceDefinition,
): ExperienceDefinition {
  if (definition.definitionVersion !== EXPERIENCE_DEFINITION_VERSION) {
    throw new Error(
      `Unsupported experience definitionVersion: ${String(definition.definitionVersion)}`,
    );
  }
  const frozen = Object.freeze({ ...definition }) as ExperienceDefinition;
  packDefinitions.set(frozen.experienceId, frozen);
  packCatalogEntries.set(frozen.experienceId, toCatalogEntry(frozen));
  return frozen;
}

export function lookupPackExperienceCatalog(
  experienceId: string,
): ExperienceCatalogEntry | null {
  return packCatalogEntries.get(experienceId) ?? null;
}

export function getRegisteredExperienceDefinition(
  experienceId: string,
): ExperienceDefinition | null {
  return packDefinitions.get(experienceId) ?? null;
}

export function clearExperienceDefinitionRegistryForTests(): void {
  packCatalogEntries.clear();
  packDefinitions.clear();
}
