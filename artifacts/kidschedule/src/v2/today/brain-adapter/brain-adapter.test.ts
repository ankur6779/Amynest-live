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
  AMY_BRAIN_SHADOW_VERSION,
  AMY_BRAIN_VALIDATION_VERSION,
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
import {
  AMY_TODAY_BRAIN_ADAPTER_VERSION,
  clearTodayBrainAdapterStateForTests,
  compareTodayLegacy,
  getTodayBrainHealth,
  getTodayBrainSnapshot,
  isAmyTodayBrainAdapterEnabled,
  validateTodayBrain,
  type LegacyTodaySurface,
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
  const doc = createEmptyAmyMemory({ guestId: "today-brain-guest" });
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
    legacyId: "today_legacy_1",
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

describe("Today Brain Adapter (Sprint A9.1)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearAmyMemoryForTests();
    clearBrainValidationHistory();
    clearTodayBrainAdapterStateForTests();
    localStorage.clear();
  });

  it("feature flag defaults OFF", () => {
    expect(isV2FlagEnabled("amy_today_brain_adapter_v2")).toBe(false);
    expect(isAmyTodayBrainAdapterEnabled()).toBe(false);
  });

  it("Brain available", () => {
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

    const snap = getTodayBrainSnapshot(
      { resolved, budget, validation },
      { now: FIXED_NOW },
    );

    expect(snap.brainAvailable).toBe(true);
    expect(snap.adapterVersion).toBe(AMY_TODAY_BRAIN_ADAPTER_VERSION);
    expect(snap.resolvedHero?.experienceId).toBe(AMY_EXPERIENCE.AMY_COACH);
    expect(snap.brainVersion).toBe(AMY_BRAIN_SHADOW_VERSION);
    expect(snap.validationVersion).toBe(AMY_BRAIN_VALIDATION_VERSION);
    expect(validateTodayBrain(snap).ok).toBe(true);
  });

  it("Brain unavailable", () => {
    const snap = getTodayBrainSnapshot(
      { resolved: null, budget: null, validation: null },
      { now: FIXED_NOW },
    );
    expect(snap.brainAvailable).toBe(false);
    expect(snap.validationPassed).toBe(false);
    expect(snap.resolvedHero).toBeNull();
    expect(snap.resolvedSecondary).toBeNull();
    expect(snap.resolvedPassive).toBeNull();
    expect(snap.brainVersion).toBeNull();
    expect(snap.validationStatus).toBe("UNAVAILABLE");
    expect(validateTodayBrain(snap).ok).toBe(true);
  });

  it("Brain unavailable when budget missing", () => {
    const { resolved } = resolveBundle();
    const snap = getTodayBrainSnapshot(
      { resolved, budget: null, validation: null },
      { now: FIXED_NOW },
    );
    expect(snap.brainAvailable).toBe(false);
    expect(snap.resolvedHero).toBeNull();
  });

  it("Validation passed", () => {
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

    const snap = getTodayBrainSnapshot(
      { resolved, budget, validation },
      { now: FIXED_NOW },
    );
    expect(snap.validationPassed).toBe(true);
    expect(snap.validationStatus).toBe("MATCH");
  });

  it("Validation failed", () => {
    const { resolved, budget } = resolveBundle();
    const badLegacy = matchingLegacy(resolved);
    const mismatched: LegacyProductRecommendation = {
      ...badLegacy,
      primary: emptySlot("totally_wrong_experience", {
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

    const snap = getTodayBrainSnapshot(
      { resolved, budget, validation },
      { now: FIXED_NOW },
    );
    expect(snap.brainAvailable).toBe(true);
    expect(snap.validationPassed).toBe(false);
    expect(snap.validationStatus).toBe("MISMATCH");
  });

  it("readonly snapshots", () => {
    const { resolved, budget } = resolveBundle();
    const snap = getTodayBrainSnapshot(
      { resolved, budget, validation: null },
      { now: FIXED_NOW },
    );
    expect(Object.isFrozen(snap)).toBe(true);
    expect(() => {
      (snap as { brainAvailable: boolean }).brainAvailable = false;
    }).toThrow();
  });

  it("Health", () => {
    const { resolved, budget } = resolveBundle();
    expect(getTodayBrainHealth().shadowReads).toBe(0);

    getTodayBrainSnapshot(
      { resolved, budget, validation: null },
      { now: FIXED_NOW },
    );
    getTodayBrainSnapshot(
      { resolved: null, budget: null, validation: null },
      { now: FIXED_NOW },
    );

    const health = getTodayBrainHealth();
    expect(health.shadowReads).toBe(2);
    expect(health.adapterVersion).toBe(AMY_TODAY_BRAIN_ADAPTER_VERSION);
    // Latest recorded was unavailable
    expect(health.brainAvailable).toBe(false);
    expect(health.validationStatus).toBe("UNAVAILABLE");
  });

  it("compareTodayLegacy when Brain available", () => {
    const { resolved, budget } = resolveBundle();
    const snap = getTodayBrainSnapshot(
      { resolved, budget, validation: null },
      { now: FIXED_NOW, recordShadowRead: false },
    );
    const legacy: LegacyTodaySurface = {
      primaryExperienceId: snap.resolvedHero?.experienceId ?? null,
      secondaryExperienceId: snap.resolvedSecondary?.experienceId ?? null,
      passiveExperienceId: snap.resolvedPassive?.experienceId ?? null,
      missionId: "speech_name_three",
      coachVisible: true,
      askAmyVisible: true,
    };
    const cmp = compareTodayLegacy(legacy, snap);
    expect(cmp.status).toBe("MATCH");
    expect(cmp.adapterVersion).toBe(AMY_TODAY_BRAIN_ADAPTER_VERSION);
  });

  it("compareTodayLegacy when Brain unavailable", () => {
    const snap = getTodayBrainSnapshot(
      { resolved: null, budget: null, validation: null },
      { now: FIXED_NOW, recordShadowRead: false },
    );
    const cmp = compareTodayLegacy(
      {
        primaryExperienceId: AMY_EXPERIENCE.SPEECH_MISSION,
        secondaryExperienceId: AMY_EXPERIENCE.AMY_COACH,
        passiveExperienceId: AMY_EXPERIENCE.ASK_AMY,
        missionId: "x",
        coachVisible: true,
        askAmyVisible: true,
      },
      snap,
    );
    expect(cmp.status).toBe("BRAIN_UNAVAILABLE");
  });

  it("never mutates ResolvedDecision or AttentionBudget", () => {
    const { resolved, budget } = resolveBundle();
    const beforeR = JSON.stringify(resolved);
    const beforeB = JSON.stringify(budget);
    getTodayBrainSnapshot(
      { resolved, budget, validation: null },
      { now: FIXED_NOW },
    );
    expect(JSON.stringify(resolved)).toBe(beforeR);
    expect(JSON.stringify(budget)).toBe(beforeB);
  });
});
