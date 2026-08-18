import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
const trackFunnel = vi.fn();

vi.mock("@/lib/analytics", () => ({
  track: (...args: unknown[]) => track(...args),
}));

vi.mock("@/lib/analytics/analytics-service", () => ({
  getAnalyticsService: () => ({ trackFunnel }),
}));

vi.mock("@/lib/geo", () => ({
  isIndiaRegion: () => true,
}));

vi.mock("@/lib/device-lite", () => ({
  isCapacitorIosShell: () => false,
}));

vi.mock("@/lib/native-shell", () => ({
  isNativeAmyNestShell: () => false,
}));

vi.mock("@/lib/subscription-debug", () => ({
  logSubscriptionDebug: vi.fn(),
}));

vi.mock("@/lib/retention-engine", () => ({
  trackPremiumConversion: vi.fn(),
}));

vi.mock("@/lib/meta-attribution", () => ({
  trackMetaSubscribe: vi.fn(),
}));

vi.mock("@/lib/firebase-subscription-attribution", () => ({
  trackFirebaseBeginCheckout: vi.fn(),
  trackFirebaseSubscriptionPurchase: vi.fn(),
}));

describe("trackSubscriptionEvent purchase", () => {
  beforeEach(() => {
    track.mockClear();
    trackFunnel.mockClear();
  });

  it("records upgrade_completed against the purchase_success path", async () => {
    const { trackSubscriptionEvent } = await import("./subscription-analytics");
    trackSubscriptionEvent({
      event: "purchase_success",
      plan: "yearly",
      source: "pricing",
    });

    expect(trackFunnel).toHaveBeenCalledWith(
      "subscription",
      "purchase_success",
      expect.objectContaining({ plan: "yearly", source: "pricing" }),
    );

    await vi.waitFor(() => {
      expect(track).toHaveBeenCalledWith(
        "upgrade_completed",
        expect.objectContaining({
          source: "pricing",
          action: "checkout",
          entitlement_state: "premium",
        }),
      );
    });
  });
});
