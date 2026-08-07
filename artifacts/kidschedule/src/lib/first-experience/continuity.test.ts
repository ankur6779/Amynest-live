import { describe, expect, it, beforeEach } from "vitest";
import {
  ageBandToApproxYears,
  ageBandToOnboardingId,
  buildContinuityFromState,
  peekFirstExperienceOnboardingSeed,
  saveFirstExperienceContinuity,
  loadFirstExperienceContinuity,
  clearFirstExperienceContinuity,
  peekHomeContinuityGreeting,
  consumeHomeContinuityGreeting,
  shouldDeferMonetizationForFirstExperience,
  markHomeContinuitySurfaced,
  wasHomeContinuitySurfaced,
} from "./continuity";
import type { FirstExperienceState } from "./types";

describe("first-experience continuity", () => {
  beforeEach(() => {
    clearFirstExperienceContinuity();
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it("maps age bands to approximate years and onboarding ids", () => {
    expect(ageBandToApproxYears("0-2")).toBe(1);
    expect(ageBandToApproxYears("5-7")).toBe(6);
    expect(ageBandToOnboardingId("0-2")).toBe("y1");
    expect(ageBandToOnboardingId("2-4")).toBe("y3");
    expect(ageBandToOnboardingId("5-7")).toBe("y6");
    expect(ageBandToOnboardingId("8-10")).toBe("y8_plus");
  });

  it("builds continuity from earned value and seeds onboarding", () => {
    const state: FirstExperienceState = {
      version: 1,
      step: "keep",
      childName: "Aria",
      ageBand: "5-7",
      todayContext: "home",
      nextThing: {
        id: "focus-block",
        title: "Give Aria one small focus win",
        detail: "Pick one short task.",
        minutes: 10,
        basedOn: ["It’s Thursday."],
      },
      completedAt: "2026-08-07T10:00:00.000Z",
      valueEarned: true,
      completionKind: "done",
      startedAt: "2026-08-07T09:00:00.000Z",
    };
    const continuity = buildContinuityFromState(state);
    expect(continuity).not.toBeNull();
    saveFirstExperienceContinuity(continuity!);
    expect(loadFirstExperienceContinuity()?.childName).toBe("Aria");
    const seed = peekFirstExperienceOnboardingSeed();
    expect(seed?.name).toBe("Aria");
    expect(seed?.age).toBe(6);
    expect(seed?.selectedAgeBand).toBe("y6");
    expect(seed?.dobIsEstimated).toBe(true);
  });

  it("surfaces home greeting once then defers monetization until then", () => {
    const state: FirstExperienceState = {
      version: 1,
      step: "keep",
      childName: "Aria",
      ageBand: "5-7",
      todayContext: "home",
      nextThing: {
        id: "focus-block",
        title: "Give Aria one small focus win",
        detail: "Pick one short task.",
        minutes: 10,
        basedOn: ["It’s Thursday."],
      },
      completedAt: "2026-08-07T10:00:00.000Z",
      valueEarned: true,
      completionKind: "done",
      startedAt: "2026-08-07T09:00:00.000Z",
    };
    saveFirstExperienceContinuity(buildContinuityFromState(state)!);
    expect(shouldDeferMonetizationForFirstExperience()).toBe(true);
    const greeting = peekHomeContinuityGreeting();
    expect(greeting?.title).toMatch(/Aria/);
    expect(consumeHomeContinuityGreeting()).not.toBeNull();
    expect(wasHomeContinuitySurfaced()).toBe(true);
    // Session cache keeps the same greeting for Strict Mode remounts.
    expect(peekHomeContinuityGreeting()?.title).toMatch(/Aria/);
    expect(shouldDeferMonetizationForFirstExperience()).toBe(false);
  });

  it("markHomeContinuitySurfaced unlocks monetization deferral", () => {
    const state: FirstExperienceState = {
      version: 1,
      step: "memory",
      childName: "Leo",
      ageBand: "2-4",
      todayContext: "school",
      nextThing: {
        id: "preschool-leave-ready",
        title: "Get Leo leave-ready",
        detail: "One loop.",
        minutes: 8,
        basedOn: ["It’s Friday."],
      },
      completedAt: null,
      valueEarned: true,
      completionKind: "later",
      startedAt: "2026-08-07T09:00:00.000Z",
    };
    saveFirstExperienceContinuity(buildContinuityFromState(state)!);
    expect(shouldDeferMonetizationForFirstExperience()).toBe(true);
    markHomeContinuitySurfaced();
    expect(shouldDeferMonetizationForFirstExperience()).toBe(false);
  });
});
