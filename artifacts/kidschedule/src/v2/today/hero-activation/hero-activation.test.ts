import { afterEach, describe, expect, it, vi } from "vitest";
import { isV2FlagEnabled } from "@/lib/feature-flags";
import { AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION } from "@/v2/today/recommendation-adapter";
import type { TodayRecommendation } from "@/v2/today/recommendation-adapter";
import {
  AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
  AMY_TODAY_RENDER_VERSION,
  TODAY_EXISTING_CARD_IDS,
  resolveTodayRecommendation,
  type TodayRenderableRecommendation,
} from "@/v2/today/recommendation-resolver";
import {
  clearTodayHeroActivationStateForTests,
  evaluateTodayHeroActivation,
  forceLegacyHero,
  getTodayActivationHealth,
  getTodayHeroSource,
  isAmyTodayBrainHeroEnabled,
  isBrainHeroActive,
} from "./index";

const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

function missionRecommendation(
  overrides: Partial<TodayRecommendation> = {},
): TodayRecommendation {
  return Object.freeze({
    heroRecommendation: Object.freeze({
      experienceId: "speech_mission",
      sourceSlot: "hero" as const,
      promoted: false,
      featureIds: Object.freeze(["speech_coach"]),
      routeIds: Object.freeze(["/today/mission"]),
      toolIds: Object.freeze([] as string[]),
    }),
    secondaryRecommendation: Object.freeze({
      experienceId: "amy_coach",
      sourceSlot: "secondary" as const,
      promoted: false,
      featureIds: Object.freeze(["amy_coach"]),
      routeIds: Object.freeze(["/amy-coach"]),
      toolIds: Object.freeze([] as string[]),
    }),
    passiveRecommendation: Object.freeze({
      experienceId: "ask_amy",
      sourceSlot: "passive" as const,
      promoted: false,
      featureIds: Object.freeze(["ask_amy"]),
      routeIds: Object.freeze(["/ask-amy"]),
      toolIds: Object.freeze([] as string[]),
    }),
    recommendationConfidence: "HIGH",
    validationStatus: "MATCH",
    source: "BRAIN_VALIDATED",
    generatedAt: FIXED_NOW.toISOString(),
    adapterVersion: AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
    ...overrides,
  });
}

function resolvedMission(
  recommendation: TodayRecommendation = missionRecommendation(),
): TodayRenderableRecommendation {
  return resolveTodayRecommendation(recommendation, {
    now: FIXED_NOW,
    enabled: true,
    recordHealth: false,
  });
}

