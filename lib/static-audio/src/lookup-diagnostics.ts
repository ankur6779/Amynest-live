import { getStaticAudioHash } from "./keys.js";
import {
  canonicalizeStaticAudioText,
  normalizeStaticAudioKey,
  normalizeSpeakTextForLookup,
  staticAudioLookupKeyVariants,
} from "./normalize.js";
import type { StaticAudioMode } from "./types.js";

export type StaticAudioLookupDiff = {
  index: number;
  runtimeChar: string;
  catalogChar: string;
  runtimeCodepoint: string;
  catalogCodepoint: string;
};

export type StaticAudioLookupDiagnostic = {
  originalText: string;
  canonicalText: string;
  normalizedKey: string;
  speakNormalizedKey: string;
  lookupVariants: string[];
  characterLength: number;
  utf8ByteLength: number;
  codepoints: string[];
  staticAudioHash: string;
  catalogHashFromUrl: string | null;
  mapReady: boolean;
  mapHit: boolean;
  closestCatalogKeys: Array<{ key: string; levenshtein: number; diff: StaticAudioLookupDiff[] }>;
};

export function levenshteinDistance(a: string, b: string): number {
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

export function diffNormalizedTexts(
  runtimeNormalized: string,
  catalogNormalized: string,
  maxDiffs = 12,
): StaticAudioLookupDiff[] {
  const max = Math.max(runtimeNormalized.length, catalogNormalized.length);
  const diffs: StaticAudioLookupDiff[] = [];
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

function extractHashFromMapUrl(url: string | undefined): string | null {
  const m = (url ?? "").match(/\/static-audio\/([a-f0-9]{32})\.mp3/i);
  return m?.[1] ?? null;
}

export function diagnoseStaticAudioLookup(
  rawText: string,
  catalogKeys: readonly string[],
  opts: {
    mode?: StaticAudioMode;
    mapReady?: boolean;
    mapHitUrl?: string | null;
  } = {},
): StaticAudioLookupDiagnostic {
  const mode = opts.mode ?? "default";
  const originalText = rawText ?? "";
  const canonicalText = canonicalizeStaticAudioText(originalText);
  const normalizedKey = normalizeStaticAudioKey(originalText);
  const speakNormalizedKey = normalizeSpeakTextForLookup(originalText);
  const lookupVariants = staticAudioLookupKeyVariants(originalText);
  const staticAudioHash = getStaticAudioHash(canonicalText, mode);

  const ranked = catalogKeys
    .map((key) => ({
      key,
      levenshtein: levenshteinDistance(normalizedKey, key),
      diff: diffNormalizedTexts(normalizedKey, key),
    }))
    .sort((a, b) => a.levenshtein - b.levenshtein)
    .slice(0, 5);

  return {
    originalText,
    canonicalText,
    normalizedKey,
    speakNormalizedKey,
    lookupVariants,
    characterLength: canonicalText.length,
    utf8ByteLength: Buffer.byteLength(canonicalText, "utf8"),
    codepoints: [...canonicalText].map(
      (c) => `U+${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
    ),
    staticAudioHash,
    catalogHashFromUrl: extractHashFromMapUrl(opts.mapHitUrl ?? undefined),
    mapReady: opts.mapReady ?? true,
    mapHit: Boolean(opts.mapHitUrl),
    closestCatalogKeys: ranked,
  };
}
