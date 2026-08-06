/**
 * Today Brain Adapter (Sprint A9.1) — shadow read only.
 * Legacy Today owns UI. Brain owns recommendations. Adapter only observes.
 */

export {
  AMY_TODAY_BRAIN_ADAPTER_VERSION,
  type LegacyTodaySurface,
  type TodayBrainHealth,
  type TodayBrainResolvedSlot,
  type TodayBrainShadowReadInput,
  type TodayBrainSnapshot,
  type TodayBrainSnapshotOptions,
  type TodayBrainValidationIssue,
  type TodayBrainValidationResult,
  type TodayLegacyCompareEntry,
  type TodayLegacyCompareResult,
  type TodayLegacyCompareStatus,
} from "./types";

export { getTodayBrainSnapshot } from "./snapshot";
export { validateTodayBrain } from "./validate";
export { compareTodayLegacy } from "./compare";
export { getTodayBrainHealth } from "./health";
export {
  clearTodayBrainAdapterStateForTests,
  getLastTodayBrainSnapshot,
} from "./health-state";
export { isAmyTodayBrainAdapterEnabled } from "./flags";
