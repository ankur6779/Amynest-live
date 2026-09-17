/**
 * Shared AudioPlayButton — click → useAmyVoice.speak, and play() errors must surface.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const speakMock = vi.fn().mockResolvedValue({ success: true, layer: "static" });
const pauseMock = vi.fn();
const toastMock = vi.fn();
let mockVoice = {
  speaking: false,
  loading: false,
  error: null as string | null,
  activePhrase: null as string | null,
};

vi.mock("@/hooks/use-amy-voice", () => ({
  useAmyVoice: () => ({
    speak: speakMock,
    pause: pauseMock,
    playPreparedUrl: vi.fn(),
    primeSpeakGesture: vi.fn(),
    speaking: mockVoice.speaking,
    loading: mockVoice.loading,
    error: mockVoice.error,
    activePhrase: mockVoice.activePhrase,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/phonics-static-audio", () => ({
  resolvePhonicsAudioKey: () => "",
  isPhonicsLibraryOnlyEnforced: () => false,
}));

vi.mock("@/lib/phonics-audio-availability", () => ({
  checkPhonicsLetterClip: () => ({ available: true }),
  checkPhonicsWordClip: () => ({ available: true }),
  checkPhonicsContentClip: () => ({ available: true }),
}));

vi.mock("@/lib/phonics-player", () => ({
  subscribePhonicsPlayback: () => () => {},
  isPhonicsPlaying: () => false,
}));

vi.mock("@/lib/static-audio", () => ({
  onStaticAudioVisualFallback: () => () => {},
  preloadStaticPhrases: vi.fn(),
  prefetchStaticAudioUrl: vi.fn(),
  lookupStaticAudioUrl: () => null,
  primeStaticAudioInUserGesture: vi.fn(),
}));

vi.mock("@/lib/unified-catalog-playback", () => ({
  catalogPlaybackSpeakOptions: () => ({}),
  hasStaticCatalogAudio: () => false,
  hasPhonicsStaticCatalogAudio: () => false,
  playCatalogPreparedUrl: vi.fn(),
  resolvePhonicsCatalogPhrase: (t: string) => t,
  shouldBypassPhonicsSpellingLibraries: () => false,
}));

vi.mock("@/lib/local-audio-recovery", () => ({
  isLocalAudioRecoveryEnabled: () => false,
}));

vi.mock("@/lib/phonics-audio-engine", () => ({
  phonicsEnginePlayWord: vi.fn(),
  phonicsEngineStop: vi.fn(),
}));

vi.mock("@/lib/phonics-local-playback", () => ({
  isPhonicsLocalPlaybackAvailable: () => false,
  playLocalPhonicsLetter: vi.fn(),
  playLocalPhonicsWord: vi.fn(),
}));

vi.mock("@/lib/phonics-audio", () => ({
  speakPhonicsFastClip: vi.fn(),
}));

vi.mock("@/lib/phonics-v2/audio-prefetch", () => ({
  prefetchPhonicsTileAudio: vi.fn(),
}));

vi.mock("@/lib/audio-manager", () => ({
  audioManager: { unlockFromUserGesture: vi.fn() },
  AUDIO_UI_MESSAGE: { TAP_TO_ENABLE_SOUND: "Tap to enable sound" },
  onAudioNeedsUserGesture: () => () => {},
}));

import { AudioPlayButton } from "./audio-play-button";

beforeEach(() => {
  speakMock.mockReset();
  speakMock.mockResolvedValue({ success: true, layer: "static" });
  pauseMock.mockReset();
  toastMock.mockReset();
  mockVoice = { speaking: false, loading: false, error: null, activePhrase: null };
  cleanup();
});

describe("AudioPlayButton", () => {
  it("renders a labeled play control", () => {
    render(<AudioPlayButton text="hello" ariaLabel="Play Amy's response" />);
    const btn = screen.getByRole("button", { name: "Play Amy's response" });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
  });

  it("uses the 48px lg size when requested", () => {
    render(<AudioPlayButton text="hello" size="lg" ariaLabel="Play hello" />);
    expect(screen.getByRole("button", { name: "Play hello" })).toHaveClass("h-12", "w-12");
  });

  it("calls speak() with the button text", async () => {
    const user = userEvent.setup();
    render(<AudioPlayButton text="hello amy" ariaLabel="Play Amy's response" />);
    await user.click(screen.getByRole("button", { name: "Play Amy's response" }));
    await waitFor(() => expect(speakMock).toHaveBeenCalled());
    expect(speakMock.mock.calls[0][0]).toBe("hello amy");
  });

  it("toasts when speak() rejects instead of swallowing the error", async () => {
    speakMock.mockRejectedValue(new Error("NotAllowedError"));
    const user = userEvent.setup();
    render(<AudioPlayButton text="hello" ariaLabel="Play Amy's response" />);
    await user.click(screen.getByRole("button", { name: "Play Amy's response" }));
    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect(toastMock.mock.calls[0][0]).toMatchObject({
      title: "Voice unavailable",
      variant: "destructive",
    });
  });

  it("shows a visual fallback when speak() returns success: false", async () => {
    speakMock.mockResolvedValue({ success: false, error: "tts_timeout" });
    const user = userEvent.setup();
    render(<AudioPlayButton text="hello" ariaLabel="Play Amy's response" />);
    await user.click(screen.getByRole("button", { name: "Play Amy's response" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Play Amy's response" }).className).toMatch(
        /ring-amber/,
      ),
    );
  });

  it("does not call speak() for empty text", async () => {
    const user = userEvent.setup();
    render(<AudioPlayButton text="   " ariaLabel="Play Amy's response" />);
    await user.click(screen.getByRole("button", { name: "Play Amy's response" }));
    await waitFor(() => expect(speakMock).not.toHaveBeenCalled());
  });

  it("toasts when speak() returns invalid_audio_url", async () => {
    speakMock.mockResolvedValue({ success: false, error: "invalid_audio_url" });
    const user = userEvent.setup();
    render(<AudioPlayButton text="hello" ariaLabel="Play Amy's response" />);
    await user.click(screen.getByRole("button", { name: "Play Amy's response" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Play Amy's response" }).className).toMatch(
        /ring-amber/,
      ),
    );
  });
});
