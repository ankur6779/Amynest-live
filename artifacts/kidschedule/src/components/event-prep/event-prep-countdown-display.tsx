import type { TFunction } from "i18next";
import { useEventPrepCountdown } from "@/hooks/use-event-prep-countdown";
import { formatCountdownClock } from "@/lib/event-prep-countdown";
import { countdownLabel } from "@/components/event-prep-views";
import { cn } from "@/lib/utils";

interface Props {
  nextDate: string;
  daysUntil: number;
  t: TFunction;
  className?: string;
  /** Large hero style for next-event card. */
  variant?: "hero" | "compact";
}

export function EventPrepCountdownDisplay({
  nextDate,
  daysUntil,
  t,
  className,
  variant = "hero",
}: Props) {
  const parts = useEventPrepCountdown(nextDate);
  const showLive = parts?.isUrgent && !parts.isPast;

  if (variant === "compact") {
    return (
      <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full bg-amber-400/20 text-amber-100 shrink-0", className)}>
        {showLive && parts ? formatCountdownClock(parts) : countdownLabel(daysUntil, t)}
      </span>
    );
  }

  return (
    <div className={cn("text-right", className)}>
      <div
        className={cn(
          "font-black tabular-nums",
          showLive ? "text-xl sm:text-2xl event-prep-countdown-pulse" : "text-2xl event-prep-countdown-pulse",
        )}
      >
        {showLive && parts ? formatCountdownClock(parts) : countdownLabel(daysUntil, t)}
      </div>
      <div className="text-xs opacity-80">
        {showLive ? t("screens.event_prep.countdown_live") : t("screens.event_prep.next_event")}
      </div>
    </div>
  );
}
