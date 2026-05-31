import { afterEach, describe, expect, it, vi } from "vitest";
import { playLocalAudio, stopLocalAudio } from "@/lib/local-audio-playback";

describe("local-audio-playback", () => {
  const playMocks: ReturnType<typeof vi.fn>[] = [];

  afterEach(() => {
    stopLocalAudio();
    playMocks.length = 0;
    vi.unstubAllGlobals();
  });

  it("100 consecutive taps invoke play once per tap (no overlap)", async () => {
    class MockAudio {
      src = "";
      playbackRate = 1;
      paused = false;
      ended = false;
      preload = "auto";
      private listeners: Record<string, Array<() => void>> = {};

      play = vi.fn(() => {
        playMocks.push(this.play);
        this.paused = false;
        this.listeners.ended?.forEach((fn) => fn());
        return Promise.resolve();
      });

      addEventListener(type: string, fn: () => void) {
        (this.listeners[type] ??= []).push(fn);
      }

      removeEventListener(type: string, fn: () => void) {
        this.listeners[type] = (this.listeners[type] ?? []).filter((h) => h !== fn);
      }

      pause() {
        this.paused = true;
      }

      removeAttribute() {}
      load() {}
    }

    vi.stubGlobal("Audio", MockAudio as unknown as typeof Audio);

    let successes = 0;
    for (let i = 0; i < 100; i++) {
      const r = await playLocalAudio(`/audio-pack/phonics-word/sat.mp3?id=${i}`);
      if (r.ok) successes += 1;
    }

    expect(successes).toBe(100);
    expect(playMocks.length).toBe(100);
  });
});
