import type { PaywallReason } from "@/contexts/paywall-context";
import { hasOnboardingMilestone } from "@/lib/retention-engine";
import {
  ensureFirstOpenTimestamp,
  getPaywallDeferCount,
  hasFirstRoutineActivatedFlag,
} from "@/lib/subscription-funnel-storage";

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
  "speech_coach",
  "premium_insight",
  "personalized_coaching",
]);

/** Stop forever-deferring soft locks after this many redirects. */
export const PAYWALL_DEFER_MAX_COUNT = 5;

/** Stop forever-deferring soft locks after this age since first open. */
export const PAYWALL_DEFER_MAX_AGE_MS = 72 * 60 * 60 * 1000;

export const ACTIVATION_ROUTINE_GENERATE_HREF = "/routines/generate";

export function hasFirstRoutineActivationProgress(
  routineCount = 0,
): boolean {
  return (
    routineCount > 0 ||
    hasFirstRoutineActivatedFlag() ||
    hasOnboardingMilestone("first_routine_created") ||
    hasOnboardingMilestone("first_routine_generated")
  );
}

/**
 * Soft paywalls defer to first-routine activation — but never forever.
 * After N defers or 72h since first open, show the real paywall.
 */
export function hasExceededPaywallDeferBudget(): boolean {
  if (getPaywallDeferCount() >= PAYWALL_DEFER_MAX_COUNT) return true;
  const firstOpen = ensureFirstOpenTimestamp();
  return Date.now() - firstOpen >= PAYWALL_DEFER_MAX_AGE_MS;
}

export function shouldDeferPaywallForActivation(
  reason: PaywallReason,
  routineCount = 0,
): boolean {
  if (hasFirstRoutineActivationProgress(routineCount)) return false;
  if (!PRE_ACTIVATION_DEFER_REASONS.has(reason)) return false;
  if (hasExceededPaywallDeferBudget()) return false;
  return true;
}

export function shouldBypassRoutineGeneratePaywall(
  routineCount: number,
): boolean {
  return !hasFirstRoutineActivationProgress(routineCount);
}
