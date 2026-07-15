import { beforeEach, describe, expect, it, vi } from "vitest";

const playMock = vi.fn();
const waitUntilEndMock = vi.fn();
const createMock = vi.fn();
const unlockMock = vi.fn();
const primeMock = vi.fn();
const prepareRemoteMock = vi.fn();

vi.mock("@/lib/phonics-player", () => ({
  stopPhonicsPlayback: vi.fn(),
  isPhonicsPlaying: vi.fn(() => false),
}));

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
    create: (...args: unknown[]) => createMock(...args),
    getLastPlayError: vi.fn(() => null),
    warmMediaPipeline: vi.fn(),
  },
}));

vi.mock("@/lib/static-audio", () => ({
  prepareRemotePlaybackAudio: (...args: unknown[]) => prepareRemoteMock(...args),
}));

describe("playPreparedUrl lesson direct stream", () => {
  beforeEach(() => {
    playMock.mockReset();
    waitUntilEndMock.mockReset();
    createMock.mockReset();
    unlockMock.mockReset();
    primeMock.mockReset();
    prepareRemoteMock.mockReset();
    playMock.mockResolvedValue(true);
    waitUntilEndMock.mockResolvedValue({ ok: true });
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
    expect(waitUntilEndMock).toHaveBeenCalled();
  });
});
