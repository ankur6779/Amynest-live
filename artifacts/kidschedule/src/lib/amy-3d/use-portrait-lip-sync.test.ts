// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePortraitLipSync } from "@/lib/amy-3d/use-portrait-lip-sync";

describe("usePortraitLipSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns REST when inactive", () => {
    const { result } = renderHook(() => usePortraitLipSync({ active: false }));
    expect(result.current).toBe("REST");
  });

  it("returns REST under reduced motion even when active", () => {
    const { result } = renderHook(() =>
      usePortraitLipSync({ active: true, reduced: true }),
    );
    expect(result.current).toBe("REST");
  });

  it("cycles visemes while active", async () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});

    const { result } = renderHook(() => usePortraitLipSync({ active: true }));

    const tick = (ms: number) => {
      act(() => {
        const cb = rafCallbacks[rafCallbacks.length - 1];
        cb?.(ms);
      });
    };

    tick(0);
    expect(result.current).toBe("AA");

    tick(400);
    expect(["AA", "OH", "EE", "IH", "OU"]).toContain(result.current);
  });
});
