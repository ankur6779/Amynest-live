/**
 * generateBrainValidationReport — pure report builder.
 * Does not append history. Does not execute Brain.
 */

import type { ResolvedDecision } from "@/v2/decision-bridge/types";
import { compareLegacyWithBrain } from "./compare";
import { freezeDeep } from "./freeze";
import { buildBrainSnapshot, buildLegacySnapshot } from "./snapshots";
import {
  AMY_BRAIN_SHADOW_VERSION,
  AMY_BRAIN_VALIDATION_VERSION,
  type BrainValidationReport,
  type BrainValidationStatus,
  type LegacyProductRecommendation,
  type RunBrainValidationOptions,
} from "./types";

function validationIdOf(
  legacyId: string,
  decisionId: string,
  generatedAt: string,
  status: BrainValidationStatus,
): string {
  // Deterministic id for developer history — not a cryptographic hash.
  return `bv_${legacyId}_${decisionId}_${status}_${generatedAt}`;
}

function buildWarnings(
  status: BrainValidationStatus,
  comparison: BrainValidationReport["comparison"],
): string[] {
  const warnings: string[] = [];
  if (status === "PARTIAL_MATCH") {
    warnings.push("PARTIAL_MATCH: some dimensions diverge or are incomplete");
  }
  if (status === "MISMATCH") {
    warnings.push("MISMATCH: Brain and Legacy disagree on one or more dimensions");
  }
  if (status === "UNKNOWN") {
    warnings.push("UNKNOWN: insufficient Legacy or Brain data to compare");
  }
  for (const e of comparison.entries) {
    if (e.status === "MATCH" && !e.note) continue;
    if (e.note) warnings.push(`${e.dimension}: ${e.note}`);
    else if (e.status !== "MATCH") warnings.push(`${e.dimension}: ${e.status}`);
  }
  return warnings;
}

function buildRecommendations(
  status: BrainValidationStatus,
  comparison: BrainValidationReport["comparison"],
): string[] {
  const recs: string[] = [];
  if (status === "MATCH") {
    recs.push("Shadow validation MATCH — safe to keep Legacy authoritative");
    return recs;
  }
  for (const e of comparison.entries) {
    if (e.status === "MISMATCH" && e.dimension === "primary_experience") {
      recs.push(
        "Investigate primary experience mapping before any shell bind",
      );
    }
    if (e.status === "MISMATCH" && e.dimension === "resolved_feature") {
      recs.push("Align Feature Registry refs with Legacy product surface");
    }
    if (e.status === "MISMATCH" && e.dimension === "resolved_route") {
      recs.push("Align Route Registry paths with Legacy navigation");
    }
    if (e.status === "PARTIAL_MATCH" && e.dimension === "missing_references") {
      recs.push("Review missingReferences before enabling Brain consumers");
    }
    if (e.status === "MISMATCH" && e.dimension === "premium_restriction") {
      recs.push("Reconcile premium locks between Legacy and adapted features");
    }
    if (e.status === "MISMATCH" && e.dimension === "capability") {
      recs.push("Reconcile capability gates between Legacy and Brain adapters");
    }
  }
  if (recs.length === 0) {
    recs.push("Keep Legacy authoritative; continue shadow compare only");
  }
  return [...new Set(recs)];
}

/**
 * Pure report generation from Legacy + ResolvedDecision.
 */
export function generateBrainValidationReport(
  legacy: LegacyProductRecommendation,
  resolved: ResolvedDecision,
  options: RunBrainValidationOptions & {
    suppressedExperienceIds?: ReadonlyArray<string>;
  } = {},
): BrainValidationReport {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const suppressed = options.suppressedExperienceIds ?? [];

  const comparison = compareLegacyWithBrain(legacy, resolved, {
    suppressedExperienceIds: suppressed,
  });
  const legacySnapshot = buildLegacySnapshot(legacy);
  const brainSnapshot = buildBrainSnapshot(resolved, suppressed);
  const status = comparison.status;
  const warnings = buildWarnings(status, comparison);
  const recommendations = buildRecommendations(status, comparison);

  return freezeDeep({
    validationId: validationIdOf(
      legacy.legacyId,
      resolved.decisionId,
      generatedAt,
      status,
    ),
    brainVersion: AMY_BRAIN_SHADOW_VERSION,
    bridgeVersion: resolved.bridgeVersion,
    validationVersion: AMY_BRAIN_VALIDATION_VERSION,
    legacySnapshot,
    brainSnapshot,
    comparison,
    status,
    warnings: Object.freeze(warnings),
    recommendations: Object.freeze(recommendations),
    generatedAt,
  });
}
