/**
 * Premium prompt rate limits — max 1 per session, max 2 per day.
 * Never spam; never block activation or first routine.
 */

const SESSION_COUNT_KEY = "amynest:premium_prompt:session_count";
const DAILY_COUNT_PREFIX = "amynest:premium_prompt:daily:";

export type PremiumPromptTrigger =
  | "first_routine"
  | "routine_limit"
  | "speech_complete"
  | "meal_plan"
  | "worksheet_download"
  | "health_insight"
  | "weekly_report"
  | "routine_completion";

/** Triggers that must never show before first routine exists. */
const POST_ACTIVATION_TRIGGERS = new Set<PremiumPromptTrigger>([
  "routine_limit",
  "speech_complete",
  "meal_plan",
  "worksheet_download",
  "health_insight",
  "weekly_report",
  "routine_completion",
]);

const MAX_PER_SESSION = 1;
const MAX_PER_DAY = 2;

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getPremiumPromptSessionCount(): number {
  try {
    const n = Number(sessionStorage.getItem(SESSION_COUNT_KEY) ?? "0");
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function getPremiumPromptDailyCount(): number {
  try {
    const n = Number(localStorage.getItem(`${DAILY_COUNT_PREFIX}${dayKey()}`) ?? "0");
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function canShowPremiumPrompt(
  trigger: PremiumPromptTrigger,
  hasFirstRoutine: boolean,
): boolean {
  if (POST_ACTIVATION_TRIGGERS.has(trigger) && !hasFirstRoutine) return false;
  if (getPremiumPromptSessionCount() >= MAX_PER_SESSION) return false;
  if (getPremiumPromptDailyCount() >= MAX_PER_DAY) return false;
  return true;
}

const ROUTINE_LIMIT_ANALYTICS_KEY = "amynest:premium_prompt:routine_limit_logged";

export function shouldLogRoutineLimitReached(): boolean {
  try {
    if (sessionStorage.getItem(ROUTINE_LIMIT_ANALYTICS_KEY) === "1") return false;
    sessionStorage.setItem(ROUTINE_LIMIT_ANALYTICS_KEY, "1");
    return true;
  } catch {
    return true;
  }
}

export function markPremiumPromptShown(): void {
  try {
    sessionStorage.setItem(
      SESSION_COUNT_KEY,
      String(getPremiumPromptSessionCount() + 1),
    );
    localStorage.setItem(
      `${DAILY_COUNT_PREFIX}${dayKey()}`,
      String(getPremiumPromptDailyCount() + 1),
    );
  } catch {
    /* ignore */
  }
}
