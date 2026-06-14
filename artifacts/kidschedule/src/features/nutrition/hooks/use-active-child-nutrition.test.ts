import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  ACTIVE_CHILD_CHANGE_EVENT,
  ACTIVE_CHILD_STORAGE_KEY,
} from "@/lib/coach-age-nav";
import { useActiveChildId } from "@/hooks/use-active-child-id";
import {
  clearNutritionScoreStorage,
  persistTodayChecklist,
  readTodayChecklist,
} from "@/features/nutrition/lib/nutrition-score-storage";

describe("active child synchronization (P1-7)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    clearNutritionScoreStorage(1);
    clearNutritionScoreStorage(2);
  });

  it("useActiveChildId updates on custom event", () => {
    localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, "1");
    const { result } = renderHook(() => useActiveChildId());
    expect(result.current).toBe(1);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(ACTIVE_CHILD_CHANGE_EVENT, { detail: { childId: 2 } }),
      );
    });

    expect(result.current).toBe(2);
  });

  it("keeps separate nutrition data per child without leakage", () => {
    persistTodayChecklist(1, { breakfast: true, fruit: true });
    persistTodayChecklist(2, { protein: true, dairy: true });

    expect(readTodayChecklist(1)).toEqual({ breakfast: true, fruit: true });
    expect(readTodayChecklist(2)).toEqual({ protein: true, dairy: true });
    expect(readTodayChecklist(1).protein).toBeUndefined();
    expect(readTodayChecklist(2).breakfast).toBeUndefined();
  });
});
