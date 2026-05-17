import { useTranslation } from "react-i18next";
import {
  groupActivitiesByWeekday,
  formatTimeRange,
  WEEKDAY_LABELS,
  type FixedActivityDraft,
} from "@/lib/fixed-activities";
import { cn } from "@/lib/utils";

export function FixedActivitiesWeeklyView({
  activities,
  highlightDay,
}: {
  activities: FixedActivityDraft[];
  /** Weekday label for routine date, e.g. "Wed" */
  highlightDay?: string;
}) {
  const { t } = useTranslation();
  const grouped = groupActivitiesByWeekday(activities);

  if (activities.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 sm:p-4 space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {t("pages.routines.fixed.weekly_title", { defaultValue: "Your week at a glance" })}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {WEEKDAY_LABELS.map((day) => {
          const items = grouped[day];
          const isToday =
            highlightDay &&
            day.toLowerCase().startsWith(highlightDay.toLowerCase().slice(0, 3));
          return (
            <div
              key={day}
              className={cn(
                "rounded-xl border p-2 min-h-[4.5rem] flex flex-col gap-1",
                isToday
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/50 bg-card/80",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-bold uppercase",
                  isToday ? "text-primary" : "text-muted-foreground",
                )}
              >
                {day}
              </span>
              {items.length === 0 ? (
                <span className="text-[10px] text-muted-foreground/60">—</span>
              ) : (
                items.map((a, i) => (
                  <span key={i} className="text-[11px] leading-tight text-foreground">
                    <span className="font-medium">{a.activity}</span>
                    <br />
                    <span className="text-muted-foreground">
                      {formatTimeRange(a.start, a.end)}
                    </span>
                  </span>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
