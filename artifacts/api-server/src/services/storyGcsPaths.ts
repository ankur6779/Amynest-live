const GCS_PREFIX = "story-hub";

const MIME_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/3gpp": "3gp",
  "video/3gpp2": "3g2",
  "video/mpeg": "mpeg",
};

/** Safe object key for a mirrored story video. */
export function storyGcsObjectName(driveFileId: string, mimeType: string, originalName?: string): string {
  const ext = extForStoryMime(mimeType, originalName);
  return `${GCS_PREFIX}/${driveFileId}.${ext}`;
}

export function extForStoryMime(mimeType: string, originalName?: string): string {
  const fromMime = MIME_EXT[mimeType];
  if (fromMime) return fromMime;
  const fromName = originalName?.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1];
  return fromName?.toLowerCase() ?? "mp4";
}

/** Public HTTPS URL (bucket must allow public read on story-hub/*). */
export function storyPublicGcsUrl(
  driveFileId: string,
  mimeType: string,
  bucketId: string,
  originalName?: string,
): string {
  return `https://storage.googleapis.com/${bucketId}/${storyGcsObjectName(driveFileId, mimeType, originalName)}`;
}

export function isValidStoryGcsUrl(url: unknown): url is string {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes("undefined")) return false;
  return trimmed.startsWith("https://storage.googleapis.com/") && trimmed.includes(`/${GCS_PREFIX}/`);
}

/** API-relative playback URL — never expose raw GCS (403/CORS on mobile/web). */
export function resolveStoryStreamUrl(story: { driveFileId: string }): string {
  return `/api/stories/stream/${story.driveFileId}`;
}
