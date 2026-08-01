import {
  DEFAULT_V2_ROLLOUT_COHORT,
  DEFAULT_V2_WEDGE_ID,
  V2_BOOLEAN_FLAG_DEFAULTS,
} from "./defaults";
import type { V2BooleanFlagKey, V2WedgeId } from "./types";

/** Env key for a boolean V2 flag, e.g. new_front_door → VITE_V2_FF_NEW_FRONT_DOOR */
export function v2BooleanFlagEnvKey(flag: V2BooleanFlagKey): string {
  return `VITE_V2_FF_${flag.toUpperCase()}`;
}

export const V2_ROLLOUT_COHORT_ENV_KEY = "VITE_V2_ROLLOUT_COHORT";
export const V2_WEDGE_ID_ENV_KEY = "VITE_V2_WEDGE_ID";

function readEnvRaw(key: string): string | undefined {
  try {
    const env = import.meta.env as Record<string, string | boolean | undefined>;
    const raw = env[key];
    if (raw === undefined || raw === "") return undefined;
    return String(raw);
  } catch {
    return undefined;
  }
}

export function parseBooleanEnv(
  raw: string | undefined,
  defaultValue: boolean,
): boolean {
  if (raw === undefined || raw === "") return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "off") {
    return false;
  }
  return defaultValue;
}

export function parseCohortPercent(
  raw: string | undefined,
  defaultValue: number,
): number {
  if (raw === undefined || raw === "") return defaultValue;
  const n = Number(raw);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(100, Math.max(0, Math.floor(n)));
}

export function parseWedgeId(
  raw: string | undefined,
  defaultValue: V2WedgeId,
): V2WedgeId {
  if (raw === undefined || raw === "") return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "speech") return "speech";
  return defaultValue;
}

export function readBooleanFlagFromEnv(flag: V2BooleanFlagKey): boolean {
  return parseBooleanEnv(
    readEnvRaw(v2BooleanFlagEnvKey(flag)),
    V2_BOOLEAN_FLAG_DEFAULTS[flag],
  );
}

export function readRolloutCohortFromEnv(): number {
  return parseCohortPercent(
    readEnvRaw(V2_ROLLOUT_COHORT_ENV_KEY),
    DEFAULT_V2_ROLLOUT_COHORT,
  );
}

export function readWedgeIdFromEnv(): V2WedgeId {
  return parseWedgeId(readEnvRaw(V2_WEDGE_ID_ENV_KEY), DEFAULT_V2_WEDGE_ID);
}
