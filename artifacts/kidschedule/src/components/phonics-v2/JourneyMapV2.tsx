import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type PhonicsV2Stage,
} from "@/lib/phonics-v2/content/journey-stages";
import type { PhonicsV2JourneyProgress } from "@/lib/phonics-v2/v2-journey-progress";
import {
  buildJourneyProgressionContext,
  buildJourneyStageViews,
  computeMasteryBasedJourneyPct,
  recommendedLevelLabel,
  resolveCurrentTargetStage,
  showsRecommendedLevelBanner,
  type JourneyStageStatus,
} from "@/lib/phonics-v2/journey-progression";
import { Check, Lock, Play, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

type JourneyMapV2Props = {
  curriculumLevel?: number | null;
  masteryScore?: number;
  lastTestAt?: string | null;
  streak?: number;
  practicedItemCount?: number;
  totalAgeMonths: number;
  journeyProgress: PhonicsV2JourneyProgress;
  onStageSelect?: (stage: PhonicsV2Stage, status: JourneyStageStatus) => void;
};

const STATUS_CARD_STYLES: Record<JourneyStageStatus, string> = {
  locked: "opacity-55 border-border bg-muted/20",
  available_for_review: "border-amber-500/30 bg-amber-500/5",
  current_target: "border-primary/50 bg-primary/10 ring-1 ring-primary/20",
  mastered: "border-emerald-500/40 bg-emerald-500/10",
};

const STATUS_NODE_STYLES: Record<JourneyStageStatus, string> = {
  locked: "border-muted-foreground/30 bg-muted text-muted-foreground",
  available_for_review: "border-amber-500/60 bg-amber-500/15 text-foreground",
  current_target: "border-primary bg-primary/25 text-foreground",
  mastered: "border-emerald-500 bg-emerald-500 text-white",
};

export function JourneyMapV2({
  curriculumLevel,
  masteryScore = 0,
  lastTestAt,
  streak = 0,
  practicedItemCount = 0,
  totalAgeMonths,
  journeyProgress,
  onStageSelect,
}: JourneyMapV2Props) {
  const ctx = useMemo(
    () =>
      buildJourneyProgressionContext({
        curriculumLevel,
        masteryScore,
        totalAgeMonths,
        masteredStages: journeyProgress.masteredStages,
        lastTestAt,
        streak,
        practicedItemCount,
      }),
    [
      curriculumLevel,
      masteryScore,
      totalAgeMonths,
      journeyProgress.masteredStages,
      lastTestAt,
      streak,
      practicedItemCount,
    ],
  );

  const currentTarget = useMemo(() => resolveCurrentTargetStage(ctx), [ctx]);
  const stages = useMemo(() => buildJourneyStageViews(ctx), [ctx]);
  const pct = computeMasteryBasedJourneyPct(ctx);
  const showRecommended = showsRecommendedLevelBanner(ctx);

  return (
    <Card
      id="phonics-v2-journey-map"
      data-testid="phonics-v2-journey-map"
      className="rounded-3xl border border-white/[0.08] bg-card/90 overflow-hidden"
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-quicksand text-base font-bold">Reading Journey</h3>
            <p className="text-[11px] text-muted-foreground">
              {pct}% mastered · {currentTarget.title}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
            {currentTarget.emoji}
          </div>
        </div>

        {showRecommended && (
          <div
            className="mb-4 rounded-2xl border border-primary/25 bg-primary/5 px-3 py-2"
            data-testid="journey-recommended-level"
          >
            <p className="text-[11px] font-semibold text-primary">Recommended Level</p>
            <p className="text-[10px] text-muted-foreground">
              Start at {recommendedLevelLabel(ctx)} — earlier stages stay open for review anytime.
            </p>
          </div>
        )}

        <div className="relative space-y-0">
          {stages.map(({ stage, status, actionLabel, selectable }, idx) => (
            <div key={stage.id} className="relative flex gap-3 pb-4 last:pb-0">
              {idx < stages.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[18px] top-10 w-0.5 h-[calc(100%-1.5rem)]",
                    status === "mastered" ? "bg-emerald-500/50" : "bg-border",
                  )}
                />
              )}
              <motion.button
                type="button"
                disabled={!selectable}
                onClick={() => selectable && onStageSelect?.(stage, status)}
                className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-all",
                  STATUS_NODE_STYLES[status],
                )}
                whileTap={selectable ? { scale: 0.92 } : undefined}
                data-testid={`journey-node-${stage.id}`}
                data-journey-status={status}
              >
                {status === "mastered" ? (
                  <Check className="h-4 w-4" />
                ) : status === "locked" ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <span>{stage.emoji}</span>
                )}
              </motion.button>
              <div
                className={cn(
                  "flex-1 rounded-2xl border p-3 transition-all",
                  STATUS_CARD_STYLES[status],
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-quicksand text-sm font-bold">{stage.title}</p>
                      {status === "mastered" && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        >
                          Mastered
                        </Badge>
                      )}
                      {status === "current_target" && (
                        <Badge variant="default" className="text-[9px] h-5">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{stage.subtitle}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={status === "current_target" ? "default" : "outline"}
                    disabled={!selectable}
                    className="shrink-0 h-7 text-[10px] rounded-xl px-2.5"
                    onClick={() => selectable && onStageSelect?.(stage, status)}
                    data-testid={`journey-action-${stage.id}`}
                  >
                    {status === "current_target" ? (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        {actionLabel}
                      </>
                    ) : status === "locked" ? (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        {actionLabel}
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {actionLabel}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
