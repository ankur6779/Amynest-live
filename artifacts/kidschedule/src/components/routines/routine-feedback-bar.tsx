import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateRoutineFeedback } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

/**
 * Parent feedback loop (Priority 1) — lightweight, one-tap qualitative feedback
 * on a routine or a single activity. Lives ABOVE the frozen routine engine:
 * it only writes to /api/routine-feedback and never influences generation.
 */
export type RoutineFeedbackSignal =
  | "worked_well"
  | "loved_this"
  | "too_tiring"
  | "skipped"
  | "bedtime_smooth";

const SIGNAL_META: Record<
  RoutineFeedbackSignal,
  { emoji: string; key: string; fallback: string }
> = {
  worked_well: { emoji: "👍", key: "components.routine_feedback.worked_well", fallback: "Worked well" },
  loved_this: { emoji: "❤️", key: "components.routine_feedback.loved_this", fallback: "Loved this" },
  too_tiring: { emoji: "😴", key: "components.routine_feedback.too_tiring", fallback: "Too tiring" },
  skipped: { emoji: "⏭️", key: "components.routine_feedback.skipped", fallback: "Skipped" },
  bedtime_smooth: { emoji: "🌙", key: "components.routine_feedback.bedtime_smooth", fallback: "Bedtime smooth" },
};

/**
 * Normalize an activity name into the same key shape the server uses
 * (see normalizeActivityKey in routine-activity-metadata.ts). Keeps
 * per-activity feedback compatible with a future generation-influence phase.
 */
export function feedbackActivityKey(activity: string | undefined | null): string | null {
  if (!activity) return null;
  const key = activity
    .replace(/\s*\([^)]*\)/gi, "")
    .replace(/\s*—\s*.*/g, "")
    .trim()
    .toLowerCase();
  return key || null;
}

export function RoutineFeedbackBar({
  childId,
  routineId,
  routineDate,
  activityKey = null,
  signals,
  title,
  onSubmitted,
  tone = "light",
  className,
}: {
  childId: number;
  routineId: number;
  routineDate: string;
  activityKey?: string | null;
  signals: RoutineFeedbackSignal[];
  title?: string;
  onSubmitted?: (signal: RoutineFeedbackSignal) => void;
  tone?: "light" | "dark";
  className?: string;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { mutate, isPending } = useCreateRoutineFeedback();
  const [selected, setSelected] = useState<RoutineFeedbackSignal | null>(null);

  if (signals.length === 0) return null;

  const submit = (signal: RoutineFeedbackSignal) => {
    if (selected || isPending) return;
    setSelected(signal);
    track("routine_feedback_submitted", {
      childId,
      routineId,
      signal,
      activityKey,
      scope: activityKey ? "activity" : "routine",
    });
    mutate(
      { data: { childId, routineId, routineDate, activityKey, signal } },
      {
        onError: () => {
          // Non-blocking: allow the parent to try again.
          setSelected(null);
          toast({
            title: t("components.routine_feedback.error", {
              defaultValue: "Couldn't save that — tap to try again.",
            }),
          });
        },
      },
    );
    onSubmitted?.(signal);
  };

  const isDark = tone === "dark";
  const labelClass = isDark ? "text-white/70" : "text-muted-foreground";

  if (selected) {
    return (
      <div className={className}>
        <p className={`text-xs font-semibold ${labelClass}`}>
          {t("components.routine_feedback.thanks", { defaultValue: "Thanks for the feedback! 💛" })}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {title ? (
        <p className={`mb-2 text-xs font-bold uppercase tracking-wide ${labelClass}`}>{title}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {signals.map((signal) => {
          const meta = SIGNAL_META[signal];
          return (
            <button
              key={signal}
              type="button"
              disabled={isPending}
              onClick={() => submit(signal)}
              className={
                isDark
                  ? "inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-transform active:scale-95 disabled:opacity-60"
                  : "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-transform hover:bg-muted/80 active:scale-95 disabled:opacity-60"
              }
            >
              <span aria-hidden>{meta.emoji}</span>
              <span>{t(meta.key, { defaultValue: meta.fallback })}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
