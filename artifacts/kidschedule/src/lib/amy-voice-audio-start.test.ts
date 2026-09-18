import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  AUDIBLE_START_TIMEOUT_MS,
  MIN_AUDIO_BLOB_BYTES,
  looksLikeMpegAudioBytes,
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

  it("looksLikeMpegAudioBytes accepts ID3 and MPEG frame sync", () => {
    expect(looksLikeMpegAudioBytes(new Uint8Array([0xff, 0xf3, 0xc4]))).toBe(true);
    expect(looksLikeMpegAudioBytes(new Uint8Array([0x49, 0x44, 0x33]))).toBe(true);
    expect(looksLikeMpegAudioBytes(new Uint8Array([0x47, 0x00]))).toBe(false);
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
      paused: true,
      readyState: 0,
      muted: false,
      volume: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLAudioElement;

    const promise = waitForLoadingProgress(audio, 1000);
    const asserted = expect(promise).rejects.toThrow(/audio_loading_stuck/);
    await vi.advanceTimersByTimeAsync(1001);
    await asserted;
  });

  it("waitForLoadingProgress resolves when play() succeeded but currentTime is still 0", async () => {
    const audio = {
      currentTime: 0,
      ended: false,
      paused: false,
      readyState: 3,
      muted: false,
      volume: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLAudioElement;

    await expect(waitForLoadingProgress(audio, 1000)).resolves.toBeUndefined();
  });

  it("waitForAudibleStart resolves when readyState>=2 and not paused", async () => {
    const audio = {
      paused: false,
      currentTime: 0,
      readyState: 2,
      muted: false,
      volume: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLAudioElement;

    await expect(waitForAudibleStart(audio, 800)).resolves.toBe(true);
  });
});
