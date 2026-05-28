/**
 * Phase 7 — Behavior experiments.
 *
 * Deterministic variant assignment for A/B tests + holdout groups.
 * Outputs the assigned variant + an analytics event payload the caller can
 * forward. Does NOT manage experiment state — the host owns the experiment
 * registry and persists exposure events through existing analytics.
 */

import { bucketForChild } from "./feature-flags";

export interface ExperimentVariant<T extends string = string> {
  key: T;
  /** Weight 0..100. All weights in an experiment must sum to <= 100. */
  weight: number;
  /** Optional human label for dashboards. */
  label?: string;
}

export interface ExperimentDefinition<T extends string = string> {
  key: string;
  /** Default variant returned when the experiment is paused. */
  default: T;
  /** Active variants. */
  variants: ExperimentVariant<T>[];
  /** When true the assignment is forced to the default for everyone. */
  paused?: boolean;
  /** Optional holdout slice (0..100) routed to the default variant. */
  holdoutPercent?: number;
}

export interface ExperimentAssignment<T extends string = string> {
  experimentKey: string;
  variant: T;
  /** True when the user was routed to the holdout (default) variant. */
  isHoldout: boolean;
  bucket: number;
}

export interface ExperimentExposureEvent<T extends string = string> {
  type: "experiment_exposure";
  experimentKey: string;
  variant: T;
  isHoldout: boolean;
  childId: number;
  at: string;
}

/**
 * Resolve the variant for a given child. Stable across calls — the same
 * (experimentKey, childId) always returns the same bucket.
 */
export function assignVariant<T extends string>(
  def: ExperimentDefinition<T>,
  childId: number,
): ExperimentAssignment<T> {
  const bucket = bucketForChild(def.key, childId);
  if (def.paused) {
    return {
      experimentKey: def.key,
      variant: def.default,
      isHoldout: false,
      bucket,
    };
  }
  const holdout = Math.max(0, Math.min(100, def.holdoutPercent ?? 0));
  if (bucket < holdout) {
    return {
      experimentKey: def.key,
      variant: def.default,
      isHoldout: true,
      bucket,
    };
  }
  // Distribute the remaining bucket range across variant weights.
  const remaining = 100 - holdout;
  const relative = bucket - holdout;
  let cumulative = 0;
  for (const v of def.variants) {
    const scaled = (v.weight / 100) * remaining;
    cumulative += scaled;
    if (relative < cumulative) {
      return {
        experimentKey: def.key,
        variant: v.key,
        isHoldout: false,
        bucket,
      };
    }
  }
  return {
    experimentKey: def.key,
    variant: def.default,
    isHoldout: false,
    bucket,
  };
}

export function exposureEvent<T extends string>(
  assignment: ExperimentAssignment<T>,
  childId: number,
  nowIso?: string,
): ExperimentExposureEvent<T> {
  return {
    type: "experiment_exposure",
    experimentKey: assignment.experimentKey,
    variant: assignment.variant,
    isHoldout: assignment.isHoldout,
    childId,
    at: nowIso ?? new Date().toISOString(),
  };
}

/** Canonical experiment keys used by AmyNest. */
export const EXPERIMENT_KEYS = {
  rewardPacing: "reward_pacing_2026q2",
  comebackStrategy: "comeback_strategy_2026q2",
  adaptiveRouting: "adaptive_routing_2026q2",
  sessionSize: "session_size_2026q2",
  onboardingFlow: "onboarding_flow_2026q2",
} as const;
