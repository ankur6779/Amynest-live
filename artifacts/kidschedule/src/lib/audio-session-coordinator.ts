/**
 * Global audio-session coordinator — single ownership contract for TTS, phonics,
 * Speech Coach mic, and native shell lifecycle (Android WebView / Capacitor iOS).
 *
 * NotReadableError in WebView often means stale playback focus, not another app.
 */

import { isCapacitorIosNative, prepareIosAudioSessionForRecording } from "@/lib/mic-permission-capacitor";
import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";

/** Wait after TTS/playback ends before mic acquire (Samsung WebView needs this). */
export const MIC_POST_PLAYBACK_COOLDOWN_MS = 250;
/** Full focus reset before NotReadableError retry. */
export const MIC_FOCUS_RESET_COOLDOWN_MS = 300;

type PlaybackStopper = () => void;
type LifecycleListener = (state: AppLifecycleState) => void;

export type AppLifecycleState = "pause" | "resume" | "stop" | "visible" | "hidden";

export type AudioSessionDiagnostics = {
  userAgent: string;
  webViewHint: string | null;
  androidVersion: string | null;
  isSamsung: boolean;
  isMiui: boolean;
  isAndroidWrapper: boolean;
  isCapacitorIos: boolean;
  visibility: string;
  activeAudioElementCount: number;
  trackedAudioContextCount: number;
  playbackActive: boolean;
  msSinceLastPlaybackEnd: number | null;
  lastPlaybackEndedAt: number | null;
  lastMicPrepareStartedAt: number | null;
  lastMicPrepareDurationMs: number | null;
};

const LOG = "[amynest:audio-coordinator]";

const playbackStoppers = new Set<PlaybackStopper>();
const trackedAudioContexts = new WeakSet<AudioContext>();
const lifecycleListeners = new Set<LifecycleListener>();

let lifecycleInstalled = false;
let playbackActive = false;
let lastPlaybackEndedAt: number | null = null;
let lastMicPrepareStartedAt: number | null = null;
let lastMicPrepareDurationMs: number | null = null;
let micPrepareChain: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function log(message: string, detail?: unknown): void {
  try {
    if (detail === undefined) console.debug(`${LOG} ${message}`);
    else console.debug(`${LOG} ${message}`, detail);
  } catch {
    /* logging must not affect audio */
  }
}

function parseAndroidVersion(ua: string): string | null {
  const m = ua.match(/Android\s+([\d.]+)/i);
  return m?.[1] ?? null;
}

function parseWebViewHint(ua: string): string | null {
  const m = ua.match(/;\s*wv\)|Version\/([\d.]+).*Chrome\/([\d.]+)/i);
  if (m) return `wv Chrome/${m[2] ?? "?"} Version/${m[1] ?? "?"}`;
  const chrome = ua.match(/Chrome\/([\d.]+)/i);
  return chrome ? `Chrome/${chrome[1]}` : null;
}

/** Register a module that owns HTMLAudioElement / TTS playback. */
export function registerPlaybackStopper(stopper: PlaybackStopper): () => void {
  playbackStoppers.add(stopper);
  return () => playbackStoppers.delete(stopper);
}

/** Track AudioContext instances so zombie contexts can be destroyed before mic. */
let trackedAudioContextCount = 0;

export function trackAudioContext(ctx: AudioContext | null | undefined): void {
  if (ctx && !trackedAudioContexts.has(ctx)) {
    trackedAudioContexts.add(ctx);
    trackedAudioContextCount += 1;
  }
}

export function notifyPlaybackStarted(source?: string): void {
  playbackActive = true;
  log("playback started", { source, ...getAudioSessionDiagnostics() });
}

export function notifyPlaybackEnded(source?: string): void {
  playbackActive = false;
  lastPlaybackEndedAt = Date.now();
  log("playback ended", {
    source,
    msSinceStart: lastMicPrepareStartedAt ? Date.now() - lastMicPrepareStartedAt : null,
    ...getAudioSessionDiagnostics(),
  });
  releaseNativeAndroidAudioFocus();
}

