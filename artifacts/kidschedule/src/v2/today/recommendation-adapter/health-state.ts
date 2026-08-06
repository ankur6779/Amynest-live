/**
 * Process-local recommendation health — developer only.
 * Not production persistence. Never for UI.
 */

import type {
  TodayRecommendation,
  TodayRecommendationState,
} from "./types";

let brainReads = 0;
let legacyFallbacks = 0;
let validationFailures = 0;
let lastRecommendation: TodayRecommendation | null = null;

export function recordRecommendationHealth(
  recommendation: TodayRecommendation,
  meta: {
    brainRead: boolean;
    legacyFallback: boolean;
    validationFailure: boolean;
  },
): void {
  if (meta.brainRead) brainReads += 1;
  if (meta.legacyFallback) legacyFallbacks += 1;
  if (meta.validationFailure) validationFailures += 1;
  lastRecommendation = recommendation;
}

export function getRecommendationSnapshot(): TodayRecommendation | null {
  return lastRecommendation;
}

export function getHealthCounters(): {
  brainReads: number;
  legacyFallbacks: number;
  validationFailures: number;
  recommendationState: TodayRecommendationState | null;
} {
  return {
    brainReads,
    legacyFallbacks,
    validationFailures,
    recommendationState: lastRecommendation?.source ?? null,
  };
}

export function clearTodayRecommendationAdapterStateForTests(): void {
  brainReads = 0;
  legacyFallbacks = 0;
  validationFailures = 0;
  lastRecommendation = null;
}
