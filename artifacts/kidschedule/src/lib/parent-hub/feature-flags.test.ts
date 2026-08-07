import { afterEach, describe, expect, it, vi } from "vitest";

describe("isParentHubRoomsV1Enabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults ON when unset", async () => {
    vi.stubEnv("VITE_FF_PARENT_HUB_ROOMS_V1", "");
    const { isParentHubRoomsV1Enabled } = await import("./feature-flags");
    expect(isParentHubRoomsV1Enabled()).toBe(true);
  });

  it("kill switch VITE_FF_PARENT_HUB_ROOMS_V1=0 restores legacy Hub", async () => {
    vi.stubEnv("VITE_FF_PARENT_HUB_ROOMS_V1", "0");
    const { isParentHubRoomsV1Enabled } = await import("./feature-flags");
    expect(isParentHubRoomsV1Enabled()).toBe(false);
  });

  it("accepts true/1 as ON", async () => {
    vi.stubEnv("VITE_FF_PARENT_HUB_ROOMS_V1", "1");
    const { isParentHubRoomsV1Enabled } = await import("./feature-flags");
    expect(isParentHubRoomsV1Enabled()).toBe(true);
  });
});
