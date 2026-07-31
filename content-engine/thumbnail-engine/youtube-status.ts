/**
 * Post-upload YouTube thumbnail status check (additive).
 * Determines custom thumb vs Shorts first-frame selection.
 */

import type { YouTubeThumbnailStatus } from "./types.js";

/**
 * Fetch video snippet thumbnails after an optional wait.
 * Does not change publishing architecture — read-only Data API call.
 */
export async function checkYouTubeThumbnailStatus(input: {
  videoId: string;
  accessToken: string;
  /** Wait before check (ms). Default 0; Shorts often need 5–10 minutes. */
  waitMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}): Promise<YouTubeThumbnailStatus> {
  const waitMs = Math.max(0, input.waitMs ?? 0);
  const fetchImpl = input.fetchImpl ?? fetch;
  const sleep =
    input.sleep ??
    ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  if (!input.videoId || !input.accessToken) {
    return {
      checked: false,
      customThumbnailApplied: null,
      shortsLikelyUsesFirstFrame: null,
      waitedMs: 0,
      evidence: "Missing videoId or access token — status check skipped.",
    };
  }

  if (waitMs > 0) await sleep(waitMs);

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${encodeURIComponent(input.videoId)}`;
    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        checked: true,
        customThumbnailApplied: null,
        shortsLikelyUsesFirstFrame: null,
        waitedMs: waitMs,
        evidence: `videos.list failed HTTP ${response.status}: ${text.slice(0, 240)}`,
      };
    }

    const payload = JSON.parse(text) as {
      items?: Array<{
        snippet?: {
          thumbnails?: Record<string, { url?: string; width?: number; height?: number }>;
          title?: string;
        };
      }>;
    };
    const thumbs = payload.items?.[0]?.snippet?.thumbnails ?? {};
    const urls: Record<string, string> = {};
    for (const [k, v] of Object.entries(thumbs)) {
      if (v?.url) urls[k] = v.url;
    }

    const maxUrl = urls.maxres ?? urls.standard ?? urls.high ?? urls.medium ?? urls.default;
    // Custom uploads typically appear as i.ytimg.com/vi/<id>/maxresdefault.jpg OR sddefault
    // after processing; freshly auto frames often only expose default/mqdefault quickly.
    // Heuristic: presence of maxresdefault OR hq720 after wait suggests custom or strong frame;
    // if only default + mqdefault, Shorts likely still on auto first-frame.
    const keys = Object.keys(urls);
    const hasMaxRes = Boolean(urls.maxres || /maxresdefault|hq720/i.test(maxUrl ?? ""));
    const onlyAuto =
      keys.length > 0 &&
      keys.every((k) => ["default", "medium", "high"].includes(k)) &&
      !hasMaxRes;

    // Another signal: custom thumbs sometimes include "yt3.ggpht" or distinct paths — rare.
    const customHint = /\/vi_webp\/|maxresdefault|sddefault/i.test(maxUrl ?? "");

    const customThumbnailApplied = hasMaxRes || customHint;
    const shortsLikelyUsesFirstFrame = onlyAuto || !customThumbnailApplied;

    return {
      checked: true,
      customThumbnailApplied,
      shortsLikelyUsesFirstFrame,
      waitedMs: waitMs,
      thumbnailUrls: urls,
      evidence: customThumbnailApplied
        ? `Custom / high-res thumbnail present (${keys.join(", ")}).`
        : `Likely Shorts first-frame selection — only auto sizes (${keys.join(", ") || "none"}). Live cover strategy is the safety net.`,
    };
  } catch (err) {
    return {
      checked: true,
      customThumbnailApplied: null,
      shortsLikelyUsesFirstFrame: null,
      waitedMs: waitMs,
      evidence: `Status check error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
