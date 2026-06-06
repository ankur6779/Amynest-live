import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOnboardingAnalyticsContext,
  childAgeBandLabel,
  trackOnboardingError,
  trackOnboardingFunnel,
} from "@/lib/onboarding-analytics";

const queueClientLog = vi.fn();

vi.mock("@/lib/client-logs", () => ({
  queueClientLog: (...args: unknown[]) => queueClientLog(...args),
}));

vi.mock("@/lib/onboarding-telemetry", () => ({
  getOnboardingRunId: () => "run-test-1",
}));

describe("onboarding analytics", () => {
  beforeEach(() => {
    queueClientLog.mockClear();
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

    expect(queueClientLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "onboarding_funnel",
        meta: expect.objectContaining({
          event: "step_viewed",
          country: "IN",
          selectedAgeBand: "y4",
          childAgeBand: "y4",
          educationStage: "lkg",
          onboardingRunId: "run-test-1",
        }),
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

    expect(queueClientLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "onboarding_error",
        message: "onboarding_restore_failed",
        meta: expect.objectContaining({
          event: "onboarding_restore_failed",
          reason: "version_mismatch",
        }),
      }),
    );
  });
});
