/**
 * Discovery worlds audio — same playback contract as AnimalAudioManager (GCS proxy, no TTS).
 */
import {
  WORLDS_LIBRARY_LOCAL_MIRROR_WEB_PREFIX,
  worldsLibraryPlaybackCandidates,
} from "@workspace/world-engine";
import { audioManager } from "@/lib/audio-manager";
import {
  deepPreloadWorldLibraryUrls,
  prepareWorldLibraryPlayback,
  primeWorldLibrarySoundUrl,
  resolveWorldLibraryPlaybackUrl,
  scheduleWorldLibraryDeepPreload,
} from "@/lib/world-library-audio-prewarm";

export type DiscoveryWorldPlayMeta = {
  worldId: string;
  itemId: string;
  soundId: string;
  label?: string;
};

const POOL_MAX = 24;
const TAP_DEBOUNCE_MS = 60;

let ownershipToken = 0;
let muted = false;
let lastPlayAt = 0;
let lastPlayKey = "";
const preloadPool = new Map<string, { url: string; warmedAt: number }>();
const inFlightPlay = new Map<string, Promise<boolean>>();

/** Resolve playback URL — API proxy vs same-origin local mirror. */
function resolvePlaybackCandidates(url: string): string[] {
  const u = (url ?? "").trim();
  if (!u) return [];
  if (u.startsWith("http://") || u.startsWith("https://")) return [u];
  if (u.startsWith(`${WORLDS_LIBRARY_LOCAL_MIRROR_WEB_PREFIX}/`)) {
    return worldsLibraryPlaybackCandidates(u).map(resolveWorldLibraryPlaybackUrl);
  }
  return worldsLibraryPlaybackCandidates(u).map(resolveWorldLibraryPlaybackUrl);
}

export class DiscoveryWorldAudioManager {
  unlockFromGesture(): void {
    void prepareWorldLibraryPlayback();
  }

  setMuted(next: boolean): void {
    muted = next;
    if (next) this.stop();
  }

  preloadSmart(bundle: {
    current?: string[];
    adjacent?: string[];
    quiz?: string[];
  }): void {
    this.preload([
      ...(bundle.current ?? []),
      ...(bundle.adjacent ?? []),
      ...(bundle.quiz ?? []),
    ]);
  }

  preload(urls: string[]): void {
    const unique = [
      ...new Set(
        urls
          .flatMap((url) => resolvePlaybackCandidates(url))
          .filter((u) => /\.(mp3|m4a|wav|ogg|aac)(\?|$)/i.test(u) || u.includes("/api/worlds-library/")),
      ),
    ].slice(0, POOL_MAX * 2);

    for (const url of unique) {
      if (preloadPool.has(url)) continue;
      preloadPool.set(url, { url, warmedAt: Date.now() });
      audioManager.getCached(url, { forceReload: false });
      primeWorldLibrarySoundUrl(url);
    }
    scheduleWorldLibraryDeepPreload(unique, POOL_MAX * 2);
  }

  async preloadReady(urls: string[], max = 8): Promise<void> {
    const resolved = urls.flatMap((url) => resolvePlaybackCandidates(url));
    await deepPreloadWorldLibraryUrls(resolved, max);
  }

  release(): void {
    ownershipToken += 1;
    this.stop();
    preloadPool.clear();
  }

  async play(url: string, meta: DiscoveryWorldPlayMeta): Promise<boolean> {
    if (muted) return false;

    const candidates = resolvePlaybackCandidates(url);
    const playKey = `${meta.worldId}:${meta.itemId}:${meta.soundId}:${candidates[0] ?? url}`;
    const now = Date.now();
    if (playKey === lastPlayKey && now - lastPlayAt < TAP_DEBOUNCE_MS) {
      const pending = inFlightPlay.get(playKey);
      return pending ?? true;
    }

    const pending = inFlightPlay.get(playKey);
    if (pending) return pending;

    await prepareWorldLibraryPlayback();
    ownershipToken += 1;
    const token = ownershipToken;
    lastPlayKey = playKey;
    lastPlayAt = now;

    const run = (async () => {
      audioManager.stopAll();
      for (const resolved of candidates) {
        if (!resolved) continue;
        preloadPool.set(resolved, { url: resolved, warmedAt: now });
        const audio = audioManager.getCached(resolved, { forceReload: false });
        primeWorldLibrarySoundUrl(resolved);
        const ok = await audioManager.play(
          audio,
          {
            proxyUrl: resolved,
            source: "discovery_world",
            phrase: meta.label ?? `${meta.itemId}:${meta.soundId}`,
            interrupt: true,
            srcType: "static",
            channel: "speech",
          },
          { channel: "speech", interrupt: true, maxRetries: 1 },
        );
        if (token !== ownershipToken) return false;
        if (ok) return true;
      }
      console.warn("[DiscoveryWorldAudioManager] play failed", meta, { tried: candidates.length });
      return false;
    })();

    inFlightPlay.set(playKey, run);
    try {
      return await run;
    } finally {
      inFlightPlay.delete(playKey);
    }
  }

  stop(): void {
    ownershipToken += 1;
    audioManager.stopAll();
  }
}

export const discoveryWorldAudioManager = new DiscoveryWorldAudioManager();
