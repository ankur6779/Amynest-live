/**
 * Google Play In-App Review orchestrator.
 *
 * Rules:
 *  - Never prompt immediately after install (MIN_DAYS_SINCE_INSTALL)
 *  - Cooldown between prompts (COOLDOWN_DAYS)
 *  - Max prompts per year (MAX_PROMPTS_PER_YEAR)
 *  - Intelligent triggers at high-intent moments
 */

import { trackGrowthEvent } from "@/lib/growth-analytics";
import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";

export type ReviewTrigger =
  | "streak_7_day"
  | "routine_completed"
  | "speech_coach_success"
  | "nutrition_goal_completed"
  | "premium_milestone"
  | "child_achievement_unlocked";

const STORAGE_PREFIX = "amynest:review:";
const INSTALL_TS_KEY = `${STORAGE_PREFIX}install_ts`;
const LAST_PROMPT_KEY = `${STORAGE_PREFIX}last_prompt_ts`;
const PROMPT_COUNT_KEY = `${STORAGE_PREFIX}prompt_count_year`;
const PROMPT_YEAR_KEY = `${STORAGE_PREFIX}prompt_year`;
const DISMISSED_KEY = `${STORAGE_PREFIX}dismissed`;

/** Minimum days after install before first prompt. */
const MIN_DAYS_SINCE_INSTALL = 3;
/** Days between review prompts. */
const COOLDOWN_DAYS = 90;
/** Max prompts per calendar year. */
const MAX_PROMPTS_PER_YEAR = 3;

type AmyNestReviewNative = {
  isAvailable?: () => boolean;
  requestReview?: () => void;
};

type AmyNestWindow = Window & {
  AmyNestReviewNative?: AmyNestReviewNative;
};

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

/** Record first-seen install timestamp (web layer; complements Play install time). */
export function recordInstallTimestampIfNeeded(): void {
  if (readStorage(INSTALL_TS_KEY)) return;
  writeStorage(INSTALL_TS_KEY, String(Date.now()));
}

function daysSince(ts: number): number {
  return (Date.now() - ts) / (24 * 60 * 60 * 1000);
}

function getPromptCountThisYear(): number {
  const year = new Date().getFullYear();
  const storedYear = Number(readStorage(PROMPT_YEAR_KEY) ?? "0");
  if (storedYear !== year) return 0;
  return Number(readStorage(PROMPT_COUNT_KEY) ?? "0");
}

function incrementPromptCount(): void {
  const year = new Date().getFullYear();
  const storedYear = Number(readStorage(PROMPT_YEAR_KEY) ?? "0");
  const count = storedYear === year ? getPromptCountThisYear() + 1 : 1;
  writeStorage(PROMPT_YEAR_KEY, String(year));
  writeStorage(PROMPT_COUNT_KEY, String(count));
}

function isReviewNativeAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const native = (window as AmyNestWindow).AmyNestReviewNative;
  if (native?.isAvailable?.()) return true;
  return isNativeAmyNestAndroidWrapper();
}

export function isReviewEligible(): boolean {
  const installTs = Number(readStorage(INSTALL_TS_KEY) ?? "0");
  if (!installTs) return false;
  if (daysSince(installTs) < MIN_DAYS_SINCE_INSTALL) return false;

  const lastPrompt = Number(readStorage(LAST_PROMPT_KEY) ?? "0");
  if (lastPrompt && daysSince(lastPrompt) < COOLDOWN_DAYS) return false;

  if (getPromptCountThisYear() >= MAX_PROMPTS_PER_YEAR) return false;

  if (readStorage(DISMISSED_KEY) === "1") {
    const dismissedAt = Number(readStorage(`${DISMISSED_KEY}_ts`) ?? "0");
    if (dismissedAt && daysSince(dismissedAt) < COOLDOWN_DAYS * 2) return false;
  }

  return isReviewNativeAvailable();
}

function launchNativeReview(): void {
  const native = (window as AmyNestWindow).AmyNestReviewNative;
  native?.requestReview?.();
}

/**
 * Attempt to show the Play Store in-app review dialog for an eligible trigger.
 * Returns true if the prompt was shown (or launch attempted).
 */
export function requestReviewIfEligible(trigger: ReviewTrigger): boolean {
  recordInstallTimestampIfNeeded();
  if (!isReviewEligible()) {
    trackGrowthEvent("review_prompt_blocked", { trigger, reason: "eligibility" });
    return false;
  }

  writeStorage(LAST_PROMPT_KEY, String(Date.now()));
  incrementPromptCount();
  trackGrowthEvent("review_prompt_shown", { trigger });

  const onResult = (event: Event) => {
    const detail = (event as CustomEvent<{ status?: string }>).detail;
    window.removeEventListener("amynest-review-result", onResult);
    if (detail?.status === "launched") {
      trackGrowthEvent("review_completed", { trigger });
    } else if (detail?.status === "error") {
      trackGrowthEvent("review_prompt_dismissed", { trigger, reason: detail.status });
    }
  };
  window.addEventListener("amynest-review-result", onResult, { once: true });

  launchNativeReview();
  return true;
}

/** Mark user as not interested — extended cooldown. */
export function dismissReviewPrompt(): void {
  writeStorage(DISMISSED_KEY, "1");
  writeStorage(`${DISMISSED_KEY}_ts`, String(Date.now()));
  trackGrowthEvent("review_prompt_dismissed", { reason: "user_dismissed" });
}

/** Convenience: check trigger-specific rules then request review. */
export function notifyReviewTrigger(
  trigger: ReviewTrigger,
  context?: Record<string, string | number | boolean>,
): void {
  if (trigger === "streak_7_day" && context?.streakDays !== undefined) {
    const days = Number(context.streakDays);
    if (days < 7 || days % 7 !== 0) return;
  }
  requestReviewIfEligible(trigger);
}
