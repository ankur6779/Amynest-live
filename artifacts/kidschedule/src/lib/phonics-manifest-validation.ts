/**
 * Boot-time phonics library manifest validation — never throws.
 */
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

let bundledManifest: PhonicsAudioLibraryManifest | null = null;
let manifestLoadPromise: Promise<PhonicsAudioLibraryManifest> | null = null;
let cachedValidation: PhonicsManifestValidation | null = null;
let bootInitialized = false;

const MANIFEST_CACHE_KEY = "__amynestPhonicsManifestValidation";

function readSharedValidation(): PhonicsManifestValidation | null {
  if (typeof globalThis !== "undefined") {
    const shared = (globalThis as Record<string, unknown>)[MANIFEST_CACHE_KEY];
    if (shared && typeof shared === "object") {
      return shared as PhonicsManifestValidation;
    }
  }
  return cachedValidation;
}

function writeSharedValidation(result: PhonicsManifestValidation): PhonicsManifestValidation {
  cachedValidation = result;
  if (typeof globalThis !== "undefined") {
    (globalThis as Record<string, unknown>)[MANIFEST_CACHE_KEY] = result;
  }
  return result;
}

function loadBundledManifest(): Promise<PhonicsAudioLibraryManifest> {
  if (bundledManifest) return Promise.resolve(bundledManifest);
  if (!manifestLoadPromise) {
    manifestLoadPromise = import("@/data/phonics-audio-map.json").then((mod) => {
      bundledManifest = mod.default as PhonicsAudioLibraryManifest;
      return bundledManifest;
    });
  }
  return manifestLoadPromise;
}

/** Await manifest chunk (split from main bundle) before availability checks. */
export async function ensurePhonicsManifestLoaded(): Promise<PhonicsManifestValidation> {
  const shared = readSharedValidation();
  if (bootInitialized && shared) return shared;
  const manifest = await loadBundledManifest();
  if (bootInitialized && readSharedValidation()) return readSharedValidation()!;
  return finalizePhonicsManifestValidation(manifest);
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
  bootInitialized = true;
  const result = validatePhonicsManifest(manifest);
  writeSharedValidation(result);

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

/** Boot hook — loads split manifest chunk; safe before React mount. */
export async function initPhonicsManifestValidation(): Promise<PhonicsManifestValidation> {
  const shared = readSharedValidation();
  if (bootInitialized && shared) return shared;
  const manifest = await loadBundledManifest();
  return finalizePhonicsManifestValidation(manifest);
}

export function getPhonicsManifestValidation(): PhonicsManifestValidation {
  const shared = readSharedValidation();
  if (shared) return shared;
  if (bundledManifest) return validatePhonicsManifest(bundledManifest);
  return {
    ok: false,
    assetCount: 0,
    missingUrlCount: 0,
    manifestVersion: 0,
    libraryVersion: 0,
    errors: ["manifest_not_loaded"],
  };
}

/**
 * True when the shipped phonics library manifest is present (≥ min assets).
 * Does not block on non-fatal validation warnings — audio layer degrades safely.
 */
export function isPhonicsModuleAvailable(): boolean {
  return getPhonicsManifestValidation().assetCount >= PHONICS_MANIFEST_MIN_ASSETS;
}

/** Strict gate for prefetch/warmup only. */
export function isPhonicsManifestStrictlyValid(): boolean {
  return getPhonicsManifestValidation().ok;
}

/** Test-only reset */
export function resetPhonicsManifestValidationForTests(): void {
  bundledManifest = null;
  manifestLoadPromise = null;
  cachedValidation = null;
  bootInitialized = false;
  if (typeof globalThis !== "undefined") {
    delete (globalThis as Record<string, unknown>)[MANIFEST_CACHE_KEY];
  }
}
