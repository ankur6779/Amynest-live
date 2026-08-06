/**
 * Build machine-only snapshots for Legacy vs Brain comparison.
 */

import type { ResolvedDecision } from "@/v2/decision-bridge/types";
import { freezeDeep } from "./freeze";
import type {
  BrainValidationSnapshot,
  LegacyProductRecommendation,
  LegacyValidationSnapshot,
} from "./types";

function slotFeatureIds(
  legacy: LegacyProductRecommendation,
): string[] {
  const ids = new Set<string>();
  for (const id of legacy.primary.featureIds) ids.add(id);
  for (const id of legacy.secondary?.featureIds ?? []) ids.add(id);
  for (const id of legacy.passive?.featureIds ?? []) ids.add(id);
  return [...ids].sort();
}

function slotToolIds(legacy: LegacyProductRecommendation): string[] {
  const ids = new Set<string>();
  for (const id of legacy.primary.toolIds) ids.add(id);
  for (const id of legacy.secondary?.toolIds ?? []) ids.add(id);
  for (const id of legacy.passive?.toolIds ?? []) ids.add(id);
  return [...ids].sort();
}

function slotRouteIds(legacy: LegacyProductRecommendation): string[] {
  const ids = new Set<string>();
  for (const id of legacy.primary.routeIds) ids.add(id);
  for (const id of legacy.secondary?.routeIds ?? []) ids.add(id);
  for (const id of legacy.passive?.routeIds ?? []) ids.add(id);
  return [...ids].sort();
}

export function buildLegacySnapshot(
  legacy: LegacyProductRecommendation,
): LegacyValidationSnapshot {
  return freezeDeep({
    legacyId: legacy.legacyId,
    legacyVersion: legacy.legacyVersion,
    primaryExperienceId: legacy.primary.experienceId,
    secondaryExperienceId: legacy.secondary?.experienceId ?? null,
    passiveExperienceId: legacy.passive?.experienceId ?? null,
    featureIds: Object.freeze(slotFeatureIds(legacy)),
    toolIds: Object.freeze(slotToolIds(legacy)),
    routeIds: Object.freeze(slotRouteIds(legacy)),
    suppressedExperienceIds: Object.freeze([
      ...legacy.suppressedExperienceIds,
    ]),
    unavailableFeatureIds: Object.freeze([
      ...legacy.unavailableFeatureIds,
    ]),
    premiumLockedFeatureIds: Object.freeze([
      ...legacy.premiumLockedFeatureIds,
    ]),
    capabilityBlockedFeatureIds: Object.freeze([
      ...legacy.capabilityBlockedFeatureIds,
    ]),
  });
}

export function buildBrainSnapshot(
  resolved: ResolvedDecision,
  suppressedExperienceIds: ReadonlyArray<string> = [],
): BrainValidationSnapshot {
  const unavailableFeatureIds = resolved.resolvedFeatures
    .filter((f) => f.availability === "unavailable")
    .map((f) => f.featureId)
    .sort();
  const premiumLockedFeatureIds = resolved.resolvedFeatures
    .filter(
      (f) =>
        f.premiumRequirement !== "none" &&
        f.premiumRequirement !== "" &&
        f.premiumRequirement !== "unknown",
    )
    .map((f) => f.featureId)
    .sort();
  // Tools that cannot run ≈ capability blocked; features with limited+unavailable already covered.
  const capabilityBlockedFeatureIds = [
    ...resolved.resolvedFeatures
      .filter((f) => f.availability === "limited")
      .map((f) => f.featureId),
    ...resolved.resolvedTools
      .filter((t) => t.canRun === false)
      .map((t) => t.toolId),
  ].sort();

  const routeIds = [
    ...new Set(
      resolved.resolvedRoutes.flatMap((r) => [r.path, r.routeId]),
    ),
  ].sort();

  return freezeDeep({
    decisionId: resolved.decisionId,
    primaryExperienceId: resolved.hero?.experienceId ?? null,
    secondaryExperienceId: resolved.secondary?.experienceId ?? null,
    passiveExperienceId: resolved.passive?.experienceId ?? null,
    featureIds: Object.freeze(
      [...resolved.resolvedFeatures.map((f) => f.featureId)].sort(),
    ),
    toolIds: Object.freeze(
      [...resolved.resolvedTools.map((t) => t.toolId)].sort(),
    ),
    routeIds: Object.freeze(routeIds),
    suppressedExperienceIds: Object.freeze([...suppressedExperienceIds]),
    unavailableFeatureIds: Object.freeze(unavailableFeatureIds),
    premiumLockedFeatureIds: Object.freeze(premiumLockedFeatureIds),
    capabilityBlockedFeatureIds: Object.freeze([
      ...new Set(capabilityBlockedFeatureIds),
    ]),
    missingReferences: resolved.missingReferences,
    bridgeVersion: resolved.bridgeVersion,
  });
}
