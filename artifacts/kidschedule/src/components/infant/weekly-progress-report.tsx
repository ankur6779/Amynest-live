import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Trophy, Sparkles } from "lucide-react";
import { getIsoWeekKey } from "@workspace/infant-hub";
import { useInfantToday } from "@/hooks/use-infant-today";
import { trackWeeklyReportViewed, trackWeeklyReportShared } from "@/lib/infant-hub-analytics";
import type { InfantActivationStatus } from "@/lib/infant-activation-api";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

type WeeklyProgressReportProps = {
  childId: number;
  childName: string;
  ageMonths: number;
  activation?: InfantActivationStatus;
};

export function WeeklyProgressReport({
  childId,
  childName,
  ageMonths,
  activation,
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
    trackWeeklyReportViewed(childId, ageMonths, weekKey);
  }, [childId, ageMonths, weekKey]);

  async function handleShare() {
    const text = [
      `This week for ${childName}`,
      data ? `Sleep score: ${data.sleepScore}` : "",
      data ? `Milestones: ${data.milestoneProgressPct}%` : "",
      tip,
    ]
      .filter(Boolean)
      .join("\n");

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${childName} — weekly progress`, text });
        trackWeeklyReportShared(childId, ageMonths, "system_share");
        return;
      } catch {
        /* fall through */
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      trackWeeklyReportShared(childId, ageMonths, "whatsapp");
    } catch {
      trackWeeklyReportShared(childId, ageMonths, "pdf");
    }
  }

  const showPreview =
    activation != null &&
    (activation.childAgeDays < 3 || activation.completedCount < 2);

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
      {showPreview ? (
        <div className="rounded-xl border border-dashed border-amber-400/30 bg-white/30 dark:bg-white/5 p-4 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground/90">
            {t("components.weekly_report.preview_title", "Weekly Report Preview")}
          </p>
          <p className="text-[12px] text-muted-foreground leading-snug">
            {t(
              "components.weekly_report.preview_body",
              "Available after 3 days of activity — keep logging feeds and sleep.",
            )}
          </p>
        </div>
      ) : (
        data && (
          <ul className="text-sm space-y-1.5 text-foreground/90">
            <li>• {t("components.weekly_report.sleep", "Sleep score")}: <strong>{data.sleepScore}</strong></li>
            <li>• {t("components.weekly_report.milestones", "Milestone progress")}: <strong>{data.milestoneProgressPct}%</strong></li>
            {data.activity && (
              <li>• {t("components.weekly_report.activity", "Try again")}: {data.activity.emoji} {data.activity.title}</li>
            )}
          </ul>
        )
      )}
      <div className="flex items-start gap-2 rounded-xl bg-white/40 dark:bg-white/5 p-3">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/85 leading-snug">{tip}</p>
      </div>
      <Button type="button" variant="outline" onClick={() => void handleShare()} className="w-full rounded-xl gap-2 text-xs">
        <Share2 className="h-3.5 w-3.5" />
        {t("components.weekly_report.share", "Share weekly summary")}
      </Button>
    </div>
  );
}
