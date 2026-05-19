import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  getBrowserNotificationPermission,
  shouldShowNativeNotifyPrompt,
} from "./native-push-bridge";

describe("getBrowserNotificationPermission", () => {
  beforeEach(() => {
    vi.stubGlobal("window", globalThis.window ?? ({} as Window & typeof globalThis));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as Window & { __AMYNEST_WRAPPER?: string }).__AMYNEST_WRAPPER;
    // @ts-expect-error test cleanup
    delete window.Notification;
  });

  it("returns null when Notification.permission throws (Android WebView)", () => {
    const ThrowNotif = function Notification() {};
    Object.defineProperty(ThrowNotif, "permission", {
      get() {
        throw new DOMException("Permission denied", "SecurityError");
      },
    });
    // @ts-expect-error partial mock
    window.Notification = ThrowNotif;
    (window as Window & { __AMYNEST_WRAPPER?: string }).__AMYNEST_WRAPPER = "android";

    expect(() => {
      // Old sign-in guard — must throw
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      "Notification" in window && Notification.permission === "default";
    }).toThrow();

    expect(getBrowserNotificationPermission()).toBeNull();
    expect(shouldShowNativeNotifyPrompt()).toBe(false);
  });

  it("returns default when wrapper and permission is default", () => {
    // @ts-expect-error partial mock
    window.Notification = { permission: "default" };
    (window as Window & { __AMYNEST_WRAPPER?: string }).__AMYNEST_WRAPPER = "android";
    expect(getBrowserNotificationPermission()).toBe("default");
    expect(shouldShowNativeNotifyPrompt()).toBe(true);
  });
});
