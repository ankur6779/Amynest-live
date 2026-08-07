import { afterEach, describe, expect, it, vi } from "vitest";

describe("isTodayHomeV1Enabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults ON when unset", async () => {
    vi.stubEnv("VITE_FF_TODAY_HOME_V1", "");
    const { isTodayHomeV1Enabled } = await import("./feature-flags");
    expect(isTodayHomeV1Enabled()).toBe(true);
  });

  it("kill switch VITE_FF_TODAY_HOME_V1=0 restores legacy Home", async () => {
    vi.stubEnv("VITE_FF_TODAY_HOME_V1", "0");
    const { isTodayHomeV1Enabled } = await import("./feature-flags");
    expect(isTodayHomeV1Enabled()).toBe(false);
  });
});
