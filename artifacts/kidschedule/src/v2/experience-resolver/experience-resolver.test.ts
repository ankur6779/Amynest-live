import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isV2FlagEnabled } from "@/lib/feature-flags";
import { AMY_EXPERIENCE, AMY_JOURNEY } from "@/v2/amy-decision";
import {
  AMY_EXPERIENCE_RESOLVER_VERSION,
  EXPERIENCE_CATALOG,
  clearExperienceResolverStateForTests,
  compareResolvedExperiences,
  getExperienceResolverHealth,
  getResolvedExperience,
  isAmyExperienceResolverEnabled,
  resolveExperience,
  validateResolvedExperience,
} from "./index";

const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

describe("Shared Experience Resolver (Sprint A10.1)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearExperienceResolverStateForTests();
  });

  it("feature flag defaults OFF", () => {
    expect(isV2FlagEnabled("amy_experience_resolver_v2")).toBe(false);
    expect(isAmyExperienceResolverEnabled()).toBe(false);
  });

  it("Speech", () => {
    const exp = resolveExperience(
      {
        experienceId: AMY_EXPERIENCE.SPEECH_MISSION,
        priority: 1,
      },
      { now: FIXED_NOW },
    );
    expect(exp.experienceType).toBe("speech");
    expect(exp.resolvedContentId).toBe("content.speech_mission.v1");
    expect(exp.recommendedJourney).toBe(AMY_JOURNEY.SPEECH_DAILY);
    expect(exp.recommendedFeatureIds).toContain("speech_coach");
    expect(exp.recommendedRouteIds).toContain("/today/mission");
    expect(exp.availability).toBe("available");
    expect(exp.premiumState).toBe("none");
    expect(exp.unknown).toBe(false);
    expect(exp.missingContent).toBe(false);
    expect(exp.resolverVersion).toBe(AMY_EXPERIENCE_RESOLVER_VERSION);
    expect(validateResolvedExperience(exp).ok).toBe(true);
  });

  it("Coach", () => {
    const exp = resolveExperience(
      {
        experienceId: AMY_EXPERIENCE.AMY_COACH,
        priority: 2,
      },
      { now: FIXED_NOW },
    );
    expect(exp.experienceType).toBe("coach");
    expect(exp.resolvedContentId).toBe("content.amy_coach.v1");
    expect(exp.recommendedJourney).toBe(AMY_JOURNEY.COACH_LONG_TERM);
    expect(exp.recommendedFeatureIds).toEqual(["amy_coach"]);
    expect(exp.premiumState).toBe("eligible");
    expect(validateResolvedExperience(exp).ok).toBe(true);
  });

  it("Ask Amy", () => {
    const exp = resolveExperience(
      {
        experienceId: AMY_EXPERIENCE.ASK_AMY,
        priority: 3,
      },
      { now: FIXED_NOW },
    );
    expect(exp.experienceType).toBe("guide");
    expect(exp.resolvedContentId).toBe("content.ask_amy.v1");
    expect(exp.recommendedJourney).toBe(AMY_JOURNEY.GUIDE_IMMEDIATE);
    expect(exp.recommendedRouteIds).toEqual(["/ask-amy"]);
    expect(exp.premiumState).toBe("none");
  });

  it("Unknown", () => {
    const exp = resolveExperience(
      { experienceId: "not_a_real_experience", priority: 9 },
      { now: FIXED_NOW },
    );
    expect(exp.unknown).toBe(true);
    expect(exp.missingContent).toBe(true);
    expect(exp.experienceType).toBe("unknown");
    expect(exp.resolvedContentId).toBeNull();
    expect(exp.availability).toBe("unknown");
    expect(validateResolvedExperience(exp).ok).toBe(true);
  });

  it("Premium", () => {
    const eligible = resolveExperience(
      { experienceId: AMY_EXPERIENCE.AMY_COACH },
      { now: FIXED_NOW, recordHealth: false },
    );
    expect(eligible.premiumState).toBe("eligible");

    const locked = resolveExperience(
      {
        experienceId: AMY_EXPERIENCE.AMY_COACH,
        premiumState: "locked",
        availability: "limited",
      },
      { now: FIXED_NOW, recordHealth: false },
    );
    expect(locked.premiumState).toBe("locked");
    expect(locked.availability).toBe("limited");

    const unlocked = resolveExperience(
      {
        experienceId: AMY_EXPERIENCE.FOR_CHILD,
        premiumState: "unlocked",
      },
      { now: FIXED_NOW, recordHealth: false },
    );
    expect(unlocked.experienceType).toBe("treasury");
    expect(unlocked.premiumState).toBe("unlocked");
  });

  it("Readonly", () => {
    const exp = resolveExperience(
      { experienceId: AMY_EXPERIENCE.SPEECH_MISSION },
      { now: FIXED_NOW },
    );
    expect(Object.isFrozen(exp)).toBe(true);
    expect(() => {
      (exp as { experienceId: string }).experienceId = "x";
    }).toThrow();
  });

  it("Health + helpers", () => {
    resolveExperience(
      { experienceId: AMY_EXPERIENCE.SPEECH_MISSION },
      { now: FIXED_NOW },
    );
    resolveExperience(
      { experienceId: "ghost_experience" },
      { now: FIXED_NOW },
    );

    const health = getExperienceResolverHealth();
    expect(health.resolvedExperiences).toBe(2);
    expect(health.unknownExperience).toBe(1);
    expect(health.resolverVersion).toBe(AMY_EXPERIENCE_RESOLVER_VERSION);
    expect(getResolvedExperience()?.experienceId).toBe("ghost_experience");
  });

  it("compareResolvedExperiences ignores generatedAt", () => {
    const a = resolveExperience(
      { experienceId: AMY_EXPERIENCE.ASK_AMY, priority: 1 },
      { now: FIXED_NOW, recordHealth: false },
    );
    const b = resolveExperience(
      { experienceId: AMY_EXPERIENCE.ASK_AMY, priority: 1 },
      {
        now: new Date(FIXED_NOW.getTime() + 5000),
        recordHealth: false,
      },
    );
    expect(compareResolvedExperiences(a, b)).toEqual([]);
  });

  it("never imports Today / Coach / Ask Amy / For Child surfaces", () => {
    const dir = join(__dirname);
    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    );
    for (const file of files) {
      const src = readFileSync(join(dir, file), "utf8");
      expect(src).not.toMatch(/from ["']@\/v2\/today/);
      expect(src).not.toMatch(/from ["']@\/v2\/coach-discovery/);
      expect(src).not.toMatch(/from ["']@\/v2\/ask-amy/);
      expect(src).not.toMatch(/TodayPage/);
      expect(src).not.toMatch(/CoachDiscovery/);
      expect(src).not.toMatch(/AskAmyPage/);
      expect(src).not.toMatch(/from ["']react["']/);
      expect(src).not.toMatch(/from ["']@\/v2\/experience-packs/);
    }
  });

  it("static catalog does not own Sleep Experience Definition", () => {
    expect(EXPERIENCE_CATALOG).not.toHaveProperty("sleep_support");
    const src = readFileSync(join(__dirname, "catalog.ts"), "utf8");
    expect(src).not.toMatch(/sleep_support/);
    expect(src).not.toMatch(/content\.sleep_support/);
  });
});
