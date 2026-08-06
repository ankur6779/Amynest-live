/**
 * Today Brain Adapter — shadow read only.
 * Architecture Freeze v1.0 · Sprint A9.1.
 *
 * Today becomes Brain-aware, not Brain-driven.
 * Legacy Today owns UI. Adapter only observes.
 * Never renders. Never changes CTAs / cards / animation.
 */

import type { AttentionBudgetResult } from "@/v2/amy-decision/attention-budget/types";
import type {
  BrainValidationReport,
  BrainValidationStatus,
} from "@/v2/brain-validation/types";
import type { ResolvedDecision, ResolvedSlot } from "@/v2/decision-bridge/types";

export const AMY_TODAY_BRAIN_ADAPTER_VERSION =
  "amy_today_brain_adapter.v1" as const;

/** Compact slot view for Today shadow observation — machine only. */
export type TodayBrainResolvedSlot = Readonly<{
  experienceId: string;
  sourceSlot: "hero" | "secondary" | "passive";
  promoted: boolean;
  featureIds: ReadonlyArray<string>;
  routeIds: ReadonlyArray<string>;
  toolIds: ReadonlyArray<string>;
}>;

/**
 * Shadow snapshot Today may observe in parallel with Legacy UI.
 * Never used for rendering in A9.1.
 */
export type TodayBrainSnapshot = Readonly<{
  brainAvailable: boolean;
  validationPassed: boolean;
  resolvedHero: TodayBrainResolvedSlot | null;
  resolvedSecondary: TodayBrainResolvedSlot | null;
  resolvedPassive: TodayBrainResolvedSlot | null;
  brainVersion: string | null;
  validationVersion: string | null;
  generatedAt: string;
  adapterVersion: typeof AMY_TODAY_BRAIN_ADAPTER_VERSION;
  /** Echo of validation status when a report was supplied. */
  validationStatus: BrainValidationStatus | "UNAVAILABLE";
}>;

/**
 * Injectable shadow-read inputs.
 * Callers supply Brain outputs — adapter never runs the pipeline.
 */
export type TodayBrainShadowReadInput = Readonly<{
  resolved: ResolvedDecision | null;
  budget: AttentionBudgetResult | null;
  validation: BrainValidationReport | null;
}>;

export type TodayBrainSnapshotOptions = Readonly<{
  now?: Date;
  /** Count this call toward health.shadowReads (default true). */
  recordShadowRead?: boolean;
}>;

/**
 * Legacy Today surface facts for compare — not UI props.
 * Derived by callers from mission / coach / ask-amy presence.
 */
export type LegacyTodaySurface = Readonly<{
  /** Experience Legacy treats as primary (usually speech_mission). */
  primaryExperienceId: string | null;
  /** Experience Legacy shows as secondary (e.g. amy_coach when card visible). */
  secondaryExperienceId: string | null;
  /** Experience Legacy treats as passive (e.g. ask_amy entry). */
  passiveExperienceId: string | null;
  missionId: string | null;
  coachVisible: boolean;
  askAmyVisible: boolean;
}>;

export type TodayLegacyCompareStatus =
  | "MATCH"
  | "PARTIAL_MATCH"
  | "MISMATCH"
  | "UNKNOWN"
  | "BRAIN_UNAVAILABLE";

export type TodayLegacyCompareEntry = Readonly<{
  dimension: "primary" | "secondary" | "passive" | "brain_availability";
  status: TodayLegacyCompareStatus;
  legacyValue: unknown;
  brainValue: unknown;
  note: string | null;
}>;

export type TodayLegacyCompareResult = Readonly<{
  status: TodayLegacyCompareStatus;
  entries: ReadonlyArray<TodayLegacyCompareEntry>;
  adapterVersion: typeof AMY_TODAY_BRAIN_ADAPTER_VERSION;
}>;

export type TodayBrainValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type TodayBrainValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<TodayBrainValidationIssue>;
}>;

export type TodayBrainHealth = Readonly<{
  brainAvailable: boolean;
  validationStatus: BrainValidationStatus | "UNAVAILABLE";
  shadowReads: number;
  adapterVersion: typeof AMY_TODAY_BRAIN_ADAPTER_VERSION;
}>;

/** Re-export convenience for callers typing inputs. */
export type { ResolvedDecision, ResolvedSlot, AttentionBudgetResult };
