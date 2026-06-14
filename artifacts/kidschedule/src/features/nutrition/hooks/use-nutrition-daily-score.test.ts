import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDailyScoreState,
  shouldPersistDailyScore,
} from "@/features/nutrition/hooks/use-nutrition-daily-score";
import {
  clearNutritionScoreStorage,
  persistTodayChecklist,
} from "@/features/nutrition/lib/nutrition-score-storage";

const CHILD_A = 101;
const CHILD_B = 202;

describe("shouldPersistDailyScore", () => {
  it("blocks persist when owner child differs from active child", () => {
    expect(shouldPersistDailyScore(CHILD_B, CHILD_A)).toBe(false);
  });

  it("allows persist when owner matches active child", () => {
    expect(shouldPersistDailyScore(CHILD_A, CHILD_A)).toBe(true);
  });

  it("blocks persist when active child is null", () => {
    expect(shouldPersistDailyScore(null, CHILD_A)).toBe(false);
  });
});

describe("multi-child daily score state", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00"));
  });

  afterEach(() => {
    clearNutritionScoreStorage(CHILD_A);
    clearNutritionScoreStorage(CHILD_B);
    vi.useRealTimers();
  });

  it("createDailyScoreState loads checklist per child without cross-contamination", () => {
    persistTodayChecklist(CHILD_A, { breakfast: true, fruit: true });
    persistTodayChecklist(CHILD_B, { protein: true, dairy: true });

    const stateA = createDailyScoreState(CHILD_A);
    const stateB = createDailyScoreState(CHILD_B);

    expect(stateA.ownerChildId).toBe(CHILD_A);
    expect(stateA.checkList.breakfast).toBe(true);
    expect(stateA.checkList.protein).toBeUndefined();

    expect(stateB.ownerChildId).toBe(CHILD_B);
    expect(stateB.checkList.protein).toBe(true);
    expect(stateB.checkList.breakfast).toBeUndefined();
  });

  it("simulated child switch: stale owner blocks persist for new active child", () => {
    persistTodayChecklist(CHILD_A, { breakfast: true });
    persistTodayChecklist(CHILD_B, { protein: true });

    const staleState = createDailyScoreState(CHILD_A);
    expect(shouldPersistDailyScore(CHILD_B, staleState.ownerChildId)).toBe(false);

    const freshState = createDailyScoreState(CHILD_B);
    expect(shouldPersistDailyScore(CHILD_B, freshState.ownerChildId)).toBe(true);
    expect(freshState.checkList.protein).toBe(true);
  });
});
