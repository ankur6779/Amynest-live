/**
 * Boot-time phonics library manifest validation — never throws.
 */
import audioMap from "@/data/phonics-audio-map.json";
import type { PhonicsAudioLibraryManifest } from "@workspace/phonics-sounds";
import { recordPhonicsTelemetry } from "@/lib/phonics-telemetry";

/** Minimum shipped assets — release gate enforces the same floor. */
export const PHONICS_MANIFEST_MIN_ASSETS = 100;

export type PhonicsManifestValidation = {
  ok: boolean;
  assetCount: number;
  missingUrlCount: number;
  manifestVersion: number;
  libraryVersion: number;
  errors: string[];
};

const bundledManifest = audioMap as PhonicsAudioLibraryManifest;

let cachedValidation: PhonicsManifestValidation | null = null;
let bootInitialized = false;

export function validatePhonicsManifest(
  manifest: PhonicsAudioLibraryManifest = bundledManifest,
): PhonicsManifestValidation {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== "object") {
    errors.push("manifest_missing");
    return {
      ok: false,
      assetCount: 0,
      missingUrlCount: 0,
      manifestVersion: 0,
      libraryVersion: 0,
      errors,
    };
  }

  const assets = manifest.assets ?? {};
  const entries = Object.entries(assets);
  let missingUrlCount = 0;

  for (const [catalogKey, asset] of entries) {
    if (!asset?.gcsPath?.startsWith("phonics/")) {
      missingUrlCount += 1;
      if (import.meta.env.DEV) {
        console.warn("[phonics-library] asset missing gcsPath", catalogKey);
      }
    }
  }

  const assetCount = entries.length;

  if (assetCount === 0) errors.push("manifest_assets_empty");
  if (assetCount < PHONICS_MANIFEST_MIN_ASSETS) {
    errors.push(`asset_count_below_min:${assetCount}<${PHONICS_MANIFEST_MIN_ASSETS}`);
  }
  if (missingUrlCount > 0) errors.push(`missing_urls:${missingUrlCount}`);

  return {
    ok: errors.length === 0,
    assetCount,
    missingUrlCount,
    manifestVersion: manifest.version ?? 0,
    libraryVersion: manifest.libraryVersion ?? 0,
    errors,
  };
}

/** Sync boot hook — safe before React mount; records telemetry once. */
export function initPhonicsManifestValidation(): PhonicsManifestValidation {
  if (bootInitialized && cachedValidation) return cachedValidation;
  bootInitialized = true;

  const result = validatePhonicsManifest();
  cachedValidation = result;

  if (result.ok) {
    recordPhonicsTelemetry("phonics_manifest_loaded", {
      assetCount: result.assetCount,
      manifestVersion: result.manifestVersion,
      libraryVersion: result.libraryVersion,
    });
  } else {
    recordPhonicsTelemetry("phonics_manifest_missing", {
      assetCount: result.assetCount,
      missingUrlCount: result.missingUrlCount,
      errors: result.errors,
      manifestVersion: result.manifestVersion,
      libraryVersion: result.libraryVersion,
    });
    console.error("[phonics-library] manifest validation failed", result.errors);
  }

  return result;
}

export function getPhonicsManifestValidation(): PhonicsManifestValidation {
  return cachedValidation ?? validatePhonicsManifest();
}

/** When false, Phonics entry points show a friendly fallback — never crash. */
export function isPhonicsModuleAvailable(): boolean {
  return getPhonicsManifestValidation().ok;
}

/** Test-only reset */
export function resetPhonicsManifestValidationForTests(): void {
  cachedValidation = null;
  bootInitialized = false;
}
