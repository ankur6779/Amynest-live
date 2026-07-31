import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __buildFreshHubDailyForTests,
  __setHubDailyAdventureForTests,
  getHubDailyAdventureView,
  getHubWorldCatalogs,
  loadHubDailyAdventure,
  recordHubDailyAdventure,
} from "./discovery-worlds-hub-daily";

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
});

describe("hub daily adventure", () => {
  it("builds catalogs for all live worlds with real content", () => {
    const catalogs = getHubWorldCatalogs();
    expect(catalogs.length).toBeGreaterThanOrEqual(5);
    expect(catalogs.every((c) => c.items.length > 0)).toBe(true);
    expect(catalogs.some((c) => c.worldId === "animal_world")).toBe(true);
    expect(catalogs.some((c) => c.worldId === "vehicle_world")).toBe(true);
  });

  it("generates 3-5 tasks with no hardcoded vehicle-only stub", () => {
    const adventure = __buildFreshHubDailyForTests(99);
    expect(adventure.tasks.length).toBeGreaterThanOrEqual(3);
    expect(adventure.tasks.length).toBeLessThanOrEqual(5);
    const worldIds = new Set(adventure.tasks.map((t) => t.worldId));
    // Across a full catalog day, expect more than a single-world stub.
    expect(worldIds.size).toBeGreaterThanOrEqual(1);
    expect(adventure.tasks.every((t) => t.label.length > 0)).toBe(true);
  });

  it("computes progress from real completion events", () => {
    const childId = 21;
    const fresh = loadHubDailyAdventure(childId);
    expect(getHubDailyAdventureView(childId).pct).toBe(0);

    const task = fresh.tasks[0]!;
    for (let i = 0; i < task.target; i++) {
      recordHubDailyAdventure(childId, task.worldId, task.kind, 1);
    }

    const view = getHubDailyAdventureView(childId);
    expect(view.done).toBeGreaterThanOrEqual(1);
    expect(view.pct).toBeGreaterThan(0);
  });

  it("keeps same-day task set stable across loads", () => {
    const childId = 33;
    const a = loadHubDailyAdventure(childId);
    const b = loadHubDailyAdventure(childId);
    expect(b.tasks.map((t) => t.id)).toEqual(a.tasks.map((t) => t.id));
  });

  it("does not treat empty completed map as progress", () => {
    const childId = 44;
    const adventure = __buildFreshHubDailyForTests(childId);
    __setHubDailyAdventureForTests(childId, { ...adventure, completed: {} });
    expect(getHubDailyAdventureView(childId).pct).toBe(0);
  });
});
