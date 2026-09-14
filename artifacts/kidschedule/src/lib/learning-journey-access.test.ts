import { describe, it, expect } from "vitest";
import { resolveLearningJourneyAccess } from "./learning-journey-access";

describe("resolveLearningJourneyAccess", () => {
  it("allows premium users", () => {
    expect(resolveLearningJourneyAccess({
      isPremium: true,
      gateLoading: true,
      gateTimedOut: true,
      hasError: true,
      journeyLocked: true,
      accessLoaded: false,
    }).kind).toBe("allowed");
  });

  it("shows loading while gate is loading", () => {
    expect(resolveLearningJourneyAccess({
      isPremium: false,
      gateLoading: true,
      gateTimedOut: false,
      hasError: false,
      journeyLocked: false,
      accessLoaded: false,
    }).kind).toBe("loading");
  });

  it("fails closed when access not loaded after timeout", () => {
    expect(resolveLearningJourneyAccess({
      isPremium: false,
      gateLoading: true,
      gateTimedOut: true,
      hasError: false,
      journeyLocked: false,
      accessLoaded: false,
    }).kind).toBe("retry");
  });

  it("blocks locked journey", () => {
    expect(resolveLearningJourneyAccess({
      isPremium: false,
      gateLoading: false,
      gateTimedOut: false,
      hasError: false,
      journeyLocked: true,
      accessLoaded: true,
    }).kind).toBe("blocked");
  });

  it("allows free journey period", () => {
    expect(resolveLearningJourneyAccess({
      isPremium: false,
      gateLoading: false,
      gateTimedOut: false,
      hasError: false,
      journeyLocked: false,
      accessLoaded: true,
    }).kind).toBe("allowed");
  });
});
