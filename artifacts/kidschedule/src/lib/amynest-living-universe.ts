/**
 * FA-02 — AmyNest Living Universe production lock.
 *
 * Production-facing AmyNest must be ONE coherent visual universe.
 * Per-module living kill-switches remain for deliberate rollback / mixed
 * development, but cannot create a mixed production face by accident.
 *
 * Master (build-time Vite env):
 *   VITE_FF_AMYNEST_LIVING_UNIVERSE
 *     unset | "" | true | 1 | living  → living universe (all portfolio surfaces ON)
 *     0 | false | legacy              → coherent emergency legacy (all OFF)
 *     mixed | allow_mixed             → honor per-module flags (DEV/TEST ONLY)
 *
 * FA-02 P1 hardening:
 *   production + mixed|allow_mixed is REJECTED (build fails + resolver throws).
 *   No silent remap of production-mixed → living.
 *
 * Vitest / MODE=test defaults to mixed so existing per-module kill-switch
 * unit tests keep working unless the master is explicitly stubbed.
 *
 * No DB · API · RevenueCat · Firebase · Auth · engine changes.
 */

export type AmynestLivingUniverseMode = "living" | "legacy" | "mixed";

/** Canonical portfolio living / sanctuary surface flags (inventory). */
export const AMYNEST_LIVING_SURFACE_FLAGS = [
  "VITE_FF_TODAY_HOME_V1",
  "VITE_FF_PARENT_HUB_ROOMS_V1",
  "VITE_FF_CHILD_DISCOVERY_FILM",
  "VITE_FF_INFANT_CARE_LIVING_V1",
  "VITE_FF_SPEECH_COACH_LIVING_V1",
  "VITE_FF_NUTRITION_LIVING_V1",
  "VITE_FF_HEALTH_LAB_LIVING_V1",
  "VITE_FF_GROW_LIVING_V1",
  "VITE_FF_BIRTH_SKY_LIVING_V1",
  "VITE_FF_ASK_AMY_LIVING_V1",
  "VITE_FF_GUIDANCE_LIVING_V1",
  "VITE_FF_MOMENTS_LIVING_V1",
  "VITE_FF_TALKING_AMY_LIVING_V1",
  "VITE_FF_AMY_COACH_LIVING_V1",
  "VITE_FF_AMY_AUDIO_LIVING_V1",
  "VITE_FF_ROUTINE_LIVING_V1",
] as const;

export type AmynestLivingSurfaceFlag = (typeof AMYNEST_LIVING_SURFACE_FLAGS)[number];

export const AMYNEST_PRODUCTION_MIXED_UNIVERSE_ERROR =
  "FA-02: VITE_FF_AMYNEST_LIVING_UNIVERSE=mixed (or allow_mixed) is forbidden in production. " +
  "Use unset/living/1 for the living universe, or 0/legacy/false for coherent emergency rollback. " +
  "mixed is DEV/TEST only.";

/** True when master raw value requests mixed / allow_mixed. */
export function isAmynestMixedUniverseRaw(
  universeRaw: string | undefined | null,
): boolean {
  return universeRaw === "mixed" || universeRaw === "allow_mixed";
}

/**
 * Pure build/config guard — used by Vite production builds and unit tests.
 * Prefer failing configuration over silently shipping a mixed production face.
 */
export function isProductionMixedUniverseForbidden(
  viteMode: string,
  universeRaw: string | undefined | null,
): boolean {
  return viteMode === "production" && isAmynestMixedUniverseRaw(universeRaw);
}

/** Throw when production + mixed would otherwise be selectable. */
export function assertAmynestLivingUniverseBuildEnv(
  viteMode: string,
  universeRaw: string | undefined | null,
): void {
  if (isProductionMixedUniverseForbidden(viteMode, universeRaw)) {
    throw new Error(AMYNEST_PRODUCTION_MIXED_UNIVERSE_ERROR);
  }
}

function isTestRuntime(): boolean {
  try {
    // Vitest sets VITEST; Vite test mode sets MODE=test.
    const vitestFlag = String(import.meta.env.VITEST ?? "");
    return import.meta.env.MODE === "test" || vitestFlag === "true";
  } catch {
    return false;
  }
}

