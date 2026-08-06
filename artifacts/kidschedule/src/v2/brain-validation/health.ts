import {
  AMY_BRAIN_SHADOW_VERSION,
  AMY_BRAIN_VALIDATION_VERSION,
  type BrainValidationHealth,
  type BrainValidationReport,
} from "./types";
import { getBrainValidationHistory, getLatestBrainValidation } from "./history";

/**
 * Aggregate health from developer validation history.
 */
export function getBrainValidationHealth(
  reports?: ReadonlyArray<BrainValidationReport>,
): BrainValidationHealth {
  const list = reports ?? getBrainValidationHistory();
  let matches = 0;
  let partialMatches = 0;
  let mismatches = 0;
  let unknown = 0;
  for (const r of list) {
    if (r.status === "MATCH") matches += 1;
    else if (r.status === "PARTIAL_MATCH") partialMatches += 1;
    else if (r.status === "MISMATCH") mismatches += 1;
    else unknown += 1;
  }
  const latest = reports
    ? reports.length > 0
      ? reports[reports.length - 1]!
      : null
    : getLatestBrainValidation();

  return Object.freeze({
    totalComparisons: list.length,
    matches,
    partialMatches,
    mismatches,
    unknown,
    lastValidation: latest?.generatedAt ?? null,
    brainVersion: AMY_BRAIN_SHADOW_VERSION,
    validationVersion: AMY_BRAIN_VALIDATION_VERSION,
  });
}
