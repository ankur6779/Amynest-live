import { describe, expect, it, vi } from "vitest";

describe("birth-sky feature flags", () => {
  it("defaults master flag on when env unset (public GA)", async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const flags = await import("./feature-flags");
    flags.setBirthSkyViewerEmail(null);
    expect(flags.isBirthSkyEnabled()).toBe(true);
    expect(flags.isBirthSkyHubTileEnabled()).toBe(true);
  });

  it("keeps public access when VITE_FF_BIRTH_SKY=1", async () => {
    vi.stubEnv("VITE_FF_BIRTH_SKY", "1");
    vi.resetModules();
    const flags = await import("./feature-flags");
    flags.setBirthSkyViewerEmail(null);
    expect(flags.isBirthSkyEnabled()).toBe(true);
    expect(flags.isBirthSkyHubTileEnabled()).toBe(true);
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("kill switch VITE_FF_BIRTH_SKY=0 still allows internal allowlist", async () => {
    vi.stubEnv("VITE_FF_BIRTH_SKY", "0");
    vi.resetModules();
    const flags = await import("./feature-flags");
    flags.setBirthSkyViewerEmail(null);
    expect(flags.isBirthSkyEnabled()).toBe(false);
    expect(flags.isBirthSkyEnabled("demo@amynest.in")).toBe(true);
    expect(flags.isBirthSkyHubTileEnabled("demo@amynest.in")).toBe(true);
    expect(flags.isBirthSkyDeepLinksEnabled("Demo@AmyNest.in")).toBe(true);
    expect(flags.isBirthSkyEnabled("someone@example.com")).toBe(false);

    flags.setBirthSkyViewerEmail("demo@amynest.in");
    expect(flags.isBirthSkyEnabled()).toBe(true);
    expect(flags.isBirthSkyHubTileEnabled()).toBe(true);
    expect(flags.isBirthSkyHubTileEnabled("demo@amynest.in")).toBe(true);
    flags.setBirthSkyViewerEmail(null);
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
