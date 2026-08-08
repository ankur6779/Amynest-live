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
  arcOnly = false,
  living = false,
}: {
  completed: number;
  total: number;
  nextActivity?: string;
  nextTime?: string;
  dayArcSegments?: DayArcChip[];
  /** Hide the linear progress + next-up rows (e.g. when the hero already
   * shows the completion ring + "now / next" read-out) — keeps just the
   * day-arc strip so the two surfaces don't duplicate. */
  arcOnly?: boolean;
  living?: boolean;
}) {
  const { t } = useTranslation();
  if (total <= 0) return null;

  const hasArc = !!dayArcSegments && dayArcSegments.length > 0;
  if (arcOnly && !hasArc) return null;

  const pct = Math.round((completed / total) * 100);

  return (
    <div
      className={cn(
        HUB_GLASS_SURFACE,
        ROUTINES_HUB_ACCENT.border,
        "rounded-[20px] px-4 py-3",
        arcOnly ? "" : "space-y-2.5",
      )}
      data-living={living ? "1" : "0"}
    >
      {hasArc ? <RoutineDayArcStrip segments={dayArcSegments} living={living} /> : null}
      {arcOnly ? null : (
      <>
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <span className="text-foreground">
          {living
            ? t("routines.living.execution.progress_done", {
                defaultValue: "{{done}} of {{total}} gentle steps",
                done: completed,
                total,
              })
            : t("pages.routines.detail.progress_done", {
                defaultValue: "{{done}}/{{total}} done",
                done: completed,
                total,
              })}
        </span>
        {!living ? <span className="text-amber-300/90">{pct}%</span> : null}
      </div>
      <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%` }}
          aria-hidden={living || undefined}
        />
      </div>
      {nextActivity && nextTime ? (
        <p className="text-xs text-foreground/70">
          {living
            ? t("routines.living.execution.next_up", { defaultValue: "Coming next" })
            : t("pages.routines.detail.next_up_label", { defaultValue: "Next up" })}
          :{" "}
          <span className="font-semibold text-foreground">{nextActivity}</span>
          <span className="text-foreground/50"> · {nextTime}</span>
        </p>
      ) : null}
      </>
      )}
    </div>
  );
}
