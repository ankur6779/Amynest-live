import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import { NUTRITION_WEEK_STRIP } from "@/features/nutrition/lib/nutrition-ui-tokens";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import {
  getWeekProgress,
  subscribeNutritionScore,
  type DayProgressStatus,
  type WeekProgressDay,
} from "@/features/nutrition/lib/nutrition-score-storage";

function dotClasses(status: DayProgressStatus, isToday: boolean): string {
  if (status === "completed") {
    return cn(
      "bg-emerald-400 nutrition-day-glow",
      isToday && "ring-2 ring-emerald-300/70 ring-offset-1 ring-offset-[#0b1730]",
    );
  }
  if (status === "partial") {
    return cn(
      "bg-amber-400",
      isToday && "ring-2 ring-amber-300/60 ring-offset-1 ring-offset-[#0b1730]",
    );
  }
  return cn(
    "bg-white/15 border border-white/20",
    isToday && "ring-2 ring-amber-200/40 ring-offset-1 ring-offset-[#0b1730] nutrition-today-pulse",
  );
}

function isStreakConnector(prev: DayProgressStatus, current: DayProgressStatus): boolean {
  return prev === "completed" && (current === "completed" || current === "partial");
}

export function WeekProgressStrip({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
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
    <div className={cn(NUTRITION_WEEK_STRIP, compact ? "p-2.5" : "p-3")}>
      <p className="text-xs font-semibold text-muted-foreground mb-2.5">
        {t("nutrition_hub.track.week_progress")}
      </p>
      <div className="relative grid grid-cols-7 gap-1">
        {/* Streak connector lines */}
        <div className="pointer-events-none absolute inset-x-0 top-[calc(50%+0.5rem)] flex h-0.5 items-center px-[7%]" aria-hidden>
          {days.map((day, i) => {
            if (i === 0) return <div key={`spacer-${day.dateKey}`} className="flex-1" />;
            const prev = days[i - 1]!;
            const connected = isStreakConnector(prev.status, day.status);
            return (
              <div key={`line-${day.dateKey}`} className="flex-1 h-full">
                {connected && (
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500/50 to-emerald-400/30 nutrition-streak-line" />
                )}
              </div>
            );
          })}
        </div>

        {days.map((day, i) => (
          <div key={day.dateKey} className="relative flex flex-col items-center gap-1 min-w-0 z-[1]">
            <span
              className={cn(
                "text-[10px] font-medium truncate w-full text-center",
                day.isToday ? "text-amber-100/90 font-semibold" : "text-muted-foreground",
              )}
            >
              {Array.isArray(dayLabels) && dayLabels[i] ? dayLabels[i] : day.label}
            </span>
            {day.isToday && !reduced ? (
              <motion.span
                className={cn(
                  "block rounded-full",
                  compact ? "h-2.5 w-2.5" : "h-3 w-3",
                  dotClasses(day.status, day.isToday),
                )}
                title={t(`nutrition_hub.track.status_${day.status}`)}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : (
              <span
                className={cn(
                  "block rounded-full",
                  compact ? "h-2.5 w-2.5" : "h-3 w-3",
                  dotClasses(day.status, day.isToday),
                )}
                title={t(`nutrition_hub.track.status_${day.status}`)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
