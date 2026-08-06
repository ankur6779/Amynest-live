import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isV2FlagEnabled } from "@/lib/feature-flags";
import { AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION } from "@/v2/today/recommendation-adapter";
import type { TodayRecommendation } from "@/v2/today/recommendation-adapter";
import {
  AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
  AMY_TODAY_RENDER_VERSION,
  TODAY_EXISTING_CARD_IDS,
  TODAY_EXISTING_CTA_IDS,
  clearTodayRecommendationResolverStateForTests,
  compareRenderableRecommendation,
  getRenderableRecommendation,
  getResolverHealth,
  isAmyTodayRecommendationResolverEnabled,
  resolveTodayRecommendation,
  validateRenderableRecommendation,
} from "./index";

const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

function baseRecommendation(
  overrides: Partial<TodayRecommendation> = {},
): TodayRecommendation {
  return Object.freeze({
    heroRecommendation: Object.freeze({
      experienceId: "amy_coach",
      sourceSlot: "hero" as const,
      promoted: false,
      featureIds: Object.freeze(["amy_coach"]),
      routeIds: Object.freeze(["/amy-coach"]),
      toolIds: Object.freeze([] as string[]),
    }),
    secondaryRecommendation: Object.freeze({
      experienceId: "ask_amy",
      sourceSlot: "secondary" as const,
      promoted: false,
      featureIds: Object.freeze(["ask_amy"]),
      routeIds: Object.freeze(["/ask-amy"]),
      toolIds: Object.freeze([] as string[]),
    }),
    passiveRecommendation: null,
    recommendationConfidence: "HIGH",
    validationStatus: "MATCH",
    source: "BRAIN_VALIDATED",
    generatedAt: FIXED_NOW.toISOString(),
    adapterVersion: AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
    ...overrides,
  });
}