export function isPlaybackActive(): boolean {
  return playbackActive;
}

export function getAudioSessionDiagnostics(): AudioSessionDiagnostics {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return {
    userAgent: ua,
    webViewHint: ua ? parseWebViewHint(ua) : null,
    androidVersion: ua ? parseAndroidVersion(ua) : null,
    isSamsung: /Samsung|SM-|SAMSUNG/i.test(ua),
    isMiui: /MiuiBrowser|XiaoMi|Redmi|POCO/i.test(ua),
    isAndroidWrapper: isNativeAmyNestAndroidWrapper(),
    isCapacitorIos: isCapacitorIosNative(),
    visibility: typeof document !== "undefined" ? document.visibilityState : "unknown",
    activeAudioElementCount:
      typeof document !== "undefined" ? document.querySelectorAll("audio").length : 0,
    trackedAudioContextCount,
    playbackActive,
    msSinceLastPlaybackEnd:
      lastPlaybackEndedAt != null ? Date.now() - lastPlaybackEndedAt : null,
    lastPlaybackEndedAt,
    lastMicPrepareStartedAt,
    lastMicPrepareDurationMs,
  };
}

function getAndroidAudioBridge() {
  if (typeof window === "undefined" || !isNativeAmyNestAndroidWrapper()) return null;
  return window.AndroidMicrophone ?? null;
}

function releaseNativeAndroidAudioFocus(): void {
  try {
    getAndroidAudioBridge()?.releaseAudioFocus?.();
  } catch (err) {
    log("native releaseAudioFocus failed", err);
  }
}

async function prepareNativeForRecording(): Promise<void> {
  try {
    if (isCapacitorIosNative()) {
      await prepareIosAudioSessionForRecording();
    }
    getAndroidAudioBridge()?.prepareForRecording?.();
  } catch (err) {
    log("native prepareForRecording failed", err);
  }
}

/** Pause every known HTMLAudioElement in the document (WebView zombie cleanup). */
function pauseAllDocumentAudioElements(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll("audio").forEach((el) => {
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      /* ignore */
    }
  });
}

export function destroyZombieAudioContexts(): void {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctx) return;

  // Best-effort: close tracked contexts that are suspended or closed
  // (WeakSet cannot be iterated — callers pass explicit contexts via closeAudioContext)
}

export async function closeAudioContext(ctx: AudioContext | null | undefined): Promise<void> {
  if (!ctx) return;
  try {
    if (ctx.state !== "closed") await ctx.close();
    if (trackedAudioContexts.has(ctx)) {
      trackedAudioContexts.delete(ctx);
      trackedAudioContextCount = Math.max(0, trackedAudioContextCount - 1);
    }
  } catch (err) {
    log("AudioContext close failed", err);
  }
}

export async function stopAllPlayback(): Promise<void> {
  log("stopAllPlayback", getAudioSessionDiagnostics());
  playbackActive = false;

  for (const stop of playbackStoppers) {
    try {
      stop();
    } catch (err) {
      log("playback stopper failed", err);
    }
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }

  pauseAllDocumentAudioElements();
  releaseNativeAndroidAudioFocus();
}

/**
 * Full audio focus reset before NotReadableError retry.
 * Stops playback → releases contexts → waits → prepares native recording session.
 */
export async function resetAudioFocusForMicRetry(): Promise<void> {
  log("resetAudioFocusForMicRetry start", getAudioSessionDiagnostics());
  await stopAllPlayback();
  await sleep(MIC_FOCUS_RESET_COOLDOWN_MS);
  await prepareNativeForRecording();
  log("resetAudioFocusForMicRetry done", getAudioSessionDiagnostics());
}

/**
 * Call before every getUserMedia / MediaRecorder acquire.
 * Ensures playback is fully released and hardware has settled.
 */
