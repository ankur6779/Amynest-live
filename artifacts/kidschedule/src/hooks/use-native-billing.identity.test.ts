import { describe, expect, it } from "vitest";
import { isCanonicalBillingReady } from "./use-native-billing";

describe("native billing identity readiness", () => {
  it("blocks billing while User B is signed in with User A's cached RevenueCat owner", () => {
    expect(
      isCanonicalBillingReady({
        nativeAvailable: true,
        wrapperPresent: true,
        currentUserId: "user_B",
        billingConfigUserId: "user_A",
        revenueCatAppUserId: "owner_A",
        billingConfigLoading: false,
      }),
    ).toBe(false);
  });

  it("blocks purchase and restore attempts before the new user's owner loads", () => {
    expect(
      isCanonicalBillingReady({
        nativeAvailable: true,
        wrapperPresent: true,
        currentUserId: "user_B",
        billingConfigUserId: null,
        revenueCatAppUserId: null,
        billingConfigLoading: true,
      }),
    ).toBe(false);
  });

  it("allows purchase after User B canonical owner loads", () => {
    expect(
      isCanonicalBillingReady({
        nativeAvailable: true,
        wrapperPresent: true,
        currentUserId: "user_B",
        billingConfigUserId: "user_B",
        revenueCatAppUserId: "owner_B",
        billingConfigLoading: false,
      }),
    ).toBe(true);
  });

  it("allows restore after User B canonical owner loads", () => {
    expect(
      isCanonicalBillingReady({
        nativeAvailable: true,
        wrapperPresent: true,
        currentUserId: "user_B",
        billingConfigUserId: "user_B",
        revenueCatAppUserId: "owner_B",
        billingConfigLoading: false,
      }),
    ).toBe(true);
  });

  it("does not mark billing ready while native billing itself is unavailable", () => {
    expect(
      isCanonicalBillingReady({
        nativeAvailable: false,
        wrapperPresent: true,
        currentUserId: "user_B",
        billingConfigUserId: "user_B",
        revenueCatAppUserId: "owner_B",
        billingConfigLoading: false,
      }),
    ).toBe(false);
  });
});
