import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateKnowledge } from "@/v2/parenting-knowledge";
import {
  SLEEP_CONTENT_CONTRACT,
  SLEEP_DOMAIN,
  SLEEP_DOMAIN_VERSION,
  SLEEP_EXPERIENCE_ID,
  SLEEP_KNOWLEDGE_BEDTIME_RESISTANCE,
  SLEEP_SUBDOMAIN_IDS,
  SLEEP_SURFACE_MAP,
  getSleepContentTopic,
  getSleepSubdomains,
  resolveSleepProblem,
  validateSleepDomain,
} from "./index";

describe("Sleep Domain (Phase 1.2)", () => {
  it("stays inside sleep_support — no new Experience", () => {
    expect(SLEEP_DOMAIN.experienceId).toBe("sleep_support");
    expect(SLEEP_DOMAIN.experienceId).toBe(SLEEP_EXPERIENCE_ID);
    expect(SLEEP_DOMAIN.domainVersion).toBe(SLEEP_DOMAIN_VERSION);
    expect(SLEEP_DOMAIN.domainVersion).toBe("amy_sleep_domain.v1");
  });

  it("lists all subdomains", () => {
    expect(SLEEP_SUBDOMAIN_IDS).toEqual([
      "bedtime_resistance",
      "night_waking",
      "early_waking",
      "nap_refusal",
      "sleep_regression",
      "routine_building",
      "sleep_anxiety",
      "travel_sleep",
      "transition_to_own_bed",
    ]);
    const subs = getSleepSubdomains();
    expect(subs).toHaveLength(9);
    expect(subs.map((s) => s.subdomainId)).toEqual([...SLEEP_SUBDOMAIN_IDS]);
  });

  it("subdomain contracts are IDs only", () => {
    for (const sub of getSleepSubdomains()) {
      expect(sub.problemId).toBe(`sleep.problem.${sub.subdomainId}`);
      expect(sub.contentIds).toEqual([
        `content.sleep.${sub.subdomainId}.v1`,
      ]);
      expect(sub.coachJourneyId).toBe(
        `amy_coach_sleep.${sub.subdomainId}`,
      );
      expect(sub.askAmyContextId).toBe(
        `ask_amy_sleep.${sub.subdomainId}`,
      );
      expect(sub.childActivityId).toBe(
        `for_child_sleep.${sub.subdomainId}`,
      );
      // No prose / prompt-like payloads on the contract.
      expect(JSON.stringify(sub)).not.toMatch(/help|please|prompt|llm/i);
    }
  });

  it("resolveSleepProblem by subdomainId and problemId", () => {
    const bySub = resolveSleepProblem("night_waking");
    expect(bySub?.experienceId).toBe("sleep_support");
    expect(bySub?.problemId).toBe("sleep.problem.night_waking");
    expect(bySub?.subdomain.coachJourneyId).toBe(
      "amy_coach_sleep.night_waking",
    );
    expect(bySub?.surfaces.today).toBe("v2-today-sleep");
    expect(bySub?.surfaces.amyCoach).toBe("amy_coach_sleep_journey");
    expect(bySub?.surfaces.askAmy).toBe("ask_amy_sleep_context");
    expect(bySub?.surfaces.forChild).toBe("for_child_sleep_activities");

    const byProblem = resolveSleepProblem("sleep.problem.sleep_anxiety");
    expect(byProblem?.subdomain.subdomainId).toBe("sleep_anxiety");

    expect(resolveSleepProblem("not_a_sleep_problem")).toBeNull();
  });

  it("validateSleepDomain", () => {
    expect(validateSleepDomain().ok).toBe(true);
    expect(validateSleepDomain(SLEEP_DOMAIN).ok).toBe(true);
    expect(
      validateSleepDomain({
        ...SLEEP_DOMAIN,
        experienceId: "other_experience",
      }).ok,
    ).toBe(false);
  });

  it("content topicIds include full domain", () => {
    for (const id of SLEEP_SUBDOMAIN_IDS) {
      expect(SLEEP_CONTENT_CONTRACT.topicIds).toContain(id);
      expect(getSleepContentTopic(id)).toBe(id);
    }
  });

  it("surface bindings remain experience-level IDs", () => {
    expect(SLEEP_DOMAIN.surfaces).toEqual(SLEEP_SURFACE_MAP);
  });

  it("does not modify Resolver / Template / Brain modules", () => {
    const resolverCatalog = readFileSync(
      join(__dirname, "../../experience-resolver/catalog.ts"),
      "utf8",
    );
    expect(resolverCatalog).not.toMatch(/sleep_support/);
    expect(resolverCatalog).not.toMatch(/sleep_anxiety/);

    const domainSrc = readFileSync(join(__dirname, "domain.ts"), "utf8");
    expect(domainSrc).not.toMatch(/from ["']@\/v2\/experience-resolver/);
    expect(domainSrc).not.toMatch(/from ["']@\/v2\/experience-template/);
    expect(domainSrc).not.toMatch(/from ["']@\/v2\/amy-brain/);
    expect(domainSrc).not.toMatch(/from ["']@\/v2\/amy-decision/);
  });

  it("uses Parenting Domain SDK under the hood (public APIs unchanged)", () => {
    const resolveSrc = readFileSync(
      join(__dirname, "resolve-problem.ts"),
      "utf8",
    );
    expect(resolveSrc).toMatch(/from ["']@\/v2\/parenting-domain-sdk/);
    expect(resolveSrc).toMatch(/resolveProblem/);
    const validateSrc = readFileSync(
      join(__dirname, "validate-domain.ts"),
      "utf8",
    );
    expect(validateSrc).toMatch(/validateDomain/);
  });

  it("optional Sleep knowledge reference (Phase 2.0)", () => {
    expect(SLEEP_KNOWLEDGE_BEDTIME_RESISTANCE.knowledgeId).toBe(
      "knowledge.sleep.bedtime_resistance.v1",
    );
    expect(SLEEP_KNOWLEDGE_BEDTIME_RESISTANCE.problemId).toBe(
      "sleep.problem.bedtime_resistance",
    );
    expect(validateKnowledge(SLEEP_KNOWLEDGE_BEDTIME_RESISTANCE).ok).toBe(
      true,
    );
    expect(Object.isFrozen(SLEEP_KNOWLEDGE_BEDTIME_RESISTANCE)).toBe(true);
  });
});
