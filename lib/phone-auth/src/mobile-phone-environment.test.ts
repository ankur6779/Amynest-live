import { describe, expect, it, vi } from "vitest";
import {
  buildPhoneOtpBrowserUrl,
  canRunInAppPhoneRecaptcha,
  isAndroidPwa,
  isMobilePhoneOtpEnvironment,
} from "./mobile-phone-environment";

describe("mobile-phone-environment", () => {
  it("detects mobile UA in jsdom", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile",
      configurable: true,
    });
    expect(isMobilePhoneOtpEnvironment()).toBe(true);
    Object.defineProperty(navigator, "userAgent", {
      value: original,
      configurable: true,
    });
  });

  it("builds browser OTP URL with phone param", () => {
    const url = buildPhoneOtpBrowserUrl("+919876543210", "/sign-in");
    expect(url).toContain("phoneOtp=1");
    expect(url).toContain("phone=%2B919876543210");
    expect(url).toContain("/sign-in");
  });

  it("blocks recaptcha in android PWA when standalone", () => {
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
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
      configurable: true,
    });
    expect(isAndroidPwa()).toBe(true);
    expect(canRunInAppPhoneRecaptcha()).toBe(false);
    vi.unstubAllGlobals();
  });
});
