import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildPhoneOtpBrowserUrl,
  canRunInAppPhoneRecaptcha,
  isNativePhoneAuthShell,
  isStandalonePwa,
  shouldSuggestBrowserOtpFallback,
  shouldUseBrowserForPhoneOtp,
} from "./mobile-phone-environment";

describe("mobile-phone-environment", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/131 Mobile",
      maxTouchPoints: 5,
      standalone: false,
    });
    vi.stubGlobal("location", { protocol: "https:", hostname: "www.amynest.in" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds browser OTP URL with phone param", () => {
    const url = buildPhoneOtpBrowserUrl("+919876543210", "/sign-in");
    expect(url).toContain("phoneOtp=1");
    expect(url).toContain("phone=%2B919876543210");
    expect(url).toContain("/sign-in");
  });

  it("detects Capacitor native shell", () => {
    vi.stubGlobal("window", {
      Capacitor: { isNativePlatform: () => true },
      matchMedia: () => ({ matches: false }),
    });
    expect(isNativePhoneAuthShell()).toBe(true);
    expect(shouldUseBrowserForPhoneOtp()).toBe(false);
    expect(canRunInAppPhoneRecaptcha()).toBe(true);
  });

  it("detects AmyNest Android WebView via UA", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36 AmyNestAndroid/1.1.0",
      maxTouchPoints: 5,
    });
    vi.stubGlobal("window", {
      matchMedia: (q: string) => ({ matches: q.includes("standalone") }),
    });
    expect(isNativePhoneAuthShell()).toBe(true);
    expect(isStandalonePwa()).toBe(false);
    expect(shouldSuggestBrowserOtpFallback()).toBe(false);
  });

  it("allows in-app recaptcha in standalone PWA (browser fallback optional only)", () => {
    const mm = vi.fn((q: string) => ({
      matches: q.includes("standalone"),
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.stubGlobal("matchMedia", mm);
    vi.stubGlobal("window", { matchMedia: mm });
    expect(isStandalonePwa()).toBe(true);
    expect(canRunInAppPhoneRecaptcha()).toBe(true);
    expect(shouldUseBrowserForPhoneOtp()).toBe(false);
    expect(shouldSuggestBrowserOtpFallback()).toBe(true);
  });
});
