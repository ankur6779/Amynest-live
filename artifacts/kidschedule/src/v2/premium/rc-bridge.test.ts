import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPremiumBillingPorts } from "./rc-bridge";

const presentNativeRCPaywall = vi.fn();

vi.mock("@/lib/native-rc-paywall", () => ({
  RC_ENTITLEMENT_ID: "premium",
  presentNativeRCPaywall: (...args: unknown[]) => presentNativeRCPaywall(...args),
}));

describe("Premium RC bridge", () => {
  beforeEach(() => {
    presentNativeRCPaywall.mockReset();
    presentNativeRCPaywall.mockResolvedValue({
      handled: false,
      purchased: false,
      restored: false,
      cancelled: false,
    });
  });

  it("uses native purchase when wrapper present", async () => {
    const purchase = vi.fn().mockResolvedValue({ ok: true });
    const ports = createPremiumBillingPorts({
      native: {
        wrapperPresent: true,
        available: true,
        unavailableReason: null,
        purchasing: false,
        purchase,
        restore: vi.fn(),
      },
      web: { checkoutRazorpay: vi.fn() },
      userId: "user-1",
    });
    await expect(ports.purchase("yearly")).resolves.toEqual({ ok: true });
    expect(purchase).toHaveBeenCalledWith("yearly");
  });

  it("falls back to web checkout when not in native shell", async () => {
    const checkoutRazorpay = vi.fn().mockResolvedValue({ ok: true });
    const ports = createPremiumBillingPorts({
      native: {
        wrapperPresent: false,
        available: false,
        unavailableReason: null,
        purchasing: false,
        purchase: vi.fn(),
        restore: vi.fn(),
      },
      web: { checkoutRazorpay },
      userId: "user-1",
    });
    await expect(ports.purchase("monthly")).resolves.toEqual({ ok: true });
    expect(checkoutRazorpay).toHaveBeenCalledWith("monthly");
  });

  it("restore success / failure from native", async () => {
    const restore = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const ports = createPremiumBillingPorts({
      native: {
        wrapperPresent: true,
        available: true,
        unavailableReason: null,
        purchasing: false,
        purchase: vi.fn(),
        restore,
      },
      web: { checkoutRazorpay: vi.fn() },
    });
    await expect(ports.restore()).resolves.toEqual({ ok: true, reason: undefined });
    await expect(ports.restore()).resolves.toMatchObject({ ok: false });
  });

  it("wires presentNativePaywall to RC entitlement id", async () => {
    const ports = createPremiumBillingPorts({
      native: {
        wrapperPresent: true,
        available: true,
        unavailableReason: null,
        purchasing: false,
        purchase: vi.fn(),
        restore: vi.fn(),
      },
      web: { checkoutRazorpay: vi.fn() },
      userId: "uid",
    });
    await ports.presentNativePaywall?.();
    expect(presentNativeRCPaywall).toHaveBeenCalledWith({
      userId: "uid",
      entitlementId: "premium",
      ifNeeded: false,
    });
  });
});