describe("Today Recommendation Resolver (Sprint A9.3)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearTodayRecommendationResolverStateForTests();
  });

  it("feature flag defaults OFF → legacy fallback", () => {
    expect(isV2FlagEnabled("amy_today_recommendation_resolver_v2")).toBe(
      false,
    );
    expect(isAmyTodayRecommendationResolverEnabled()).toBe(false);

    const out = resolveTodayRecommendation(baseRecommendation(), {
      now: FIXED_NOW,
    });
    expect(out.legacyFallback).toBe(true);
    expect(out.heroCardId).toBeNull();
    expect(out.priority).toEqual([]);
    expect(validateRenderableRecommendation(out).ok).toBe(true);
  });

  it("Known recommendation", () => {
    const out = resolveTodayRecommendation(baseRecommendation(), {
      now: FIXED_NOW,
      enabled: true,
    });
    expect(out.legacyFallback).toBe(false);
    expect(out.heroCardId).toBe(TODAY_EXISTING_CARD_IDS.coach);
    expect(out.secondaryCardIds).toEqual([TODAY_EXISTING_CARD_IDS.askAmy]);
    expect(out.ctaIds).toEqual(
      expect.arrayContaining([
        TODAY_EXISTING_CTA_IDS.coachCta,
        TODAY_EXISTING_CTA_IDS.askAmyEntry,
      ]),
    );
    expect(out.priority[0]).toBe(TODAY_EXISTING_CARD_IDS.coach);
    expect(out.renderVersion).toBe(AMY_TODAY_RENDER_VERSION);
    expect(out.resolverVersion).toBe(
      AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
    );
    expect(validateRenderableRecommendation(out).ok).toBe(true);
  });

  it("Unknown recommendation experience → missing card", () => {
    const out = resolveTodayRecommendation(
      baseRecommendation({
        heroRecommendation: Object.freeze({
          experienceId: "totally_unknown_experience",
          sourceSlot: "hero",
          promoted: false,
          featureIds: Object.freeze([] as string[]),
          routeIds: Object.freeze([] as string[]),
          toolIds: Object.freeze([] as string[]),
        }),
      }),
      { now: FIXED_NOW, enabled: true },
    );
    expect(out.heroCardId).toBeNull();
    expect(out.missingCards).toContain("totally_unknown_experience");
  });

  it("Missing card for for_child (no Today surface)", () => {
    const out = resolveTodayRecommendation(
      baseRecommendation({
        passiveRecommendation: Object.freeze({
          experienceId: "for_child",
          sourceSlot: "passive",
          promoted: false,
          featureIds: Object.freeze(["for_child"]),
          routeIds: Object.freeze(["/for-child"]),
          toolIds: Object.freeze([] as string[]),
        }),
      }),
      { now: FIXED_NOW, enabled: true },
    );
    expect(out.passiveCardIds).toEqual([]);
    expect(out.missingCards).toContain("for_child");
  });

  it("Readonly output", () => {
    const out = resolveTodayRecommendation(baseRecommendation(), {
      now: FIXED_NOW,
      enabled: true,
    });
    expect(Object.isFrozen(out)).toBe(true);
    expect(() => {
      (out as { heroCardId: string | null }).heroCardId = "x";
    }).toThrow();
  });

  it("Legacy fallback for LEGACY_ONLY / BRAIN_UNAVAILABLE", () => {
    const legacy = resolveTodayRecommendation(
      baseRecommendation({ source: "LEGACY_ONLY" }),
      { now: FIXED_NOW, enabled: true },
    );
    expect(legacy.legacyFallback).toBe(true);
    expect(legacy.heroCardId).toBeNull();

    const unavailable = resolveTodayRecommendation(
      baseRecommendation({ source: "BRAIN_UNAVAILABLE" }),
      { now: FIXED_NOW, enabled: true },
    );
    expect(unavailable.legacyFallback).toBe(true);
  });

  it("Health", () => {
    resolveTodayRecommendation(baseRecommendation(), {
      now: FIXED_NOW,
      enabled: true,
    });
    resolveTodayRecommendation(
      baseRecommendation({
        passiveRecommendation: Object.freeze({
          experienceId: "for_child",
          sourceSlot: "passive",
          promoted: false,
          featureIds: Object.freeze(["for_child"]),
          routeIds: Object.freeze(["/for-child"]),
          toolIds: Object.freeze([] as string[]),
        }),
      }),
      { now: FIXED_NOW, enabled: true },
    );
    resolveTodayRecommendation(baseRecommendation({ source: "LEGACY_ONLY" }), {
      now: FIXED_NOW,
      enabled: true,
    });

    const health = getResolverHealth();
    expect(health.resolvedCards).toBeGreaterThanOrEqual(2);
    expect(health.missingCards).toBeGreaterThanOrEqual(1);
    expect(health.legacyFallbacks).toBeGreaterThanOrEqual(1);
    expect(health.resolverVersion).toBe(
      AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
    );
    expect(getRenderableRecommendation()?.resolverVersion).toBe(
      AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
    );
  });

  it("compareRenderableRecommendation detects diffs", () => {
    const a = resolveTodayRecommendation(baseRecommendation(), {
      now: FIXED_NOW,
      enabled: true,
      recordHealth: false,
    });
    const b = resolveTodayRecommendation(
      baseRecommendation({
        heroRecommendation: Object.freeze({
          experienceId: "speech_mission",
          sourceSlot: "hero",
          promoted: false,
          featureIds: Object.freeze(["speech_coach"]),
          routeIds: Object.freeze(["/today/mission"]),
          toolIds: Object.freeze([] as string[]),
        }),
      }),
      { now: FIXED_NOW, enabled: true, recordHealth: false },
    );
    const diffs = compareRenderableRecommendation(a, b);
    expect(diffs.some((d) => d.path === "heroCardId")).toBe(true);
  });

  it("resolver module never imports React", () => {
    const dir = join(__dirname);
    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    );
    for (const file of files) {
      const src = readFileSync(join(dir, file), "utf8");
      expect(src).not.toMatch(/from ["']react["']/);
      expect(src).not.toMatch(/from ["']react\//);
      expect(src).not.toMatch(/TodayPage/);
      expect(src).not.toMatch(/CoachDiscoveryCard/);
      expect(src).not.toMatch(/MissionSection/);
    }
  });
});
