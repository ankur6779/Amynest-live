/**
 * Sleep Experience Pack (Phase 1.1 Definition · Phase 1.2 Domain · Phase 1.3 SDK).
 * Still experienceId sleep_support. No new Experience.
 * Domain helpers reuse Parenting Domain SDK. Public APIs unchanged.
 */

export {
  SLEEP_CAPABILITIES,
  SLEEP_CONTENT_CONTRACT,
  SLEEP_EXPERIENCE_ID,
  SLEEP_EXPERIENCE_VERSION,
  SLEEP_JOURNEY_CONTRACT,
  SLEEP_PACK_VERSION,
  SLEEP_SHARED_EXPERIENCE_ID,
  SLEEP_SURFACE_MAP,
  type SleepContentContract,
  type SleepJourneyContract,
  type SleepSurfaceBinding,
  type SleepSurfaceId,
  type SleepSurfaceMap,
} from "./contracts";

export {
  SLEEP_DOMAIN,
  SLEEP_DOMAIN_VERSION,
  SLEEP_SUBDOMAIN_CONTRACTS,
  SLEEP_SUBDOMAIN_IDS,
  type SleepDomain,
  type SleepProblemResolution,
  type SleepSubdomainContract,
  type SleepSubdomainId,
} from "./domain";

export { SLEEP_KNOWLEDGE_BEDTIME_RESISTANCE } from "./knowledge";

export {
  ensureSleepExperienceDefinitionRegistered,
  SLEEP_EXPERIENCE_DEFINITION,
} from "./definition";

export type {
  ResolveSleepExperienceOptions,
  SleepExperienceDiffEntry,
  SleepExperienceHealth,
  SleepExperiencePack,
  SleepExperienceValidationIssue,
  SleepExperienceValidationResult,
} from "./types";

export {
  getSleepContentTopic,
  getSleepSurfaceBinding,
  resolveSleepExperience,
} from "./resolve";
export {
  getSleepSubdomains,
  resolveSleepProblem,
} from "./resolve-problem";
export { validateSleepExperience } from "./validate";
export { validateSleepDomain } from "./validate-domain";
export { compareSleepExperience } from "./compare";
export { getSleepExperienceHealth } from "./health";
export {
  clearSleepExperiencePackStateForTests,
  getSleepExperience,
} from "./health-state";
export { isAmySleepExperiencePackEnabled } from "./flags";
