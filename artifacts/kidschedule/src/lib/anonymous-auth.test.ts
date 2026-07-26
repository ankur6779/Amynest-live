import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("anonymous-auth guest try-first gating", () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("hides Try First when the guest flag is off (default)", async () => {
    vi.stubEnv("VITE_FF_GUEST_TRY_FIRST", "");
    Object.defineProperty(window.navigator, "userAgent", {
      value: "AmyNestAndroid/1.0",
      configurable: true,
    });
    const mod = await import("./anonymous-auth");
    expect(mod.shouldShowGuestTryFirst()).toBe(false);
  });

  it("hides Try First on web even when the guest flag is on", async () => {
    vi.stubEnv("VITE_FF_GUEST_TRY_FIRST", "1");
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0",
      configurable: true,
    });
    const mod = await import("./anonymous-auth");
    expect(mod.shouldShowGuestTryFirst()).toBe(false);
  });

  it("shows Try First on native shell when the guest flag is on", async () => {
    vi.stubEnv("VITE_FF_GUEST_TRY_FIRST", "1");
    Object.defineProperty(window.navigator, "userAgent", {
      value: "AmyNestAndroid/1.0",
      configurable: true,
    });
    const mod = await import("./anonymous-auth");
    expect(mod.shouldShowGuestTryFirst()).toBe(true);
  });

  it("hides Try First for the rest of the session after markGuestAuthUnavailable", async () => {
    vi.stubEnv("VITE_FF_GUEST_TRY_FIRST", "1");
    Object.defineProperty(window.navigator, "userAgent", {
      value: "AmyNestAndroid/1.0",
      configurable: true,
    });
    const mod = await import("./anonymous-auth");
    expect(mod.shouldShowGuestTryFirst()).toBe(true);
    mod.markGuestAuthUnavailable();
    expect(mod.shouldShowGuestTryFirst()).toBe(false);
  });

  it("does not expose a user-facing try-first unavailable message", async () => {
    const mod = await import("./anonymous-auth");
    const err = new mod.GuestAuthUnavailableError();
    expect(err.message).not.toMatch(/isn't available|isn’t available/i);
    expect(err.message).not.toMatch(/Continue with Google/i);
  });
});

describe("mrr-experiment-flags guest try-first default", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults FF_GUEST_TRY_FIRST to false when unset", async () => {
    vi.stubEnv("VITE_FF_GUEST_TRY_FIRST", "");
    vi.stubEnv("VITE_FF_ACTIVATION_FAST_PATH", "true");
    const mod = await import("./mrr-experiment-flags");
    expect(mod.FF_GUEST_TRY_FIRST).toBe(false);
  });

  it("respects explicit enable", async () => {
    vi.stubEnv("VITE_FF_GUEST_TRY_FIRST", "1");
    const mod = await import("./mrr-experiment-flags");
    expect(mod.FF_GUEST_TRY_FIRST).toBe(true);
  });
});
