import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  History,
  Lightbulb,
  Lock,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { usePhonicsCurriculum } from "@/hooks/use-phonics-curriculum";
import type { DisplayPhonicsItem, PhonicsInsight, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import type { PhonicsLevel } from "@/lib/phonics-content";
import type { PhonicsPrimaryCta } from "@/lib/phonics-journey-roadmap";
import {
  PHONICS_JOURNEY_STAGES,
  MISSION_READING_POINTS,
  computeJourneyCompletionPct,
  estimateJourneyEta,
  isMissionComplete,
  isMissionStarted,
  nextJourneyStage,
  readingAgeBand,
  resolveActiveJourneyStage,
  resolvePrimaryCta,
  stageStatus,
} from "@/lib/phonics-journey-roadmap";
import {
  READING_POINTS,
  buildCelebrationBanners,
  computeTotalReadingPoints,
  computeWeeklyMomentum,
  hasReviewItems,
  missionCompleteEmptyActions,
  resolveNextBestAction,
  resolveNextUnlock,
  resolveStreakMotivation,
  scrollToJourneySection,
  sessionsUntilNextMilestone,
} from "@/lib/phonics-journey-engagement";
import {
  type DailyCommitmentType,
  buildDailyWins,
  buildParentConfidenceTransform,
  buildSessionCompletion,
  buildWeeklyReadingReport,
  comebackActions,
  commitmentLabel,
  inferTodayFromProgress,
  isCommitmentAchieved,
  isComeback,
  loadPhonicsHabitState,
  nextBadgeThreshold,
  resolveFutureMotivation,
  resolveReadingBadges,
  resolveReadingIdentity,
  resolveStreakChainMessage,
  setDailyCommitment,
  syncWeeklyBaseline,
  touchPhonicsVisit,
  updateStageProgress,
  daysSinceLastActive,
} from "@/lib/phonics-journey-habit";
import {
  buildAdaptiveMissionGoals,
  buildMilestoneActionPlan,
  buildPredictiveMilestones,
  buildPersonalizedParentInsight,
  buildWeakSoundsProfile,
  buildWeeklyAiSummary,
  computeReadingConfidenceScore,
  detectEngagementRisk,
  resolveCoachMessage,
  resolveLearningVelocity,
  syncAdaptiveWeeklySnapshot,
} from "@/lib/phonics-journey-adaptive";

export type PhonicsJourneyHubProps = {
  childId: number;
  childName: string;
  totalAgeMonths: number;
  level: PhonicsLevel;
  progress: PhonicsProgressMap;
  practiceItems: DisplayPhonicsItem[];
  insights?: PhonicsInsight[] | null;
  dailyQuizComplete?: boolean;
  onPrimaryCtaChange?: (cta: PhonicsPrimaryCta) => void;
};

const CARD_SURFACE =
  "rounded-3xl border border-white/[0.06] bg-card/90 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-shadow duration-300";

export function PhonicsJourneyHub({
  childId,
  childName,
  totalAgeMonths,
  level,
  progress,
  practiceItems,
  insights = null,
  dailyQuizComplete = false,
  onPrimaryCtaChange,
}: PhonicsJourneyHubProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [habitState, setHabitState] = useState(() => loadPhonicsHabitState(childId));
  const [adaptiveState, setAdaptiveState] = useState(() =>
    syncAdaptiveWeeklySnapshot(childId, { practiceDays: 0, wordsReviewed: 0, wordsMastered: 0, accuracyPct: 0 }, null),
  );
  const [isReturningUser] = useState(() => isComeback(loadPhonicsHabitState(childId).lastActiveDate));
  const { data: curriculumData, loading: curriculumLoading } = usePhonicsCurriculum(childId);

  useEffect(() => {
    setHabitState(touchPhonicsVisit(childId));
  }, [childId]);

  useEffect(() => {
    setHabitState(loadPhonicsHabitState(childId));
  }, [childId, progress, dailyQuizComplete]);

  const plan = curriculumData?.plan;
  const curriculumProgress = curriculumData?.progress;
  const curriculumLevel = plan?.currentLevel ?? curriculumProgress?.currentLevel;
  const masteryScore = plan?.masteryScore ?? curriculumProgress?.masteryScore ?? 0;
  const streak = plan?.streak ?? curriculumProgress?.streak ?? 0;
  const weakPhonemes = plan?.weakPhonemes ?? curriculumProgress?.weakPhonemes ?? [];
  const lastTestScore = curriculumProgress?.lastTestScore ?? null;

  const activeStage = useMemo(
    () => resolveActiveJourneyStage(curriculumLevel, totalAgeMonths),
    [curriculumLevel, totalAgeMonths],
  );
  const nextStage = nextJourneyStage(activeStage);
  const nextUnlock = resolveNextUnlock(nextStage);

  const journeyCompletionPct = computeJourneyCompletionPct(
    curriculumLevel,
    masteryScore,
    progress,
    practiceItems.length,
  );

  const masteredCount = Object.keys(progress.mastered).length;
  const practicedCount = Object.keys(progress.practiced).length;
  const readingIdentity = resolveReadingIdentity(activeStage, journeyCompletionPct);
  const ageBand = readingAgeBand(totalAgeMonths);

  const inferredToday = useMemo(
    () => inferTodayFromProgress(progress, practiceItems),
    [progress, practiceItems],
  );
  const todayUniqueSounds = Math.max(
    habitState.today.uniqueItemIds.length,
    inferredToday.uniqueItemIds.length,
  );
  const todayPlayCount = Math.max(habitState.today.playCount, inferredToday.playCount);
  const todayMastered =
    habitState.today.masteredSymbols.length > 0
      ? habitState.today.masteredSymbols
      : inferredToday.masteredSymbols;

  const etaLabel = estimateJourneyEta(activeStage, masteryScore, curriculumLevel);
  const sessionsLeft = sessionsUntilNextMilestone(masteryScore);

  const weakProfile = useMemo(
    () => buildWeakSoundsProfile(weakPhonemes, progress, practiceItems),
    [weakPhonemes, progress, practiceItems],
  );

  const missionGoals = useMemo(
    () =>
      buildAdaptiveMissionGoals(
        plan ?? null,
        progress,
        practiceItems,
        weakProfile,
        dailyQuizComplete || (plan?.test.completed ?? false),
        todayUniqueSounds,
        todayMastered,
      ),
    [plan, progress, practiceItems, weakProfile, dailyQuizComplete, todayUniqueSounds, todayMastered],
  );

  const missionComplete = isMissionComplete(missionGoals);
  const missionStarted = isMissionStarted(missionGoals, practicedCount);
  const missionDoneCount = missionGoals.filter((g) => g.done).length;
  const missionPct =
    missionGoals.length > 0
      ? Math.round((missionDoneCount / missionGoals.length) * 100)
      : 0;

  const quizComplete = dailyQuizComplete || (plan?.test.completed ?? false);
  const reviewNeeded = hasReviewItems(progress, practiceItems);

  const commitmentAchieved = isCommitmentAchieved(habitState.commitment, {
    missionComplete,
    todayPlayCount,
    todayUniqueSounds,
  });
  const fullSessionComplete = missionComplete && quizComplete;

  const primaryCta = useMemo(
    () =>
      resolvePrimaryCta({
        missionStarted,
        missionComplete,
        dailyQuizComplete: quizComplete,
        hasReviewItems: reviewNeeded,
      }),
    [missionStarted, missionComplete, quizComplete, reviewNeeded],
  );

  const nextBestAction = useMemo(
    () =>
      resolveNextBestAction({
        missionStarted,
        missionComplete,
        dailyQuizComplete: quizComplete,
        hasReviewItems: reviewNeeded,
        primaryCta,
      }),
    [missionStarted, missionComplete, quizComplete, reviewNeeded, primaryCta],
  );

  const momentum = useMemo(
    () => computeWeeklyMomentum(progress, streak),
    [progress, streak],
  );

  useEffect(() => {
    setAdaptiveState(
      syncAdaptiveWeeklySnapshot(
        childId,
        momentum,
        typeof lastTestScore === "number" ? lastTestScore : null,
      ),
    );
  }, [childId, momentum, lastTestScore]);

  const readingConfidence = useMemo(
    () =>
      computeReadingConfidenceScore({
        masteryScore,
        lastTestScore: typeof lastTestScore === "number" ? lastTestScore : null,
        streak,
        momentum,
        masteredCount,
        practicedCount,
      }),
    [masteryScore, lastTestScore, streak, momentum, masteredCount, practicedCount],
  );

  const learningVelocity = useMemo(
    () => resolveLearningVelocity(momentum, habitState.weekly, adaptiveState),
    [momentum, habitState.weekly, adaptiveState],
  );

  const coachMessage = useMemo(
    () =>
      resolveCoachMessage({
        childName,
        weakProfile,
        missionComplete,
        quizComplete,
        masteredToday: todayMastered.length,
        lastTestScore: typeof lastTestScore === "number" ? lastTestScore : null,
        priorTestScore: adaptiveState.lastRecordedTestScore,
        activeStage,
      }),
    [
      childName,
      weakProfile,
      missionComplete,
      quizComplete,
      todayMastered.length,
      lastTestScore,
      adaptiveState.lastRecordedTestScore,
      activeStage,
    ],
  );

  const predictiveMilestones = useMemo(
    () =>
      buildPredictiveMilestones({
        activeStage,
        nextStage,
        masteryScore,
        practiceDaysPerWeek: Math.max(1, momentum.practiceDays),
      }),
    [activeStage, nextStage, masteryScore, momentum.practiceDays],
  );

  const engagementRisk = useMemo(
    () =>
      detectEngagementRisk({
        streak,
        daysSinceActive: daysSinceLastActive(habitState.lastActiveDate),
        momentum,
        weeklyBaseline: habitState.weekly,
        lastTestScore: typeof lastTestScore === "number" ? lastTestScore : null,
        adaptiveState,
      }),
    [streak, habitState.lastActiveDate, habitState.weekly, momentum, lastTestScore, adaptiveState],
  );

  const weeklyAiSummary = useMemo(
    () =>
      buildWeeklyAiSummary({
        momentum,
        weeklyBaseline: habitState.weekly,
        weakProfile,
        learningVelocity,
      }),
    [momentum, habitState.weekly, weakProfile, learningVelocity],
  );

  const milestoneActionPlan = useMemo(
    () =>
      buildMilestoneActionPlan({
        nextStage,
        masteryScore,
        masteredCount,
        quizComplete,
        quickChecksThisWeek: quizComplete ? 1 : 0,
      }),
    [nextStage, masteryScore, masteredCount, quizComplete],
  );

  useEffect(() => {
    setHabitState(syncWeeklyBaseline(childId, momentum));
  }, [childId, momentum.practiceDays, momentum.wordsReviewed, momentum.wordsMastered, momentum.accuracyPct]);

  useEffect(() => {
    setHabitState(updateStageProgress(childId, activeStage.order));
  }, [childId, activeStage.order]);

  const streakInfo = useMemo(() => resolveStreakMotivation(streak), [streak]);
  const streakChainMsg = resolveStreakChainMessage(streak, missionComplete, commitmentAchieved);
  const weeklyReport = buildWeeklyReadingReport(momentum, habitState.weekly);
  const dailyWins = buildDailyWins({
    todayMastered,
    todayUniqueSounds,
    todayPlayCount,
    missionComplete,
    quizComplete,
    lastTestScore: typeof lastTestScore === "number" ? lastTestScore : null,
  });
  const sessionCompletion = fullSessionComplete
    ? buildSessionCompletion({
        todayPlayCount,
        todayUniqueSounds,
        todayMastered,
        quizComplete,
        nextStage,
      })
    : null;
  const futureMotivation = resolveFutureMotivation({
    nextStage,
    sessionsUntilMilestone: sessionsLeft,
    masteredCount,
    nextBadgeThreshold: nextBadgeThreshold(masteredCount),
  });
  const confidenceTransform = buildParentConfidenceTransform(
    activeStage,
    habitState.lastStageOrder,
  );
  const readingBadges = resolveReadingBadges({
    masteredCount,
    streak,
    activeStage,
    journeyCompletionPct,
  });
  const showComeback = isReturningUser && !missionStarted;

  const parentInsight = useMemo(
    () =>
      buildPersonalizedParentInsight({
        childName,
        weakProfile,
        momentum,
        weeklyBaseline: habitState.weekly,
        lastTestScore: typeof lastTestScore === "number" ? lastTestScore : null,
        activeStage,
        masteredCount,
        practicedCount,
        learningVelocity,
      }),
    [
      childName,
      weakProfile,
      momentum,
      habitState.weekly,
      lastTestScore,
      activeStage,
      masteredCount,
      practicedCount,
      learningVelocity,
    ],
  );

  const celebrations = useMemo(
    () =>
      buildCelebrationBanners({
        masteredCount,
        activeStage,
        curriculumLevel,
        masteryScore,
      }),
    [masteredCount, activeStage, curriculumLevel, masteryScore],
  );

  const readingPointsTotal = computeTotalReadingPoints({
    practicedCount,
    masteredCount,
    missionComplete,
    quizComplete,
  });

  useEffect(() => {
    onPrimaryCtaChange?.(primaryCta);
  }, [primaryCta, onPrimaryCtaChange]);

  const pickCommitment = (type: DailyCommitmentType) => {
    setHabitState(setDailyCommitment(childId, type));
  };

  return (
    <div className="space-y-5" data-testid="phonics-journey-hub">
      {engagementRisk && !showComeback && (
        <Card
          className={cn(CARD_SURFACE, "border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] to-transparent")}
          data-testid="phonics-engagement-risk"
        >
          <CardContent className="space-y-3 p-4">
            <p className="font-quicksand text-sm font-bold text-foreground">{engagementRisk.title}</p>
            <p className="text-[11px] text-muted-foreground">{engagementRisk.message}</p>
            <div className="flex flex-wrap gap-2">
              {engagementRisk.actions.map((a) => (
                <Button
                  key={a.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => scrollToJourneySection(a.scrollTarget)}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showComeback && (
        <Card
          className={cn(CARD_SURFACE, "border-primary/20 bg-gradient-to-br from-primary/[0.08] to-transparent")}
          data-testid="phonics-comeback"
        >
          <CardContent className="space-y-3 p-4">
            <p className="font-quicksand text-sm font-bold text-foreground">
              Welcome back, {childName}! Ready to continue the reading journey?
            </p>
            <p className="text-[11px] text-muted-foreground">
              No pressure — a short session today picks up right where you left off.
            </p>
            <div className="flex flex-wrap gap-2">
              {comebackActions().map((a) => (
                <Button
                  key={a.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => scrollToJourneySection(a.scrollTarget)}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {habitState.lastSession && (
        <Card className={cn(CARD_SURFACE, "border-white/[0.08]")} data-testid="phonics-last-session">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                Last session
              </p>
            </div>
            <ul className="space-y-1 text-sm text-foreground">
              {habitState.lastSession.summaryLines.map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {line}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs font-semibold"
              onClick={() => scrollToJourneySection("phonics-today-mission")}
            >
              Continue where you left off →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Hero — alive + encouraging */}
      <Card
        className={cn(
          CARD_SURFACE,
          "overflow-hidden border-primary/15 bg-gradient-to-br from-violet-500/[0.12] via-[#0B1220]/80 to-[#0B1220]/40",
        )}
      >
        <CardContent className="space-y-4 p-5">
          <p className="font-quicksand text-base font-bold leading-snug text-foreground">
            {coachMessage}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Phonics helps children connect letters and sounds so they can learn to read
            independently.
          </p>

          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
            onClick={() => setWhyOpen((o) => !o)}
            aria-expanded={whyOpen}
          >
            <span className="text-xs font-semibold text-muted-foreground">
              Why does this matter?
            </span>
            {whyOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>

          {whyOpen && (
            <div className="space-y-2 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-3 text-xs leading-relaxed text-muted-foreground">
              <p>{activeStage.parentWhy}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <HeroStat label="Reading Level" value={ageBand} />
            <HeroStat label="Reader Identity" value={readingIdentity} />
            <HeroStat label="Confidence" value={`${readingConfidence}/100`} />
          </div>

          <div className="flex items-center gap-4">
            <div
              className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border-[3px] border-primary/25 bg-card/80 shadow-[0_0_28px_-6px_hsl(var(--primary)/0.5)] transition-shadow duration-500"
              aria-label={`${journeyCompletionPct}% complete`}
            >
              <div className="text-center">
                <span className="block font-quicksand text-lg font-black leading-none text-primary">
                  {journeyCompletionPct}%
                </span>
                <span className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
                  Complete
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <Progress value={journeyCompletionPct} className="h-2 transition-all duration-700" />
              <p className="text-xs font-medium text-foreground">{etaLabel}</p>
              {predictiveMilestones.map((m) => (
                <p key={m.stageName} className="text-[10px] text-primary/90">
                  At your pace: {m.forecast}
                </p>
              ))}
              <p className="text-[10px] text-muted-foreground">
                {activeStage.milestoneName} · {activeStage.outcomeLabel}
              </p>
            </div>
          </div>

          {readingPointsTotal > 0 && (
            <div className="flex items-center justify-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                {readingPointsTotal} Reading Points earned
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Focus area — weak sounds */}
      {weakProfile.primary && (
        <Card className={cn(CARD_SURFACE, "border-primary/15")} data-testid="phonics-focus-area">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                Focus Area This Week
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{weakProfile.focusMessage}</p>
              {weakProfile.sounds.length > 1 && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Also watch: {weakProfile.sounds.slice(1, 3).join(", ")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily reading commitment */}
      <Card className={cn(CARD_SURFACE, "border-violet-500/15")} data-testid="phonics-daily-goal">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold text-foreground">Today&apos;s Reading Goal</p>
            </div>
            {commitmentAchieved && (
              <Badge className="border-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                Goal Achieved ✓
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {(["5min", "10sounds", "1mission"] as DailyCommitmentType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => pickCommitment(type)}
                className={cn(
                  "flex-1 rounded-xl border px-2 py-2 text-center text-[10px] font-bold transition-all",
                  habitState.commitment === type
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:border-primary/30",
                )}
              >
                {commitmentLabel(type)}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {commitmentAchieved
              ? "Consistency beats intensity — same time tomorrow?"
              : "Small daily goals build lifelong reading habits."}
          </p>
        </CardContent>
      </Card>

      {/* Daily wins */}
      {dailyWins.length > 0 && (
        <Card className={cn(CARD_SURFACE, "border-emerald-500/10")} data-testid="phonics-daily-wins">
          <CardContent className="space-y-2 p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Today&apos;s wins
            </p>
            {dailyWins.map((win) => (
              <p key={win} className="text-sm text-foreground">
                {win}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next best action */}
      <Card
        className={cn(CARD_SURFACE, "border-primary/20 bg-gradient-to-r from-primary/[0.08] to-transparent")}
        data-testid="phonics-next-best-action"
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {nextBestAction.question}
            </p>
            <p className="font-quicksand text-sm font-bold text-foreground">
              {nextBestAction.action}
            </p>
            <p className="text-[11px] text-muted-foreground">{nextBestAction.detail}</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 rounded-xl"
            onClick={() => scrollToJourneySection(nextBestAction.scrollTarget)}
          >
            Go
          </Button>
        </CardContent>
      </Card>

      {/* Streak loop */}
      <Card className={cn(CARD_SURFACE, "border-orange-500/15")} data-testid="phonics-streak-loop">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15">
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-quicksand text-sm font-bold text-foreground">
              {streak > 0 ? `🔥 ${streakInfo.label}` : streakInfo.label}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Next reward: {streakInfo.nextReward}
            </p>
            <p className="text-[11px] font-medium text-primary/90">{streakChainMsg}</p>
          </div>
        </CardContent>
      </Card>

      {/* Reading badges + share moments */}
      {readingBadges.length > 0 && (
        <div className="space-y-2" data-testid="phonics-achievements">
          {readingBadges.map((b) => (
            <div
              key={b.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300",
                b.earned
                  ? b.shareable
                    ? "border-violet-400/30 bg-gradient-to-r from-violet-500/[0.14] via-primary/[0.08] to-transparent shadow-[0_6px_28px_-10px_rgba(139,92,246,0.4)]"
                    : "border-amber-400/25 bg-gradient-to-r from-amber-500/[0.12] via-amber-500/[0.06] to-transparent"
                  : "border-border/40 bg-muted/20 opacity-70",
              )}
            >
              <span className="text-2xl" aria-hidden>
                {b.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-quicksand text-sm font-bold text-foreground">{b.title}</p>
                <p className="text-[11px] text-muted-foreground">{b.subtitle}</p>
                {b.shareable && b.earned && (
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-violet-500/90">
                    Share moment
                  </p>
                )}
              </div>
              {b.earned && (
                <Badge className="shrink-0 border-0 bg-emerald-500/15 text-[9px] text-emerald-600 dark:text-emerald-400">
                  Earned
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legacy celebrations merged into badges — keep earned stage banners if no badges */}
      {readingBadges.length === 0 && celebrations.length > 0 && (
        <div className="space-y-2" data-testid="phonics-achievements">
          {celebrations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300",
                c.earned
                  ? "border-amber-400/25 bg-gradient-to-r from-amber-500/[0.12] via-amber-500/[0.06] to-transparent shadow-[0_4px_20px_-8px_rgba(245,158,11,0.35)]"
                  : "border-border/40 bg-muted/20 opacity-80",
              )}
            >
              <span className="text-2xl" aria-hidden>
                {c.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-quicksand text-sm font-bold text-foreground">{c.title}</p>
                <p className="text-[11px] text-muted-foreground">{c.subtitle}</p>
              </div>
              {c.earned && (
                <Badge className="shrink-0 border-0 bg-emerald-500/15 text-[9px] text-emerald-600 dark:text-emerald-400">
                  Earned
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Journey map */}
      <Card className={CARD_SURFACE} data-testid="phonics-journey-roadmap">
        <CardContent className="p-5">
          <h3 className="mb-3 font-quicksand text-sm font-bold text-foreground">
            Your reading journey
          </h3>
          <div className="relative flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {PHONICS_JOURNEY_STAGES.map((stage, idx) => {
              const status = stageStatus(stage, activeStage);
              return (
                <div key={stage.id} className="flex shrink-0 items-center gap-2">
                  {idx > 0 && (
                    <div
                      className={cn(
                        "h-0.5 w-3 shrink-0 rounded-full transition-colors",
                        status === "locked" ? "bg-border/60" : "bg-primary/35",
                      )}
                      aria-hidden
                    />
                  )}
                  <div
                    data-testid={`phonics-journey-stage-${stage.id}`}
                    className={cn(
                      "flex min-w-[76px] flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-center transition-all duration-500",
                      status === "current" &&
                        "border-primary/60 bg-primary/10 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.45)] animate-[pulse_4s_ease-in-out_infinite]",
                      status === "completed" &&
                        "border-emerald-500/40 bg-emerald-500/[0.08]",
                      status === "locked" &&
                        "border-border/50 bg-muted/15 opacity-50",
                    )}
                  >
                    <span className="text-lg" aria-hidden>
                      {stage.emoji}
                    </span>
                    <span className="text-[8px] font-bold leading-tight text-foreground">
                      {stage.milestoneName}
                    </span>
                    {status === "completed" && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-label="Completed" />
                    )}
                    {status === "current" && (
                      <Badge className="h-4 border-0 bg-primary px-1.5 text-[7px] font-black text-primary-foreground">
                        Current
                      </Badge>
                    )}
                    {status === "locked" && (
                      <Lock className="h-3 w-3 text-muted-foreground/50" aria-label="Locked" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Next unlock — future vision */}
      {nextUnlock && (
        <Card
          className={cn(CARD_SURFACE, "border-dashed border-primary/25 bg-primary/[0.04]")}
          data-testid="phonics-next-unlock"
        >
          <CardContent className="flex items-center gap-3 p-4">
            <span className="text-2xl" aria-hidden>
              {nextUnlock.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wide text-primary">
                Next unlock
              </p>
              <p className="font-quicksand text-sm font-bold text-foreground">
                {nextUnlock.title}
              </p>
              <p className="text-[11px] text-muted-foreground">{nextUnlock.outcome}</p>
              <p className="mt-1.5 text-[11px] font-medium text-primary/90">{futureMotivation}</p>
              {milestoneActionPlan && (
                <div className="mt-3 space-y-1.5 rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wide text-primary">
                    To unlock {milestoneActionPlan.stageName}
                  </p>
                  {milestoneActionPlan.items.map((item) => (
                    <p
                      key={item.label}
                      className={cn(
                        "text-[11px]",
                        item.done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                      )}
                    >
                      {item.done ? "✓" : "○"} {item.label}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current milestone */}
      <Card className={cn(CARD_SURFACE, "border-primary/15")}>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden>
              {activeStage.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wide text-primary">
                {activeStage.milestoneName}
              </p>
              <h3 className="font-quicksand text-base font-black text-foreground">
                {activeStage.outcomeLabel}
              </h3>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {masteryScore}% ready
            </Badge>
          </div>
          <Progress value={masteryScore} className="h-1.5 transition-all duration-700" />
          {confidenceTransform && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                What improved?
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground line-through">{confidenceTransform.before}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-emerald-500" />
                <span className="font-semibold text-foreground">{confidenceTransform.now}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Mission */}
      <Card
        id="phonics-today-mission"
        className={cn(
          "scroll-mt-24 transition-all duration-500",
          CARD_SURFACE,
          missionComplete
            ? "border-emerald-400/30 bg-gradient-to-br from-emerald-500/[0.12] to-transparent"
            : "border-amber-400/25 bg-gradient-to-br from-amber-500/[0.08] to-transparent",
        )}
        data-testid="phonics-todays-activity"
      >
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Today&apos;s Mission
              </p>
              {missionComplete ? (
                <>
                  <h3 className="font-quicksand text-base font-black text-emerald-600 dark:text-emerald-400">
                    Great job! Today&apos;s mission is complete.
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {level.focus} · come back tomorrow for a fresh mission
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-quicksand text-base font-bold text-foreground">
                    {curriculumLoading && !plan
                      ? "Preparing mission…"
                      : `${missionDoneCount}/${missionGoals.length} goals`}
                  </h3>
                  <p className="text-xs text-muted-foreground">{level.focus} · ~5 min</p>
                </>
              )}
            </div>
            {!missionComplete && (
              <PointsChip points={MISSION_READING_POINTS} label="mission" />
            )}
          </div>

          <Progress
            value={missionPct}
            className={cn("h-2.5 transition-all duration-500", missionComplete && "[&>div]:bg-emerald-500")}
          />

          {!missionComplete && (
            <ul className="space-y-2">
              {missionGoals.map((goal) => (
                <li
                  key={goal.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300",
                    goal.done
                      ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                      : "border-white/[0.06] bg-card/60",
                  )}
                >
                  <span className="text-lg" aria-hidden>
                    {goal.emoji}
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-sm font-medium",
                      goal.done ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {goal.label}
                  </span>
                  {goal.done ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />+{READING_POINTS.practice}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {fullSessionComplete && sessionCompletion ? (
            <div className="space-y-3">
              <div>
                <h3 className="font-quicksand text-base font-black text-emerald-600 dark:text-emerald-400">
                  Mission Complete
                </h3>
                <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground mt-2">
                  Today&apos;s wins
                </p>
                <ul className="mt-2 space-y-1">
                  {sessionCompletion.wins.map((w) => (
                    <li key={w} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />✓ {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5">
                <Star className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-foreground">
                  Reward earned: +{sessionCompletion.pointsEarned} Reading Points
                </p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground">Next recommended action</p>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 font-semibold text-primary"
                  onClick={() => scrollToJourneySection(sessionCompletion.nextScrollTarget)}
                >
                  {sessionCompletion.nextAction} →
                </Button>
              </div>
            </div>
          ) : missionComplete ? (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  🎉 Mission Complete — You earned {MISSION_READING_POINTS} Reading Points
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {missionCompleteEmptyActions().map((action) => (
                  <Button
                    key={action.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => scrollToJourneySection(action.scrollTarget)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </>
          ) : null}

          {!missionComplete && (
            <p className="text-center text-[10px] text-muted-foreground">
              Complete all goals to earn +{MISSION_READING_POINTS} Reading Points
            </p>
          )}
        </CardContent>
      </Card>

      {/* Weekly reading report */}
      <Card className={CARD_SURFACE} data-testid="phonics-weekly-stats">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-quicksand text-sm font-bold text-foreground">Weekly Reading Report</h3>
          </div>
          <ul className="space-y-2 text-sm">
            <MomentumRow done label={`Practiced ${weeklyReport.practiceDaysLabel}`} />
            <MomentumRow done label={`Reviewed ${weeklyReport.wordsReviewed} words`} />
            <MomentumRow
              done
              label={`Mastered ${weeklyReport.wordsMastered} new word${weeklyReport.wordsMastered !== 1 ? "s" : ""}`}
            />
            <MomentumRow
              done={weeklyReport.accuracyPct > 0}
              label={
                weeklyReport.accuracyDelta != null && weeklyReport.accuracyDelta !== 0
                  ? `Accuracy improved from ${weeklyReport.accuracyPct - weeklyReport.accuracyDelta}% → ${weeklyReport.accuracyPct}%`
                  : weeklyReport.accuracyPct > 0
                    ? `${weeklyReport.accuracyPct}% accuracy`
                    : "Play sounds to track accuracy"
              }
            />
          </ul>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
              Learning velocity
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{learningVelocity.label}</p>
            <p className="text-[11px] text-muted-foreground">{learningVelocity.detail}</p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{weeklyAiSummary}</p>
        </CardContent>
      </Card>

      {/* Parent insight */}
      <Card
        className={cn(CARD_SURFACE, "border-violet-500/15 bg-violet-500/[0.04]")}
        data-testid="phonics-parent-insight"
      >
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
            <Lightbulb className="h-4 w-4 text-violet-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
              Parent insight
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-foreground">{parentInsight}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2.5 text-center">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-quicksand text-sm font-black leading-tight text-foreground">{value}</p>
    </div>
  );
}

function PointsChip({ points, label }: { points: number; label: string }) {
  return (
    <div
      className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1"
      title={`${label} reward`}
    >
      <Star className="h-3 w-3 text-amber-600" />
      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
        +{points} pts
      </span>
    </div>
  );
}

function MomentumRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-muted-foreground">
      {done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
      )}
      <span className={cn(done && "text-foreground")}>{label}</span>
    </li>
  );
}
