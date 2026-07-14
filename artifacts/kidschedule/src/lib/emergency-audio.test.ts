import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forceEmergencyPlayback, playFallbackTone } from "@/lib/emergency-audio";

vi.mock("@/lib/audio-manager", () => ({
  audioManager: {
    create: vi.fn(),
    play: vi.fn(),
    waitUntilEnd: vi.fn(),
  },
}));

vi.mock("@/lib/tts-guard", () => ({
  isAudioUnlocked: vi.fn(() => true),
}));

class MockOscillator {
  frequency = { value: 0 };
  type = "sine";
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockGain {
  gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
}

class MockAudioContext {
  currentTime = 0;
  state = "running";
  destination = {};
  createOscillator = vi.fn(() => new MockOscillator());
  createGain = vi.fn(() => new MockGain());
  resume = vi.fn(async () => undefined);
}

describe("emergency-audio", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "AudioContext", {
      value: MockAudioContext,
      configurable: true,
    });
    Object.defineProperty(window, "webkitAudioContext", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: undefined,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("plays a fallback tone after audio is unlocked", async () => {
    const played = playFallbackTone();
    await vi.advanceTimersByTimeAsync(261);
    await expect(played).resolves.toBe(true);
  });

  it("uses the tone fallback when speech synthesis is unavailable", async () => {
    const played = forceEmergencyPlayback("hello");
    await vi.advanceTimersByTimeAsync(261);
    await expect(played).resolves.toEqual({
      success: true,
      forced: true,
      layer: "emergency_local",
    });
  });

  it("attempts full synthesis for long lesson paragraphs before tone fallback", async () => {
    const longParagraph =
      "When your child feels big emotions, pause and breathe together before you respond with words.";
    const speak = vi.fn();
    const utterance = {
      onstart: null as (() => void) | null,
      onend: null as (() => void) | null,
      onerror: null as (() => void) | null,
    };
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel: vi.fn(),
        speak: (u: typeof utterance) => {
          speak(u);
          u.onstart?.();
          u.onend?.();
        },
        speaking: false,
        pending: false,
        getVoices: () => [],
      },
      configurable: true,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: function SpeechSynthesisUtterance(this: typeof utterance, text: string) {
        Object.assign(this, utterance, { text });
        return this;
      },
      configurable: true,
    });

    const { playEmergencyPhrase } = await import("@/lib/emergency-audio");
    const played = playEmergencyPhrase(longParagraph);
    await vi.advanceTimersByTimeAsync(500);
    await expect(played).resolves.toBe(true);
    expect(speak).toHaveBeenCalled();
  });
});
