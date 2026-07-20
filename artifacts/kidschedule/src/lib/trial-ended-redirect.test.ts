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
    status: "free",
    provider: "none",
    plan: "free",
    internalTrialExpired: true,
    subscriptionState: "EXPIRED",
    ...overrides,
  } as Entitlements;
}

describe("shouldRedirectToTrialEndedFullscreen", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirects expired internal trial from dashboard", () => {
    expect(
      shouldRedirectToTrialEndedFullscreen(expiredEntitlements(), "/dashboard"),
    ).toBe(true);
  });

  it("does not redirect paid subscribers", () => {
    expect(
      shouldRedirectToTrialEndedFullscreen(
        expiredEntitlements({ isPremiumSubscriber: true, isPremium: true }),
        "/dashboard",
      ),
    ).toBe(false);
  });

  it("skips pricing and trial-ended routes", () => {
    expect(
      shouldRedirectToTrialEndedFullscreen(expiredEntitlements(), "/pricing"),
    ).toBe(false);
    expect(
      shouldRedirectToTrialEndedFullscreen(
        expiredEntitlements(),
        "/subscription-trial-ended",
      ),
    ).toBe(false);
  });

  it("respects dismiss cooldown", () => {
    localStorage.setItem(MILESTONES_KEY, String(Date.now()));
    expect(
      shouldRedirectToTrialEndedFullscreen(expiredEntitlements(), "/dashboard"),
    ).toBe(false);
  });
});
