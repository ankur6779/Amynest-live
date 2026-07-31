/**
 * YouTube thumbnails.set — additive helper (does not redesign publishing).
 */

import { readFile } from "node:fs/promises";
import type { ThumbnailUploadResult } from "./types.js";

const UNSUPPORTED_LOG =
  "Thumbnail upload unsupported. First-frame cover strategy used.";

/**
 * Attempt YouTube Data API thumbnails.set.
 * Shorts / unverified accounts often reject — never throw; return structured result.
 */
export async function uploadYouTubeThumbnail(input: {
  videoId: string;
  thumbnailJpgPath: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<ThumbnailUploadResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!input.videoId || !input.accessToken) {
    return {
      attempted: false,
      success: false,
      unsupported: true,
      reason: "Missing videoId or access token",
      logLine: UNSUPPORTED_LOG,
    };
  }

  try {
    const bytes = await readFile(input.thumbnailJpgPath);
    const response = await fetchImpl(
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(input.videoId)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "image/jpeg",
        },
        body: bytes,
      },
    );
    const text = await response.text();
    if (response.ok) {
      return {
        attempted: true,
        success: true,
        unsupported: false,
        httpStatus: response.status,
        apiResponse: text.slice(0, 500),
        logLine: `Thumbnail upload success (HTTP ${response.status}).`,
      };
    }

    const unsupported =
      response.status === 400 ||
      response.status === 403 ||
      /thumbnail|short|notAllowed|forbidden|invalid/i.test(text);

    return {
      attempted: true,
      success: false,
      unsupported,
      httpStatus: response.status,
      apiResponse: text.slice(0, 800),
      reason: `HTTP ${response.status}: ${text.slice(0, 200)}`,
      logLine: unsupported
        ? UNSUPPORTED_LOG
        : `Thumbnail upload failed (HTTP ${response.status}). First-frame cover strategy used.`,
    };
  } catch (err) {
    return {
      attempted: true,
      success: false,
      unsupported: true,
      reason: err instanceof Error ? err.message : String(err),
      logLine: UNSUPPORTED_LOG,
    };
  }
}

export { UNSUPPORTED_LOG };
