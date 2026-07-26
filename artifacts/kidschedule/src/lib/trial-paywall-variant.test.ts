import { describe, expect, it } from "vitest";
import type { Entitlements } from "@/hooks/use-subscription";
import {
  assertTrialEndedAllowed,
  hasCompletedTrialEvidence,
  resolveTrialPaywallVariant,
  shouldRouteToPostOnboardingFreeTrial,
  shouldShowFreeTrialPaywall,
  shouldShowTrialEndedPaywall,
  trialEndedAssertViolation,
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

describe("trial paywall state machine", () => {
  it("brand new user → free_trial", () => {
    const e = entitlements();
    expect(resolveTrialPaywallVariant(e).variant).toBe("free_trial");
    expect(shouldShowFreeTrialPaywall(e)).toBe(true);
    expect(shouldShowTrialEndedPaywall(e)).toBe(false);
    expect(hasCompletedTrialEvidence(e)).toBe(false);
  });

  it("never subscribed / unknown billing → free_trial (failsafe)", () => {
    expect(resolveTrialPaywallVariant(null).variant).toBe("free_trial");
    expect(
      resolveTrialPaywallVariant(entitlements(), { entitlementsResolved: false }).variant,
    ).toBe("free_trial");
    expect(shouldShowTrialEndedPaywall(null)).toBe(false);
    expect(shouldShowTrialEndedPaywall(entitlements(), { entitlementsResolved: false })).toBe(
      false,
    );
  });

  it("trial eligible (free) → free_trial", () => {
    expect(
      resolveTrialPaywallVariant(entitlements({ status: "free", subscriptionState: "FREE" }))
        .variant,
    ).toBe("free_trial");
  });

  it("soft internal age trial still offers free_trial (Play CTA)", () => {
    const e = entitlements({
      status: "trialing",
      isTrialing: true,
      isTrialActive: true,
      subscriptionState: "TRIAL",
      provider: "none",
      isPremium: false,
    });
    expect(resolveTrialPaywallVariant(e).variant).toBe("free_trial");
    expect(shouldShowTrialEndedPaywall(e)).toBe(false);
  });

  it("store trial active → trial_active", () => {
    expect(
      resolveTrialPaywallVariant(
        entitlements({
          status: "trialing",
          isTrialing: true,
          isTrialActive: true,
          subscriptionState: "TRIAL",
          provider: "revenuecat",
        }),
      ).variant,
    ).toBe("trial_active");
  });

  it("trial expired (natural evidence) → trial_ended", () => {
    const expired = entitlements({
      internalTrialExpired: true,
      subscriptionState: "EXPIRED",
      status: "free",
    });
    expect(resolveTrialPaywallVariant(expired).variant).toBe("trial_ended");
    expect(shouldShowTrialEndedPaywall(expired)).toBe(true);
    expect(hasCompletedTrialEvidence(expired)).toBe(true);
  });

  it("bare EXPIRED without internalTrialExpired → free_trial (heal false-positive)", () => {
    const falseExpired = entitlements({
      status: "free",
      subscriptionState: "EXPIRED",
      internalTrialExpired: false,
    });
    expect(resolveTrialPaywallVariant(falseExpired).variant).toBe("free_trial");
    expect(shouldShowTrialEndedPaywall(falseExpired)).toBe(false);
    expect(hasCompletedTrialEvidence(falseExpired)).toBe(false);
  });

  it("active subscriber → subscriber", () => {
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

  it("offline / billing timeout / RC unavailable / backend unavailable → free_trial", () => {
    // Unresolved entitlements cover offline, timeout, RC down, API down.
    const cases = [
      resolveTrialPaywallVariant(null),
      resolveTrialPaywallVariant(undefined),
      resolveTrialPaywallVariant(entitlements(), { entitlementsResolved: false }),
    ];
    for (const decision of cases) {
      expect(decision.variant).toBe("free_trial");
      expect(decision.reason).toBe("billing_unknown_assume_eligible");
    }
  });

  it("post-onboarding routing ignores canStartTrial — non-subscribers get free trial", () => {
    expect(
      shouldRouteToPostOnboardingFreeTrial({
        featureEnabled: true,
        alreadySeen: false,
        isPremiumSubscriber: false,
      }),
    ).toBe(true);
    expect(
      shouldRouteToPostOnboardingFreeTrial({
        featureEnabled: true,
        alreadySeen: false,
        isPremiumSubscriber: true,
      }),
    ).toBe(false);
    expect(
      shouldRouteToPostOnboardingFreeTrial({
        featureEnabled: true,
        alreadySeen: true,
        isPremiumSubscriber: false,
      }),
    ).toBe(false);
  });

  it("DEV assert violation when Trial Ended UI attempted without evidence", () => {
    expect(
      trialEndedAssertViolation(entitlements({ subscriptionState: "EXPIRED" }), {
        entitlementsResolved: true,
        surface: "test",
      }),
    ).toMatch(/Trial Ended paywall blocked/);
  });

  it("assert is a no-op while entitlements are unresolved", () => {
    expect(
      trialEndedAssertViolation(null, { entitlementsResolved: false, surface: "test" }),
    ).toBeNull();
    expect(() =>
      assertTrialEndedAllowed(null, { entitlementsResolved: false, surface: "test" }),
    ).not.toThrow();
  });

  it("assert allows naturally completed trials", () => {
    expect(
      trialEndedAssertViolation(
        entitlements({ internalTrialExpired: true, subscriptionState: "EXPIRED" }),
        { entitlementsResolved: true, surface: "test" },
      ),
    ).toBeNull();
  });
});
