/**
 * Parenting Domain SDK (Phase 1.3).
 * Shared reusable utilities for parenting domains.
 * NOT an engine. No ownership. No registry.
 * No Brain / Resolver / Template Engine imports.
 */

export type {
  DomainDefinition,
  DomainDiffEntry,
  DomainHealth,
  DomainSurfaceMap,
  DomainValidationIssue,
  DomainValidationResult,
  JourneyBinding,
  ProblemDefinition,
  ProblemResolution,
  SurfaceBinding,
  ValidateDomainOptions,
} from "./types";

export { resolveProblem } from "./resolve-problem";
export { validateDomain } from "./validate";
export { compareDomains } from "./compare";
export { freezeDomain } from "./freeze";
export { domainHealth, type DomainHealthInput } from "./health";
