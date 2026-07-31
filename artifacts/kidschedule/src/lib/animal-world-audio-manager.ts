/**
 * Animal World audio manager — instant pre-cached playback for toddler taps.
 * Wraps the global AudioManager speech channel (no raw Audio() in feature code).
 */

import { audioManager } from "@/lib/audio-manager";
import {
  deepPreloadWorldLibraryUrls,
  prepareWorldLibraryPlayback,
  primeWorldLibrarySoundUrl,
  resolveWorldLibraryPlaybackUrl,
  scheduleWorldLibraryDeepPreload,
} from "@/lib/world-library-audio-prewarm";

export type AnimalAudioPlayMeta = {
  animalId: string;
  soundId: string;
  label?: string;
};

const POOL_MAX = 24;
const TAP_DEBOUNCE_MS = 60;

type PoolEntry = {
  url: string;
  warmedAt: number;
};

let ownershipToken = 0;
let muted = false;
let lastPlayAt = 0;
let lastPlayKey = "";
const preloadPool = new Map<string, PoolEntry>();

function poolKey(url: string): string {
  return resolveWorldLibraryPlaybackUrl(url);
}

export class AnimalAudioManager {
  /** Prime decoder in a user gesture — call on first tap in the module. */
  unlockFromGesture(): void {
    void prepareWorldLibraryPlayback();
  }

  isMuted(): boolean {
    return muted;
  }

  setMuted(next: boolean): void {
    muted = next;
    if (next) {
      this.stop();
    }
  }

  /**
   * Smart preload: current + neighbors + game sounds.
   * Target <50ms playback when URLs are in AudioManager cache.
   */
  preloadSmart(bundle: {
    current?: string[];
    adjacent?: string[];
    quiz?: string[];
    discovery?: string[];
  }): void {
    const merged = [
      ...(bundle.current ?? []),
      ...(bundle.adjacent ?? []),
      ...(bundle.quiz ?? []),
      ...(bundle.discovery ?? []),
    ];
    this.preload(merged);
  }

  /** Warm URLs into AudioManager cache without audible playback. */
  preload(urls: string[]): void {
    const unique = [...new Set(urls.map(resolveWorldLibraryPlaybackUrl))].slice(0, POOL_MAX * 2);
    for (const url of unique) {
      const key = poolKey(url);
      if (preloadPool.has(key)) continue;
      preloadPool.set(key, { url, warmedAt: Date.now() });
      audioManager.getCached(url, { forceReload: false });
      primeWorldLibrarySoundUrl(url);
    }
    scheduleWorldLibraryDeepPreload(unique, POOL_MAX * 2);
    this.trimPool();
  }

  /** Await decode for the next likely taps (detail view / quiz). */
  async preloadReady(urls: string[], max = 8): Promise<void> {
    await deepPreloadWorldLibraryUrls(urls, max);
  }

  /** Release pooled references — call when leaving the module. */
  release(): void {
    ownershipToken += 1;
    this.stop();
    preloadPool.clear();
  }

  async play(url: string, meta: AnimalAudioPlayMeta): Promise<boolean> {
    if (muted) return false;

    const resolved = resolveWorldLibraryPlaybackUrl(url);
    const playKey = `${meta.animalId}:${meta.soundId}`;
    const now = Date.now();
    if (playKey === lastPlayKey && now - lastPlayAt < TAP_DEBOUNCE_MS) {
      return true;
    }

    await prepareWorldLibraryPlayback();
    ownershipToken += 1;
    const token = ownershipToken;
    lastPlayKey = playKey;
    lastPlayAt = now;

    audioManager.stopAll();
    preloadPool.set(resolved, { url: resolved, warmedAt: now });
    const audio = audioManager.getCached(resolved, { forceReload: false });
    primeWorldLibrarySoundUrl(resolved);

    const { emitPrimarySoundEnd, emitPrimarySoundStart } = await import(
      "@/lib/sound-world-living-environment"
    );
    emitPrimarySoundStart();
    try {
      const ok = await audioManager.play(
        audio,
        {
          proxyUrl: resolved,
          source: "animal_world",
          phrase: meta.label ?? `${meta.animalId}:${meta.soundId}`,
          interrupt: true,
          srcType: "static",
          channel: "speech",
        },
        { channel: "speech", interrupt: true, maxRetries: 1 },
      );

      if (token !== ownershipToken) return false;
      if (!ok) {
        console.warn("[AnimalAudioManager] play failed", meta);
      }
      return ok;
    } finally {
      emitPrimarySoundEnd();
    }
  }

  pause(): void {
    audioManager.stopAll();
  }

  stop(): void {
    ownershipToken += 1;
    audioManager.stopAll();
  }

  private trimPool(): void {
    if (preloadPool.size <= POOL_MAX) return;
    const sorted = [...preloadPool.entries()].sort((a, b) => a[1].warmedAt - b[1].warmedAt);
    while (preloadPool.size > POOL_MAX) {
      const [key] = sorted.shift() ?? [];
      if (key) preloadPool.delete(key);
    }
  }
}

export const animalAudioManager = new AnimalAudioManager();
