import { describe, expect, it, vi } from "vitest";
import {
  buildPhoneOtpBrowserUrl,
  canRunInAppPhoneRecaptcha,
  isAmyNestNativeWrapper,
  isStandalonePwa,
} from "./mobile-phone-environment";

describe("mobile-phone-environment", () => {
  it("builds browser OTP URL with phone param", () => {
    const url = buildPhoneOtpBrowserUrl("+919876543210", "/sign-in");
    expect(url).toContain("phoneOtp=1");
    expect(url).toContain("phone=%2B919876543210");
    expect(url).toContain("/sign-in");
  });

  it("blocks recaptcha in standalone PWA without native wrapper", () => {
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
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 Android" });
    vi.stubGlobal("window", { ...globalThis.window });
    expect(isAmyNestNativeWrapper()).toBe(false);
    expect(isStandalonePwa()).toBe(true);
    expect(canRunInAppPhoneRecaptcha()).toBe(false);
    vi.unstubAllGlobals();
  });

  it("allows recaptcha in AmyNest native wrapper even when standalone media matches", () => {
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
    vi.stubGlobal("navigator", { userAgent: "AmyNestAndroid/1.0" });
    vi.stubGlobal("window", {
      ...globalThis.window,
      __AMYNEST_WRAPPER: "1.4.1",
      AmyNestPushNative: {},
    });
    expect(isAmyNestNativeWrapper()).toBe(true);
    expect(canRunInAppPhoneRecaptcha()).toBe(true);
    vi.unstubAllGlobals();
  });
});
