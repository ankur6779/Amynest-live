import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import {
  buildWeeklyScheduleInsight,
  type FixedActivityDraft,
} from "@/lib/fixed-activities";

export function FixedActivitiesWeeklyInsights({
  activities,
  childName,
}: {
  activities: FixedActivityDraft[];
  childName?: string;
}) {
  const { t } = useTranslation();
  const insight = buildWeeklyScheduleInsight(activities, childName);
  if (!insight) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary shrink-0" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          {t("pages.routines.fixed.insight_title", { defaultValue: "Weekly insight" })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {insight.busyDays.length > 0 && (
          <span className="rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-100 px-2.5 py-1 font-medium">
            {t("pages.routines.fixed.busy_days", { defaultValue: "Busier" })}:{" "}
            {insight.busyDays.join(", ")}
          </span>
        )}
        {insight.lightDays.length > 0 && (
          <span className="rounded-full bg-muted text-muted-foreground px-2.5 py-1 font-medium">
            {t("pages.routines.fixed.light_days", { defaultValue: "Lighter" })}:{" "}
            {insight.lightDays.join(", ")}
          </span>
        )}
      </div>
      <p className="text-sm text-foreground leading-snug">{insight.recommendation}</p>
    </div>
  );
}
