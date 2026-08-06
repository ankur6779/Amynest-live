import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  compareDomains,
  domainHealth,
  freezeDomain,
  resolveProblem,
  validateDomain,
  type DomainDefinition,
  type ProblemDefinition,
} from "./index";

function sampleDomain(): DomainDefinition {
  const problem: ProblemDefinition = freezeDomain({
    subdomainId: "sample_problem",
    problemId: "sample.problem.sample_problem",
    contentIds: ["content.sample.sample_problem.v1"],
    coachJourneyId: "amy_coach_sample.sample_problem",
    askAmyContextId: "ask_amy_sample.sample_problem",
    childActivityId: "for_child_sample.sample_problem",
  });

  return freezeDomain({
    experienceId: "sample_support",
    domainVersion: "amy_sample_domain.v1",
    subdomainIds: ["sample_problem"],
    subdomains: [problem],
    surfaces: {
      today: {
        surfaceId: "today",
        role: "sample_card",
        surfaceSlotId: "v2-today-sample",
        bindingId: "sample_today",
      },
      amyCoach: {
        surfaceId: "amy_coach",
        role: "sample_journey",
        surfaceSlotId: "amy_coach_sample_journey",
        bindingId: "sample_coach",
      },
      askAmy: {
        surfaceId: "ask_amy",
        role: "sample_context",
        surfaceSlotId: "ask_amy_sample_context",
        bindingId: "sample_ask",
      },
      forChild: {
        surfaceId: "for_child",
        role: "sample_activities",
        surfaceSlotId: "for_child_sample_activities",
        bindingId: "sample_child",
      },
    },
  });
}

describe("Parenting Domain SDK (Phase 1.3)", () => {
  it("resolveProblem by subdomainId and problemId", () => {
    const domain = sampleDomain();
    const bySub = resolveProblem(domain, "sample_problem");
    expect(bySub?.experienceId).toBe("sample_support");
    expect(bySub?.problemId).toBe("sample.problem.sample_problem");
    expect(bySub?.surfaces.today).toBe("v2-today-sample");

    const byProblem = resolveProblem(
      domain,
      "sample.problem.sample_problem",
    );
    expect(byProblem?.subdomain.subdomainId).toBe("sample_problem");
    expect(resolveProblem(domain, "missing")).toBeNull();
  });

  it("validateDomain", () => {
    const domain = sampleDomain();
    expect(validateDomain(domain).ok).toBe(true);
    expect(
      validateDomain(domain, {
        expectedExperienceId: "sample_support",
        expectedDomainVersion: "amy_sample_domain.v1",
        expectedSubdomainIds: ["sample_problem"],
        expectedSurfaceSlots: { today: "v2-today-sample" },
      }).ok,
    ).toBe(true);
    expect(
      validateDomain(domain, { expectedExperienceId: "other" }).ok,
    ).toBe(false);
  });

  it("compareDomains + freezeDomain + domainHealth", () => {
    const a = sampleDomain();
    const b = sampleDomain();
    expect(compareDomains(a, b)).toEqual([]);
    expect(Object.isFrozen(a)).toBe(true);

    const health = domainHealth({
      domainVersion: a.domainVersion,
      subdomainCount: a.subdomains.length,
      problemResolves: 2,
      unknownProblemLookups: 1,
    });
    expect(health.subdomainCount).toBe(1);
    expect(health.problemResolves).toBe(2);
    expect(Object.isFrozen(health)).toBe(true);
  });

  it("never imports Brain / Resolver / Template / packs / React", () => {
    const dir = join(__dirname);
    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    );
    for (const file of files) {
      const src = readFileSync(join(dir, file), "utf8");
      expect(src).not.toMatch(/from ["']@\/v2\/amy-brain/);
      expect(src).not.toMatch(/from ["']@\/v2\/amy-decision/);
      expect(src).not.toMatch(/from ["']@\/v2\/experience-resolver/);
      expect(src).not.toMatch(/from ["']@\/v2\/experience-template/);
      expect(src).not.toMatch(/from ["']@\/v2\/experience-packs/);
      expect(src).not.toMatch(/from ["']react["']/);
    }
  });
});
