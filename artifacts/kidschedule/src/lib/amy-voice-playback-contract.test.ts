import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  assertStreamingAllowed,
  canUseStreaming,
  resolvePlaybackMode,
  shouldTriggerCompletion,
  waitForSafePlaybackCompletion,
} from "@/lib/amy-voice-playback-contract";

describe("amy-voice-playback-contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to full-required when no flags set", () => {
    expect(resolvePlaybackMode()).toBe("full-required");
    expect(resolvePlaybackMode({})).toBe("full-required");
  });

  it("maps lesson and narration to full-required", () => {
    expect(resolvePlaybackMode({ lessonParagraph: true })).toBe("full-required");
    expect(resolvePlaybackMode({ narration: true })).toBe("full-required");
    expect(resolvePlaybackMode({ waitUntilEnd: true })).toBe("full-required");
  });

  it("maps phonics taps to partial-ok", () => {
    expect(resolvePlaybackMode({ mode: "phonics" })).toBe("partial-ok");
  });

  it("explicit playbackMode wins", () => {
    expect(
      resolvePlaybackMode({ lessonParagraph: true, playbackMode: "partial-ok" }),
    ).toBe("partial-ok");
  });

  it("canUseStreaming is only true for partial-ok", () => {
    expect(canUseStreaming("partial-ok")).toBe(true);
    expect(canUseStreaming("full-required")).toBe(false);
  });

  it("assertStreamingAllowed throws in dev for full-required + streaming", () => {
    expect(() => assertStreamingAllowed("full-required", true)).toThrow(
      /Streaming not allowed/,
    );
    expect(() => assertStreamingAllowed("partial-ok", true)).not.toThrow();
  });

  it("shouldTriggerCompletion rejects early completion for full-required", () => {
    expect(
      shouldTriggerCompletion({
        mode: "full-required",
        actualPlayedDuration: 1,
        expectedDuration: 10,
      }),
    ).toBe(false);
    expect(
      shouldTriggerCompletion({
        mode: "full-required",
        actualPlayedDuration: 9.9,
        expectedDuration: 10,
      }),
    ).toBe(true);
    expect(
      shouldTriggerCompletion({
        mode: "partial-ok",
        actualPlayedDuration: 0.5,
        expectedDuration: 10,
      }),
    ).toBe(true);
  });

  it("partial stream ended early does NOT satisfy full-required completion", async () => {
    const audio = {
      currentTime: 0.4,
      duration: 12,
      ended: true,
      paused: true,
    } as HTMLAudioElement;

    const promise = waitForSafePlaybackCompletion({
      audio,
      mode: "full-required",
      isCancelled: () => false,
      usedStreaming: true,
    });

    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(result.ok).toBe(false);
    expect(result.earlyCompletion).toBe(true);
  });

  it("full-required blocks streaming via canUseStreaming", () => {
    const lessonMode = resolvePlaybackMode({
      lessonParagraph: true,
      playbackMode: "full-required",
      waitUntilEnd: true,
    });
    expect(lessonMode).toBe("full-required");
    expect(canUseStreaming(lessonMode)).toBe(false);
  });

  it("partial ~4KB stream ended early must NOT complete full-required lesson", async () => {
    const partialDurationSec = 0.35;
    const audio = {
      currentTime: partialDurationSec,
      duration: 18,
      ended: true,
      paused: true,
    } as HTMLAudioElement;

    expect(
      shouldTriggerCompletion({
        mode: "full-required",
        actualPlayedDuration: partialDurationSec,
        expectedDuration: 18,
      }),
    ).toBe(false);

    const completion = await waitForSafePlaybackCompletion({
      audio,
      mode: "full-required",
      isCancelled: () => false,
      usedStreaming: true,
    });

    expect(completion.ok).toBe(false);
    expect(completion.earlyCompletion).toBe(true);
  });

  it("playStreamingTts rejects full-required mode (dev guard)", async () => {
    const { playStreamingTts } = await import("@/lib/amy-voice-stream-player");
    const authFetch = vi.fn();
    await expect(
      playStreamingTts(authFetch, { text: "lesson paragraph" }, {
        playbackMode: "full-required",
      }),
    ).rejects.toThrow(/Streaming not allowed/);
    expect(authFetch).not.toHaveBeenCalled();
  });
});
