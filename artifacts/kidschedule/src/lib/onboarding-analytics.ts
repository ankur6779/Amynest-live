import { getOnboardingRunId } from "@/lib/onboarding-telemetry";
import { getAnalyticsService } from "@/lib/analytics/analytics-service";
import type { OnboardingStep } from "@/lib/onboarding-chat-types";

export type OnboardingFunnelEvent =
  | "onboarding_started"
  | "first_question_rendered"
  | "first_question_latency_ms"
  | "fallback_triggered"
  | "ai_timeout"
  | "onboarding_step_completed"
  | "onboarding_abandoned"
  | "step_1_duration"
  | "step_viewed"
  | "step_completed"
  | "step_skipped"
  | "step_abandoned"
  | "finish_clicked"
  | "finish_success"
  | "onboarding_completed"
  | "finish_failed"
  | "back_navigation"
  | "back_pressed"
  | "skip_used";

export type OnboardingErrorEvent =
  | "onboarding_save_failed"
  | "onboarding_restore_failed"
  | "onboarding_validation_failed";

export type OnboardingFunnelPayload = {
  event: OnboardingFunnelEvent;
  step: OnboardingStep | string;
  country?: string;
  childAgeYears?: number;
  childAgeBand?: string;
  selectedAgeBand?: string;
  educationStage?: string;
  extra?: Record<string, string | number | boolean>;
};

export type OnboardingAnalyticsChildSlice = {
  age?: number;
  ageMonths?: number;
  selectedAgeBand?: string;
  educationStage?: string;
};

export function childAgeBandLabel(years?: number, months?: number): string | undefined {
  if (years == null && months == null) return undefined;
  const y = years ?? 0;
  if (y === 0) return "under_1";
  if (y >= 8) return "8_plus";
  return `y${y}`;
}

export function buildOnboardingAnalyticsContext(input: {
  country?: string;
  curr?: OnboardingAnalyticsChildSlice;
  children?: OnboardingAnalyticsChildSlice[];
}): Pick<
  OnboardingFunnelPayload,
  "country" | "childAgeYears" | "childAgeBand" | "selectedAgeBand" | "educationStage"
> {
  const child = input.curr ?? input.children?.[0];
  const years = child?.age;
  const months = child?.ageMonths;
  const selectedAgeBand = child?.selectedAgeBand;
  return {
    country: input.country,
    childAgeYears: years,
    selectedAgeBand,
    childAgeBand: selectedAgeBand ?? childAgeBandLabel(years, months),
    educationStage: child?.educationStage,
  };
}

export function trackAddSecondChildIntent(source: string, existingChildCount = 1): void {
  getAnalyticsService().trackFunnel("onboarding", "add_second_child_intent", {
    source,
    existingChildCount,
  });
  if (import.meta.env.DEV) {
    console.info("[onboarding-funnel] add_second_child_intent", { source, existingChildCount });
  }
}

export function trackOnboardingError(
  event: OnboardingErrorEvent,
  metadata: Record<string, unknown> = {},
): void {
  getAnalyticsService().trackError("api", event, {
    feature: "onboarding",
  });
  getAnalyticsService().trackFunnel("onboarding", event, {
    onboardingRunId: getOnboardingRunId() ?? undefined,
    ...Object.fromEntries(
      Object.entries(metadata).map(([k, v]) => [k, String(v)]),
    ),
  });

  if (import.meta.env.DEV) {
    console.warn("[onboarding-error]", event, metadata);
  }
}

export function trackOnboardingFunnel(payload: OnboardingFunnelPayload): void {
  getAnalyticsService().trackFunnel("onboarding", payload.event, {
    onboarding_step: payload.step,
    country: payload.country,
    child_age_band: payload.childAgeBand ?? payload.selectedAgeBand,
    education_stage: payload.educationStage,
    child_age_years: payload.childAgeYears,
    ...payload.extra,
  });

  if (payload.event === "onboarding_completed") {
    import("@/lib/analytics").then(({ track }) => {
      track("onboarding_milestone", { milestone: "completed" });
    });
  }

  if (import.meta.env.DEV) {
    console.info("[onboarding-funnel]", payload);
  }
}
