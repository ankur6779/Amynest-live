import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isV2FlagEnabled } from "@/lib/feature-flags";
import { SPEECH_TEMPLATE_EXPERIENCE_DEFINITION } from "@/v2/experience-packs/speech/definition";
import {
  resolveSpeechExperience,
  validateSpeechExperience,
} from "@/v2/experience-packs/speech";
import {
  clearExperienceFactoryStateForTests,
  clearExperienceRegistryForTests,
  clearExperienceTemplatesForTests,
  compareExperienceDefinitions,
  createExperience,
  getExperienceFactoryHealth,
  getExperienceRegistry,
  getExperienceTemplate,
  isAmyExperienceTemplateEngineEnabled,
  registerExperienceDefinition,
  validateExperienceDefinition,
  type ExperienceDefinition,
} from "./index";

const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

function sampleDefinition(
  overrides: Partial<ExperienceDefinition> = {},
): ExperienceDefinition {
  return Object.freeze({
    ...SPEECH_TEMPLATE_EXPERIENCE_DEFINITION,
    experienceId: "sample_future_experience",
    experienceType: "speech",
    contentId: "content.sample.v1",
    journeyId: "sample_daily",
    metadata: Object.freeze({
      ...SPEECH_TEMPLATE_EXPERIENCE_DEFINITION.metadata,
    }),
    capabilities: Object.freeze([
      ...SPEECH_TEMPLATE_EXPERIENCE_DEFINITION.capabilities,
    ]),
    surfaceBindings: SPEECH_TEMPLATE_EXPERIENCE_DEFINITION.surfaceBindings,
    ...overrides,
  });
}

describe("Experience Template Engine (Sprint A10.3)", () => {
  beforeEach(() => {
    clearExperienceFactoryStateForTests();
    clearExperienceRegistryForTests();
    clearExperienceTemplatesForTests();
    registerExperienceDefinition(SPEECH_TEMPLATE_EXPERIENCE_DEFINITION);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearExperienceFactoryStateForTests();
    clearExperienceRegistryForTests();
    clearExperienceTemplatesForTests();
    registerExperienceDefinition(SPEECH_TEMPLATE_EXPERIENCE_DEFINITION);
  });

  it("feature flag defaults OFF", () => {
    expect(isV2FlagEnabled("amy_experience_template_engine_v2")).toBe(false);
    expect(isAmyExperienceTemplateEngineEnabled()).toBe(false);
  });

  it("Speech compatibility — public pack unchanged", () => {
    const pack = resolveSpeechExperience({ now: FIXED_NOW });
    expect(pack.experienceId).toBe("speech_mission");
    expect(pack.sharedExperienceId).toBe("speech_daily");
    expect(pack.surfaces.today.surfaceSlotId).toBe("v2-today-mission");
    expect(pack.surfaces.amyCoach.role).toBe("speech_coaching_journey");
    expect(validateSpeechExperience(pack).ok).toBe(true);
  });

  it("Factory createExperience from definition", () => {
    const pkg = createExperience(SPEECH_TEMPLATE_EXPERIENCE_DEFINITION, {
      now: FIXED_NOW,
    });
    expect(pkg.experienceId).toBe("speech_mission");
    expect(pkg.experienceType).toBe("speech");
    expect(pkg.contentId).toBe("content.speech_mission.v1");
    expect(pkg.journeyId).toBe("speech_daily");
    expect(pkg.surfaceBindings.today.role).toBe("mission_card");
    expect(pkg.resolved.experienceType).toBe("speech");
    expect(Object.isFrozen(pkg)).toBe(true);
  });

  it("Factory createExperience by registry id", () => {
    const pkg = createExperience("speech_mission", { now: FIXED_NOW });
    expect(pkg.experienceId).toBe("speech_mission");
    expect(pkg.templateId).toContain("amy_experience_template");
  });

  it("Unknown definition", () => {
    const pkg = createExperience("does_not_exist", { now: FIXED_NOW });
    expect(pkg.experienceType).toBe("unknown");
    expect(pkg.metadata.status).toBe("unknown_or_invalid");
    expect(getExperienceFactoryHealth().unknownDefinitions).toBe(1);
  });

  it("Invalid definition", () => {
    const bad = sampleDefinition({
      experienceType: "unknown",
      contentId: "",
    });
    expect(validateExperienceDefinition(bad).ok).toBe(false);
    const pkg = createExperience(bad, { now: FIXED_NOW });
    expect(pkg.experienceType).toBe("unknown");
    expect(getExperienceFactoryHealth().invalidDefinitions).toBe(1);
  });

  it("Readonly package", () => {
    const pkg = createExperience(SPEECH_TEMPLATE_EXPERIENCE_DEFINITION, {
      now: FIXED_NOW,
    });
    expect(() => {
      (pkg as { experienceId: string }).experienceId = "x";
    }).toThrow();
  });

  it("Health + registry + template", () => {
    createExperience(SPEECH_TEMPLATE_EXPERIENCE_DEFINITION, { now: FIXED_NOW });
    createExperience("missing", { now: FIXED_NOW });
    expect(getExperienceFactoryHealth().createdPackages).toBe(2);
    expect(getExperienceRegistry().some((d) => d.experienceId === "speech_mission")).toBe(
      true,
    );
    expect(getExperienceTemplate()?.requiredSurfaces).toContain("today");
  });

  it("compareExperienceDefinitions", () => {
    const a = SPEECH_TEMPLATE_EXPERIENCE_DEFINITION;
    const b = sampleDefinition({
      experienceId: a.experienceId,
      contentId: "content.different.v1",
      journeyId: a.journeyId,
    });
    const diffs = compareExperienceDefinitions(a, b);
    expect(diffs.some((d) => d.path === "contentId")).toBe(true);
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
      expect(src).not.toMatch(/from ["']react["']/);
    }
  });
});
