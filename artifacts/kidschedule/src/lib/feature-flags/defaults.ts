import type { V2BooleanFlagKey, V2FlagSnapshot, V2WedgeId } from "./types";
import { V2_BOOLEAN_FLAG_KEYS } from "./types";

/** Prod-safe defaults: every V2 slice off; cohort 0; wedge id speech (config only). */
export const V2_BOOLEAN_FLAG_DEFAULTS: Record<V2BooleanFlagKey, boolean> =
  Object.fromEntries(V2_BOOLEAN_FLAG_KEYS.map((key) => [key, false])) as Record<
    V2BooleanFlagKey,
    boolean
  >;

export const DEFAULT_V2_ROLLOUT_COHORT = 0;

export const DEFAULT_V2_WEDGE_ID: V2WedgeId = "speech";

export function createDefaultV2FlagSnapshot(): V2FlagSnapshot {
  return {
    ...V2_BOOLEAN_FLAG_DEFAULTS,
    v2_rollout_cohort: DEFAULT_V2_ROLLOUT_COHORT,
    v2_wedge_id: DEFAULT_V2_WEDGE_ID,
  };
}