export async function prepareForMicrophoneAcquisition(): Promise<void> {
  const run = async () => {
    const started = performance.now();
    lastMicPrepareStartedAt = Date.now();
    log("prepareForMicrophoneAcquisition start", getAudioSessionDiagnostics());

    await stopAllPlayback();

    const sincePlayback = lastPlaybackEndedAt != null ? Date.now() - lastPlaybackEndedAt : Infinity;
    const cooldown =
      playbackActive || sincePlayback < MIC_POST_PLAYBACK_COOLDOWN_MS
        ? Math.max(
            MIC_POST_PLAYBACK_COOLDOWN_MS - (Number.isFinite(sincePlayback) ? sincePlayback : 0),
            playbackActive ? MIC_POST_PLAYBACK_COOLDOWN_MS : 0,
          )
        : 0;

    if (cooldown > 0) {
      log(`post-playback cooldown ${Math.round(cooldown)}ms`, {
        playbackActive,
        sincePlayback,
      });
      await sleep(cooldown);
    }

    await prepareNativeForRecording();
    lastMicPrepareDurationMs = Math.round(performance.now() - started);
    log("prepareForMicrophoneAcquisition done", {
      durationMs: lastMicPrepareDurationMs,
      ...getAudioSessionDiagnostics(),
    });
  };

  micPrepareChain = micPrepareChain.then(run, run);
  return micPrepareChain;
}

export function subscribeAppLifecycle(listener: LifecycleListener): () => void {
  lifecycleListeners.add(listener);
  return () => lifecycleListeners.delete(listener);
}

function dispatchLifecycle(state: AppLifecycleState): void {
  log(`app lifecycle: ${state}`, getAudioSessionDiagnostics());
  for (const listener of lifecycleListeners) {
    try {
      listener(state);
    } catch (err) {
      log("lifecycle listener failed", err);
    }
  }
}

async function handleNativeLifecycleReset(state: AppLifecycleState): Promise<void> {
  if (state === "hidden" || state === "pause" || state === "stop") {
    await stopAllPlayback();
    const { microphoneSessionManager } = await import("@/lib/microphone-session-manager");
    microphoneSessionManager.reset();
  } else if (state === "visible" || state === "resume") {
    const { resetMicrophonePermissionCache } = await import("@/lib/microphone-permission");
    resetMicrophonePermissionCache();
  }
}

/** Wire visibility, native shell, and optional Capacitor appStateChange. */
export function installAudioSessionLifecycle(): void {
  if (lifecycleInstalled || typeof window === "undefined") return;
  lifecycleInstalled = true;

  subscribeAppLifecycle((state) => {
    void handleNativeLifecycleReset(state);
  });

  document.addEventListener("visibilitychange", () => {
    const state = document.visibilityState === "visible" ? "visible" : "hidden";
    dispatchLifecycle(state);
  });

  window.addEventListener("pageshow", (ev) => {
    if ((ev as PageTransitionEvent).persisted) dispatchLifecycle("visible");
  });

  window.addEventListener("amynest-app-lifecycle", (ev) => {
    const state = (ev as CustomEvent<{ state?: AppLifecycleState }>).detail?.state;
    if (state) dispatchLifecycle(state);
  });

  void import("@/lib/audio-manager").then(({ audioManager }) => {
    registerPlaybackStopper(() => audioManager.stopAll());
  });
  void import("@/lib/phonics-player").then(({ stopPhonicsPlayback }) => {
    registerPlaybackStopper(() => stopPhonicsPlayback("coordinator"));
  });

  void tryInstallCapacitorAppStateListener();
  log("audio session lifecycle installed", getAudioSessionDiagnostics());
}

async function tryInstallCapacitorAppStateListener(): Promise<void> {
  if (!isCapacitorIosNative()) return;
  try {
    const { App } = await import("@capacitor/app");
    void App.addListener("appStateChange", ({ isActive }) => {
      dispatchLifecycle(isActive ? "resume" : "pause");
    });
  } catch {
    /* Capacitor App plugin optional */
  }
}
