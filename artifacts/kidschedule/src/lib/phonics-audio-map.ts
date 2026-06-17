/**
 * Runtime lookup for pre-generated phonics library assets (GCS via manifest).
 * Playback NEVER calls ElevenLabs — missing assets are logged and fall back.
 *
 * Browser playback uses /api/phonics-library/* proxy URLs (not direct GCS).
 */
import { getApiUrl } from "@/lib/api";
import { getPhonicsBundledManifestSync } from "@/lib/phonics-bundled-manifest";
import {
  getPhonicsCatalogKey,
  getPhonicsLetterCacheKey,
  isValidPhonicsGcsObjectPath,
  phonicsLibraryProxyPath,
  PHONICS_PREWARM_CVC,
  PHONICS_PREWARM_TIER_HIGH,
  resolveContentCatalogKey,
  resolveLetterClipCatalogKey,
  type PhonicsAssetType,
  type PhonicsAudioLibraryManifest,
  type PhonicsAudioManifestAsset,
} from "@workspace/phonics-sounds";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";

const missingReported = new Set<string>();

function manifest(): PhonicsAudioLibraryManifest {
  return getPhonicsBundledManifestSync() ?? { assets: {} } as PhonicsAudioLibraryManifest;
}

/** Resolve manifest gcsPath → API stream URL (same-origin / backend origin). */
export function resolvePhonicsLibraryPlaybackUrl(
  asset: PhonicsAudioManifestAsset | null | undefined,
): string | null {
  const gcsPath = asset?.gcsPath?.trim();
  if (!gcsPath || !isValidPhonicsGcsObjectPath(gcsPath)) return null;
  return getApiUrl(phonicsLibraryProxyPath(gcsPath));
}

export function getPhonicsLibraryManifest(): PhonicsAudioLibraryManifest {
  return manifest();
}

export function lookupPhonicsLibraryAsset(
  catalogKey: string,
): PhonicsAudioManifestAsset | null {
  const key = (catalogKey ?? "").trim();
  if (!key) return null;
  const asset = manifest().assets?.[key];
  if (!asset) {
    if (import.meta.env.DEV) {
      console.warn("[phonics-library] missing asset", key);
    }
    return null;
  }
  const playbackUrl = resolvePhonicsLibraryPlaybackUrl(asset);
  if (!playbackUrl) {
    if (import.meta.env.DEV) {
      console.warn("[phonics-library] asset has no playable proxy url", key);
    }
    return null;
  }
  return { ...asset, url: playbackUrl };
}

/** Resolve letter/digraph audioKey (a, sh, th1) → playable HTTPS URL. */
export function lookupPhonicsLetterUrl(audioKey: string): string | null {
  const catalogKey = resolveLetterClipCatalogKey(audioKey);
  if (!catalogKey) return null;
  return lookupPhonicsLibraryAsset(catalogKey)?.url ?? null;
}

/** Resolve text → manifest catalog key (core catalog, then bundled manifest). */
export function resolvePhonicsContentCatalogKey(
  text: string,
  preferredType?: PhonicsAssetType,
): string | null {
  const fromCore = resolveContentCatalogKey(text, preferredType);
  if (fromCore) return fromCore;

  const norm = text.trim().toLowerCase();
  if (!norm) return null;
  for (const [key, asset] of Object.entries(manifest().assets ?? {})) {
    if (preferredType && asset.type !== preferredType) continue;
    if ((asset.text ?? "").trim().toLowerCase() === norm) return key;
  }
  return null;
}

/** Resolve word/sentence/quiz text → playable URL. */
export function lookupPhonicsContentUrl(
  text: string,
  preferredType?: PhonicsAssetType,
): string | null {
  const catalogKey = resolvePhonicsContentCatalogKey(text, preferredType);
  if (!catalogKey) return null;
  return lookupPhonicsLibraryAsset(catalogKey)?.url ?? null;
}

