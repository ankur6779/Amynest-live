import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { reversedGoogleWebClientId } from "./google-auth-defaults";
import {
  getGoogleWebClientId,
  isCapacitorNative,
  shouldUseAndroidWebViewGoogleAuth,
  shouldUseCapacitorGoogleAuth,
  shouldUseNativeGoogleAuth,
} from "./google-auth";

function setCapacitorIos(native: boolean) {
  (globalThis as { __capNative?: boolean }).__capNative = native;
  Object.defineProperty(window, "Capacitor", {
    value: {
      isNativePlatform: () =>
        (globalThis as { __capNative?: boolean }).__capNative === true,
      getPlatform: () => "ios",
    },
    configurable: true,
  });
}

describe("google-auth", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: { protocol: "https:", hostname: "amynest.in" },
      Capacitor: undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes default web client id", () => {
    expect(getGoogleWebClientId()).toContain(".apps.googleusercontent.com");
  });

  it("builds reversed client id for iOS URL scheme", () => {
    expect(
      reversedGoogleWebClientId(
        "573340015027-abc.apps.googleusercontent.com",
      ),
    ).toBe("com.googleusercontent.apps.573340015027-abc");
  });

  it("uses Capacitor Google plugin path on iOS only", () => {
    expect(shouldUseCapacitorGoogleAuth()).toBe(false);
    expect(shouldUseAndroidWebViewGoogleAuth()).toBe(false);

    setCapacitorIos(true);
    Object.defineProperty(window, "location", {
      value: { protocol: "capacitor:", hostname: "localhost" },
      configurable: true,
    });

    expect(isCapacitorNative()).toBe(true);
    expect(shouldUseCapacitorGoogleAuth()).toBe(false);
    expect(shouldUseNativeGoogleAuth()).toBe(false);
    expect(shouldUseAndroidWebViewGoogleAuth()).toBe(false);
  });

  it("uses Play Store WebView path for AmyNestAndroid (not Capacitor)", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 AmyNestAndroid/1.0" });
    Object.defineProperty(window, "location", {
      value: { protocol: "https:", hostname: "www.amynest.in" },
      configurable: true,
    });

    expect(shouldUseNativeGoogleAuth()).toBe(false);
    expect(shouldUseAndroidWebViewGoogleAuth()).toBe(true);
  });

  it("rejects malformed id tokens before Firebase credential", async () => {
    const { completeGoogleIdTokenSignIn } = await import("./google-auth");
    await expect(completeGoogleIdTokenSignIn("not-a-jwt")).rejects.toMatchObject({
      code: "auth/argument-error",
    });
  });
});
