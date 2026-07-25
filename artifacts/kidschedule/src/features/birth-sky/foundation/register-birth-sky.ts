/**
 * Registers the primary birth_sky lens (Pack 1 §1.1, Pack 9).
 * Idempotent under StrictMode double-effects and HMR re-entry.
 * IM-6: uses Lens Platform registry (Pack 10) — product behavior unchanged.
 */

import { isBirthSkyEnabled } from "../lib/feature-flags";
import { BIRTH_SKY_LENS_SDK_VERSION } from "../platform/constants";
import {
  hasBirthSkyFoundationBootstrappedOnce,
  markBirthSkyFoundationBootstrappedOnce,
} from "./bootstrap-guard";
import { getLens, registerLens, setLensState } from "./lens-registry";

const BIRTH_SKY_METADATA = {
  lensId: "birth_sky",
  displayName: "Birth Sky",
  description: "The sky when they arrived",
  lensVersion: "1.0.0",
  sdkVersion: BIRTH_SKY_LENS_SDK_VERSION,
  capabilities: [
    "requiresBirthProfile",
    "requiresSkySnapshot",
    "optionalTraditional",
    "supportsOfflineCache",
    "participatesExport",
    "participatesDelete",
    "hasOwnCompute",
    "parentOnly",
    "providesSettings",
    "contributesAiContext",
    "providesDashboardPanel",
  ],
  featureFlag: "VITE_FF_BIRTH_SKY",
  orderHint: 0,
  privacyScopes: [
    "astronomy_compute",
    "traditional_optional",
    "amy_insights_optional",
  ],
  owner: "birth-sky-core",
} as const;

/**
 * Idempotent Foundation bootstrap (Pack 1 §1.3 / §1.5).
 * - registerLens is idempotent by lensId (no duplicate entries).
 * - globalOnce guard prevents redundant work across StrictMode/HMR.
 * - Always re-syncs availability from the current kill switch.
 */
export function registerBirthSkyFoundation(): void {
  const already = getLens("birth_sky");
  if (!already) {
    registerLens({
      ...BIRTH_SKY_METADATA,
      capabilities: [...BIRTH_SKY_METADATA.capabilities],
      privacyScopes: [...BIRTH_SKY_METADATA.privacyScopes],
    });
  } else {
    // Idempotent re-entry — same manifest.
    registerLens({
      ...BIRTH_SKY_METADATA,
      capabilities: [...BIRTH_SKY_METADATA.capabilities],
      privacyScopes: [...BIRTH_SKY_METADATA.privacyScopes],
    });
  }

  if (!hasBirthSkyFoundationBootstrappedOnce()) {
    markBirthSkyFoundationBootstrappedOnce();
  }

  syncBirthSkyLensAvailability();
}

export function syncBirthSkyLensAvailability(): void {
  const enabled = isBirthSkyEnabled();
  setLensState("birth_sky", enabled ? "available" : "disabled");
}

export function isBirthSkyFoundationBootstrapped(): boolean {
  return Boolean(getLens("birth_sky")) && hasBirthSkyFoundationBootstrappedOnce();
}
