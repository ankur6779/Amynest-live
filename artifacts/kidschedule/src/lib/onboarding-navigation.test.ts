import { afterEach, describe, expect, it, vi } from "vitest";

describe("POST_ONBOARDING_ACTIVATION_PATH", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("lands on Today Home when Today Home V1 is enabled", async () => {
    vi.stubEnv("VITE_FF_TODAY_HOME_V1", "1");
    const mod = await import("./onboarding-navigation");
    expect(mod.POST_ONBOARDING_ACTIVATION_PATH).toBe("/dashboard");
  });

  it("kill switch restores /routines/generate", async () => {
    vi.stubEnv("VITE_FF_TODAY_HOME_V1", "0");
    const mod = await import("./onboarding-navigation");
    expect(mod.POST_ONBOARDING_ACTIVATION_PATH).toBe("/routines/generate");
  });
});
