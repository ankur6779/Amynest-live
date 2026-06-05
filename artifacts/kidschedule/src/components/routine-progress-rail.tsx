import { useTranslation } from "react-i18next";
import { RoutineDayArcStrip } from "@/components/routines/routine-day-arc-strip";
import type { DayArcChip } from "@/lib/routine-detail-premium";
import {
  HUB_GLASS_SURFACE,
  ROUTINES_HUB_ACCENT,
} from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

export function RoutineProgressRail({
  completed,
  total,
  nextActivity,
  nextTime,
  dayArcSegments,
}: {
  completed: number;
  total: number;
  nextActivity?: string;
  nextTime?: string;
  dayArcSegments?: DayArcChip[];
}) {
  const { t } = useTranslation();
  if (total <= 0) return null;

  const pct = Math.round((completed / total) * 100);

  return (
    <div
      className={cn(
        HUB_GLASS_SURFACE,
        ROUTINES_HUB_ACCENT.border,
        "rounded-[20px] px-4 py-3 space-y-2.5",
      )}
    >
      {dayArcSegments && dayArcSegments.length > 0 ? (
        <RoutineDayArcStrip segments={dayArcSegments} />
      ) : null}
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <span className="text-foreground">
          {t("pages.routines.detail.progress_done", {
            defaultValue: "{{done}}/{{total}} done",
            done: completed,
            total,
          })}
        </span>
        <span className="text-amber-300/90">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {nextActivity && nextTime ? (
        <p className="text-xs text-foreground/70">
          {t("pages.routines.detail.next_up_label", { defaultValue: "Next up" })}:{" "}
          <span className="font-semibold text-foreground">{nextActivity}</span>
          <span className="text-foreground/50"> · {nextTime}</span>
        </p>
      ) : null}
    </div>
  );
}
