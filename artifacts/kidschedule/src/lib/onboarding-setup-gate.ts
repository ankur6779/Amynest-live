import { loadOnboardingChatSession } from "@/lib/onboarding-chat-session";
import { isOnboardingStrictCompleteGateEnabled } from "@/lib/onboarding-conversion-flags";
import { isSetupComplete, type SetupStatus } from "@/lib/setup-status";

const ACTIVE_RESUME_STEPS = new Set([
  "country-confirm",
  "child-name",
  "child-dob",
  "child-birthday",
  "infant-feeding",
  "infant-sleep",
  "child-education-stage",
  "child-class-grade",
  "child-schedule-known",
  "child-school-start",
  "child-school-end",
  "child-school-days",
  "child-wake",
  "child-sleep",
  "parent-name",
  "parent-role",
  "parent-work",
  "parent-region",
  "parent-diet",
  "parent-goals",
  "parent-allergies",
  "saving",
]);

/** Whether the onboarding page should redirect away to the app shell. */
export function shouldSkipOnboardingPage(status: SetupStatus | undefined): boolean {
  if (!status) return false;
  if (isOnboardingStrictCompleteGateEnabled()) {
    return status.onboardingComplete === true;
  }
  return isSetupComplete(status);
}

/** Saved chat session indicates the user is mid-flow — do not auto-redirect. */
export function hasActiveOnboardingChatSession(): boolean {
  const session = loadOnboardingChatSession();
  const step = session?.step;
  if (!step || step === "intro" || step === "done" || step === "notifications") {
    return false;
  }
  return ACTIVE_RESUME_STEPS.has(step);
}
