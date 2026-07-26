/**
 * Step-1 failsafe: first onboarding question must never wait forever.
 * Static prompts render immediately; any loading state hard-caps at 3s.
 */
import type { TFunction } from "i18next";
import { chatMessage, type ChatMessage, type OnboardingStep } from "@/lib/onboarding-chat-types";

/** Hard ceiling — no spinner / typing-only state may exceed this. */
export const ONBOARDING_MAX_LOADING_MS = 3_000;

/** Progressive status: "Amy is thinking…" for the first 2s. */
export const ONBOARDING_THINKING_STATUS_MS = 2_000;

/** Reverse-geocode / IP / GPS locate budget for country step. */
export const ONBOARDING_LOCATION_TIMEOUT_MS = 3_000;

export const INTRO_GREETING_ID = "onboarding-intro-greeting";
export const FIRST_QUESTION_ID = "onboarding-first-question";
export const COUNTRY_TRANSITION_ID = "onboarding-country-transition";

export type LoadingStatusPhase = "thinking" | "preparing" | "fallback" | "ready";

/** Steps that count as onboarding Step 1 ("Getting to know your family"). */
export const ONBOARDING_STEP_1_STEPS = new Set<OnboardingStep>(["intro", "country-confirm"]);

export function resolveLoadingStatusPhase(elapsedMs: number): LoadingStatusPhase {
  if (elapsedMs < 0) return "thinking";
  if (elapsedMs < ONBOARDING_THINKING_STATUS_MS) return "thinking";
  if (elapsedMs < ONBOARDING_MAX_LOADING_MS) return "preparing";
  return "fallback";
}

export function loadingStatusMessageKey(
  phase: LoadingStatusPhase,
): "amy_thinking" | "preparing_first_question" | "lets_start_manually" | null {
  switch (phase) {
    case "thinking":
      return "amy_thinking";
    case "preparing":
      return "preparing_first_question";
    case "fallback":
      return "lets_start_manually";
    default:
      return null;
  }
}

export function clampAmyDelay(delayMs: number): number {
  if (!Number.isFinite(delayMs) || delayMs < 0) return 0;
  return Math.min(delayMs, ONBOARDING_MAX_LOADING_MS);
}

export function buildStaticFirstQuestionMessages(
  t: TFunction,
  firstName: string,
): ChatMessage[] {
  const name = firstName.trim() || t("screens.onboarding.intro_default_name");
  return [
    chatMessage(
      "amy",
      t("screens.onboarding.intro_greeting", { name }),
      INTRO_GREETING_ID,
    ),
    chatMessage(
      "amy",
      t("screens.onboarding.intro_first_question"),
      FIRST_QUESTION_ID,
    ),
    chatMessage(
      "amy",
      t("screens.onboarding.country_transition_msg"),
      COUNTRY_TRANSITION_ID,
    ),
  ];
}

export function messagesIncludeFirstQuestion(messages: ChatMessage[]): boolean {
  return messages.some(
    (m) =>
      m.id === FIRST_QUESTION_ID
      || m.id === INTRO_GREETING_ID
      || m.id === COUNTRY_TRANSITION_ID,
  );
}

export function mergeWithoutDuplicateIds(
  existing: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const seen = new Set(existing.map((m) => m.id));
  const merged = [...existing];
  for (const msg of incoming) {
    if (seen.has(msg.id)) continue;
    // Also skip identical amy text already present (legacy sessions without stable ids).
    if (
      msg.role === "amy"
      && existing.some((m) => m.role === "amy" && m.text === msg.text)
    ) {
      continue;
    }
    seen.add(msg.id);
    merged.push(msg);
  }
  return merged;
}

export function resolveFreshOnboardingBoot(input: {
  restoredStep?: OnboardingStep | null;
  restoredMessages?: ChatMessage[] | null;
  t: TFunction;
  firstName?: string;
}): {
  step: OnboardingStep;
  messages: ChatMessage[];
  seededFresh: boolean;
} {
  const restoredMessages = input.restoredMessages ?? [];
  const restoredStep = input.restoredStep ?? null;

  if (restoredMessages.length > 0 && restoredStep && restoredStep !== "intro") {
    return {
      step: restoredStep,
      messages: restoredMessages,
      seededFresh: false,
    };
  }

  // Stuck / empty intro, corrupt resume, or first launch → seed static Step 1 immediately.
  const seeded = buildStaticFirstQuestionMessages(
    input.t,
    input.firstName ?? input.t("screens.onboarding.intro_default_name"),
  );
  const messages =
    restoredMessages.length > 0
      ? mergeWithoutDuplicateIds(restoredMessages, seeded)
      : seeded;

  return {
    step: "country-confirm",
    messages,
    seededFresh: true,
  };
}

/** True when the UI is in a loading-only dead-end that needs the 3s failsafe. */
export function isStep1LoadingDeadEnd(input: {
  step: OnboardingStep;
  typing: boolean;
  messages: ChatMessage[];
  locationStatus: string;
}): boolean {
  if (!ONBOARDING_STEP_1_STEPS.has(input.step)) return false;
  if (input.typing) return true;
  if (input.step === "intro" && input.messages.length === 0) return true;
  if (
    input.step === "country-confirm"
    && (input.locationStatus === "fetching"
      || input.locationStatus === "fallback"
      || input.locationStatus === "checking")
  ) {
    return true;
  }
  return false;
}

/** Location statuses that hide the usable country controls behind a spinner. */
export function isLocationSpinnerStatus(status: string): boolean {
  return status === "fetching" || status === "fallback" || status === "checking";
}
