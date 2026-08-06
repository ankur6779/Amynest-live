/**
 * Sleep Domain developer APIs — Phase 1.2.
 * Delegates to Parenting Domain SDK. Public APIs unchanged.
 */

import { resolveProblem } from "@/v2/parenting-domain-sdk";
import {
  SLEEP_DOMAIN,
  type SleepProblemResolution,
  type SleepSubdomainContract,
} from "./domain";

/**
 * Resolve a Sleep problem (subdomain) inside sleep_support.
 * Accepts subdomainId or problemId. Unknown → null (never throws).
 */
export function resolveSleepProblem(
  problemOrSubdomainId: string,
): SleepProblemResolution | null {
  const resolved = resolveProblem(SLEEP_DOMAIN, problemOrSubdomainId);
  if (!resolved) return null;
  return resolved as SleepProblemResolution;
}

/** All Sleep subdomains — IDs-only contracts. */
export function getSleepSubdomains(): ReadonlyArray<SleepSubdomainContract> {
  return SLEEP_DOMAIN.subdomains;
}
