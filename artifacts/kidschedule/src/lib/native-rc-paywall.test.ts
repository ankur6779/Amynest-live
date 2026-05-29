import { afterEach, describe, expect, it, vi } from "vitest";

describe("native-rc-paywall", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("canPresentNativeRCPaywall is false by default (custom paywall first)", async () => {
    vi.stubEnv("VITE_FF_SUB_NATIVE_RC_PAYWALL", "");
    const { canPresentNativeRCPaywall } = await import("@/lib/native-rc-paywall");
    await expect(canPresentNativeRCPaywall()).resolves.toBe(false);
  });

  it("presentNativeRCPaywall returns unhandled when flag is off", async () => {
    vi.stubEnv("VITE_FF_SUB_NATIVE_RC_PAYWALL", "");
    const { presentNativeRCPaywall } = await import("@/lib/native-rc-paywall");
    await expect(presentNativeRCPaywall()).resolves.toMatchObject({
      handled: false,
      purchased: false,
    });
  });
});
