/**
 * Amy Collection — device-local discovery of voice + secret variants.
 */

import {
  TALKING_AMY_COLLECTIBLE_IDS,
  TALKING_AMY_DEFAULT_MODE,
  TALKING_AMY_REGULAR_MODES,
  TALKING_AMY_SECRET_MODE_IDS,
  type TalkingAmyModeId,
  type TalkingAmyRegularModeId,
  type TalkingAmySecretModeId,
} from "@/lib/talking-amy-modes";

const COLLECTION_KEY_PREFIX = "talking_amy_collection_v1_";

export const TALKING_AMY_COLLECTION_TOTAL = TALKING_AMY_COLLECTIBLE_IDS.length;

export type TalkingAmyCollection = {
  discoveredModeIds: TalkingAmyModeId[];
  modeUseCounts: Partial<Record<TalkingAmyModeId, number>>;
  totalRepeats: number;
};

const EMPTY: TalkingAmyCollection = {
  discoveredModeIds: [TALKING_AMY_DEFAULT_MODE],
  modeUseCounts: {},
  totalRepeats: 0,
};

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isCollectibleId(value: string): value is TalkingAmyModeId {
  return (TALKING_AMY_COLLECTIBLE_IDS as readonly string[]).includes(value);
}

export function loadTalkingAmyCollection(childId: number): TalkingAmyCollection {
  if (typeof window === "undefined") return { ...EMPTY, discoveredModeIds: [...EMPTY.discoveredModeIds] };
  const key = `${COLLECTION_KEY_PREFIX}${childId}`;
  const parsed = readJson<Partial<TalkingAmyCollection>>(window.localStorage.getItem(key), EMPTY);
  const discovered = Array.isArray(parsed.discoveredModeIds)
    ? parsed.discoveredModeIds.filter(isCollectibleId)
    : [...EMPTY.discoveredModeIds];
  if (!discovered.includes(TALKING_AMY_DEFAULT_MODE)) {
    discovered.unshift(TALKING_AMY_DEFAULT_MODE);
  }
  const modeUseCounts = parsed.modeUseCounts ?? {};
  return {
    discoveredModeIds: [...new Set(discovered)],
    modeUseCounts,
    totalRepeats: Math.max(0, Number(parsed.totalRepeats) || 0),
  };
}

function writeCollection(childId: number, collection: TalkingAmyCollection): TalkingAmyCollection {
  if (typeof window === "undefined") return collection;
  const key = `${COLLECTION_KEY_PREFIX}${childId}`;
  window.localStorage.setItem(key, JSON.stringify(collection));
  return collection;
}

export function recordTalkingAmyCollectionUse(
  childId: number,
  modeId: TalkingAmyModeId,
  opts?: { isReplay?: boolean; dailyFeaturedBonus?: boolean },
): TalkingAmyCollection {
  const current = loadTalkingAmyCollection(childId);
  const discovered = new Set(current.discoveredModeIds);
  discovered.add(modeId);

  const prevCount = current.modeUseCounts[modeId] ?? 0;
  const bonus = opts?.dailyFeaturedBonus ? 1 : 0;
  const increment = opts?.isReplay ? 0 : 1 + bonus;

  const useIncrement = opts?.isReplay ? 0 : 1 + bonus;
  const next: TalkingAmyCollection = {
    discoveredModeIds: [...discovered],
    modeUseCounts: {
      ...current.modeUseCounts,
      [modeId]: prevCount + useIncrement,
    },
    totalRepeats: current.totalRepeats + increment,
  };
  return writeCollection(childId, next);
}

export function discoverTalkingAmyMode(
  childId: number,
  modeId: TalkingAmyModeId,
): TalkingAmyCollection {
  const current = loadTalkingAmyCollection(childId);
  const discovered = new Set(current.discoveredModeIds);
  const wasNew = !discovered.has(modeId);
  discovered.add(modeId);
  if (!wasNew) return current;
  return writeCollection(childId, { ...current, discoveredModeIds: [...discovered] });
}

export function getCollectionProgress(collection: TalkingAmyCollection): {
  unlocked: number;
  total: number;
  regularUnlocked: number;
  regularTotal: number;
  secretUnlocked: number;
  secretTotal: number;
} {
  const discovered = new Set(collection.discoveredModeIds);
  const regularTotal = TALKING_AMY_REGULAR_MODES.length;
  const secretTotal = TALKING_AMY_SECRET_MODE_IDS.length;
  const regularUnlocked = TALKING_AMY_REGULAR_MODES.filter((m) => discovered.has(m.id)).length;
  const secretUnlocked = TALKING_AMY_SECRET_MODE_IDS.filter((id) => discovered.has(id)).length;
  return {
    unlocked: regularUnlocked + secretUnlocked,
    total: TALKING_AMY_COLLECTION_TOTAL,
    regularUnlocked,
    regularTotal,
    secretUnlocked,
    secretTotal,
  };
}

export function getModeUseCount(
  collection: TalkingAmyCollection,
  modeId: TalkingAmyModeId,
): number {
  return collection.modeUseCounts[modeId] ?? 0;
}

export function hasDiscoveredSecret(
  collection: TalkingAmyCollection,
  secretId: TalkingAmySecretModeId,
): boolean {
  return collection.discoveredModeIds.includes(secretId);
}

export function hasDiscoveredAllSecrets(collection: TalkingAmyCollection): boolean {
  return TALKING_AMY_SECRET_MODE_IDS.every((id) => collection.discoveredModeIds.includes(id));
}

export function isRegularModeId(id: TalkingAmyModeId): id is TalkingAmyRegularModeId {
  return TALKING_AMY_REGULAR_MODES.some((m) => m.id === id);
}
