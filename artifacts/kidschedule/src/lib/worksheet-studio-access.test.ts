import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isAmyNestNativeAppShell,
  isWorksheetStudioBlockedClient,
  isWorksheetStudioClientAllowed,
} from "@/lib/worksheet-studio-access";

describe("worksheet-studio-access", () => {
  const originalUa = navigator.userAgent;

  beforeEach(() => {
    vi.stubGlobal("window", {
      ...window,
      Capacitor: undefined,
      __AMYNEST_WRAPPER: undefined,
    });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", { value: originalUa, configurable: true });
    vi.unstubAllGlobals();
  });

  it("allows desktop Chrome on macOS", () => {
    expect(isWorksheetStudioClientAllowed()).toBe(true);
    expect(isWorksheetStudioBlockedClient()).toBe(false);
  });

  it("allows iPhone Safari browser", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      configurable: true,
    });
    expect(isWorksheetStudioBlockedClient()).toBe(false);
    expect(isWorksheetStudioClientAllowed()).toBe(true);
  });

  it("allows Android Chrome browser", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      configurable: true,
    });
    expect(isWorksheetStudioBlockedClient()).toBe(false);
    expect(isWorksheetStudioClientAllowed()).toBe(true);
  });

  it("blocks Android WebView wrapper", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "AmyNestAndroid/1.0 Mozilla/5.0 (Linux; Android 14)",
      configurable: true,
    });
    expect(isAmyNestNativeAppShell()).toBe(true);
    expect(isWorksheetStudioClientAllowed()).toBe(false);
  });

  it("blocks Capacitor native shell", () => {
    vi.stubGlobal("window", {
      ...window,
      Capacitor: { isNativePlatform: () => true },
    });
    expect(isAmyNestNativeAppShell()).toBe(true);
    expect(isWorksheetStudioClientAllowed()).toBe(false);
  });
});
