import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import type { PathStep, PeekAheadItem, ChildProgressSnapshot } from "@workspace/parent-hub-journey";
import type { HubJourneyStatus } from "@/hooks/use-hub-journey";
import { Day3InsightModal } from "@/components/day3-insight-modal";
import { JourneyUnlockCta } from "@/components/journey-preview-overlay";
import {
  buildDay3Insights,
  dayCompletionMessage,
  bonusUnlockMessage,
} from "@/lib/hub-journey-ux";

interface TodaysPathProps {
  childName: string;
  journeyDay: number;
  pathSteps: PathStep[];
  pathCompleted: boolean;
  peekAhead: PeekAheadItem[];
  peekAvailable: boolean;
  isJourneyLocked: boolean;
  isPremium: boolean;
  progress: ChildProgressSnapshot;
  progressSummary?: string;
  onComplete: (stepIds: string[]) => Promise<void>;
  onPeekAhead: () => Promise<void>;
  isCompleting: boolean;
}

function DayCompleteCelebration({
  day,
  childName,
  bonusLine,
  onDismiss,
}: {
  day: number;
  childName: string;
  bonusLine: string | null;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card
      data-testid="day-complete-celebration"
      className="rounded-2xl border-emerald-300/40 bg-gradient-to-br from-emerald-500/10 to-card overflow-hidden"
    >
      <CardContent className="p-5 space-y-3 text-center">
        <span className="text-3xl" aria-hidden>
          ✨
        </span>
        <p className="font-bold text-foreground leading-snug">
          {dayCompletionMessage(day, childName, t)}
        </p>
        {bonusLine && (
          <p className="text-sm text-primary font-semibold">{bonusLine}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("parent_hub.journey.path_done_tomorrow")}
        </p>
        <Button variant="outline" size="sm" className="rounded-full" onClick={onDismiss}>
          {t("parent_hub.journey.mark_done")}
        </Button>
      </CardContent>
    </Card>
  );
}

export function TodaysPath({
  childName,
  journeyDay,
  pathSteps,
  pathCompleted,
  peekAhead,
  peekAvailable,
  isJourneyLocked,
  isPremium,
  progress,
  progressSummary,
  onComplete,
  onPeekAhead,
  isCompleting,
}: TodaysPathProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [stepIdx, setStepIdx] = useState(0);
  const [doneSteps, setDoneSteps] = useState<Set<string>>(new Set());
  const [showDay3Insight, setShowDay3Insight] = useState(false);
  const [celebrationDay, setCelebrationDay] = useState<number | null>(null);
  const [peekRevealed, setPeekRevealed] = useState(!peekAvailable);

  const current = pathSteps[stepIdx];
  const allStepsDone = pathSteps.every((s) => doneSteps.has(s.id));
  const day3Insights = buildDay3Insights(childName, progress, pathSteps, peekAhead, t);

  const markStepDone = useCallback(() => {
    if (!current) return;
    setDoneSteps((prev) => new Set(prev).add(current.id));
    if (stepIdx + 1 < pathSteps.length) {
      setStepIdx((i) => i + 1);
    }
  }, [current, stepIdx, pathSteps.length]);

  const handleFinish = async () => {
    if (pathCompleted || isJourneyLocked) return;
    const ids = pathSteps.map((s) => s.id);
    await onComplete(ids);
    if (journeyDay >= 3) {
      setShowDay3Insight(true);
    } else {
      setCelebrationDay(journeyDay);
    }
  };

  const handlePeek = async () => {
    await onPeekAhead();
    setPeekRevealed(true);
  };

  if (celebrationDay !== null) {
    return (
      <DayCompleteCelebration
        day={celebrationDay}
        childName={childName}
        bonusLine={bonusUnlockMessage(celebrationDay, t)}
        onDismiss={() => setCelebrationDay(null)}
      />
    );
  }

  if (isJourneyLocked && !isPremium) {
    return (
      <Card
        data-testid="todays-path-locked"
        className="rounded-2xl border-primary/25 bg-gradient-to-br from-primary/8 to-card overflow-hidden"
      >
        <CardContent className="p-0">
          <div className="px-5 pt-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {t("parent_hub.journey.todays_path")}
            </p>
            <h3 className="font-quicksand font-bold text-lg text-foreground">
              {t("parent_hub.journey.path_locked_preview_title", { name: childName })}
            </h3>
          </div>
          <div className="relative px-5 pb-4 pointer-events-none select-none" aria-hidden>
            <div className="blur-[4px] opacity-75 space-y-2">
              {pathSteps.slice(0, 2).map((step) => (
                <div
                  key={step.id}
                  className="rounded-xl bg-muted/50 border border-border p-3 space-y-1"
                >
                  <span className="text-xl">{step.emoji}</span>
                  <p className="font-bold text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{step.body}</p>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90" />
          </div>
          <div className="px-5 pb-5">
            {progressSummary && (
              <p className="text-xs text-muted-foreground mb-3 text-center">{progressSummary}</p>
            )}
            <JourneyUnlockCta childName={childName} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pathCompleted) {
    return (
      <Card
        data-testid="todays-path-done"
        className="rounded-2xl border-emerald-300/30 bg-gradient-to-br from-emerald-500/5 to-card"
      >
        <CardContent className="p-5 space-y-2 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <p className="font-bold text-foreground">
            {dayCompletionMessage(journeyDay, childName, t)}
          </p>
          <p className="text-sm text-muted-foreground">
            {journeyDay >= 3
              ? t("parent_hub.journey.path_done_final")
              : t("parent_hub.journey.path_done_tomorrow")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card
        data-testid="todays-path"
        className="rounded-2xl border-primary/30 bg-gradient-to-br from-primary/8 to-card overflow-hidden shadow-[0_8px_32px_-12px_rgba(168,85,247,0.35)]"
      >
        <CardContent className="p-0">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                {t("parent_hub.journey.todays_path")}
              </p>
              <h3 className="font-quicksand font-bold text-lg text-foreground">
                {t("parent_hub.journey.path_for", { name: childName })}
              </h3>
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {stepIdx + 1}/{pathSteps.length}
            </span>
          </div>

          {current && (
            <div className="px-5 pb-4 space-y-3">
              <div className="rounded-xl bg-muted/50 dark:bg-white/[0.04] border border-border p-4 space-y-2">
                <span className="text-2xl">{current.emoji}</span>
                <p className="font-bold text-sm">{current.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
              </div>

              <div className="flex gap-2">
                {stepIdx > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setStepIdx((i) => i - 1)}
                  >
                    {t("common.back")}
                  </Button>
                )}
                <Button
                  className="flex-1 rounded-xl gap-1"
                  onClick={markStepDone}
                  disabled={doneSteps.has(current.id) && stepIdx + 1 >= pathSteps.length}
                >
                  {stepIdx + 1 >= pathSteps.length
                    ? t("parent_hub.journey.mark_done")
                    : t("parent_hub.journey.next_step")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {allStepsDone && (
                <Button
                  className="w-full rounded-xl gap-2 bg-gradient-to-r from-primary to-violet-600"
                  onClick={() => void handleFinish()}
                  disabled={isCompleting}
                  data-testid="todays-path-complete"
                >
                  <Sparkles className="h-4 w-4" />
                  {isCompleting
                    ? t("common.loading")
                    : t("parent_hub.journey.complete_day", { day: journeyDay })}
                </Button>
              )}
            </div>
          )}

          {peekAvailable && !peekRevealed && (
            <div className="px-5 pb-4 border-t border-border/50 pt-3">
              <button
                type="button"
                onClick={() => void handlePeek()}
                className="w-full text-left text-xs text-primary font-semibold hover:underline"
              >
                {t("parent_hub.journey.peek_ahead_cta")}
              </button>
            </div>
          )}

          {peekRevealed && peekAhead.length > 0 && (
            <div className="px-5 pb-4 border-t border-border/50 pt-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("parent_hub.journey.peek_ahead_title")}
              </p>
              {peekAhead.map((item, i) => (
                <div
                  key={i}
                  className={[
                    "rounded-lg px-3 py-2 text-xs flex gap-2 items-start",
                    item.locked ? "opacity-60 blur-[0.5px]" : "bg-primary/5",
                  ].join(" ")}
                >
                  <span>{item.emoji}</span>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showDay3Insight && (
        <Day3InsightModal
          childName={childName}
          insights={day3Insights}
          onContinue={() => setLocation("/pricing?reason=hub_journey")}
          onClose={() => setShowDay3Insight(false)}
        />
      )}
    </>
  );
}

export function TodaysPathFromStatus(props: {
  status: HubJourneyStatus;
  isPremium: boolean;
  isJourneyLocked: boolean;
  onComplete: (stepIds: string[]) => Promise<void>;
  onPeekAhead: () => Promise<void>;
  isCompleting: boolean;
}) {
  return (
    <TodaysPath
      childName={props.status.child.name}
      journeyDay={props.status.journeyDay}
      pathSteps={props.status.pathSteps}
      pathCompleted={props.status.pathCompleted}
      peekAhead={props.status.peekAhead}
      peekAvailable={props.status.peekAvailable}
      isJourneyLocked={props.isJourneyLocked}
      isPremium={props.isPremium}
      progress={props.status.progress}
      progressSummary={props.status.progress.summaryLine}
      onComplete={props.onComplete}
      onPeekAhead={props.onPeekAhead}
      isCompleting={props.isCompleting}
    />
  );
}
