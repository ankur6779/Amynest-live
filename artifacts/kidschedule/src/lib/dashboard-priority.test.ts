import { describe, expect, it } from "vitest";
import {
  resolveDashboardUserState,
  shouldShowActivationResumeBanner,
  shouldShowFeatureDiscovery,
  timelineFlexOrderClass,
} from "@/lib/dashboard-priority";
import type { Entitlements } from "@/hooks/use-subscription";

const internalTrial: Entitlements = {
  isPremium: true,
  isTrialing: true,
  isPremiumSubscriber: false,
  provider: "none",
  subscriptionState: "TRIAL",
  internalTrialExpired: false,
  trialEndsAt: new Date(Date.now() + 86400000).toISOString(),
};

describe("dashboard-priority", () => {
  it("restores DOM order on mobile when priority flag is on", () => {
    expect(timelineFlexOrderClass(true)).toBe("");
    expect(timelineFlexOrderClass(false)).toBe("order-1 md:order-none");
  });

  it("hides duplicate activation resume when retention is ready", () => {
    const resume = {
      routineId: 1,
      href: "/routines/1",
      done: 1,
      total: 3,
      updatedAt: new Date().toISOString(),
    };
    expect(
      shouldShowActivationResumeBanner(true, resume, true),
    ).toBe(false);
    expect(
      shouldShowActivationResumeBanner(true, resume, false),
    ).toBe(true);
  });

  it("hides feature discovery for engaged routine states", () => {
    expect(
      shouldShowFeatureDiscovery(true, "has_routine_incomplete"),
    ).toBe(false);
    expect(shouldShowFeatureDiscovery(true, "no_routine")).toBe(true);
  });

  it("resolves routine_completed_today state", () => {
    expect(
      resolveDashboardUserState({
        hasTodayRoutine: true,
        todayDone: 5,
        todayTotal: 5,
        checkedInToday: true,
        entitlements: internalTrial,
        trialDaysRemaining: 3,
      }),
    ).toBe("routine_completed_today");
  });
});
