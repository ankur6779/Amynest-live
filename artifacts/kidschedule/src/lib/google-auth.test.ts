import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { reversedGoogleWebClientId } from "./google-auth-defaults";
import {
  getGoogleWebClientId,
  isCapacitorNative,
  shouldUseNativeGoogleAuth,
} from "./google-auth";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () =>
      (globalThis as { __capNative?: boolean }).__capNative === true,
  },
}));

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

  it("uses native path only in Capacitor native shell", () => {
    expect(shouldUseNativeGoogleAuth()).toBe(false);

    (globalThis as { __capNative?: boolean }).__capNative = true;
    Object.defineProperty(window, "location", {
      value: { protocol: "capacitor:", hostname: "localhost" },
      configurable: true,
    });

    expect(isCapacitorNative()).toBe(true);
    expect(shouldUseNativeGoogleAuth()).toBe(true);
  });
});
