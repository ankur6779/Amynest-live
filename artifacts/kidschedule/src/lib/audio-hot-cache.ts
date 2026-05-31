/**
 * Track most-played clips and pin top N in global memory cache (Phase 11).
 */

import {
  pinGlobalAudioCacheKey,
  globalAudioCacheKeys,
} from "@/lib/global-audio-cache";

const TOP_N = 100;
const playCounts = new Map<string, number>();
let lastPinPassAt = 0;
const PIN_INTERVAL_MS = 60_000;

export function recordHotCachePlay(cacheKey: string): void {
  const key = (cacheKey ?? "").trim();
  if (!key) return;
  playCounts.set(key, (playCounts.get(key) ?? 0) + 1);
  maybePinTopClips();
}

function maybePinTopClips(): void {
  const now = Date.now();
  if (now - lastPinPassAt < PIN_INTERVAL_MS) return;
  lastPinPassAt = now;

  const ranked = [...playCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N);

  for (const [key] of ranked) {
    pinGlobalAudioCacheKey(key);
  }
}

export function getHotCacheStats(): {
  trackedClips: number;
  pinnedCount: number;
  topPlayed: Array<{ key: string; plays: number }>;
} {
  const ranked = [...playCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([key, plays]) => ({ key, plays }));

  let pinnedCount = 0;
  for (const key of globalAudioCacheKeys()) {
    if (playCounts.has(key)) pinnedCount += 1;
  }

  return {
    trackedClips: playCounts.size,
    pinnedCount,
    topPlayed: ranked,
  };
}

export function pinHotCacheKeys(keys: string[]): void {
  for (const key of keys) {
    if (key.trim()) pinGlobalAudioCacheKey(key.trim());
  }
}
