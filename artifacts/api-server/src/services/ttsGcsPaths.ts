const GCS_PREFIX = "tts-cache";

/** Object key in the bucket (content-addressed SHA-256 hash). */
export function ttsGcsObjectName(cacheKey: string): string {
  return `${GCS_PREFIX}/${cacheKey}.mp3`;
}

/** Public HTTPS URL for a cached MP3 (bucket must allow public read). */
export function ttsPublicGcsUrl(cacheKey: string, bucketId: string): string {
  return `https://storage.googleapis.com/${bucketId}/${ttsGcsObjectName(cacheKey)}`;
}

/** Reject missing, non-string, or template-literal "undefined" URLs. */
export function isValidTtsPublicUrl(url: unknown): url is string {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes("undefined")) return false;
  if (trimmed.startsWith("https://storage.googleapis.com/")) return true;
  return /^\/api\/tts\/audio\/[a-f0-9]{64}\.mp3$/.test(trimmed);
}
