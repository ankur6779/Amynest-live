/**
 * Today Recommendation Adapter.
 * Architecture Freeze v1.0 · Sprint A9.2.
 *
 * Normalizes Amy Brain outputs into TodayRecommendation.
 * Today decides whether to consume. Brain never renders.
 * Never changes Legacy Today UI.
 */

import type { AttentionBudgetResult } from "@/v2/amy-decision/attention-budget/types";
import type {
  BrainValidationReport,
  BrainValidationStatus,
} from "@/v2/brain-validation/types";
import type { ResolvedDecision } from "@/v2/decision-bridge/types";
import type { TodayBrainResolvedSlot } from "@/v2/today/brain-adapter/types";

export const AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION =
  "amy_today_recommendation_adapter.v1" as const;

export type TodayRecommendationState =
  | "LEGACY_ONLY"
  | "BRAIN_AVAILABLE"
  | "BRAIN_VALIDATED"
  | "BRAIN_UNAVAILABLE";

export type TodayRecommendationConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "NONE";

/** One normalized slot recommendation — machine / observe only. */
export type TodaySlotRecommendation = Readonly<{
  experienceId: string;
  sourceSlot: "hero" | "secondary" | "passive";
  promoted: boolean;
  featureIds: ReadonlyArray<string>;
  routeIds: ReadonlyArray<string>;
  toolIds: ReadonlyArray<string>;
}>;

/**
 * Normalized recommendation for Today.
 * Observable only in A9.2 — never drives UI.
 */
export type TodayRecommendation = Readonly<{
  heroRecommendation: TodaySlotRecommendation | null;
  secondaryRecommendation: TodaySlotRecommendation | null;
  passiveRecommendation: TodaySlotRecommendation | null;
  recommendationConfidence: TodayRecommendationConfidence;
  validationStatus: BrainValidationStatus | "UNAVAILABLE";
  /** Recommendation state / source for consumption decisions. */
  source: TodayRecommendationState;
  generatedAt: string;
  adapterVersion: typeof AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION;
}>;

export type GetTodayRecommendationInput = Readonly<{
  resolved: ResolvedDecision | null;
  budget: AttentionBudgetResult | null;
  validation: BrainValidationReport | null;
}>;

export type GetTodayRecommendationOptions = Readonly<{
  now?: Date;
  /**
   * Force flag evaluation. Default reads env flag.
   * Tests may pass true to exercise Brain paths while global flag stays OFF.
   */
  enabled?: boolean;
  /** Count toward health (default true). */
  recordHealth?: boolean;
}>;

export type TodayRecommendationValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type TodayRecommendationValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<TodayRecommendationValidationIssue>;
}>;

export type LegacyRecommendationSurface = Readonly<{
  primaryExperienceId: string | null;
  secondaryExperienceId: string | null;
  passiveExperienceId: string | null;
}>;

export type LegacyRecommendationCompareStatus =
  | "MATCH"
  | "PARTIAL_MATCH"
  | "MISMATCH"
  | "UNKNOWN"
  | "LEGACY_ONLY";

export type LegacyRecommendationCompareEntry = Readonly<{
  dimension: "hero" | "secondary" | "passive" | "source";
  status: LegacyRecommendationCompareStatus;
  legacyValue: unknown;
  recommendationValue: unknown;
  note: string | null;
}>;

export type LegacyRecommendationCompareResult = Readonly<{
  status: LegacyRecommendationCompareStatus;
  entries: ReadonlyArray<LegacyRecommendationCompareEntry>;
  adapterVersion: typeof AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION;
}>;

export type TodayRecommendationHealth = Readonly<{
  brainReads: number;
  legacyFallbacks: number;
  validationFailures: number;
  recommendationState: TodayRecommendationState | null;
  adapterVersion: typeof AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION;
}>;

/** Re-export for callers composing slot views. */
export type { TodayBrainResolvedSlot };
