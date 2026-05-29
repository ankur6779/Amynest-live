/**
 * Global audio pre-warm — shared cache for Phonics, Spelling Mastery, and Speech Coach.
 * Controlled batching + priority tiers to avoid CPU/memory spikes on low-end devices.
 */

import { getCoachDialogueWarmupPhrases } from "@workspace/speech-coach";
import { getPhonicsLetterCacheKey } from "@workspace/phonics-sounds";
import { audioManager } from "@/lib/audio-manager";
import {
  deleteGlobalAudioCacheEntry,
  getGlobalAudioCacheEntry,
  getGlobalCachedAudioForPlayback,
  globalAudioCacheKeys,
  globalAudioCacheSize,
  hasGlobalAudioCacheEntry,
  setGlobalAudioCacheEntry,
} from "@/lib/global-audio-cache";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { warmLocalCacheFromUrl, localCacheKeyForPhrase } from "@/lib/local-tts-cache";
import { getPhonicsStaticAudioUrl } from "@/lib/phonics-static-audio";
import { lookupStaticAudioUrl, prefetchStaticAudioUrl } from "@/lib/static-audio";
import { recordTtsUserGesture } from "@/lib/tts-guard";

export { getGlobalCachedAudioForPlayback };

const BATCH_SIZE = 5;
const BATCH_GAP_MS = 50;
const MAX_AUDIO_CACHE = 40;
const REPRIME_DEBOUNCE_MS = 2_000;

const HIGH_PRIORITY = ["a", "b", "c", "d", "e"] as const;
const MEDIUM_PRIORITY = ["f", "g", "h", "i", "j", "k", "l", "m"] as const;
const LOW_PRIORITY = [
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "sh",
  "ch",
  "th1",
  "th2",
  "ph",
  "ng",
  "wh",
] as const;

const SPELLING_COMMON_WORDS = [
  "cat",
  "bat",
  "rat",
  "mat",
  "dog",
  "pen",
  "sun",
  "run",
] as const;

const SPEECH_COACH_DEFAULT_PHRASES = getCoachDialogueWarmupPhrases();

const SPEECH_COACH_WARMUP_MERGE_LIMIT = 12;
const SPEECH_COACH_WARMUP_CACHE_LIMIT = 8;

type AudioWarmItem = { cacheKey: string; url: string; localKey?: string };

let lastSpeechTexts: string[] = [];
let initStarted = false;
let currentAudio: HTMLAudioElement | null = null;
let userGestureUnlocked = false;
let gestureUnlockInstalled = false;
let visibilityReprimeInstalled = false;
let lastPrimeTime = 0;

const runIdle: (task: () => void) => void =
  typeof window !== "undefined" && window.requestIdleCallback
    ? (task) => {
        window.requestIdleCallback(task);
      }
    : typeof window !== "undefined"
      ? (task) => {
          window.setTimeout(task, 300);
        }
      : (task) => {
          task();
        };

function markUserGestureUnlocked(): void {
  userGestureUnlocked = true;
}

function installUserGestureUnlock(): void {
  if (gestureUnlockInstalled || typeof window === "undefined") return;
  gestureUnlockInstalled = true;

  const unlock = () => {
    markUserGestureUnlocked();
  };

  window.addEventListener("pointerdown", unlock, { capture: true, passive: true, once: true });
  window.addEventListener("click", unlock, { capture: true, passive: true, once: true });
}

function shouldPreload(_key: string): boolean {
  return true;
}

function enforceCacheLimit(): void {
  while (globalAudioCacheSize() > MAX_AUDIO_CACHE) {
    const firstKey = globalAudioCacheKeys().next().value;
    if (!firstKey) break;
    const audio = getGlobalAudioCacheEntry(firstKey);
    if (audio) {
      if (currentAudio === audio) currentAudio = null;
      try {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      } catch {
        /* ignore */
      }
    }
    deleteGlobalAudioCacheEntry(firstKey);
  }
}

function getReusableAudio(cacheKey: string, url: string): HTMLAudioElement {
  const existing = getGlobalAudioCacheEntry(cacheKey);
  if (existing) return existing;

  const audio = audioManager.getCached(url, { forceReload: false });
  audio.preload = "auto";
  return audio;
}

/** Wait until the clip can play through without stalling — not just metadata. */
function loadAudioReady(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onReady = () => {
      audio.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      audio.removeEventListener("canplaythrough", onReady);
      reject(new Error("audio_load_failed"));
    };
    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
  });
}

/** Silent play/pause after user gesture — avoids autoplay policy warnings at boot. */
async function safePrimeAudio(audio: HTMLAudioElement): Promise<void> {
  if (!userGestureUnlocked) return;

  try {
    audio.volume = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
  } catch {
    // ignore
  }
}

async function primeGlobalAudioCache(): Promise<void> {
  if (!userGestureUnlocked) return;

  const keys = [...globalAudioCacheKeys()];
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (cacheKey) => {
        const audio = getGlobalAudioCacheEntry(cacheKey);
        if (audio) await safePrimeAudio(audio);
      }),
    );
    if (i + BATCH_SIZE < keys.length) {
      await new Promise((res) => setTimeout(res, BATCH_GAP_MS));
    }
  }
}

function safeReprime(): void {
  const now = Date.now();
  if (now - lastPrimeTime < REPRIME_DEBOUNCE_MS) return;

  lastPrimeTime = now;
  void primeGlobalAudioCache();
}

