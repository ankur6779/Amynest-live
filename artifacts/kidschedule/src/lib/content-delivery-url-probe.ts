/**
 * Public delivery-chain probes. A GCS object existing is not enough —
 * the browser URL (proxy / Worker / signed issuer) must respond.
 */
export const PUBLIC_CONTENT_URLS = {
  reelsList: "https://www.amynest.in/api/reels/videos?offset=0&batch=3",
  storiesList: "https://www.amynest.in/api/stories",
  coloringListNeedsAuth: "https://www.amynest.in/api/coloring/list",
  worksheetsListNeedsAuth: "https://www.amynest.in/api/worksheets/list",
  kidsHowPreviewNeedsAuth: "https://www.amynest.in/api/kids-how-library/preview-url",
  reelsStreamPrefix: "https://www.amynest.in/api/reels/stream/",
  storiesStreamPrefix: "https://www.amynest.in/api/stories/stream/",
} as const;

export type ProbeResult = {
  url: string;
  ok: boolean;
  status: number | null;
  contentType: string | null;
  contentLength: string | null;
  acceptsRange: boolean;
  error: string | null;
};

export async function probeUrl(
  url: string,
  init: RequestInit = {},
): Promise<ProbeResult> {
  try {
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: init.headers,
      redirect: "follow",
    });
    return {
      url,
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get("content-type"),
      contentLength: res.headers.get("content-length"),
      acceptsRange:
        res.status === 206 ||
        (res.headers.get("accept-ranges") ?? "").toLowerCase().includes("bytes"),
      error: null,
    };
  } catch (err) {
    return {
      url,
      ok: false,
      status: null,
      contentType: null,
      contentLength: null,
      acceptsRange: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function probeReelsList(): Promise<ProbeResult> {
  return probeUrl(PUBLIC_CONTENT_URLS.reelsList);
}

export async function probeReelStreamRange(reelId: string): Promise<ProbeResult> {
  return probeUrl(`${PUBLIC_CONTENT_URLS.reelsStreamPrefix}${reelId}`, {
    method: "GET",
    headers: { Range: "bytes=0-1023" },
  });
}
