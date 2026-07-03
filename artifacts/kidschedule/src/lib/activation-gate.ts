import type { PaywallReason } from "@/contexts/paywall-context";
import { hasOnboardingMilestone } from "@/lib/retention-engine";

/** Soft premium gates — defer until the user has generated at least one routine. */
const PRE_ACTIVATION_DEFER_REASONS = new Set<PaywallReason>([
  "hub_locked",
  "hub_journey",
  "feature",
  "section_locked",
  "learning_locked",
  "behavior_locked",
  "coach_locked",
  "phonics_workbook",
  "hub_nutrition",
  "nutrition_library",
  "audio_lessons",
  "speech_coach",
  "premium_insight",
  "personalized_coaching",
]);

export const ACTIVATION_ROUTINE_GENERATE_HREF = "/routines/generate";

export function hasFirstRoutineActivationProgress(
  routineCount = 0,
): boolean {
  return (
    routineCount > 0 ||
    hasOnboardingMilestone("first_routine_created") ||
    hasOnboardingMilestone("first_routine_generated")
  );
}

export function shouldDeferPaywallForActivation(
  reason: PaywallReason,
  routineCount = 0,
): boolean {
  if (hasFirstRoutineActivationProgress(routineCount)) return false;
  return PRE_ACTIVATION_DEFER_REASONS.has(reason);
}

export function shouldBypassRoutineGeneratePaywall(
  routineCount: number,
): boolean {
  return !hasFirstRoutineActivationProgress(routineCount);
}
