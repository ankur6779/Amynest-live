import { describe, it, expect } from "vitest";
import { resolvePremiumRouteAccess } from "./premium-route-access";

describe("resolvePremiumRouteAccess", () => {
  it("allows non-premium routes", () => {
    expect(resolvePremiumRouteAccess({
      hasPremiumRoute: false,
      entitlementsResolved: false,
      accessKey: undefined,
      entitlements: null,
      loadingTimedOut: true,
    }).kind).toBe("allowed");
  });

  it("shows loading while entitlements unresolved", () => {
    expect(resolvePremiumRouteAccess({
      hasPremiumRoute: true,
      entitlementsResolved: false,
      accessKey: "canAccessHealthLab",
      entitlements: null,
      loadingTimedOut: false,
    }).kind).toBe("loading");
  });

  it("fails closed on timeout without entitlements", () => {
    expect(resolvePremiumRouteAccess({
      hasPremiumRoute: true,
      entitlementsResolved: false,
      accessKey: "canAccessHealthLab",
      entitlements: null,
      loadingTimedOut: true,
    }).kind).toBe("retry");
  });

  it("allows confirmed premium access", () => {
    expect(resolvePremiumRouteAccess({
      hasPremiumRoute: true,
      entitlementsResolved: true,
      accessKey: "canAccessHealthLab",
      entitlements: { canAccessHealthLab: true },
      loadingTimedOut: false,
    }).kind).toBe("allowed");
  });

  it("denies free user with resolved entitlements", () => {
    expect(resolvePremiumRouteAccess({
      hasPremiumRoute: true,
      entitlementsResolved: true,
      accessKey: "canAccessHealthLab",
      entitlements: { canAccessHealthLab: false },
      loadingTimedOut: false,
    }).kind).toBe("denied");
  });
});
