import { useEffect, useRef } from "react";
import { AI_QUOTA_COPY, resolveAiQuotaEducationState } from "@/lib/ai-quota-education";
import { ASK_AMY_SOFT_CONTINUE } from "@/lib/hard-day-monetization";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

type Props = {
  remaining: number;
  limit: number;
  isPremium: boolean;
  surface?: string;
};

/**
 * Parent-facing remaining + 70–80% education. Never opens a paywall.
 */
export function AmyAiQuotaHint({
  remaining,
  limit,
  isPremium,
  surface = "ask_amy",
}: Props) {
  const state = resolveAiQuotaEducationState(remaining, limit, isPremium);
  const warned = useRef(false);

  useEffect(() => {
    if (state !== "education" || warned.current) return;
    warned.current = true;
    trackSubscriptionEvent({
      event: "quota_warning",
      source: surface,
      extra: {
        remaining,
        limit,
        used: Math.max(0, limit - remaining),
        feature: "amy_help",
      },
    });
  }, [state, remaining, limit, surface]);

  if (isPremium || !Number.isFinite(limit) || limit <= 0) return null;

  if (state === "exhausted") {
    return (
      <p
        className="text-center text-[11px] text-muted-foreground"
        data-testid="ask-amy-quota-reset-hint"
      >
        {ASK_AMY_SOFT_CONTINUE.resetHint}
      </p>
    );
  }

  const remainingLabel =
    remaining === 1
      ? `${remaining} of ${limit} free Amy AI message remaining`
      : `${remaining} of ${limit} free Amy AI messages remaining`;

  return (
    <div className="space-y-1" data-testid="ask-amy-quota-hint">
      <p className="text-center text-[11px] text-muted-foreground">{remainingLabel}</p>
      {state === "education" ? (
        <p
          className="text-center text-[11px] text-muted-foreground"
          data-testid="ask-amy-quota-education"
        >
          {AI_QUOTA_COPY.education}
        </p>
      ) : null}
    </div>
  );
}
