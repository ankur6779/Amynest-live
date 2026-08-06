import { resolveDecision } from "./resolve";
import type {
  DecisionResolutionExplanation,
  ResolveDecisionInput,
  ResolveDecisionOptions,
} from "./types";

/**
 * Machine-readable resolution explanation.
 * Developer / QA only — not for AI or users.
 */
export function explainDecisionResolution(
  input: ResolveDecisionInput,
  options: ResolveDecisionOptions = {},
): DecisionResolutionExplanation {
  const resolved = resolveDecision(input, options);
  return Object.freeze({
    decisionId: resolved.decisionId,
    stabilityToken: resolved.stabilityToken,
    heroExperienceId: resolved.hero?.experienceId ?? null,
    secondaryExperienceId: resolved.secondary?.experienceId ?? null,
    passiveExperienceId: resolved.passive?.experienceId ?? null,
    resolvedFeatureCount: resolved.resolvedFeatures.length,
    resolvedToolCount: resolved.resolvedTools.length,
    resolvedRouteCount: resolved.resolvedRoutes.length,
    missingCount: resolved.missingReferences.length,
    missingReferences: resolved.missingReferences,
    resolutionTrace: resolved.resolutionTrace,
    provenance: resolved.provenance,
    bridgeVersion: resolved.bridgeVersion,
  });
}
