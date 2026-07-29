import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import {
  unlockGame,
  isGameUnlockedForPlay,
  canPlayGame,
  dailyLimit,
  dailyLimitReached,
  ensureStarterUnlocks,
  GAMES,
  getPerfectStreak,
  recordPerfectStreak,
  hasPerfectComboBadge,
  getWeeklyLeaderboard,
  PERFECT_COMBO_BADGE_AT,
  recordLeaderboardEntry,
  getPlayLog,
  gamesPlayedToday,
  getWeeklyGameSummary,
} from "./games";
import { getContinuePlayingGames } from "./game-hub-meta";
import { cacheRoutineStreak, STREAK_UNLOCK_DAYS } from "./routine-streak-cache";

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  };
  vi.stubGlobal("localStorage", mock);
}

beforeAll(() => {
  installLocalStorageMock();
});

beforeEach(() => {
  localStorage.clear();
});

describe("games unlock policy", () => {
  it("free starters are playable without spending points", () => {
    ensureStarterUnlocks();
    expect(isGameUnlockedForPlay("pattern-match", false)).toBe(true);
    expect(isGameUnlockedForPlay("what-should-you-do", false)).toBe(true);
    expect(canPlayGame(GAMES.find((g) => g.id === "pattern-match")!, false)).toBe(true);
  });

  it("premium-only games block free users", () => {
    const hidden = GAMES.find((g) => g.id === "hidden-objects")!;
    expect(canPlayGame(hidden, false)).toBe(false);
    expect(canPlayGame(hidden, true)).toBe(true);
  });

  it("free users cannot unlock non-starter games with streak or points", () => {
    cacheRoutineStreak(STREAK_UNLOCK_DAYS);
    const r = unlockGame("odd-one-out", { isPremium: false });
    expect(r.ok).toBe(false);
    expect(canPlayGame(GAMES.find((g) => g.id === "odd-one-out")!, false)).toBe(false);
  });

  it("premium users skip point cost", () => {
    const r = unlockGame("speed-math", { isPremium: true });
    expect(r.ok).toBe(true);
    expect(r.via).toBe("premium");
  });
});

describe("daily limits", () => {
  it("uses 3 for free and 12 for premium", () => {
    expect(dailyLimit(false)).toBe(3);
    expect(dailyLimit(true)).toBe(12);
    expect(dailyLimitReached(false)).toBe(false);
  });
});

describe("perfect streak combo", () => {
  it("tracks consecutive perfect scores and badge threshold", () => {
    expect(getPerfectStreak()).toBe(0);
    expect(recordPerfectStreak(true)).toBe(1);
    expect(recordPerfectStreak(true)).toBe(2);
    expect(hasPerfectComboBadge()).toBe(false);
    expect(recordPerfectStreak(true)).toBe(PERFECT_COMBO_BADGE_AT);
    expect(hasPerfectComboBadge()).toBe(true);
    expect(recordPerfectStreak(false)).toBe(0);
    expect(hasPerfectComboBadge()).toBe(false);
  });
});

describe("weekly leaderboard", () => {
  it("records best ratio per game from plays", () => {
    recordLeaderboardEntry("pattern-match", 4, 5);
    recordLeaderboardEntry("pattern-match", 5, 5);
    const rows = getWeeklyLeaderboard();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.gameId).toBe("pattern-match");
    expect(rows[0]?.bestRatio).toBe(100);
  });
});

describe("corrupt localStorage hardening", () => {
  it("getPlayLog returns empty array for non-array JSON", () => {
    localStorage.setItem("amynest_game_play_log_v1", '{"oops":true}');
    expect(getPlayLog()).toEqual([]);
    expect(gamesPlayedToday()).toBe(0);
  });

  it("getPlayLog drops entries missing required fields", () => {
    localStorage.setItem(
      "amynest_game_play_log_v1",
      JSON.stringify([
        { id: "pattern-match" },
        {
          id: "card-flip",
          date: new Date().toISOString(),
          pointsEarned: 5,
          perfect: false,
        },
      ]),
    );
    expect(getPlayLog()).toHaveLength(1);
    expect(getWeeklyGameSummary().playsLast7Days).toBe(1);
  });

  it("hub continue strip survives corrupt play log", () => {
    localStorage.setItem("amynest_game_play_log_v1", "null");
    ensureStarterUnlocks();
    expect(() => getContinuePlayingGames(false, 3)).not.toThrow();
    expect(getContinuePlayingGames(false, 3)).toEqual([]);
  });
});
