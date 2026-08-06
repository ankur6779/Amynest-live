/**
 * Shared Experience Resolver (Sprint A10.1).
 * Surface-independent ResolvedExperience objects only.
 * Never imports Today / Coach / Ask Amy / For Child.
 */

export {
  AMY_EXPERIENCE_RESOLVER_VERSION,
  type ExperienceAvailability,
  type ExperiencePremiumState,
  type ExperienceResolverHealth,
  type ExperienceType,
  type ResolveExperienceInput,
  type ResolveExperienceOptions,
  type ResolvedExperience,
  type ResolvedExperienceDiffEntry,
  type ResolvedExperienceValidationIssue,
  type ResolvedExperienceValidationResult,
} from "./types";

export {
  EXPERIENCE_CATALOG,
  lookupStaticExperienceCatalog,
  type ExperienceCatalogEntry,
} from "./catalog";
export { lookupExperienceCatalog } from "./lookup";
export {
  getRegisteredExperienceDefinition,
  registerExperienceDefinition,
} from "./definition-registry";
export { resolveExperience } from "./resolve";
export { validateResolvedExperience } from "./validate";
export { compareResolvedExperiences } from "./compare";
export { getExperienceResolverHealth } from "./health";
export {
  clearExperienceResolverStateForTests,
  getResolvedExperience,
} from "./health-state";
export { isAmyExperienceResolverEnabled } from "./flags";
