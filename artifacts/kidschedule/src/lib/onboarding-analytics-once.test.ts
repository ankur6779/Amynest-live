import { beforeEach, describe, expect, it } from "vitest";
import {
  claimOnboardingEventOnce,
  getOrCreateOnboardingAnalyticsRunKey,
  hasClaimedOnboardingEvent,
  resetOnboardingAnalyticsOnceFlags,
  shouldReportOnboardingAbandoned,
} from "@/lib/onboarding-analytics-once";

describe("onboarding analytics once-guards", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("creates a stable analytics run key for the tab session", () => {
    const a = getOrCreateOnboardingAnalyticsRunKey();
    const b = getOrCreateOnboardingAnalyticsRunKey();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(4);
  });

  it("claims funnel events exactly once across remounts", () => {
    expect(claimOnboardingEventOnce("onboarding_started")).toBe(true);
    expect(claimOnboardingEventOnce("onboarding_started")).toBe(false);
    expect(hasClaimedOnboardingEvent("onboarding_started")).toBe(true);

    expect(claimOnboardingEventOnce("first_question_rendered")).toBe(true);
    expect(claimOnboardingEventOnce("first_question_latency_ms")).toBe(true);
    expect(claimOnboardingEventOnce("first_question_rendered")).toBe(false);
  });

  it("does not treat bfcache pagehide as abandon", () => {
    expect(
      shouldReportOnboardingAbandoned(true, {
        step1Completed: false,
        alreadyAbandoned: false,
        onStep1: true,
      }),
    ).toBe(false);
  });

  it("reports abandon once on real unload while still on step 1", () => {
    expect(
      shouldReportOnboardingAbandoned(false, {
        step1Completed: false,
        alreadyAbandoned: false,
        onStep1: true,
      }),
    ).toBe(true);
    expect(
      shouldReportOnboardingAbandoned(false, {
        step1Completed: true,
        alreadyAbandoned: false,
        onStep1: true,
      }),
    ).toBe(false);
    expect(
      shouldReportOnboardingAbandoned(false, {
        step1Completed: false,
        alreadyAbandoned: true,
        onStep1: true,
      }),
    ).toBe(false);
  });

  it("step_1_duration and abandon are mutually exclusive once claimed", () => {
    expect(claimOnboardingEventOnce("step_1_duration")).toBe(true);
    expect(claimOnboardingEventOnce("onboarding_abandoned")).toBe(true);
    // After complete path claimed duration, abandon path cannot re-claim it.
    expect(claimOnboardingEventOnce("step_1_duration")).toBe(false);
  });

  it("resets once-flags after successful onboarding completion", () => {
    expect(claimOnboardingEventOnce("onboarding_started")).toBe(true);
    resetOnboardingAnalyticsOnceFlags();
    expect(claimOnboardingEventOnce("onboarding_started")).toBe(true);
  });
});
