/**
 * Deterministic GCS object paths for the phonics audio library.
 * Pattern: phonics/{type}/{id}.mp3 — no random IDs.
 */

export type PhonicsAssetType =
  | "letter"
  | "digraph"
  | "blend"
  | "cvc"
  | "sight_word"
  | "sentence"
  | "quiz";

const TYPE_FOLDER: Record<PhonicsAssetType, string> = {
  letter: "letters",
  digraph: "digraphs",
  blend: "blends",
  cvc: "cvc",
  sight_word: "sight_words",
  sentence: "sentences",
  quiz: "quizzes",
};

/** Sanitize id for object key (lowercase alphanumeric + underscore). */
export function sanitizePhonicsAssetId(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** GCS object path relative to bucket root, e.g. phonics/letters/a.mp3 */
export function getPhonicsGcsObjectPath(type: PhonicsAssetType, id: string): string {
  const folder = TYPE_FOLDER[type];
  const safeId = sanitizePhonicsAssetId(id);
  if (!safeId) throw new Error(`Invalid phonics asset id: "${id}"`);
  return `phonics/${folder}/${safeId}.mp3`;
}

/** Public HTTPS URL for a phonics asset in GCS. */
export function getPhonicsGcsPublicUrl(
  bucketId: string,
  type: PhonicsAssetType,
  id: string,
): string {
  const objectPath = getPhonicsGcsObjectPath(type, id);
  return `https://storage.googleapis.com/${bucketId}/${objectPath}`;
}

/** Stable catalog key used in client maps and IndexedDB (type:id). */
export function getPhonicsCatalogKey(type: PhonicsAssetType, id: string): string {
  return `${type}:${sanitizePhonicsAssetId(id)}`;
}

/** Parse catalog key back to type + id. */
export function parsePhonicsCatalogKey(
  key: string,
): { type: PhonicsAssetType; id: string } | null {
  const idx = key.indexOf(":");
  if (idx <= 0) return null;
  const type = key.slice(0, idx) as PhonicsAssetType;
  const id = key.slice(idx + 1);
  if (!TYPE_FOLDER[type] || !id) return null;
  return { type, id };
}
