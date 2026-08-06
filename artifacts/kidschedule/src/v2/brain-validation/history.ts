/**
 * Developer-only append-only validation history.
 * Process-local — not production persistence. Never for shells.
 */

import type { BrainValidationReport } from "./types";

const MAX_HISTORY = 100;

let history: BrainValidationReport[] = [];

export function appendBrainValidationHistory(
  report: BrainValidationReport,
): BrainValidationReport {
  history = [...history, report].slice(-MAX_HISTORY);
  return report;
}

export function getLatestBrainValidation(): BrainValidationReport | null {
  if (history.length === 0) return null;
  return history[history.length - 1]!;
}

export function getBrainValidationHistory(): ReadonlyArray<BrainValidationReport> {
  return Object.freeze([...history]);
}

export function clearBrainValidationHistory(): void {
  history = [];
}
