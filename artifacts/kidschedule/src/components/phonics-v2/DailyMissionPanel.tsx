import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import type { PhonicsDailyPlan } from "@workspace/phonics-curriculum";
import {
  buildDailyReadingMission,
  completeMissionTask,
  type DailyReadingMission,
} from "@/lib/phonics-v2/daily-missions";
import {
  hydratePhonicsV3Progress,
  loadPhonicsV3MissionLocal,
  persistPhonicsV3Mission,
} from "@/lib/phonics-v3/sync";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { buildAdaptiveDailyMission } from "@/lib/phonics-v3/adaptive-selector";
import type { PhonicsMasteryState } from "@/lib/phonics-v3/mastery-engine";
import type { PhonicsRetentionState } from "@/lib/phonics-v3/spaced-repetition";
import { loadPhonicsHabitState } from "@/lib/phonics-journey-habit";
import { Target, Flame, CheckCircle2 } from "lucide-react";
import {
  isGrowLivingV1Enabled,
  livingGrowMissionEyebrow,
  livingGrowStreakLabel,
} from "@/lib/grow/living-room";
import { KaraokeBlendRound } from "./KaraokeBlendRound";
import { DecodableStoryReader } from "./DecodableStoryReader";

export type MissionSummary = {
  doneCount: number;
  totalCount: number;
  completed: boolean;
  streakDay: number;
};

type DailyMissionPanelProps = {
  childId: number;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  mastery?: PhonicsMasteryState;
  retention?: PhonicsRetentionState;
  curriculumLevel?: number | null;
  /** SATPIN letter group from curriculum progress. */
  letterGroupIndex?: number | null;
  plan?: PhonicsDailyPlan | null;
  missionStoryId?: string;
  onCompleteCurriculumActivity?: (activityId: string) => Promise<void>;
  onMissionSummaryChange?: (summary: MissionSummary) => void;
  onTaskComplete?: (taskId: string) => void;
  /** Opens the full 10-step reading lesson for today's focus sound. */
  onStartReadingLesson?: () => void;
};

