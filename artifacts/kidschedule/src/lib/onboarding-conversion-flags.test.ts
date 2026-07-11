import { beforeEach, describe, expect, it, vi } from "vitest";

describe("onboarding conversion flags", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("defaults short branch to control when experiment flag is off", async () => {
    vi.stubEnv("VITE_FF_ONBOARDING_SHORT_CHILD_BRANCH", "");
    const mod = await import("./onboarding-conversion-flags");
    expect(mod.resolveOnboardingShortBranchVariant()).toBe("control");
    expect(mod.isOnboardingShortChildBranchActive()).toBe(false);
  });

  it("assigns a stable variant when experiment flag is on", async () => {
    vi.stubEnv("VITE_FF_ONBOARDING_SHORT_CHILD_BRANCH", "1");
    const mod = await import("./onboarding-conversion-flags");
    const first = mod.resolveOnboardingShortBranchVariant();
    const second = mod.resolveOnboardingShortBranchVariant();
    expect(["control", "short"]).toContain(first);
    expect(second).toBe(first);
  });

  it("strict complete gate follows env", async () => {
    vi.stubEnv("VITE_FF_ONBOARDING_STRICT_COMPLETE_GATE", "1");
    const mod = await import("./onboarding-conversion-flags");
    expect(mod.isOnboardingStrictCompleteGateEnabled()).toBe(true);
  });
});
