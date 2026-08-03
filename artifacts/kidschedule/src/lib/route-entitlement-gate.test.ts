import { describe, expect, it } from "vitest";
import {
  isPremiumRouteAccessGranted,
  shouldFailClosedLearningJourneyOnTimeout,
} from "./route-entitlement-gate";

describe("isPremiumRouteAccessGranted", () => {
  it("denies when entitlements are missing (including after load timeout)", () => {
    expect(isPremiumRouteAccessGranted(undefined, "canAccessNutritionHub")).toBe(false);
    expect(isPremiumRouteAccessGranted(null, "canAccessNutritionHub")).toBe(false);
  });

  it("denies when the access key is false", () => {
    expect(
      isPremiumRouteAccessGranted({ canAccessNutritionHub: false }, "canAccessNutritionHub"),
    ).toBe(false);
  });

  it("allows only when the access key is explicitly true", () => {
    expect(
      isPremiumRouteAccessGranted({ canAccessNutritionHub: true }, "canAccessNutritionHub"),
    ).toBe(true);
  });
});

describe("shouldFailClosedLearningJourneyOnTimeout", () => {
  it("fails closed when timed out without journey access", () => {
    expect(
      shouldFailClosedLearningJourneyOnTimeout({ gateTimedOut: true, hasAccess: false }),
    ).toBe(true);
  });

  it("does not force preview when access arrived", () => {
    expect(
      shouldFailClosedLearningJourneyOnTimeout({ gateTimedOut: true, hasAccess: true }),
    ).toBe(false);
  });

  it("does not apply before timeout", () => {
    expect(
      shouldFailClosedLearningJourneyOnTimeout({ gateTimedOut: false, hasAccess: false }),
    ).toBe(false);
  });
});
