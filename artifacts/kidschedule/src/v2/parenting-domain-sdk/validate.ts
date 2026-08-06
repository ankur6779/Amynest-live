/**
 * validateDomain — shape / ID contract checks for DomainDefinition.
 * Pure. No registry. No ownership.
 */

import { freezeDomain } from "./freeze";
import type {
  DomainDefinition,
  DomainValidationResult,
  ProblemDefinition,
  ValidateDomainOptions,
} from "./types";

function requireNonEmptyId(
  value: unknown,
  path: string,
  issues: { path: string; message: string }[],
): void {
  if (typeof value !== "string" || !value) {
    issues.push({ path, message: "required non-empty id" });
  }
}

function validateProblem(
  value: unknown,
  index: number,
  allowedSubdomainIds: ReadonlyArray<string> | null,
  unknownSubdomainMessage: string,
  issues: { path: string; message: string }[],
): void {
  const path = `subdomains[${index}]`;
  if (!value || typeof value !== "object") {
    issues.push({ path, message: "required object" });
    return;
  }
  const s = value as Partial<ProblemDefinition>;
  requireNonEmptyId(s.subdomainId, `${path}.subdomainId`, issues);
  requireNonEmptyId(s.problemId, `${path}.problemId`, issues);
  if (!Array.isArray(s.contentIds) || s.contentIds.length === 0) {
    issues.push({ path: `${path}.contentIds`, message: "required non-empty" });
  } else {
    s.contentIds.forEach((id, i) => {
      requireNonEmptyId(id, `${path}.contentIds[${i}]`, issues);
    });
  }
  requireNonEmptyId(s.coachJourneyId, `${path}.coachJourneyId`, issues);
  requireNonEmptyId(s.askAmyContextId, `${path}.askAmyContextId`, issues);
  requireNonEmptyId(s.childActivityId, `${path}.childActivityId`, issues);

  if (
    allowedSubdomainIds &&
    typeof s.subdomainId === "string" &&
    !allowedSubdomainIds.includes(s.subdomainId)
  ) {
    issues.push({
      path: `${path}.subdomainId`,
      message: unknownSubdomainMessage,
    });
  }
}

export function validateDomain(
  value: unknown,
  options: ValidateDomainOptions = {},
): DomainValidationResult {
  const issues: { path: string; message: string }[] = [];

  if (!value || typeof value !== "object") {
    return freezeDomain({
      ok: false,
      issues: [{ path: "", message: "must be an object" }],
    });
  }

  const d = value as Partial<DomainDefinition>;

  requireNonEmptyId(d.experienceId, "experienceId", issues);
  requireNonEmptyId(d.domainVersion, "domainVersion", issues);

  if (
    options.expectedExperienceId != null &&
    d.experienceId !== options.expectedExperienceId
  ) {
    issues.push({
      path: "experienceId",
      message: `must be ${options.expectedExperienceId}`,
    });
  }
  if (
    options.expectedDomainVersion != null &&
    d.domainVersion !== options.expectedDomainVersion
  ) {
    issues.push({ path: "domainVersion", message: "unexpected version" });
  }

  const expectedIds = options.expectedSubdomainIds ?? null;
  const unknownSubdomainMessage =
    options.unknownSubdomainMessage ?? "unknown subdomain";

  if (!Array.isArray(d.subdomainIds) || d.subdomainIds.length === 0) {
    issues.push({ path: "subdomainIds", message: "required non-empty" });
  } else if (expectedIds) {
    for (const expected of expectedIds) {
      if (!d.subdomainIds.includes(expected)) {
        issues.push({
          path: "subdomainIds",
          message: `missing ${expected}`,
        });
      }
    }
  }

  if (!Array.isArray(d.subdomains) || d.subdomains.length === 0) {
    issues.push({ path: "subdomains", message: "required non-empty" });
  } else {
    if (expectedIds && d.subdomains.length !== expectedIds.length) {
      issues.push({
        path: "subdomains",
        message: `expected ${expectedIds.length} subdomains`,
      });
    }
    d.subdomains.forEach((sub, i) =>
      validateProblem(sub, i, expectedIds, unknownSubdomainMessage, issues),
    );
  }

  if (!d.surfaces) {
    issues.push({ path: "surfaces", message: "required" });
  } else {
    const slots = options.expectedSurfaceSlots;
    if (slots?.today != null && d.surfaces.today?.surfaceSlotId !== slots.today) {
      issues.push({
        path: "surfaces.today.surfaceSlotId",
        message: `must remain ${slots.today}`,
      });
    }
    if (
      slots?.amyCoach != null &&
      d.surfaces.amyCoach?.surfaceSlotId !== slots.amyCoach
    ) {
      issues.push({
        path: "surfaces.amyCoach.surfaceSlotId",
        message: `must remain ${slots.amyCoach}`,
      });
    }
    if (
      slots?.askAmy != null &&
      d.surfaces.askAmy?.surfaceSlotId !== slots.askAmy
    ) {
      issues.push({
        path: "surfaces.askAmy.surfaceSlotId",
        message: `must remain ${slots.askAmy}`,
      });
    }
    if (
      slots?.forChild != null &&
      d.surfaces.forChild?.surfaceSlotId !== slots.forChild
    ) {
      issues.push({
        path: "surfaces.forChild.surfaceSlotId",
        message: `must remain ${slots.forChild}`,
      });
    }
  }

  return freezeDomain({
    ok: issues.length === 0,
    issues,
  });
}
