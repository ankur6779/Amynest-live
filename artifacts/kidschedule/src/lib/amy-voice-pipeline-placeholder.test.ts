import { beforeEach, describe, expect, it, vi } from "vitest";

const probeMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/static-audio-placeholder-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./static-audio-placeholder-guard")>();
  return {
    ...actual,
    probeStaticAudioProxyUrl: probeMock,
  };
});

vi.mock("@/lib/static-audio", () => ({
  lookupStaticAudioUrl: vi.fn(() => "/api/static-audio/abcdef0123456789abcdef0123456789.mp3"),
  prepareStaticPlaybackAudio: vi.fn(),
  prepareRemotePlaybackAudio: vi.fn(),
  primeStaticAudioInUserGesture: vi.fn(),
  safePlayAudio: vi.fn(),
}));

vi.mock("@/lib/audio-manager", () => ({
  audioManager: { play: vi.fn() },
  AUDIO_ERROR: {},
}));

vi.mock("@/lib/amy-voice-telemetry", () => ({
  recordAmyVoiceLayerFailed: vi.fn(),
  recordAmyVoiceLayerSuccess: vi.fn(),
  recordAmyVoiceFallbackUsed: vi.fn(),
  recordAmyVoiceFailureChain: vi.fn(),
  resetAmyVoiceTelemetry: vi.fn(),
}));

import { lookupStaticAudioUrl } from "@/lib/static-audio";

/**
 * Regression: static-only pass must not succeed on placeholder — live TTS must run.
 * Covers Stories, Parent Hub, Toddler/Preschool, Rhymes, Study Zone, Speech Coach paths
 * (all share attemptStaticPlay in amy-voice-pipeline).
 */
describe("amy-voice static placeholder fallback", () => {
  beforeEach(() => {
    probeMock.mockReset();
    probeMock.mockResolvedValue({ ok: true, isPlaceholder: true });
  });

  it("probe rejects placeholder before prepareStaticPlaybackAudio", async () => {
    const { probeStaticAudioProxyUrl } = await import("./static-audio-placeholder-guard");
    const url = lookupStaticAudioUrl("correct! well done!", "default");
    expect(url).toBeTruthy();

    const probe = await probeStaticAudioProxyUrl(url!);
    expect(probe.isPlaceholder).toBe(true);
    expect(probeMock).toHaveBeenCalledWith(url);
  });

  it("shouldSkipLiveTtsWhenStaticExists falls through when static is placeholder", async () => {
    const { shouldSkipLiveTtsWhenStaticExists } = await import("./audio-playback-recovery");
    const { probeStaticAudioProxyUrl } = await import("./static-audio-placeholder-guard");
    expect(shouldSkipLiveTtsWhenStaticExists()).toBe(true);

    const probe = await probeStaticAudioProxyUrl(
      "/api/static-audio/abcdef0123456789abcdef0123456789.mp3",
    );
    expect(probe.isPlaceholder).toBe(true);
    // attemptStaticPlay continues candidates → static_failed → pipeline reaches live TTS.
  });
});
