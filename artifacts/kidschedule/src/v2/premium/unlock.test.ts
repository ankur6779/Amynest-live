import { describe, expect, it } from "vitest";
import { FREE_ENTITLEMENTS } from "@/lib/subscription-defaults";
import { isPremiumUnlocked, resolvePremiumSurfaceState } from "./unlock";

describe("Premium unlock (no duplicate entitlement logic)", () => {
  it("reads only entitlements.isPremium", () => {
    expect(isPremiumUnlocked(null)).toBe(false);
    expect(isPremiumUnlocked(FREE_ENTITLEMENTS)).toBe(false);
    expect(
      isPremiumUnlocked({
        ...FREE_ENTITLEMENTS,
        isPremium: true,
        plan: "yearly",
        status: "active",
        provider: "revenuecat",
      }),
    ).toBe(true);
  });

  it("premium persistence reflects subscription entitlements", () => {
    const free = resolvePremiumSurfaceState(FREE_ENTITLEMENTS);
    expect(free.unlocked).toBe(false);

    const premium = resolvePremiumSurfaceState({
      ...FREE_ENTITLEMENTS,
      isPremium: true,
      isPremiumSubscriber: true,
      plan: "yearly",
      status: "active",
      provider: "revenuecat",
    });
    expect(premium.unlocked).toBe(true);
    expect(premium.provider).toBe("revenuecat");
    expect(premium.plan).toBe("yearly");
  });

  it("does not invent unlock from unrelated fields alone", () => {
    // If server says isPremium false, V2 must not unlock from other flags.
    expect(
      isPremiumUnlocked({
        ...FREE_ENTITLEMENTS,
        isPremium: false,
        isTrialActive: true,
        canAccessSpeechCoach: true,
      }),
    ).toBe(false);
  });
});
