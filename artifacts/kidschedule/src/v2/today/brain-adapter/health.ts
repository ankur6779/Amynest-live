import {
  getTodayBrainShadowReadCount,
  lastBrainAvailable,
  lastValidationStatus,
} from "./health-state";
import {
  AMY_TODAY_BRAIN_ADAPTER_VERSION,
  type TodayBrainHealth,
  type TodayBrainSnapshot,
} from "./types";

/**
 * Today Brain Adapter health — developer observation only.
 */
export function getTodayBrainHealth(
  latest?: TodayBrainSnapshot | null,
): TodayBrainHealth {
  return Object.freeze({
    brainAvailable: latest?.brainAvailable ?? lastBrainAvailable(),
    validationStatus: latest?.validationStatus ?? lastValidationStatus(),
    shadowReads: getTodayBrainShadowReadCount(),
    adapterVersion: AMY_TODAY_BRAIN_ADAPTER_VERSION,
  });
}
