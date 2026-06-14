import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearNutritionScoreStorage,
  mergeServerDay,
  persistTodayChecklist,
  readDayChecklist,
} from "@/features/nutrition/lib/nutrition-score-storage";
import {
  enqueueNutritionSync,
  flushNutritionSync,
  configureNutritionSync,
  resolveChecklistForSyncDate,
} from "@/features/nutrition/lib/nutrition-sync";

const CHILD_ID = 99;

describe("canonical checklist storage (P1-1)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00"));
  });

  afterEach(() => {
    clearNutritionScoreStorage(CHILD_ID);
    vi.useRealTimers();
  });

  it("stores exact checklist per day, not count-derived", () => {
    persistTodayChecklist(CHILD_ID, { fruit: true, water: true, greens: true });
    const canonical = readDayChecklist(CHILD_ID, "2026-06-14");
    expect(canonical).toEqual({ fruit: true, water: true, greens: true });
    expect(canonical.breakfast).toBeUndefined();
  });

  it("resolveChecklistForSyncDate returns canonical history payload", () => {
    persistTodayChecklist(CHILD_ID, { breakfast: true });
    const raw = JSON.parse(localStorage.getItem(`nutrition:daily-score:${CHILD_ID}`)!);
    raw.dayChecklists["2026-06-12"] = { protein: true, dairy: true, noJunk: true };
    raw.history["2026-06-12"] = { score: 38, checked: 3, total: 8, minDayMet: true };
    localStorage.setItem(`nutrition:daily-score:${CHILD_ID}`, JSON.stringify(raw));

    const checklist = resolveChecklistForSyncDate(CHILD_ID, "2026-06-12");
    expect(checklist).toEqual({ protein: true, dairy: true, noJunk: true });
  });

  it("skips sync for history days without canonical checklist", async () => {
    const raw = JSON.parse(localStorage.getItem(`nutrition:daily-score:${CHILD_ID}`) ?? "null") ?? {
      version: 3,
      childId: CHILD_ID,
      dateKey: "2026-06-14",
      checklist: {},
      history: { "2026-06-12": { score: 50, checked: 4, total: 8, minDayMet: true } },
      dayChecklists: {},
      dayUpdatedAt: {},
    };
    localStorage.setItem(`nutrition:daily-score:${CHILD_ID}`, JSON.stringify(raw));

    const puts: string[] = [];
    const authFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as { dateKey: string };
        puts.push(body.dateKey);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, log: null }), { status: 200 });
    });

    configureNutritionSync(authFetch);
    enqueueNutritionSync(CHILD_ID, "2026-06-12");
    await flushNutritionSync(CHILD_ID);
    expect(puts).not.toContain("2026-06-12");
  });

  it("upgrades v2 store to v3 with today checklist preserved", () => {
    localStorage.setItem(
      `nutrition:daily-score:${CHILD_ID}`,
      JSON.stringify({
        version: 2,
        childId: CHILD_ID,
        dateKey: "2026-06-14",
        checklist: { breakfast: true, fruit: true },
        history: {},
      }),
    );

    const checklist = readDayChecklist(CHILD_ID, "2026-06-14");
    expect(checklist).toEqual({ breakfast: true, fruit: true });
  });
});

describe("sync conflict resolution (P1-3)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00"));
  });

  afterEach(() => {
    clearNutritionScoreStorage(CHILD_ID);
    vi.useRealTimers();
  });

  it("keeps local checklist when local updatedAt is newer", () => {
    persistTodayChecklist(CHILD_ID, { breakfast: true, protein: true });
    const outcome = mergeServerDay(
      CHILD_ID,
      "2026-06-14",
      { fruit: true, water: true },
      1000,
    );
    expect(outcome).toBe("kept_local");
    expect(readDayChecklist(CHILD_ID, "2026-06-14").breakfast).toBe(true);
  });

  it("applies server checklist when server is newer", () => {
    persistTodayChecklist(CHILD_ID, { breakfast: true });
    const store = JSON.parse(localStorage.getItem(`nutrition:daily-score:${CHILD_ID}`)!);
    store.dayUpdatedAt["2026-06-14"] = 1000;
    localStorage.setItem(`nutrition:daily-score:${CHILD_ID}`, JSON.stringify(store));

    const outcome = mergeServerDay(
      CHILD_ID,
      "2026-06-14",
      { fruit: true, water: true, greens: true },
      9000,
    );
    expect(outcome).toBe("applied_server");
    expect(readDayChecklist(CHILD_ID, "2026-06-14")).toEqual({
      fruit: true,
      water: true,
      greens: true,
    });
  });
});
