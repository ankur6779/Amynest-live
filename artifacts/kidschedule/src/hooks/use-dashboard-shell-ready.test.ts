import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  DASHBOARD_SHELL_MAX_WAIT_MS,
  useDashboardShellReady,
} from "@/hooks/use-dashboard-shell-ready";

describe("useDashboardShellReady", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("unlocks immediately when stale cache exists", () => {
    const { result } = renderHook(() =>
      useDashboardShellReady({ hasStaleCache: true }),
    );
    expect(result.current).toBe(true);
  });

  it("unlocks after 2 second deadline", () => {
    const { result } = renderHook(() =>
      useDashboardShellReady({ hasStaleCache: false }),
    );
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(DASHBOARD_SHELL_MAX_WAIT_MS);
    });
    expect(result.current).toBe(true);
  });

  it("unlocks early when queries settle", () => {
    const { result, rerender } = renderHook(
      ({ settled }: { settled: boolean }) =>
        useDashboardShellReady({ hasStaleCache: false, queriesSettled: settled }),
      { initialProps: { settled: false } },
    );
    expect(result.current).toBe(false);
    rerender({ settled: true });
    expect(result.current).toBe(true);
  });
});
