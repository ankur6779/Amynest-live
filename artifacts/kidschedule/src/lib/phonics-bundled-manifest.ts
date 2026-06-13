/**
 * Single loader for phonics-audio-map.json — shared across split bundles via globalThis.
 * Sync build-time counts live in phonics-audio-map-meta.ts (main bundle, always available).
 */
import type { PhonicsAudioLibraryManifest } from "@workspace/phonics-sounds";
import {
  PHONICS_BUNDLED_ASSET_COUNT,
  PHONICS_BUNDLED_LIBRARY_VERSION,
  PHONICS_BUNDLED_VERSION,
} from "@/data/phonics-audio-map-meta";

const MANIFEST_KEY = "__amynestPhonicsBundledManifest";
const LOAD_PROMISE_KEY = "__amynestPhonicsManifestLoadPromise";

type GlobalPhonicsCache = Record<string, unknown>;

function globalCache(): GlobalPhonicsCache {
  return globalThis as GlobalPhonicsCache;
}

function parseJsonModule(mod: unknown): PhonicsAudioLibraryManifest {
  if (!mod || typeof mod !== "object") {
    throw new Error("phonics-audio-map import returned empty module");
  }
  const record = mod as Record<string, unknown>;
  const manifest = (record.default ?? record) as PhonicsAudioLibraryManifest;
  const assetCount = Object.keys(manifest?.assets ?? {}).length;
  if (assetCount === 0) {
    throw new Error("phonics-audio-map import has no assets");
  }
  return manifest;
}

/** Build-time floor — does not require the JSON chunk (safe for route gates). */
export function isPhonicsBundledManifestShipped(): boolean {
  return PHONICS_BUNDLED_ASSET_COUNT >= 100;
}

export function getPhonicsBundledMeta(): {
  assetCount: number;
  version: number;
  libraryVersion: number;
} {
  return {
    assetCount: PHONICS_BUNDLED_ASSET_COUNT,
    version: PHONICS_BUNDLED_VERSION,
    libraryVersion: PHONICS_BUNDLED_LIBRARY_VERSION,
  };
}

export function getPhonicsBundledManifestSync(): PhonicsAudioLibraryManifest | null {
  const cached = globalCache()[MANIFEST_KEY];
  return cached && typeof cached === "object" ? (cached as PhonicsAudioLibraryManifest) : null;
}

/** Load the JSON chunk once; deduped across duplicate module instances. */
export async function preloadPhonicsBundledManifest(): Promise<PhonicsAudioLibraryManifest> {
  const g = globalCache();
  const cached = getPhonicsBundledManifestSync();
  if (cached) return cached;

  if (!g[LOAD_PROMISE_KEY]) {
    g[LOAD_PROMISE_KEY] = import("@/data/phonics-audio-map.json")
      .then((mod) => {
        const manifest = parseJsonModule(mod);
        g[MANIFEST_KEY] = manifest;
        return manifest;
      })
      .catch((err) => {
        delete g[LOAD_PROMISE_KEY];
        throw err;
      });
  }

  return g[LOAD_PROMISE_KEY] as Promise<PhonicsAudioLibraryManifest>;
}
