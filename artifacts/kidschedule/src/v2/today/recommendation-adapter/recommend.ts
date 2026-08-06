/**
 * getTodayRecommendation — normalize Brain → TodayRecommendation.
 * Never throws. Never blocks Today. Never renders.
 */

import { getTodayBrainSnapshot } from "@/v2/today/brain-adapter";
import type { TodayBrainResolvedSlot } from "@/v2/today/brain-adapter/types";
import { isAmyTodayRecommendationAdapterEnabled } from "./flags";
import { freezeDeep } from "./freeze";
import { recordRecommendationHealth } from "./health-state";
import {
  AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
  type GetTodayRecommendationInput,
  type GetTodayRecommendationOptions,
  type TodayRecommendation,
  type TodayRecommendationConfidence,
  type TodayRecommendationState,
  type TodaySlotRecommendation,
} from "./types";

function toSlot(
  slot: TodayBrainResolvedSlot | null,
): TodaySlotRecommendation | null {
  if (!slot) return null;
  return freezeDeep({
    experienceId: slot.experienceId,
    sourceSlot: slot.sourceSlot,
    promoted: slot.promoted,
    featureIds: slot.featureIds,
    routeIds: slot.routeIds,
    toolIds: slot.toolIds,
  });
}

function emptyRecommendation(
  source: TodayRecommendationState,
  generatedAt: string,
  validationStatus: TodayRecommendation["validationStatus"],
  confidence: TodayRecommendationConfidence,
): TodayRecommendation {
  return freezeDeep({
    heroRecommendation: null,
    secondaryRecommendation: null,
    passiveRecommendation: null,
    recommendationConfidence: confidence,
    validationStatus,
    source,
    generatedAt,
    adapterVersion: AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
  });
}

/**
 * Explicit Today request for a normalized Brain recommendation.
 * Consumption-safe: failures return LEGACY_ONLY / BRAIN_UNAVAILABLE — never throw.
 */
export function getTodayRecommendation(
  input: GetTodayRecommendationInput = {
    resolved: null,
    budget: null,
    validation: null,
  },
  options: GetTodayRecommendationOptions = {},
): TodayRecommendation {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const enabled =
    options.enabled ?? isAmyTodayRecommendationAdapterEnabled();
  const record = options.recordHealth ?? true;

  // Feature flag OFF → Legacy only. Never throw.
  if (!enabled) {
    const rec = emptyRecommendation(
      "LEGACY_ONLY",
      generatedAt,
      "UNAVAILABLE",
      "NONE",
    );
    if (record) {
      recordRecommendationHealth(rec, {
        brainRead: false,
        legacyFallback: true,
        validationFailure: false,
      });
    }
    return rec;
  }

  let brain;
  try {
    brain = getTodayBrainSnapshot(
      {
        resolved: input.resolved,
        budget: input.budget,
        validation: input.validation,
      },
      { now, recordShadowRead: false },
    );
  } catch {
    // Never block Today.
    const rec = emptyRecommendation(
      "BRAIN_UNAVAILABLE",
      generatedAt,
      "UNAVAILABLE",
      "NONE",
    );
    if (record) {
      recordRecommendationHealth(rec, {
        brainRead: true,
        legacyFallback: true,
        validationFailure: false,
      });
    }
    return rec;
  }

  // Brain unavailable → BRAIN_UNAVAILABLE (Today falls back to Legacy).
  if (!brain.brainAvailable) {
    const rec = emptyRecommendation(
      "BRAIN_UNAVAILABLE",
      generatedAt,
      brain.validationStatus,
      "NONE",
    );
    if (record) {
      recordRecommendationHealth(rec, {
        brainRead: true,
        legacyFallback: true,
        validationFailure: false,
      });
    }
    return rec;
  }

  const validationFailed =
    brain.validationStatus === "MISMATCH" ||
    (input.validation != null &&
      input.validation.status === "MISMATCH");

  // Validation failed → LEGACY_ONLY. Never throw.
  if (validationFailed) {
    const rec = emptyRecommendation(
      "LEGACY_ONLY",
      generatedAt,
      brain.validationStatus,
      "NONE",
    );
    if (record) {
      recordRecommendationHealth(rec, {
        brainRead: true,
        legacyFallback: true,
        validationFailure: true,
      });
    }
    return rec;
  }

  const validated = brain.validationPassed;
  const source: TodayRecommendationState = validated
    ? "BRAIN_VALIDATED"
    : "BRAIN_AVAILABLE";
  const confidence: TodayRecommendationConfidence = validated
    ? "HIGH"
    : brain.validationStatus === "PARTIAL_MATCH"
      ? "MEDIUM"
      : "LOW";

  const rec = freezeDeep({
    heroRecommendation: toSlot(brain.resolvedHero),
    secondaryRecommendation: toSlot(brain.resolvedSecondary),
    passiveRecommendation: toSlot(brain.resolvedPassive),
    recommendationConfidence: confidence,
    validationStatus: brain.validationStatus,
    source,
    generatedAt,
    adapterVersion: AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
  }) satisfies TodayRecommendation;

  if (record) {
    recordRecommendationHealth(rec, {
      brainRead: true,
      legacyFallback: false,
      validationFailure: false,
    });
  }

  return rec;
}
