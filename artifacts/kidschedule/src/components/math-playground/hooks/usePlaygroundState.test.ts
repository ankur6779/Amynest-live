import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { defaultRewardState } from "@workspace/math-playground";
import { loadPlaygroundState, savePlaygroundState } from "../lib/storage";
import { usePlaygroundState } from "./usePlaygroundState";

const CHILD_A = 42_001;
const CHILD_B = 42_002;

describe("usePlaygroundState child switch", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reloads persisted state when childId changes", () => {
    savePlaygroundState({
      version: 4,
      childId: CHILD_A,
      rewards: { ...defaultRewardState(), stars: 11 },
      learning: { sessionHistory: [], activityStats: {} },
    });
    savePlaygroundState({
      version: 4,
      childId: CHILD_B,
      rewards: { ...defaultRewardState(), stars: 3 },
      learning: { sessionHistory: [], activityStats: {} },
    });

    const { result, rerender } = renderHook(
      ({ childId }: { childId: number }) => usePlaygroundState(childId),
      { initialProps: { childId: CHILD_A } },
    );

    expect(result.current.rewards.stars).toBe(11);
    expect(result.current.state.childId).toBe(CHILD_A);

    rerender({ childId: CHILD_B });

    expect(result.current.rewards.stars).toBe(3);
    expect(result.current.state.childId).toBe(CHILD_B);
  });

  it("persists updates under the active child after switch", () => {
    const { result, rerender } = renderHook(
      ({ childId }: { childId: number }) => usePlaygroundState(childId),
      { initialProps: { childId: CHILD_A } },
    );

    act(() => {
      result.current.persistRewards((prev) => ({ ...prev, stars: 9 }));
    });

    rerender({ childId: CHILD_B });

    act(() => {
      result.current.persistRewards((prev) => ({ ...prev, stars: 4 }));
    });

    expect(loadPlaygroundState(CHILD_A).rewards.stars).toBe(9);
    expect(loadPlaygroundState(CHILD_B).rewards.stars).toBe(4);
  });
});
