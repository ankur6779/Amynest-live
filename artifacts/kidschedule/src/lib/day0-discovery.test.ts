import { beforeEach, describe, expect, it } from "vitest";
import {
  isDay0SecondaryHref,
  isFirstActionOnlyHref,
  isHrefAllowedForStage,
  rememberDiscoveryRoutineCount,
  resetRememberedDiscoveryRoutineCount,
  resolveDiscoveryStage,
  shouldShowDay0SecondarySurfaces,
  shouldShowFullDiscoverySurfaces,
  shouldShowRoomsNavigation,
} from "./day0-discovery";

describe("day0 staged discovery", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetRememberedDiscoveryRoutineCount();
  });

  it("stays before_plan with no activation signals", () => {
    localStorage.clear();
    sessionStorage.clear();
    expect(resolveDiscoveryStage(0)).toBe("before_plan");
    expect(shouldShowDay0SecondarySurfaces(0)).toBe(false);
    expect(shouldShowRoomsNavigation(0)).toBe(false);
    expect(shouldShowFullDiscoverySurfaces(0)).toBe(false);
    expect(isDay0SecondaryHref("/parenting-hub#help")).toBe(true);
    expect(isDay0SecondaryHref("/games")).toBe(true);
    expect(isDay0SecondaryHref("/dashboard")).toBe(false);
    expect(isDay0SecondaryHref("/routines")).toBe(false);
  });

  it("becomes plan_visible after first routine activation", () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("amynest:sub:first_routine_activated", "1");
    expect(resolveDiscoveryStage(0)).toBe("plan_visible");
    expect(shouldShowDay0SecondarySurfaces(0)).toBe(true);
    expect(shouldShowRoomsNavigation(0)).toBe(true);
    expect(shouldShowFullDiscoverySurfaces(0)).toBe(false);
    expect(isHrefAllowedForStage("/games", "plan_visible")).toBe(true);
    expect(isHrefAllowedForStage("/nutrition", "plan_visible")).toBe(true);
    expect(isHrefAllowedForStage("/birth-sky", "plan_visible")).toBe(false);
    expect(isHrefAllowedForStage("/insights", "plan_visible")).toBe(false);
  });

  it("becomes first_action after the first plan action flag", () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("amynest:sub:first_plan_action", "1");
    expect(resolveDiscoveryStage(0)).toBe("first_action");
    expect(shouldShowFullDiscoverySurfaces(0)).toBe(true);
    expect(isFirstActionOnlyHref("/birth-sky")).toBe(true);
    expect(isHrefAllowedForStage("/birth-sky", "first_action")).toBe(true);
    expect(isHrefAllowedForStage("/rewards", "first_action")).toBe(true);
  });

  it("treats a guest plan with real blocks as plan_visible", () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(
      "amynest_guest_plan_v1",
      JSON.stringify({
        version: 1,
        nextThing: { blocks: [{}, {}, {}, {}] },
      }),
    );
    expect(resolveDiscoveryStage(0)).toBe("plan_visible");
  });

  it("remembers Home routine count so Rooms tab matches Home doors", () => {
    rememberDiscoveryRoutineCount(3);
    expect(resolveDiscoveryStage()).toBe("plan_visible");
    expect(shouldShowRoomsNavigation()).toBe(true);
  });
});
