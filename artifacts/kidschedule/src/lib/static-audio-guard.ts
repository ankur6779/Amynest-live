/** Regression guards — static catalog audio must use /api/static-audio/ only. */

const STATIC_PROXY_PATH_RE = /^\/api\/static-audio\/[a-f0-9]{32}\.mp3$/i;

let audioGuardInstalled = false;

/** Throws if a playback URL targets GCS directly. */
export function forbidDirectGcsUrl(url: string): void {
  if (!url.includes("storage.googleapis.com")) return;
  if (import.meta.env.DEV) {
    console.warn("DEV VIOLATION: GCS URL used instead of API proxy", url);
  }
  console.error("FORBIDDEN: Direct GCS usage detected", url);
  throw new Error("Static audio must use API proxy only");
}

/**
 * Silent probe — true iff `url` is an API static-audio stream route.
 * Safe to use in conditionals; never logs.
 */
export function isStaticAudioProxyUrl(url: string): boolean {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return false;
  try {
    const path = trimmed.startsWith("http") ? new URL(trimmed).pathname : trimmed;
    return STATIC_PROXY_PATH_RE.test(path);
  } catch {
    return false;
  }
}

/**
 * Validates pathname is an API static-audio stream route.
 * Logs only when called as a hard assertion (i.e. caller expected a proxy URL).
 */
export function assertStaticAudioUrl(url: string): boolean {
  if (isStaticAudioProxyUrl(url)) return true;
  console.error("INVALID STATIC AUDIO ROUTE", url);
  return false;
}

/** Assert proxy route + forbid GCS before creating HTMLAudioElement. */
export function assertStaticPlaybackUrl(url: string): void {
  forbidDirectGcsUrl(url);
  if (!assertStaticAudioUrl(url)) {
    throw new Error("Static audio must use API proxy only");
  }
}

/**
 * Block `new Audio("https://storage.googleapis.com/...")` app-wide.
 * Dynamic TTS uses blob: or /api/tts/audio/ URLs only.
 */
export function installStaticAudioConstructorGuard(): void {
  if (audioGuardInstalled || typeof window === "undefined") return;
  audioGuardInstalled = true;

  const OriginalAudio = window.Audio;

  function GuardedAudio(this: unknown, src?: string): HTMLAudioElement {
    if (typeof src === "string" && src.includes("storage.googleapis.com")) {
      console.error("BLOCKED: Direct GCS Audio usage", src);
      if (import.meta.env.DEV) {
        console.warn("DEV VIOLATION: GCS URL used instead of API proxy");
      }
      return new OriginalAudio("");
    }
    if (new.target) {
      return new OriginalAudio(src);
    }
    return new OriginalAudio(src);
  }

  GuardedAudio.prototype = OriginalAudio.prototype;
  Object.setPrototypeOf(GuardedAudio, OriginalAudio);
  window.Audio = GuardedAudio as unknown as typeof Audio;
}

export function installStaticAudioGuards(): void {
  installStaticAudioConstructorGuard();
}
