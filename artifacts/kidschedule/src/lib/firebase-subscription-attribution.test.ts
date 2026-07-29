// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { logEvent, getAnalytics, isSupported } = vi.hoisted(() => ({
  logEvent: vi.fn(),
  getAnalytics: vi.fn(() => ({ app: "analytics" })),
  isSupported: vi.fn(async () => true),
}));

const { isNativeAmyNestAndroidWrapper } = vi.hoisted(() => ({
  isNativeAmyNestAndroidWrapper: vi.fn(() => false),
}));

const { getNativeBilling, waitForBillingBridge } = vi.hoisted(() => ({
  getNativeBilling: vi.fn(() => null),
  waitForBillingBridge: vi.fn(async () => null),
}));

vi.mock("firebase/analytics", () => ({
  getAnalytics,
  isSupported,
  logEvent,
}));

vi.mock("firebase/app", () => ({
  getApps: vi.fn(() => [{ name: "test-app" }]),
}));

vi.mock("@/lib/firebase", () => ({
  initializeFirebase: vi.fn(() => ({ status: "ok" })),
}));

vi.mock("@/lib/meta-attribution", () => ({
  resolveMetaPlanPrice: vi.fn(() => ({ value: 1499, currency: "INR" })),
}));

vi.mock("@/lib/device-lite", () => ({
  isNativeAmyNestAndroidWrapper,
}));

vi.mock("@/lib/native-billing", () => ({
  getNativeBilling,
  waitForBillingBridge,
}));

import {
  FIREBASE_SUBSCRIPTION_CONVERT_EVENT,
  trackFirebaseBeginCheckout,
  trackFirebaseSubscriptionPurchase,
  resetFirebaseSubscriptionAnalyticsForTests,
} from "./firebase-subscription-attribution";

describe("firebase-subscription-attribution", () => {
  beforeEach(() => {
    resetFirebaseSubscriptionAnalyticsForTests();
    logEvent.mockClear();
    getAnalytics.mockClear();
    isSupported.mockClear();
    isNativeAmyNestAndroidWrapper.mockReturnValue(false);
    getNativeBilling.mockReturnValue(null);
    waitForBillingBridge.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fires purchase and app_store_subscription_convert", async () => {
    await trackFirebaseSubscriptionPurchase("yearly", { source: "paywall_modal" });
    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      "purchase",
      expect.objectContaining({
        value: 1499,
        currency: "INR",
        item_id: "yearly",
        source: "paywall_modal",
        items: expect.any(Array),
      }),
    );
    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      FIREBASE_SUBSCRIPTION_CONVERT_EVENT,
      expect.objectContaining({ value: 1499, currency: "INR" }),
    );
  });

  it("fires begin_checkout", async () => {
    await trackFirebaseBeginCheckout("monthly", { source: "paywall_modal" });
    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      "begin_checkout",
      expect.objectContaining({
        item_id: "monthly",
        source: "paywall_modal",
        items: expect.any(Array),
      }),
    );
  });

  it("uses native bridge on Android wrapper and skips web when native ok", async () => {
    const logSubscriptionAnalytics = vi.fn(async () => ({ ok: true }));
    isNativeAmyNestAndroidWrapper.mockReturnValue(true);
    waitForBillingBridge.mockResolvedValue({ postMessage: vi.fn(), onmessage: null });
    getNativeBilling.mockReturnValue({ logSubscriptionAnalytics });

    await trackFirebaseBeginCheckout("yearly", { source: "pricing" });

    expect(logSubscriptionAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "begin_checkout",
        productId: "yearly",
        source: "pricing",
      }),
    );
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("falls back to web Firebase when native bridge fails", async () => {
    const logSubscriptionAnalytics = vi.fn(async () => ({ ok: false, error: "fail" }));
    isNativeAmyNestAndroidWrapper.mockReturnValue(true);
    waitForBillingBridge.mockResolvedValue({ postMessage: vi.fn(), onmessage: null });
    getNativeBilling.mockReturnValue({ logSubscriptionAnalytics });

    await trackFirebaseBeginCheckout("yearly", { source: "pricing" });

    expect(logSubscriptionAnalytics).toHaveBeenCalled();
    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      "begin_checkout",
      expect.objectContaining({ item_id: "yearly" }),
    );
  });
});
