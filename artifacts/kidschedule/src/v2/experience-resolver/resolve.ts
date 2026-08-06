/**
 * resolveExperience — surface-independent experience object builder.
 * Never imports Today / Coach / Ask Amy / For Child.
 * Never renders. Never routes.
 */

import { AMY_JOURNEY } from "@/v2/amy-decision/policy";
import { lookupExperienceCatalog } from "./lookup";
import { freezeDeep } from "./freeze";
import { recordExperienceResolverHealth } from "./health-state";
import {
  AMY_EXPERIENCE_RESOLVER_VERSION,
  type ResolveExperienceInput,
  type ResolveExperienceOptions,
  type ResolvedExperience,
} from "./types";

/**
 * Convert a Brain experience id into a reusable ResolvedExperience.
 * Unknown ids resolve safely with unknown=true — never throws.
 */
export function resolveExperience(
  input: ResolveExperienceInput,
  options: ResolveExperienceOptions = {},
): ResolvedExperience {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const record = options.recordHealth ?? true;
  const priority =
    typeof input.priority === "number" && Number.isFinite(input.priority)
      ? input.priority
      : 0;

  const catalog = lookupExperienceCatalog(input.experienceId);

  let resolved: ResolvedExperience;

  if (!catalog) {
    resolved = freezeDeep({
      experienceId: input.experienceId,
      experienceType: "unknown",
      priority,
      resolvedContentId: null,
      recommendedJourney:
        input.recommendedJourney ?? AMY_JOURNEY.NONE,
      recommendedToolIds: Object.freeze([
        ...(input.recommendedToolIds ?? []),
      ]),
      recommendedFeatureIds: Object.freeze([
        ...(input.recommendedFeatureIds ?? []),
      ]),
      recommendedRouteIds: Object.freeze([
        ...(input.recommendedRouteIds ?? []),
      ]),
      availability: input.availability ?? "unknown",
      premiumState: input.premiumState ?? "unknown",
      resolverVersion: AMY_EXPERIENCE_RESOLVER_VERSION,
      generatedAt,
      unknown: true,
      missingContent: true,
    });
  } else {
    const contentId = catalog.resolvedContentId || null;
    resolved = freezeDeep({
      experienceId: input.experienceId,
      experienceType: catalog.experienceType,
      priority,
      resolvedContentId: contentId,
      recommendedJourney:
        input.recommendedJourney ?? catalog.recommendedJourney,
      recommendedToolIds: Object.freeze([
        ...(input.recommendedToolIds ?? catalog.toolIds),
      ]),
      recommendedFeatureIds: Object.freeze([
        ...(input.recommendedFeatureIds ?? catalog.featureIds),
      ]),
      recommendedRouteIds: Object.freeze([
        ...(input.recommendedRouteIds ?? catalog.routeIds),
      ]),
      availability: input.availability ?? catalog.availability,
      premiumState: input.premiumState ?? catalog.premiumState,
      resolverVersion: AMY_EXPERIENCE_RESOLVER_VERSION,
      generatedAt,
      unknown: false,
      missingContent: contentId == null,
    });
  }

  if (record) recordExperienceResolverHealth(resolved);
  return resolved;
}
