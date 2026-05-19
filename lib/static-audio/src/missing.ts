import { normalizeStaticAudioKey } from "./normalize.js";
import { getStaticTtsEntries } from "./phrases.js";
import type { StaticAudioMap, StaticAudioMode } from "./types.js";

export function staticAudioMissingKey(mode: StaticAudioMode, normalized: string): string {
  return `${mode}:${normalized}`;
}

function indexMapKeys(map: StaticAudioMap): {
  default: Set<string>;
  phonics: Set<string>;
} {
  const index = (bucket: Record<string, string> | undefined): Set<string> => {
    const keys = new Set<string>();
    if (!bucket) return keys;
    for (const [key, url] of Object.entries(bucket)) {
      const normalized = normalizeStaticAudioKey(key);
      const trimmedUrl = (url ?? "").trim();
      if (normalized && trimmedUrl.startsWith("https://") && !trimmedUrl.includes("undefined")) {
        keys.add(normalized);
      }
    }
    return keys;
  };
  return {
    default: index(map.default),
    phonics: index(map.phonics),
  };
}

/**
 * Catalog phrases that have no valid HTTPS URL in the shipped map.
 * Keys are `mode:normalized` (e.g. `phonics:buh`).
 */
export function computeCatalogMissingStaticAudioKeys(map: StaticAudioMap): string[] {
  const indexed = indexMapKeys(map);
  const missing = new Set<string>();

  for (const { text, mode } of getStaticTtsEntries()) {
    const normalized = normalizeStaticAudioKey(text);
    if (!normalized) continue;
    if (!indexed[mode].has(normalized)) {
      missing.add(staticAudioMissingKey(mode, normalized));
    }
  }

  return [...missing].sort();
}

export function mergeMissingStaticAudioKeys(...lists: Iterable<string>[]): string[] {
  const merged = new Set<string>();
  for (const list of lists) {
    for (const key of list) {
      const trimmed = key.trim();
      if (trimmed) merged.add(trimmed);
    }
  }
  return [...merged].sort();
}

/** Parse `mode:normalized` (e.g. `phonics:buh`). */
export function parseStaticAudioMissingKey(
  key: string,
): { mode: StaticAudioMode; normalized: string } | null {
  const trimmed = key.trim();
  const idx = trimmed.indexOf(":");
  if (idx <= 0) return null;
  const mode = trimmed.slice(0, idx) as StaticAudioMode;
  if (mode !== "default" && mode !== "phonics") return null;
  const normalized = trimmed.slice(idx + 1).trim();
  if (!normalized) return null;
  return { mode, normalized };
}

/** `phonics:buh` → `buh` (normalized text portion). */
export function extractTextFromMissingKey(key: string): string | null {
  return parseStaticAudioMissingKey(key)?.normalized ?? null;
}

let catalogByMissingKey: Map<string, { text: string; mode: StaticAudioMode }> | null = null;

export function buildStaticTtsEntryByMissingKey(): Map<
  string,
  { text: string; mode: StaticAudioMode }
> {
  const index = new Map<string, { text: string; mode: StaticAudioMode }>();
  for (const entry of getStaticTtsEntries()) {
    const normalized = normalizeStaticAudioKey(entry.text);
    if (!normalized) continue;
    index.set(staticAudioMissingKey(entry.mode, normalized), {
      text: entry.text,
      mode: entry.mode,
    });
  }
  return index;
}

/** Resolve catalog phrase + mode for a missing key (for regeneration). */
export function resolveStaticTtsFromMissingKey(
  key: string,
): { text: string; mode: StaticAudioMode } | null {
  if (!catalogByMissingKey) {
    catalogByMissingKey = buildStaticTtsEntryByMissingKey();
  }
  return catalogByMissingKey.get(key.trim()) ?? null;
}
