/**
 * domainHealth — pure health snapshot builder.
 * No ownership. No process-local state.
 */

import { freezeDomain } from "./freeze";
import type { DomainHealth } from "./types";

export type DomainHealthInput = Readonly<{
  domainVersion: string;
  subdomainCount: number;
  problemResolves?: number;
  unknownProblemLookups?: number;
}>;

export function domainHealth(input: DomainHealthInput): DomainHealth {
  return freezeDomain({
    domainVersion: input.domainVersion,
    subdomainCount: input.subdomainCount,
    problemResolves: input.problemResolves ?? 0,
    unknownProblemLookups: input.unknownProblemLookups ?? 0,
  });
}