function isProductionRuntime(): boolean {
  try {
    if (import.meta.env.MODE === "production") return true;
    const prod = import.meta.env.PROD as boolean | string | undefined;
    return prod === true || prod === "true";
  } catch {
    return false;
  }
}

/** Resolve portfolio universe mode from the master build-time flag. */
export function resolveAmynestLivingUniverseMode(): AmynestLivingUniverseMode {
  const raw = import.meta.env.VITE_FF_AMYNEST_LIVING_UNIVERSE;
  if (raw === "0" || raw === "false" || raw === "legacy") return "legacy";
  if (raw === "mixed" || raw === "allow_mixed") {
    // Belt-and-suspenders with Vite build assert: never resolve mixed in production.
    // Do not silently remap to living — reject so mixed cannot ship.
    if (isProductionRuntime()) {
      throw new Error(AMYNEST_PRODUCTION_MIXED_UNIVERSE_ERROR);
    }
    return "mixed";
  }
  if (raw === "true" || raw === "1" || raw === "living") return "living";
  // Default: production/dev → coherent living. Tests → mixed (honor kill switches).
  if (raw === undefined || raw === "") {
    return isTestRuntime() ? "mixed" : "living";
  }
  // Unknown values fail closed to living (production coherence).
  return "living";
}

/**
 * Resolve a portfolio living surface flag under the universe lock.
 * @param individualRaw — raw Vite env string for the module flag
 */
export function resolvePortfolioLivingFlag(
  individualRaw: string | boolean | undefined,
): boolean {
  const mode = resolveAmynestLivingUniverseMode();
  if (mode === "living") return true;
  if (mode === "legacy") return false;

  // mixed — honor per-module kill switch (default ON when unset)
  const raw =
    individualRaw === undefined || individualRaw === null
      ? ""
      : String(individualRaw);
  if (raw === "" || raw === "undefined") return true;
  if (raw === "0" || raw === "false") return false;
  return raw === "true" || raw === "1" || raw === "living";
}

/** True when production-facing face is the living universe. */
export function isAmynestLivingUniverseEnabled(): boolean {
  return resolveAmynestLivingUniverseMode() === "living";
}

/** Document class that gates living global chrome (header / tab bar) styles. */
export const AMYNEST_LIVING_UNIVERSE_DOC_CLASS = "amynest-living-universe";

/**
 * Sync FA-02 living face onto `<html>` / `<body>` so shared chrome CSS can
 * inherit sanctuary tokens. No-op when living OFF (legacy rollback).
 */
export function syncAmynestLivingUniverseDocumentClass(): void {
  if (typeof document === "undefined") return;
  const on = isAmynestLivingUniverseEnabled();
  document.documentElement.classList.toggle(AMYNEST_LIVING_UNIVERSE_DOC_CLASS, on);
  if (document.body) {
    document.body.classList.toggle(AMYNEST_LIVING_UNIVERSE_DOC_CLASS, on);
  }
  const themeMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (themeMeta) {
    themeMeta.setAttribute("content", on ? "#100d16" : "#0b0b0b");
  }
}

/** True when emergency coherent legacy face is active. */
export function isAmynestLegacyUniverseEnabled(): boolean {
  return resolveAmynestLivingUniverseMode() === "legacy";
}

/** True when mixed per-module flags are allowed (dev/test only). */
export function isAmynestMixedLivingAllowed(): boolean {
  return resolveAmynestLivingUniverseMode() === "mixed";
}

/**
 * Snapshot of all portfolio living surfaces under the current universe lock.
 * Useful for diagnostics / tests — not a runtime remote-config client.
 */
export function readAmynestLivingUniverseSnapshot(): {
  mode: AmynestLivingUniverseMode;
  surfaces: Record<AmynestLivingSurfaceFlag, boolean>;
  coherent: boolean;
} {
  const mode = resolveAmynestLivingUniverseMode();
  const surfaces = {} as Record<AmynestLivingSurfaceFlag, boolean>;
  for (const key of AMYNEST_LIVING_SURFACE_FLAGS) {
    const raw = import.meta.env[key] as string | undefined;
    surfaces[key] = resolvePortfolioLivingFlag(raw);
  }
  const values = Object.values(surfaces);
  const coherent = values.every((v) => v === true) || values.every((v) => v === false);
  return { mode, surfaces, coherent };
}
