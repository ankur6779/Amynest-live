/**
 * Browser-safe static audio lookup miss diagnostics (no node:crypto).
 */

import {
  canonicalizeStaticAudioText,
  normalizeStaticAudioKey,
  normalizeSpeakTextForLookup,
  staticAudioLookupKeyVariants,
} from "@workspace/static-audio/browser";

export type BrowserStaticLookupDiff = {
  index: number;
  runtimeChar: string;
  catalogChar: string;
  runtimeCodepoint: string;
  catalogCodepoint: string;
};

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) matrix[i]![0] = i;
  for (let j = 0; j < cols; j++) matrix[0]![j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }
  return matrix[a.length]![b.length]!;
}

function diffNormalizedTexts(
  runtimeNormalized: string,
  catalogNormalized: string,
  maxDiffs = 8,
): BrowserStaticLookupDiff[] {
  const max = Math.max(runtimeNormalized.length, catalogNormalized.length);
  const diffs: BrowserStaticLookupDiff[] = [];
  for (let i = 0; i < max; i++) {
    const runtimeChar = runtimeNormalized[i] ?? "";
    const catalogChar = catalogNormalized[i] ?? "";
    if (runtimeChar === catalogChar) continue;
    diffs.push({
      index: i,
      runtimeChar,
      catalogChar,
      runtimeCodepoint: runtimeChar
        ? `U+${runtimeChar.charCodeAt(0).toString(16).padStart(4, "0")}`
        : "(end)",
      catalogCodepoint: catalogChar
        ? `U+${catalogChar.charCodeAt(0).toString(16).padStart(4, "0")}`
        : "(end)",
    });
    if (diffs.length >= maxDiffs) break;
  }
  return diffs;
}

export type BrowserStaticLookupMissReport = {
  originalText: string;
  canonicalText: string;
  normalizedKey: string;
  speakNormalizedKey: string;
  lookupVariants: string[];
  characterLength: number;
  utf8ByteLength: number;
  codepoints: string[];
  /** Lesson pipeline identity hash — NOT the static-audio-map MP3 hash. */
  lessonIdentityHash?: string;
  mapReady: boolean;
  closestCatalogKeys: Array<{
    key: string;
    levenshtein: number;
    catalogHashFromUrl: string | null;
    diff: BrowserStaticLookupDiff[];
  }>;
};

function hashFromMapUrl(url: string | undefined): string | null {
  const m = (url ?? "").match(/\/static-audio\/([a-f0-9]{32})\.mp3/i);
  return m?.[1] ?? null;
}

export function buildStaticAudioLookupMissReport(
  rawText: string,
  catalog: Record<string, string>,
  opts: { mapReady?: boolean; lessonIdentityHash?: string } = {},
): BrowserStaticLookupMissReport {
  const canonicalText = canonicalizeStaticAudioText(rawText);
  const normalizedKey = normalizeStaticAudioKey(rawText);
  const catalogKeys = Object.keys(catalog);

  const closestCatalogKeys = catalogKeys
    .map((key) => ({
      key,
      levenshtein: levenshteinDistance(normalizedKey, key),
      catalogHashFromUrl: hashFromMapUrl(catalog[key]),
      diff: diffNormalizedTexts(normalizedKey, key),
    }))
    .sort((a, b) => a.levenshtein - b.levenshtein)
    .slice(0, 5);

  const encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

  return {
    originalText: rawText,
    canonicalText,
    normalizedKey,
    speakNormalizedKey: normalizeSpeakTextForLookup(rawText),
    lookupVariants: staticAudioLookupKeyVariants(rawText),
    characterLength: canonicalText.length,
    utf8ByteLength: encoder ? encoder.encode(canonicalText).length : canonicalText.length,
    codepoints: [...canonicalText].map(
      (c) => `U+${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
    ),
    lessonIdentityHash: opts.lessonIdentityHash,
    mapReady: opts.mapReady ?? true,
    closestCatalogKeys,
  };
}
