/**
 * Process-local hero activation health + rollback override.
 * Developer only. Not production persistence.
 */

import type {
  TodayHeroActivationResult,
  TodayHeroSource,
} from "./types";

let brainHeroActivations = 0;
let legacyFallbacks = 0;
let resolverFailures = 0;
let validationFailures = 0;
let lastResult: TodayHeroActivationResult | null = null;
let forceLegacy = false;

export function isForceLegacyHero(): boolean {
  return forceLegacy;
}

/** Single-flag style rollback override — entire Today hero → Legacy. */
export function forceLegacyHero(): void {
  forceLegacy = true;
}

export function clearForceLegacyHeroForTests(): void {
  forceLegacy = false;
}

export function recordHeroActivationHealth(
  result: TodayHeroActivationResult,
  meta: {
    resolverFailure: boolean;
    validationFailure: boolean;
  },
): void {
  lastResult = result;
  if (result.active && result.source === "brain") {
    brainHeroActivations += 1;
  } else {
    legacyFallbacks += 1;
  }
  if (meta.resolverFailure) resolverFailures += 1;
  if (meta.validationFailure) validationFailures += 1;
}

export function getLastHeroActivation(): TodayHeroActivationResult | null {
  return lastResult;
}

export function getLastHeroSource(): TodayHeroSource {
  if (forceLegacy) return "legacy";
  return lastResult?.source ?? "legacy";
}

export function getActivationHealthCounters(): {
  brainHeroActivations: number;
  legacyFallbacks: number;
  resolverFailures: number;
  validationFailures: number;
} {
  return {
    brainHeroActivations,
    legacyFallbacks,
    resolverFailures,
    validationFailures,
  };
}

export function clearTodayHeroActivationStateForTests(): void {
  brainHeroActivations = 0;
  legacyFallbacks = 0;
  resolverFailures = 0;
  validationFailures = 0;
  lastResult = null;
  forceLegacy = false;
}
