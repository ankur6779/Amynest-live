/**
 * Deep pre-warm for Amy Sound World / Animal World library clips —
 * decode to HAVE_ENOUGH_DATA before kid taps (target <50ms perceived latency).
 */

import { resolveApiMediaUrl } from "@/lib/api";
import { audioManager } from "@/lib/audio-manager";
import { prepareNativeForPlayback } from "@/lib/audio-session-coordinator";
import { isCapacitorIosNative } from "@/lib/mic-permission-capacitor";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import { recordTtsUserGesture, configureMobileAudioElement } from "@/lib/tts-guard";

const DEEP_WARM_TIMEOUT_MS = 4_500;
const DEEP_WARM_BATCH = 4;

function runIdle(task: () => void): void {
  if (typeof window !== "undefined" && window.requestIdleCallback) {
    window.requestIdleCallback(task, { timeout: 1200 });
    return;
  }
  if (typeof window !== "undefined") {
    window.setTimeout(task, 60);
    return;
  }
  task();
}

export function resolveWorldLibraryPlaybackUrl(url: string): string {
  const u = (url ?? "").trim();
  if (!u) return u;
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("blob:")) return u;
  return resolveApiMediaUrl(u);
}

/** Shared mobile gesture-prime element — never allocate a new Audio() per tap. */
let sharedPrimeAudio: HTMLAudioElement | null = null;

function getSharedPrimeAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (sharedPrimeAudio) return sharedPrimeAudio;
  try {
    sharedPrimeAudio = new Audio();
    configureMobileAudioElement(sharedPrimeAudio);
    sharedPrimeAudio.preload = "auto";
    sharedPrimeAudio.volume = 0.02;
    return sharedPrimeAudio;
  } catch {
    return null;
  }
}

/** iOS WKWebView + Android WebView: prime decoder inside user gesture. */
export function primeWorldLibrarySoundUrl(url: string): void {
  const resolved = resolveWorldLibraryPlaybackUrl(url);
  if (!resolved) return;
  recordTtsUserGesture();
  audioManager.unlockFromUserGesture();
  audioManager.primeSpeechUrlInUserGesture(resolved);

  if (!isCapacitorIosNative() && !isAndroidAmyNestAudioClient()) return;

  // Reuse one element — allocating `new Audio()` on every tap leaked media
  // pipelines and contributed to Android WebView hangs under rapid taps.
  try {
    const prime = getSharedPrimeAudio();
    if (!prime) return;
    if (prime.src !== resolved) {
      prime.src = resolved;
    }
    prime.pause();
    try {
      prime.currentTime = 0;
    } catch {
      /* ignore seek before metadata */
    }
    const p = prime.play();
    if (p) {
      void p
        .then(() => {
          prime.pause();
          try {
            prime.currentTime = 0;
          } catch {
            /* ignore */
          }
        })
        .catch(() => undefined);
    }
  } catch {
    /* best-effort */
  }
}

export async function prepareWorldLibraryPlayback(): Promise<void> {
  recordTtsUserGesture();
  audioManager.unlockFromUserGesture();
  await prepareNativeForPlayback();
}

function waitForAudioReady(audio: HTMLAudioElement, timeoutMs = DEEP_WARM_TIMEOUT_MS): Promise<boolean> {
  if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) return Promise.resolve(true);
  return new Promise((resolve) => {
    const onReady = () => {
      cleanup();
      resolve(audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
    };
    const onError = () => {
      cleanup();
      resolve(false);
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("error", onError);
    };
    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
    try {
      audio.load();
    } catch {
      cleanup();
      resolve(false);
    }
  });
}

/** Load clips into AudioManager cache until decodable — fire-and-forget safe. */
export function scheduleWorldLibraryDeepPreload(urls: string[], max = 24): void {
  if (typeof window === "undefined") return;
  const unique = [...new Set(urls.map(resolveWorldLibraryPlaybackUrl).filter(Boolean))].slice(0, max);
  if (unique.length === 0) return;

  runIdle(() => {
    void (async () => {
      for (let i = 0; i < unique.length; i += DEEP_WARM_BATCH) {
        const batch = unique.slice(i, i + DEEP_WARM_BATCH);
        await Promise.all(
          batch.map(async (url) => {
            try {
              const audio = audioManager.getCached(url, { forceReload: false });
              await waitForAudioReady(audio);
            } catch {
              /* skip failed clip */
            }
          }),
        );
      }
    })();
  });
}

export async function deepPreloadWorldLibraryUrls(urls: string[], max = 8): Promise<void> {
  const unique = [...new Set(urls.map(resolveWorldLibraryPlaybackUrl).filter(Boolean))].slice(0, max);
  for (const url of unique) {
    try {
      const audio = audioManager.getCached(url, { forceReload: false });
      await waitForAudioReady(audio);
    } catch {
      /* skip */
    }
  }
}
