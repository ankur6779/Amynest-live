import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearStaticAudioProbeCache,
  isNearSilentStaticDuration,
  isPlaceholderStaticAsset,
  probeStaticAudioProxyUrl,
  STATIC_AUDIO_SOURCE_HEADER,
} from "./static-audio-placeholder-guard";

describe("static-audio-placeholder-guard", () => {
  beforeEach(() => {
    clearStaticAudioProbeCache();
    vi.restoreAllMocks();
  });

  it("detects placeholder header", () => {
    expect(
      isPlaceholderStaticAsset({ staticSourceHeader: "placeholder", contentLength: 256 }),
    ).toBe(true);
  });

  it("detects undersized content-length", () => {
    expect(isPlaceholderStaticAsset({ contentLength: 256 })).toBe(true);
    expect(isPlaceholderStaticAsset({ contentLength: 12_000 })).toBe(false);
  });

  it("probeStaticAudioProxyUrl caches placeholder rejection", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        [STATIC_AUDIO_SOURCE_HEADER]: "placeholder",
        "content-length": "256",
      }),
    }) as unknown as typeof fetch;

    const url = "/api/static-audio/abcdef0123456789abcdef0123456789.mp3";
    const first = await probeStaticAudioProxyUrl(url);
    const second = await probeStaticAudioProxyUrl(url);

    expect(first.isPlaceholder).toBe(true);
    expect(second.isPlaceholder).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("isNearSilentStaticDuration rejects placeholder-length clips", () => {
    expect(isNearSilentStaticDuration(0.05)).toBe(true);
    expect(isNearSilentStaticDuration(1.2)).toBe(false);
  });
});
