/**
 * SEV-1 audio outage guards — MSE kill switch, Phase-1 blob drain, fallback chain.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isMseStreamingEnabled,
  playStreamingTts,
  streamTtsToObjectUrl,
  STREAM_MIN_START_BYTES,
} from "@/lib/amy-voice-stream-player";
import { resetAdminAudioOpsForTests } from "@/lib/admin-audio-ops";

function mockMp3Stream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(chunks[i]!);
      i += 1;
    },
  });
}

describe("amy-voice-stream-player outage recovery", () => {
  beforeEach(() => {
    resetAdminAudioOpsForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isMseStreamingEnabled defaults OFF (Phase-1 blob)", () => {
    expect(isMseStreamingEnabled()).toBe(false);
  });

  it("streamTtsToObjectUrl drains stream to blob without MSE play", async () => {
    const payload = new Uint8Array(STREAM_MIN_START_BYTES + 128).fill(0xab);
    const authFetch = vi.fn().mockResolvedValue(
      new Response(mockMp3Stream([payload]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg", "X-TTS-Cache-Key": "probe:key" },
      }),
    );
    const audioManager = await import("@/lib/audio-manager");
    const playSpy = vi.spyOn(audioManager.audioManager, "play");

    const result = await streamTtsToObjectUrl(authFetch, { text: "hello" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url.startsWith("blob:")).toBe(true);
      expect(result.cacheKey).toBe("probe:key");
    }
    expect(playSpy).not.toHaveBeenCalled();
    playSpy.mockRestore();
  });

  it("playStreamingTts falls back when stream request fails", async () => {
    const authFetch = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    const result = await playStreamingTts(authFetch, { text: "fail" }, {
      playbackMode: "partial-ok",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("stream_failed");
  });
});
