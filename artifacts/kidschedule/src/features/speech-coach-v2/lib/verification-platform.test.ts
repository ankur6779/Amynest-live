import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { detectVerificationPlatform } from "./verification-trace";

describe("platform detection (TEST 1 matrix — UA simulation only)", () => {
  const originalUa = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: originalUa,
    });
    vi.unstubAllGlobals();
  });

  function setUa(ua: string) {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: ua,
    });
  }

  it("detects android-webview", () => {
    setUa("Mozilla/5.0 AmyNestAndroid/1.0 Chrome/120 Mobile");
    (window as Window & { AndroidMicrophone?: object }).AndroidMicrophone = {};
    expect(detectVerificationPlatform()).toBe("android-webview");
  });

  it("detects android-chrome", () => {
    setUa("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile");
    expect(detectVerificationPlatform()).toBe("android-chrome");
  });

  it("detects safari-ios", () => {
    setUa("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15");
    expect(detectVerificationPlatform()).toBe("safari-ios");
  });

  it("detects desktop-chrome fallback", () => {
    setUa("Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/120");
    expect(detectVerificationPlatform()).toBe("desktop-chrome");
  });
});
