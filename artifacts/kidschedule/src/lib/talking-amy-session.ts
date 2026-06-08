/**
 * Device-local Talking Amy session prefs + fun counters — no audio blobs stored.
 */

import {
  TALKING_AMY_DEFAULT_MODE,
  TALKING_AMY_REGULAR_MODES,
  type TalkingAmyModeId,
  type TalkingAmyRegularModeId,
} from "@/lib/talking-amy-modes";

const FAVORITE_MODE_KEY = "talking_amy_favorite_mode_v1";
const STATS_KEY_PREFIX = "talking_amy_stats_v1_";

export type TalkingAmyLocalStats = {
  repeatCount: number;
  replayCount: number;
  sessionCount: number;
};

const EMPTY_STATS: TalkingAmyLocalStats = {
  repeatCount: 0,
  replayCount: 0,
  sessionCount: 0,
};

function isModeId(value: string): value is TalkingAmyRegularModeId {
  return TALKING_AMY_REGULAR_MODES.some((m) => m.id === value);
}

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadFavoriteTalkingAmyMode(): TalkingAmyRegularModeId | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(FAVORITE_MODE_KEY);
  if (!raw || !isModeId(raw)) return null;
  return raw;
}

export function saveFavoriteTalkingAmyMode(modeId: TalkingAmyRegularModeId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITE_MODE_KEY, modeId);
}

export function loadTalkingAmyStats(childId: number): TalkingAmyLocalStats {
  if (typeof window === "undefined") return { ...EMPTY_STATS };
  const key = `${STATS_KEY_PREFIX}${childId}`;
  const parsed = readJson<Partial<TalkingAmyLocalStats>>(
    window.localStorage.getItem(key),
    EMPTY_STATS,
  );
  return {
    repeatCount: Math.max(0, Number(parsed.repeatCount) || 0),
    replayCount: Math.max(0, Number(parsed.replayCount) || 0),
    sessionCount: Math.max(0, Number(parsed.sessionCount) || 0),
  };
}

function writeTalkingAmyStats(childId: number, stats: TalkingAmyLocalStats): TalkingAmyLocalStats {
  if (typeof window === "undefined") return stats;
  const key = `${STATS_KEY_PREFIX}${childId}`;
  window.localStorage.setItem(key, JSON.stringify(stats));
  return stats;
}

export function recordTalkingAmySessionStart(childId: number): TalkingAmyLocalStats {
  const stats = loadTalkingAmyStats(childId);
  return writeTalkingAmyStats(childId, {
    ...stats,
    sessionCount: stats.sessionCount + 1,
  });
}

export function recordTalkingAmyRepeat(childId: number): TalkingAmyLocalStats {
  const stats = loadTalkingAmyStats(childId);
  return writeTalkingAmyStats(childId, {
    ...stats,
    repeatCount: stats.repeatCount + 1,
  });
}

export function recordTalkingAmyReplay(childId: number): TalkingAmyLocalStats {
  const stats = loadTalkingAmyStats(childId);
  return writeTalkingAmyStats(childId, {
    ...stats,
    replayCount: stats.replayCount + 1,
  });
}

export function resolveInitialTalkingAmyMode(): TalkingAmyRegularModeId {
  return loadFavoriteTalkingAmyMode() ?? TALKING_AMY_DEFAULT_MODE;
}

export function pickSurpriseTalkingAmyMode(current?: TalkingAmyRegularModeId): TalkingAmyRegularModeId {
  const pool = TALKING_AMY_REGULAR_MODES.map((m) => m.id) as TalkingAmyRegularModeId[];
  if (pool.length <= 1) return pool[0] ?? TALKING_AMY_DEFAULT_MODE;
  const others = current ? pool.filter((id) => id !== current) : pool;
  const pickFrom = others.length > 0 ? others : pool;
  return (pickFrom[Math.floor(Math.random() * pickFrom.length)] ??
    TALKING_AMY_DEFAULT_MODE) as TalkingAmyRegularModeId;
}

export function randomCelebrateDurationMs(): number {
  return 600 + Math.floor(Math.random() * 601);
}
