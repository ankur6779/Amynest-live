import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entitlements } from "@/hooks/use-subscription";

vi.mock("@/lib/subscription-feature-flags", () => ({
  FF_TRIAL_ENDED_FULLSCREEN: true,
}));

import { shouldRedirectToTrialEndedFullscreen } from "./trial-ended-redirect";

const MILESTONES_KEY = "amynest:sub:trial_ended_dismissed_at";

function expiredEntitlements(
  overrides: Partial<Entitlements> = {},
): Entitlements {
  return {
    isPremium: false,
    isPremiumSubscriber: false,
    isTrialing: false,
    isTrialActive: false,
    status: "free",
    provider: "none",
    plan: "free",
    internalTrialExpired: true,
    subscriptionState: "EXPIRED",
    ...overrides,
  } as Entitlements;
}

function freeEntitlements(): Entitlements {
  return expiredEntitlements({
    internalTrialExpired: false,
    subscriptionState: "FREE",
  });
}

describe("shouldRedirectToTrialEndedFullscreen", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirects expired internal trial from dashboard when resolved", () => {
    expect(
      shouldRedirectToTrialEndedFullscreen(expiredEntitlements(), "/dashboard", {
        entitlementsResolved: true,
      }),
    ).toBe(true);
  });

  it("never redirects brand-new free users", () => {
    expect(
      shouldRedirectToTrialEndedFullscreen(freeEntitlements(), "/dashboard", {
        entitlementsResolved: true,
      }),
    ).toBe(false);
  });

  it("never redirects while entitlements are unresolved (failsafe)", () => {
    expect(
      shouldRedirectToTrialEndedFullscreen(expiredEntitlements(), "/dashboard", {
        entitlementsResolved: false,
      }),
    ).toBe(false);
  });

  it("does not redirect paid subscribers", () => {
    expect(
      shouldRedirectToTrialEndedFullscreen(
        expiredEntitlements({ isPremiumSubscriber: true, isPremium: true }),
        "/dashboard",
        { entitlementsResolved: true },
      ),
    ).toBe(false);
  });

  it("skips pricing and trial-ended routes", () => {
    expect(
      shouldRedirectToTrialEndedFullscreen(expiredEntitlements(), "/pricing", {
        entitlementsResolved: true,
      }),
    ).toBe(false);
    expect(
      shouldRedirectToTrialEndedFullscreen(
        expiredEntitlements(),
        "/subscription-trial-ended",
        { entitlementsResolved: true },
      ),
    ).toBe(false);
  });

  it("respects dismiss cooldown", () => {
    localStorage.setItem(MILESTONES_KEY, String(Date.now()));
    expect(
      shouldRedirectToTrialEndedFullscreen(expiredEntitlements(), "/dashboard", {
        entitlementsResolved: true,
      }),
    ).toBe(false);
  });
});
