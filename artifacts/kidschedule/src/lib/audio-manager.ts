/**
 * Global HTMLAudioElement playback — channels, lifecycle recovery, retries,
 * mobile unlock, and structured failure reporting (no silent failures).
 */

import { resolveApiMediaUrl } from "@/lib/api";
import {
  logAudioStart,
  playWithAudibleStartGuarantee,
  validateAudioSrc,
} from "@/lib/amy-voice-audio-start";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import {
  configureMobileAudioElement,
  isTtsPlaybackAllowed,
  recordTtsUserGesture,
} from "@/lib/tts-guard";
import { staticAudioRetryDelayMs } from "@/lib/static-audio-telemetry";
import {
  emitStaticAudioVisualFallback,
} from "@/lib/static-audio-telemetry";
import type { StaticAudioMode } from "@workspace/static-audio/browser";
import {
  emitAudioPlaybackEvent,
  type AudioPlaybackSource,
} from "@/lib/audio-playback-events";
import { noteAudioManagerPlayCalled } from "@/lib/audio-root-cause-trace";
import {
  beginPlaybackTrace,
  flushPlaybackTrace,
  getPlaybackTraceId,
  playbackTraceAttach,
  playbackTracePlayCalled,
  playbackTracePlaySettled,
  tracePlaybackDestroy,
  tracePlaybackStop,
  tracePlaybackStopAll,
} from "@/lib/playback-trace";
import { logAudioDebug } from "@/lib/audio-debug";
import {
  classifyAudibleStartFailure,
  logAudibleStartGate,
  snapshotAudibleElement,
} from "@/lib/audible-start-diagnostic";
import {
  recordPlaybackQualityCompleted,
  recordPlaybackQualityFailed,
  recordPlaybackQualityRequested,
  recordPlaybackQualityStarted,
} from "@/lib/playback-quality-telemetry";
import {
  isAudioPlaybackRecoveryMode,
  schedulePlaybackProgressCheck,
} from "@/lib/audio-playback-recovery";
import {
  mapToAudioSourceLayer,
  resolveAudioReliabilityModule,
  trackAudioPlayFailed,
  trackAudioPlayStarted,
  trackAudioRecovered,
  trackAudioRequest,
  trackAudioTimeout,
  finishAudioRequest,
} from "@/lib/audio-reliability-telemetry";

const LOG = "[AudioManager]";
const DEFAULT_MAX_RETRIES = 2;

function mapPlaybackSource(meta: AudioPlayMeta): AudioPlaybackSource {
  const raw = (meta.source ?? "").toLowerCase();
  if (raw.includes("phonics") || raw.includes("cvc")) return "phonics";
  if (raw.includes("spelling")) return "spelling";
  if (raw.includes("infant_sleep")) return "infant_sleep_mp3";
  if (raw.includes("poem")) return "poem_player";
  if (raw.includes("event")) return "event_prep";
  if (raw.includes("study")) return "study";
  if (meta.srcType === "static") return "static";
  if (meta.srcType === "tts") return "tts";
  if (raw.includes("emergency")) return "emergency";
  return "unknown";
}
/** P0 SLA: audio must start within 3s or fail + fallback */
const PLAYBACK_WATCHDOG_MS = 3_000;
const ANDROID_WEBVIEW_WATCHDOG_MS = 3_000;

function playbackWatchdogMs(): number {
  return isAndroidAmyNestAudioClient() ? ANDROID_WEBVIEW_WATCHDOG_MS : PLAYBACK_WATCHDOG_MS;
}
const URL_CACHE_MAX = 20;
const SOFT_RESET_EVERY_PLAYS = 25;
const SILENT_OUTPUT_RECOVERY_THRESHOLD = 2;

const GLOBAL_INSTANCE_KEY = "__amynestAudioManagerInstanceId";

export const AUDIO_UI_MESSAGE = {
  TAP_TO_ENABLE_SOUND: "Tap to enable sound",
} as const;

export type AudioPlaybackState = {
  needsUserInteraction: boolean;
  lastError: string | null;
  instanceId: number;
};

type CacheEntry = {
  audio: HTMLAudioElement;
  lastUsed: number;
};

type PendingFocusReplay = {
  proxyUrl: string;
  meta: AudioPlayMeta;
  channel: AudioChannel;
};

/** Latest singleton wins — stale instances (HMR / duplicate bundles) no-op. */
function registerAudioManagerInstance(id: number): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, number>)[GLOBAL_INSTANCE_KEY] = id;
}

function getActiveAudioManagerInstanceId(): number {
  if (typeof window === "undefined") return 1;
  return (window as unknown as Record<string, number>)[GLOBAL_INSTANCE_KEY] ?? 1;
}

let nextAudioManagerInstanceId = 0;

export function emitAudioNeedsUserGesture(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("amynest-audio-needs-gesture", {
      detail: { message: AUDIO_UI_MESSAGE.TAP_TO_ENABLE_SOUND },
    }),
  );
}

export function onAudioNeedsUserGesture(
  handler: (detail: { message: string }) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    handler((e as CustomEvent<{ message: string }>).detail ?? { message: AUDIO_UI_MESSAGE.TAP_TO_ENABLE_SOUND });
  };
  window.addEventListener("amynest-audio-needs-gesture", listener);
  return () => window.removeEventListener("amynest-audio-needs-gesture", listener);
}

/** Minimal silent MP3 — unlocks media pipeline on Android Chrome / WebView without audible output. */
const SILENT_MP3_DATA_URI =
  "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAcQv8xUAAAAAAP/7kGQAAAAGkH8QAAABpB/gAAACAAQAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";

export const AUDIO_ERROR = {
  USER_INTERACTION_REQUIRED: "USER_INTERACTION_REQUIRED",
  PLAYBACK_BUSY: "PLAYBACK_BUSY",
  PLAYBACK_WATCHDOG: "PLAYBACK_WATCHDOG",
  PLAYBACK_FAILED: "PLAYBACK_FAILED",
  SILENT_OUTPUT: "SILENT_OUTPUT",
  GESTURE_BLOCKED: "audio_blocked_until_gesture",
} as const;

export type AudioChannel = "speech" | "ui";

export type AudioSrcType = "blob" | "static" | "tts" | "unknown";

export type AudioPlayMeta = {
  phrase?: string;
  mode?: StaticAudioMode;
  proxyUrl?: string;
  source?: string;
  channel?: AudioChannel;
  /** Stop current speech and play immediately (quiz replay, speak cancel-restart). */
  interrupt?: boolean;
  srcType?: AudioSrcType;
  /** Root-cause playback trace — propagate from controller/pipeline. */
  playbackTraceId?: string;
  /** P0 reliability trace — timeout diagnostics. */
  reliabilityRequestId?: string;
};

