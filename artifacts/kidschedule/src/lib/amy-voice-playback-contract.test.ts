import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  assertStreamingAllowed,
  canUseStreaming,
  isEarlyEndedEvent,
  isPlaybackComplete,
  resolvePlaybackMode,
  shouldTriggerCompletion,
  waitForSafePlaybackCompletion,
} from "@/lib/amy-voice-playback-contract";
import { audioManager } from "@/lib/audio-manager";

vi.mock("@/lib/audio-manager", () => ({
  audioManager: {
    waitUntilEnd: vi.fn(),
  },
}));

describe("amy-voice-playback-contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(audioManager.waitUntilEnd).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to partial-ok when no flags set", () => {
    expect(resolvePlaybackMode()).toBe("partial-ok");
    expect(resolvePlaybackMode({})).toBe("partial-ok");
  });

  it("maps lesson and waitUntilEnd to full-required", () => {
    expect(resolvePlaybackMode({ lessonParagraph: true })).toBe("full-required");
    expect(resolvePlaybackMode({ waitUntilEnd: true })).toBe("full-required");
  });

  it("parent hub and narration use streaming-first partial-ok", () => {
    expect(resolvePlaybackMode({ parentHub: true })).toBe("partial-ok");
    expect(resolvePlaybackMode({ narration: true })).toBe("partial-ok");
  });

  it("maps phonics taps to partial-ok", () => {
    expect(resolvePlaybackMode({ mode: "phonics" })).toBe("partial-ok");
  });

  it("explicit playbackMode wins", () => {
    expect(
      resolvePlaybackMode({ lessonParagraph: true, playbackMode: "partial-ok" }),
    ).toBe("partial-ok");
  });

  it("canUseStreaming is true for all playback modes", () => {
    expect(canUseStreaming("partial-ok")).toBe(true);
    expect(canUseStreaming("full-required")).toBe(true);
  });

  it("assertStreamingAllowed is a no-op for progressive streaming", () => {
    expect(() => assertStreamingAllowed("full-required", true)).not.toThrow();
    expect(() => assertStreamingAllowed("partial-ok", true)).not.toThrow();
  });

  it("isPlaybackComplete requires 98% of duration", () => {
    expect(isPlaybackComplete(19.5, 20)).toBe(false);
    expect(isPlaybackComplete(19.6, 20)).toBe(true);
  });

  it("isEarlyEndedEvent ignores ended below 95%", () => {
    expect(isEarlyEndedEvent(2, 20)).toBe(true);
    expect(isEarlyEndedEvent(19, 20)).toBe(false);
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
        mode: "full-required",
        actualPlayedDuration: 9.5,
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

  it("full-required accepts natural ended between 95% and 98% of metadata duration", async () => {
    const state = {
      currentTime: 19.5,
      duration: 20,
      ended: true,
      paused: true,
    };
    const audio = {
      get currentTime() {
        return state.currentTime;
      },
      get duration() {
        return state.duration;
      },
      get ended() {
        return state.ended;
      },
      get paused() {
        return state.paused;
      },
      play: vi.fn(),
    } as unknown as HTMLAudioElement;

    const promise = waitForSafePlaybackCompletion({
      audio,
      mode: "full-required",
      isCancelled: () => false,
      paragraphIdx: 1,
      knownDurationSec: 20,
    });

    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.actualPlayedDuration).toBe(19.5);
    expect(result.earlyCompletion).toBe(false);
    expect(audio.play).not.toHaveBeenCalled();
  });

  it("full-required with invalid duration falls back to waitUntilEnd", async () => {
    const audio = {
      currentTime: 0.5,
      duration: Number.NaN,
    } as HTMLAudioElement;
    vi.mocked(audioManager.waitUntilEnd).mockResolvedValue({ ok: true });

    const result = await waitForSafePlaybackCompletion({
      audio,
      mode: "full-required",
      isCancelled: () => false,
      knownDurationSec: 0,
    });

    expect(audioManager.waitUntilEnd).toHaveBeenCalledWith(audio, expect.any(Function));
    expect(result.ok).toBe(true);
  });

  it("20s lesson paragraph: early ended at 2s does NOT complete — resumes playback", async () => {
    const state = {
      currentTime: 2,
      duration: 20,
      ended: true,
      paused: true,
    };
    const play = vi.fn(async () => {
      state.ended = false;
      state.paused = false;
    });
    const audio = {
      get currentTime() {
        return state.currentTime;
      },
      get duration() {
        return state.duration;
      },
      get ended() {
        return state.ended;
      },
      get paused() {
        return state.paused;
      },
      play,
    } as unknown as HTMLAudioElement;

    const promise = waitForSafePlaybackCompletion({
      audio,
      mode: "full-required",
      isCancelled: () => false,
      paragraphIdx: 0,
      knownDurationSec: 20,
    });

    let resolved = false;
    void promise.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(resolved).toBe(false);
    expect(play).toHaveBeenCalled();

    state.currentTime = 19.8;
    state.ended = false;
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result.ok).toBe(true);
    expect(result.actualPlayedDuration).toBe(19.8);
    expect(result.earlyCompletion).toBe(false);
  });

  it("partial stream ended early does NOT complete full-required before 98%", async () => {
    const state = {
      currentTime: 0.4,
      duration: 12,
      ended: true,
      paused: true,
    };
    const play = vi.fn(async () => {
      state.ended = false;
      state.paused = false;
    });
    let cancelled = false;
    const audio = {
      get currentTime() {
        return state.currentTime;
      },
      get duration() {
        return state.duration;
      },
      get ended() {
        return state.ended;
      },
      get paused() {
        return state.paused;
      },
      play,
    } as unknown as HTMLAudioElement;

    const promise = waitForSafePlaybackCompletion({
      audio,
      mode: "full-required",
      isCancelled: () => cancelled,
      usedStreaming: true,
      knownDurationSec: 12,
    });

    let resolved = false;
    void promise.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(resolved).toBe(false);
    expect(
      shouldTriggerCompletion({
        mode: "full-required",
        actualPlayedDuration: state.currentTime,
        expectedDuration: 12,
      }),
    ).toBe(false);

    cancelled = true;
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result.ok).toBe(false);
  });

  it("full-required still allows streaming via canUseStreaming", () => {
    const lessonMode = resolvePlaybackMode({
      lessonParagraph: true,
      playbackMode: "full-required",
      waitUntilEnd: true,
    });
    expect(lessonMode).toBe("full-required");
    expect(canUseStreaming(lessonMode)).toBe(true);
  });

  it("partial ~4KB stream ended early must NOT complete full-required lesson before 98%", async () => {
    const partialDurationSec = 0.35;
    const state = {
      currentTime: partialDurationSec,
      duration: 18,
      ended: true,
      paused: true,
    };
    const audio = {
      get currentTime() {
        return state.currentTime;
      },
      get duration() {
        return state.duration;
      },
      get ended() {
        return state.ended;
      },
      get paused() {
        return state.paused;
      },
      play: vi.fn(async () => {
        state.ended = false;
        state.paused = false;
      }),
    } as unknown as HTMLAudioElement;

    expect(
      shouldTriggerCompletion({
        mode: "full-required",
        actualPlayedDuration: partialDurationSec,
        expectedDuration: 18,
      }),
    ).toBe(false);

    let cancelled = false;
    const completionPromise = waitForSafePlaybackCompletion({
      audio,
      mode: "full-required",
      isCancelled: () => cancelled,
      usedStreaming: true,
      knownDurationSec: 18,
    });

    let resolved = false;
    void completionPromise.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(resolved).toBe(false);

    cancelled = true;
    await vi.advanceTimersByTimeAsync(100);
    const result = await completionPromise;
    expect(result.ok).toBe(false);
  });

  it("playStreamingTts allows full-required mode with progressive pipeline", async () => {
    const { playStreamingTts } = await import("@/lib/amy-voice-stream-player");
    const authFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      body: null,
    });
    const result = await playStreamingTts(authFetch, { text: "lesson paragraph" }, {
      playbackMode: "full-required",
    });
    expect(result.ok).toBe(false);
    expect(authFetch).toHaveBeenCalled();
  });
});
