import { describe, expect, it, afterEach } from "vitest";
import {
  isMobilePhoneOtpEnvironment,
  shouldPreRenderPhoneRecaptcha,
} from "./mobile-phone-environment";

describe("isMobilePhoneOtpEnvironment", () => {
  const originalUa = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUa,
      configurable: true,
    });
  });

  it("detects iPhone user agents", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    expect(isMobilePhoneOtpEnvironment()).toBe(true);
    expect(shouldPreRenderPhoneRecaptcha()).toBe(false);
  });
});
