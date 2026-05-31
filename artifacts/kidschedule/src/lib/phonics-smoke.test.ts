import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/tts-guard", () => ({
  configureMobileAudioElement: vi.fn(),
  recordTtsUserGesture: vi.fn(),
}));

vi.mock("@/lib/audio-manager", () => {
  let currentSpeechEl: { pause: () => void; play: () => Promise<void>; ended?: boolean; duration?: number; removeEventListener: (t: string, cb: () => void) => void; addEventListener: (t: string, cb: () => void) => void } | null = null;

  const waitUntilEnd = async (
    el: {
      ended: boolean;
      duration: number;
      removeEventListener: (t: string, cb: () => void) => void;
      addEventListener: (t: string, cb: () => void) => void;
    },
    isCancelled?: () => boolean,
    options?: { maxWaitMs?: number; pollMs?: number },
  ) => {
    const durationSec = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    const maxWaitMs =
      options?.maxWaitMs ??
      (durationSec > 0
        ? Math.min(Math.ceil((durationSec + 0.4) * 1000), 3_000)
        : 3_000);
    const pollMs = options?.pollMs ?? 0;

    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      let settled = false;
      const finish = (result: { ok: boolean; error?: string }) => {
        if (settled) return;
        settled = true;
        if (pollTimer !== undefined) clearInterval(pollTimer);
        clearTimeout(timer);
        el.removeEventListener("ended", onEnded);
        resolve(result);
      };

      const onEnded = () => finish({ ok: true });
      if (el.ended) {
        finish({ ok: true });
        return;
      }
      el.addEventListener("ended", onEnded);

      let pollTimer: ReturnType<typeof setInterval> | undefined;
      if (pollMs > 0) {
        pollTimer = setInterval(() => {
          if (isCancelled?.()) finish({ ok: false, error: "audio_cancelled" });
          if (el.ended) finish({ ok: true });
        }, pollMs);
      }

      const timer = setTimeout(() => {
        if (el.ended) return finish({ ok: true });
        finish({ ok: false, error: "wait_until_end_timeout" });
      }, maxWaitMs);
    });
  };

  return {
    AUDIO_ERROR: {
      USER_INTERACTION_REQUIRED: "USER_INTERACTION_REQUIRED",
    },
    audioManager: {
      unlockFromUserGesture: vi.fn(),
      play: vi.fn(async (el: { pause: () => void; play: () => Promise<void> }) => {
        if (currentSpeechEl && currentSpeechEl !== el) {
          currentSpeechEl.pause();
        }
        currentSpeechEl = el;
        await el.play();
        return true;
      }),
      waitUntilEnd,
      stopSpeechIfCurrent: vi.fn((el: { pause: () => void }) => {
        if (currentSpeechEl === el) {
          el.pause();
          currentSpeechEl = null;
        }
      }),
      getLastPlayError: vi.fn(() => null),
      needsUserInteraction: vi.fn(() => false),
    },
  };
});

vi.mock("@/lib/amy-voice-audio-start", () => ({
  playWithAudibleStartGuarantee: vi.fn(async (opts: { play: () => Promise<void> }) => {
    await opts.play();
  }),
  isNotAllowedPlayError: vi.fn(() => false),
}));

/** Catalog bypass uses controller prepared URL — must resolve without real network. */
vi.mock("@/lib/amy-voice-controller", () => ({
  amyVoiceController: {
    playPreparedUrl: vi.fn(async () => ({ success: true, layer: "static" })),
    pause: vi.fn(),
    speak: vi.fn(async () => ({ success: true })),
    getSnapshot: vi.fn(() => ({
      status: "idle",
      error: null,
      requestId: 0,
      activePhrase: null,
    })),
    subscribe: vi.fn(() => () => {}),
  },
}));

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  paused = true;
  ended = false;
  currentTime = 0;
  duration = 0.4;
  volume = 1;
  muted = false;
  playbackRate = 1;
  preload = "none";
  private listeners: Record<string, Set<() => void>> = {};

  constructor(src = "") {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  addEventListener(type: string, cb: () => void) {
    (this.listeners[type] ??= new Set()).add(cb);
  }
  removeEventListener(type: string, cb: () => void) {
    this.listeners[type]?.delete(cb);
  }
  private dispatch(type: string) {
    for (const cb of [...(this.listeners[type] ?? [])]) cb();
  }
  setAttribute() {}
  removeAttribute() {
    this.src = "";
  }
  load() {}
  async play() {
    this.paused = false;
    this.currentTime = 0.02;
  }
  pause() {
    this.paused = true;
  }
  fireEnded() {
    this.ended = true;
    this.dispatch("ended");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("phonics runtime smoke", () => {
  beforeEach(() => {
    FakeAudio.instances = [];
    vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("manifest validates and core clips play without throwing", async () => {
    const { validatePhonicsManifest, isPhonicsModuleAvailable } = await import(
      "@/lib/phonics-manifest-validation"
    );
    const validation = validatePhonicsManifest();
    expect(validation.ok).toBe(true);
    expect(isPhonicsModuleAvailable()).toBe(true);

    const { playPhonicsStaticAudio, playPhonicsContentAudio } = await import(
      "@/lib/phonics-static-audio"
    );
    const { stopPhonicsPlayback } = await import("@/lib/phonics-player");

    const clips: Array<{ run: () => Promise<{ ok: boolean }>; label: string }> = [
      { run: () => playPhonicsStaticAudio("a"), label: "a" },
      { run: () => playPhonicsStaticAudio("b"), label: "b" },
      { run: () => playPhonicsContentAudio("cat", { contentType: "cvc" }), label: "cat" },
      { run: () => playPhonicsContentAudio("dog", { contentType: "cvc" }), label: "dog" },
    ];

    for (const clip of clips) {
      stopPhonicsPlayback("smoke_reset");
      const pending = clip.run();
      await sleep(30);
      FakeAudio.instances.at(-1)?.fireEnded();
      const result = await pending;
      expect(result.ok, clip.label).toBe(true);
    }
  });
});
