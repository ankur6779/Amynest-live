import {
  CHILD_JOURNEY_STEP_COMPLETE_EVENT,
  CHILD_JOURNEY_STEP_VIEW_EVENT,
  type ChildJourneyEventName,
  type ChildJourneyOnboardingStep,
} from "@workspace/analytics-taxonomy";
import type { OnboardingStep } from "@/lib/onboarding-chat-types";
import { getFirebaseAuth } from "@/lib/firebase";
import { getTotalMonths } from "@workspace/education-stages";
import { getStartupFunnelContext } from "@/lib/startup-funnel/context";
import {
  enqueueStartupFunnelEvent,
  flushStartupFunnelQueue,
} from "@/lib/startup-funnel/queue";
import { resolveOnboardingShortBranchVariant } from "@/lib/onboarding-conversion-flags";

const CHILD_JOURNEY_STEPS = new Set<ChildJourneyOnboardingStep>(
  Object.keys(CHILD_JOURNEY_STEP_VIEW_EVENT) as ChildJourneyOnboardingStep[],
);

const stepEnteredAtMs = new Map<ChildJourneyOnboardingStep, number>();
const firedKeys = new Set<string>();
let visibilityInstalled = false;
let activeStep: ChildJourneyOnboardingStep | null = null;

export type ChildJourneyTelemetryContext = {
  childAgeYears?: number;
  childAgeMonths?: number;
  educationStage?: string;
  experimentVariant?: string;
  restored?: boolean;
  skipped?: boolean;
  skipReason?: string;
};

/** Age buckets for Phase 4 segmentation (production SQL). */
export function childAgeGroupLabel(years?: number, months?: number): string {
  const y = years ?? 0;
  const m = months ?? 0;
  const total = getTotalMonths(y, m);
  if (total < 6) return "0_6_months";
  if (total < 12) return "6_12_months";
  if (total < 24) return "1_2_years";
  if (total < 36) return "2_3_years";
  if (total < 60) return "3_5_years";
  if (total < 96) return "5_8_years";
  if (total < 120) return "8_10_years";
  return "10_plus_years";
}

function readAuthProvider(): string {
  try {
    const user = getFirebaseAuth().currentUser;
    if (!user) return "unsigned";
    const provider = user.providerData[0]?.providerId;
    return provider ?? "unknown";
  } catch {
    return "unknown";
  }
}

function isChildJourneyStep(step: OnboardingStep): step is ChildJourneyOnboardingStep {
  return CHILD_JOURNEY_STEPS.has(step as ChildJourneyOnboardingStep);
}

function milestoneKey(eventName: string, sessionId: string, step: string): string {
  return `${sessionId}:${eventName}:${step}`;
}

function emitChildJourneyEvent(
  eventName: ChildJourneyEventName,
  step: ChildJourneyOnboardingStep,
  ctx: ChildJourneyTelemetryContext,
  dwellMs?: number,
): void {
  if (typeof window === "undefined") return;

  const funnelCtx = getStartupFunnelContext();
  const key = milestoneKey(eventName, funnelCtx.session_id, step);
  if (firedKeys.has(key)) return;
  firedKeys.add(key);

  enqueueStartupFunnelEvent({
    event_name: eventName,
    event_type: "milestone",
    client_ts: Date.now(),
    elapsed_ms: dwellMs ?? 0,
    startup_phase: "onboarding_child_journey",
    ...funnelCtx,
    meta: {
      onboarding_step: step,
      child_age_group: childAgeGroupLabel(ctx.childAgeYears, ctx.childAgeMonths),
      auth_provider: readAuthProvider(),
      education_stage: ctx.educationStage ?? null,
      experiment_variant: ctx.experimentVariant ?? resolveOnboardingShortBranchVariant(),
      restored: ctx.restored ?? false,
      skipped: ctx.skipped ?? false,
      skip_reason: ctx.skipReason ?? null,
      background_exit: false,
    },
  });
  void flushStartupFunnelQueue();
}

export function initChildJourneyTelemetry(): void {
  if (visibilityInstalled || typeof document === "undefined") return;
  visibilityInstalled = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden" || !activeStep) return;
    const funnelCtx = getStartupFunnelContext();
    const entered = stepEnteredAtMs.get(activeStep);
    enqueueStartupFunnelEvent({
      event_name: "child_journey_background",
      event_type: "milestone",
      client_ts: Date.now(),
      elapsed_ms: entered != null ? Math.max(0, Date.now() - entered) : 0,
      startup_phase: "onboarding_child_journey",
      ...funnelCtx,
      meta: {
        onboarding_step: activeStep,
        auth_provider: readAuthProvider(),
        anomaly: "app_background",
        child_journey_background: true,
      },
    });
    void flushStartupFunnelQueue();
  });
}

export function trackChildJourneyView(
  step: OnboardingStep,
  ctx: ChildJourneyTelemetryContext = {},
): void {
  if (!isChildJourneyStep(step)) return;
  activeStep = step;
  stepEnteredAtMs.set(step, Date.now());
  emitChildJourneyEvent(CHILD_JOURNEY_STEP_VIEW_EVENT[step], step, ctx, 0);
}

export function trackChildJourneyComplete(
  step: OnboardingStep,
  ctx: ChildJourneyTelemetryContext = {},
): void {
  if (!isChildJourneyStep(step)) return;
  const entered = stepEnteredAtMs.get(step);
  const dwellMs = entered != null ? Math.max(0, Date.now() - entered) : undefined;
  emitChildJourneyEvent(CHILD_JOURNEY_STEP_COMPLETE_EVENT[step], step, ctx, dwellMs);
  stepEnteredAtMs.delete(step);
  if (activeStep === step) activeStep = null;
}

/** Mark intermediate steps skipped (e.g. short-branch experiment) without completing them. */
export function trackChildJourneySkipped(
  steps: ChildJourneyOnboardingStep[],
  reason: string,
  ctx: ChildJourneyTelemetryContext = {},
): void {
  for (const step of steps) {
    trackChildJourneyView(step, { ...ctx, skipped: true, skipReason: reason });
  }
}

export function resetChildJourneyTelemetryForTests(): void {
  stepEnteredAtMs.clear();
  firedKeys.clear();
  activeStep = null;
  visibilityInstalled = false;
}
