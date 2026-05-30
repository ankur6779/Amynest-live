import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Trophy, Sparkles } from "lucide-react";
import { getIsoWeekKey } from "@workspace/infant-hub";
import { useInfantToday } from "@/hooks/use-infant-today";
import { trackInfantHubEvent } from "@/lib/infant-hub-analytics";
import { useEffect } from "react";

type WeeklyProgressReportProps = {
  childId: number;
  childName: string;
  ageMonths: number;
};

export function WeeklyProgressReport({
  childId,
  childName,
  ageMonths,
}: WeeklyProgressReportProps) {
  const { t } = useTranslation();
  const { data } = useInfantToday(childId);
  const weekKey = getIsoWeekKey();

  const tip = useMemo(() => {
    const tips = [
      `Keep responding to ${childName}'s cues — consistency builds trust.`,
      `Short, calm play sessions beat long overstimulating ones at ${ageMonths} months.`,
      `If nights feel rough, focus on one anchor: same wake time every morning.`,
      `Celebrate small wins — a new sound, a longer nap, a smile.`,
    ];
    return tips[weekKey % tips.length]!;
  }, [childName, ageMonths, weekKey]);

  useEffect(() => {
    trackInfantHubEvent("weekly_report_view", { childId, weekKey });
  }, [childId, weekKey]);

  return (
    <div
      className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-4 space-y-3"
      data-testid="weekly-progress-report"
    >
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          {t("components.weekly_report.title", "This week's progress")}
        </p>
      </div>
      {data && (
        <ul className="text-sm space-y-1.5 text-foreground/90">
          <li>• {t("components.weekly_report.sleep", "Sleep score")}: <strong>{data.sleepScore}</strong></li>
          <li>• {t("components.weekly_report.milestones", "Milestone progress")}: <strong>{data.milestoneProgressPct}%</strong></li>
          {data.activity && (
            <li>• {t("components.weekly_report.activity", "Try again")}: {data.activity.emoji} {data.activity.title}</li>
          )}
        </ul>
      )}
      <div className="flex items-start gap-2 rounded-xl bg-white/40 dark:bg-white/5 p-3">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/85 leading-snug">{tip}</p>
      </div>
    </div>
  );
}
