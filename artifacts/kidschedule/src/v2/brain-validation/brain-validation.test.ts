import { afterEach, describe, expect, it, vi } from "vitest";
import { isV2FlagEnabled } from "@/lib/feature-flags";
import { resolveAmyContext, type AmyContext } from "@/v2/amy-context";
import {
  clearAmyMemoryForTests,
  createEmptyAmyMemory,
  type AmyMemoryDocument,
  type AmyMemoryMutable,
} from "@/v2/amy-memory";
import { computeContextVersion } from "@/v2/amy-memory/context-version";
import {
  AMY_DECISION_COOLDOWN_VERSION,
  AMY_EXPERIENCE,
  allocateAttentionBudget,
  createAmyDecision,
  stabilizeAmyDecision,
  type DecisionCooldownResult,
} from "@/v2/amy-decision";
import {
  adaptFeatureRegistry,
  adaptRouteRegistry,
  adaptToolRegistry,
} from "@/v2/registry-adapters";
import { resolveDecision } from "@/v2/decision-bridge";
import type { ResolvedDecision } from "@/v2/decision-bridge";
import {
  AMY_BRAIN_SHADOW_VERSION,
  AMY_BRAIN_VALIDATION_VERSION,
  clearBrainValidationHistory,
  compareLegacyWithBrain,
  generateBrainValidationReport,
  getBrainValidationHealth,
  getBrainValidationHistory,
  getLatestBrainValidation,
  isAmyBrainShadowValidationEnabled,
  runBrainValidation,
  validateBrainPipeline,
  type LegacyExperienceSlot,
  type LegacyProductRecommendation,
} from "./index";

function freezeDoc(doc: AmyMemoryMutable): AmyMemoryDocument {
  doc.contextVersion = computeContextVersion(doc as AmyMemoryDocument);
  return Object.freeze(
    JSON.parse(JSON.stringify(doc)),
  ) as AmyMemoryDocument;
}

function contextFrom(
  mutate?: (doc: AmyMemoryMutable) => void,
  now = new Date(2026, 7, 2, 12, 0, 0),
): AmyContext {
  const doc = createEmptyAmyMemory({ guestId: "shadow-guest-1" });
  mutate?.(doc);
  return resolveAmyContext(freezeDoc(doc), { now });
}

const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

function noneCooldown(experienceId: string): DecisionCooldownResult {
  return Object.freeze({
    experienceId,
    cooldownState: "NONE",
    cooldownPolicy: null,
    startedAt: null,
    expiresAt: null,
    dismissCount: 0,
    eligibleAgain: true,
    cooldownReason: "NO_COOLDOWN",
    cooldownVersion: AMY_DECISION_COOLDOWN_VERSION,
  });
}

function missionCompleteBundle() {
  const day = "2026-08-02";
  const ctx = contextFrom((d) => {
    d.challenge.worryId = "behavior";
    d.mission.missionId = "speech_name_three";
    d.mission.dateKey = day;
    d.mission.completedAt = FIXED_NOW.toISOString();
    d.speech.todayMissionStatus = "completed";
    d.coach.status = "prepared";
    d.coach.prepared = {
      goalId: "toddler-tantrums",
      goalTitle: "Toddler Tantrums",
      categoryId: "toddler-behavior",
      worryId: "behavior",
      challengeLabel: "Behaviour",
      preparedAt: FIXED_NOW.toISOString(),
      gateDismissed: false,
    };
  });
  const decision = createAmyDecision(ctx, { now: FIXED_NOW });
  const stable = stabilizeAmyDecision(
    { context: ctx, currentDecision: decision },
    { now: FIXED_NOW },
  );
  const budget = allocateAttentionBudget(
    {
      stable,
      cooldown: noneCooldown(decision.primaryExperience.experienceId),
    },
    { now: FIXED_NOW },
  );
  return { ctx, decision, stable, budget };
}

