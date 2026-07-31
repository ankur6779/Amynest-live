import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ROUTE_LOADING_FAIL_OPEN_MS, useFailOpenAfter } from "./loading-fail-open";

describe("useFailOpenAfter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays false while inactive", () => {
    const { result } = renderHook(() => useFailOpenAfter(false, 1000));
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(false);
  });

  it("fails open after the configured timeout", () => {
    const { result } = renderHook(() => useFailOpenAfter(true, 1000));
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it("exports a finite default fail-open ceiling", () => {
    expect(ROUTE_LOADING_FAIL_OPEN_MS).toBeGreaterThan(0);
    expect(ROUTE_LOADING_FAIL_OPEN_MS).toBeLessThanOrEqual(30_000);
  });
});
