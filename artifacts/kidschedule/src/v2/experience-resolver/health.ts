import { getExperienceResolverHealthCounters } from "./health-state";
import {
  AMY_EXPERIENCE_RESOLVER_VERSION,
  type ExperienceResolverHealth,
} from "./types";

export function getExperienceResolverHealth(): ExperienceResolverHealth {
  const c = getExperienceResolverHealthCounters();
  return Object.freeze({
    resolvedExperiences: c.resolvedExperiences,
    missingContent: c.missingContent,
    unknownExperience: c.unknownExperience,
    resolverVersion: AMY_EXPERIENCE_RESOLVER_VERSION,
  });
}
