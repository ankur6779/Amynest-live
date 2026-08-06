/**
 * Amy Brain Shadow Validation Layer (Sprint A8.3).
 * Compare-only. Never executes. Never replaces Legacy. Never binds shells.
 */

export {
  AMY_BRAIN_SHADOW_VERSION,
  AMY_BRAIN_VALIDATION_VERSION,
  type BrainPipelineValidationResult,
  type BrainValidationComparison,
  type BrainValidationComparisonEntry,
  type BrainValidationDimension,
  type BrainValidationHealth,
  type BrainValidationIssue,
  type BrainValidationReport,
  type BrainValidationSnapshot,
  type BrainValidationStatus,
  type LegacyExperienceSlot,
  type LegacyProductRecommendation,
  type LegacyValidationSnapshot,
  type RunBrainValidationInput,
  type RunBrainValidationOptions,
} from "./types";

export { compareLegacyWithBrain } from "./compare";
export { generateBrainValidationReport } from "./report";
export { runBrainValidation } from "./run";
export { validateBrainPipeline } from "./validate";
export { getBrainValidationHealth } from "./health";
export {
  clearBrainValidationHistory,
  getBrainValidationHistory,
  getLatestBrainValidation,
} from "./history";
export { isAmyBrainShadowValidationEnabled } from "./flags";
