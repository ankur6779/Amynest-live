import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Trophy } from "lucide-react";
import type { WeeklyParentReport } from "@workspace/learning-progress-engine";
import { cn } from "@/lib/utils";
import {
  getHubPanelAccent,
  hubAccentBarClasses,
  hubSectionCardClasses,
  HUB_BODY,
  HUB_EXPANDED_CONTENT_STACK,
} from "@/lib/parent-hub-premium";
import { WeeklyParentReportCard } from "@/components/learning-progress/weekly-parent-report-card";
import { AppLink } from "@/components/app-link";
import { Button } from "@/components/ui/button";

function weeklyTeaser(report: WeeklyParentReport): string {
  const parts: string[] = [];
  if (report.newWordsLearned > 0) parts.push(`${report.newWordsLearned} phonics moments`);
  if (report.streakDays > 0) parts.push(`${report.streakDays}d rhythm`);
  if (report.activitiesCompleted > 0) parts.push(`${report.activitiesCompleted} learning moments`);
  if (report.highlights[0]) parts.push(report.highlights[0]!);
  return parts.slice(0, 3).join(" · ");
}

function WeeklyDigestCollapsible({
  report,
  showGrowthLink,
  growthLinkLabel,
}: {
  report: WeeklyParentReport;
  showGrowthLink?: boolean;
  growthLinkLabel: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const teaser = weeklyTeaser(report);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">
            {t("parent_hub.journey_pulse.this_week", { defaultValue: "This week together" })}
          </p>
          {!open && teaser ? (
            <p className={cn(HUB_BODY, "text-[11px] line-clamp-1 mt-0.5")}>{teaser}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-white/[0.08] px-1 pb-1 space-y-2 animate-in fade-in duration-200">
          <WeeklyParentReportCard report={report} />
          {showGrowthLink ? (
            <div className="flex justify-end px-2 pb-1">
              <AppLink href="/parent-growth">
                <Button variant="outline" size="sm" className="rounded-full gap-1.5">
                  <Trophy className="h-4 w-4" />
                  {growthLinkLabel}
                </Button>
              </AppLink>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export interface HubTodayLearningPanelProps {
  childName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelRef?: React.RefObject<HTMLDivElement | null>;
  weeklyReport?: WeeklyParentReport | null;
  showGrowthLink?: boolean;
  growthLinkLabel?: string;
  children: ReactNode;
}

export function HubTodayLearningPanel({
  childName,
  open,
  onOpenChange,
  panelRef,
  weeklyReport,
  showGrowthLink = false,
  growthLinkLabel,
  children,
}: HubTodayLearningPanelProps) {
  const { t } = useTranslation();
  const theme = getHubPanelAccent("today-summary");
  const growthLabel = growthLinkLabel ?? t("parent_hub.today_summary.growth_link");

  return (
    <div ref={panelRef} data-testid="hub-today-learning-panel" className="hub-page-enter">
      <div className={hubSectionCardClasses(theme)}>
        <div className="flex min-w-0">
          <div className={hubAccentBarClasses(theme)} aria-hidden />
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onOpenChange(!open)}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-3 py-3 text-left",
                "transition-all duration-[220ms] ease-[ease]",
                open ? "bg-white/[0.04]" : "hover:bg-white/[0.03]",
              )}
              aria-expanded={open}
            >
              <div className="min-w-0 text-left">
                <p className="font-quicksand font-bold text-sm text-foreground">
                  {t("parent_hub.journey_pulse.expand_learning", {
                    defaultValue: "Today's learning",
                  })}
                </p>
                {!open ? (
                  <p className={cn(HUB_BODY, "text-[11px] line-clamp-1 mt-0.5")}>
                    {t("parent_hub.journey_pulse.expand_subtitle", {
                      defaultValue: "Path, session, Amy picks & unlocks",
                      name: childName,
                    })}
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  "border border-white/10 bg-white/[0.05] transition-transform duration-300",
                  open ? "rotate-180 text-amber-300/90" : "text-muted-foreground",
                )}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </span>
            </button>
            {open ? (
              <div
                className={cn(
                  HUB_EXPANDED_CONTENT_STACK,
                  "animate-in fade-in duration-200",
                )}
              >
                {children}
                {weeklyReport ? (
                  <WeeklyDigestCollapsible
                    report={weeklyReport}
                    showGrowthLink={showGrowthLink}
                    growthLinkLabel={growthLabel}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
