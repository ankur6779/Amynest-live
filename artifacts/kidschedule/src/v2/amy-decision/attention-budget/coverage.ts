/**
 * attentionCoverage — developer helper only.
 * Fraction of max attention slots filled (0.0–1.0).
 * Not used by production logic.
 */

import type { AttentionBudgetResult } from "./types";

/** Max Hero + Secondary + Passive slots. */
export const ATTENTION_BUDGET_MAX_SLOTS = 3;

/**
 * Compute coverage from a budget result.
 * Prefers the stored field when present; otherwise recomputes.
 */
export function attentionCoverage(budget: AttentionBudgetResult): number {
  if (
    typeof budget.attentionCoverage === "number" &&
    Number.isFinite(budget.attentionCoverage)
  ) {
    return clampCoverage(budget.attentionCoverage);
  }
  return computeAttentionCoverage(budget);
}

export function computeAttentionCoverage(budget: {
  heroExperience: unknown;
  secondaryExperience: unknown;
  passiveExperience: unknown;
}): number {
  let filled = 0;
  if (budget.heroExperience) filled += 1;
  if (budget.secondaryExperience) filled += 1;
  if (budget.passiveExperience) filled += 1;
  return clampCoverage(filled / ATTENTION_BUDGET_MAX_SLOTS);
}

function clampCoverage(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  // Keep stable short floats for snapshots (e.g. 0.333… → 0.3333)
  return Math.round(value * 10000) / 10000;
}
