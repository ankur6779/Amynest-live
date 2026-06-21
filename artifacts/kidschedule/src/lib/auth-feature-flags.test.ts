import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  shouldShowFacebookSignIn,
  shouldShowGoogleSignIn,
  shouldShowPhoneOtp,
} from "./auth-feature-flags";

function setCapacitorPlatform(
  platform: "ios" | "android" | undefined,
  plugins: string[] = [],
) {
  Object.defineProperty(window, "Capacitor", {
    value: platform
      ? {
          isNativePlatform: () => true,
          getPlatform: () => platform,
          isPluginAvailable: (name: string) => plugins.includes(name),
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
    setCapacitorPlatform("ios", ["GoogleAuth", "FacebookLogin"]);

    expect(shouldShowGoogleSignIn()).toBe(true);
    expect(shouldShowFacebookSignIn()).toBe(true);
    expect(shouldShowPhoneOtp()).toBe(false);
  });

  it("hides iOS native providers until their plugins are registered", () => {
    setCapacitorPlatform("ios", ["FacebookLogin"]);

    expect(shouldShowGoogleSignIn()).toBe(false);
    expect(shouldShowFacebookSignIn()).toBe(true);
    expect(shouldShowPhoneOtp()).toBe(false);

    setCapacitorPlatform("ios", ["GoogleAuth"]);
    expect(shouldShowGoogleSignIn()).toBe(true);
    expect(shouldShowFacebookSignIn()).toBe(false);
  });

  it("hides phone OTP on Android auth surfaces", () => {
    setCapacitorPlatform("android");
    expect(shouldShowPhoneOtp()).toBe(false);
  });

  it("hides phone OTP on regular web", () => {
    setCapacitorPlatform(undefined);
    expect(shouldShowPhoneOtp()).toBe(false);
  });
});
