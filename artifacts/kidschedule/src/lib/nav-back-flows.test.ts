import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getRecentRoutes,
  recordRouteTransition,
  resetNavigationStackForTests,
  shouldReplaceNavigation,
} from "./navigation-stack";
import {
  consumeAuthoritativeTransition,
  resetRouteHistoryForTests,
} from "./route-history-manager";
import { appNavigate, runSafeNavAction, smartBack } from "./safe-navigation";
import { invokePageBackHandler, registerPageBackHandler, resetPageBackHandlerForTests } from "./page-back-handler";

describe("navigation back flows", () => {
  beforeEach(() => {
    resetRouteHistoryForTests();
    resetPageBackHandlerForTests();
    vi.restoreAllMocks();
  });

  it("Parent Hub → Study → Back returns to Parent Hub with replace", () => {
    const navigate = vi.fn();
    recordRouteTransition("/parenting-hub", "/study", "push");

    smartBack(navigate, "/study", "test");

    expect(navigate).toHaveBeenCalledWith("/parenting-hub", { replace: true });
  });

  it("Dashboard → Study → Back returns to dashboard, not Parent Hub", () => {
    const navigate = vi.fn();
    recordRouteTransition("/dashboard", "/study", "push");

    smartBack(navigate, "/study", "test");

    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("Parent Hub → Audio Lessons → Back returns to Parent Hub with replace", () => {
    const navigate = vi.fn();
    recordRouteTransition("/parenting-hub", "/audio-lessons", "push");

    smartBack(navigate, "/audio-lessons", "test");

    expect(navigate).toHaveBeenCalledWith("/parenting-hub", { replace: true });
  });

  it("Parent Hub → Event Prep → Back returns to Parent Hub with replace", () => {
    const navigate = vi.fn();
    recordRouteTransition("/parenting-hub", "/event-prep", "push");

    smartBack(navigate, "/event-prep", "test");

    expect(navigate).toHaveBeenCalledWith("/parenting-hub", { replace: true });
  });

  it("Dashboard → Parent Hub → Module → Back uses parent route not browser history", () => {
    const navigate = vi.fn();
    const historyBack = vi.fn();
    Object.defineProperty(window, "history", {
      value: { length: 5, back: historyBack },
      configurable: true,
    });

    recordRouteTransition("/dashboard", "/parenting-hub", "replace");
    recordRouteTransition("/parenting-hub", "/phonics", "push");

    smartBack(navigate, "/phonics", "test");

    expect(historyBack).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/parenting-hub", { replace: true });
  });

  it("does not call window.history.back()", () => {
    const navigate = vi.fn();
    const historyBack = vi.fn();
    Object.defineProperty(window, "history", {
      value: { length: 99, back: historyBack },
      configurable: true,
    });
    recordRouteTransition("/dashboard", "/feedback", "push");

    smartBack(navigate, "/feedback", "test");

    expect(historyBack).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("replace navigation from hub module to Parent Hub is recorded as replace", () => {
    recordRouteTransition("/parenting-hub", "/study", "push");
    appNavigate(vi.fn(), "/study", "/parenting-hub", {
      replace: true,
      source: "test",
    });

    expect(consumeAuthoritativeTransition("/parenting-hub")).toBe("replace");
    expect(getRecentRoutes()).toEqual(["/parenting-hub"]);
  });

  it("shouldReplaceNavigation treats hub module exit as replace", () => {
    expect(shouldReplaceNavigation("/study", "/parenting-hub")).toBe(true);
    expect(shouldReplaceNavigation("/audio-lessons", "/parenting-hub")).toBe(true);
    expect(shouldReplaceNavigation("/event-prep", "/parenting-hub")).toBe(true);
  });

  it("empty history fallback sends tab roots to dashboard", () => {
    const navigate = vi.fn();

    smartBack(navigate, "/amy-coach", "test");

    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("empty history fallback sends orphan routes to dashboard", () => {
    const navigate = vi.fn();

    smartBack(navigate, "/feedback", "test");

    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("page back handler runs before route back (hardware back contract)", () => {
    const navigate = vi.fn();
    let step = "detail";
    registerPageBackHandler(() => {
      if (step === "detail") {
        step = "home";
        return true;
      }
      return false;
    });

    expect(invokePageBackHandler()).toBe(true);
    expect(step).toBe("home");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("header back invokes page handler before debounce so exit navigation runs", () => {
    const navigate = vi.fn();
    registerPageBackHandler(() => {
      runSafeNavAction("back:/amy-coach", () => {
        smartBack(navigate, "/amy-coach", "ai-coach-exit");
      });
      return true;
    });

    if (invokePageBackHandler()) {
      expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
      return;
    }
    runSafeNavAction("back:/amy-coach", () => {
      smartBack(navigate, "/amy-coach", "layout-header-back");
    });
  });

  it("nested back debounce blocks page handler exit when outer lock runs first", () => {
    const navigate = vi.fn();
    registerPageBackHandler(() => {
      runSafeNavAction("back:/amy-coach", () => {
        smartBack(navigate, "/amy-coach", "ai-coach-exit");
      });
      return true;
    });

    runSafeNavAction("back:/amy-coach", () => {
      if (invokePageBackHandler()) return;
      smartBack(navigate, "/amy-coach", "layout-header-back");
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it("uses in-memory stack when no parent route exists", () => {
    const navigate = vi.fn();
    recordRouteTransition("/dashboard", "/feedback", "push");

    smartBack(navigate, "/feedback", "test");

    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("avoids A-B-A navigation cycles", () => {
    const navigate = vi.fn();
    recordRouteTransition("/parenting-hub", "/speech-coach", "push");
    recordRouteTransition("/speech-coach", "/parenting-hub", "replace");
    recordRouteTransition("/parenting-hub", "/speech-coach", "push");

    smartBack(navigate, "/speech-coach", "test");

    expect(navigate).toHaveBeenCalledWith("/parenting-hub", { replace: true });
  });
});
