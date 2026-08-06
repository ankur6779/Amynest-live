/**
 * Sleep Domain — Phase 1.2 (built on Parenting Domain SDK — Phase 1.3).
 * Expands sleep_support into a parenting domain. No new Experience.
 * Subdomain contracts are IDs only. No text. No prompts. No LLM output.
 */

import {
  freezeDomain,
  type DomainDefinition,
  type ProblemDefinition,
  type ProblemResolution,
} from "@/v2/parenting-domain-sdk";
import { SLEEP_EXPERIENCE_ID, SLEEP_SURFACE_MAP } from "./contracts";

/** Canonical subdomain ids inside sleep_support. */
export const SLEEP_SUBDOMAIN_IDS = Object.freeze([
  "bedtime_resistance",
  "night_waking",
  "early_waking",
  "nap_refusal",
  "sleep_regression",
  "routine_building",
  "sleep_anxiety",
  "travel_sleep",
  "transition_to_own_bed",
] as const);

export type SleepSubdomainId = (typeof SLEEP_SUBDOMAIN_IDS)[number];

/**
 * One Sleep problem subdomain — machine IDs only.
 * Compatible with ParentingDomainSDK ProblemDefinition.
 */
export type SleepSubdomainContract = ProblemDefinition &
  Readonly<{
    subdomainId: SleepSubdomainId;
  }>;

function subdomain(subdomainId: SleepSubdomainId): SleepSubdomainContract {
  return freezeDomain({
    subdomainId,
    problemId: `sleep.problem.${subdomainId}`,
    contentIds: [`content.sleep.${subdomainId}.v1`],
    coachJourneyId: `amy_coach_sleep.${subdomainId}`,
    askAmyContextId: `ask_amy_sleep.${subdomainId}`,
    childActivityId: `for_child_sleep.${subdomainId}`,
  });
}

export const SLEEP_SUBDOMAIN_CONTRACTS: Readonly<
  Record<SleepSubdomainId, SleepSubdomainContract>
> = freezeDomain({
  bedtime_resistance: subdomain("bedtime_resistance"),
  night_waking: subdomain("night_waking"),
  early_waking: subdomain("early_waking"),
  nap_refusal: subdomain("nap_refusal"),
  sleep_regression: subdomain("sleep_regression"),
  routine_building: subdomain("routine_building"),
  sleep_anxiety: subdomain("sleep_anxiety"),
  travel_sleep: subdomain("travel_sleep"),
  transition_to_own_bed: subdomain("transition_to_own_bed"),
});

export const SLEEP_DOMAIN_VERSION = "amy_sleep_domain.v1" as const;

/**
 * Sleep Domain — still experienceId sleep_support. No new Experience.
 * Satisfies ParentingDomainSDK DomainDefinition.
 */
export type SleepDomain = DomainDefinition &
  Readonly<{
    experienceId: typeof SLEEP_EXPERIENCE_ID;
    domainVersion: typeof SLEEP_DOMAIN_VERSION;
    subdomainIds: ReadonlyArray<SleepSubdomainId>;
    subdomains: ReadonlyArray<SleepSubdomainContract>;
    surfaces: typeof SLEEP_SURFACE_MAP;
  }>;

export const SLEEP_DOMAIN: SleepDomain = freezeDomain({
  experienceId: SLEEP_EXPERIENCE_ID,
  domainVersion: SLEEP_DOMAIN_VERSION,
  subdomainIds: SLEEP_SUBDOMAIN_IDS,
  subdomains: SLEEP_SUBDOMAIN_IDS.map((id) => SLEEP_SUBDOMAIN_CONTRACTS[id]),
  surfaces: SLEEP_SURFACE_MAP,
});

/** Resolved Sleep problem — subdomain contract scoped to sleep_support. */
export type SleepProblemResolution = ProblemResolution &
  Readonly<{
    experienceId: typeof SLEEP_EXPERIENCE_ID;
    subdomain: SleepSubdomainContract;
  }>;
