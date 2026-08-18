// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const trackFunnel = vi.fn();
const track = vi.fn();

vi.mock("@/lib/analytics/analytics-service", () => ({
  getAnalyticsService: () => ({ trackFunnel }),
}));

vi.mock("@/lib/analytics", () => ({
  track: (...args: unknown[]) => track(...args),
}));

vi.mock("@/lib/geo", () => ({ isIndiaRegion: () => true }));
vi.mock("@/lib/device-lite", () => ({ isCapacitorIosShell: () => false }));
vi.mock("@/lib/native-shell", () => ({ isNativeAmyNestShell: () => true }));
vi.mock("@/lib/install-attribution", () => ({
  getInstallAttribution: () => ({ gclid: "g1", gbraid: "gb1", wbraid: "wb1" }),
}));
vi.mock("@/lib/subscription-debug", () => ({ logSubscriptionDebug: vi.fn() }));
vi.mock("@/lib/retention-engine", () => ({ trackPremiumConversion: vi.fn() }));
vi.mock("@/lib/meta-attribution", () => ({ trackMetaSubscribe: vi.fn() }));
vi.mock("@/lib/firebase-subscription-attribution", () => ({
  trackFirebaseSubscriptionPurchase: vi.fn(),
}));

import {
  hasRecordedPurchaseTransaction,
  recordVerifiedStorePurchase,
  resetPurchaseCoordinatorForTests,
} from "./subscription-purchase-coordinator";

describe("subscription-purchase-coordinator", () => {
  beforeEach(() => {
    resetPurchaseCoordinatorForTests();
    trackFunnel.mockClear();
    track.mockClear();
  });

  it("records purchase once per transaction id", async () => {
    const store = {
      transactionId: "GPA.1234-5678",
      productId: "amynest_yearly",
      currency: "INR",
      value: 1499,
    };

    const first = recordVerifiedStorePurchase({
      plan: "yearly",
      source: "pricing",
      store,
    });
    const second = recordVerifiedStorePurchase({
      plan: "yearly",
      source: "pricing",
      store,
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(hasRecordedPurchaseTransaction("GPA.1234-5678")).toBe(true);
    expect(trackFunnel).toHaveBeenCalledTimes(2);
    expect(trackFunnel).toHaveBeenCalledWith(
      "subscription",
      "purchase_success",
      expect.objectContaining({
        transaction_id: "GPA.1234-5678",
        product_id: "amynest_yearly",
        gclid: "g1",
        gbraid: "gb1",
        wbraid: "wb1",
      }),
    );
  });

  it("skips when transaction id is missing", () => {
    const ok = recordVerifiedStorePurchase({
      plan: "yearly",
      source: "native_store",
      store: {
        transactionId: "",
        productId: "amynest_yearly",
        currency: "INR",
        value: 1499,
      },
    });
    expect(ok).toBe(false);
    expect(trackFunnel).not.toHaveBeenCalled();
  });
});
