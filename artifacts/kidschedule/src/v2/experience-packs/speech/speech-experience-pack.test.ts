import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isV2FlagEnabled } from "@/lib/feature-flags";
import { EXPERIENCE_DEFINITION_VERSION } from "@/v2/experience-definition";
import {
  SPEECH_CONTENT_CONTRACT,
  SPEECH_EXPERIENCE_DEFINITION,
  SPEECH_EXPERIENCE_ID,
  SPEECH_EXPERIENCE_VERSION,
  SPEECH_JOURNEY_CONTRACT,
  SPEECH_PACK_VERSION,
  SPEECH_SHARED_EXPERIENCE_ID,
  SPEECH_SURFACE_MAP,
  clearSpeechExperiencePackStateForTests,
  compareSpeechExperience,
  getSpeechExperience,
  getSpeechExperienceHealth,
  getSpeechSurfaceBinding,
  isAmySpeechExperiencePackEnabled,
  resolveSpeechExperience,
  validateSpeechExperience,
} from "./index";

const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

describe("Speech Experience Pack (Sprint A10.2)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearSpeechExperiencePackStateForTests();
  });

  it("feature flag defaults OFF", () => {
    expect(isV2FlagEnabled("amy_speech_experience_pack_v2")).toBe(false);
    expect(isAmySpeechExperiencePackEnabled()).toBe(false);
  });

  it("implements shared ExperienceDefinition", () => {
    expect(SPEECH_EXPERIENCE_DEFINITION.definitionVersion).toBe(
      EXPERIENCE_DEFINITION_VERSION,
    );
    expect(SPEECH_EXPERIENCE_DEFINITION.definitionVersion).toBe(
      "experience_definition.v1",
    );
    expect(SPEECH_EXPERIENCE_DEFINITION.experienceId).toBe("speech_mission");
  });

  it("resolves Speech pack contract", () => {
    const pack = resolveSpeechExperience({ now: FIXED_NOW });
    expect(pack.experienceId).toBe(SPEECH_EXPERIENCE_ID);
    expect(pack.experienceVersion).toBe(SPEECH_EXPERIENCE_VERSION);
    expect(pack.sharedExperienceId).toBe(SPEECH_SHARED_EXPERIENCE_ID);
    expect(pack.packVersion).toBe(SPEECH_PACK_VERSION);
    expect(pack.content).toEqual(SPEECH_CONTENT_CONTRACT);
    expect(pack.journey.journeyId).toBe(SPEECH_JOURNEY_CONTRACT.journeyId);
    expect(pack.resolved.experienceId).toBe("speech_mission");
    expect(pack.resolved.experienceType).toBe("speech");
    expect(validateSpeechExperience(pack).ok).toBe(true);
  });

  it("Today mapping", () => {
    const pack = resolveSpeechExperience({ now: FIXED_NOW });
    expect(pack.surfaces.today).toEqual(SPEECH_SURFACE_MAP.today);
    expect(pack.surfaces.today.role).toBe("mission_card");
    expect(pack.surfaces.today.surfaceSlotId).toBe("v2-today-mission");
    expect(getSpeechSurfaceBinding("today", pack)?.bindingId).toBe(
      "speech_today_mission",
    );
  });

  it("Coach mapping", () => {
    const pack = resolveSpeechExperience({ now: FIXED_NOW });
    expect(pack.surfaces.amyCoach.role).toBe("speech_coaching_journey");
    expect(pack.surfaces.amyCoach.surfaceId).toBe("amy_coach");
    expect(getSpeechSurfaceBinding("amy_coach", pack)?.bindingId).toBe(
      "speech_coach_journey",
    );
  });

  it("Ask Amy mapping", () => {
    const pack = resolveSpeechExperience({ now: FIXED_NOW });
    expect(pack.surfaces.askAmy.role).toBe("speech_guidance_context");
    expect(pack.surfaces.askAmy.surfaceId).toBe("ask_amy");
    expect(getSpeechSurfaceBinding("ask_amy", pack)?.bindingId).toBe(
      "speech_ask_amy_context",
    );
  });

  it("For Child mapping", () => {
    const pack = resolveSpeechExperience({ now: FIXED_NOW });
    expect(pack.surfaces.forChild.role).toBe("speech_activities");
    expect(pack.surfaces.forChild.surfaceId).toBe("for_child");
    expect(getSpeechSurfaceBinding("for_child", pack)?.bindingId).toBe(
      "speech_for_child_activities",
    );
  });

  it("Unknown mapping", () => {
    const pack = resolveSpeechExperience({ now: FIXED_NOW });
    expect(getSpeechSurfaceBinding("not_a_surface", pack)).toBeNull();
    expect(getSpeechExperienceHealth().unknownSurfaceLookups).toBe(1);
  });

  it("Readonly", () => {
    const pack = resolveSpeechExperience({ now: FIXED_NOW });
    expect(Object.isFrozen(pack)).toBe(true);
    expect(Object.isFrozen(pack.surfaces)).toBe(true);
    expect(() => {
      (pack as { experienceId: string }).experienceId = "x";
    }).toThrow();
  });

  it("Health", () => {
    resolveSpeechExperience({ now: FIXED_NOW });
    resolveSpeechExperience({
      now: new Date(FIXED_NOW.getTime() + 1000),
    });
    getSpeechSurfaceBinding("unknown_x");

    const health = getSpeechExperienceHealth();
    expect(health.packResolves).toBe(2);
    expect(health.surfaceBindings).toBe(8);
    expect(health.unknownSurfaceLookups).toBe(1);
    expect(health.packVersion).toBe(SPEECH_PACK_VERSION);
    expect(getSpeechExperience()?.experienceId).toBe(SPEECH_EXPERIENCE_ID);
  });

  it("compareSpeechExperience ignores generatedAt", () => {
    const a = resolveSpeechExperience({
      now: FIXED_NOW,
      recordHealth: false,
    });
    const b = resolveSpeechExperience({
      now: new Date(FIXED_NOW.getTime() + 5000),
      recordHealth: false,
    });
    expect(compareSpeechExperience(a, b)).toEqual([]);
  });

  it("never imports surface modules or React", () => {
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
    }
  });
});
