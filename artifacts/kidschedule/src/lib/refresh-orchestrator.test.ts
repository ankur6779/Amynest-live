import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REFRESH_COMPLETE_KEY,
  REFRESH_IN_PROGRESS_KEY,
  resetRefreshOrchestratorForTests,
  runRefreshCycle,
} from "@/lib/refresh-orchestrator";

vi.mock("@/lib/force-clear-caches", () => ({
  forceClearAllCaches: vi.fn(() => Promise.resolve()),
}));

describe("refresh-orchestrator", () => {
  beforeEach(() => {
    resetRefreshOrchestratorForTests();
    vi.stubGlobal("sessionStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
    vi.stubGlobal("location", {
      href: "https://www.amynest.in/dashboard",
      origin: "https://www.amynest.in",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("runs cache clear and navigation once", async () => {
    const outcome = await runRefreshCycle({ reason: "test" });
    expect(outcome).toBe("scheduled");
    expect(sessionStorage.getItem(REFRESH_COMPLETE_KEY)).toBe("1");
    expect(sessionStorage.getItem(REFRESH_IN_PROGRESS_KEY)).toBeNull();
    expect(location.href).toBe("https://www.amynest.in/");
  });

  it("skips when refresh-complete flag is set", async () => {
    sessionStorage.setItem(REFRESH_COMPLETE_KEY, "1");
    const outcome = await runRefreshCycle({ reason: "test" });
    expect(outcome).toBe("skipped_complete");
    expect(sessionStorage.getItem(REFRESH_COMPLETE_KEY)).toBeNull();
  });

  it("fires timeout callback when cache clear hangs", async () => {
    const { forceClearAllCaches } = await import("@/lib/force-clear-caches");
    vi.mocked(forceClearAllCaches).mockImplementation(
      () => new Promise(() => undefined),
    );
    vi.useFakeTimers();
    const onTimeout = vi.fn();

    const pending = runRefreshCycle({ reason: "hang", onTimeout });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(REFRESH_COMPLETE_KEY)).toBe("1");
    await expect(pending).resolves.toBe("timeout");
    vi.useRealTimers();
  });
});