export type AudioPlayOptions = {
  maxRetries?: number;
  channel?: AudioChannel;
  interrupt?: boolean;
  /** Skip force-restart fallback (CVC blend — one clip per step). */
  skipForceRestart?: boolean;
  /** @internal Prevents infinite force-restart recursion */
  _internalRestart?: boolean;
};

export type AudioPlayResult =
  | { ok: true }
  | { ok: false; error: string };

type ChannelState = {
  current: HTMLAudioElement | null;
  playing: boolean;
  playToken: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inferSrcType(url: string): AudioSrcType {
  const u = (url ?? "").trim();
  if (u.startsWith("blob:")) return "blob";
  if (u.includes("/infant-sleep-audio/")) return "unknown";
  if (u.includes("/api/static-audio/")) return "static";
  if (u.includes("/api/tts/")) return "tts";
  return "unknown";
}

function isNotAllowedError(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? "";
  const msg = err instanceof Error ? err.message : String(err);
  return (
    name === "NotAllowedError" ||
    /notallowed|user interaction|autoplay/i.test(msg) ||
    msg === AUDIO_ERROR.GESTURE_BLOCKED
  );
}

function isRetryableError(err: unknown): boolean {
  if (isNotAllowedError(err)) return false;
  const name = (err as { name?: string })?.name ?? "";
  const msg = err instanceof Error ? err.message : String(err);
  if (name === "AbortError" || /aborted|superseded/i.test(msg)) return false;
  if (msg === AUDIO_ERROR.PLAYBACK_BUSY) return false;
  if (msg === "invalid_audio_src" || msg === "invalid_audio_blob") return false;
  return true;
}

function audioElementDebug(audio: HTMLAudioElement | null): Record<string, unknown> {
  if (!audio) return {};
  return {
    src: audio.src?.slice(0, 160),
    ...(snapshotAudibleElement(audio) ?? {}),
    ended: audio.ended,
    mediaError: audio.error?.code,
    playbackWatchdogMs: playbackWatchdogMs(),
  };
}

function logStructured(
  step: string,
  err: unknown,
  detail: Record<string, unknown>,
  audio?: HTMLAudioElement | null,
): void {
  const message = err instanceof Error ? err.message : String(err);
  const name = (err as { name?: string })?.name ?? "";
  console.error(LOG, step, {
    errorName: name,
    errorMessage: message,
    ...detail,
    ...(audio ? audioElementDebug(audio) : {}),
  });
}

class AudioManagerImpl {
  readonly instanceId: number;

  private channels: Record<AudioChannel, ChannelState> = {
    speech: { current: null, playing: false, playToken: 0 },
    ui: { current: null, playing: false, playToken: 0 },
  };

  private ownedObjectUrl: string | null = null;
  private urlCache = new Map<string, CacheEntry>();
  private pipelineWarmed = false;
  private silentWarmEl: HTMLAudioElement | null = null;
  private lifecycleInstalled = false;
  private playInFlight = false;
  private consecutiveFailures = 0;
  private lastPlayError: string | null = null;
  private wasPausedForBackground = false;
  private appInitiatedPause = false;
  private externalPauseDetected = false;
  /** Recently played element — short phonics clips finish before Playwright probes. */
  private lastMediaRef: {
    element: HTMLAudioElement;
    at: number;
    proxyUrl: string;
    peakCurrentTime: number;
  } | null = null;
  private silentOutputStreak = 0;
  private totalSuccessfulPlays = 0;
  private pendingFocusReplay: PendingFocusReplay | null = null;
  private invalidated = false;
  /** Gesture-only primers — separate from speech cache so pointerdown does not corrupt playback. */
  private gesturePrimeElements = new Map<string, HTMLAudioElement>();

  constructor() {
    this.instanceId = ++nextAudioManagerInstanceId;
    registerAudioManagerInstance(this.instanceId);
  }

  isInvalidated(): boolean {
    return this.invalidated;
  }

  /** Invalidate this instance when a newer manager is constructed (HMR only). */
  invalidate(): void {
    this.invalidated = true;
    this.stop();
    this.urlCache.clear();
  }

  private assertUsable(): boolean {
    if (!this.invalidated) return true;
    console.warn(LOG, "ignored call on invalidated instance", { instanceId: this.instanceId });
    return false;
  }

  getPlaybackState(): AudioPlaybackState {
    return {
      needsUserInteraction: this.needsUserInteraction(),
      lastError: this.lastPlayError,
      instanceId: this.instanceId,
    };
  }

  needsUserInteraction(): boolean {
    return this.lastPlayError === AUDIO_ERROR.USER_INTERACTION_REQUIRED;
  }

  installLifecycle(): void {
    if (this.lifecycleInstalled || typeof document === "undefined") return;
    this.lifecycleInstalled = true;

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") {
        const speech = this.channels.speech.current;
        if (speech && !speech.ended && !speech.paused) {
          this.pauseElement(speech);
          this.wasPausedForBackground = true;
          const src = speech.src?.trim();
          if (src) {
            this.pendingFocusReplay = {
              proxyUrl: src,
              meta: { source: "background-pause", interrupt: true, srcType: inferSrcType(src) },
              channel: "speech",
            };
          }
        }
        return;
      }

      void this.onAppVisible();
    });

    const onGesture = () => this.unlockFromUserGesture();
    document.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
    document.addEventListener("click", onGesture, { capture: true, passive: true });
  }

  getLastPlayError(): string | null {
    return this.lastPlayError;
  }

  private setLastError(error: string | null): void {
    this.lastPlayError = error;
    if (error === AUDIO_ERROR.USER_INTERACTION_REQUIRED) {
      emitAudioNeedsUserGesture();
    }
  }

  private pauseElement(audio: HTMLAudioElement): void {
    this.appInitiatedPause = true;
    try {
      audio.pause();
    } catch {
      /* ignore */
    }
    this.appInitiatedPause = false;
  }

  private touchCacheEntry(key: string, audio: HTMLAudioElement): void {
    this.urlCache.set(key, { audio, lastUsed: Date.now() });
    this.evictCacheLru();
  }

  private evictCacheLru(): void {
    while (this.urlCache.size > URL_CACHE_MAX) {
      let oldestKey: string | null = null;
      let oldestUsed = Infinity;
      for (const [key, entry] of this.urlCache) {
        if (entry.lastUsed < oldestUsed) {
          oldestUsed = entry.lastUsed;
          oldestKey = key;
        }
      }
      if (!oldestKey) break;
      const entry = this.urlCache.get(oldestKey);
      this.urlCache.delete(oldestKey);
      if (entry?.audio) {
        entry.audio.onended = null;
        entry.audio.onerror = null;
        this.pauseElement(entry.audio);
        try {
          entry.audio.removeAttribute("src");
          entry.audio.load();
        } catch {
          /* ignore */
        }
      }
    }
  }

  private softResetPipeline(): void {
    console.info(LOG, "soft pipeline reset", { totalSuccessfulPlays: this.totalSuccessfulPlays });
    this.pipelineWarmed = false;
    this.warmMediaPipeline(true);
  }

  /** Only fix browser-muted output — volume may be 0 intentionally (poem fade-in). */
  private verifyAudibleOutput(audio: HTMLAudioElement): boolean {
    if (audio.muted) {
      audio.muted = false;
    }
    if (audio.muted) {
      this.silentOutputStreak += 1;
      logStructured("silent output detected (muted)", new Error(AUDIO_ERROR.SILENT_OUTPUT), {
        attempt: this.silentOutputStreak,
        volume: audio.volume,
      }, audio);
      if (this.silentOutputStreak >= SILENT_OUTPUT_RECOVERY_THRESHOLD) {
        this.triggerRecovery();
      }
      return false;
    }
    this.silentOutputStreak = 0;
    return true;
  }

  private isPlaybackValid(audio: HTMLAudioElement): boolean {
    if (audio.error) return false;
    if (audio.ended) return true;
    return !audio.paused;
  }

  /**
   * play() can resolve before the clock advances (especially on mobile direct-stream).
   * Wait briefly for `playing` / currentTime>0 before treating playback as failed.
   */
  private waitForPlaybackClockStart(
    audio: HTMLAudioElement,
    timeoutMs: number,
  ): Promise<boolean> {
    if (audio.ended) return Promise.resolve(true);
    if (!audio.paused && audio.currentTime > 0) return Promise.resolve(true);

    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        window.clearInterval(pollId);
        audio.removeEventListener("playing", onProgress);
        audio.removeEventListener("timeupdate", onProgress);
        audio.removeEventListener("canplay", onProgress);
        audio.removeEventListener("ended", onProgress);
        audio.removeEventListener("error", onError);
        resolve(ok);
      };

      const onProgress = () => {
        if (audio.ended || (!audio.paused && audio.currentTime > 0)) {
          finish(true);
        }
      };

      const onError = () => finish(false);

      audio.addEventListener("playing", onProgress);
      audio.addEventListener("timeupdate", onProgress);
      audio.addEventListener("canplay", onProgress);
      audio.addEventListener("ended", onProgress);
      audio.addEventListener("error", onError, { once: true });

      const pollId = window.setInterval(onProgress, 50);
      const timeoutId = window.setTimeout(() => {
        finish(!audio.paused && (audio.currentTime > 0 || audio.ended));
      }, timeoutMs);
      onProgress();
    });
  }

  private playbackClockWaitMs(): number {
    return isAndroidAmyNestAudioClient() ? 2_500 : 1_200;
  }

  /** Brand-new element — never reuse cached instance. */
  private createFreshElement(proxyUrl: string): HTMLAudioElement {
    const key = proxyUrl.startsWith("blob:") ? proxyUrl : resolveApiMediaUrl(proxyUrl);
    this.urlCache.delete(key);
    const audio = this.create(key);
    this.touchCacheEntry(key, audio);
    return audio;
  }

  private channelState(channel: AudioChannel): ChannelState {
    return this.channels[channel];
  }

  private revokeOwnedBlob(): void {
    if (!this.ownedObjectUrl) return;
    try {
      URL.revokeObjectURL(this.ownedObjectUrl);
    } catch {
      /* ignore */
    }
    this.ownedObjectUrl = null;
  }

  private releaseChannel(channel: AudioChannel, revokeBlob: boolean): void {
    const state = this.channelState(channel);
    state.playToken += 1;
    const a = state.current;
    if (a) {
      const traceId = getPlaybackTraceId(a);
      tracePlaybackDestroy(traceId, "AudioManager", `releaseChannel:${channel}`, a);
      a.onended = null;
      a.onerror = null;
      this.pauseElement(a);
      try {
        a.removeAttribute("src");
        a.load();
      } catch {
        /* ignore */
      }
    }
    state.current = null;
    state.playing = false;
    if (revokeBlob && channel === "speech") {
      this.revokeOwnedBlob();
    }
  }

  /** Stop speech + UI playback; revokes owned blob after speech ends. */
  stop(): void {
    if (!this.assertUsable()) return;
    tracePlaybackStop(
      getPlaybackTraceId(this.channels.speech.current),
      "AudioManager",
      "stop",
      this.channels.speech.current,
    );
    tracePlaybackStop(
      getPlaybackTraceId(this.channels.ui.current),
      "AudioManager",
      "stop",
      this.channels.ui.current,
    );
    this.playInFlight = false;
    this.releaseChannel("speech", true);
    this.releaseChannel("ui", false);
    this.wasPausedForBackground = false;
  }

  /** Stop speech-channel playback when the given element is still active (phonics stop). */
  stopSpeechIfCurrent(audio: HTMLAudioElement): void {
    if (!this.assertUsable()) return;
    if (this.channels.speech.current !== audio) return;
    tracePlaybackStop(getPlaybackTraceId(audio), "AudioManager", "stopSpeechIfCurrent", audio);
    this.playInFlight = false;
    this.releaseChannel("speech", false);
  }

  /** Halt all active playback before starting a fallback TTS layer. */
  stopAll(): void {
    tracePlaybackStopAll("AudioManager", "stopAll");
    this.stop();
    void import("@/lib/audio-session-coordinator").then(({ notifyPlaybackEnded }) => {
      notifyPlaybackEnded("stopAll");
    });
  }

  /**
   * Register a blob URL — does NOT revoke on play start.
   * Previous blob is revoked only when replaced or after playback ends.
   */
  trackObjectUrl(url: string): void {
    if (!url.startsWith("blob:")) return;
    if (this.ownedObjectUrl && this.ownedObjectUrl !== url) {
      this.revokeOwnedBlob();
    }
    this.ownedObjectUrl = url;
  }

  unlockFromUserGesture(): void {
    recordTtsUserGesture();
    if (this.lastPlayError === AUDIO_ERROR.USER_INTERACTION_REQUIRED) {
      this.lastPlayError = null;
    }
    this.warmMediaPipeline(true, { fromUserGesture: true });
  }

  /**
   * Start play() synchronously inside pointerdown/click — Android PWA/WebView often
   * rejects audio.play() after await fetch/prepare even when gestures are unlocked.
   */
  primeSpeechUrlInUserGesture(proxyUrl: string): void {
    if (!isAndroidAmyNestAudioClient()) return;
    const trimmed = (proxyUrl ?? "").trim();
    if (!trimmed) return;
    recordTtsUserGesture();
    try {
      const resolved = trimmed.startsWith("blob:") ? trimmed : resolveApiMediaUrl(trimmed);
      let prime = this.gesturePrimeElements.get(resolved);
      if (!prime) {
        prime = new Audio(resolved);
        configureMobileAudioElement(prime);
        this.gesturePrimeElements.set(resolved, prime);
        while (this.gesturePrimeElements.size > 10) {
          const first = this.gesturePrimeElements.keys().next().value;
          if (!first) break;
          const el = this.gesturePrimeElements.get(first);
          this.gesturePrimeElements.delete(first);
          if (el) {
            try {
              el.pause();
              el.removeAttribute("src");
              el.load();
            } catch {
              /* ignore */
            }
          }
        }
      }
      prime.pause();
      prime.currentTime = 0;
      prime.volume = 0.02;
      prime.muted = false;
      const p = prime.play();
      if (p) {
        void p
          .then(() => {
            prime!.pause();
            prime!.currentTime = 0;
          })
          .catch(() => {});
      }
    } catch {
      /* best-effort */
    }
  }

  isPlaybackAllowed(): boolean {
    return isTtsPlaybackAllowed();
  }

  warmMediaPipeline(
    force = false,
    opts: { fromUserGesture?: boolean } = {},
  ): void {
    if (this.pipelineWarmed && !force) return;
    if (typeof window === "undefined") return;

    const fromGesture = opts.fromUserGesture === true;
    if (isAndroidAmyNestAudioClient() && !fromGesture) return;

    type AutoplayPolicyWindow = Window & {
      getAutoplayPolicy?: (kind: "mediaelement" | "audiocontext") => string;
    };
    const policy = (window as AutoplayPolicyWindow).getAutoplayPolicy?.("audiocontext");
    if (!force && policy === "disallowed") return;

    this.pipelineWarmed = true;

    if (!isAndroidAmyNestAudioClient()) {
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          void ctx.resume().catch(() => {});
        }
      } catch {
        /* optional */
      }
    }

    if (fromGesture || !isAndroidAmyNestAudioClient()) {
      this.playSilentUnlockBuffer();
    }
  }

  private playSilentUnlockBuffer(): void {
    try {
      if (!this.silentWarmEl) {
        this.silentWarmEl = new Audio(SILENT_MP3_DATA_URI);
        this.silentWarmEl.volume = 0.001;
        configureMobileAudioElement(this.silentWarmEl);
      }
      void this.silentWarmEl.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }

  private async onAppVisible(): Promise<void> {
    if (!this.assertUsable()) return;
    this.wasPausedForBackground = false;
    this.externalPauseDetected = false;
    this.pipelineWarmed = false;
    this.warmMediaPipeline(true);

    const audio = this.channels.speech.current;
    if (!audio || audio.ended) return;

    const proxyUrl = audio.src?.trim();
    if (!proxyUrl) return;

    if (!isTtsPlaybackAllowed()) {
      this.setLastError(AUDIO_ERROR.USER_INTERACTION_REQUIRED);
      return;
    }

    logStructured("app visible — resume attempt", new Error("resume"), {
      attempt: 1,
      srcType: inferSrcType(proxyUrl),
    }, audio);

    let resumed = false;
    if (audio.paused) {
      resumed = await this.resumeElement(audio);
    } else {
      resumed = this.isPlaybackValid(audio);
    }

    if (resumed) return;

    const pending = this.pendingFocusReplay ?? {
      proxyUrl,
      meta: { source: "focus-replay", interrupt: true, srcType: inferSrcType(proxyUrl) },
      channel: "speech" as AudioChannel,
    };

    logStructured("focus resume failed — restart from beginning", new Error("focus_restart"), {
      attempt: 1,
      srcType: inferSrcType(proxyUrl),
    }, audio);

    const fresh = this.createFreshElement(proxyUrl);
    this.pendingFocusReplay = null;
    await this.play(fresh, pending.meta, {
      channel: pending.channel,
      interrupt: true,
      maxRetries: 1,
    });
  }

  /** Full pipeline reset after exhausted retries — avoids stuck/broken state. */
  private triggerRecovery(): void {
    console.error(LOG, "AudioManager recovery triggered");
    this.playInFlight = false;
    this.stop();
    this.urlCache.clear();
    this.pipelineWarmed = false;
    this.consecutiveFailures = 0;
    this.warmMediaPipeline(true);
  }

  private clearChannelOnFailure(channel: AudioChannel): void {
    const state = this.channelState(channel);
    const a = state.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      try {
        a.pause();
      } catch {
        /* ignore */
      }
    }
    state.current = null;
    state.playing = false;
  }

  private prepareElementForReplay(
    audio: HTMLAudioElement,
    resolvedUrl: string,
    forceReload: boolean,
  ): void {
    this.pauseElement(audio);
    audio.onended = null;
    audio.onerror = null;
    audio.currentTime = 0;
    if (audio.src !== resolvedUrl) {
      audio.src = resolvedUrl;
      forceReload = true;
    }
    if (forceReload || audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      try {
        audio.load();
      } catch {
        /* ignore */
      }
    }
    configureMobileAudioElement(audio);
  }

  create(url?: string): HTMLAudioElement {
    const audio =
      url != null && url.length > 0
        ? new Audio(url.startsWith("blob:") ? url : resolveApiMediaUrl(url))
        : new Audio();
    configureMobileAudioElement(audio);
    return audio;
  }

  getCached(url: string, opts: { forceReload?: boolean } = {}): HTMLAudioElement {
    if (!this.assertUsable()) return this.create(url);
    const key = url.startsWith("blob:") ? url : resolveApiMediaUrl(url);
    const existing = this.urlCache.get(key);
    if (existing) {
      const audio = existing.audio;
      this.pauseElement(audio);
      audio.onended = null;
      audio.onerror = null;
      audio.currentTime = 0;
      if (audio.src !== key) audio.src = key;
      configureMobileAudioElement(audio);
      if (opts.forceReload !== false) {
        this.prepareElementForReplay(audio, key, true);
      } else if (audio.readyState < HTMLMediaElement.HAVE_METADATA) {
        try {
          audio.load();
        } catch {
          /* ignore */
        }
      }
      this.touchCacheEntry(key, audio);
      return audio;
    }
    const audio = this.create(key);
    this.touchCacheEntry(key, audio);
    return audio;
  }

  invalidateCache(url: string): void {
    const key = url.startsWith("blob:") ? url : resolveApiMediaUrl(url);
    this.urlCache.delete(key);
  }

  private elementFromSrcPreferReuse(
    proxyUrl: string,
    failedElement: HTMLAudioElement,
  ): HTMLAudioElement {
    return this.createFreshElement(proxyUrl);
  }

  /**
   * After play() resolves: fail if currentTime stays 0 for 1s (not ended).
   * Clears when time progresses or the clip ends.
   */
  private runPlaybackWatchdog(
    audio: HTMLAudioElement,
    token: number,
    channel: AudioChannel,
  ): Promise<void> {
    if (isAudioPlaybackRecoveryMode()) {
      schedulePlaybackProgressCheck(audio, "audioManager");
      return Promise.resolve();
    }
    if (!audio.paused && audio.currentTime > 0) return Promise.resolve();

    return new Promise((resolve, reject) => {
      let cleared = false;

      const cleanup = () => {
        if (cleared) return;
        cleared = true;
        window.clearTimeout(timeoutId);
        window.clearInterval(pollId);
        audio.removeEventListener("playing", onProgress);
        audio.removeEventListener("timeupdate", onProgress);
        audio.removeEventListener("canplay", onProgress);
        audio.removeEventListener("ended", onProgress);
        audio.removeEventListener("error", onError);
      };

      const checkProgress = () => {
        if (token !== this.channelState(channel).playToken) {
          cleanup();
          reject(new Error("audio_superseded"));
          return true;
        }
        if (audio.ended) {
          cleanup();
          resolve();
          return true;
        }
        if (audio.currentTime > 0 && !audio.paused) {
          if (!this.verifyAudibleOutput(audio)) {
            cleanup();
            reject(new Error(AUDIO_ERROR.SILENT_OUTPUT));
            return true;
          }
          cleanup();
          resolve();
          return true;
        }
        return false;
      };

      const onProgress = () => {
        checkProgress();
      };

      const onError = () => {
        cleanup();
        const code = audio.error?.code ?? "unknown";
        reject(new Error(`media_error_${code}`));
      };

      audio.addEventListener("playing", onProgress);
      audio.addEventListener("timeupdate", onProgress);
      audio.addEventListener("canplay", onProgress);
      audio.addEventListener("ended", onProgress);
      audio.addEventListener("error", onError, { once: true });

      const pollId = window.setInterval(() => {
        checkProgress();
      }, 100);

      const timeoutId = window.setTimeout(() => {
        cleanup();
        if (audio.ended) {
          resolve();
          return;
        }
        if (audio.currentTime > 0.02 && !audio.paused) {
          resolve();
          return;
        }
        if (!audio.ended && audio.paused && audio.currentTime === 0) {
          logAudibleStartGate("runPlaybackWatchdog", "fail", audio, {
            errorMessage: AUDIO_ERROR.PLAYBACK_WATCHDOG,
            watchdogMs: playbackWatchdogMs(),
            classification: classifyAudibleStartFailure(audio, "runPlaybackWatchdog"),
            requires: "currentTime>0.02 && !paused (or ended)",
          });
          reject(new Error(AUDIO_ERROR.PLAYBACK_WATCHDOG));
          return;
        }
        if (audio.currentTime > 0.02) {
          resolve();
          return;
        }
        logAudibleStartGate("runPlaybackWatchdog", "fail", audio, {
          errorMessage: AUDIO_ERROR.PLAYBACK_WATCHDOG,
          watchdogMs: playbackWatchdogMs(),
          classification: classifyAudibleStartFailure(audio, "runPlaybackWatchdog"),
        });
        reject(new Error(AUDIO_ERROR.PLAYBACK_WATCHDOG));
      }, playbackWatchdogMs());

      checkProgress();
    });
  }

  private async attemptPlay(
    audio: HTMLAudioElement,
    token: number,
    channel: AudioChannel,
    attempt: number,
    meta?: AudioPlayMeta,
  ): Promise<void> {
    recordTtsUserGesture();

    if (!isTtsPlaybackAllowed()) {
      throw new Error(AUDIO_ERROR.GESTURE_BLOCKED);
    }

    configureMobileAudioElement(audio);
    audio.muted = false;
    if (audio.volume <= 0) audio.volume = 1;
    if (audio.currentTime > 0.05) {
      audio.currentTime = 0;
    }

    validateAudioSrc(audio);

    const traceId = meta?.playbackTraceId ?? getPlaybackTraceId(audio) ?? null;

    try {
      playbackTracePlayCalled(traceId, "AudioManager", audio);
      await playWithAudibleStartGuarantee({
        audio,
        layer: meta?.source,
        play: async () => {
          await audio.play();
        },
        unlockGesture: () => this.unlockFromUserGesture(),
      });
      playbackTracePlaySettled(traceId, "AudioManager", true, audio);
    } catch (err) {
      playbackTracePlaySettled(traceId, "AudioManager", false, audio, err);
      const msg = err instanceof Error ? err.message : String(err);
      logAudibleStartGate("attemptPlay", "fail", audio, {
        attempt,
        layer: meta?.source,
        errorMessage: msg,
        classification:
          msg === "audio_start_timeout"
            ? classifyAudibleStartFailure(audio, "attemptPlay→playWithAudibleStartGuarantee")
            : undefined,
      });
      if (msg === "audio_start_timeout" && meta?.reliabilityRequestId) {
        trackAudioTimeout(
          meta.reliabilityRequestId,
          msg,
          snapshotAudibleElement(audio) ?? undefined,
        );
      }
      logStructured("attemptPlay audible start failed", err, { attempt }, audio);
      if (isNotAllowedError(err)) {
        throw new Error(AUDIO_ERROR.USER_INTERACTION_REQUIRED);
      }
      throw err;
    }

    logAudibleStartGate("attemptPlay", "exit", audio, {
      attempt,
      layer: meta?.source,
      phase: "post_audible_start_guarantee",
    });

    // playWithAudibleStartGuarantee already waits for audible start in strict mode.
    // Extra watchdog/clock gates caused false PLAYBACK_WATCHDOG on mobile after play() resolved.
    if (audio.error) {
      throw new Error(`media_error_${audio.error.code ?? "unknown"}`);
    }

    if (!this.verifyAudibleOutput(audio)) {
      logAudioStart({
        event: "audio_start",
        success: false,
        src: audio.src,
        layer: meta?.source,
        error: AUDIO_ERROR.SILENT_OUTPUT,
      });
      throw new Error(AUDIO_ERROR.SILENT_OUTPUT);
    }

    schedulePlaybackProgressCheck(audio, meta?.source ?? "attemptPlay");

    if (token !== this.channelState(channel).playToken) {
      this.pauseElement(audio);
      throw new Error("audio_superseded");
    }
  }

  private attachExternalPauseHandler(
    channel: AudioChannel,
    audio: HTMLAudioElement,
    state: ChannelState,
    proxyUrl: string,
    meta: AudioPlayMeta,
  ): void {
    const onPause = () => {
      if (this.appInitiatedPause) return;
      if (state.current !== audio || audio.ended) return;
      this.externalPauseDetected = true;
      const src = proxyUrl || audio.src;
      if (src) {
        this.pendingFocusReplay = {
          proxyUrl: src,
          meta: { ...meta, interrupt: true },
          channel,
        };
      }
      logStructured("external pause (focus loss)", new Error("focus_pause"), {
        attempt: 0,
        srcType: inferSrcType(src),
      }, audio);
    };
    audio.addEventListener("pause", onPause);
  }

  private markChannelPlaying(
    channel: AudioChannel,
    audio: HTMLAudioElement,
    token: number,
    proxyUrl: string,
    meta: AudioPlayMeta,
  ): void {
    const state = this.channelState(channel);
    if (state.current && state.current !== audio) {
      if (channel === "speech") {
        this.releaseChannel("speech", false);
      } else {
        this.releaseChannel("ui", false);
      }
    }
    state.playToken = token;
    state.current = audio;
    state.playing = true;
    this.lastMediaRef = {
      element: audio,
      at: Date.now(),
      proxyUrl: proxyUrl || audio.src,
      peakCurrentTime: 0,
    };

    const bumpPeakCurrentTime = () => {
      if (this.lastMediaRef?.element !== audio) return;
      const ct = audio.currentTime;
      if (Number.isFinite(ct) && ct > this.lastMediaRef.peakCurrentTime) {
        this.lastMediaRef.peakCurrentTime = ct;
      }
    };
    audio.addEventListener("timeupdate", bumpPeakCurrentTime);
    audio.addEventListener("playing", bumpPeakCurrentTime);
    audio.addEventListener("ended", bumpPeakCurrentTime, { once: true });

    const blobUrl = audio.src.startsWith("blob:") ? audio.src : null;

    audio.onended = () => {
      if (state.current === audio) {
        state.playing = false;
        state.current = null;
      }
      if (blobUrl && this.ownedObjectUrl === blobUrl) {
        this.revokeOwnedBlob();
      }
      void import("@/lib/audio-session-coordinator").then(({ notifyPlaybackEnded }) => {
        notifyPlaybackEnded(meta.source ?? channel);
      });
    };

    audio.onerror = () => {
      if (state.current === audio) {
        state.playing = false;
      }
    };

    this.attachExternalPauseHandler(channel, audio, state, proxyUrl, meta);
  }

  private async forceRestartPlayback(
    proxyUrl: string,
    meta: AudioPlayMeta,
    opts: AudioPlayOptions,
    channel: AudioChannel,
  ): Promise<boolean> {
    if (isAudioPlaybackRecoveryMode()) {
      console.warn("[AudioPlaybackRecovery] force_restart_skipped", {
        srcType: meta.srcType ?? inferSrcType(proxyUrl),
        source: meta.source,
        phrase: meta.phrase?.slice(0, 80),
      });
      return false;
    }
    logStructured("force restart playback", new Error("force_restart"), {
      attempt: 0,
      srcType: meta.srcType ?? inferSrcType(proxyUrl),
      source: meta.source,
    });
    this.releaseChannel(channel, false);
    const fresh = this.createFreshElement(proxyUrl);
    return this.play(
      fresh,
      { ...meta, proxyUrl, interrupt: true },
      { ...opts, interrupt: true, _internalRestart: true },
    );
  }

  private surfaceFallback(meta: AudioPlayMeta): void {
    if (meta.phrase || meta.mode) {
      emitStaticAudioVisualFallback({ phrase: meta.phrase, mode: meta.mode });
    }
  }

  async play(
    audio: HTMLAudioElement,
    meta: AudioPlayMeta = {},
    opts: AudioPlayOptions = {},
  ): Promise<boolean> {
    noteAudioManagerPlayCalled();

    const proxyUrlEarly = (meta.proxyUrl ?? audio.src)?.trim();
    let playbackTraceId = meta.playbackTraceId ?? "";
    const ownsTrace = !playbackTraceId;
    if (!playbackTraceId) {
      playbackTraceId = beginPlaybackTrace({
        owner: "AudioManager",
        requestedUrl: proxyUrlEarly || audio.src || "(no-url)",
        phrase: meta.phrase,
        audio,
        autoFlush: true,
      });
      meta = { ...meta, playbackTraceId };
    } else {
      beginPlaybackTrace({
        owner: "AudioManager",
        requestedUrl: proxyUrlEarly || audio.src || "(no-url)",
        phrase: meta.phrase,
        audio,
        existingTraceId: playbackTraceId,
        autoFlush: false,
      });
    }
    playbackTraceAttach(playbackTraceId, audio, "AudioManager");
    const qualitySessionId = recordPlaybackQualityRequested({
      owner: "AudioManager",
      assetRequested: meta.phrase ?? proxyUrlEarly ?? "(unknown)",
      assetResolved: meta.phrase,
      assetUrl: proxyUrlEarly || audio.src,
      extra: { source: meta.source, channel: opts.channel ?? meta.channel },
    });

    let traceEndReason = "play_exit";
    try {
    const reliabilityModule = resolveAudioReliabilityModule({
      label: meta.source,
      phonics: mapPlaybackSource(meta) === "phonics",
    });
    const sourceLayer = mapToAudioSourceLayer(meta.source, { srcType: meta.srcType });
    const reliabilityRequestId = trackAudioRequest({
      module: reliabilityModule,
      audioIdentity: meta.phrase?.slice(0, 80),
      sourceLayer,
    });
    meta = { ...meta, reliabilityRequestId };
    const failReliability = (error: string): false => {
      traceEndReason = error;
      trackAudioPlayFailed(reliabilityRequestId, error, sourceLayer);
      return false;
    };

    if (!this.assertUsable()) return failReliability("audio_manager_unusable");

    const channel = opts.channel ?? meta.channel ?? "speech";
    const interrupt = opts.interrupt ?? meta.interrupt ?? false;
    const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
    const proxyUrl = (meta.proxyUrl ?? audio.src)?.trim();
    const srcType = meta.srcType ?? inferSrcType(proxyUrl || audio.src);

    if (this.playInFlight && channel === "speech" && !interrupt) {
      this.setLastError(AUDIO_ERROR.PLAYBACK_BUSY);
      logStructured("play rejected — busy", new Error(AUDIO_ERROR.PLAYBACK_BUSY), {
        attempt: 0,
        srcType,
        source: meta.source,
      }, audio);
      return failReliability(AUDIO_ERROR.PLAYBACK_BUSY);
    }

    if (channel === "speech" && this.channels.speech.playing && !interrupt) {
      this.setLastError(AUDIO_ERROR.PLAYBACK_BUSY);
      logStructured("play rejected — speech active", new Error(AUDIO_ERROR.PLAYBACK_BUSY), {
        attempt: 0,
        srcType,
        source: meta.source,
      }, audio);
      return failReliability(AUDIO_ERROR.PLAYBACK_BUSY);
    }

    if (interrupt && channel === "speech") {
      this.releaseChannel("speech", false);
    }

    const state = this.channelState(channel);
    const token = state.playToken + 1;
    state.playToken = token;

    this.playInFlight = true;
    this.setLastError(null);

    let element = audio;
    const resolvedUrl = proxyUrl || element.src;

    try {
      if (resolvedUrl && element.src !== resolvedUrl) {
        element.src = resolvedUrl;
      }
      configureMobileAudioElement(element);

      this.markChannelPlaying(channel, element, token, resolvedUrl, meta);
      this.pendingFocusReplay = { proxyUrl: resolvedUrl, meta, channel };

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (token !== state.playToken) {
          return false;
        }

        try {
          await this.attemptPlay(element, token, channel, attempt + 1, meta);

          this.consecutiveFailures = 0;
          this.silentOutputStreak = 0;
          this.totalSuccessfulPlays += 1;
          if (this.totalSuccessfulPlays % SOFT_RESET_EVERY_PLAYS === 0) {
            this.softResetPipeline();
          }
          this.pendingFocusReplay = null;

          void import("@/lib/audio-session-coordinator").then(({ notifyPlaybackStarted }) => {
            notifyPlaybackStarted(meta.source ?? channel);
          });

          emitAudioPlaybackEvent("audio_started", {
            source: mapPlaybackSource(meta),
            layer: srcType,
            phrase: meta.phrase,
            proxyUrl: proxyUrl?.slice(0, 120),
          });
          recordPlaybackQualityStarted(qualitySessionId, {
            durationSec: Number.isFinite(element.duration) ? element.duration : undefined,
          });
          trackAudioPlayStarted(reliabilityRequestId, sourceLayer);
          finishAudioRequest(reliabilityRequestId);

          if (import.meta.env.DEV) {
            console.info(LOG, "play success", {
              srcType,
              attempt: attempt + 1,
              source: meta.source,
              channel,
              ...audioElementDebug(element),
            });
          }
          traceEndReason = "play_success";
          recordPlaybackQualityCompleted(qualitySessionId, { stopReason: "play_success" });
          return true;
        } catch (err) {
          if ((err as Error).message === "audio_superseded") {
            this.clearChannelOnFailure(channel);
            return false;
          }

          if (isNotAllowedError(err)) {
            this.setLastError(AUDIO_ERROR.USER_INTERACTION_REQUIRED);
            this.consecutiveFailures += 1;
            logStructured("play blocked — gesture required", err, {
              attempt: attempt + 1,
              srcType,
              source: meta.source,
              channel,
            }, element);
            this.clearChannelOnFailure(channel);
            this.surfaceFallback(meta);
            return false;
          }

          if (!isRetryableError(err)) {
            this.clearChannelOnFailure(channel);
            return false;
          }

          logStructured(`play failed (attempt ${attempt + 1}/${maxRetries + 1})`, err, {
            attempt: attempt + 1,
            srcType,
            proxyUrl: proxyUrl?.slice(0, 120),
            source: meta.source,
            channel,
          }, element);

          if (attempt >= maxRetries || !proxyUrl) break;

          trackAudioRecovered(reliabilityRequestId, sourceLayer, sourceLayer);
          await sleep(staticAudioRetryDelayMs());
          element = this.createFreshElement(proxyUrl);
          state.current = element;
          this.prepareElementForReplay(element, resolvedUrl, true);
          this.markChannelPlaying(channel, element, token, resolvedUrl, meta);
        }
      }

      const skipForceRestart =
        opts.skipForceRestart ?? isAudioPlaybackRecoveryMode();
      if (proxyUrl && !opts._internalRestart && !skipForceRestart) {
        const restarted = await this.forceRestartPlayback(proxyUrl, meta, opts, channel);
        if (restarted) {
          this.pendingFocusReplay = null;
          traceEndReason = "force_restart_success";
          return true;
        }
      }

      traceEndReason = "play_failed";
      this.consecutiveFailures += 1;
      this.setLastError(AUDIO_ERROR.PLAYBACK_FAILED);
      this.clearChannelOnFailure(channel);
      const failReason =
        this.lastPlayError === AUDIO_ERROR.PLAYBACK_WATCHDOG
          ? AUDIO_ERROR.PLAYBACK_WATCHDOG
          : AUDIO_ERROR.PLAYBACK_FAILED;
      if (failReason === AUDIO_ERROR.PLAYBACK_WATCHDOG) {
        trackAudioTimeout(
          reliabilityRequestId,
          failReason,
          snapshotAudibleElement(element) ?? undefined,
        );
      }
      trackAudioPlayFailed(reliabilityRequestId, failReason, sourceLayer);
      emitAudioPlaybackEvent("audio_failed", {
        source: mapPlaybackSource(meta),
        layer: srcType,
        phrase: meta.phrase,
        error: failReason,
      });
      this.triggerRecovery();
      this.surfaceFallback(meta);
      recordPlaybackQualityFailed(qualitySessionId, { reason: failReason });
      return false;
    } finally {
      if (token === this.channelState(channel).playToken) {
        this.playInFlight = false;
      }
    }
    } finally {
      if (ownsTrace && playbackTraceId) {
        flushPlaybackTrace(playbackTraceId, traceEndReason);
      }
    }
  }

  async playUrl(url: string, meta: AudioPlayMeta = {}, opts?: AudioPlayOptions): Promise<boolean> {
    if (!url?.trim()) {
      logStructured("playUrl empty", new Error("empty_url"), { attempt: 0, srcType: "unknown" });
      this.setLastError(AUDIO_ERROR.PLAYBACK_FAILED);
      return false;
    }
    try {
      const srcType = meta.srcType ?? inferSrcType(url);
      const audio = this.create(url);
      return this.play(audio, { ...meta, proxyUrl: url, srcType }, opts);
    } catch (err) {
      logStructured("playUrl create failed", err, { attempt: 0, srcType: inferSrcType(url) });
      this.setLastError(AUDIO_ERROR.PLAYBACK_FAILED);
      return false;
    }
  }

  private channelForAudio(audio: HTMLAudioElement): AudioChannel {
    if (this.channels.ui.current === audio) return "ui";
    return "speech";
  }

  private clearChannelIfCurrent(channel: AudioChannel, audio: HTMLAudioElement): void {
    const state = this.channelState(channel);
    state.playing = false;
    if (state.current === audio) {
      state.current = null;
    }
  }

  waitUntilEnd(
    audio: HTMLAudioElement,
    isCancelled: () => boolean,
    options?: { maxWaitMs?: number; pollMs?: number },
  ): Promise<AudioPlayResult> {
    return new Promise((resolve) => {
      let settled = false;
      const channel = this.channelForAudio(audio);

      const done = (result: AudioPlayResult) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        if (pollTimer !== undefined) window.clearInterval(pollTimer);
        audio.onended = null;
        audio.onerror = null;
        if (result.ok) {
          this.clearChannelIfCurrent(channel, audio);
        } else {
          this.clearChannelIfCurrent("speech", audio);
          this.clearChannelIfCurrent("ui", audio);
        }
        resolve(result);
      };

      const durationSec =
        Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      const defaultFallbackMs = durationSec > 0 ? (durationSec + 1) * 1000 : 30_000;
      const fallbackMs = options?.maxWaitMs ?? defaultFallbackMs;

      let pollTimer: number | undefined;
      const pollMs = options?.pollMs ?? 0;
      if (pollMs > 0) {
        pollTimer = window.setInterval(() => {
          if (isCancelled()) {
            done({ ok: false, error: "audio_cancelled" });
            return;
          }
          if (audio.ended) {
            done({ ok: true });
          }
        }, pollMs);
      }

      const fallbackTimer = window.setTimeout(() => {
        if (isCancelled()) return done({ ok: false, error: "audio_cancelled" });
        logStructured("waitUntilEnd fallback timeout", new Error("wait_until_end_timeout"), {
          attempt: 0,
          srcType: inferSrcType(audio.src),
          fallbackMs,
          channel,
        }, audio);
        if (audio.ended) {
          return done({ ok: true });
        }
        done({ ok: false, error: "wait_until_end_timeout" });
      }, fallbackMs);

      audio.onended = () => {
        if (isCancelled()) return done({ ok: false, error: "audio_cancelled" });
        done({ ok: true });
      };

      audio.onerror = () => {
        if (isCancelled()) return done({ ok: false, error: "audio_cancelled" });
        const code = audio.error?.code ?? "unknown";
        logStructured("waitUntilEnd media error", new Error(`media_error_${code}`), {
          attempt: 0,
          srcType: inferSrcType(audio.src),
          channel,
        }, audio);
        done({ ok: false, error: `playback_failed_${code}` });
      };
    });
  }

  async resumeElement(audio: HTMLAudioElement): Promise<boolean> {
    if (!isTtsPlaybackAllowed()) {
      this.setLastError(AUDIO_ERROR.USER_INTERACTION_REQUIRED);
      logStructured("resume blocked", new Error(AUDIO_ERROR.GESTURE_BLOCKED), {
        attempt: 0,
        srcType: inferSrcType(audio.src),
      });
      return false;
    }

    configureMobileAudioElement(audio);
    try {
      await audio.play();
      await this.runPlaybackWatchdog(audio, this.channels.speech.playToken, "speech");
      this.channels.speech.playing = true;
      return true;
    } catch (err) {
      if (isNotAllowedError(err)) {
        this.setLastError(AUDIO_ERROR.USER_INTERACTION_REQUIRED);
        return false;
      }
      logStructured("resume failed — retrying via play", err, {
        attempt: 1,
        srcType: inferSrcType(audio.src),
      });
      return this.play(
        audio,
        { proxyUrl: audio.src, source: "resume-retry", interrupt: true },
        { maxRetries: 1, channel: "speech", interrupt: true },
      );
    }
  }

  getCurrentElement(): HTMLAudioElement | null {
    return this.channels.speech.current;
  }

  getUiCurrentElement(): HTMLAudioElement | null {
    return this.channels.ui.current;
  }

  /** Speech or UI channel — infant sleep lullabies use UI channel. */
  getActiveMediaElement(): HTMLAudioElement | null {
    return this.channels.speech.current ?? this.channels.ui.current;
  }

  /** Element that played within the last few seconds (covers short phonics clips). */
  getRecentMediaElement(withinMs = 8_000): HTMLAudioElement | null {
    const active = this.getActiveMediaElement();
    if (active?.src) return active;
    const recent = this.lastMediaRef;
    if (!recent) return null;
    if (Date.now() - recent.at > withinMs) return null;
    if (recent.element?.src) return recent.element;
    if (recent.peakCurrentTime > 0 && recent.proxyUrl) return recent.element;
    return null;
  }

  /** Playback evidence for short clips whose blob src may be revoked after ended. */
  getRecentPlaybackEvidence(withinMs = 8_000): {
    src: string;
    peakCurrentTime: number;
    ended: boolean;
  } | null {
    const active = this.getActiveMediaElement();
    if (active?.src) {
      return {
        src: active.src,
        peakCurrentTime: active.currentTime,
        ended: active.ended,
      };
    }
    const recent = this.lastMediaRef;
    if (!recent || Date.now() - recent.at > withinMs) return null;
    const src = recent.element?.src || recent.proxyUrl;
    if (!src) return null;
    return {
      src,
      peakCurrentTime: recent.peakCurrentTime,
      ended: recent.element?.ended ?? recent.peakCurrentTime > 0,
    };
  }

  isAnyChannelPlaying(): boolean {
    return (
      this.channels.speech.playing ||
      this.channels.ui.playing ||
      this.playInFlight
    );
  }

  isSpeechPlaying(): boolean {
    return this.channels.speech.playing || this.playInFlight;
  }
}

const GLOBAL_MANAGER_REF_KEY = "__amynestAudioManagerRef";

function bootstrapAudioManager(): AudioManagerImpl {
  if (typeof window === "undefined") {
    return new AudioManagerImpl();
  }
  const w = window as unknown as Record<string, AudioManagerImpl | undefined>;
  const existing = w[GLOBAL_MANAGER_REF_KEY];
  if (existing && !existing.isInvalidated()) {
    return existing;
  }
  if (existing) existing.invalidate();
  const mgr = new AudioManagerImpl();
  w[GLOBAL_MANAGER_REF_KEY] = mgr;
  mgr.installLifecycle();
  return mgr;
}

export const audioManager = bootstrapAudioManager();
