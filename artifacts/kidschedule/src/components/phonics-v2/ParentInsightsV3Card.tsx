import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildParentInsightsV3 } from "@/lib/phonics-v3/parent-insights-v3";
import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import type { PhonicsV2FamilyProgress } from "@/lib/phonics-v2/family-progress";
import type { PhonicsV2PronunciationScores } from "@/lib/phonics-v2/pronunciation-scores";
import type { PhonicsMasteryState } from "@/lib/phonics-v3/mastery-engine";
import type { PhonicsFluencyState } from "@/lib/phonics-v3/fluency-tracker";
import type { PhonicsRetentionState } from "@/lib/phonics-v3/spaced-repetition";
import { BarChart3, TrendingUp, BookOpen, Mic, Clock, ShieldAlert } from "lucide-react";

type ParentInsightsV3CardProps = {
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  familyProgress: PhonicsV2FamilyProgress;
  pronunciation?: PhonicsV2PronunciationScores;
  mastery: PhonicsMasteryState;
  fluency: PhonicsFluencyState;
  retention?: PhonicsRetentionState;
  curriculumLevel?: number;
};

export function ParentInsightsV3Card(props: ParentInsightsV3CardProps) {
  const insight = buildParentInsightsV3(props);

  return (
    <Card
      id="phonics-v3-parent-insights"
      data-testid="phonics-v3-parent-insights"
      className="rounded-3xl border border-primary/15 bg-card/90"
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-quicksand text-base font-bold">Reading Report</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {insight.confidenceLabel}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mb-4">{insight.summaryLine}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-center">
          <div className="rounded-xl bg-primary/5 p-2">
            <p className="text-lg font-bold">{insight.readingConfidence}%</p>
            <p className="text-[9px] text-muted-foreground">Confidence</p>
          </div>
          <div className="rounded-xl bg-emerald-500/5 p-2">
            <p className="text-lg font-bold">{insight.masteredWords}</p>
            <p className="text-[9px] text-muted-foreground">Mastered words</p>
          </div>
          <div className="rounded-xl bg-amber-500/5 p-2">
            <p className="text-lg font-bold flex items-center justify-center gap-0.5">
              <TrendingUp className="h-3.5 w-3.5" />
              {insight.weeklyGrowth > 0 ? `+${insight.weeklyGrowth}` : insight.weeklyGrowth}
            </p>
            <p className="text-[9px] text-muted-foreground">Weekly growth</p>
          </div>
          <div className="rounded-xl bg-violet-500/5 p-2">
            <p className="text-lg font-bold">{insight.readingStreak}</p>
            <p className="text-[9px] text-muted-foreground">Day streak</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-center">
          <div className="rounded-xl bg-sky-500/5 p-2">
            <p className="text-lg font-bold">{insight.retentionPct}%</p>
            <p className="text-[9px] text-muted-foreground">Retention</p>
          </div>
          <div className="rounded-xl bg-rose-500/5 p-2">
            <p className="text-lg font-bold flex items-center justify-center gap-0.5">
              <Clock className="h-3.5 w-3.5" />
              {insight.overdueReviewCount}
            </p>
            <p className="text-[9px] text-muted-foreground">Overdue reviews</p>
          </div>
          <div className="rounded-xl bg-orange-500/5 p-2">
            <p className="text-lg font-bold flex items-center justify-center gap-0.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              {insight.skillsAtRisk.length}
            </p>
            <p className="text-[9px] text-muted-foreground">At risk</p>
          </div>
          <div className="rounded-xl bg-teal-500/5 p-2">
            <p className="text-lg font-bold">{insight.strongestRetained.length}</p>
            <p className="text-[9px] text-muted-foreground">Strong retained</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
          <div>
            <p className="font-semibold mb-1 flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> Fluency trends
            </p>
            <p>7d: {insight.fluency7d}% · 30d: {insight.fluency30d}% · 90d: {insight.fluency90d}%</p>
          </div>
          <div>
            <p className="font-semibold mb-1 flex items-center gap-1">
              <Mic className="h-3 w-3" /> Pronunciation
            </p>
            <p>{insight.pronunciationProgress}% avg confidence</p>
          </div>
        </div>

        {insight.digraphProgress.some((d) => d.unlocked) && (
          <div className="text-xs mb-3">
            <p className="font-semibold mb-1">Digraph progress</p>
            <p>
              {insight.digraphProgress
                .filter((d) => d.unlocked)
                .map((d) => `${d.id}${d.overdueReviews > 0 ? ` (${d.overdueReviews} due)` : ""}`)
                .join(" · ")}
            </p>
          </div>
        )}

        {(insight.skillsAtRisk.length > 0 || insight.strongestRetained.length > 0) && (
          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
            {insight.skillsAtRisk.length > 0 && (
              <div>
                <p className="font-semibold mb-1">Skills at risk</p>
                <p>{insight.skillsAtRisk.join(", ")}</p>
              </div>
            )}
            {insight.strongestRetained.length > 0 && (
              <div>
                <p className="font-semibold mb-1">Strongest retained</p>
                <p>{insight.strongestRetained.join(", ")}</p>
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
          <p className="text-[10px] font-bold text-primary mb-1">What to practice next</p>
          <ul className="text-sm font-quicksand font-bold space-y-0.5">
            {insight.recommendedActivities.map((a) => (
              <li key={a}>→ {a}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
