import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  AUDIBLE_START_TIMEOUT_MS,
  MIN_AUDIO_BLOB_BYTES,
  validateAudioBlob,
  validateAudioSrc,
  waitForAudibleStart,
  waitForLoadingProgress,
} from "@/lib/amy-voice-audio-start";

vi.mock("@/lib/audio-playback-recovery", () => ({
  AUDIO_PLAYBACK_RECOVERY_MODE: true,
  SKIP_LIVE_TTS_WHEN_STATIC_EXISTS: true,
  isAudioPlaybackRecoveryMode: vi.fn(() => false),
  shouldSkipLiveTtsWhenStaticExists: vi.fn(() => true),
  logPlaybackElementState: vi.fn(),
  schedulePlaybackProgressCheck: vi.fn(),
}));

describe("amy-voice-audio-start", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("validateAudioSrc rejects missing src", () => {
    const audio = { src: "" } as HTMLAudioElement;
    expect(() => validateAudioSrc(audio)).toThrow(/invalid_audio_src/);
  });

  it("validateAudioBlob rejects tiny blobs", () => {
    expect(() => validateAudioBlob(new Blob([new Uint8Array(100)]))).toThrow(
      /invalid_audio_blob/,
    );
    expect(() =>
      validateAudioBlob(new Blob([new Uint8Array(MIN_AUDIO_BLOB_BYTES)])),
    ).not.toThrow();
  });

  it("waitForAudibleStart resolves on playing event", async () => {
    const listeners = new Map<string, Set<EventListener>>();
    const audio = {
      paused: true,
      currentTime: 0,
      addEventListener(type: string, fn: EventListener) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener(type: string, fn: EventListener) {
        listeners.get(type)?.delete(fn);
      },
    } as unknown as HTMLAudioElement;

    const promise = waitForAudibleStart(audio, AUDIBLE_START_TIMEOUT_MS);
    listeners.get("playing")?.forEach((fn) => fn(new Event("playing")));
    await expect(promise).resolves.toBe(true);
  });

  it("waitForAudibleStart rejects on timeout", async () => {
    const audio = {
      paused: true,
      currentTime: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLAudioElement;

    const promise = waitForAudibleStart(audio, 800);
    const asserted = expect(promise).rejects.toThrow(/audio_start_timeout/);
    await vi.advanceTimersByTimeAsync(801);
    await asserted;
  });

  it("waitForLoadingProgress rejects when currentTime stays 0", async () => {
    const audio = {
      currentTime: 0,
      ended: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLAudioElement;

    const promise = waitForLoadingProgress(audio, 1000);
    const asserted = expect(promise).rejects.toThrow(/audio_loading_stuck/);
    await vi.advanceTimersByTimeAsync(1001);
    await asserted;
  });
});