async function warmBatchKeys(
  keys: readonly string[],
  loadFn: (key: string) => Promise<void>,
): Promise<void> {
  const filtered = keys.filter(shouldPreload);
  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(loadFn));
    if (i + BATCH_SIZE < filtered.length) {
      await new Promise((res) => setTimeout(res, BATCH_GAP_MS));
    }
  }
}

async function warmBatchItems(items: AudioWarmItem[]): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((item) => loadAudio(item.cacheKey, item.url, item.localKey)));
    if (i + BATCH_SIZE < items.length) {
      await new Promise((res) => setTimeout(res, BATCH_GAP_MS));
    }
  }
}

async function loadAudio(cacheKey: string, url: string, localKey?: string): Promise<void> {
  if (hasGlobalAudioCacheEntry(cacheKey)) return;
  if (!url) return;

  void warmLocalCacheFromUrl(localKey ?? cacheKey, url);
  prefetchStaticAudioUrl(url);

  const audio = getReusableAudio(cacheKey, url);

  try {
    audio.load();
    await loadAudioReady(audio);
    await safePrimeAudio(audio);
    setGlobalAudioCacheEntry(cacheKey, audio);
    enforceCacheLimit();
    audioManager.getCached(url, { forceReload: false });
  } catch {
    console.warn("audio preload failed", cacheKey);
  }
}

async function loadPhonicsKey(key: string): Promise<void> {
  await loadAudio(
    `phonics:${key}`,
    getPhonicsStaticAudioUrl(key),
    getPhonicsLetterCacheKey(key),
  );
}

async function warmPhonicsSmart(): Promise<void> {
  await warmBatchKeys(HIGH_PRIORITY, loadPhonicsKey);

  window.setTimeout(() => {
    void warmBatchKeys(MEDIUM_PRIORITY, loadPhonicsKey);
  }, 200);

  runIdle(() => {
    void warmBatchKeys(LOW_PRIORITY, loadPhonicsKey);
  });
}

function warmSpellingAudio(): Promise<void> {
  const items: AudioWarmItem[] = [];
  for (const word of SPELLING_COMMON_WORDS) {
    const url = lookupStaticAudioUrl(word, "default");
    if (!url) continue;
    items.push({
      cacheKey: `spelling:${word}`,
      url,
      localKey: localCacheKeyForPhrase(word, "default"),
    });
  }
  return warmBatchItems(items);
}

/** Warm last-used + predicted Speech Coach phrases (static catalog only — no live TTS). */
export function warmSpeechCoach(texts: string[]): void {
  const merged = [...new Set([...texts, ...SPEECH_COACH_DEFAULT_PHRASES])]
    .map((text) => text.trim())
    .filter(Boolean)
    .slice(0, SPEECH_COACH_WARMUP_MERGE_LIMIT);

  lastSpeechTexts = merged.slice(0, SPEECH_COACH_WARMUP_CACHE_LIMIT);

  runIdle(() => {
    const items: AudioWarmItem[] = [];
    for (const text of lastSpeechTexts) {
      const url = lookupStaticAudioUrl(text, "default");
      if (!url) continue;
      items.push({
        cacheKey: `speech:${text.toLowerCase()}`,
        url,
        localKey: localCacheKeyForPhrase(text, "default"),
      });
    }
    void warmBatchItems(items);
  });
}

function playSafe(audio: HTMLAudioElement): void {
  try {
    if (currentAudio && currentAudio !== audio) {
      currentAudio.pause();
    }
    currentAudio = audio;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

export function playAudioInstant(key: string, fallbackUrl?: string): void {
  const audio = getGlobalAudioCacheEntry(key);
  if (audio) {
    playSafe(audio);
    return;
  }

  if (fallbackUrl) {
    void loadAudio(key, fallbackUrl).then(() => {
      const cached = getGlobalAudioCacheEntry(key);
      if (cached) playSafe(cached);
    });
  }
}

export function isGlobalAudioCached(key: string): boolean {
  return hasGlobalAudioCacheEntry(key);
}

export function initGlobalAudioWarmup(): void {
  if (initStarted || typeof window === "undefined") return;
  initStarted = true;

  void warmPhonicsSmart();

  runIdle(() => {
    void warmSpellingAudio();
    warmSpeechCoach([...SPEECH_COACH_DEFAULT_PHRASES]);
  });

  logAmyVoiceDiag("global_audio_warmup_init", {
    criticalPhonics: HIGH_PRIORITY.length,
    spellingWords: SPELLING_COMMON_WORDS.length,
    batchSize: BATCH_SIZE,
    maxCache: MAX_AUDIO_CACHE,
  });
}

function installVisibilityReprime(): void {
  if (visibilityReprimeInstalled || typeof document === "undefined") return;
  visibilityReprimeInstalled = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && userGestureUnlocked) {
      safeReprime();
    }
  });
}

export function installGlobalAudioWarmupOnGesture(): void {
  if (typeof window === "undefined") return;

  installUserGestureUnlock();
  installVisibilityReprime();

  const boost = () => {
    markUserGestureUnlocked();
    recordTtsUserGesture();
    initGlobalAudioWarmup();
    void primeGlobalAudioCache();
  };

  window.addEventListener("pointerdown", boost, { capture: true, passive: true, once: true });
  window.addEventListener("click", boost, { capture: true, passive: true, once: true });
}
