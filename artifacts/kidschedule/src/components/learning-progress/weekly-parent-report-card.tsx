import { CalendarDays } from "lucide-react";
import type { WeeklyParentReport } from "@workspace/learning-progress-engine";
import { PremiumCard } from "./premium-polish";

interface WeeklyParentReportCardProps {
  report: WeeklyParentReport;
  className?: string;
}

export function WeeklyParentReportCard({
  report,
  className,
}: WeeklyParentReportCardProps) {
  return (
    <PremiumCard testId="weekly-parent-report" className={className}>
      <div className="p-4">
        <h3 className="text-sm font-quicksand font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          This week together
        </h3>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          {report.weekStart} – {report.weekEnd}
        </p>
        <div className="space-y-2 text-sm leading-relaxed">
          {report.newWordsLearned > 0 && (
            <p>{report.newWordsLearned} joyful phonics moments</p>
          )}
          {report.countingImprovement && (
            <p>Number confidence grew: {report.countingImprovement}</p>
          )}
          {report.pronunciationImprovementPct != null &&
            report.pronunciationImprovementPct > 0 && (
              <p>Speaking blossomed this week — beautiful progress</p>
            )}
          {report.activitiesCompleted > 0 && (
            <p>{report.activitiesCompleted} cozy learning moments</p>
          )}
          {report.streakDays > 0 && (
            <p>{report.streakDays} days of gentle rhythm</p>
          )}
          {report.highlights.length > 0 && (
            <ul className="text-muted-foreground text-xs space-y-1 pt-1">
              {report.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="text-primary" aria-hidden>
                    ✦
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PremiumCard>
  );
}
