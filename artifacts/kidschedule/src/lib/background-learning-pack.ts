/**
 * Phase 7 — background Learning Pack download after onboarding.
 * Wi-Fi preferred. Version stamped COMPLETE only when every required asset
 * downloads and passes size checksum. Partial progress is resumable.
 */

import {
  ensureFilesystemCachedFromUrl,
  getFilesystemCachedAudioUrl,
  getStoredLearningPackVersion,
  setStoredLearningPackVersion,
  putFilesystemCachedAudio,
} from "@/lib/native-audio-filesystem-cache";
import { lookupStaticAudioUrl, ensureStaticAudioMapLoaded } from "@/lib/static-audio";
import { pinHotCacheKeys } from "@/lib/audio-hot-cache";
import { localCacheKeyForPhrase } from "@/lib/local-tts-cache";

/** Bump when core curriculum pack contents change. */
export const LEARNING_PACK_VERSION = "core-v2";

const PROGRESS_KEY = "amynest:fs-audio-pack-progress";
const MIN_ASSET_BYTES = 512;

export type LearningPackStatus = "idle" | "partial" | "complete" | "failed";

const FEEDBACK_PIN_PHRASES = [
  "try again",
  "great job!",
  "good job!",
  "well done",
  "nice try.",
  "that was excellent.",
  "listen carefully",
  "correct! well done!",
  "great work today!",
  "not quite — try again!",
] as const;

const CURRICULUM_SEED = [
  ..."abcdefghijklmnopqrstuvwxyz".split(""),
  "sh", "ch", "th", "ng",
  "cat", "dog", "sun", "hat", "bat", "pig", "cup", "bus", "bed", "pen",
  "sat", "pat", "fox", "mop", "top", "fin", "win", "lip", "zip", "kid", "lid",
  "hop", "pop", "jet",
  "red", "blue", "green", "yellow", "one", "two", "three", "four", "five",
  "circle", "square", "triangle", "apple", "ball", "book",
  "hello", "please", "sorry", "yes", "mom", "home", "look", "listen",
  ...FEEDBACK_PIN_PHRASES,
] as const;

let downloadPromise: Promise<{
  ok: number;
  fail: number;
  status: LearningPackStatus;
}> | null = null;

function prefersWifi(): boolean {
  if (typeof navigator === "undefined") return true;
  const conn = (navigator as Navigator & {
    connection?: { type?: string; effectiveType?: string; saveData?: boolean };
  }).connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  if (conn.type === "cellular") return false;
  if (conn.type === "wifi" || conn.type === "ethernet") return true;
  return conn.effectiveType !== "2g" && conn.effectiveType !== "slow-2g";
}

function runIdle(task: () => void): void {
  if (typeof window !== "undefined" && window.requestIdleCallback) {
    window.requestIdleCallback(task, { timeout: 4_000 });
    return;
  }
  if (typeof window !== "undefined") {
    window.setTimeout(task, 500);
    return;
  }
  task();
}

type ProgressState = {
  version: string;
  completedKeys: string[];
  failedKeys: string[];
  updatedAt: number;
};

