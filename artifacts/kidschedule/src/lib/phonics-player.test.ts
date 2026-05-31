import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/tts-guard", () => ({
  recordTtsUserGesture: vi.fn(),
}));

let currentSpeechEl: { pause: () => void } | null = null;

const mockPlay = vi.fn(
  async (el: { play: () => Promise<void>; pause: () => void }) => {
    if (currentSpeechEl && currentSpeechEl !== el) {
      currentSpeechEl.pause();
    }
    currentSpeechEl = el;
    await el.play();
    return true;
  },
);

const mockWaitUntilEnd = vi.fn(
  async (
    el: FakeAudio,
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
        el.removeEventListener("error", onError);
        resolve(result);
      };

      const onEnded = () => finish({ ok: true });
      const onError = () => finish({ ok: false, error: "playback_failed_unknown" });

      if (el.ended) {
        finish({ ok: true });
        return;
      }

      el.addEventListener("ended", onEnded);
      el.addEventListener("error", onError);

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
  },
);

const mockStopSpeechIfCurrent = vi.fn((el: { pause: () => void }) => {
  if (currentSpeechEl === el) {
    el.pause();
    currentSpeechEl = null;
  }
});

vi.mock("@/lib/audio-manager", () => ({
  AUDIO_ERROR: {
    USER_INTERACTION_REQUIRED: "USER_INTERACTION_REQUIRED",
  },
  audioManager: {
    unlockFromUserGesture: vi.fn(),
    play: (...args: unknown[]) => mockPlay(...args),
    waitUntilEnd: (...args: unknown[]) => mockWaitUntilEnd(...args),
    stopSpeechIfCurrent: (...args: unknown[]) => mockStopSpeechIfCurrent(...args),
    getLastPlayError: vi.fn(() => null),
    needsUserInteraction: vi.fn(() => false),
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
  playCount = 0;
  pauseCount = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onpause: (() => void) | null = null;
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
    this.playCount += 1;
    this.paused = false;
    this.currentTime = 0.02;
    return undefined;
  }
  pause() {
    this.pauseCount += 1;
    this.paused = true;
  }
  fireEnded() {
    this.ended = true;
    this.dispatch("ended");
  }
  fireError() {
    this.dispatch("error");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let playPhonicsUrl: typeof import("./phonics-player").playPhonicsUrl;
let stopPhonicsPlayback: typeof import("./phonics-player").stopPhonicsPlayback;
let isPhonicsPlaying: typeof import("./phonics-player").isPhonicsPlaying;
let getPhonicsPlaybackMetrics: typeof import("./phonics-telemetry").getPhonicsPlaybackMetrics;

beforeEach(async () => {
  FakeAudio.instances = [];
  currentSpeechEl = null;
  mockPlay.mockClear();
  mockWaitUntilEnd.mockClear();
  mockStopSpeechIfCurrent.mockClear();
  vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio);
  vi.resetModules();
  const mod = await import("./phonics-player");
  playPhonicsUrl = mod.playPhonicsUrl;
  stopPhonicsPlayback = mod.stopPhonicsPlayback;
  isPhonicsPlaying = mod.isPhonicsPlaying;
  const telemetry = await import("./phonics-telemetry");
  getPhonicsPlaybackMetrics = telemetry.getPhonicsPlaybackMetrics;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const PROXY = (letter: string) =>
  `/api/phonics-library/phonics/letters/${letter}.mp3`;

describe("phonics-player — single audio owner", () => {
  it("plays exactly one clean instance per tap and resolves on end", async () => {
    const p = playPhonicsUrl(PROXY("k"), { label: "k" });
    await sleep(0);
    expect(FakeAudio.instances).toHaveLength(1);
    const el = FakeAudio.instances[0]!;
    expect(el.playCount).toBe(1);
    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(isPhonicsPlaying()).toBe(true);

    el.fireEnded();
    const res = await p;
    expect(res).toEqual({ ok: true });
    expect(isPhonicsPlaying()).toBe(false);
  });

  it("interrupts the previous sound when a new clip starts (no overlap)", async () => {
    const first = playPhonicsUrl(PROXY("a"), { label: "a" });
    await sleep(0);
    const elA = FakeAudio.instances[0]!;
    expect(elA.paused).toBe(false);

    const second = playPhonicsUrl(PROXY("b"), { label: "b" });
    await sleep(0);
    expect(elA.paused).toBe(true);
    const elB = FakeAudio.instances[1]!;
    expect(elB.paused).toBe(false);

    const firstResult = await Promise.race([first, sleep(150).then(() => "pending")]);
    expect(firstResult).not.toBe("pending");
    expect((firstResult as { ok: boolean }).ok).toBe(false);

    elB.fireEnded();
    expect((await second).ok).toBe(true);
  });

  it("stopPhonicsPlayback immediately stops and invalidates active playback", async () => {
    const p = playPhonicsUrl(PROXY("m"), { label: "m" });
    await sleep(0);
    const el = FakeAudio.instances[0]!;
    expect(isPhonicsPlaying()).toBe(true);

    stopPhonicsPlayback("test");
    expect(mockStopSpeechIfCurrent).toHaveBeenCalledWith(el);
    expect(el.paused).toBe(true);
    expect(isPhonicsPlaying()).toBe(false);

    const res = await Promise.race([p, sleep(150).then(() => "pending")]);
    expect(res).not.toBe("pending");
    expect((res as { ok: boolean }).ok).toBe(false);
  });

  it("debounces a duplicate tap of the same live clip (no restart loop)", async () => {
    const first = playPhonicsUrl(PROXY("s"), { label: "s" });
    await sleep(0);
    expect(FakeAudio.instances).toHaveLength(1);

    const dup = await playPhonicsUrl(PROXY("s"), { label: "s" });
    expect(dup).toEqual({ ok: true });
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0]!.playCount).toBe(1);

    FakeAudio.instances[0]!.fireEnded();
    expect((await first).ok).toBe(true);
  });

  it("rapid distinct taps: only the latest survives", async () => {
    const a = playPhonicsUrl(PROXY("a"), { label: "a" });
    const b = playPhonicsUrl(PROXY("b"), { label: "b" });
    const c = playPhonicsUrl(PROXY("c"), { label: "c" });
    await sleep(0);

    const last = FakeAudio.instances[FakeAudio.instances.length - 1]!;
    expect(last.src).toContain("c.mp3");
    expect(last.paused).toBe(false);
    expect(isPhonicsPlaying()).toBe(true);

    last.fireEnded();
    expect((await c).ok).toBe(true);
    expect((await a).ok).toBe(false);
    expect((await b).ok).toBe(false);
  });

  it("reports a clean failure when the clip errors", async () => {
    const p = playPhonicsUrl(PROXY("z"), { label: "z" });
    await sleep(0);
    FakeAudio.instances[0]!.fireError();
    const res = await p;
    expect(res.ok).toBe(false);
  });

  it("honors isCancelled before starting", async () => {
    const res = await playPhonicsUrl(PROXY("t"), {
      label: "t",
      isCancelled: () => true,
    });
    expect(res).toEqual({ ok: false, error: "phonics_cancelled" });
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("force-cleans a zombie clip that never ends (3s watchdog)", async () => {
    vi.useFakeTimers();
    const p = playPhonicsUrl(PROXY("x"), { label: "x" });
    await vi.advanceTimersByTimeAsync(0);
    expect(isPhonicsPlaying()).toBe(true);

    await vi.advanceTimersByTimeAsync(3_100);
    const res = await p;
    expect(res.ok).toBe(false);
    expect(isPhonicsPlaying()).toBe(false);
    expect(FakeAudio.instances[0]!.paused).toBe(true);
    expect(getPhonicsPlaybackMetrics().zombieCleanups).toBe(1);
  });

  it("records analytics for plays and overlap prevention", async () => {
    const a = playPhonicsUrl(PROXY("a"), { label: "a" });
    await sleep(0);
    const b = playPhonicsUrl(PROXY("b"), { label: "b" });
    await sleep(0);
    FakeAudio.instances[1]!.fireEnded();
    await b;
    await a;

    const m = getPhonicsPlaybackMetrics();
    expect(m.playStarts).toBe(2);
    expect(m.interruptions).toBe(1);
    expect(m.startLatencySamples).toBeGreaterThanOrEqual(1);
  });
});
