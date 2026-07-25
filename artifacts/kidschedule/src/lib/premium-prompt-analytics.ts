import { getAnalyticsService } from "@/lib/analytics/analytics-service";
import { resolveAppVersion } from "@/lib/analytics/context";
import { track } from "@/lib/analytics";
import type { FirstValueEventName } from "@workspace/analytics-taxonomy";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import type { PremiumPromptTrigger } from "@/lib/premium-prompt";

export type PremiumPromptAnalyticsEvent =
  | "premium_prompt_shown"
  | "premium_prompt_clicked"
  | "premium_prompt_dismissed"
  | "feature_locked"
  | "routine_limit_reached"
  | "first_routine_completed";

type Extra = Record<string, string | number | boolean | undefined>;

function baseExtra(): Record<string, string> {
  const ctx = getAnalyticsService().getContext();
  return {
    app_version: ctx.appVersion || resolveAppVersion(),
    platform: ctx.platform ?? "unknown",
    timestamp: new Date().toISOString(),
  };
}

function stringifyExtra(extra?: Extra): Record<string, string> {
  const out: Record<string, string> = {};
  if (!extra) return out;
  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined) continue;
    out[key] = String(value).slice(0, 64);
  }
  return out;
}

export function trackPremiumPromptEvent(
  event: PremiumPromptAnalyticsEvent,
  trigger: PremiumPromptTrigger | string,
  extra?: Extra,
): void {
  const props = {
    trigger,
    ...baseExtra(),
    ...stringifyExtra(extra),
  };

  trackSubscriptionEvent({
    event: event as Parameters<typeof trackSubscriptionEvent>[0]["event"],
    reason: trigger,
    source: String(extra?.source ?? trigger),
    extra: props,
  });
}

const firstRoutineCompletedLogged = { current: false };

/** Fires once when the first-routine value sheet is actually shown. */
export function trackFirstRoutineValueMomentCompleted(extra?: {
  source?: string;
  routine_id?: number;
  child_id?: number;
}): void {
  if (firstRoutineCompletedLogged.current) return;
  firstRoutineCompletedLogged.current = true;

  track("first_routine_completed" as FirstValueEventName, {
    routine_id: extra?.routine_id,
    child_id: extra?.child_id,
    source: extra?.source ?? "first_reveal",
  });

  trackPremiumPromptEvent("first_routine_completed", "first_routine", {
    source: extra?.source,
    routine_id: extra?.routine_id ?? 0,
  });
}
