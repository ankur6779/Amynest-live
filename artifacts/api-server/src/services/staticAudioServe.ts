import type { Request, Response } from "express";

/** Edge/CDN-friendly cache policy — immutable hash URLs, SWR for background refresh. */
export const STATIC_AUDIO_CACHE_CONTROL =
  "public, max-age=31536000, stale-while-revalidate=86400, immutable";

export const STATIC_AUDIO_CDN_CACHE_CONTROL =
  "public, max-age=31536000, stale-while-revalidate=86400";

/**
 * Placeholders must NEVER be edge-cached as immutable.
 * A prior bug cached 256-byte placeholders for 1 year under the real hash URL,
 * poisoning Cloudflare HIT responses even after GCS had the real MP3.
 */
export const STATIC_AUDIO_PLACEHOLDER_CACHE_CONTROL =
  "private, no-store, no-cache, max-age=0, must-revalidate";

type ByteRange = { start: number; end: number };

function parseRangeHeader(rangeHeader: string | undefined, size: number): ByteRange | null {
  if (!rangeHeader?.startsWith("bytes=")) return null;
  const part = rangeHeader.slice(6).trim();
  const dash = part.indexOf("-");
  if (dash < 0) return null;

  const startStr = part.slice(0, dash);
  const endStr = part.slice(dash + 1);

  let start = startStr ? Number.parseInt(startStr, 10) : 0;
  let end = endStr ? Number.parseInt(endStr, 10) : size - 1;

  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  if (start < 0) start = 0;
  if (end >= size) end = size - 1;
  if (start > end || start >= size) return null;

  return { start, end };
}

function applyEdgeCacheHeaders(
  res: Response,
  hash: string,
  byteLength: number,
  originCache: "memory" | "gcs",
  contentType = "audio/mpeg",
  staticSource: "asset" | "placeholder" = "asset",
): void {
  // Distinct ETag so a later real asset (`"hash"`) is not treated as 304 of a placeholder.
  const etag = staticSource === "placeholder" ? `"${hash}-placeholder"` : `"${hash}"`;
  res.setHeader("Content-Type", contentType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(STATIC_AUDIO_SOURCE_HEADER, staticSource);
  res.setHeader("ETag", etag);
  if (staticSource === "placeholder") {
    res.setHeader("Cache-Control", STATIC_AUDIO_PLACEHOLDER_CACHE_CONTROL);
    res.setHeader("CDN-Cache-Control", STATIC_AUDIO_PLACEHOLDER_CACHE_CONTROL);
    res.setHeader("Cloudflare-CDN-Cache-Control", STATIC_AUDIO_PLACEHOLDER_CACHE_CONTROL);
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("Cache-Tag", `static-audio-placeholder,static-audio-${hash}`);
  } else {
    res.setHeader("Cache-Control", STATIC_AUDIO_CACHE_CONTROL);
    res.setHeader("CDN-Cache-Control", STATIC_AUDIO_CDN_CACHE_CONTROL);
    res.setHeader("Cloudflare-CDN-Cache-Control", STATIC_AUDIO_CDN_CACHE_CONTROL);
    res.setHeader("Surrogate-Control", "max-age=31536000");
    res.setHeader("Cache-Tag", `static-audio,static-audio-${hash}`);
  }
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Vary", "Accept-Encoding");
  res.setHeader("Content-Length", String(byteLength));
  res.setHeader("X-AmyNest-Origin-Cache", originCache);
}

export type ServeStaticBufferOptions = {
  /** Defaults to audio/mpeg for MP3 library routes. */
  contentType?: string;
  /** `placeholder` when bytes are the fail-safe silent clip — clients must not treat as success. */
  staticSource?: "asset" | "placeholder";
};

export const STATIC_AUDIO_SOURCE_HEADER = "X-AmyNest-Static-Source";

/** Stream bytes with Range support and edge-cache headers. */
export function serveStaticAudioBuffer(
  req: Request,
  res: Response,
  hash: string,
  buffer: Buffer,
  originCache: "memory" | "gcs",
  options?: ServeStaticBufferOptions,
): void {
  const contentType = options?.contentType ?? "audio/mpeg";
  const size = buffer.byteLength;
  const staticSource = options?.staticSource ?? "asset";
  const etag = staticSource === "placeholder" ? `"${hash}-placeholder"` : `"${hash}"`;
  const ifNoneMatch = req.headers["if-none-match"];

  // Never 304 a placeholder — clients must revalidate until real bytes exist.
  if (
    staticSource === "asset" &&
    (ifNoneMatch === etag || ifNoneMatch === hash || ifNoneMatch === `"${hash}"`)
  ) {
    res.setHeader("Cache-Control", STATIC_AUDIO_CACHE_CONTROL);
    res.setHeader("CDN-Cache-Control", STATIC_AUDIO_CDN_CACHE_CONTROL);
    res.status(304).end();
    return;
  }

  const range = parseRangeHeader(req.headers.range, size);

  if (!range) {
    applyEdgeCacheHeaders(res, hash, size, originCache, contentType, staticSource);
    res.status(200).end(buffer);
    return;
  }

  const chunk = buffer.subarray(range.start, range.end + 1);
  const chunkLen = chunk.byteLength;

  applyEdgeCacheHeaders(res, hash, chunkLen, originCache, contentType, staticSource);
  res.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  res.status(206).end(chunk);
}
