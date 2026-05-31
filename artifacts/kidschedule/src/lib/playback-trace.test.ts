import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  beginPlaybackTrace,
  flushPlaybackTrace,
  isPlaybackTraceEnabled,
  playbackTracePlayCalled,
  playbackTracePlaySettled,
} from "@/lib/playback-trace";

describe("playback-trace", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (key === "PLAYBACK_TRACE" ? "1" : null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    warn.mockClear();
    vi.unstubAllGlobals();
  });

  it("is enabled when PLAYBACK_TRACE=1", () => {
    expect(isPlaybackTraceEnabled()).toBe(true);
  });

  it("emits grouped trace with TRACE_ID on flush", () => {
    const audio = {
      readyState: 4,
      networkState: 1,
      paused: false,
      currentTime: 0.5,
      duration: 1.2,
      volume: 1,
      muted: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLAudioElement;

    const traceId = beginPlaybackTrace({
      owner: "Phonics",
      requestedUrl: "https://example.com/a.mp3",
      phrase: "a",
      audio,
      autoFlush: false,
    });
    expect(traceId).toMatch(/^pt-/);

    playbackTracePlayCalled(traceId, "Phonics", audio);
    playbackTracePlaySettled(traceId, "Phonics", true, audio);
    flushPlaybackTrace(traceId, "test_complete");

    expect(warn).toHaveBeenCalled();
    const block = String(warn.mock.calls[0]?.[0]);
    expect(block).toContain("PLAYBACK_TRACE");
    expect(block).toContain(`TRACE_ID=${traceId}`);
    expect(block).toContain("play() called");
    expect(block).toContain("play() resolved");
    expect(block).toContain("test_complete");
  });
});
