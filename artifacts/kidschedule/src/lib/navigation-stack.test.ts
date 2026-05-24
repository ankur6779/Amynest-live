import { describe, expect, it, beforeEach } from "vitest";
import {
  getParentRoute,
  getRecentRoutes,
  isSameRoute,
  markTabRootEntry,
  normalizeRoutePath,
  recordRouteTransition,
  resetNavigationStackForTests,
  shouldReplaceNavigation,
  wouldCreateCycle,
} from "./navigation-stack";

describe("navigation-stack", () => {
  beforeEach(() => {
    resetNavigationStackForTests();
  });

  it("canonicalizes legacy speech coach aliases", () => {
    expect(normalizeRoutePath("/parenting-hub/speech-coach")).toBe("/speech-coach");
    expect(normalizeRoutePath("/parenting-hub/speech-coach/live")).toBe(
      "/speech-coach/live",
    );
  });

  it("detects duplicate routes", () => {
    expect(isSameRoute("/speech-coach", "/speech-coach")).toBe(true);
    expect(isSameRoute("/parenting-hub/speech-coach", "/speech-coach")).toBe(true);
  });

  it("replaces when returning from a hub module to Parent Hub", () => {
    expect(
      shouldReplaceNavigation("/speech-coach", "/parenting-hub"),
    ).toBe(true);
  });

  it("pushes when opening a hub module from Parent Hub", () => {
    expect(
      shouldReplaceNavigation("/parenting-hub", "/speech-coach"),
    ).toBe(false);
  });

  it("replaces when returning to a parent module route", () => {
    expect(
      shouldReplaceNavigation("/speech-coach/live", "/speech-coach"),
    ).toBe(true);
    expect(getParentRoute("/speech-coach/live")).toBe("/speech-coach");
  });

  it("detects A-B-A oscillation cycles", () => {
    recordRouteTransition("/dashboard", "/parenting-hub", "push");
    recordRouteTransition("/parenting-hub", "/speech-coach", "push");
    recordRouteTransition("/speech-coach", "/parenting-hub", "push");
    expect(wouldCreateCycle("/parenting-hub", "/speech-coach")).toBe(true);
  });

  it("resets stack when explicitly marking a tab root", () => {
    recordRouteTransition("/dashboard", "/parenting-hub", "push");
    recordRouteTransition("/parenting-hub", "/speech-coach", "push");
    markTabRootEntry("/parenting-hub");
    expect(getRecentRoutes()).toEqual(["/parenting-hub"]);
  });

  it("maps nested routine and child routes to their list parents", () => {
    expect(getParentRoute("/routines/abc-123")).toBe("/routines");
    expect(getParentRoute("/children/new")).toBe("/children");
    expect(getParentRoute("/amy-coach/progress")).toBe("/amy-coach");
  });
});
