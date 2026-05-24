import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getParentRoute,
  recordRouteTransition,
  resetNavigationStackForTests,
} from "./navigation-stack";
import { smartBack } from "./safe-navigation";

describe("smartBack", () => {
  beforeEach(() => {
    resetNavigationStackForTests();
    vi.restoreAllMocks();
  });

  it("returns to dashboard from a tab root when browser history is empty", () => {
    const navigate = vi.fn();
    Object.defineProperty(window, "history", {
      value: { length: 1, back: vi.fn() },
      configurable: true,
    });

    smartBack(navigate, "/amy-coach", "test");

    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("returns to parent hub module route before dashboard fallback", () => {
    const navigate = vi.fn();
    Object.defineProperty(window, "history", {
      value: { length: 1, back: vi.fn() },
      configurable: true,
    });

    smartBack(navigate, "/study", "test");

    expect(navigate).toHaveBeenCalledWith("/parenting-hub", { replace: true });
  });

  it("uses the in-memory stack when browser history cannot go back", () => {
    const navigate = vi.fn();
    Object.defineProperty(window, "history", {
      value: { length: 1, back: vi.fn() },
      configurable: true,
    });
    recordRouteTransition("/dashboard", "/feedback", "push");

    smartBack(navigate, "/feedback", "test");

    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
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
});
