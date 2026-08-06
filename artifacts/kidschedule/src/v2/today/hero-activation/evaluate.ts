/**
 * Hero Activation Gate — Mission card ONLY.
 * Validation MATCH + flag ON + resolver success → Brain Mission Hero.
 * Otherwise Legacy Hero. Never throws.
 */

import { TODAY_EXISTING_CARD_IDS } from "@/v2/today/recommendation-resolver/cards";
import { isAmyTodayBrainHeroEnabled } from "./flags";
import { freezeDeep } from "./freeze";
import {
  isForceLegacyHero,
  recordHeroActivationHealth,
} from "./health-state";
import {
  AMY_TODAY_HERO_ACTIVATION_VERSION,
  type TodayHeroActivationInput,
  type TodayHeroActivationOptions,
  type TodayHeroActivationReason,
  type TodayHeroActivationResult,
} from "./types";

function legacyResult(
  reason: TodayHeroActivationReason,
  generatedAt: string,
): TodayHeroActivationResult {
  return freezeDeep({
    active: false,
    source: "legacy",
    heroCardId: null,
    reason,
    activationVersion: AMY_TODAY_HERO_ACTIVATION_VERSION,
    generatedAt,
  });
}

function resolverSuccess(input: TodayHeroActivationInput): boolean {
  const { recommendation, renderable } = input;
  if (!recommendation || !renderable) return false;
  if (renderable.legacyFallback) return false;
  if (renderable.heroCardId !== TODAY_EXISTING_CARD_IDS.mission) return false;
  if (recommendation.heroRecommendation?.experienceId !== "speech_mission") {
    return false;
  }
  // Mission must not be listed as missing.
  if (renderable.missingCards.includes("speech_mission")) return false;
  return true;
}

/**
 * Evaluate whether Brain may control the Mission Hero card.
 * Coach / Ask Amy / Premium / For Child are never activated here.
 */
export function evaluateTodayHeroActivation(
  input: TodayHeroActivationInput = {
    recommendation: null,
    renderable: null,
    validationStatus: null,
  },
  options: TodayHeroActivationOptions = {},
): TodayHeroActivationResult {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const enabled = options.enabled ?? isAmyTodayBrainHeroEnabled();
  const record = options.recordHealth ?? true;

  let result: TodayHeroActivationResult;
  let resolverFailure = false;
  let validationFailure = false;

  if (isForceLegacyHero()) {
    result = legacyResult("FORCE_LEGACY", generatedAt);
  } else if (!enabled) {
    result = legacyResult("FLAG_OFF", generatedAt);
  } else if (
    input.recommendation == null ||
    input.renderable == null ||
    input.validationStatus == null
  ) {
    result = legacyResult("MISSING_INPUT", generatedAt);
  } else if (input.validationStatus !== "MATCH") {
    validationFailure = true;
    result = legacyResult("VALIDATION_NOT_MATCH", generatedAt);
  } else if (!resolverSuccess(input)) {
    resolverFailure = true;
    result = legacyResult("RESOLVER_FAILURE", generatedAt);
  } else if (
    // Defense: never activate non-mission experiences as Hero.
    input.recommendation.heroRecommendation?.experienceId !== "speech_mission"
  ) {
    result = legacyResult("HERO_NOT_MISSION", generatedAt);
  } else {
    result = freezeDeep({
      active: true,
      source: "brain",
      heroCardId: TODAY_EXISTING_CARD_IDS.mission,
      reason: "BRAIN_HERO_ACTIVE",
      activationVersion: AMY_TODAY_HERO_ACTIVATION_VERSION,
      generatedAt,
    });
  }

  if (record) {
    recordHeroActivationHealth(result, {
      resolverFailure,
      validationFailure,
    });
  }

  return result;
}
