/**
 * Attention Budget — allocates visibility slots only.
 * Architecture Freeze v1.0 · Sprint A7.
 *
 * Never creates / changes Decisions.
 * Never changes Cooldown, History, Context, or Memory.
 * Computed only — never persisted.
 */

import type { DecisionCooldownResult } from "../cooldown/types";
import type { StableDecisionResult } from "../stability/types";

export const AMY_ATTENTION_BUDGET_VERSION = "amy_attention_budget.v1" as const;

export type AttentionBudgetState = "VALID" | "PARTIAL" | "EMPTY";

/** Machine-readable suppression / allocation reasons — no UI. */
export type AttentionBudgetReasonCode =
  | "ALLOCATED_HERO"
  | "ALLOCATED_SECONDARY"
  | "ALLOCATED_PASSIVE"
  | "PROMOTED_TO_HERO"
  | "PROMOTED_TO_SECONDARY"
  | "SUPPRESSED_COOLDOWN"
  | "SUPPRESSED_LOWER_PRIORITY"
  | "SUPPRESSED_POLICY"
  | "SUPPRESSED_CAPABILITY"
  | "SUPPRESSED_PREMIUM"
  | "SUPPRESSED_SAFETY"
  | "SUPPRESSED_UNKNOWN_CAPABILITY"
  | "NO_CANDIDATES"
  | "GUEST_MODE"
  | "SIGNED_IN";

export type AttentionBudgetSlot = "hero" | "secondary" | "passive";

export type AttentionBudgetExperienceRef = Readonly<{
  experienceId: string;
  /** Original Decision slot before promotion. */
  sourceSlot: AttentionBudgetSlot;
  /** True when this slot was filled by promoting a lower Decision slot. */
  promoted: boolean;
}>;

export type SuppressedExperience = Readonly<{
  experienceId: string;
  sourceSlot: AttentionBudgetSlot;
  reasonCodes: ReadonlyArray<AttentionBudgetReasonCode>;
}>;

/**
 * One machine-readable step in Decision-candidate order.
 * Developer / QA only — never UI, never AI.
 */
export type AttentionAllocationTraceStep = Readonly<{
  experienceId: string;
  sourceSlot: AttentionBudgetSlot;
  /** Eligibility before slot fill. */
  eligibility: "ELIGIBLE" | "SUPPRESSED";
  /** Final budget slot, or null when suppressed / unfilled. */
  allocatedSlot: AttentionBudgetSlot | null;
  promoted: boolean;
  reasonCodes: ReadonlyArray<AttentionBudgetReasonCode>;
}>;

/**
 * Machine-readable allocation flow trace.
 * Example: Speech ELIGIBLE→hero · Coach SUPPRESSED(cooldown) · Ask Amy→secondary · For Child→passive
 */
export type AttentionAllocationTrace = Readonly<{
  kind: "amy_attention_allocation_trace.v1";
  steps: ReadonlyArray<AttentionAllocationTraceStep>;
}>;

export type AttentionBudgetResult = Readonly<{
  heroExperience: AttentionBudgetExperienceRef | null;
  secondaryExperience: AttentionBudgetExperienceRef | null;
  passiveExperience: AttentionBudgetExperienceRef | null;
  suppressedExperiences: ReadonlyArray<SuppressedExperience>;
  budgetState: AttentionBudgetState;
  budgetVersion: typeof AMY_ATTENTION_BUDGET_VERSION;
  allocationReasonCodes: ReadonlyArray<AttentionBudgetReasonCode>;
  generatedAt: string;
  /**
   * Machine-readable allocation flow — developer only.
   * Never UI. Never AI.
   */
  allocationTrace: AttentionAllocationTrace;
  /**
   * Fraction of max budget slots filled (0.0–1.0).
   * Developer metric only — not used by production logic.
   */
  attentionCoverage: number;
}>;

/**
 * Optional restriction facts — never UI.
 * Used for capability / premium / safety / policy suppression tests.
 */
export type AttentionBudgetRestrictions = Readonly<{
  unavailableExperienceIds?: ReadonlyArray<string>;
  premiumLockedExperienceIds?: ReadonlyArray<string>;
  safetyBlockedExperienceIds?: ReadonlyArray<string>;
  policyBlockedExperienceIds?: ReadonlyArray<string>;
}>;

export type AllocateAttentionBudgetInput = Readonly<{
  stable: StableDecisionResult;
  /** Pipeline cooldown result (typically primary). */
  cooldown: DecisionCooldownResult;
  /**
   * Optional cooldown results for secondary / passive.
   * Missing experienceIds are treated as eligible.
   */
  additionalCooldowns?: ReadonlyArray<DecisionCooldownResult>;
  restrictions?: AttentionBudgetRestrictions;
}>;

export type AllocateAttentionBudgetOptions = Readonly<{
  now?: Date;
}>;

export type AttentionBudgetValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type AttentionBudgetValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<AttentionBudgetValidationIssue>;
}>;

export type AttentionBudgetDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;

export type AttentionAllocationExplanation = Readonly<{
  budgetState: AttentionBudgetState;
  heroExperienceId: string | null;
  secondaryExperienceId: string | null;
  passiveExperienceId: string | null;
  suppressedCount: number;
  promotedHero: boolean;
  promotedSecondary: boolean;
  allocationReasonCodes: ReadonlyArray<AttentionBudgetReasonCode>;
  suppressed: ReadonlyArray<SuppressedExperience>;
  allocationTrace: AttentionAllocationTrace;
  attentionCoverage: number;
}>;

export type { DecisionCooldownResult, StableDecisionResult };
