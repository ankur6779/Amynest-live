/**
 * Discovery worlds audio — same playback contract as AnimalAudioManager (GCS proxy, no TTS).
 */
import { resolveApiMediaUrl } from "@/lib/api";
import { audioManager } from "@/lib/audio-manager";
import { recordTtsUserGesture } from "@/lib/tts-guard";

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

function proxyUrl(url: string): string {
  return resolveApiMediaUrl(url);
}

export class DiscoveryWorldAudioManager {
  unlockFromGesture(): void {
    recordTtsUserGesture();
    audioManager.unlockFromUserGesture();
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
    const unique = [...new Set(urls.map(proxyUrl))].slice(0, POOL_MAX * 2);
    for (const url of unique) {
      if (preloadPool.has(url)) continue;
      preloadPool.set(url, { url, warmedAt: Date.now() });
      audioManager.getCached(url, { forceReload: false });
      audioManager.primeSpeechUrlInUserGesture(url);
    }
  }

  release(): void {
    ownershipToken += 1;
    this.stop();
    preloadPool.clear();
  }

  async play(url: string, meta: DiscoveryWorldPlayMeta): Promise<boolean> {
    if (muted) return false;
    const resolved = proxyUrl(url);
    const playKey = `${meta.worldId}:${meta.itemId}:${meta.soundId}:${resolved}`;
    const now = Date.now();
    if (playKey === lastPlayKey && now - lastPlayAt < TAP_DEBOUNCE_MS) {
      const pending = inFlightPlay.get(playKey);
      return pending ?? true;
    }

    const pending = inFlightPlay.get(playKey);
    if (pending) return pending;

    this.unlockFromGesture();
    ownershipToken += 1;
    const token = ownershipToken;
    lastPlayKey = playKey;
    lastPlayAt = now;

    const run = (async () => {
      audioManager.stopAll();
      preloadPool.set(resolved, { url: resolved, warmedAt: now });
      audioManager.getCached(resolved, { forceReload: false });
      const ok = await audioManager.playUrl(resolved, {
        source: "discovery_world",
        phrase: meta.label ?? `${meta.itemId}:${meta.soundId}`,
        interrupt: true,
      });
      return token === ownershipToken && ok;
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
