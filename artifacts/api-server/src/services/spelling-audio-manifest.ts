/**
 * Server-side spelling audio manifest loader + URL resolution.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveSpellingLibraryProxyUrl,
  sanitizeSpellingWordSlug,
  type SpellingAudioManifest,
  type SpellingAudioManifestEntry,
} from "@workspace/spelling-audio";

const manifestPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../data/spelling-audio-manifest.json",
);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as SpellingAudioManifest;

const bySlug = new Map<string, SpellingAudioManifestEntry>();

for (const entry of Object.values(manifest.entries ?? {})) {
  const slug = sanitizeSpellingWordSlug(entry.word);
  if (slug && !bySlug.has(slug)) {
    bySlug.set(slug, entry);
  }
}

export function getSpellingAudioManifest(): SpellingAudioManifest {
  return manifest;
}

export function lookupSpellingAudioEntry(
  catalogId?: string | null,
  word?: string | null,
): SpellingAudioManifestEntry | null {
  const id = (catalogId ?? "").trim();
  if (id && manifest.entries[id]) return manifest.entries[id] ?? null;
  const w = (word ?? "").trim();
  if (!w) return null;
  const slug = sanitizeSpellingWordSlug(w);
  return bySlug.get(slug) ?? null;
}

/** Proxy URL for session-safe word playback (server knows word, client gets URL only). */
export function resolveSpellingWordAudioProxyUrl(word: string, catalogId?: string): string | null {
  const entry = lookupSpellingAudioEntry(catalogId, word);
  return resolveSpellingLibraryProxyUrl(entry);
}

export function resolveSpellingWordAudioProxyUrlWithFallback(
  word: string,
  catalogId?: string,
): string {
  const primary = resolveSpellingWordAudioProxyUrl(word, catalogId);
  if (primary) return primary;
  const slug = sanitizeSpellingWordSlug(word);
  for (const entry of Object.values(manifest.entries ?? {})) {
    const proxy = resolveSpellingLibraryProxyUrl(entry);
    if (proxy) return proxy;
    if (sanitizeSpellingWordSlug(entry.word) !== slug) continue;
    return proxy!;
  }
  const first = Object.values(manifest.entries ?? {})[0];
  return resolveSpellingLibraryProxyUrl(first) ?? "/api/spelling-library/spelling/v2/cat.mp3";
}
