import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getAppleRedirectUri } from "./apple-auth-defaults";
import {
  isAppleCallbackPath,
  isAppleSignInAvailable,
  shouldUseNativeAppleAuth,
} from "./apple-auth";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () =>
      (globalThis as { __capNative?: boolean }).__capNative === true,
    getPlatform: () =>
      (globalThis as { __capPlatform?: string }).__capPlatform ?? "web",
  },
}));

describe("apple-auth", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "amynest.in",
        pathname: "/auth/apple/callback",
        origin: "https://amynest.in",
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as { __capNative?: boolean }).__capNative;
    delete (globalThis as { __capPlatform?: string }).__capPlatform;
  });

  it("builds redirect URI from origin", () => {
    expect(getAppleRedirectUri()).toBe(
      "https://amynest.in/auth/apple/callback",
    );
  });

  it("detects apple callback path", () => {
    expect(isAppleCallbackPath()).toBe(true);
  });

  it("uses native path on Capacitor iOS", () => {
    (globalThis as { __capNative?: boolean }).__capNative = true;
    (globalThis as { __capPlatform?: string }).__capPlatform = "ios";
    Object.defineProperty(window, "location", {
      value: { protocol: "capacitor:", hostname: "localhost", pathname: "/" },
      configurable: true,
    });
    expect(shouldUseNativeAppleAuth()).toBe(true);
  });

  it("hides web apple button when client id is unset", () => {
    expect(isAppleSignInAvailable()).toBe(false);
  });
});