function loadProgress(): ProgressState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProgressState;
    if (parsed.version !== LEARNING_PACK_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveProgress(state: ProgressState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {
    /* quota — leave incomplete */
  }
}

function clearProgress(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

function requiredSeed(): string[] {
  return [...new Set(CURRICULUM_SEED.map((p) => p.trim().toLowerCase()).filter(Boolean))];
}

export function getLearningPackStatus(): LearningPackStatus {
  if (getStoredLearningPackVersion() === LEARNING_PACK_VERSION) return "complete";
  const progress = loadProgress();
  if (!progress) return "idle";
  if (progress.failedKeys.length > 0 || progress.completedKeys.length > 0) return "partial";
  return "idle";
}

/**
 * Start background Learning Pack sync. No-op if already COMPLETE for current version
 * or on metered/slow networks (unless force).
 * COMPLETE only when every required asset succeeds.
 */
export function startBackgroundLearningPackDownload(opts?: {
  force?: boolean;
}): Promise<{ ok: number; fail: number; status: LearningPackStatus }> {
  if (typeof window === "undefined") {
    return Promise.resolve({ ok: 0, fail: 0, status: "idle" });
  }
  if (!opts?.force && getStoredLearningPackVersion() === LEARNING_PACK_VERSION) {
    return Promise.resolve({ ok: 0, fail: 0, status: "complete" });
  }
  if (!opts?.force && !prefersWifi()) {
    return Promise.resolve({
      ok: 0,
      fail: 0,
      status: getLearningPackStatus(),
    });
  }
  if (downloadPromise) return downloadPromise;

  downloadPromise = (async () => {
    await ensureStaticAudioMapLoaded();
    const seed = requiredSeed();
    const progress = loadProgress() ?? {
      version: LEARNING_PACK_VERSION,
      completedKeys: [],
      failedKeys: [],
      updatedAt: Date.now(),
    };
    const done = new Set(progress.completedKeys);
    let ok = done.size;
    let fail = 0;
    const pinKeys: string[] = [];
    const failedKeys: string[] = [];

    for (const phrase of seed) {
      const cacheKey = `fs:${localCacheKeyForPhrase(phrase, "default")}`;
      if (done.has(cacheKey)) {
        pinKeys.push(cacheKey);
        continue;
      }

      // Resume: already on disk from prior partial run
      const existing = await getFilesystemCachedAudioUrl(cacheKey);
      if (existing) {
        URL.revokeObjectURL(existing);
        done.add(cacheKey);
        ok += 1;
        pinKeys.push(cacheKey);
        continue;
      }

      const url = lookupStaticAudioUrl(phrase, "default");
      if (!url) {
        fail += 1;
        failedKeys.push(phrase);
        continue;
      }

      const objectUrl = await ensureFilesystemCachedFromUrl(
        cacheKey,
        url,
        LEARNING_PACK_VERSION,
      );
      if (objectUrl) {
        // Size checksum — reject tiny/placeholder blobs
        try {
          const res = await fetch(objectUrl);
          const blob = await res.blob();
          URL.revokeObjectURL(objectUrl);
          if (blob.size < MIN_ASSET_BYTES) {
            fail += 1;
            failedKeys.push(phrase);
            continue;
          }
          await putFilesystemCachedAudio(cacheKey, blob, LEARNING_PACK_VERSION);
        } catch {
          URL.revokeObjectURL(objectUrl);
        }
        done.add(cacheKey);
        ok += 1;
        pinKeys.push(cacheKey);
      } else {
        fail += 1;
        failedKeys.push(phrase);
      }

      saveProgress({
        version: LEARNING_PACK_VERSION,
        completedKeys: [...done],
        failedKeys,
        updatedAt: Date.now(),
      });

      await new Promise((r) => setTimeout(r, 30));
    }

    pinHotCacheKeys(pinKeys.slice(0, 40));

    const requiredWithUrl = seed.filter((p) => lookupStaticAudioUrl(p, "default"));
    const allRequiredOk =
      failedKeys.length === 0 &&
      requiredWithUrl.every((p) => done.has(`fs:${localCacheKeyForPhrase(p, "default")}`));

    if (allRequiredOk && requiredWithUrl.length > 0) {
      setStoredLearningPackVersion(LEARNING_PACK_VERSION);
      clearProgress();
      return { ok, fail: 0, status: "complete" as const };
    }

    saveProgress({
      version: LEARNING_PACK_VERSION,
      completedKeys: [...done],
      failedKeys,
      updatedAt: Date.now(),
    });
    return { ok, fail, status: "partial" as const };
  })().finally(() => {
    downloadPromise = null;
  });

  return downloadPromise;
}

/** Schedule after first gesture / onboarding complete. */
export function scheduleBackgroundLearningPackOnIdle(): void {
  if (typeof window === "undefined") return;
  if (getStoredLearningPackVersion() === LEARNING_PACK_VERSION) return;
  runIdle(() => {
    void startBackgroundLearningPackDownload();
  });
}

export function isLearningPackCurrent(): boolean {
  return getStoredLearningPackVersion() === LEARNING_PACK_VERSION;
}

/** Test helper */
export function _resetLearningPackStateForTests(): void {
  clearProgress();
  downloadPromise = null;
}
