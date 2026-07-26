/**
 * Lifecycle-safe session persistence for onboarding chat.
 * Sync flush on pagehide/visibility so process kill never loses Step 1 progress.
 */
import {
  saveOnboardingChatSession,
  type OnboardingSessionData,
} from "@/lib/onboarding-chat-session";
import type { OnboardingStep } from "@/lib/onboarding-chat-types";

export type OnboardingFlushSnapshot = OnboardingSessionData & { step: OnboardingStep };

const CHAT_STEPS = new Set<OnboardingStep>([
  "intro",
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
]);

export function canFlushOnboardingStep(step: OnboardingStep): boolean {
  return CHAT_STEPS.has(step);
}

export function flushOnboardingSessionSnapshot(snapshot: OnboardingFlushSnapshot): boolean {
  if (!canFlushOnboardingStep(snapshot.step)) return false;
  try {
    saveOnboardingChatSession(snapshot);
    return true;
  } catch {
    return false;
  }
}

/** Initial seed must hit storage synchronously — do not wait for the 400ms debounce. */
export function persistOnboardingBootSeed(snapshot: OnboardingFlushSnapshot): void {
  flushOnboardingSessionSnapshot(snapshot);
}
