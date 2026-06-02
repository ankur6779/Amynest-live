import type { WorldId } from "@workspace/world-engine";

const STATS_PREFIX = "amynest:discovery-worlds:stats:v1";

export type DiscoveryWorldSessionStats = {
  childId: number;
  worldId: WorldId;
  playCounts: Record<string, number>;
  soundCounts: Record<string, number>;
  sessionStartedAt: number;
};

function statsKey(worldId: WorldId, childId: number): string {
  return `${STATS_PREFIX}:${worldId}:${childId}`;
}

function defaultStats(worldId: WorldId, childId: number): DiscoveryWorldSessionStats {
  return {
    childId,
    worldId,
    playCounts: {},
    soundCounts: {},
    sessionStartedAt: Date.now(),
  };
}

export function loadDiscoveryWorldStats(
  worldId: WorldId,
  childId: number,
): DiscoveryWorldSessionStats {
  if (typeof window === "undefined") return defaultStats(worldId, childId);
  try {
    const raw = localStorage.getItem(statsKey(worldId, childId));
    if (!raw) return defaultStats(worldId, childId);
    return { ...defaultStats(worldId, childId), ...JSON.parse(raw) };
  } catch {
    return defaultStats(worldId, childId);
  }
}

export function saveDiscoveryWorldStats(stats: DiscoveryWorldSessionStats): void {
  try {
    localStorage.setItem(
      statsKey(stats.worldId, stats.childId),
      JSON.stringify(stats),
    );
  } catch {
    /* quota */
  }
}

export function recordDiscoveryItemPlayed(
  worldId: WorldId,
  childId: number,
  itemId: string,
): DiscoveryWorldSessionStats {
  const stats = loadDiscoveryWorldStats(worldId, childId);
  stats.playCounts[itemId] = (stats.playCounts[itemId] ?? 0) + 1;
  saveDiscoveryWorldStats(stats);
  return stats;
}

export function recordDiscoverySoundPlayed(
  worldId: WorldId,
  childId: number,
  itemId: string,
  soundId: string,
): DiscoveryWorldSessionStats {
  const stats = loadDiscoveryWorldStats(worldId, childId);
  const key = `${itemId}:${soundId}`;
  stats.soundCounts[key] = (stats.soundCounts[key] ?? 0) + 1;
  stats.playCounts[itemId] = (stats.playCounts[itemId] ?? 0) + 1;
  saveDiscoveryWorldStats(stats);
  return stats;
}

export function openedItemIds(worldId: WorldId, childId: number): Set<string> {
  const stats = loadDiscoveryWorldStats(worldId, childId);
  return new Set(Object.keys(stats.playCounts));
}

const DAILY_KEY_PREFIX = "amynest:discovery-worlds:daily:v1";

export function dailyAdventureStorageKey(worldId: WorldId, childId: number): string {
  return `${DAILY_KEY_PREFIX}:${worldId}:${childId}`;
}
