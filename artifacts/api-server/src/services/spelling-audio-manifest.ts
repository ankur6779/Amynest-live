/**
 * Server-side spelling audio manifest loader + URL resolution.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveSpellingLibraryProxyUrl,
  sanitizeSpellingWordSlug,
  type SpellingAudioManifest,
  type SpellingAudioManifestEntry,
} from "@workspace/spelling-audio";

function loadManifest(): SpellingAudioManifest {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../src/data/spelling-audio-manifest.json"),
    resolve(process.cwd(), "artifacts/api-server/src/data/spelling-audio-manifest.json"),
    resolve(here, "../data/spelling-audio-manifest.json"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    return JSON.parse(readFileSync(path, "utf8")) as SpellingAudioManifest;
  }
  throw new Error(
    `spelling-audio-manifest.json not found (tried: ${candidates.join(", ")})`,
  );
}

const manifest = loadManifest();

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
