import { describe, expect, it, vi } from "vitest";
import {
  buildPhoneOtpBrowserUrl,
  canRunInAppPhoneRecaptcha,
  isStandalonePwa,
} from "./mobile-phone-environment";

describe("mobile-phone-environment", () => {
  it("builds browser OTP URL with phone param", () => {
    const url = buildPhoneOtpBrowserUrl("+919876543210", "/sign-in");
    expect(url).toContain("phoneOtp=1");
    expect(url).toContain("phone=%2B919876543210");
    expect(url).toContain("/sign-in");
  });

  it("blocks recaptcha in standalone PWA", () => {
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
    expect(isStandalonePwa()).toBe(true);
    expect(canRunInAppPhoneRecaptcha()).toBe(false);
    vi.unstubAllGlobals();
  });
});
