/**
 * Byte-range helpers for immutable MP3/media at the Cloudflare edge.
 *
 * HTMLAudioElement always sends Range. Cloudflare CDN cache keys ignore Range and
 * can replay a cached 200 (full body, no Content-Range) for those requests —
 * Android WebView then fails to decode and currentTime stays 0.
 *
 * Serve 206 from the already-cached full GET instead of forwarding Range.
 */

/**
 * @param {string | null} rangeHeader
 * @param {number} size
 * @returns {{ start: number, end: number } | null}
 */
export function parseBytesRange(rangeHeader, size) {
  if (!rangeHeader || typeof rangeHeader !== "string") return null;
  if (size <= 0) return null;
  if (!rangeHeader.startsWith("bytes=")) return null;
  const part = rangeHeader.slice(6).trim().split(",")[0]?.trim() ?? "";
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

/**
 * @param {Headers} base
 * @param {{ start: number, end: number, size: number, sliceLength: number }} range
 * @returns {Headers}
 */
export function rangedAudioHeaders(base, range) {
  const headers = new Headers(base);
  headers.set("Content-Type", headers.get("Content-Type") || "audio/mpeg");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${range.size}`);
  headers.set("Content-Length", String(range.sliceLength));
  // 206 must not be stored as a URL-keyed 200 by Cloudflare CDN.
  headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  headers.set("CDN-Cache-Control", "no-store");
  headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  headers.set("Surrogate-Control", "no-store");
  return headers;
}

/**
 * Slice a full 200 audio Response into a 206 Partial Content Response.
 * @param {Response} full
 * @param {string | null} rangeHeader
 * @returns {Promise<Response>}
 */
export async function sliceFullAudioResponse(full, rangeHeader) {
  const buf = await full.arrayBuffer();
  const size = buf.byteLength;
  const parsed = parseBytesRange(rangeHeader, size);
  if (!parsed) {
    const headers = new Headers(full.headers);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Length", String(size));
    return new Response(buf, { status: 200, headers });
  }

  const slice = buf.slice(parsed.start, parsed.end + 1);
  const headers = rangedAudioHeaders(full.headers, {
    start: parsed.start,
    end: parsed.end,
    size,
    sliceLength: slice.byteLength,
  });
  return new Response(slice, { status: 206, headers });
}

/** Force Accept-Ranges on full GET cache hits so clients know Range is supported. */
export function withAcceptRanges(headers) {
  const out = new Headers(headers);
  if (!out.get("Accept-Ranges")) {
    out.set("Accept-Ranges", "bytes");
  }
  return out;
}
