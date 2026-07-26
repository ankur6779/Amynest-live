import { describe, expect, it } from "vitest";
import type { Entitlements } from "@/hooks/use-subscription";
import {
  resolveTrialPaywallVariant,
  shouldShowFreeTrialPaywall,
  shouldShowTrialEndedPaywall,
} from "@/lib/trial-paywall-variant";

function entitlements(partial: Partial<Entitlements> = {}): Entitlements {
  return {
    plan: "free",
    status: "free",
    isPremium: false,
    isPremiumSubscriber: false,
    isTrialing: false,
    isTrialActive: false,
    provider: "none",
    subscriptionState: "FREE",
    internalTrialExpired: false,
    ...partial,
  } as Entitlements;
}

describe("trial paywall variant", () => {
  it("assumes free trial when billing is unknown (failsafe)", () => {
    expect(resolveTrialPaywallVariant(null).variant).toBe("free_trial");
    expect(
      resolveTrialPaywallVariant(entitlements(), { entitlementsResolved: false }).variant,
    ).toBe("free_trial");
    expect(shouldShowTrialEndedPaywall(null)).toBe(false);
    expect(shouldShowFreeTrialPaywall(null)).toBe(true);
  });

  it("shows free trial for brand-new never-trialed users", () => {
    const decision = resolveTrialPaywallVariant(entitlements());
    expect(decision.variant).toBe("free_trial");
    expect(shouldShowTrialEndedPaywall(entitlements())).toBe(false);
    expect(shouldShowFreeTrialPaywall(entitlements())).toBe(true);
  });

  it("shows trial_active while trialing", () => {
    expect(
      resolveTrialPaywallVariant(
        entitlements({
          status: "trialing",
          isTrialing: true,
          isTrialActive: true,
          subscriptionState: "TRIAL",
        }),
      ).variant,
    ).toBe("trial_active");
  });

  it("shows trial_ended only for server-confirmed expiry", () => {
    const expired = entitlements({
      internalTrialExpired: true,
      subscriptionState: "EXPIRED",
    });
    expect(resolveTrialPaywallVariant(expired).variant).toBe("trial_ended");
    expect(shouldShowTrialEndedPaywall(expired)).toBe(true);
    expect(shouldShowFreeTrialPaywall(expired)).toBe(false);
  });

  it("never shows trial_ended for active subscribers", () => {
    expect(
      resolveTrialPaywallVariant(
        entitlements({
          isPremiumSubscriber: true,
          isPremium: true,
          status: "active",
          internalTrialExpired: true,
        }),
      ).variant,
    ).toBe("subscriber");
  });
});
