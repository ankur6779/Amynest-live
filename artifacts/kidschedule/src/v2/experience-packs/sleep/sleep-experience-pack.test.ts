import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isV2FlagEnabled } from "@/lib/feature-flags";
import {
  EXPERIENCE_DEFINITION_VERSION,
} from "@/v2/experience-definition";
import {
  EXPERIENCE_CATALOG,
  getRegisteredExperienceDefinition,
} from "@/v2/experience-resolver";
import {
  SLEEP_CONTENT_CONTRACT,
  SLEEP_EXPERIENCE_DEFINITION,
  SLEEP_EXPERIENCE_ID,
  SLEEP_EXPERIENCE_VERSION,
  SLEEP_JOURNEY_CONTRACT,
  SLEEP_PACK_VERSION,
  SLEEP_SHARED_EXPERIENCE_ID,
  SLEEP_SURFACE_MAP,
  clearSleepExperiencePackStateForTests,
  compareSleepExperience,
  getSleepContentTopic,
  getSleepExperience,
  getSleepExperienceHealth,
  getSleepSurfaceBinding,
  isAmySleepExperiencePackEnabled,
  resolveSleepExperience,
  validateSleepExperience,
} from "./index";

const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

describe("Sleep Experience Pack (Phase 1.1)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearSleepExperiencePackStateForTests();
  });

  it("feature flag defaults OFF", () => {
    expect(isV2FlagEnabled("amy_sleep_experience_pack_v2")).toBe(false);
    expect(isAmySleepExperiencePackEnabled()).toBe(false);
  });

  it("Definition validation", () => {
    expect(SLEEP_EXPERIENCE_DEFINITION.definitionVersion).toBe(
      EXPERIENCE_DEFINITION_VERSION,
    );
    expect(SLEEP_EXPERIENCE_DEFINITION.definitionVersion).toBe(
      "experience_definition.v1",
    );
    const pack = resolveSleepExperience({ now: FIXED_NOW });
    expect(pack.experienceId).toBe(SLEEP_EXPERIENCE_ID);
    expect(pack.experienceVersion).toBe(SLEEP_EXPERIENCE_VERSION);
    expect(pack.sharedExperienceId).toBe(SLEEP_SHARED_EXPERIENCE_ID);
    expect(pack.experienceType).toBe("sleep");
    expect(pack.premiumState).toBe("supported");
    expect(pack.content).toEqual(SLEEP_CONTENT_CONTRACT);
    expect(pack.packVersion).toBe(SLEEP_PACK_VERSION);
    expect(validateSleepExperience(pack).ok).toBe(true);
    expect(getRegisteredExperienceDefinition(SLEEP_EXPERIENCE_ID)?.contentId).toBe(
      "content.sleep_support.v1",
    );
  });

  it("Resolver does not own Sleep definition", () => {
    expect(EXPERIENCE_CATALOG).not.toHaveProperty("sleep_support");
    resolveSleepExperience({ now: FIXED_NOW });
    expect(getRegisteredExperienceDefinition("sleep_support")?.experienceId).toBe(
      "sleep_support",
    );
  });

  it("Journey validation", () => {
    const pack = resolveSleepExperience({ now: FIXED_NOW });
    expect(pack.journey.journeyId).toBe(SLEEP_JOURNEY_CONTRACT.journeyId);
    expect(pack.journey.stageIds).toEqual([
      "discover",
      "understand",
      "plan",
      "practice",
      "review",
      "maintain",
    ]);
  });

  it("Surface bindings", () => {
    const pack = resolveSleepExperience({ now: FIXED_NOW });
    expect(pack.surfaces).toEqual(SLEEP_SURFACE_MAP);
    expect(getSleepSurfaceBinding("today", pack)?.surfaceSlotId).toBe(
      "v2-today-sleep",
    );
    expect(getSleepSurfaceBinding("amy_coach", pack)?.surfaceSlotId).toBe(
      "amy_coach_sleep_journey",
    );
    expect(getSleepSurfaceBinding("ask_amy", pack)?.surfaceSlotId).toBe(
      "ask_amy_sleep_context",
    );
    expect(getSleepSurfaceBinding("for_child", pack)?.surfaceSlotId).toBe(
      "for_child_sleep_activities",
    );
  });

  it("Unknown content", () => {
    const pack = resolveSleepExperience({ now: FIXED_NOW });
    expect(getSleepContentTopic("bedtime_resistance", pack)).toBe(
      "bedtime_resistance",
    );
    expect(getSleepContentTopic("not_a_topic", pack)).toBeNull();
    expect(getSleepExperienceHealth().unknownContentLookups).toBe(1);
  });

  it("Readonly", () => {
    const pack = resolveSleepExperience({ now: FIXED_NOW });
    expect(Object.isFrozen(pack)).toBe(true);
    expect(() => {
      (pack as { experienceId: string }).experienceId = "x";
    }).toThrow();
  });

  it("Health", () => {
    resolveSleepExperience({ now: FIXED_NOW });
    resolveSleepExperience({
      now: new Date(FIXED_NOW.getTime() + 1000),
    });
    const health = getSleepExperienceHealth();
    expect(health.packResolves).toBe(2);
    expect(health.surfaceBindings).toBe(8);
    expect(health.packVersion).toBe(SLEEP_PACK_VERSION);
    expect(getSleepExperience()?.experienceId).toBe(SLEEP_EXPERIENCE_ID);
  });

  it("compareSleepExperience ignores generatedAt", () => {
    const a = resolveSleepExperience({
      now: FIXED_NOW,
      recordHealth: false,
    });
    const b = resolveSleepExperience({
      now: new Date(FIXED_NOW.getTime() + 5000),
      recordHealth: false,
    });
    expect(compareSleepExperience(a, b)).toEqual([]);
  });

  it("capabilities match contract", () => {
    const pack = resolveSleepExperience({ now: FIXED_NOW });
    expect(pack.capabilities).toEqual([
      "sleep_guidance",
      "bedtime_routine",
      "night_waking",
      "nap_support",
    ]);
  });

  it("never imports surfaces, React, or Template Engine", () => {
    const dir = join(__dirname);
    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    );
    for (const file of files) {
      const src = readFileSync(join(dir, file), "utf8");
      expect(src).not.toMatch(/from ["']@\/v2\/today/);
      expect(src).not.toMatch(/from ["']@\/v2\/coach-discovery/);
      expect(src).not.toMatch(/from ["']@\/v2\/ask-amy/);
      expect(src).not.toMatch(/from ["']@\/v2\/experience-template/);
      expect(src).not.toMatch(/from ["']react["']/);
    }
  });
});
