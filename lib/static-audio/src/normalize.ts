/**
 * Canonical static-audio text normalization — single source for build + runtime lookup.
 *
 * Map keys use normalizeStaticAudioKey(); GCS object hashes use trimmed raw text
 * (see keys.ts) — do not change hash inputs without regenerating audio assets.
 */

/** Strip zero-width and BOM characters that break byte-identical lookup. */
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF\u2060]/g;

/** Curly/smart single quotes → ASCII apostrophe. */
const SMART_SINGLE_QUOTE_RE = /[\u2018\u2019\u201A\u201B]/g;

/** Curly/smart double quotes → ASCII double quote. */
const SMART_DOUBLE_QUOTE_RE = /[\u201C\u201D\u201E\u201F]/g;

/** En dash and hyphen variants → em dash (matches lesson copy in audio-lessons corpus). */
const DASH_VARIANT_RE = /[\u2010\u2011\u2012\u2013\u2014\u2015]/g;

const EM_DASH = "\u2014";

/**
 * Canonicalize speakable text before map lookup or catalog indexing.
 * Does not lowercase — use normalizeStaticAudioKey for map keys.
 */
export function canonicalizeStaticAudioText(text: string): string {
  return text
    .normalize("NFC")
    .replace(ZERO_WIDTH_RE, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(SMART_SINGLE_QUOTE_RE, "'")
    .replace(SMART_DOUBLE_QUOTE_RE, '"')
    .replace(DASH_VARIANT_RE, EM_DASH)
    .replace(/\s+/g, " ")
    .trim();
}

/** Canonical map lookup key — trim, canonicalize, lowercase. */
export function normalizeStaticAudioKey(text: string): string {
  return canonicalizeStaticAudioText(text).toLowerCase();
}

/** Lookup key when UI text has line breaks or extra spaces (study notes, poems). */
export function normalizeSpeakTextForLookup(text: string): string {
  const flattened = canonicalizeStaticAudioText(text).replace(/\n+/g, " ");
  return flattened.toLowerCase();
}

/** All normalized lookup variants attempted at runtime (strict order). */
export function staticAudioLookupKeyVariants(text: string): string[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];

  const variants = [
    normalizeStaticAudioKey(trimmed),
    normalizeSpeakTextForLookup(trimmed),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}
