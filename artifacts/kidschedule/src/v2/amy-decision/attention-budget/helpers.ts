import type { AttentionBudgetResult } from "./types";

/** Last computed budget snapshot helper (caller-held — Budget has no storage). */
let lastSnapshot: AttentionBudgetResult | null = null;

/**
 * Remember a computed budget for developer inspection.
 * Not persistence — process-local only. Never for production shells.
 */
export function rememberAttentionBudgetSnapshot(
  budget: AttentionBudgetResult,
): AttentionBudgetResult {
  lastSnapshot = budget;
  return budget;
}

export function getAttentionBudgetSnapshot(): AttentionBudgetResult | null {
  return lastSnapshot;
}

export function clearAttentionBudgetSnapshotForTests(): void {
  lastSnapshot = null;
}

export function hasHero(budget: AttentionBudgetResult): boolean {
  return budget.heroExperience != null;
}

export function hasSecondary(budget: AttentionBudgetResult): boolean {
  return budget.secondaryExperience != null;
}

export function hasPassive(budget: AttentionBudgetResult): boolean {
  return budget.passiveExperience != null;
}
