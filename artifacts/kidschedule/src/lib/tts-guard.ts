/**
 * Browser autoplay policy: unlock audio on first user click/touch, then gate
 * all HTMLAudioElement.play() calls until unlocked.
 */

import { isNativeAmyNestShell } from "@/lib/native-shell";

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
function resumeUnlockAudioContext(): void {
  if (typeof window === "undefined") return;

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
      void unlockCtx.resume();
    }
  } catch {
    /* best-effort — HTMLAudioElement unlock is primary */
  }
}

function unlockAudio(): void {
  if (audioUnlocked) return;
  audioUnlocked = true;
  resumeUnlockAudioContext();
}

/**
 * Install one-time click/touch/key listeners to unlock audio for the session.
 * Safe to call multiple times (e.g. App + AppCore).
 */
export function initAudioUnlock(): void {
  if (typeof document === "undefined") return;
  if (unlockListenersInstalled) return;
  unlockListenersInstalled = true;

  const onUnlock = () => {
    unlockAudio();
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
  unlockAudio();
}

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

export function isTtsPlaybackAllowed(): boolean {
  return audioUnlocked;
}

/**
 * Play an HTMLAudioElement only after user interaction has unlocked audio.
 * @throws When playback is blocked or the element fails to play.
 */
export async function playHtmlAudio(audio: HTMLAudioElement): Promise<void> {
  configureMobileAudioElement(audio);
  if (!audioUnlocked) {
    console.warn("Audio blocked: waiting for user interaction");
    throw new Error("audio_blocked_until_gesture");
  }
  audio.currentTime = 0;
  try {
    await audio.play();
  } catch (err) {
    const name = (err as { name?: string })?.name ?? "";
    if (name === "NotAllowedError") {
      unlockAudio();
      audio.currentTime = 0;
      await audio.play();
      return;
    }
    throw err;
  }
}
