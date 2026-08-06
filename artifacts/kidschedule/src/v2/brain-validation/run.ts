/**
 * runBrainValidation — shadow compare entrypoint.
 * Generates report and optionally appends developer history.
 * Never executes Brain. Never replaces Legacy.
 */

import { generateBrainValidationReport } from "./report";
import { appendBrainValidationHistory } from "./history";
import { validateBrainPipeline } from "./validate";
import type {
  BrainValidationReport,
  RunBrainValidationInput,
  RunBrainValidationOptions,
} from "./types";

/**
 * Run shadow validation: compare Legacy vs ResolvedDecision only.
 */
export function runBrainValidation(
  input: RunBrainValidationInput,
  options: RunBrainValidationOptions = {},
): BrainValidationReport {
  const pipeline = validateBrainPipeline(input);
  if (!pipeline.ok) {
    // Still produce a report when possible — never throw.
    // If resolved/legacy are unusable, generate with best effort below.
  }

  const report = generateBrainValidationReport(input.legacy, input.resolved, {
    now: options.now,
    suppressedExperienceIds: input.suppressedExperienceIds,
  });

  if (options.recordHistory ?? true) {
    appendBrainValidationHistory(report);
  }

  return report;
}
