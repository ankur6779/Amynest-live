/**
 * Combined experience catalog lookup.
 * Pack-registered Experience Definitions win over static Brain catalog.
 */

import type { ExperienceCatalogEntry } from "./catalog";
import { lookupStaticExperienceCatalog } from "./catalog";
import { lookupPackExperienceCatalog } from "./definition-registry";

/**
 * Resolve catalog facts for an experience id.
 * Ownership: Experience Pack definitions → Resolver (never reverse).
 */
export function lookupExperienceCatalog(
  experienceId: string,
): ExperienceCatalogEntry | null {
  const fromPack = lookupPackExperienceCatalog(experienceId);
  if (fromPack) return fromPack;
  return lookupStaticExperienceCatalog(experienceId);
}
