import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimeoutRegistry } from "./use-timeout-registry";

describe("useTimeoutRegistry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears pending timeouts on unmount", () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useTimeoutRegistry());
    act(() => {
      result.current.setTimeoutSafe(fn, 500);
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("clears intervals on unmount", () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useTimeoutRegistry());
    act(() => {
      result.current.setIntervalSafe(fn, 200);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    unmount();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
