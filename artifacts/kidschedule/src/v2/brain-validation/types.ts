/**
 * Amy Brain Shadow Validation Layer.
 * Architecture Freeze v1.0 · Sprint A8.3.
 *
 * Compares Legacy Product Recommendation vs ResolvedDecision only.
 * Never executes Brain. Never replaces Legacy. Never changes production.
 */

import type { MissingReference, ResolvedDecision } from "@/v2/decision-bridge/types";

export const AMY_BRAIN_VALIDATION_VERSION = "amy_brain_validation.v1" as const;

/** Brain pipeline identity for reports — machine only. */
export const AMY_BRAIN_SHADOW_VERSION = "amy_brain.v1" as const;

export type BrainValidationStatus =
  | "MATCH"
  | "PARTIAL_MATCH"
  | "MISMATCH"
  | "UNKNOWN";

export type BrainValidationDimension =
  | "primary_experience"
  | "secondary_experience"
  | "passive_experience"
  | "resolved_feature"
  | "resolved_tool"
  | "resolved_route"
  | "availability"
  | "capability"
  | "premium_restriction"
  | "suppressed_experiences"
  | "missing_references";

/**
 * Normalized Legacy Product Recommendation — injectable snapshot.
 * Not owned by Today / Coach / Ask Amy shells. Compare input only.
 */
export type LegacyExperienceSlot = Readonly<{
  experienceId: string | null;
  featureIds: ReadonlyArray<string>;
  toolIds: ReadonlyArray<string>;
  routeIds: ReadonlyArray<string>;
  /** Legacy surface considered available for this slot. */
  available: boolean | null;
  /** Legacy capability gate passed (null = not asserted). */
  capabilityOk: boolean | null;
  /** Legacy premium lock on this slot (null = not asserted). */
  premiumRestricted: boolean | null;
}>;

export type LegacyProductRecommendation = Readonly<{
  legacyId: string;
  legacyVersion: string;
  primary: LegacyExperienceSlot;
  secondary: LegacyExperienceSlot | null;
  passive: LegacyExperienceSlot | null;
  suppressedExperienceIds: ReadonlyArray<string>;
  /** Feature ids legacy treats as unavailable. */
  unavailableFeatureIds: ReadonlyArray<string>;
  /** Feature ids legacy treats as premium-locked. */
  premiumLockedFeatureIds: ReadonlyArray<string>;
  /** Feature ids legacy treats as capability-blocked. */
  capabilityBlockedFeatureIds: ReadonlyArray<string>;
}>;

/** Machine snapshot of Legacy for the report. */
export type LegacyValidationSnapshot = Readonly<{
  legacyId: string;
  legacyVersion: string;
  primaryExperienceId: string | null;
  secondaryExperienceId: string | null;
  passiveExperienceId: string | null;
  featureIds: ReadonlyArray<string>;
  toolIds: ReadonlyArray<string>;
  routeIds: ReadonlyArray<string>;
  suppressedExperienceIds: ReadonlyArray<string>;
  unavailableFeatureIds: ReadonlyArray<string>;
  premiumLockedFeatureIds: ReadonlyArray<string>;
  capabilityBlockedFeatureIds: ReadonlyArray<string>;
}>;

/** Machine snapshot of Brain ResolvedDecision for the report. */
export type BrainValidationSnapshot = Readonly<{
  decisionId: string;
  primaryExperienceId: string | null;
  secondaryExperienceId: string | null;
  passiveExperienceId: string | null;
  featureIds: ReadonlyArray<string>;
  toolIds: ReadonlyArray<string>;
  routeIds: ReadonlyArray<string>;
  suppressedExperienceIds: ReadonlyArray<string>;
  unavailableFeatureIds: ReadonlyArray<string>;
  premiumLockedFeatureIds: ReadonlyArray<string>;
  capabilityBlockedFeatureIds: ReadonlyArray<string>;
  missingReferences: ReadonlyArray<MissingReference>;
  bridgeVersion: string;
}>;

export type BrainValidationComparisonEntry = Readonly<{
  dimension: BrainValidationDimension;
  status: BrainValidationStatus;
  legacyValue: unknown;
  brainValue: unknown;
  note: string | null;
}>;

export type BrainValidationComparison = Readonly<{
  status: BrainValidationStatus;
  entries: ReadonlyArray<BrainValidationComparisonEntry>;
}>;

export type BrainValidationReport = Readonly<{
  validationId: string;
  brainVersion: typeof AMY_BRAIN_SHADOW_VERSION;
  bridgeVersion: string;
  validationVersion: typeof AMY_BRAIN_VALIDATION_VERSION;
  legacySnapshot: LegacyValidationSnapshot;
  brainSnapshot: BrainValidationSnapshot;
  comparison: BrainValidationComparison;
  status: BrainValidationStatus;
  warnings: ReadonlyArray<string>;
  recommendations: ReadonlyArray<string>;
  generatedAt: string;
}>;

export type RunBrainValidationInput = Readonly<{
  legacy: LegacyProductRecommendation;
  resolved: ResolvedDecision;
  /**
   * Optional suppressed ids from AttentionBudgetResult.
   * ResolvedDecision does not carry suppression — pass through for compare.
   */
  suppressedExperienceIds?: ReadonlyArray<string>;
}>;

export type RunBrainValidationOptions = Readonly<{
  now?: Date;
  /** When false, do not append to developer history (default true for run). */
  recordHistory?: boolean;
}>;

export type BrainValidationHealth = Readonly<{
  totalComparisons: number;
  matches: number;
  partialMatches: number;
  mismatches: number;
  unknown: number;
  lastValidation: string | null;
  brainVersion: typeof AMY_BRAIN_SHADOW_VERSION;
  validationVersion: typeof AMY_BRAIN_VALIDATION_VERSION;
}>;

export type BrainValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type BrainPipelineValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<BrainValidationIssue>;
}>;
