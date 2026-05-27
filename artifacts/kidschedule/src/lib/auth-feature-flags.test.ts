import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  shouldShowFacebookSignIn,
  shouldShowGoogleSignIn,
  shouldShowPhoneOtp,
} from "./auth-feature-flags";

function setCapacitorPlatform(platform: "ios" | "android" | undefined) {
  Object.defineProperty(window, "Capacitor", {
    value: platform
      ? {
          isNativePlatform: () => true,
          getPlatform: () => platform,
        }
      : undefined,
    configurable: true,
  });
}

describe("auth-feature-flags", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows OAuth providers and hides phone OTP in Capacitor iOS", () => {
    setCapacitorPlatform("ios");

    expect(shouldShowGoogleSignIn()).toBe(true);
    expect(shouldShowFacebookSignIn()).toBe(true);
    expect(shouldShowPhoneOtp()).toBe(false);
  });

  it("keeps phone OTP visible outside Capacitor iOS", () => {
    setCapacitorPlatform(undefined);
    expect(shouldShowPhoneOtp()).toBe(true);

    setCapacitorPlatform("android");
    expect(shouldShowPhoneOtp()).toBe(true);
  });
});
