import type { AnimalWorldSessionStats } from "@workspace/animal-world";
import { applyPlayStreak, todayDateKey } from "@workspace/world-engine";

const STATS_KEY = "amynest:animal-world:stats:v1";
const FAVORITES_KEY = "amynest:animal-world:favorites:v1";

type StoredStats = Record<string, Omit<AnimalWorldSessionStats, "childId">>;

function readStore(): StoredStats {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) ?? "{}") as StoredStats;
  } catch {
    return {};
  }
}

function writeStore(store: StoredStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

function childKey(childId: number): string {
  return String(childId);
}

function defaultStats(): Omit<AnimalWorldSessionStats, "childId"> {
  return {
    playCounts: {},
    soundCounts: {},
    favorites: [],
    streakDays: 0,
    lastPlayedDate: null,
    sessionStartedAt: Date.now(),
    totalSessionMs: 0,
  };
}

export function loadAnimalWorldStats(childId: number): AnimalWorldSessionStats {
  const store = readStore();
  const raw = store[childKey(childId)] ?? defaultStats();
  return { childId, ...raw };
}

export function saveAnimalWorldStats(stats: AnimalWorldSessionStats): void {
  const store = readStore();
  const { childId, ...rest } = stats;
  store[childKey(childId)] = rest;
  writeStore(store);
}

export function recordAnimalOpened(childId: number, animalId: string): AnimalWorldSessionStats {
  const stats = loadAnimalWorldStats(childId);
  stats.playCounts[animalId] = (stats.playCounts[animalId] ?? 0) + 1;
  const streaked = applyPlayStreak(
    {
      streakDays: stats.streakDays,
      lastPlayedDate: stats.lastPlayedDate,
    },
    todayDateKey(),
  );
  stats.streakDays = streaked.streakDays;
  stats.lastPlayedDate = streaked.lastPlayedDate;
  saveAnimalWorldStats(stats);
  return stats;
}

export function recordSoundPlayed(
  childId: number,
  animalId: string,
  soundId: string,
): AnimalWorldSessionStats {
  const stats = loadAnimalWorldStats(childId);
  const key = `${animalId}:${soundId}`;
  stats.soundCounts[key] = (stats.soundCounts[key] ?? 0) + 1;
  saveAnimalWorldStats(stats);
  return stats;
}

export function toggleFavorite(childId: number, animalId: string): {
  stats: AnimalWorldSessionStats;
  added: boolean;
} {
  const stats = loadAnimalWorldStats(childId);
  const set = new Set(stats.favorites);
  let added = false;
  if (set.has(animalId)) {
    set.delete(animalId);
  } else {
    set.add(animalId);
    added = true;
  }
  stats.favorites = [...set];
  saveAnimalWorldStats(stats);
  return { stats, added };
}

export function isFavorite(childId: number, animalId: string): boolean {
  return loadAnimalWorldStats(childId).favorites.includes(animalId);
}

export function appendSessionDuration(childId: number, ms: number): void {
  const stats = loadAnimalWorldStats(childId);
  stats.totalSessionMs += ms;
  saveAnimalWorldStats(stats);
}

export function getMostPlayedAnimalIds(
  childId: number,
  limit = 5,
): Array<{ animalId: string; count: number }> {
  const stats = loadAnimalWorldStats(childId);
  return Object.entries(stats.playCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([animalId, count]) => ({ animalId, count }));
}

export function loadLegacyFavorites(childId: number): string[] {
  try {
    const raw = localStorage.getItem(`${FAVORITES_KEY}:${childId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
