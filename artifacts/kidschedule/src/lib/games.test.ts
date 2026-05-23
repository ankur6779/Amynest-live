import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import {
  unlockGame,
  isGameUnlockedForPlay,
  canPlayGame,
  dailyLimit,
  dailyLimitReached,
  ensureStarterUnlocks,
  GAMES,
} from "./games";
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

  it("streak unlocks a game without points", () => {
    cacheRoutineStreak(STREAK_UNLOCK_DAYS);
    const r = unlockGame("odd-one-out", { isPremium: false });
    expect(r.ok).toBe(true);
    expect(r.via).toBe("streak");
    expect(isGameUnlockedForPlay("odd-one-out", false)).toBe(true);
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
