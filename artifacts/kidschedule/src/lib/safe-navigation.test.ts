import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getParentRoute,
  recordRouteTransition,
  resetNavigationStackForTests,
} from "./navigation-stack";
import { resolveSmartBackTarget, smartBack } from "./safe-navigation";

describe("smartBack", () => {
  beforeEach(() => {
    resetNavigationStackForTests();
    vi.restoreAllMocks();
  });

  it("returns to dashboard from a tab root when stack is empty", () => {
    const navigate = vi.fn();
    const historyBack = vi.fn();
    Object.defineProperty(window, "history", {
      value: { length: 99, back: historyBack },
      configurable: true,
    });

    smartBack(navigate, "/amy-coach", "test");

    expect(historyBack).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("returns to parent hub when stack is empty", () => {
    const navigate = vi.fn();

    smartBack(navigate, "/study", "test");

    expect(navigate).toHaveBeenCalledWith("/parenting-hub", { replace: true });
  });

  it("returns to dashboard when opened from dashboard, not forced to parent hub", () => {
    const navigate = vi.fn();
    recordRouteTransition("/dashboard", "/study", "push");

    smartBack(navigate, "/study", "test");

    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("uses the in-memory stack when no parent route is defined", () => {
    const navigate = vi.fn();
    recordRouteTransition("/dashboard", "/feedback", "push");

    smartBack(navigate, "/feedback", "test");

    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });
});

describe("resolveSmartBackTarget", () => {
  it("prefers stack over parent route", () => {
    expect(resolveSmartBackTarget("/study", "/dashboard")).toBe("/dashboard");
    expect(resolveSmartBackTarget("/study", "/parenting-hub")).toBe(
      "/parenting-hub",
    );
  });

  it("falls back to parent when stack is empty", () => {
    expect(resolveSmartBackTarget("/study", null)).toBe("/parenting-hub");
  });
});

describe("getParentRoute nested paths", () => {
  it("maps routine detail routes to the routines list", () => {
    expect(getParentRoute("/routines/abc-123")).toBe("/routines");
  });

  it("maps child form routes to the children list", () => {
    expect(getParentRoute("/children/new")).toBe("/children");
    expect(getParentRoute("/children/42")).toBe("/children");
  });

  it("maps coach progress to amy coach", () => {
    expect(getParentRoute("/amy-coach/progress")).toBe("/amy-coach");
  });

  it("maps Games back to Rooms, not Home, when stack is empty", () => {
    expect(getParentRoute("/games")).toBe("/parenting-hub");
    expect(getParentRoute("/games")).not.toBe("/dashboard");
    expect(getParentRoute("/feedback")).toBe("/dashboard");
  });
});
