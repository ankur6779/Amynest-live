/**
 * Runtime lookup for pre-generated phonics library assets (GCS via manifest).
 * Playback NEVER calls ElevenLabs — missing assets are logged and fall back.
 */
import audioMap from "@/data/phonics-audio-map.json";
import {
  getPhonicsCatalogKey,
  resolveContentCatalogKey,
  resolveLetterClipCatalogKey,
  type PhonicsAssetType,
  type PhonicsAudioLibraryManifest,
  type PhonicsAudioManifestAsset,
} from "@workspace/phonics-sounds";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";

const manifest = audioMap as PhonicsAudioLibraryManifest;

const missingReported = new Set<string>();

export function getPhonicsLibraryManifest(): PhonicsAudioLibraryManifest {
  return manifest;
}

export function lookupPhonicsLibraryAsset(
  catalogKey: string,
): PhonicsAudioManifestAsset | null {
  const asset = manifest.assets?.[catalogKey];
  if (!asset?.url?.startsWith("https://")) return null;
  return asset;
}

/** Resolve letter/digraph audioKey (a, sh, th1) → playable HTTPS URL. */
export function lookupPhonicsLetterUrl(audioKey: string): string | null {
  const catalogKey = resolveLetterClipCatalogKey(audioKey);
  if (!catalogKey) return null;
  return lookupPhonicsLibraryAsset(catalogKey)?.url ?? null;
}

/** Resolve word/sentence/quiz text → playable URL. */
export function lookupPhonicsContentUrl(
  text: string,
  preferredType?: PhonicsAssetType,
): string | null {
  const catalogKey = resolveContentCatalogKey(text, preferredType);
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

export function prefetchPhonicsLibraryUrls(urls: string[]): void {
  for (const url of urls) {
    if (!url?.startsWith("https://")) continue;
    try {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "audio";
      link.href = url;
      document.head.appendChild(link);
    } catch {
      /* ignore */
    }
  }
}

export function listPhonicsLibraryPrewarmUrls(keys: string[]): string[] {
  return keys
    .map((k) => lookupPhonicsLibraryAsset(k)?.url)
    .filter((u): u is string => Boolean(u?.startsWith("https://")));
}
