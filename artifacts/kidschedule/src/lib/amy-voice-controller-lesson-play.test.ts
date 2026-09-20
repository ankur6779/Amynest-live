import { beforeEach, describe, expect, it, vi } from "vitest";

const playMock = vi.fn();
const waitUntilEndMock = vi.fn();
const waitForSafeMock = vi.fn();
const createMock = vi.fn();
const unlockMock = vi.fn();
const primeMock = vi.fn();
const prepareRemoteMock = vi.fn();

vi.mock("@/lib/phonics-player", () => ({
  stopPhonicsPlayback: vi.fn(),
  isPhonicsPlaying: vi.fn(() => false),
}));

const takePrimedMock = vi.fn(() => null);

vi.mock("@/lib/audio-manager", () => ({
  audioManager: {
    isSpeechPlaying: vi.fn(() => false),
    stopAll: vi.fn(),
    stop: vi.fn(),
    getCurrentElement: vi.fn(() => null),
    play: (...args: unknown[]) => playMock(...args),
    waitUntilEnd: (...args: unknown[]) => waitUntilEndMock(...args),
    unlockFromUserGesture: (...args: unknown[]) => unlockMock(...args),
    primeSpeechUrlInUserGesture: (...args: unknown[]) => primeMock(...args),
    takeGesturePrimedElement: (...args: unknown[]) => takePrimedMock(...args),
    create: (...args: unknown[]) => createMock(...args),
    getLastPlayError: vi.fn(() => null),
    warmMediaPipeline: vi.fn(),
  },
}));

vi.mock("@/lib/static-audio", () => ({
  prepareRemotePlaybackAudio: (...args: unknown[]) => prepareRemoteMock(...args),
}));

vi.mock("@/lib/amy-voice-playback-contract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/amy-voice-playback-contract")>();
  return {
    ...actual,
    waitForSafePlaybackCompletion: (...args: unknown[]) => waitForSafeMock(...args),
  };
});

describe("playPreparedUrl lesson direct stream", () => {
  beforeEach(() => {
    playMock.mockReset();
    waitUntilEndMock.mockReset();
    waitForSafeMock.mockReset();
    createMock.mockReset();
    unlockMock.mockReset();
    primeMock.mockReset();
    takePrimedMock.mockReset();
    takePrimedMock.mockReturnValue(null);
    prepareRemoteMock.mockReset();
    playMock.mockResolvedValue(true);
    waitForSafeMock.mockResolvedValue({ ok: true, earlyCompletion: false });
    createMock.mockReturnValue({ playbackRate: 1 } as HTMLAudioElement);
  });

  it("skips async blob prepare for lesson source so play stays in the gesture chain", async () => {
    const { amyVoiceController } = await import("@/lib/amy-voice-controller");
    amyVoiceController.pause();

    const res = await amyVoiceController.playPreparedUrl("/api/static-audio/abc.mp3", {
      source: "lesson",
      phrase: "Conflict is mutual.",
      srcType: "static",
      waitUntilEnd: true,
      preferDirectStream: true,
    });

    expect(res.success).toBe(true);
    expect(prepareRemoteMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalled();
    expect(unlockMock).toHaveBeenCalled();
    expect(primeMock).toHaveBeenCalled();
    expect(playMock).toHaveBeenCalled();
    expect(waitForSafeMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "full-required" }),
    );
    expect(waitUntilEndMock).not.toHaveBeenCalled();
  });

  it("rejects lesson playback when full-required completion is too short", async () => {
    waitForSafeMock.mockResolvedValueOnce({
      ok: false,
      earlyCompletion: true,
      actualPlayedDuration: 0.1,
      expectedDuration: 45,
    });

    const { amyVoiceController } = await import("@/lib/amy-voice-controller");
    amyVoiceController.pause();

    const res = await amyVoiceController.playPreparedUrl("/api/static-audio/abc.mp3", {
      source: "lesson",
      phrase: "Conflict is mutual.",
      srcType: "static",
      waitUntilEnd: true,
      preferDirectStream: true,
    });

    expect(res).toEqual({ success: false, error: "early_completion", layer: "static" });
  });

  it("reuses a keepPlaying gesture-primed element instead of creating a new Audio", async () => {
    const primed = { playbackRate: 1, paused: false, muted: false, volume: 1 } as HTMLAudioElement;
    takePrimedMock.mockReturnValueOnce(primed);

    const { amyVoiceController } = await import("@/lib/amy-voice-controller");
    amyVoiceController.pause();

    const res = await amyVoiceController.playPreparedUrl("/api/static-audio/abc.mp3", {
      source: "lesson",
      phrase: "Ask open questions.",
      srcType: "static",
      waitUntilEnd: true,
      preferDirectStream: true,
    });

    expect(res.success).toBe(true);
    expect(createMock).not.toHaveBeenCalled();
    expect(playMock).toHaveBeenCalledWith(
      primed,
      expect.objectContaining({ source: "lesson" }),
      expect.anything(),
    );
    expect(waitUntilEndMock).toHaveBeenCalledWith(primed, expect.any(Function));
  });
});
