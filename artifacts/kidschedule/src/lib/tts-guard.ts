/**
 * Browser autoplay policy: unlock audio on first user click/touch, then gate
 * all HTMLAudioElement.play() calls until unlocked.
 */

import { isNativeAmyNestShell } from "@/lib/native-shell";
import {
  isCapacitorIosShell,
  isStandalonePwa,
  isIosUa,
  isAndroidAmyNestAudioClient,
} from "@/lib/device-lite";
import { prepareIosAudioSessionForPlayback } from "@/lib/mic-permission-capacitor";

/** crossOrigin on remote MP3 often breaks playback in installed PWA / WebView shells. */
function shouldSetAudioCrossOrigin(audioSrc?: string): boolean {
  if (isNativeAmyNestShell() || isCapacitorIosShell()) return false;
  if (isAndroidAmyNestAudioClient()) return false;
  if (isStandalonePwa() && isIosUa()) return false;
  if (audioSrc && typeof window !== "undefined") {
    try {
      const resolved = new URL(audioSrc, window.location.href);
      if (resolved.origin === window.location.origin) return false;
      // GCS signed URLs have no bucket CORS — HTMLAudioElement must load without crossOrigin.
      if (resolved.hostname === "storage.googleapis.com") return false;
    } catch {
      /* ignore malformed src */
    }
  }
  return true;
}

let audioUnlocked = false;
let unlockListenersInstalled = false;
let unlockCtx: AudioContext | null = null;

function getAudioContextClass(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

/**
 * Resume (or create) a shared AudioContext so Web Audio nodes can start.
 * Skips creation when the browser reports the autoplay policy disallows it —
 * this avoids the Chrome "AudioContext was not allowed to start" warning.
 */
/** Amy voice on Android uses HTMLAudioElement — Web Audio at boot causes autoplay warnings. */
export function shouldUseWebAudioUnlock(): boolean {
  return !isAndroidAmyNestAudioClient();
}

function resumeUnlockAudioContext(): void {
  if (typeof window === "undefined" || !shouldUseWebAudioUnlock()) return;

  type AutoplayPolicyWindow = Window & {
    getAutoplayPolicy?: (kind: "mediaelement" | "audiocontext") => string;
  };
  const policy = (window as AutoplayPolicyWindow).getAutoplayPolicy?.("audiocontext");
  if (policy === "disallowed") return;

  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return;
  try {
    if (!unlockCtx || unlockCtx.state === "closed") {
      unlockCtx = new AudioContextClass();
    }
    if (unlockCtx.state === "suspended") {
      void unlockCtx.resume().catch(() => {});
    }
  } catch {
    /* best-effort — HTMLAudioElement unlock is primary */
  }
}

/**
 * @param fromUserGesture When false, only flips the HTML-audio gate (no AudioContext / silent warm).
 */
function unlockAudio(fromUserGesture = false): void {
  audioUnlocked = true;
  if (fromUserGesture) {
    resumeUnlockAudioContext();
    if (isCapacitorIosShell()) {
      void prepareIosAudioSessionForPlayback();
    }
    // Guarantee future HTMLAudioElement.play() — silent 10ms buffer + dispose path
    // lives inside audioManager.warmMediaPipeline → playSilentUnlockBuffer.
  }
  void import("@/lib/static-audio-telemetry").then((m) => m.resetClientStaticAudioCircuit());
  if (fromUserGesture) {
    void import("@/lib/audio-manager").then((m) =>
      m.audioManager.warmMediaPipeline(true, { fromUserGesture: true }),
    );
  }
}

/**
 * Call from every Play / Speak CTA in the same user-gesture turn.
 * Idempotent — unlocks AudioContext, warms media pipeline, plays silent buffer.
 */
export function guaranteeAudioUnlockedFromGesture(): void {
  unlockAudio(true);
}

/**
 * Install one-time click/touch/key listeners to unlock audio for the session.
 * Safe to call multiple times (e.g. App + AppCore).
 */
export function initAudioUnlock(): void {
  if (typeof document === "undefined") return;
  if (unlockListenersInstalled) return;
  unlockListenersInstalled = true;

  // Android PWA: allow HTML Amy voice after tap without creating AudioContext at boot.
  if (isAndroidAmyNestAudioClient()) {
    audioUnlocked = true;
  }

  const onUnlock = () => {
    unlockAudio(true);
    document.removeEventListener("click", onUnlock, true);
    document.removeEventListener("touchstart", onUnlock, true);
    document.removeEventListener("pointerdown", onUnlock, true);
    document.removeEventListener("keydown", onUnlock, true);
  };

  document.addEventListener("click", onUnlock, true);
  document.addEventListener("touchstart", onUnlock, true);
  document.addEventListener("pointerdown", onUnlock, true);
  document.addEventListener("keydown", onUnlock, true);
}

/** WKWebView / iOS need inline playback; helps Capacitor audio start after tap. */
export function configureMobileAudioElement(audio: HTMLAudioElement): void {
  try {
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    audio.preload = "auto";
    if (
      shouldSetAudioCrossOrigin(audio.src) &&
      audio.src &&
      !audio.src.startsWith("blob:") &&
      !audio.src.startsWith("data:")
    ) {
      audio.crossOrigin = "anonymous";
    } else {
      audio.removeAttribute("crossorigin");
      (audio as HTMLAudioElement & { crossOrigin: string | null }).crossOrigin = null;
    }
  } catch {
    /* ignore */
  }
}

export function getTtsRequestTimeoutMs(): number {
  return isNativeAmyNestShell() ? 28_000 : 12_000;
}

/** @deprecated Use initAudioUnlock — kept for existing call sites. */
export function installTtsGestureListener(): void {
  initAudioUnlock();
}

/** Call from button handlers in the same gesture turn as playback. */
export function recordTtsUserGesture(): void {
  unlockAudio(true);
}

/** Alias — Play / Speak CTAs should call this for guaranteed unlock. */
export { guaranteeAudioUnlockedFromGesture as unlockAudioForPlayback };

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

/** For production audio diagnostics — does not create new AudioContext instances. */
export function getUnlockAudioContextState(): string {
  if (!shouldUseWebAudioUnlock()) return "skipped_android_html_audio";
  if (!unlockCtx) return "not_created";
  return unlockCtx.state;
}

export function isTtsPlaybackAllowed(): boolean {
  return audioUnlocked;
}

/**
 * Play an HTMLAudioElement only after user interaction has unlocked audio.
 * @throws When playback is blocked or the element fails to play.
 */
/** @deprecated Prefer audioManager.play — kept for legacy call sites. */
export async function playHtmlAudio(audio: HTMLAudioElement): Promise<void> {
  const { audioManager, AUDIO_ERROR } = await import("@/lib/audio-manager");
  const ok = await audioManager.play(
    audio,
    { source: "playHtmlAudio" },
    { maxRetries: 1, channel: "speech", interrupt: true },
  );
  if (!ok) {
    const last = audioManager.getLastPlayError();
    if (last === AUDIO_ERROR.USER_INTERACTION_REQUIRED || !audioUnlocked) {
      console.warn("Audio blocked: waiting for user interaction");
      throw new Error(AUDIO_ERROR.USER_INTERACTION_REQUIRED);
    }
    throw new Error(last ?? "audio_play_failed");
  }
}
