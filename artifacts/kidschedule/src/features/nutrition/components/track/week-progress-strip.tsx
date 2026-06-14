import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import {
  getWeekProgress,
  subscribeNutritionScore,
  type DayProgressStatus,
  type WeekProgressDay,
} from "@/features/nutrition/lib/nutrition-score-storage";

function dotClasses(status: DayProgressStatus, isToday: boolean): string {
  if (status === "completed") {
    return cn("bg-emerald-500", isToday && "ring-2 ring-emerald-300/60 ring-offset-1 ring-offset-[#0b1730]");
  }
  if (status === "partial") {
    return cn("bg-amber-500", isToday && "ring-2 ring-amber-300/60 ring-offset-1 ring-offset-[#0b1730]");
  }
  return cn("bg-white/15 border border-white/20", isToday && "ring-2 ring-white/30 ring-offset-1 ring-offset-[#0b1730]");
}

export function WeekProgressStrip({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { childId } = useNutritionContext();
  const [days, setDays] = useState<WeekProgressDay[]>(() =>
    childId ? getWeekProgress(childId) : [],
  );

  useEffect(() => {
    if (!childId) {
      setDays([]);
      return;
    }
    setDays(getWeekProgress(childId));
    return subscribeNutritionScore(() => setDays(getWeekProgress(childId)));
  }, [childId]);

  const dayLabels = t("nutrition_hub.days", { returnObjects: true }) as string[];

  return (
    <div className={cn("rounded-xl border border-white/[0.08] bg-white/[0.03] p-3", compact ? "p-2.5" : "p-3")}>
      <p className="text-xs font-semibold text-muted-foreground mb-2">
        {t("nutrition_hub.track.week_progress")}
      </p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => (
          <div key={day.dateKey} className="flex flex-col items-center gap-1 min-w-0">
            <span
              className={cn(
                "text-[10px] font-medium truncate w-full text-center",
                day.isToday ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {Array.isArray(dayLabels) && dayLabels[i] ? dayLabels[i] : day.label}
            </span>
            <span
              className={cn("block rounded-full", compact ? "h-2.5 w-2.5" : "h-3 w-3", dotClasses(day.status, day.isToday))}
              title={t(`nutrition_hub.track.status_${day.status}`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
