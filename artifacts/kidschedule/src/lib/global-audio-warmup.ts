/**
 * Global audio pre-warm — shared cache for Phonics, Spelling Mastery, and Speech Coach.
 * Controlled batching + priority tiers to avoid CPU/memory spikes on low-end devices.
 */

import { getCoachDialogueWarmupPhrases } from "@workspace/speech-coach";
import {
  getPhonicsLetterCacheKey,
  PHONICS_PREWARM_TIER_HIGH,
} from "@workspace/phonics-sounds";
import { audioManager } from "@/lib/audio-manager";
import {
  deleteGlobalAudioCacheEntry,
  evictOldestUnpinnedGlobalAudioEntry,
  getGlobalAudioCacheEntry,
  getGlobalCachedAudioForPlayback,
  globalAudioCacheKeys,
  globalAudioCacheSize,
  hasGlobalAudioCacheEntry,
  pinGlobalAudioCacheKey,
  setGlobalAudioCacheEntry,
} from "@/lib/global-audio-cache";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { warmLocalCacheFromUrl, localCacheKeyForPhrase } from "@/lib/local-tts-cache";
import { getPhonicsStaticAudioUrl, prefetchEntirePhonicsLibrary } from "@/lib/phonics-static-audio";
import { lookupSpellingAudioUrl } from "@/lib/spelling-audio-map";
import {
  countPhonicsLibraryPrewarmItems,
  listPhonicsLibraryPrewarmItems,
  type PhonicsLibraryPrewarmItem,
} from "@/lib/phonics-audio-map";
import { lookupStaticAudioUrl, prefetchStaticAudioUrl } from "@/lib/static-audio";
import { warmAppBootStaticPhrases } from "@/lib/app-audio-prefetch";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import { recordDecodeLatency } from "@/lib/audio-latency-metrics";
import type { AudioReliabilityModule } from "@/lib/audio-reliability-telemetry";

export { getGlobalCachedAudioForPlayback };

const BATCH_SIZE = 5;
const BATCH_GAP_MS = 50;
/** Hold decoded clips for phonemes, blends, digraphs + coach prompts (Phase 10). */
const MAX_AUDIO_CACHE = 120;
const REPRIME_DEBOUNCE_MS = 2_000;

const HIGH_PRIORITY = [...PHONICS_PREWARM_TIER_HIGH] as const;
const SPELLING_COMMON_WORDS = ["cat", "bat", "mat", "dog", "sun", "run"] as const;

const SPEECH_COACH_DEFAULT_PHRASES = getCoachDialogueWarmupPhrases();

const SPEECH_COACH_WARMUP_MERGE_LIMIT = 24;
const SPEECH_COACH_WARMUP_CACHE_LIMIT = 20;

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
    if (!evictOldestUnpinnedGlobalAudioEntry()) break;
  }
}

function warmupModuleForCacheKey(cacheKey: string): AudioReliabilityModule {
  if (cacheKey.startsWith("parent:")) return "parent_hub";
  if (cacheKey.startsWith("coach:")) return "speech_coach";
  if (cacheKey.startsWith("phonics:") || cacheKey.includes("blend")) return "phonics";
  return "other";
}

async function loadAudio(
  cacheKey: string,
  url: string,
  localKey?: string,
  pin = false,
): Promise<void> {
  if (hasGlobalAudioCacheEntry(cacheKey)) {
    if (pin) pinGlobalAudioCacheKey(cacheKey);
    return;
  }
  if (!url) return;

  void warmLocalCacheFromUrl(localKey ?? cacheKey, url);
  prefetchStaticAudioUrl(url);

  const audio = getReusableAudio(cacheKey, url);
  const module = warmupModuleForCacheKey(cacheKey);

  try {
    const decodeStart = performance.now();
    audio.load();
    await loadAudioReady(audio);
    recordDecodeLatency(module, performance.now() - decodeStart);
    await safePrimeAudio(audio);
    setGlobalAudioCacheEntry(cacheKey, audio);
    if (pin) pinGlobalAudioCacheKey(cacheKey);
    enforceCacheLimit();
    audioManager.getCached(url, { forceReload: false });
  } catch {
    console.warn("audio preload failed", cacheKey);
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
    await Promise.all(batch.map((item) => loadAudio(item.cacheKey, item.url, item.localKey, true)));
    if (i + BATCH_SIZE < items.length) {
      await new Promise((res) => setTimeout(res, BATCH_GAP_MS));
    }
  }
}

async function loadAudioDiskOnly(localKey: string, url: string): Promise<void> {
  if (!url) return;
  void warmLocalCacheFromUrl(localKey, url);
  prefetchStaticAudioUrl(url);
}

async function warmPhonicsPrewarmItems(
  items: PhonicsLibraryPrewarmItem[],
  includeMemory: boolean,
): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((item) =>
        includeMemory
          ? loadAudio(item.memoryCacheKey, item.url, item.localCacheKey, item.tier <= 2)
          : loadAudioDiskOnly(item.localCacheKey, item.url),
      ),
    );
    if (i + BATCH_SIZE < items.length) {
      await new Promise((res) => setTimeout(res, BATCH_GAP_MS));
    }
  }
}

async function warmPhonicsLibraryFull(): Promise<void> {
  const libraryItems = listPhonicsLibraryPrewarmItems();
  if (libraryItems.length === 0) {
    await warmBatchKeys(HIGH_PRIORITY, loadPhonicsKey);
    return;
  }

  // Every asset → IndexedDB + HTTP prefetch (instant playback from disk cache).
  prefetchEntirePhonicsLibrary();

  const tier1 = libraryItems.filter((item) => item.tier === 1);
  const tier2 = libraryItems.filter((item) => item.tier === 2);
  const tier3 = libraryItems.filter((item) => item.tier === 3);

  await warmPhonicsPrewarmItems(tier1, true);

  window.setTimeout(() => {
    void warmPhonicsPrewarmItems(tier2, true);
  }, 200);

  runIdle(() => {
    void warmPhonicsPrewarmItems(tier3, false);
  });
}

async function loadPhonicsKey(key: string): Promise<void> {
  await loadAudio(
    getPhonicsLetterCacheKey(key),
    getPhonicsStaticAudioUrl(key),
    getPhonicsLetterCacheKey(key),
  );
}

function warmSpellingAudio(): Promise<void> {
  const items: AudioWarmItem[] = [];
  for (const word of SPELLING_COMMON_WORDS) {
    const url = lookupSpellingAudioUrl(word);
    if (!url) continue;
    items.push({
      cacheKey: `spelling:${word}`,
      url,
      localKey: `spelling:word:${word}`,
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
    void warmBatchItems(items).catch(() => {});
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

/** Full phonics library warm — call from /phonics route only (not app boot). */
export function warmPhonicsLibraryOnRouteOpen(): void {
  if (typeof window === "undefined") return;
  void warmPhonicsLibraryFull().catch(() => {});
}

export function initGlobalAudioWarmup(): void {
  if (initStarted || typeof window === "undefined") return;
  initStarted = true;

  runIdle(() => {
    void warmSpellingAudio().catch(() => {});
    try {
      warmSpeechCoach([...SPEECH_COACH_DEFAULT_PHRASES]);
      warmAppBootStaticPhrases();
    } catch {
      /* soft-fail boot warm */
    }
    void import("@/lib/background-learning-pack").then((m) => {
      m.scheduleBackgroundLearningPackOnIdle();
    });
  });

  logAmyVoiceDiag("global_audio_warmup_init", {
    phonicsLibraryDeferredToRoute: true,
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
