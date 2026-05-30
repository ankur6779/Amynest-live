/**
 * Persistent intelligent pre-warm pipeline for core Learning Zone modules:
 * Smart Math Tricks, Abacus, Phonics, Spelling Mastery.
 *
 * Memory + disk cache, deduped jobs, predictive queueing, stale invalidation.
 */

import type { AuthFetchFn } from "@/lib/poll-result";
import {
  deleteGlobalAudioCacheEntry,
  getGlobalAudioCacheEntry,
  globalAudioCacheKeys,
  hasGlobalAudioCacheEntry,
  setGlobalAudioCacheEntry,
} from "@/lib/global-audio-cache";
import { audioManager } from "@/lib/audio-manager";
import {
  deleteLocalCachedAudio,
  localCacheKeyForPhrase,
  warmLocalCacheFromUrl,
} from "@/lib/local-tts-cache";
import { getPhonicsContentAudioUrl, getPhonicsStaticAudioUrl, prefetchEntirePhonicsLibrary } from "@/lib/phonics-static-audio";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import {
  pregenerateTtsTexts,
  type TtsPregenerateMode,
} from "@/lib/pregenerate-tts";
import { lookupStaticAudioUrl, prefetchStaticAudioUrl } from "@/lib/static-audio";
import { getPredictedNextKey, recordPhraseTransition } from "@/lib/amy-voice-pipeline-learning";

export type LearningZoneAudioModule =
  | "smart_math_tricks"
  | "abacus"
  | "phonics"
  | "spelling"
  | "learn_with_amy";

export type LearningZonePrewarmContext = {
  module: LearningZoneAudioModule;
  texts: string[];
  stateKey?: string;
  mode?: TtsPregenerateMode;
  voice?: string;
  speed?: number;
  locale?: string;
  difficulty?: string;
  ageGroup?: string | number;
  /** Current card index for predictive next-card queueing. */
  currentIndex?: number;
  /** Full ordered list for flow-sequence prediction. */
  sequenceTexts?: string[];
};

const BATCH_SIZE = 4;
const BATCH_GAP_MS = 40;
const MAX_MEMORY_CLIPS = 48;
const MAX_PREDICTIVE = 6;

const activeJobKeys = new Set<string>();
const invalidatedStateKeys = new Set<string>();
const lastStateKeyByModule = new Map<LearningZoneAudioModule, string>();

let lastFlowKey: string | null = null;
let phonicsLibraryDiskPrewarmStarted = false;

function runIdle(task: () => void): void {
  if (typeof window !== "undefined" && window.requestIdleCallback) {
    window.requestIdleCallback(task, { timeout: 1200 });
    return;
  }
  if (typeof window !== "undefined") {
    window.setTimeout(task, 80);
    return;
  }
  task();
}

export function buildLearningZoneAudioCacheKey(
  ctx: Pick<
    LearningZonePrewarmContext,
    "module" | "mode" | "voice" | "speed" | "locale" | "difficulty" | "ageGroup" | "stateKey"
  >,
  text: string,
): string {
  const parts = [
    "lz",
    ctx.module,
    ctx.mode ?? "default",
    ctx.voice ?? "amy",
    String(ctx.speed ?? 1),
    ctx.locale ?? "en",
    ctx.difficulty ?? "",
    String(ctx.ageGroup ?? ""),
    ctx.stateKey ?? "",
    text.trim().toLowerCase(),
  ];
  return parts.join(":");
}

export function buildLearningZoneAudioStateKey(input: {
  module: LearningZoneAudioModule;
  difficulty?: string;
  ageGroup?: string | number;
  locale?: string;
  revision?: string | number;
}): string {
  return [
    input.module,
    String(input.ageGroup ?? ""),
    input.difficulty ?? "",
    input.locale ?? "en",
    String(input.revision ?? ""),
  ].join("|");
}

function enforceMemoryLimit(): void {
  while ([...globalAudioCacheKeys()].filter((k) => k.startsWith("lz:")).length > MAX_MEMORY_CLIPS) {
    const key = [...globalAudioCacheKeys()].find((k) => k.startsWith("lz:"));
    if (!key) break;
    const audio = getGlobalAudioCacheEntry(key);
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      } catch {
        /* ignore */
      }
    }
    deleteGlobalAudioCacheEntry(key);
  }
}

async function loadClipToMemory(cacheKey: string, url: string, localKey: string): Promise<void> {
  if (!url || hasGlobalAudioCacheEntry(cacheKey)) return;

  void warmLocalCacheFromUrl(localKey, url);
  prefetchStaticAudioUrl(url);

  const audio = audioManager.getCached(url, { forceReload: false });
  audio.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      audio.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      audio.removeEventListener("canplaythrough", onReady);
      reject(new Error("audio_load_failed"));
    };
    if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      resolve();
      return;
    }
    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.load();
  }).catch(() => undefined);

  setGlobalAudioCacheEntry(cacheKey, audio);
  enforceMemoryLimit();
}

function resolveAudioUrl(text: string, mode: TtsPregenerateMode): string | null {
  if (mode === "phonics") {
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (trimmed.length <= 2 && !trimmed.includes(" ")) {
      return getPhonicsStaticAudioUrl(trimmed.toLowerCase()) || null;
    }
    return getPhonicsContentAudioUrl(trimmed) || null;
  }
  return lookupStaticAudioUrl(text, "default");
}

