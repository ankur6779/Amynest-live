import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOnboardingAnalyticsContext,
  childAgeBandLabel,
  trackOnboardingError,
  trackOnboardingFunnel,
} from "@/lib/onboarding-analytics";

const trackFunnel = vi.fn();
const trackError = vi.fn();

vi.mock("@/lib/onboarding-telemetry", () => ({
  getOnboardingRunId: () => "run-test-1",
}));

vi.mock("@/lib/analytics/analytics-service", () => ({
  getAnalyticsService: () => ({
    trackFunnel,
    trackError,
  }),
}));

describe("onboarding analytics", () => {
  beforeEach(() => {
    trackFunnel.mockClear();
    trackError.mockClear();
  });

  it("includes selectedAgeBand in funnel payload", () => {
    trackOnboardingFunnel({
      event: "step_viewed",
      step: "child-dob",
      country: "IN",
      selectedAgeBand: "y4",
      childAgeBand: "y4",
      childAgeYears: 4,
      educationStage: "lkg",
    });

    expect(trackFunnel).toHaveBeenCalledWith(
      "onboarding",
      "step_viewed",
      expect.objectContaining({
        onboarding_step: "child-dob",
        country: "IN",
        child_age_band: "y4",
        education_stage: "lkg",
        child_age_years: 4,
      }),
    );
  });

  it("buildOnboardingAnalyticsContext prefers selectedAgeBand over derived band", () => {
    expect(
      buildOnboardingAnalyticsContext({
        country: "US",
        curr: { age: 4, ageMonths: 0, selectedAgeBand: "y4", educationStage: "school" },
      }),
    ).toEqual({
      country: "US",
      childAgeYears: 4,
      selectedAgeBand: "y4",
      childAgeBand: "y4",
      educationStage: "school",
    });
  });

  it("derives childAgeBand when selectedAgeBand is missing", () => {
    expect(childAgeBandLabel(0, 8)).toBe("under_1");
    expect(
      buildOnboardingAnalyticsContext({
        curr: { age: 6, ageMonths: 0, educationStage: "school" },
      }).childAgeBand,
    ).toBe("y6");
  });

  it("emits dedicated error observability events", () => {
    trackOnboardingError("onboarding_restore_failed", { reason: "version_mismatch" });

    expect(trackError).toHaveBeenCalledWith(
      "api",
      "onboarding_restore_failed",
      expect.objectContaining({ feature: "onboarding" }),
    );
    expect(trackFunnel).toHaveBeenCalledWith(
      "onboarding",
      "onboarding_restore_failed",
      expect.objectContaining({
        onboardingRunId: "run-test-1",
        reason: "version_mismatch",
      }),
    );
  });

  it("accepts step-1 failsafe funnel events", () => {
    for (const event of [
      "onboarding_started",
      "first_question_rendered",
      "first_question_latency_ms",
      "fallback_triggered",
      "ai_timeout",
      "onboarding_step_completed",
      "onboarding_abandoned",
      "step_1_duration",
    ] as const) {
      trackOnboardingFunnel({ event, step: "country-confirm", extra: { latency_ms: 12 } });
    }

    expect(trackFunnel).toHaveBeenCalledWith(
      "onboarding",
      "fallback_triggered",
      expect.objectContaining({
        onboarding_step: "country-confirm",
        latency_ms: 12,
      }),
    );
  });
});
