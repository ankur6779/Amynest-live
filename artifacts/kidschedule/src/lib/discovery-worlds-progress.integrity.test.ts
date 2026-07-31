import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  animalProgressToPlatform,
  loadDiscoveryWorldProgress,
  saveDiscoveryWorldProgress,
  toggleDiscoveryWorldFavorite,
  touchDiscoveryWorldStreak,
} from "./discovery-worlds-progress";
import { loadAnimalProgressAsPlatform } from "./discovery-worlds-animal-bridge";
import { aggregateDiscoveryStreak } from "./discovery-worlds-cross-progress";
import {
  loadAnimalWorldStats,
  saveAnimalWorldStats,
  recordAnimalOpened,
} from "./animal-world-storage";
import { saveAnimalWorldProgress } from "./animal-world-progress";
import { defaultProgressV2 } from "@workspace/animal-world";
import { defaultWorldProgressV2 } from "@workspace/world-engine";
import {
  getDiscoveryProgressSyncPort,
  setDiscoveryProgressSyncPort,
} from "./discovery-worlds-progress-sync";

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  };
  vi.stubGlobal("localStorage", mock);
  vi.stubGlobal("window", { localStorage: mock });
}

beforeAll(() => {
  installLocalStorageMock();
});

beforeEach(() => {
  localStorage.clear();
  setDiscoveryProgressSyncPort(null);
});

describe("animalProgressToPlatform adapter", () => {
  it("maps favorites, session ms, and streak from stats", () => {
    const progress = {
      ...defaultProgressV2(),
      xp: 40,
      stickersEarned: ["sticker-a"],
      quizCorrectTotal: 2,
    };
    const platform = animalProgressToPlatform(progress, {
      favorites: ["cow", "dog"],
      totalSessionMs: 120_000,
      streakDays: 5,
      lastPlayedDate: "2026-07-30",
    });

    expect(platform.worldId).toBe("animal_world");
    expect(platform.xp).toBe(40);
    expect(platform.favorites).toEqual(["cow", "dog"]);
    expect(platform.totalSessionMs).toBe(120_000);
    expect(platform.streakDays).toBe(5);
    expect(platform.lastPlayedDate).toBe("2026-07-30");
    expect(platform.stickersEarned).toEqual(["sticker-a"]);
  });

  it("defaults missing stats to empty/zero without throwing", () => {
    const platform = animalProgressToPlatform(defaultProgressV2());
    expect(platform.favorites).toEqual([]);
    expect(platform.totalSessionMs).toBe(0);
    expect(platform.streakDays).toBe(0);
    expect(platform.lastPlayedDate).toBeNull();
  });
});

describe("loadAnimalProgressAsPlatform", () => {
  it("includes animal session stats in hub-facing progress", () => {
    const childId = 7;
    saveAnimalWorldProgress(childId, { ...defaultProgressV2(), xp: 12 });
    saveAnimalWorldStats({
      childId,
      playCounts: { cow: 3 },
      soundCounts: {},
      favorites: ["cow"],
      streakDays: 2,
      lastPlayedDate: "2026-07-31",
      sessionStartedAt: Date.now(),
      totalSessionMs: 90_000,
    });

    const platform = loadAnimalProgressAsPlatform(childId);
    expect(platform.xp).toBe(12);
    expect(platform.favorites).toContain("cow");
    expect(platform.streakDays).toBe(2);
    expect(platform.totalSessionMs).toBe(90_000);
  });
});

describe("centralized streak + favorites", () => {
  it("touchDiscoveryWorldStreak is idempotent same day", () => {
    const base = {
      ...defaultWorldProgressV2("vehicle_world"),
      streakDays: 4,
      lastPlayedDate: new Date().toISOString().slice(0, 10),
    };
    const next = touchDiscoveryWorldStreak(base);
    expect(next.streakDays).toBe(4);
    expect(next.lastPlayedDate).toBe(base.lastPlayedDate);
  });

  it("toggleDiscoveryWorldFavorite persists and is backward-compatible", () => {
    const childId = 3;
    const { added, progress } = toggleDiscoveryWorldFavorite("vehicle_world", childId, "car");
    expect(added).toBe(true);
    expect(progress.favorites).toContain("car");
    const reloaded = loadDiscoveryWorldProgress("vehicle_world", childId);
    expect(reloaded.favorites).toContain("car");
  });

  it("aggregateDiscoveryStreak uses animal stats after play", () => {
    const childId = 11;
    recordAnimalOpened(childId, "lion");
    const stats = loadAnimalWorldStats(childId);
    expect(stats.streakDays).toBeGreaterThanOrEqual(1);
    expect(aggregateDiscoveryStreak(childId)).toBeGreaterThanOrEqual(1);
  });
});

describe("progress sync port", () => {
  it("notifies optional push on save without breaking localStorage", async () => {
    const pushes: Array<{ worldId: string; childId: number }> = [];
    setDiscoveryProgressSyncPort({
      pushWorldProgress: async (worldId, childId) => {
        pushes.push({ worldId, childId });
      },
    });
    expect(getDiscoveryProgressSyncPort()).not.toBeNull();

    saveDiscoveryWorldProgress("nature_world", 9, defaultWorldProgressV2("nature_world"));
    await Promise.resolve();
    expect(pushes).toEqual([{ worldId: "nature_world", childId: 9 }]);
    expect(loadDiscoveryWorldProgress("nature_world", 9).worldId).toBe("nature_world");
  });
});
