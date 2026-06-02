/**
 * Runtime lookup for pre-generated spelling library assets (GCS via manifest).
 * Playback NEVER calls OpenAI TTS — missing assets fall back to next available clip.
 *
 * Browser playback uses /api/spelling-library/* proxy URLs (not direct GCS).
 */
import audioManifest from "@/data/spelling-audio-manifest.json";
import { getApiUrl } from "@/lib/api";
import { lookupStaticAudioUrl } from "@/lib/static-audio";
import {
  resolveSpellingLibraryProxyUrl,
  sanitizeSpellingWordSlug,
  spellingLibraryProxyPath,
  type SpellingAudioManifest,
  type SpellingAudioManifestEntry,
} from "@workspace/spelling-audio";
import {
  reportSpellingAudioMissing,
  trackSpellingAudioEvent,
} from "@/lib/spelling-audio-telemetry";

const manifest = audioManifest as SpellingAudioManifest;

const bySlug = new Map<string, SpellingAudioManifestEntry>();
const fallbackUrls: string[] = [];

for (const entry of Object.values(manifest.entries ?? {})) {
  const slug = sanitizeSpellingWordSlug(entry.word);
  if (slug && !bySlug.has(slug)) {
    bySlug.set(slug, entry);
  }
  const proxy = resolveSpellingLibraryProxyUrl(entry);
  if (proxy) fallbackUrls.push(getApiUrl(proxy));
}

export function getSpellingAudioManifest(): SpellingAudioManifest {
  return manifest;
}

export function resolveSpellingLibraryPlaybackUrl(
  entry: SpellingAudioManifestEntry | null | undefined,
): string | null {
  const proxy = resolveSpellingLibraryProxyUrl(entry);
  return proxy ? getApiUrl(proxy) : null;
}

export function lookupSpellingAudioEntry(
  catalogId?: string | null,
  word?: string | null,
): SpellingAudioManifestEntry | null {
  const id = (catalogId ?? "").trim();
  if (id && manifest.entries[id]) return manifest.entries[id] ?? null;
  const w = (word ?? "").trim();
  if (!w) return null;
  return bySlug.get(sanitizeSpellingWordSlug(w)) ?? null;
}

export function lookupSpellingAudioUrl(
  word: string,
  catalogId?: string,
): string | null {
  const slug = sanitizeSpellingWordSlug(word);
  const staticUrl = slug ? lookupStaticAudioUrl(slug, "default") : null;
  if (staticUrl) return staticUrl;
  const entry = lookupSpellingAudioEntry(catalogId, word);
  return resolveSpellingLibraryPlaybackUrl(entry);
}

/** Next available clip when primary word audio is missing. */
export function lookupSpellingAudioFallbackUrl(exclude?: string): string | null {
  for (const url of fallbackUrls) {
    if (exclude && url.includes(exclude)) continue;
    return url;
  }
  return fallbackUrls[0] ?? null;
}

export function resolveSpellingAudioUrlWithFallback(
  word: string,
  catalogId?: string,
): string | null {
  const primary = lookupSpellingAudioUrl(word, catalogId);
  if (primary) return primary;
  reportSpellingAudioMissing(catalogId ?? word, "primary_missing");
  const slug = sanitizeSpellingWordSlug(word);
  const staticUrl = slug ? lookupStaticAudioUrl(slug, "default") : null;
  if (staticUrl) return staticUrl;
  return lookupSpellingAudioFallbackUrl(slug);
}

export type SpellingAudioPrewarmItem = {
  catalogId: string;
  word: string;
  url: string;
  memoryCacheKey: string;
};

export function buildSpellingSessionPrewarmItems(
  words: Array<{ id: string; word: string }>,
  currentIndex = 0,
  lookahead = 3,
): SpellingAudioPrewarmItem[] {
  const items: SpellingAudioPrewarmItem[] = [];
  const seen = new Set<string>();
  const start = Math.max(0, currentIndex);
  const end = Math.min(words.length, start + lookahead + 1);

  for (let i = start; i < end; i++) {
    const w = words[i];
    if (!w) continue;
    const url = lookupSpellingAudioUrl(w.word, w.id);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    items.push({
      catalogId: w.id,
      word: w.word,
      url,
      memoryCacheKey: `spelling:word:${w.id}`,
    });
  }
  return items;
}

export function prefetchSpellingAudioUrls(urls: string[]): void {
  for (const url of urls) {
    if (!url) continue;
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

export { spellingLibraryProxyPath };
