import { describe, expect, it } from "vitest";
import {
  decideLearningJourneyAccess,
  decidePremiumRouteAccess,
} from "./premium-access-decision";

describe("decidePremiumRouteAccess", () => {
  it("allows only a resolved true flag", () => {
    expect(
      decidePremiumRouteAccess({
        flag: true,
        entitlementsResolved: true,
      }),
    ).toBe("ALLOW");
  });

  it("denies expired/free flags even before the query fully settles", () => {
    expect(
      decidePremiumRouteAccess({
        flag: false,
        entitlementsResolved: true,
      }),
    ).toBe("DENY");
    expect(
      decidePremiumRouteAccess({
        flag: false,
        entitlementsResolved: false,
      }),
    ).toBe("DENY");
  });

  it("stays UNKNOWN while entitlement is loading", () => {
    expect(
      decidePremiumRouteAccess({
        flag: undefined,
        entitlementsResolved: false,
      }),
    ).toBe("UNKNOWN");
  });

  it("fails closed after timeout or missing entitlements", () => {
    expect(
      decidePremiumRouteAccess({
        flag: undefined,
        entitlementsResolved: false,
        timedOut: true,
      }),
    ).toBe("DENY");
    expect(
      decidePremiumRouteAccess({
        flag: null,
        entitlementsResolved: true,
      }),
    ).toBe("DENY");
  });

  it("does not treat unresolved cached true as ALLOW", () => {
    expect(
      decidePremiumRouteAccess({
        flag: true,
        entitlementsResolved: false,
      }),
    ).toBe("UNKNOWN");
  });
});

describe("decideLearningJourneyAccess", () => {
  it("allows premium and active free-journey users", () => {
    expect(
      decideLearningJourneyAccess({
        isPremium: true,
        journeyLocked: true,
        hasJourneyAccess: false,
        hasChild: true,
        timedOut: true,
      }),
    ).toBe("ALLOW");
    expect(
      decideLearningJourneyAccess({
        isPremium: false,
        journeyLocked: false,
        hasJourneyAccess: true,
        hasChild: true,
        timedOut: false,
      }),
    ).toBe("ALLOW");
  });

  it("denies a completed/expired hub journey", () => {
    expect(
      decideLearningJourneyAccess({
        isPremium: false,
        journeyLocked: true,
        hasJourneyAccess: true,
        hasChild: true,
        timedOut: false,
      }),
    ).toBe("DENY");
  });

  it("fails closed when the journey lookup errors or times out for a known child", () => {
    expect(
      decideLearningJourneyAccess({
        isPremium: false,
        journeyLocked: false,
        hasJourneyAccess: false,
        hasChild: true,
        timedOut: true,
      }),
    ).toBe("DENY");
    expect(
      decideLearningJourneyAccess({
        isPremium: false,
        journeyLocked: false,
        hasJourneyAccess: false,
        hasChild: true,
        timedOut: false,
        journeyError: true,
      }),
    ).toBe("DENY");
  });

  it("keeps learning reachable when no child exists yet", () => {
    expect(
      decideLearningJourneyAccess({
        isPremium: false,
        journeyLocked: false,
        hasJourneyAccess: false,
        hasChild: false,
        timedOut: true,
      }),
    ).toBe("ALLOW");
  });
});
