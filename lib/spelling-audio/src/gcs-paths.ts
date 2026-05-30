import type { SpellingAudioVersion } from "./types.js";
import { SPELLING_AUDIO_VERSION } from "./types.js";

/** Bounded spelling library object paths: spelling/v{n}/{slug}.mp3 */
export const SPELLING_GCS_OBJECT_PATH_RE =
  /^spelling\/v[0-9]+\/[a-z0-9_-]+\.mp3$/i;

export function sanitizeSpellingWordSlug(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function getSpellingGcsObjectPath(
  word: string,
  version: SpellingAudioVersion = SPELLING_AUDIO_VERSION,
): string {
  const slug = sanitizeSpellingWordSlug(word);
  if (!slug) throw new Error(`Invalid spelling word for GCS path: "${word}"`);
  return `spelling/${version}/${slug}.mp3`;
}

export function isValidSpellingGcsObjectPath(objectPath: string): boolean {
  return SPELLING_GCS_OBJECT_PATH_RE.test((objectPath ?? "").trim());
}

/** Same-origin API stream route — avoids browser CORS on public GCS objects. */
export function spellingLibraryProxyPath(gcsObjectPath: string): string {
  const trimmed = (gcsObjectPath ?? "").trim();
  if (!isValidSpellingGcsObjectPath(trimmed)) {
    throw new Error(`Invalid spelling GCS object path: ${gcsObjectPath}`);
  }
  return `/api/spelling-library/${trimmed}`;
}

export function getSpellingGcsPublicUrl(
  bucketId: string,
  word: string,
  version: SpellingAudioVersion = SPELLING_AUDIO_VERSION,
): string {
  const objectPath = getSpellingGcsObjectPath(word, version);
  return `https://storage.googleapis.com/${bucketId}/${objectPath}`;
}
