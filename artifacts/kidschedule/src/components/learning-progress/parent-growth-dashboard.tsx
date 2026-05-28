import { TrendingUp, Heart, Minus } from "lucide-react";
import { SkillTreeView } from "./skill-tree-view";
import { WeeklyParentReportCard } from "./weekly-parent-report-card";
import { PremiumCard } from "./premium-polish";
import type { ParentGrowthDashboard } from "@workspace/learning-progress-engine";
import {
  learningTrendLabel,
  consistencyLabel,
  parentStrongestSkillsTitle,
  parentImprovementTitle,
  parentStreakCalendarTitle,
} from "@workspace/learning-progress-engine";
import { Progress } from "@/components/ui/progress";

export function ParentGrowthDashboardView({
  dashboard,
  childName,
}: {
  dashboard: ParentGrowthDashboard;
  childName: string;
}) {
  const trendIcon =
    dashboard.learningTrend === "up" ? (
      <TrendingUp className="h-4 w-4 text-primary" />
    ) : dashboard.learningTrend === "needs_support" ? (
      <Heart className="h-4 w-4 text-amber-600" />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground" />
    );

  return (
    <div className="space-y-6" data-testid="parent-growth-dashboard">
      <p className="text-sm text-muted-foreground flex items-center gap-2 leading-relaxed">
        {trendIcon}
        {learningTrendLabel(dashboard.learningTrend)} · {consistencyLabel(dashboard.consistencyScore)}
      </p>

      <WeeklyParentReportCard report={dashboard.weeklyReport} />

      <div className="grid gap-4 sm:grid-cols-2">
        <PremiumCard>
          <div className="p-4">
            <h3 className="font-quicksand font-semibold text-sm mb-3">{parentStrongestSkillsTitle()}</h3>
            {dashboard.strongestSkills.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                A few playful sessions will light up this view — every step counts.
              </p>
            ) : (
              <div className="space-y-3">
                {dashboard.strongestSkills.map((s) => (
                  <div key={s.skillId}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{s.title}</span>
                      <span className="text-primary/80">{s.mastery}%</span>
                    </div>
                    <Progress value={s.mastery} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </PremiumCard>
        <PremiumCard>
          <div className="p-4">
            <h3 className="font-quicksand font-semibold text-sm mb-3">{parentImprovementTitle()}</h3>
            {dashboard.improvementAreas.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Balanced, gentle progress — nothing urgent, just joy in learning.
              </p>
            ) : (
              <div className="space-y-3">
                {dashboard.improvementAreas.map((s) => (
                  <div key={s.skillId}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{s.title}</span>
                      <span className="text-muted-foreground">{s.mastery}%</span>
                    </div>
                    <Progress value={s.mastery} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </PremiumCard>
      </div>

      <PremiumCard>
        <div className="p-4">
          <h3 className="font-quicksand font-semibold text-sm mb-3">{parentStreakCalendarTitle()}</h3>
          <div className="flex gap-2">
            {dashboard.streakCalendar.map((d) => (
              <div
                key={d.date}
                className={`flex-1 rounded-xl py-3 text-center text-xs font-medium transition-colors ${
                  d.active
                    ? "bg-primary/12 text-primary shadow-[inset_0_0_12px_rgba(168,85,247,0.12)]"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {d.label ?? "·"}
              </div>
            ))}
          </div>
        </div>
      </PremiumCard>

      <p className="text-sm text-muted-foreground leading-relaxed">{dashboard.attentionInsight}</p>
      {dashboard.premiumInsight && (
        <p className="text-sm text-primary/90 font-medium leading-relaxed">{dashboard.premiumInsight}</p>
      )}

      <SkillTreeView math={dashboard.skillTrees.math} language={dashboard.skillTrees.language} />
    </div>
  );
}
