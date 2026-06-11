import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildParentPhonicsInsights } from "@/lib/phonics-v2/parent-insights";
import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import type { PhonicsV2FamilyProgress } from "@/lib/phonics-v2/family-progress";
import type { PhonicsV2PronunciationScores } from "@/lib/phonics-v2/pronunciation-scores";
import { BarChart3, Check, AlertTriangle } from "lucide-react";

type ParentInsightsCardProps = {
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  familyProgress: PhonicsV2FamilyProgress;
  pronunciation?: PhonicsV2PronunciationScores;
};

export function ParentInsightsCard({
  items,
  progress,
  familyProgress,
  pronunciation,
}: ParentInsightsCardProps) {
  const insight = buildParentPhonicsInsights({
    items,
    progress,
    familyProgress,
    pronunciation,
  });

  return (
    <Card
      id="phonics-v2-parent-insights"
      data-testid="phonics-v2-parent-insights"
      className="rounded-3xl border border-white/[0.08] bg-card/90"
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-quicksand text-base font-bold">Phonics Insights</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {insight.confidenceLabel}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mb-4">{insight.summaryLine}</p>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-bold flex items-center gap-1 mb-1.5 text-emerald-700 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Strong sounds
            </p>
            <div className="flex flex-wrap gap-1">
              {insight.strongSounds.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px] font-mono">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="font-bold flex items-center gap-1 mb-1.5 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" /> Needs practice
            </p>
            <div className="flex flex-wrap gap-1">
              {insight.needsPracticeSounds.map((s) => (
                <Badge key={s} variant="outline" className="text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-semibold text-muted-foreground mb-1">Strong families</p>
            {insight.strongFamilies.map((f) => (
              <span key={f} className="mr-1 text-emerald-600 font-bold">
                ✓ {f}
              </span>
            ))}
            {insight.strongFamilies.length === 0 && (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-muted-foreground mb-1">Practice families</p>
            {insight.needsPracticeFamilies.map((f) => (
              <span key={f} className="mr-1 text-amber-600 font-bold">
                ⚠ {f}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-primary/5 border border-primary/10 p-3">
          <p className="text-[10px] font-bold text-primary mb-1">Recommended today</p>
          <p className="text-sm font-quicksand font-bold">
            {insight.recommendedWords.join(" · ") || "cat · hat · sat"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
