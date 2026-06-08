/**
 * Local persistence for infant sleep library — favorites, recently played, downloaded packs.
 */

import type { SleepPackId } from "@/data/infant-sleep-catalog";

const STORAGE_KEY_PREFIX = "amynest.infantSleepLibrary";

export type RecentPlayEntry = {
  id: string;
  playedAt: string;
  durationSec?: number;
};

export type InfantSleepLibraryState = {
  favorites: string[];
  recentlyPlayed: RecentPlayEntry[];
  downloadedPacks: SleepPackId[];
  preferences: {
    defaultLoop: boolean;
    defaultTimerMin: number | null;
    continuousMode: boolean;
    continuousNoiseId: string;
    lastCategory: string;
  };
};

const DEFAULT_STATE: InfantSleepLibraryState = {
  favorites: [],
  recentlyPlayed: [],
  downloadedPacks: ["core-v1"],
  preferences: {
    defaultLoop: true,
    defaultTimerMin: null,
    continuousMode: false,
    continuousNoiseId: "wn-pink",
    lastCategory: "white_noise",
  },
};

function storageKey(childId: string | undefined): string {
  return `${STORAGE_KEY_PREFIX}.${childId ?? "default"}`;
}

function readRaw(childId?: string): InfantSleepLibraryState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey(childId));
    if (!raw) return { ...DEFAULT_STATE, downloadedPacks: ["core-v1"] };
    const parsed = JSON.parse(raw) as Partial<InfantSleepLibraryState>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recentlyPlayed: Array.isArray(parsed.recentlyPlayed) ? parsed.recentlyPlayed : [],
      downloadedPacks: Array.isArray(parsed.downloadedPacks)
        ? (parsed.downloadedPacks as SleepPackId[])
        : ["core-v1"],
      preferences: {
        ...DEFAULT_STATE.preferences,
        ...(parsed.preferences ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_STATE, downloadedPacks: ["core-v1"] };
  }
}

function writeRaw(state: InfantSleepLibraryState, childId?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(childId), JSON.stringify(state));
  } catch {
    /* quota or private mode */
  }
}

export function loadInfantSleepLibraryState(childId?: string): InfantSleepLibraryState {
  return readRaw(childId);
}

export function saveInfantSleepLibraryState(
  state: InfantSleepLibraryState,
  childId?: string,
): void {
  writeRaw(state, childId);
}

export function toggleSleepFavorite(id: string, childId?: string): boolean {
  const state = readRaw(childId);
  const has = state.favorites.includes(id);
  state.favorites = has
    ? state.favorites.filter((x) => x !== id)
    : [...state.favorites, id];
  writeRaw(state, childId);
  return !has;
}

export function isSleepFavorite(id: string, childId?: string): boolean {
  return readRaw(childId).favorites.includes(id);
}

export function recordSleepPlay(id: string, childId?: string, durationSec?: number): void {
  const state = readRaw(childId);
  const entry: RecentPlayEntry = {
    id,
    playedAt: new Date().toISOString(),
    durationSec,
  };
  state.recentlyPlayed = [
    entry,
    ...state.recentlyPlayed.filter((r) => r.id !== id),
  ].slice(0, 10);
  writeRaw(state, childId);
}

export function getRecentSleepIds(childId?: string, limit = 5): string[] {
  return readRaw(childId)
    .recentlyPlayed.slice(0, limit)
    .map((r) => r.id);
}

export function isSleepPackDownloaded(packId: SleepPackId, childId?: string): boolean {
  const state = readRaw(childId);
  if (SLEEP_PACK_BUNDLED.has(packId)) return true;
  return state.downloadedPacks.includes(packId);
}

/** Packs shipped under `public/infant-sleep-audio/` — playable without OTA download. */
const SLEEP_PACK_BUNDLED = new Set<SleepPackId>(["core-v1", "extended-v1"]);

export function markSleepPackDownloaded(packId: SleepPackId, childId?: string): void {
  const state = readRaw(childId);
  if (!state.downloadedPacks.includes(packId)) {
    state.downloadedPacks = [...state.downloadedPacks, packId];
    writeRaw(state, childId);
  }
}

export function setSleepPreference<K extends keyof InfantSleepLibraryState["preferences"]>(
  key: K,
  value: InfantSleepLibraryState["preferences"][K],
  childId?: string,
): void {
  const state = readRaw(childId);
  state.preferences = { ...state.preferences, [key]: value };
  writeRaw(state, childId);
}

export function getSleepPreferences(childId?: string): InfantSleepLibraryState["preferences"] {
  return readRaw(childId).preferences;
}