function emptySlot(
  experienceId: string | null,
  extras: Partial<LegacyExperienceSlot> = {},
): LegacyExperienceSlot {
  return Object.freeze({
    experienceId,
    featureIds: Object.freeze([...(extras.featureIds ?? [])] as string[]),
    toolIds: Object.freeze([...(extras.toolIds ?? [])] as string[]),
    routeIds: Object.freeze([...(extras.routeIds ?? [])] as string[]),
    available: extras.available ?? null,
    capabilityOk: extras.capabilityOk ?? null,
    premiumRestricted: extras.premiumRestricted ?? null,
  });
}

function legacyAlignedToBrain(
  resolved: ResolvedDecision,
  overrides: Partial<LegacyProductRecommendation> = {},
): LegacyProductRecommendation {
  const premiumLockedFeatureIds = resolved.resolvedFeatures
    .filter(
      (f) =>
        f.premiumRequirement !== "none" &&
        f.premiumRequirement !== "" &&
        f.premiumRequirement !== "unknown",
    )
    .map((f) => f.featureId);
  const unavailableFeatureIds = resolved.resolvedFeatures
    .filter((f) => f.availability === "unavailable")
    .map((f) => f.featureId);
  const capabilityBlockedFeatureIds = [
    ...resolved.resolvedFeatures
      .filter((f) => f.availability === "limited")
      .map((f) => f.featureId),
    ...resolved.resolvedTools
      .filter((t) => t.canRun === false)
      .map((t) => t.toolId),
  ];

  const heroFeatures = resolved.hero?.features.map((f) => f.featureId) ?? [];
  const heroRoutes =
    resolved.hero?.routes.flatMap((r) => [r.path, r.routeId]) ?? [];
  const secondaryFeatures =
    resolved.secondary?.features.map((f) => f.featureId) ?? [];
  const secondaryRoutes =
    resolved.secondary?.routes.flatMap((r) => [r.path]) ?? [];
  const passiveFeatures =
    resolved.passive?.features.map((f) => f.featureId) ?? [];
  const passiveRoutes =
    resolved.passive?.routes.flatMap((r) => [r.path]) ?? [];

  return Object.freeze({
    legacyId: "legacy_aligned_1",
    legacyVersion: "legacy_product.v1",
    primary: emptySlot(resolved.hero?.experienceId ?? null, {
      featureIds: heroFeatures,
      routeIds: heroRoutes,
      toolIds: resolved.hero?.tools.map((t) => t.toolId) ?? [],
    }),
    secondary: resolved.secondary
      ? emptySlot(resolved.secondary.experienceId, {
          featureIds: secondaryFeatures,
          routeIds: secondaryRoutes,
        })
      : null,
    passive: resolved.passive
      ? emptySlot(resolved.passive.experienceId, {
          featureIds: passiveFeatures,
          routeIds: passiveRoutes,
        })
      : null,
    suppressedExperienceIds: Object.freeze([] as string[]),
    unavailableFeatureIds: Object.freeze(unavailableFeatureIds),
    premiumLockedFeatureIds: Object.freeze(premiumLockedFeatureIds),
    capabilityBlockedFeatureIds: Object.freeze([
      ...new Set(capabilityBlockedFeatureIds),
    ]),
    ...overrides,
  });
}

function resolveBundle() {
  const { decision, stable, budget } = missionCompleteBundle();
  const resolved = resolveDecision(
    {
      decision,
      budget,
      features: adaptFeatureRegistry({ now: FIXED_NOW }),
      tools: adaptToolRegistry({ now: FIXED_NOW }),
      routes: adaptRouteRegistry({ now: FIXED_NOW }),
      stabilityToken: stable.stabilityToken,
    },
    { now: FIXED_NOW },
  );
  const suppressed = budget.suppressedExperiences.map((s) => s.experienceId);
  return { decision, stable, budget, resolved, suppressed };
}

