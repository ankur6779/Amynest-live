import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/tts-guard", () => ({
  configureMobileAudioElement: vi.fn(),
  recordTtsUserGesture: vi.fn(),
}));

vi.mock("@/lib/audio-manager", () => ({
  audioManager: { unlockFromUserGesture: vi.fn() },
}));

// Audible-start guarantee just invokes play() once and resolves (no retry storms).
vi.mock("@/lib/amy-voice-audio-start", () => ({
  playWithAudibleStartGuarantee: vi.fn(async (opts: { play: () => Promise<void> }) => {
    await opts.play();
  }),
  isNotAllowedPlayError: vi.fn(() => false),
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
    expect(el.playCount).toBe(1); // no "ka ka ka" — single play call
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
    expect(elA.paused).toBe(true); // previous immediately stopped
    const elB = FakeAudio.instances[1]!;
    expect(elB.paused).toBe(false);

    // Stale (first) playback silently dies.
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

    // Immediate duplicate of the same url while playing → no new element, no replay.
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

    // Earlier instances are torn down; the last one is active.
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
    await vi.advanceTimersByTimeAsync(0); // resolve play()
    expect(isPhonicsPlaying()).toBe(true);

    await vi.advanceTimersByTimeAsync(3_100); // pass the zombie watchdog
    const res = await p;
    expect(res.ok).toBe(false);
    expect(isPhonicsPlaying()).toBe(false);
    expect(FakeAudio.instances[0]!.paused).toBe(true); // silenced, not left playing
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
    expect(m.interruptions).toBe(1); // 'a' was interrupted by 'b'
    expect(m.startLatencySamples).toBeGreaterThanOrEqual(1);
  });
});
