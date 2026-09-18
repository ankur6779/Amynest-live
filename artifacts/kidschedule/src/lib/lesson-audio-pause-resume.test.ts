import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audioManager, shouldRestartAudioFromBeginning } from "@/lib/audio-manager";

class FakeLessonAudio {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
  muted = false;
  volume = 1;
  playbackRate = 1;
  preload = "auto";
  error: MediaError | null = null;
  readyState = 4;
  playsInline = true;
  crossOrigin: string | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  playCalls = 0;
  pauseCalls = 0;
  loadCalls = 0;
  srcWrites = 0;

  constructor(init?: { src?: string; currentTime?: number; duration?: number; paused?: boolean; ended?: boolean }) {
    this.src = init?.src ?? "blob:http://localhost/lesson-p0";
    this.currentTime = init?.currentTime ?? 0;
    this.duration = init?.duration ?? 19.8;
    this.paused = init?.paused ?? false;
    this.ended = init?.ended ?? false;
  }

  setAttribute() {}
  removeAttribute() {}
  addEventListener() {}
  removeEventListener() {}
  load() {
    this.loadCalls += 1;
  }
  async play() {
    this.playCalls += 1;
    this.paused = false;
    this.ended = false;
    return undefined;
  }
  pause() {
    this.pauseCalls += 1;
    this.paused = true;
  }
}

type ManagerInternals = {
  channels: { speech: { current: HTMLAudioElement | null; playing: boolean } };
  playInFlight: boolean;
};

function internals(): ManagerInternals {
  return audioManager as unknown as ManagerInternals;
}

function attachSpeech(el: FakeLessonAudio | null, playing = false) {
  const mgr = internals();
  mgr.channels.speech.current = el as unknown as HTMLAudioElement | null;
  mgr.channels.speech.playing = playing;
  mgr.playInFlight = false;
}

describe("shouldRestartAudioFromBeginning", () => {
  it("does not reset a mid-clip paused position", () => {
    expect(
      shouldRestartAudioFromBeginning({
        ended: false,
        currentTime: 6.4,
        duration: 19.8,
      }),
    ).toBe(false);
  });

  it("restarts after the clip has ended", () => {
    expect(
      shouldRestartAudioFromBeginning({
        ended: true,
        currentTime: 19.8,
        duration: 19.8,
      }),
    ).toBe(true);
  });

  it("restarts when currentTime is at duration", () => {
    expect(
      shouldRestartAudioFromBeginning({
        ended: false,
        currentTime: 19.8,
        duration: 19.8,
      }),
    ).toBe(true);
  });
});

describe("audioManager pause / resume / stop", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    fetchSpy.mockReset();
    vi.stubGlobal("fetch", fetchSpy);
    audioManager.unlockFromUserGesture();
    attachSpeech(null);
  });

  afterEach(() => {
    attachSpeech(null);
    vi.unstubAllGlobals();
  });

  it("TEST 1: pause then play resumes around the paused time and does not reset to 0", async () => {
    const el = new FakeLessonAudio({ currentTime: 6.4, paused: false });
    attachSpeech(el, true);

    const pausedAt = audioManager.pauseSpeechPreservePosition();
    expect(pausedAt).toBeCloseTo(6.4, 5);
    expect(el.paused).toBe(true);
    expect(el.currentTime).toBeCloseTo(6.4, 5);
    expect(el.loadCalls).toBe(0);

    const sameBeforeResume = audioManager.getCurrentElement();
    const ok = await audioManager.resumeSpeechPreservePosition();
    expect(ok).toBe(true);
    expect(el.paused).toBe(false);
    expect(el.currentTime).toBeCloseTo(6.4, 5);
    expect(el.currentTime).not.toBeLessThan(1);
    expect(audioManager.getCurrentElement()).toBe(sameBeforeResume);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("TEST 2: pause at ~5 seconds then play continues from ~5 seconds", async () => {
    const el = new FakeLessonAudio({ currentTime: 5.0, paused: false });
    attachSpeech(el, true);

    audioManager.pauseSpeechPreservePosition();
    expect(el.currentTime).toBeCloseTo(5.0, 5);

    await audioManager.resumeSpeechPreservePosition();
    expect(el.currentTime).toBeCloseTo(5.0, 5);
    expect(el.paused).toBe(false);
  });

  it("TEST 3: stop resets currentTime to 0 and the next play starts from the beginning", async () => {
    const el = new FakeLessonAudio({ currentTime: 7.2, paused: false });
    attachSpeech(el, true);

    expect(audioManager.resetSpeechToStart()).toBe(0);
    expect(el.paused).toBe(true);
    expect(el.currentTime).toBe(0);

    await audioManager.resumeSpeechPreservePosition();
    expect(el.currentTime).toBe(0);
    expect(el.paused).toBe(false);
  });

  it("TEST 4: play again after ended restarts from 0", async () => {
    const el = new FakeLessonAudio({
      currentTime: 19.8,
      duration: 19.8,
      paused: true,
      ended: true,
    });
    attachSpeech(el, false);

    await audioManager.resumeSpeechPreservePosition();
    expect(el.currentTime).toBe(0);
    expect(el.paused).toBe(false);
    expect(el.ended).toBe(false);
  });

  it("TEST 5: pause then a React-like state tick leaves currentTime unchanged", () => {
    const el = new FakeLessonAudio({ currentTime: 6.4, paused: false });
    attachSpeech(el, true);

    audioManager.pauseSpeechPreservePosition();
    const src = el.src;
    const pausedAt = el.currentTime;

    // Simulate a React rerender / intent update without recreating audio.
    expect(audioManager.hasResumableSpeech()).toBe(true);
    internals().channels.speech.playing = false;

    expect(el.currentTime).toBe(pausedAt);
    expect(el.src).toBe(src);
    expect(el.loadCalls).toBe(0);
  });

  it("TEST 6: pause then play reuses the same HTMLAudioElement", async () => {
    const el = new FakeLessonAudio({ currentTime: 4.2, paused: false });
    attachSpeech(el, true);
    const original = audioManager.getCurrentElement();

    audioManager.pauseSpeechPreservePosition();
    await audioManager.resumeSpeechPreservePosition();

    expect(audioManager.getCurrentElement()).toBe(original);
    expect(audioManager.getCurrentElement()).toBe(el as unknown as HTMLAudioElement);
  });

  it("TEST 7: pause/resume on a blob URL does not fetch or reload", async () => {
    const el = new FakeLessonAudio({
      src: "blob:http://localhost/gcs-lesson",
      currentTime: 6.1,
      paused: false,
    });
    attachSpeech(el, true);
    const srcBefore = el.src;

    audioManager.pauseSpeechPreservePosition();
    await audioManager.resumeSpeechPreservePosition();

    expect(el.src).toBe(srcBefore);
    expect(el.loadCalls).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("waitUntilEnd stays open across pause and completes after resume ended", async () => {
    const el = new FakeLessonAudio({ currentTime: 3, paused: false });
    attachSpeech(el, true);

    let intent: "playing" | "paused" | "idle" = "playing";
    const session = 1;
    const pending = audioManager.waitUntilEnd(
      el as unknown as HTMLAudioElement,
      () => session !== 1 || intent === "idle",
      { maxWaitMs: 4_000, pollMs: 20 },
    );

    intent = "paused";
    audioManager.pauseSpeechPreservePosition();
    await new Promise((r) => setTimeout(r, 60));
    expect(el.currentTime).toBe(3);

    intent = "playing";
    await audioManager.resumeSpeechPreservePosition();
    el.ended = true;
    el.onended?.();

    await expect(pending).resolves.toMatchObject({ ok: true });
  });
});