describe("Amy Brain Shadow Validation (Sprint A8.3)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearAmyMemoryForTests();
    clearBrainValidationHistory();
    localStorage.clear();
  });

  it("feature flag defaults OFF", () => {
    expect(isV2FlagEnabled("amy_brain_shadow_validation_v2")).toBe(false);
    expect(isAmyBrainShadowValidationEnabled()).toBe(false);
  });

  it("perfect match", () => {
    const { resolved, suppressed } = resolveBundle();
    const legacy = legacyAlignedToBrain(resolved, {
      suppressedExperienceIds: Object.freeze([...suppressed]),
    });

    const report = runBrainValidation(
      { legacy, resolved, suppressedExperienceIds: suppressed },
      { now: FIXED_NOW },
    );

    expect(report.status).toBe("MATCH");
    expect(report.brainVersion).toBe(AMY_BRAIN_SHADOW_VERSION);
    expect(report.validationVersion).toBe(AMY_BRAIN_VALIDATION_VERSION);
    expect(report.bridgeVersion).toBe(resolved.bridgeVersion);
    expect(report.legacySnapshot.primaryExperienceId).toBe(
      resolved.hero?.experienceId,
    );
    expect(validateBrainPipeline({ report }).ok).toBe(true);
    expect(Object.isFrozen(report)).toBe(true);
  });

  it("missing feature", () => {
    const { resolved } = resolveBundle();
    const legacy = legacyAlignedToBrain(resolved, {
      primary: emptySlot(resolved.hero?.experienceId ?? null, {
        featureIds: ["totally_missing_feature"],
        routeIds: resolved.hero?.routes.map((r) => r.path) ?? [],
      }),
    });
    const comparison = compareLegacyWithBrain(legacy, resolved);
    expect(
      comparison.entries.find((e) => e.dimension === "resolved_feature")
        ?.status,
    ).toMatch(/MISMATCH|PARTIAL_MATCH/);
    expect(comparison.status).not.toBe("MATCH");
  });

  it("missing tool", () => {
    const { resolved } = resolveBundle();
    const legacy = legacyAlignedToBrain(resolved, {
      primary: emptySlot(resolved.hero?.experienceId ?? null, {
        featureIds: resolved.hero?.features.map((f) => f.featureId) ?? [],
        toolIds: ["ghost_tool"],
        routeIds: resolved.hero?.routes.map((r) => r.path) ?? [],
      }),
    });
    const comparison = compareLegacyWithBrain(legacy, resolved);
    const toolEntry = comparison.entries.find(
      (e) => e.dimension === "resolved_tool",
    );
    expect(toolEntry?.status).toMatch(/UNKNOWN|MISMATCH|PARTIAL_MATCH/);
  });

  it("missing route", () => {
    const { resolved } = resolveBundle();
    const legacy = legacyAlignedToBrain(resolved, {
      primary: emptySlot(resolved.hero?.experienceId ?? null, {
        featureIds: resolved.hero?.features.map((f) => f.featureId) ?? [],
        routeIds: ["/does-not-exist-in-brain"],
      }),
    });
    const comparison = compareLegacyWithBrain(legacy, resolved);
    expect(
      comparison.entries.find((e) => e.dimension === "resolved_route")?.status,
    ).toMatch(/MISMATCH|PARTIAL_MATCH/);
  });

  it("capability mismatch", () => {
    const { resolved } = resolveBundle();
    const legacy = legacyAlignedToBrain(resolved, {
      capabilityBlockedFeatureIds: Object.freeze(["amy_coach"]),
    });
    const comparison = compareLegacyWithBrain(legacy, resolved);
    expect(
      comparison.entries.find((e) => e.dimension === "capability")?.status,
    ).not.toBe("MATCH");
  });

  it("premium mismatch", () => {
    const { resolved } = resolveBundle();
    const legacy = legacyAlignedToBrain(resolved, {
      premiumLockedFeatureIds: Object.freeze(["force_premium_lock_xyz"]),
    });
    const comparison = compareLegacyWithBrain(legacy, resolved);
    expect(
      comparison.entries.find((e) => e.dimension === "premium_restriction")
        ?.status,
    ).not.toBe("MATCH");
  });

  it("unknown experience", () => {
    const { resolved } = resolveBundle();
    const legacy = legacyAlignedToBrain(resolved, {
      primary: emptySlot("not_a_real_experience", {
        featureIds: ["amy_coach"],
        routeIds: ["/amy-coach"],
      }),
    });
    const comparison = compareLegacyWithBrain(legacy, resolved);
    expect(
      comparison.entries.find((e) => e.dimension === "primary_experience")
        ?.status,
    ).toBe("MISMATCH");
    expect(comparison.status).toBe("MISMATCH");
  });

  it("readonly report", () => {
    const { resolved, suppressed } = resolveBundle();
    const legacy = legacyAlignedToBrain(resolved, {
      suppressedExperienceIds: Object.freeze([...suppressed]),
    });
    const report = generateBrainValidationReport(legacy, resolved, {
      now: FIXED_NOW,
      suppressedExperienceIds: suppressed,
    });
    expect(Object.isFrozen(report)).toBe(true);
    expect(() => {
      (report as { status: string }).status = "MISMATCH";
    }).toThrow();
  });

  it("history append", () => {
    const { resolved, suppressed } = resolveBundle();
    const legacy = legacyAlignedToBrain(resolved, {
      suppressedExperienceIds: Object.freeze([...suppressed]),
    });

    expect(getLatestBrainValidation()).toBeNull();
    runBrainValidation(
      { legacy, resolved, suppressedExperienceIds: suppressed },
      { now: FIXED_NOW },
    );
    runBrainValidation(
      { legacy, resolved, suppressedExperienceIds: suppressed },
      { now: new Date(FIXED_NOW.getTime() + 1000) },
    );

    expect(getBrainValidationHistory()).toHaveLength(2);
    expect(getLatestBrainValidation()?.validationId).toBeTruthy();

    // Pure generate does not append
    generateBrainValidationReport(legacy, resolved, {
      now: FIXED_NOW,
      suppressedExperienceIds: suppressed,
    });
    expect(getBrainValidationHistory()).toHaveLength(2);
  });

  it("health counters", () => {
    const { resolved, suppressed } = resolveBundle();
    const matchLegacy = legacyAlignedToBrain(resolved, {
      suppressedExperienceIds: Object.freeze([...suppressed]),
    });
    runBrainValidation(
      {
        legacy: matchLegacy,
        resolved,
        suppressedExperienceIds: suppressed,
      },
      { now: FIXED_NOW },
    );

    const mismatchLegacy = legacyAlignedToBrain(resolved, {
      primary: emptySlot("wrong_exp", {
        featureIds: ["amy_coach"],
        routeIds: ["/amy-coach"],
      }),
      suppressedExperienceIds: Object.freeze([...suppressed]),
    });
    runBrainValidation(
      {
        legacy: mismatchLegacy,
        resolved,
        suppressedExperienceIds: suppressed,
      },
      { now: new Date(FIXED_NOW.getTime() + 2000) },
    );

    const health = getBrainValidationHealth();
    expect(health.totalComparisons).toBe(2);
    expect(health.matches).toBeGreaterThanOrEqual(1);
    expect(health.mismatches).toBeGreaterThanOrEqual(1);
    expect(health.brainVersion).toBe(AMY_BRAIN_SHADOW_VERSION);
    expect(health.lastValidation).toBeTruthy();
  });

  it("never mutates Legacy or ResolvedDecision", () => {
    const { resolved, suppressed } = resolveBundle();
    const legacy = legacyAlignedToBrain(resolved, {
      suppressedExperienceIds: Object.freeze([...suppressed]),
    });
    const beforeLegacy = JSON.stringify(legacy);
    const beforeResolved = JSON.stringify(resolved);

    runBrainValidation(
      { legacy, resolved, suppressedExperienceIds: suppressed },
      { now: FIXED_NOW },
    );

    expect(JSON.stringify(legacy)).toBe(beforeLegacy);
    expect(JSON.stringify(resolved)).toBe(beforeResolved);
  });

  it("validateBrainPipeline accepts aligned input", () => {
    const { resolved, suppressed } = resolveBundle();
    const legacy = legacyAlignedToBrain(resolved);
    expect(
      validateBrainPipeline({
        legacy,
        resolved,
        suppressedExperienceIds: suppressed,
      }).ok,
    ).toBe(true);
  });

  it("hero experience stays amy_coach after mission complete (sanity)", () => {
    const { resolved } = resolveBundle();
    expect(resolved.hero?.experienceId).toBe(AMY_EXPERIENCE.AMY_COACH);
  });
});
