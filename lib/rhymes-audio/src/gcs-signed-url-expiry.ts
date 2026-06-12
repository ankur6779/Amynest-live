/** Safety buffer before GCS signature expiry — refresh early to avoid ExpiredToken at playback. */
export const GCS_SIGNED_URL_EXPIRY_BUFFER_MS = 30_000;

function readQueryParam(signedUrl: string, key: string): string | null {
  const qIdx = signedUrl.indexOf("?");
  if (qIdx < 0) return null;
  for (const part of signedUrl.slice(qIdx + 1).split("&")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = decodeURIComponent(part.slice(0, eq));
    if (k === key) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

/**
 * Parse GCS V4 signed URL expiry from X-Goog-Date + X-Goog-Expires query params.
 * Returns epoch ms or null when params are missing/invalid.
 */
export function parseGcsV4SignedUrlExpiresAtMs(signedUrl: string): number | null {
  try {
    const dateParam = readQueryParam(signedUrl, "X-Goog-Date");
    const expiresParam = readQueryParam(signedUrl, "X-Goog-Expires");
    if (!dateParam || !expiresParam) return null;

    const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(dateParam);
    if (!match) return null;

    const [, y, mo, d, h, mi, s] = match;
    const signedAtMs = Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    );
    const expiresSec = Number(expiresParam);
    if (!Number.isFinite(signedAtMs) || !Number.isFinite(expiresSec) || expiresSec <= 0) {
      return null;
    }
    return signedAtMs + expiresSec * 1000;
  } catch {
    return null;
  }
}

/** True when the GCS signature is still valid (with optional buffer). */
export function isGcsSignedUrlValid(
  signedUrl: string,
  nowMs = Date.now(),
  bufferMs = GCS_SIGNED_URL_EXPIRY_BUFFER_MS,
): boolean {
  const expiresAt = parseGcsV4SignedUrlExpiresAtMs(signedUrl);
  if (expiresAt == null) return false;
  return nowMs + bufferMs < expiresAt;
}
