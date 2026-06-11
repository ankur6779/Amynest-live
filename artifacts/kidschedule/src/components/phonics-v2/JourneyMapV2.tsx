import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PHONICS_V2_STAGES,
  resolveV2ActiveStage,
  resolveV2StageStatus,
  computeV2JourneyPct,
  type PhonicsV2Stage,
  type PhonicsV2StageStatus,
} from "@/lib/phonics-v2/content/journey-stages";
import type { PhonicsV2JourneyProgress } from "@/lib/phonics-v2/v2-journey-progress";
import { masteredStageOrders } from "@/lib/phonics-v2/v2-journey-progress";
import { Check, Lock } from "lucide-react";
import { motion } from "framer-motion";

type JourneyMapV2Props = {
  curriculumLevel?: number | null;
  totalAgeMonths: number;
  journeyProgress: PhonicsV2JourneyProgress;
  onStageSelect?: (stage: PhonicsV2Stage) => void;
};

const STATUS_STYLES: Record<PhonicsV2StageStatus, string> = {
  locked: "opacity-50 border-border bg-muted/30",
  available: "border-primary/40 bg-primary/5 ring-1 ring-primary/15",
  completed: "border-emerald-500/40 bg-emerald-500/10",
};

export function JourneyMapV2({
  curriculumLevel,
  totalAgeMonths,
  journeyProgress,
  onStageSelect,
}: JourneyMapV2Props) {
  const active = resolveV2ActiveStage(curriculumLevel ?? null, totalAgeMonths);
  const mastered = masteredStageOrders(journeyProgress);
  const pct = computeV2JourneyPct(mastered.length);

  const stages = useMemo(
    () =>
      PHONICS_V2_STAGES.map((stage) => ({
        stage,
        status: resolveV2StageStatus(stage, active, mastered),
      })),
    [active, mastered],
  );

  return (
    <Card
      id="phonics-v2-journey-map"
      data-testid="phonics-v2-journey-map"
      className="rounded-3xl border border-white/[0.08] bg-card/90 overflow-hidden"
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-quicksand text-base font-bold">Reading Journey</h3>
            <p className="text-[11px] text-muted-foreground">
              {pct}% complete · {active.title}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
            {active.emoji}
          </div>
        </div>

        <div className="relative space-y-0">
          {stages.map(({ stage, status }, idx) => (
            <div key={stage.id} className="relative flex gap-3 pb-4 last:pb-0">
              {idx < stages.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[18px] top-10 w-0.5 h-[calc(100%-1.5rem)]",
                    status === "completed" ? "bg-emerald-500/50" : "bg-border",
                  )}
                />
              )}
              <motion.button
                type="button"
                disabled={status === "locked"}
                onClick={() => status !== "locked" && onStageSelect?.(stage)}
                className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-all",
                  status === "completed"
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : status === "available"
                      ? "border-primary bg-primary/20"
                      : "border-muted-foreground/30 bg-muted",
                )}
                whileTap={status !== "locked" ? { scale: 0.92 } : undefined}
                animate={
                  status === "completed"
                    ? { scale: [1, 1.08, 1] }
                    : undefined
                }
                transition={{ duration: 0.4 }}
              >
                {status === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : status === "locked" ? (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <span>{stage.emoji}</span>
                )}
              </motion.button>
              <button
                type="button"
                disabled={status === "locked"}
                onClick={() => status !== "locked" && onStageSelect?.(stage)}
                className={cn(
                  "flex-1 rounded-2xl border p-3 text-left transition-all",
                  STATUS_STYLES[status],
                  status !== "locked" && "hover:scale-[1.01] active:scale-[0.99]",
                )}
              >
                <p className="font-quicksand text-sm font-bold">{stage.title}</p>
                <p className="text-[10px] text-muted-foreground">{stage.subtitle}</p>
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
