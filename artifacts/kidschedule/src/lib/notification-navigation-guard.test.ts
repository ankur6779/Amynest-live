import { describe, expect, it, beforeEach } from "vitest";
import {
  evaluateNotificationNavigation,
  hasNotificationTapPayload,
  resetNotificationNavigationGuardForTests,
  consumeNotificationNavigation,
} from "./notification-navigation-guard";

describe("hasNotificationTapPayload", () => {
  it("returns false for empty extras", () => {
    expect(hasNotificationTapPayload(null, null)).toBe(false);
    expect(hasNotificationTapPayload("", "")).toBe(false);
  });

  it("returns true when category or deepLink is present", () => {
    expect(hasNotificationTapPayload("", "routine")).toBe(true);
    expect(hasNotificationTapPayload("/routines", null)).toBe(true);
  });
});

describe("evaluateNotificationNavigation", () => {
  beforeEach(() => {
    resetNotificationNavigationGuardForTests();
  });

  it("rejects taps without user interaction (foreground / stale buffer)", () => {
    const decision = evaluateNotificationNavigation({
      deepLink: "",
      category: "routine",
      userInteraction: false,
    });
    expect(decision.allow).toBe(false);
    expect(decision.reason).toBe("missing-user-interaction");
  });

  it("rejects empty deep link and category even with user interaction", () => {
    const decision = evaluateNotificationNavigation({
      deepLink: "",
      category: "",
      userInteraction: true,
    });
    expect(decision.allow).toBe(false);
    expect(decision.reason).toBe("empty-payload");
  });

  it("allows explicit user tap with category only", () => {
    const decision = evaluateNotificationNavigation({
      deepLink: "",
      category: "engagement",
      userInteraction: true,
    });
    expect(decision.allow).toBe(true);
    expect(decision.resolvedPath).toBe("/dashboard");
  });

  it("deduplicates repeated notification ids", () => {
    const req = {
      deepLink: "/routines",
      userInteraction: true,
      notificationId: "msg-1",
      tappedAt: Date.now(),
    };
    expect(evaluateNotificationNavigation(req).allow).toBe(true);
    consumeNotificationNavigation(req);
    expect(evaluateNotificationNavigation(req).allow).toBe(false);
    expect(evaluateNotificationNavigation(req).reason).toBe(
      "duplicate-notification",
    );
  });
});
