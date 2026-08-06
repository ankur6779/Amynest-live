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
  clearBrainValidationHistory,
  generateBrainValidationReport,
  type LegacyExperienceSlot,
  type LegacyProductRecommendation,
} from "@/v2/brain-validation";
import {
  adaptFeatureRegistry,
  adaptRouteRegistry,
  adaptToolRegistry,
} from "@/v2/registry-adapters";
import { resolveDecision, type ResolvedDecision } from "@/v2/decision-bridge";
import { clearTodayBrainAdapterStateForTests } from "@/v2/today/brain-adapter";
import {
  AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
  clearTodayRecommendationAdapterStateForTests,
  compareLegacyRecommendation,
  getRecommendationHealth,
  getRecommendationSnapshot,
  getTodayRecommendation,
  isAmyTodayRecommendationAdapterEnabled,
  validateTodayRecommendation,
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
  const doc = createEmptyAmyMemory({ guestId: "today-rec-guest" });
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

function resolveBundle() {
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
  return { decision, stable, budget, resolved };
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

function matchingLegacy(
  resolved: ResolvedDecision,
): LegacyProductRecommendation {
  const premiumLockedFeatureIds = resolved.resolvedFeatures
    .filter(
      (f) =>
        f.premiumRequirement !== "none" &&
        f.premiumRequirement !== "" &&
        f.premiumRequirement !== "unknown",
    )
    .map((f) => f.featureId);
  return Object.freeze({
    legacyId: "today_rec_legacy_1",
    legacyVersion: "legacy_product.v1",
    primary: emptySlot(resolved.hero?.experienceId ?? null, {
      featureIds: resolved.hero?.features.map((f) => f.featureId) ?? [],
      routeIds: resolved.hero?.routes.map((r) => r.path) ?? [],
    }),
    secondary: resolved.secondary
      ? emptySlot(resolved.secondary.experienceId, {
          featureIds: resolved.secondary.features.map((f) => f.featureId),
          routeIds: resolved.secondary.routes.map((r) => r.path),
        })
      : null,
    passive: resolved.passive
      ? emptySlot(resolved.passive.experienceId, {
          featureIds: resolved.passive.features.map((f) => f.featureId),
          routeIds: resolved.passive.routes.map((r) => r.path),
        })
      : null,
    suppressedExperienceIds: Object.freeze([] as string[]),
    unavailableFeatureIds: Object.freeze(
      resolved.resolvedFeatures
        .filter((f) => f.availability === "unavailable")
        .map((f) => f.featureId),
    ),
    premiumLockedFeatureIds: Object.freeze(premiumLockedFeatureIds),
    capabilityBlockedFeatureIds: Object.freeze([] as string[]),
  });
}

describe("Today Recommendation Adapter (Sprint A9.2)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearAmyMemoryForTests();
    clearBrainValidationHistory();
    clearTodayBrainAdapterStateForTests();
    clearTodayRecommendationAdapterStateForTests();
    localStorage.clear();
  });

  it("feature flag defaults OFF → Legacy fallback", () => {
    expect(isV2FlagEnabled("amy_today_recommendation_adapter_v2")).toBe(false);
    expect(isAmyTodayRecommendationAdapterEnabled()).toBe(false);

    const { resolved, budget } = resolveBundle();
    const rec = getTodayRecommendation(
      { resolved, budget, validation: null },
      { now: FIXED_NOW },
    );
    expect(rec.source).toBe("LEGACY_ONLY");
    expect(rec.heroRecommendation).toBeNull();
    expect(rec.recommendationConfidence).toBe("NONE");
    expect(validateTodayRecommendation(rec).ok).toBe(true);
  });

  it("Brain available", () => {
    const { resolved, budget } = resolveBundle();
    const rec = getTodayRecommendation(
      { resolved, budget, validation: null },
      { now: FIXED_NOW, enabled: true },
    );
    expect(rec.source).toBe("BRAIN_AVAILABLE");
    expect(rec.heroRecommendation?.experienceId).toBe(
      AMY_EXPERIENCE.AMY_COACH,
    );
    expect(rec.adapterVersion).toBe(AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION);
    expect(validateTodayRecommendation(rec).ok).toBe(true);
  });

  it("Brain unavailable", () => {
    const rec = getTodayRecommendation(
      { resolved: null, budget: null, validation: null },
      { now: FIXED_NOW, enabled: true },
    );
    expect(rec.source).toBe("BRAIN_UNAVAILABLE");
    expect(rec.heroRecommendation).toBeNull();
    expect(rec.recommendationConfidence).toBe("NONE");
  });

  it("Validation pass → BRAIN_VALIDATED", () => {
    const { resolved, budget } = resolveBundle();
    const validation = generateBrainValidationReport(
      matchingLegacy(resolved),
      resolved,
      {
        now: FIXED_NOW,
        suppressedExperienceIds: budget.suppressedExperiences.map(
          (s) => s.experienceId,
        ),
      },
    );
    expect(validation.status).toBe("MATCH");

    const rec = getTodayRecommendation(
      { resolved, budget, validation },
      { now: FIXED_NOW, enabled: true },
    );
    expect(rec.source).toBe("BRAIN_VALIDATED");
    expect(rec.recommendationConfidence).toBe("HIGH");
    expect(rec.validationStatus).toBe("MATCH");
    expect(rec.heroRecommendation?.experienceId).toBe(
      AMY_EXPERIENCE.AMY_COACH,
    );
  });

  it("Validation fail → LEGACY_ONLY", () => {
    const { resolved, budget } = resolveBundle();
    const mismatched: LegacyProductRecommendation = {
      ...matchingLegacy(resolved),
      primary: emptySlot("wrong_experience", {
        featureIds: ["amy_coach"],
        routeIds: ["/amy-coach"],
      }),
    };
    const validation = generateBrainValidationReport(mismatched, resolved, {
      now: FIXED_NOW,
      suppressedExperienceIds: budget.suppressedExperiences.map(
        (s) => s.experienceId,
      ),
    });
    expect(validation.status).toBe("MISMATCH");

    const rec = getTodayRecommendation(
      { resolved, budget, validation },
      { now: FIXED_NOW, enabled: true },
    );
    expect(rec.source).toBe("LEGACY_ONLY");
    expect(rec.heroRecommendation).toBeNull();
    expect(rec.validationStatus).toBe("MISMATCH");
  });

  it("Legacy fallback when flag OFF", () => {
    const { resolved, budget } = resolveBundle();
    const rec = getTodayRecommendation(
      { resolved, budget, validation: null },
      { now: FIXED_NOW, enabled: false },
    );
    expect(rec.source).toBe("LEGACY_ONLY");
    const cmp = compareLegacyRecommendation(
      {
        primaryExperienceId: AMY_EXPERIENCE.SPEECH_MISSION,
        secondaryExperienceId: AMY_EXPERIENCE.AMY_COACH,
        passiveExperienceId: AMY_EXPERIENCE.ASK_AMY,
      },
      rec,
    );
    expect(cmp.status).toBe("LEGACY_ONLY");
  });

  it("readonly recommendation", () => {
    const { resolved, budget } = resolveBundle();
    const rec = getTodayRecommendation(
      { resolved, budget, validation: null },
      { now: FIXED_NOW, enabled: true },
    );
    expect(Object.isFrozen(rec)).toBe(true);
    expect(() => {
      (rec as { source: string }).source = "LEGACY_ONLY";
    }).toThrow();
  });

  it("Health counters", () => {
    const { resolved, budget } = resolveBundle();

    getTodayRecommendation(
      { resolved, budget, validation: null },
      { now: FIXED_NOW, enabled: true },
    );
    getTodayRecommendation(
      { resolved: null, budget: null, validation: null },
      { now: FIXED_NOW, enabled: true },
    );
    getTodayRecommendation(
      { resolved, budget, validation: null },
      { now: FIXED_NOW, enabled: false },
    );

    const mismatched: LegacyProductRecommendation = {
      ...matchingLegacy(resolved),
      primary: emptySlot("x", { featureIds: ["amy_coach"] }),
    };
    const validation = generateBrainValidationReport(mismatched, resolved, {
      now: FIXED_NOW,
      suppressedExperienceIds: budget.suppressedExperiences.map(
        (s) => s.experienceId,
      ),
    });
    getTodayRecommendation(
      { resolved, budget, validation },
      { now: FIXED_NOW, enabled: true },
    );

    const health = getRecommendationHealth();
    expect(health.brainReads).toBeGreaterThanOrEqual(3);
    expect(health.legacyFallbacks).toBeGreaterThanOrEqual(2);
    expect(health.validationFailures).toBeGreaterThanOrEqual(1);
    expect(health.adapterVersion).toBe(
      AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
    );
    expect(getRecommendationSnapshot()?.source).toBe("LEGACY_ONLY");
  });

  it("never mutates Brain inputs", () => {
    const { resolved, budget } = resolveBundle();
    const beforeR = JSON.stringify(resolved);
    const beforeB = JSON.stringify(budget);
    getTodayRecommendation(
      { resolved, budget, validation: null },
      { now: FIXED_NOW, enabled: true },
    );
    expect(JSON.stringify(resolved)).toBe(beforeR);
    expect(JSON.stringify(budget)).toBe(beforeB);
  });

  it("never throws on empty input", () => {
    expect(() => getTodayRecommendation()).not.toThrow();
    expect(getTodayRecommendation().source).toBe("LEGACY_ONLY");
  });
});
