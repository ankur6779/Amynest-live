import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  alignStoreToToday,
  clearLegacyNutritionScoreStorage,
  clearNutritionScoreStorage,
  dateKeyLocal,
  getDayProgressStatus,
  getWeekProgress,
  loadNutritionScoreStore,
  LEGACY_NUTRITION_SCORE_KEY,
  mergeLegacyIntoStore,
  NUTRITION_DAILY_SCORE_KEY,
  persistTodayChecklist,
  readTodayChecklist,
  storageKeyForChild,
} from "@/features/nutrition/lib/nutrition-score-storage";

const CHILD_ID = 42;

describe("nutrition-score-storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00"));
  });

  afterEach(() => {
    clearNutritionScoreStorage(CHILD_ID);
    clearLegacyNutritionScoreStorage();
    vi.useRealTimers();
  });

  it("persists and restores checklist for today", () => {
    persistTodayChecklist(CHILD_ID, { breakfast: true, protein: true });
    expect(readTodayChecklist(CHILD_ID)).toEqual({ breakfast: true, protein: true });
  });

  it("resets checklist on new calendar day", () => {
    persistTodayChecklist(CHILD_ID, { breakfast: true, fruit: true });
    vi.setSystemTime(new Date("2026-06-15T08:00:00"));

    expect(readTodayChecklist(CHILD_ID)).toEqual({});

    const store = loadNutritionScoreStore(CHILD_ID);
    expect(store.dateKey).toBe("2026-06-15");
    expect(store.history["2026-06-14"]).toMatchObject({ checked: 2, score: 25 });
  });

  it("handles corrupted storage safely", () => {
    localStorage.setItem(storageKeyForChild(CHILD_ID), "{not-json");
    expect(readTodayChecklist(CHILD_ID)).toEqual({});

    localStorage.setItem(storageKeyForChild(CHILD_ID), JSON.stringify({ version: 99 }));
    expect(readTodayChecklist(CHILD_ID)).toEqual({});
  });

  it("sanitizes unknown checklist keys on persist", () => {
    persistTodayChecklist(CHILD_ID, { breakfast: true, bogus: true } as Record<string, boolean>);
    expect(readTodayChecklist(CHILD_ID)).toEqual({ breakfast: true });
  });

  it("alignStoreToToday archives yesterday when day changes", () => {
    const store = alignStoreToToday({
      version: 2,
      childId: CHILD_ID,
      dateKey: "2026-06-13",
      checklist: { breakfast: true, protein: true, dairy: true, greens: true },
      history: {},
    });

    expect(store.dateKey).toBe("2026-06-14");
    expect(store.checklist).toEqual({});
    expect(store.history["2026-06-13"]).toMatchObject({ checked: 4, score: 50 });
  });

  it("imports Sprint 2 legacy global store into child store", () => {
    localStorage.setItem(
      LEGACY_NUTRITION_SCORE_KEY,
      JSON.stringify({
        version: 1,
        dateKey: "2026-06-14",
        checklist: { breakfast: true, water: true },
        history: { "2026-06-13": { score: 25, checked: 2, total: 8 } },
      }),
    );

    const merged = mergeLegacyIntoStore(CHILD_ID);
    expect(readTodayChecklist(CHILD_ID)).toEqual({ breakfast: true, water: true });
    expect(merged.history["2026-06-13"]).toMatchObject({ checked: 2 });
  });
});

describe("week progress", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00"));
  });

  afterEach(() => {
    clearNutritionScoreStorage(CHILD_ID);
    vi.useRealTimers();
  });

  it("maps day status thresholds", () => {
    expect(getDayProgressStatus(undefined)).toBe("empty");
    expect(getDayProgressStatus({ score: 0, checked: 0, total: 8 })).toBe("empty");
    expect(getDayProgressStatus({ score: 50, checked: 4, total: 8 })).toBe("partial");
    expect(getDayProgressStatus({ score: 88, checked: 7, total: 8 })).toBe("completed");
  });

  it("returns seven days for current week with today flagged", () => {
    persistTodayChecklist(CHILD_ID, { breakfast: true });
    const week = getWeekProgress(CHILD_ID, new Date("2026-06-14T12:00:00"));

    expect(week).toHaveLength(7);
    expect(week.find((d) => d.isToday)?.dateKey).toBe(dateKeyLocal(new Date("2026-06-14")));
    expect(week.find((d) => d.isToday)?.status).toBe("partial");
  });
});