export function lookupPhonicsAssetByTypeId(
  type: PhonicsAssetType,
  id: string,
): string | null {
  const key = getPhonicsCatalogKey(type, id);
  return lookupPhonicsLibraryAsset(key)?.url ?? null;
}

export function reportPhonicsLibraryMissing(catalogKey: string, context?: string): void {
  if (missingReported.has(catalogKey)) return;
  missingReported.add(catalogKey);
  logAmyVoiceDiag("phonics_library_missing", { catalogKey, context });
  if (import.meta.env.DEV) {
    console.warn(`[phonics-library] missing asset: ${catalogKey}${context ? ` (${context})` : ""}`);
  }
}

/** Fallback asset — neutral short tone when library entry absent. */
export function getPhonicsLibraryFallbackUrl(): string | null {
  return lookupPhonicsLetterUrl("a") ?? lookupPhonicsLetterUrl("m");
}

/** IndexedDB + memory cache key for words, sentences, quizzes, blends, CVC. */
export function getPhonicsContentCacheKey(
  text: string,
  preferredType?: PhonicsAssetType,
): string {
  const catalogKey = resolvePhonicsContentCatalogKey(text, preferredType);
  if (catalogKey) return `phonics:content:${catalogKey}`;
  const slug = text.trim().toLowerCase();
  return `phonics:content:${preferredType ?? "unknown"}:${slug}`;
}

export type PhonicsLibraryPrewarmItem = {
  catalogKey: string;
  url: string;
  memoryCacheKey: string;
  localCacheKey: string;
  tier: 1 | 2 | 3;
  type: PhonicsAssetType;
};

function resolvePrewarmTier(type: PhonicsAssetType, id: string): 1 | 2 | 3 {
  if (type === "letter" && (PHONICS_PREWARM_TIER_HIGH as readonly string[]).includes(id)) {
    return 1;
  }
  if (
    type === "letter" ||
    type === "digraph" ||
    type === "blend" ||
    (type === "cvc" && (PHONICS_PREWARM_CVC as readonly string[]).includes(id))
  ) {
    return 2;
  }
  return 3;
}

function memoryCacheKeyForAsset(type: PhonicsAssetType, id: string, catalogKey: string): string {
  if (type === "letter" || type === "digraph") {
    return getPhonicsLetterCacheKey(id);
  }
  return `phonics:content:${catalogKey}`;
}

/** Every manifest asset with tier + cache keys for full-library prewarm. */
export function listPhonicsLibraryPrewarmItems(): PhonicsLibraryPrewarmItem[] {
  const items: PhonicsLibraryPrewarmItem[] = [];
  for (const [catalogKey, asset] of Object.entries(manifest().assets ?? {})) {
    const playbackUrl = resolvePhonicsLibraryPlaybackUrl(asset);
    if (!playbackUrl) continue;
    const type = asset.type;
    const id = asset.id;
    const localCacheKey = memoryCacheKeyForAsset(type, id, catalogKey);
    items.push({
      catalogKey,
      url: playbackUrl,
      memoryCacheKey: localCacheKey,
      localCacheKey,
      tier: resolvePrewarmTier(type, id),
      type,
    });
  }
  return items.sort((a, b) => a.tier - b.tier || a.catalogKey.localeCompare(b.catalogKey));
}

export function countPhonicsLibraryPrewarmItems(): number {
  return listPhonicsLibraryPrewarmItems().length;
}

export function prefetchPhonicsLibraryUrls(urls: string[]): void {
  for (const url of urls) {
    if (!url?.startsWith("http") && !url?.startsWith("/")) continue;
    try {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "audio";
      link.href = url.startsWith("/") ? getApiUrl(url) : url;
      document.head.appendChild(link);
    } catch {
      /* ignore */
    }
  }
}

export function listPhonicsLibraryPrewarmUrls(keys: string[]): string[] {
  return keys
    .map((k) => lookupPhonicsLibraryAsset(k)?.url)
    .filter((u): u is string => Boolean(u));
}
