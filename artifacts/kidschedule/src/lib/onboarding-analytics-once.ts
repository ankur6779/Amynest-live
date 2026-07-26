/**
 * Session-scoped once-guards for Step-1 funnel events.
 * Survives React remounts (auth flicker) within the same browser tab session.
 */

const RUN_KEY = "amynest:onboarding_analytics_run";
const EVENT_PREFIX = "amynest:onboarding_evt:";

export type OnceGuardedOnboardingEvent =
  | "onboarding_started"
  | "first_question_rendered"
  | "first_question_latency_ms"
  | "fallback_triggered"
  | "ai_timeout"
  | "onboarding_step_completed"
  | "onboarding_abandoned"
  | "step_1_duration";

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== "undefined";
}

export function getOrCreateOnboardingAnalyticsRunKey(): string {
  if (!canUseSessionStorage()) return "memory";
  try {
    const existing = sessionStorage.getItem(RUN_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `run-${Date.now()}`;
    sessionStorage.setItem(RUN_KEY, id);
    return id;
  } catch {
    return "memory";
  }
}

/** Returns true the first time this event is claimed for the current analytics run. */
export function claimOnboardingEventOnce(event: OnceGuardedOnboardingEvent): boolean {
  if (!canUseSessionStorage()) return true;
  try {
    const key = `${EVENT_PREFIX}${getOrCreateOnboardingAnalyticsRunKey()}:${event}`;
    if (sessionStorage.getItem(key) === "1") return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

export function hasClaimedOnboardingEvent(event: OnceGuardedOnboardingEvent): boolean {
  if (!canUseSessionStorage()) return false;
  try {
    const key = `${EVENT_PREFIX}${getOrCreateOnboardingAnalyticsRunKey()}:${event}`;
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Call when onboarding fully completes so a future setup can emit a fresh funnel. */
export function resetOnboardingAnalyticsOnceFlags(): void {
  if (!canUseSessionStorage()) return;
  try {
    const run = sessionStorage.getItem(RUN_KEY);
    sessionStorage.removeItem(RUN_KEY);
    if (!run) return;
    for (const event of [
      "onboarding_started",
      "first_question_rendered",
      "first_question_latency_ms",
      "fallback_triggered",
      "ai_timeout",
      "onboarding_step_completed",
      "onboarding_abandoned",
      "step_1_duration",
    ] as const) {
      sessionStorage.removeItem(`${EVENT_PREFIX}${run}:${event}`);
    }
  } catch {
    /* ignore */
  }
}

/**
 * True abandon = real unload / tab close.
 * bfcache (`persisted`) and brief backgrounding must not count as abandon.
 */
export function shouldReportOnboardingAbandoned(
  pageHidePersisted: boolean,
  opts: { step1Completed: boolean; alreadyAbandoned: boolean; onStep1: boolean },
): boolean {
  if (opts.step1Completed || opts.alreadyAbandoned || !opts.onStep1) return false;
  if (pageHidePersisted) return false;
  return true;
}
