import { describe, expect, it, vi } from "vitest";

describe("pre-signup-feature-flags env gating", () => {
  it("parent OFF cascades child flags off", async () => {
    vi.stubEnv("VITE_FF_PRE_SIGNUP_REENGAGEMENT", "false");
    vi.stubEnv("VITE_FF_PRE_SIGNUP_PERM_NATIVE", "true");
    vi.stubEnv("VITE_FF_PRE_SIGNUP_DIAGNOSTICS", "true");
    vi.resetModules();

    const flags = await import("@/lib/pre-signup-feature-flags");
    expect(flags.isPreSignupReengagementEnabled()).toBe(false);
    expect(flags.isPreSignupPermNativeEnabled()).toBe(false);
    expect(flags.isPreSignupDiagnosticsEnabled()).toBe(false);

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
