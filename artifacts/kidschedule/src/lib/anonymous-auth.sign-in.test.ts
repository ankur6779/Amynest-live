import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateAfterAuth = vi.fn();
const signInAnonymously = vi.fn();
const getFirebaseAuth = vi.fn(() => ({ app: "mock" }));

vi.mock("@/lib/auth-navigation", () => ({
  navigateAfterAuth: (...args: unknown[]) => navigateAfterAuth(...args),
}));

vi.mock("@/lib/firebase", () => ({
  getFirebaseAuth: () => getFirebaseAuth(),
}));

vi.mock("firebase/auth", () => ({
  signInAnonymously: (...args: unknown[]) => signInAnonymously(...args),
}));

describe("signInAsGuest", () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
    navigateAfterAuth.mockReset();
    signInAnonymously.mockReset();
    getFirebaseAuth.mockClear();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    sessionStorage.clear();
  });

  it("creates an anonymous session and navigates to onboarding when enabled", async () => {
    vi.stubEnv("VITE_FF_GUEST_TRY_FIRST", "1");
    signInAnonymously.mockResolvedValue({ user: { isAnonymous: true } });
    const mod = await import("./anonymous-auth");
    await mod.signInAsGuest();
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(navigateAfterAuth).toHaveBeenCalledWith("/onboarding");
  });

  it("marks guest unavailable and throws when Firebase anonymous auth is disabled", async () => {
    vi.stubEnv("VITE_FF_GUEST_TRY_FIRST", "1");
    Object.defineProperty(window.navigator, "userAgent", {
      value: "AmyNestAndroid/1.0",
      configurable: true,
    });
    signInAnonymously.mockRejectedValue({ code: "auth/operation-not-allowed" });
    const mod = await import("./anonymous-auth");
    await expect(mod.signInAsGuest()).rejects.toBeInstanceOf(
      mod.GuestAuthUnavailableError,
    );
    expect(mod.shouldShowGuestTryFirst()).toBe(false);
    expect(navigateAfterAuth).not.toHaveBeenCalled();
  });

  it("refuses guest sign-in when the feature flag is off", async () => {
    vi.stubEnv("VITE_FF_GUEST_TRY_FIRST", "0");
    const mod = await import("./anonymous-auth");
    await expect(mod.signInAsGuest()).rejects.toBeInstanceOf(
      mod.GuestAuthUnavailableError,
    );
    expect(signInAnonymously).not.toHaveBeenCalled();
  });
});