function predictLikelyTexts(ctx: LearningZonePrewarmContext): string[] {
  const predicted: string[] = [];
  const seq = ctx.sequenceTexts ?? ctx.texts;
  const idx = ctx.currentIndex ?? 0;

  if (seq.length > 0) {
    if (idx + 1 < seq.length) predicted.push(seq[idx + 1]!);
    if (idx + 2 < seq.length) predicted.push(seq[idx + 2]!);
    if (ctx.currentIndex == null && seq[0]) predicted.push(seq[0]);
  }

  const flowFrom = lastFlowKey ? getPredictedNextKey(lastFlowKey) : null;
  if (flowFrom) {
    const match = seq.find((t) => buildLearningZoneAudioCacheKey(ctx, t) === flowFrom);
    if (match) predicted.push(match);
  }

  if (ctx.module === "spelling" || ctx.module === "phonics") {
    predicted.push("good job", "try again", "well done");
  }
  if (ctx.module === "smart_math_tricks" || ctx.module === "abacus") {
    predicted.push("Correct! Well done!");
  }
  if (ctx.module === "learn_with_amy") {
    predicted.push(
      "Great job!",
      "Let's try again.",
      "Correct! Well done!",
      "Well done!",
      "Let's learn together!",
    );
  }

  const seen = new Set<string>();
  return [...ctx.texts, ...predicted]
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))
    .slice(0, MAX_PREDICTIVE + ctx.texts.length);
}

/** Drop warmed clips tied to a prior content/difficulty/age revision. */
export function invalidateLearningZoneAudioState(stateKey: string): void {
  invalidatedStateKeys.add(stateKey);
  for (const key of [...globalAudioCacheKeys()]) {
    if (key.includes(stateKey)) {
      deleteGlobalAudioCacheEntry(key);
      void deleteLocalCachedAudio(key);
    }
  }
}

async function warmTextBatch(
  authFetch: AuthFetchFn,
  ctx: LearningZonePrewarmContext,
  texts: string[],
  jobKey: string,
): Promise<void> {
  const mode = ctx.mode ?? (ctx.module === "phonics" ? "phonics" : "default");
  const unique = [...new Set(texts.map((t) => t.trim()).filter(Boolean))];

  pregenerateTtsTexts(authFetch, unique, mode);

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    if (invalidatedStateKeys.has(ctx.stateKey ?? "")) break;
    const batch = unique.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (text) => {
        const cacheKey = buildLearningZoneAudioCacheKey(ctx, text);
        const url = resolveAudioUrl(text, mode);
        if (!url) return;
        const localKey =
          mode === "phonics"
            ? cacheKey
            : localCacheKeyForPhrase(text, "default");
        await loadClipToMemory(cacheKey, url, localKey);
        if (lastFlowKey && lastFlowKey !== cacheKey) {
          recordPhraseTransition(lastFlowKey, cacheKey);
        }
      }),
    );
    if (i + BATCH_SIZE < unique.length) {
      await new Promise((r) => setTimeout(r, BATCH_GAP_MS));
    }
  }

  activeJobKeys.delete(jobKey);
}

/**
 * Schedule proactive TTS + memory/disk warm for current and predicted next clips.
 * Safe to call on every content/difficulty/age change — dedupes in-flight work.
 */
export function scheduleLearningZoneAudioPrewarm(
  authFetch: AuthFetchFn,
  ctx: LearningZonePrewarmContext,
): void {
  if (typeof window === "undefined") return;
  if (!ctx.texts.length && !ctx.sequenceTexts?.length) return;

  if (ctx.module === "phonics" && !phonicsLibraryDiskPrewarmStarted) {
    phonicsLibraryDiskPrewarmStarted = true;
    prefetchEntirePhonicsLibrary();
  }

  const stateKey = ctx.stateKey ?? buildLearningZoneAudioStateKey({
    module: ctx.module,
    difficulty: ctx.difficulty,
    ageGroup: ctx.ageGroup,
    locale: ctx.locale,
  });

  const prevState = lastStateKeyByModule.get(ctx.module);
  if (prevState && prevState !== stateKey) {
    invalidateLearningZoneAudioState(prevState);
  }
  lastStateKeyByModule.set(ctx.module, stateKey);
  invalidatedStateKeys.delete(stateKey);

  const mergedTexts = predictLikelyTexts({ ...ctx, stateKey });
  const jobKey = `${stateKey}:${mergedTexts.slice(0, 3).join("|")}`;
  if (activeJobKeys.has(jobKey)) return;
  activeJobKeys.add(jobKey);

  const firstKey = buildLearningZoneAudioCacheKey({ ...ctx, stateKey }, mergedTexts[0] ?? "");
  if (firstKey.endsWith(":")) {
    activeJobKeys.delete(jobKey);
    return;
  }
  lastFlowKey = firstKey;

  logAmyVoiceDiag("learning_zone_audio_prewarm", {
    module: ctx.module,
    stateKey,
    count: mergedTexts.length,
  });

  runIdle(() => {
    void warmTextBatch(authFetch, { ...ctx, stateKey }, mergedTexts, jobKey);
  });
}

/** Returns a pre-warmed HTMLAudioElement when ready — zero-lag playback path. */
export function getLearningZonePrewarmedAudio(
  ctx: LearningZonePrewarmContext,
  text: string,
): HTMLAudioElement | null {
  const cacheKey = buildLearningZoneAudioCacheKey(ctx, text);
  const audio = getGlobalAudioCacheEntry(cacheKey);
  if (!audio || audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return null;
  return audio;
}

/** Test-only reset */
export function _resetLearningZoneAudioPrewarmForTests(): void {
  activeJobKeys.clear();
  invalidatedStateKeys.clear();
  lastStateKeyByModule.clear();
  lastFlowKey = null;
  phonicsLibraryDiskPrewarmStarted = false;
}
