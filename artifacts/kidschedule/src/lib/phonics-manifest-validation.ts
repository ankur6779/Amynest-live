/**
 * Boot-time phonics library manifest validation — never throws.
 */
import type { PhonicsAudioLibraryManifest } from "@workspace/phonics-sounds";
import {
  getPhonicsBundledManifestSync,
  getPhonicsBundledMeta,
  isPhonicsBundledManifestShipped,
  preloadPhonicsBundledManifest,
} from "@/lib/phonics-bundled-manifest";
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

const VALIDATION_CACHE_KEY = "__amynestPhonicsManifestValidation";

function readCachedValidation(): PhonicsManifestValidation | null {
  const shared = (globalThis as Record<string, unknown>)[VALIDATION_CACHE_KEY];
  return shared && typeof shared === "object" ? (shared as PhonicsManifestValidation) : null;
}

function writeCachedValidation(result: PhonicsManifestValidation): PhonicsManifestValidation {
  (globalThis as Record<string, unknown>)[VALIDATION_CACHE_KEY] = result;
  return result;
}

export function validatePhonicsManifest(
  manifest: PhonicsAudioLibraryManifest,
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

function finalizePhonicsManifestValidation(
  manifest: PhonicsAudioLibraryManifest,
): PhonicsManifestValidation {
  const result = validatePhonicsManifest(manifest);
  writeCachedValidation(result);

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

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("amynest:phonics-manifest-ready"));
  }

  return result;
}

/** Load JSON chunk + validate; safe to call from boot and route open. */
export async function ensurePhonicsManifestLoaded(): Promise<PhonicsManifestValidation> {
  const cached = readCachedValidation();
  if (cached) return cached;

  const manifest = await preloadPhonicsBundledManifest();
  return finalizePhonicsManifestValidation(manifest);
}

/** Boot hook — loads split manifest chunk; safe before React mount. */
export async function initPhonicsManifestValidation(): Promise<PhonicsManifestValidation> {
  return ensurePhonicsManifestLoaded();
}

export function getPhonicsManifestValidation(): PhonicsManifestValidation {
  const cached = readCachedValidation();
  if (cached) return cached;

  const manifest = getPhonicsBundledManifestSync();
  if (manifest) return validatePhonicsManifest(manifest);

  const meta = getPhonicsBundledMeta();
  const shipped = isPhonicsBundledManifestShipped();
  return {
    ok: shipped,
    assetCount: meta.assetCount,
    missingUrlCount: 0,
    manifestVersion: meta.version,
    libraryVersion: meta.libraryVersion,
    errors: shipped ? ["manifest_chunk_not_loaded"] : ["manifest_not_shipped"],
  };
}

/**
 * True when the shipped phonics library is present in this build.
 * Uses build-time metadata so route gates never depend on async chunk load order.
 */
export function isPhonicsModuleAvailable(): boolean {
  return isPhonicsBundledManifestShipped();
}

/** Strict gate for prefetch/warmup only. */
export function isPhonicsManifestStrictlyValid(): boolean {
  const cached = readCachedValidation();
  if (cached) return cached.ok;
  const manifest = getPhonicsBundledManifestSync();
  if (manifest) return validatePhonicsManifest(manifest).ok;
  return false;
}

/** Test-only reset */
export function resetPhonicsManifestValidationForTests(): void {
  delete (globalThis as Record<string, unknown>)[VALIDATION_CACHE_KEY];
  delete (globalThis as Record<string, unknown>).__amynestPhonicsBundledManifest;
  delete (globalThis as Record<string, unknown>).__amynestPhonicsManifestLoadPromise;
}
