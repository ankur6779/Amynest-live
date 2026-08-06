/**
 * Parenting Domain SDK — shared types only.
 * Pure contracts. No ownership. No registry. No Brain / Resolver / Template.
 */

/** Surface binding — IDs only. No components. */
export type SurfaceBinding = Readonly<{
  surfaceId: string;
  role: string;
  surfaceSlotId: string;
  bindingId: string;
}>;

/** Journey binding — IDs only. */
export type JourneyBinding = Readonly<{
  journeyId: string;
  journeyVersion?: string;
  stageIds?: ReadonlyArray<string>;
}>;

/**
 * One parenting problem / subdomain — machine IDs only.
 * No text. No prompts. No LLM output.
 */
export type ProblemDefinition = Readonly<{
  subdomainId: string;
  problemId: string;
  contentIds: ReadonlyArray<string>;
  coachJourneyId: string;
  askAmyContextId: string;
  childActivityId: string;
}>;

/** Experience-level surface map — IDs only. */
export type DomainSurfaceMap = Readonly<{
  today: SurfaceBinding;
  amyCoach: SurfaceBinding;
  askAmy: SurfaceBinding;
  forChild: SurfaceBinding;
}>;

/**
 * Parenting domain definition — reusable across Sleep, Tantrums, etc.
 * Still one experienceId; subdomains are not new Experiences.
 */
export type DomainDefinition = Readonly<{
  experienceId: string;
  domainVersion: string;
  subdomainIds: ReadonlyArray<string>;
  subdomains: ReadonlyArray<ProblemDefinition>;
  surfaces: DomainSurfaceMap;
  /** Optional domain-level journey identity. */
  journey?: JourneyBinding;
}>;

/** Resolved problem inside a domain. */
export type ProblemResolution = Readonly<{
  experienceId: string;
  problemId: string;
  subdomain: ProblemDefinition;
  surfaces: Readonly<{
    today: string;
    amyCoach: string;
    askAmy: string;
    forChild: string;
  }>;
}>;

export type DomainValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type DomainValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<DomainValidationIssue>;
}>;

export type DomainDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;

export type DomainHealth = Readonly<{
  problemResolves: number;
  unknownProblemLookups: number;
  subdomainCount: number;
  domainVersion: string;
}>;

export type ValidateDomainOptions = Readonly<{
  /** When set, experienceId must match. */
  expectedExperienceId?: string;
  /** When set, domainVersion must match. */
  expectedDomainVersion?: string;
  /** When set, every listed subdomain id must be present. */
  expectedSubdomainIds?: ReadonlyArray<string>;
  /** When set, surfaceSlotId values must match. */
  expectedSurfaceSlots?: Readonly<{
    today?: string;
    amyCoach?: string;
    askAmy?: string;
    forChild?: string;
  }>;
  /** Override unknown-subdomain issue message (domain-specific). */
  unknownSubdomainMessage?: string;
}>;