describe("Today Hero Activation Gate (Sprint A9.4)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearTodayHeroActivationStateForTests();
  });

  it("feature flag defaults OFF → Legacy Hero", () => {
    expect(isV2FlagEnabled("amy_today_brain_hero_v2")).toBe(false);
    expect(isAmyTodayBrainHeroEnabled()).toBe(false);

    const recommendation = missionRecommendation();
    const renderable = resolvedMission(recommendation);
    const result = evaluateTodayHeroActivation(
      {
        recommendation,
        renderable,
        validationStatus: "MATCH",
      },
      { now: FIXED_NOW },
    );
    expect(result.source).toBe("legacy");
    expect(result.active).toBe(false);
    expect(result.reason).toBe("FLAG_OFF");
  });

  it("Validation MATCH → Brain Hero", () => {
    const recommendation = missionRecommendation();
    const renderable = resolvedMission(recommendation);
    expect(renderable.heroCardId).toBe(TODAY_EXISTING_CARD_IDS.mission);

    const result = evaluateTodayHeroActivation(
      {
        recommendation,
        renderable,
        validationStatus: "MATCH",
      },
      { now: FIXED_NOW, enabled: true },
    );
    expect(result.active).toBe(true);
    expect(result.source).toBe("brain");
    expect(result.heroCardId).toBe(TODAY_EXISTING_CARD_IDS.mission);
    expect(result.reason).toBe("BRAIN_HERO_ACTIVE");
    expect(isBrainHeroActive()).toBe(true);
    expect(getTodayHeroSource()).toBe("brain");
  });

  it("Validation FAIL → Legacy Hero", () => {
    const recommendation = missionRecommendation();
    const renderable = resolvedMission(recommendation);
    const result = evaluateTodayHeroActivation(
      {
        recommendation,
        renderable,
        validationStatus: "MISMATCH",
      },
      { now: FIXED_NOW, enabled: true },
    );
    expect(result.source).toBe("legacy");
    expect(result.reason).toBe("VALIDATION_NOT_MATCH");
    expect(isBrainHeroActive()).toBe(false);
  });

  it("Flag OFF → Legacy Hero", () => {
    const recommendation = missionRecommendation();
    const renderable = resolvedMission(recommendation);
    expect(
      getTodayHeroSource(
        {
          recommendation,
          renderable,
          validationStatus: "MATCH",
        },
        { now: FIXED_NOW, enabled: false },
      ),
    ).toBe("legacy");
  });

  it("Resolver fail → Legacy Hero", () => {
    const recommendation = missionRecommendation({
      heroRecommendation: Object.freeze({
        experienceId: "amy_coach",
        sourceSlot: "hero",
        promoted: false,
        featureIds: Object.freeze(["amy_coach"]),
        routeIds: Object.freeze(["/amy-coach"]),
        toolIds: Object.freeze([] as string[]),
      }),
    });
    const renderable = resolvedMission(recommendation);
    // Coach hero is not Mission → resolver success fails for Mission gate
    expect(renderable.heroCardId).toBe(TODAY_EXISTING_CARD_IDS.coach);

    const result = evaluateTodayHeroActivation(
      {
        recommendation,
        renderable,
        validationStatus: "MATCH",
      },
      { now: FIXED_NOW, enabled: true },
    );
    expect(result.source).toBe("legacy");
    expect(result.reason).toBe("RESOLVER_FAILURE");
  });

  it("Rollback forceLegacyHero → Legacy Hero", () => {
    const recommendation = missionRecommendation();
    const renderable = resolvedMission(recommendation);
    evaluateTodayHeroActivation(
      {
        recommendation,
        renderable,
        validationStatus: "MATCH",
      },
      { now: FIXED_NOW, enabled: true },
    );
    expect(isBrainHeroActive()).toBe(true);

    forceLegacyHero();
    expect(isBrainHeroActive()).toBe(false);
    expect(getTodayHeroSource()).toBe("legacy");
    expect(
      evaluateTodayHeroActivation(
        {
          recommendation,
          renderable,
          validationStatus: "MATCH",
        },
        { now: FIXED_NOW, enabled: true },
      ).reason,
    ).toBe("FORCE_LEGACY");
  });

  it("never activates Coach / Ask Amy / Premium as Hero", () => {
    const recommendation = missionRecommendation({
      heroRecommendation: Object.freeze({
        experienceId: "ask_amy",
        sourceSlot: "hero",
        promoted: false,
        featureIds: Object.freeze(["ask_amy"]),
        routeIds: Object.freeze(["/ask-amy"]),
        toolIds: Object.freeze([] as string[]),
      }),
    });
    const renderable = resolveTodayRecommendation(recommendation, {
      now: FIXED_NOW,
      enabled: true,
      recordHealth: false,
    });
    const result = evaluateTodayHeroActivation(
      {
        recommendation,
        renderable,
        validationStatus: "MATCH",
      },
      { now: FIXED_NOW, enabled: true },
    );
    expect(result.active).toBe(false);
    expect(result.source).toBe("legacy");
  });

  it("Health counters", () => {
    const recommendation = missionRecommendation();
    const renderable = resolvedMission(recommendation);

    evaluateTodayHeroActivation(
      {
        recommendation,
        renderable,
        validationStatus: "MATCH",
      },
      { now: FIXED_NOW, enabled: true },
    );
    evaluateTodayHeroActivation(
      {
        recommendation,
        renderable,
        validationStatus: "MISMATCH",
      },
      { now: FIXED_NOW, enabled: true },
    );
    evaluateTodayHeroActivation(
      {
        recommendation: missionRecommendation({
          heroRecommendation: Object.freeze({
            experienceId: "amy_coach",
            sourceSlot: "hero",
            promoted: false,
            featureIds: Object.freeze(["amy_coach"]),
            routeIds: Object.freeze(["/amy-coach"]),
            toolIds: Object.freeze([] as string[]),
          }),
        }),
        renderable: {
          heroCardId: TODAY_EXISTING_CARD_IDS.coach,
          secondaryCardIds: Object.freeze([]),
          passiveCardIds: Object.freeze([]),
          ctaIds: Object.freeze([]),
          priority: Object.freeze([TODAY_EXISTING_CARD_IDS.coach]),
          renderVersion: AMY_TODAY_RENDER_VERSION,
          resolverVersion: AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
          generatedAt: FIXED_NOW.toISOString(),
          legacyFallback: false,
          missingCards: Object.freeze([]),
        },
        validationStatus: "MATCH",
      },
      { now: FIXED_NOW, enabled: true },
    );

    const health = getTodayActivationHealth();
    expect(health.brainHeroActivations).toBeGreaterThanOrEqual(1);
    expect(health.legacyFallbacks).toBeGreaterThanOrEqual(2);
    expect(health.validationFailures).toBeGreaterThanOrEqual(1);
    expect(health.resolverFailures).toBeGreaterThanOrEqual(1);
  });
});
