// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { logEvent, getAnalytics, isSupported } = vi.hoisted(() => ({
  logEvent: vi.fn(),
  getAnalytics: vi.fn(() => ({ app: "analytics" })),
  isSupported: vi.fn(async () => true),
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

vi.mock("@/lib/native-shell", () => ({
  isNativeAmyNestShell: vi.fn(() => false),
}));

vi.mock("@/lib/device-lite", () => ({
  isAndroidMobileShell: vi.fn(() => false),
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
      }),
    );
  });
});