export function DailyMissionPanel({
  childId,
  items,
  progress,
  onTaskComplete,
  mastery,
  retention,
  curriculumLevel,
  letterGroupIndex,
  plan,
  missionStoryId,
  onCompleteCurriculumActivity,
  onMissionSummaryChange,
  onStartReadingLesson,
}: DailyMissionPanelProps) {
  const authFetch = useAuthFetch();
  const [mission, setMission] = useState<DailyReadingMission | null>(null);
  const [activeBlend, setActiveBlend] = useState<string | null>(null);
  const [activeStory, setActiveStory] = useState<string | null>(null);

  useEffect(() => {
    void hydratePhonicsV3Progress(childId, authFetch).catch((err) => {
      console.warn("[phonics-v2] daily mission hydrate failed", err);
    });
  }, [childId, authFetch]);

  useEffect(() => {
    const habit = loadPhonicsHabitState(childId);
    const dateKey = new Date().toISOString().slice(0, 10);
    const cached = loadPhonicsV3MissionLocal(childId);
    const existing = cached?.dateKey === dateKey ? cached : null;
    const built =
      existing ??
      (mastery
        ? {
            dateKey,
            ...buildAdaptiveDailyMission({
              childId,
              items,
              progress,
              mastery,
              retention,
              streakDay: habit.weekly.practiceDays,
              curriculumLevel: curriculumLevel ?? undefined,
              letterGroupIndex: letterGroupIndex ?? undefined,
              storyId: missionStoryId,
            }),
          }
        : buildDailyReadingMission({
            childId,
            items,
            progress,
            streakDay: habit.weekly.practiceDays,
          }));
    setMission(built);
    if (!existing) persistPhonicsV3Mission(childId, built);
  }, [
    childId,
    items,
    progress,
    mastery,
    retention,
    curriculumLevel,
    letterGroupIndex,
    missionStoryId,
  ]);

  useEffect(() => {
    if (!mission) return;
    const doneCount = mission.tasks.filter((t) => t.completed).length;
    onMissionSummaryChange?.({
      doneCount,
      totalCount: mission.tasks.length,
      completed: mission.completed,
      streakDay: mission.streakDay,
    });
  }, [mission, onMissionSummaryChange]);

  const syncCurriculumActivity = useCallback(async () => {
    if (!plan || !onCompleteCurriculumActivity) return;
    const next = [...plan.practice, ...plan.revision].find((a) => !a.completed);
    if (next) await onCompleteCurriculumActivity(next.id);
  }, [plan, onCompleteCurriculumActivity]);

  const complete = useCallback(
    (taskId: string) => {
      if (!mission) return;
      const next = completeMissionTask(mission, taskId);
      setMission(next);
      persistPhonicsV3Mission(childId, next);
      void syncCurriculumActivity();
      onTaskComplete?.(taskId);
    },
    [mission, childId, onTaskComplete, syncCurriculumActivity],
  );

  if (!mission) return null;

  const doneCount = mission.tasks.filter((t) => t.completed).length;

  return (
    <Card
      id="phonics-today-mission"
      data-testid="phonics-v2-daily-mission"
      data-gw-living={isGrowLivingV1Enabled() ? "1" : undefined}
      className={cn(
        "rounded-3xl scroll-mt-24",
        isGrowLivingV1Enabled()
          ? "gw-living-deep-panel border-[rgba(232,212,184,0.28)]"
          : "border border-white/[0.08] bg-card/90",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-quicksand text-base font-bold">
                {isGrowLivingV1Enabled()
                  ? livingGrowMissionEyebrow()
                  : "Today's Mission"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                ~{mission.estimatedMinutes} min · {doneCount}/{mission.tasks.length} done
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1 text-[10px]">
            {!isGrowLivingV1Enabled() && <Flame className="h-3 w-3" />}
            {isGrowLivingV1Enabled()
              ? livingGrowStreakLabel(mission.streakDay) || `Day ${mission.streakDay}`
              : `Day ${mission.streakDay}`}
          </Badge>
        </div>

        <div className="space-y-2">
          {mission.tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                task.completed
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-card/50",
              )}
            >
              <span className="text-lg">{task.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{task.label}</p>
              </div>
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full text-[10px] h-7 shrink-0"
                  onClick={() => {
                    if (task.slot === "challenge" && onStartReadingLesson) {
                      setActiveBlend(null);
                      setActiveStory(null);
                      onStartReadingLesson();
                      complete(task.id);
                    } else if (task.slot === "challenge" && task.word) {
                      setActiveBlend(task.word);
                      setActiveStory(null);
                    } else if (task.slot === "story" && task.storyId) {
                      setActiveStory(task.storyId);
                      setActiveBlend(null);
                    } else {
                      complete(task.id);
                    }
                  }}
                >
                  {task.slot === "challenge" && onStartReadingLesson ? "Lesson" : "Go"}
                </Button>
              )}
            </div>
          ))}
        </div>

        {activeBlend && (
          <div className="mt-4 border-t border-border pt-4">
            <KaraokeBlendRound
              word={activeBlend}
              autoStart
              onComplete={() => {
                const t = mission.tasks.find((x) => x.word === activeBlend);
                if (t) complete(t.id);
                setActiveBlend(null);
              }}
            />
          </div>
        )}

        {activeStory && (
          <div className="mt-4 border-t border-border pt-4">
            <DecodableStoryReader
              storyId={activeStory}
              onComplete={() => {
                const t = mission.tasks.find((x) => x.storyId === activeStory);
                if (t) complete(t.id);
                setActiveStory(null);
              }}
            />
          </div>
        )}

        {mission.completed && (
          <p className="mt-4 text-center text-sm font-bold text-emerald-600">
            Mission complete! See you tomorrow.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
