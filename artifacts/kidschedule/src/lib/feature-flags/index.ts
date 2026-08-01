/**
 * AmyNest V2 central feature-flag reader (Sprint 0 · S0-T01).
 *
 * Laws (Engineering Constitution):
 * - Flags own evaluation; product content does not live here.
 * - Prod-like defaults are off until explicitly overridden.
 * - Each risky V2 slice remains independently switchable.
 */

import { createDefaultV2FlagSnapshot, V2_BOOLEAN_FLAG_DEFAULTS } from "./defaults";
import {
  readBooleanFlagFromEnv,
  readRolloutCohortFromEnv,
  readWedgeIdFromEnv,
  v2BooleanFlagEnvKey,
} from "./env";
import {
  V2_BOOLEAN_FLAG_KEYS,
  type V2BooleanFlagKey,
  type V2FlagSnapshot,
  type V2WedgeId,
} from "./types";

export {
  createDefaultV2FlagSnapshot,
  DEFAULT_V2_ROLLOUT_COHORT,
  DEFAULT_V2_WEDGE_ID,
  V2_BOOLEAN_FLAG_DEFAULTS,
} from "./defaults";
export {
  parseBooleanEnv,
  parseCohortPercent,
  parseWedgeId,
  V2_ROLLOUT_COHORT_ENV_KEY,
  V2_WEDGE_ID_ENV_KEY,
  v2BooleanFlagEnvKey,
} from "./env";
export {
  V2_BOOLEAN_FLAG_KEYS,
  type V2BooleanFlagKey,
  type V2FlagSnapshot,
  type V2WedgeId,
} from "./types";

/** Typed getter for a single boolean V2 flag. */
export function isV2FlagEnabled(flag: V2BooleanFlagKey): boolean {
  return readBooleanFlagFromEnv(flag);
}

/** Rollout percent 0–100 (default 0). */
export function getV2RolloutCohortPercent(): number {
  return readRolloutCohortFromEnv();
}

/** Active hero wedge id (MVP freeze: speech). */
export function getV2WedgeId(): V2WedgeId {
  return readWedgeIdFromEnv();
}

/** Full snapshot for diagnostics / tests. */
export function getV2FlagSnapshot(): V2FlagSnapshot {
  const booleans = Object.fromEntries(
    V2_BOOLEAN_FLAG_KEYS.map((key) => [key, readBooleanFlagFromEnv(key)]),
  ) as Record<V2BooleanFlagKey, boolean>;

  return {
    ...booleans,
    v2_rollout_cohort: readRolloutCohortFromEnv(),
    v2_wedge_id: readWedgeIdFromEnv(),
  };
}

/** True when all boolean flags match prod defaults (all false). */
export function areAllV2BooleanFlagsAtDefaultOff(
  snapshot: Pick<V2FlagSnapshot, V2BooleanFlagKey> = getV2FlagSnapshot(),
): boolean {
  return V2_BOOLEAN_FLAG_KEYS.every(
    (key) => snapshot[key] === V2_BOOLEAN_FLAG_DEFAULTS[key],
  );
}

/** Env keys for documentation / CI (does not read values). */
export function listV2BooleanFlagEnvKeys(): string[] {
  return V2_BOOLEAN_FLAG_KEYS.map(v2BooleanFlagEnvKey);
}
