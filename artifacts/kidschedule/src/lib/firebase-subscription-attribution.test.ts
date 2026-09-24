// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { logEvent, getAnalytics, isSupported, setUserId } = vi.hoisted(() => ({
  logEvent: vi.fn(),
  getAnalytics: vi.fn(() => ({ app: "analytics" })),
  isSupported: vi.fn(async () => true),
  setUserId: vi.fn(),
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
  setUserId,
}));

vi.mock("firebase/app", () => ({
  getApps: vi.fn(() => [{ name: "test-app" }]),
}));

const authState: { uid: string | null } = { uid: "user-a" };

vi.mock("@/lib/firebase", () => ({
  initializeFirebase: vi.fn(() => ({ status: "ok" })),
  getFirebaseAuth: () => ({
    currentUser: authState.uid ? { uid: authState.uid } : null,
  }),
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
  FIREBASE_SIGN_UP_EVENT,
  FIREBASE_SUBSCRIPTION_CONVERT_EVENT,
  trackFirebaseBeginCheckout,
  trackFirebaseSignUp,
  trackFirebaseQualitySignal,
  FIREBASE_QUALITY_EVENT_NAMES,
  trackFirebaseSubscriptionPurchase,
  setFirebaseAnalyticsUserId,
  resetFirebaseSubscriptionAnalyticsForTests,
} from "./firebase-subscription-attribution";

describe("firebase-subscription-attribution", () => {
  beforeEach(() => {
    resetFirebaseSubscriptionAnalyticsForTests();
    authState.uid = "user-a";
    logEvent.mockClear();
    getAnalytics.mockClear();
    isSupported.mockClear();
    setUserId.mockClear();
    isNativeAmyNestAndroidWrapper.mockReturnValue(false);
    getNativeBilling.mockReturnValue(null);
    waitForBillingBridge.mockResolvedValue(null);
    delete window.__AMYNEST_BILLING;
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

  it("binds the signed-in user id before logging purchase", async () => {
    await trackFirebaseSubscriptionPurchase("yearly", { source: "pricing" });
    expect(setUserId).toHaveBeenCalledWith(expect.anything(), "user-a");
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), "purchase", expect.any(Object));
  });

  it("clears analytics user id on sign-out", async () => {
    await setFirebaseAnalyticsUserId(null);
    expect(setUserId).toHaveBeenCalledWith(expect.anything(), null);
  });

  it("forwards transaction id on native Android purchase event", async () => {
    const logSubscriptionAnalytics = vi.fn(async () => ({ ok: true }));
    const setAnalyticsUserId = vi.fn(async () => ({ ok: true }));
    isNativeAmyNestAndroidWrapper.mockReturnValue(true);
    waitForBillingBridge.mockResolvedValue({ postMessage: vi.fn(), onmessage: null });
    getNativeBilling.mockReturnValue({ logSubscriptionAnalytics, setAnalyticsUserId });

    await trackFirebaseSubscriptionPurchase("yearly", {
      source: "pricing",
      value: 1499,
      currency: "INR",
      productId: "amynest_yearly",
      transactionId: "GPA.9999",
    });

    expect(logSubscriptionAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "purchase",
        productId: "amynest_yearly",
        transactionId: "GPA.9999",
      }),
    );
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("forwards the signed-in user id on the Android native purchase event", async () => {
    const logSubscriptionAnalytics = vi.fn(async () => ({ ok: true }));
    const setAnalyticsUserId = vi.fn(async () => ({ ok: true }));
    isNativeAmyNestAndroidWrapper.mockReturnValue(true);
    waitForBillingBridge.mockResolvedValue({ postMessage: vi.fn(), onmessage: null });
    getNativeBilling.mockReturnValue({ logSubscriptionAnalytics, setAnalyticsUserId });

    await trackFirebaseSubscriptionPurchase("yearly", { source: "pricing" });

    expect(setAnalyticsUserId).toHaveBeenCalledWith("user-a");
    expect(logSubscriptionAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "purchase",
        productId: "yearly",
        userId: "user-a",
      }),
    );
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("fires sign_up for Google Ads conversion optimization", async () => {
    await trackFirebaseSignUp({ method: "google", source: "onboarding" });
    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      FIREBASE_SIGN_UP_EVENT,
      expect.objectContaining({ method: "google", source: "onboarding" }),
    );
  });

  it("forwards first_plan_generated to Firebase without PII keys", async () => {
    await trackFirebaseQualitySignal("first_plan_generated", {
      source: "routine_generate",
      item_count: 6,
      email: "hidden@example.com",
    });
    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      FIREBASE_QUALITY_EVENT_NAMES.first_plan_generated,
      expect.objectContaining({ source: "routine_generate", item_count: 6 }),
    );
    expect(logEvent.mock.calls[0]?.[2]).not.toHaveProperty("email");
  });

  it("maps trial_started to recommended start_trial and dedupes", async () => {
    await trackFirebaseQualitySignal("trial_started", { plan: "monthly", source: "paywall" }, { onceKey: "trial:paywall" });
    await trackFirebaseQualitySignal("trial_started", { plan: "monthly", source: "paywall" }, { onceKey: "trial:paywall" });
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      FIREBASE_QUALITY_EVENT_NAMES.trial_started,
      expect.objectContaining({ plan: "monthly", source: "paywall" }),
    );
  });

  it("does not send quality events through old native bridges", async () => {
    const logSubscriptionAnalytics = vi.fn(async () => ({ ok: true }));
    const logQualityAnalytics = vi.fn(async () => ({ ok: true }));
    isNativeAmyNestAndroidWrapper.mockReturnValue(true);
    window.__AMYNEST_BILLING = "2.6.0";
    waitForBillingBridge.mockResolvedValue({ postMessage: vi.fn(), onmessage: null });
    getNativeBilling.mockReturnValue({ logSubscriptionAnalytics, logQualityAnalytics });

    await trackFirebaseQualitySignal("onboarding_completed", { source: "onboarding" });

    expect(logQualityAnalytics).not.toHaveBeenCalled();
    expect(logSubscriptionAnalytics).not.toHaveBeenCalled();
    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      FIREBASE_QUALITY_EVENT_NAMES.onboarding_completed,
      expect.objectContaining({ source: "onboarding" }),
    );
  });
});
