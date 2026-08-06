/**
 * resolveProblem — look up a problem inside a DomainDefinition.
 * Accepts subdomainId or problemId. Unknown → null. Never throws.
 */

import { freezeDomain } from "./freeze";
import type {
  DomainDefinition,
  ProblemDefinition,
  ProblemResolution,
} from "./types";

function findByProblemId(
  domain: DomainDefinition,
  problemId: string,
): ProblemDefinition | null {
  for (const sub of domain.subdomains) {
    if (sub.problemId === problemId) return sub;
  }
  return null;
}

function findBySubdomainId(
  domain: DomainDefinition,
  subdomainId: string,
): ProblemDefinition | null {
  for (const sub of domain.subdomains) {
    if (sub.subdomainId === subdomainId) return sub;
  }
  return null;
}

export function resolveProblem(
  domain: DomainDefinition,
  problemOrSubdomainId: string,
): ProblemResolution | null {
  const subdomain =
    findBySubdomainId(domain, problemOrSubdomainId) ??
    findByProblemId(domain, problemOrSubdomainId);

  if (!subdomain) return null;

  return freezeDomain({
    experienceId: domain.experienceId,
    problemId: subdomain.problemId,
    subdomain,
    surfaces: {
      today: domain.surfaces.today.surfaceSlotId,
      amyCoach: domain.surfaces.amyCoach.surfaceSlotId,
      askAmy: domain.surfaces.askAmy.surfaceSlotId,
      forChild: domain.surfaces.forChild.surfaceSlotId,
    },
  });
}
