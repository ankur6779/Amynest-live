import { getAllCatalogEntries } from "@workspace/spelling-catalog";
import type { SpellingCatalogEntry } from "@workspace/spelling-catalog";
import {
  getSpellingGcsObjectPath,
  spellingLibraryProxyPath,
} from "./gcs-paths.js";
import type {
  SpellingAudioManifest,
  SpellingAudioManifestEntry,
  SpellingAudioVersion,
} from "./types.js";
import {
  SPELLING_AUDIO_MODEL_DEFAULT,
  SPELLING_AUDIO_VERSION,
  SPELLING_AUDIO_VOICE_DEFAULT,
} from "./types.js";

export function buildSpellingAudioManifestEntry(
  entry: SpellingCatalogEntry,
  bucket: string,
  opts?: {
    version?: SpellingAudioVersion;
    voice?: string;
    durationSec?: number | null;
  },
): SpellingAudioManifestEntry {
  const version = opts?.version ?? SPELLING_AUDIO_VERSION;
  const voice = opts?.voice ?? SPELLING_AUDIO_VOICE_DEFAULT;
  const gcsPath = getSpellingGcsObjectPath(entry.word, version);
  const url = spellingLibraryProxyPath(gcsPath);
  return {
    word: entry.word,
    catalogId: entry.id,
    gcsPath,
    url,
    durationSec: opts?.durationSec ?? null,
    voice,
    version,
    slowGcsPath: null,
    slowUrl: null,
  };
}

/** Build a full manifest skeleton from the spelling word catalog (deterministic URLs). */
export function buildSpellingAudioManifestFromCatalog(
  bucket: string,
  opts?: {
    version?: SpellingAudioVersion;
    voice?: string;
    model?: string;
    existing?: SpellingAudioManifest | null;
  },
): SpellingAudioManifest {
  const version = opts?.version ?? SPELLING_AUDIO_VERSION;
  const voice = opts?.voice ?? SPELLING_AUDIO_VOICE_DEFAULT;
  const model = opts?.model ?? SPELLING_AUDIO_MODEL_DEFAULT;
  const catalog = getAllCatalogEntries();
  const entries: Record<string, SpellingAudioManifestEntry> = {};
  const existingEntries = opts?.existing?.entries ?? {};

  for (const entry of catalog) {
    const prev = existingEntries[entry.id];
    entries[entry.id] = buildSpellingAudioManifestEntry(entry, bucket, {
      version,
      voice,
      durationSec: prev?.durationSec ?? null,
    });
  }

  const uniqueSlugs = new Set(catalog.map((e) => e.word.trim().toLowerCase()));

  return {
    meta: {
      version,
      voice,
      model,
      generatedAt: new Date().toISOString(),
      bucket,
      catalogEntryCount: catalog.length,
      uniqueWordCount: uniqueSlugs.size,
    },
    entries,
  };
}

export function resolveSpellingLibraryProxyUrl(
  entry: SpellingAudioManifestEntry | null | undefined,
): string | null {
  const gcsPath = entry?.gcsPath?.trim();
  if (!gcsPath || !entry) return null;
  try {
    return spellingLibraryProxyPath(gcsPath);
  } catch {
    return null;
  }
}
