const GCS_PREFIX = "tts-cache";

/** Object key in the bucket (content-addressed SHA-256 hash). */
export function ttsGcsObjectName(cacheKey: string): string {
  return `${GCS_PREFIX}/${cacheKey}.mp3`;
}

/** Public HTTPS URL for a cached MP3 (bucket must allow public read). */
export function ttsPublicGcsUrl(cacheKey: string, bucketId: string): string {
  return `https://storage.googleapis.com/${bucketId}/${ttsGcsObjectName(cacheKey)}`;
}
