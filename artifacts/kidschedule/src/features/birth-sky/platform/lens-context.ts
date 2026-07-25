/**
 * Read-only Lens context contract (Pack 9 §2.1, Pack 10 facades).
 * Never exposes mutable objects to lenses.
 */

import type { BirthProfile, SkySnapshot } from "../domain/models/birth-profile";
import { TRADITIONAL_CONTENT_VERSION } from "../constants/traditional-content";
import { BIRTH_SKY_CONTEXT_SCHEMA_VERSION } from "../constants/ai-context";
import { BIRTH_SKY_LENS_SDK_VERSION } from "./constants";
import {
  hasLensPermission,
  type LensPermission,
} from "./permissions";

export type LensAiEntitlementState = {
  readonly freeInsightsUsed: number;
  readonly isPremium: boolean;
};

export type LensVersionBundle = {
  readonly snapshotVersion: string | null;
  readonly engineVersion: string | null;
  readonly traditionalContentVersion: string;
  readonly contextSchemaVersion: string;
  readonly lensVersion: string;
  readonly sdkVersion: string;
};

export type LensReadonlyContext = {
  readonly authUserId: string | null;
  readonly childId: number | null;
  readonly profile: Readonly<BirthProfile> | null;
  readonly snapshot: Readonly<SkySnapshot> | null;
  readonly versions: LensVersionBundle;
  readonly daySky: boolean;
  readonly aiEntitlement: LensAiEntitlementState;
};

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;
  for (const key of Object.keys(value as object)) {
    const child = (value as Record<string, unknown>)[key];
    if (child && typeof child === "object") deepFreeze(child);
  }
  return Object.freeze(value);
}

export type BuildLensContextInput = {
  lensId: string;
  lensVersion: string;
  permissions: ReadonlySet<LensPermission>;
  authUserId: string | null;
  childId: number | null;
  profile: BirthProfile | null;
  snapshot: SkySnapshot | null;
  aiEntitlement: LensAiEntitlementState;
};

/**
 * Build a permission-filtered, deeply frozen context.
 * Missing grants → null fields (fail closed), never mutable refs.
 */
export function buildLensReadonlyContext(input: BuildLensContextInput): LensReadonlyContext {
  const canProfile = hasLensPermission(input.permissions, "read_profile");
  const canSnapshot =
    hasLensPermission(input.permissions, "read_snapshot") ||
    hasLensPermission(input.permissions, "read_astronomy");

  const profile =
    canProfile && input.profile
      ? deepFreeze(structuredClone(input.profile))
      : null;
  const snapshot =
    canSnapshot && input.snapshot
      ? deepFreeze(structuredClone(input.snapshot))
      : null;

  const daySky = snapshot?.mode === "day_sky" || input.profile?.timePrecision === "unknown";

  return Object.freeze({
    authUserId: input.authUserId,
    childId: input.childId,
    profile,
    snapshot,
    versions: Object.freeze({
      snapshotVersion: snapshot?.snapshotVersion ?? null,
      engineVersion: snapshot?.engineVersion ?? null,
      traditionalContentVersion: TRADITIONAL_CONTENT_VERSION,
      contextSchemaVersion: BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
      lensVersion: input.lensVersion,
      sdkVersion: BIRTH_SKY_LENS_SDK_VERSION,
    }),
    daySky: Boolean(daySky),
    aiEntitlement: Object.freeze({ ...input.aiEntitlement }),
  });
}

/** structuredClone polyfill path for test envs without it. */
function structuredClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
