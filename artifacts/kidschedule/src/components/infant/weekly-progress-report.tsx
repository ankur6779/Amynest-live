import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trophy, Sparkles, Share2, Loader2, Lock } from "lucide-react";
import { getIsoWeekKey } from "@workspace/infant-hub";
import { useInfantToday } from "@/hooks/use-infant-today";
import { trackWeeklyReportViewed } from "@/lib/infant-hub-analytics";
import type { InfantActivationStatus } from "@/lib/infant-activation-api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchDoctorReport } from "@/lib/infant-care-api";
import {
  buildWeeklyShareCardData,
  getWeeklyAchievedMilestoneIds,
} from "@/lib/infant-share-cards";
import { InfantShareSheet } from "@/components/infant/infant-share-sheet";
import { loadMilestoneProgress } from "@/lib/infant-milestone-progress";
import { lookupMilestoneTitle } from "@/components/infant-milestones";
import { useSubscription } from "@/hooks/use-subscription";
import { openSubscriptionGate } from "@/lib/subscription-gate";

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
  const { toast } = useToast();
  const { data } = useInfantToday(childId);
  const { entitlements } = useSubscription();
  const weekKey = getIsoWeekKey();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [weeklyCardData, setWeeklyCardData] = useState<ReturnType<
    typeof buildWeeklyShareCardData
  > | null>(null);

  const firstName = useMemo(
    () => childName.trim().split(/\s+/)[0] ?? childName,
    [childName],
  );

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
    trackWeeklyReportViewed(childId, ageMonths, String(weekKey));
  }, [childId, ageMonths, weekKey]);

  async function handleShareThisWeek() {
    setShareBusy(true);
    try {
      const report = await fetchDoctorReport(childId);
      const progress = loadMilestoneProgress(childId, childName);
      const milestoneTitles = getWeeklyAchievedMilestoneIds(
        progress,
        lookupMilestoneTitle,
      );
      const cardData = buildWeeklyShareCardData(
        firstName,
        report,
        milestoneTitles,
        weekKey,
      );
      setWeeklyCardData(cardData);
      setShareOpen(true);
    } catch {
      toast({
        description: t("components.weekly_report.share_error", "Could not load this week's summary. Please try again."),
        variant: "destructive",
      });
    } finally {
      setShareBusy(false);
    }
  }

  const showPreview =
    activation != null &&
    (activation.childAgeDays < 3 || activation.completedCount < 2);
  const reportLocked = !entitlements?.canAccessWeeklyReports;

  return (
    <>
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
        {reportLocked ? (
          <div className="rounded-xl border border-dashed border-amber-400/30 bg-white/30 dark:bg-white/5 p-4 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
              <Lock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-foreground/90">
              {t("components.weekly_report.premium_title", "Unlock weekly sleep and growth reports")}
            </p>
            <p className="text-[12px] text-muted-foreground leading-snug">
              {t(
                "components.weekly_report.premium_body",
                "Get a weekly sleep score, milestone analytics, growth insights, and a shareable PDF-style summary.",
              )}
            </p>
            <button
              type="button"
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-bold text-white"
              onClick={() => openSubscriptionGate({ reason: "premium_insight", source: "infant_weekly_report" })}
            >
              {t("components.weekly_report.unlock_cta", "Upgrade for weekly report")}
            </button>
          </div>
        ) : showPreview ? (
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
              <li>
                • {t("components.weekly_report.sleep", "Sleep score")}:{" "}
                <strong>{data.sleepScore}</strong>
              </li>
              <li>
                • {t("components.weekly_report.milestones", "Milestone progress")}:{" "}
                <strong>{data.milestoneProgressPct}%</strong>
              </li>
              {data.activity && (
                <li>
                  • {t("components.weekly_report.activity", "Try again")}:{" "}
                  {data.activity.emoji} {data.activity.title}
                </li>
              )}
            </ul>
          )
        )}
        <div className="flex items-start gap-2 rounded-xl bg-white/40 dark:bg-white/5 p-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/85 leading-snug">{tip}</p>
        </div>
        <Button
          type="button"
          variant="default"
          disabled={shareBusy || showPreview}
          onClick={() => {
            if (reportLocked) {
              openSubscriptionGate({ reason: "premium_insight", source: "infant_weekly_report_share" });
              return;
            }
            void handleShareThisWeek();
          }}
          className="w-full rounded-xl gap-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0"
        >
          {shareBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
          {t("components.weekly_report.share_this_week", "Share This Week")}
        </Button>
      </div>

      {weeklyCardData && (
        <InfantShareSheet
          open={shareOpen}
          onOpenChange={setShareOpen}
          variant="weekly"
          weeklyData={weeklyCardData}
          childId={childId}
          ageMonths={ageMonths}
        />
      )}
    </>
  );
}
