import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubItemGate } from "@/components/sub-item-gate";
import { LearningLoadMoreButton } from "@/components/learning-load-more-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Flame,
  Star,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Crown,
  Target,
  BookOpen,
  Loader2,
  GraduationCap,
} from "lucide-react";
import {
  type OlympiadQuestion,
  type OlympiadSubject,
  type OlympiadAgeBand,
  type OlympiadDifficulty,
  type OlympiadRunType,
  type OlympiadTrackId,
  SUBJECT_LABELS,
  SUBJECT_EMOJI,
  DIFFICULTY_LABELS,
  ageBandFor,
  ageBandLabel,
  OLYMPIAD_TRACKS,
  DAILY_TIME_LIMIT_SEC,
  MOCK_EXAM_TIME_LIMIT_SEC,
  MOCK_EXAM_QUESTION_COUNT,
  countryLabel,
  pickDailyQuestions,
  finalizeLocalizedSet,
  weakestSubjects,
  nextRankProgress,
} from "@workspace/olympiad";
import { useSubmitOlympiadScore, useOlympiadLeaderboard } from "@/hooks/use-olympiad";
import { useOlympiadQuestionSet, readOlympiadQuestionCache } from "@/hooks/use-olympiad-questions";
import { useStudyCountry } from "@/hooks/use-study-country";
import { useSubscription } from "@/hooks/use-subscription";
import { useOlympiadInsight } from "@/hooks/use-olympiad-enhancements";
import { useOlympiadStatsAutoSync } from "@/hooks/use-olympiad-stats-sync";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { OlympiadQuizRunner } from "@/components/olympiad/olympiad-quiz-runner";
import {
  OlympiadOnboarding,
  isOlympiadOnboardingDone,
} from "@/components/olympiad/olympiad-onboarding";
import {
  useOlympiadBadgeCelebration,
  useOlympiadDailyReminder,
} from "@/components/olympiad/olympiad-effects";
import {
  OlympiadMasteryRings,
  OlympiadRankCard,
  OlympiadProgressCharts,
  OlympiadWeeklyDigest,
  OlympiadReminderSettings,
  OlympiadSiblingChallenge,
  OlympiadCertificateButton,
  OlympiadOfflineBanner,
  OlympiadStreakFreezeBadge,
} from "@/components/olympiad/olympiad-progress-extras";
import {
  type ChildOlympiadStats,
  OLYMPIAD_BADGES,
  loadOlympiadStats,
  saveOlympiadStats,
  recomputeBadges,
  todayISO,
  weekStartISO,
  computeDailyStreak,
  appendDailyHistory,
  overallAccuracyPct,
  collectMistakeIds,
  buildAmyInsightTemplate,
  buildParentTipTemplate,
} from "@/lib/olympiad-local-stats";

function useOlympiadSync(childId: number, ageBand: OlympiadAgeBand) {
  const submitScore = useSubmitOlympiadScore();
  return useCallback(
    async (
      runType: OlympiadRunType,
      questions: OlympiadQuestion[],
      answers: number[],
      durationSec: number,
      trackId?: OlympiadTrackId,
    ) => {
      const questionsCorrect = questions.reduce(
        (acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0),
        0,
      );
      await submitScore({
        childId,
        ageBand,
        runType,
        trackId,
        questionsAttempted: questions.length,
        questionsCorrect,
        durationSec,
      });
    },
    [submitScore, childId, ageBand],
  );
}

function QuestionSourceBadge({
  source,
  country,
  isPremium,
  offline,
}: {
  source: "ai" | "dataset";
  country: string;
  isPremium: boolean;
  offline?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px]">
      <OlympiadOfflineBanner offline={!!offline} />
      {source === "ai" && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold uppercase">
          <Sparkles className="h-3 w-3" />
          {t("components.olympiad_zone.ai_fresh")}
        </span>
      )}
      <span className="text-muted-foreground">
        {t("components.olympiad_zone.localized_for", { country: countryLabel(country) })}
      </span>
      {!isPremium && (
        <span className="text-muted-foreground italic">
          {t("components.olympiad_zone.premium_ai_hint")}
        </span>
      )}
    </div>
  );
}

function applyRunStats(
  stats: ChildOlympiadStats,
  questions: OlympiadQuestion[],
  answers: number[],
  pointsEarned: number,
): ChildOlympiadStats {
  const bySubject = { ...stats.bySubject };
  questions.forEach((q, i) => {
    bySubject[q.subject] = {
      correct: bySubject[q.subject].correct + (answers[i] === q.correct ? 1 : 0),
      total: bySubject[q.subject].total + 1,
    };
  });
  const updated: ChildOlympiadStats = {
    ...stats,
    totalPoints: stats.totalPoints + pointsEarned,
    bySubject,
    mistakeQuestionIds: collectMistakeIds(
      stats.mistakeQuestionIds,
      questions.map((q) => q.id),
      answers,
      questions,
    ),
  };
  updated.badges = recomputeBadges(updated);
  return updated;
}

function DailyTab({
  childId,
  childName,
  ageBand,
  stats,
  setStats,
  country,
}: {
  childId: string | number;
  childName: string;
  ageBand: OlympiadAgeBand;
  stats: ChildOlympiadStats;
  setStats: (s: ChildOlympiadStats) => void;
  country: string;
}) {
  const { t } = useTranslation();
  const syncRun = useOlympiadSync(Number(childId), ageBand);
  const date = todayISO();
  const existingRun = stats.daily[date];
  const alreadyDone = existingRun?.submitted === true;
  const weak = weakestSubjects(stats.bySubject);

  const qSet = useOlympiadQuestionSet(
    alreadyDone
      ? null
      : {
          childId: Number(childId),
          ageBand,
          difficulty: stats.difficulty,
          kind: "daily",
          country,
          dateKey: date,
          weakSubjects: weak,
        },
  );
  const questions = qSet.questions;
  const reviewQuestions = alreadyDone
    ? readOlympiadQuestionCache(Number(childId), "daily", date) ??
      finalizeLocalizedSet(pickDailyQuestions(ageBand, stats.difficulty, date, childId), country, ageBand, stats.difficulty)
    : questions;

  if (alreadyDone) {
    return (
      <div className="space-y-3">
        <Card>
          <CardContent className="p-4 text-center space-y-1">
            <div className="text-3xl mb-1">✅</div>
            <p className="font-quicksand font-bold">{t("components.olympiad_zone.today_s_challenge_done")}</p>
            <p className="text-sm text-muted-foreground">
              {t("components.olympiad_zone.you_scored")}{" "}
              <span className="font-semibold text-foreground">{existingRun.score}/5</span>{" "}
              {t("components.olympiad_zone.today_come_back_tomorrow_for_a_fresh_set")}
            </p>
          </CardContent>
        </Card>
        <div className="space-y-2">
          {reviewQuestions.map((q, i) => {
            const userAns = existingRun.answers[i];
            const ok = userAns === q.correct;
            return (
              <div
                key={q.id}
                className={`rounded-lg border p-3 text-sm ${ok ? "border-emerald-500/40 bg-emerald-500/10" : "border-red-500/40 bg-red-500/10"}`}
              >
                <div className="flex items-start gap-2">
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{q.question}</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      {t("components.olympiad_zone.correct_2")}{" "}
                      <span className="font-semibold text-foreground">{q.options[q.correct]}</span>
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground italic">{q.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (qSet.loading || questions.length === 0) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  return (
    <div className="space-y-3">
      <QuestionSourceBadge
        source={qSet.source}
        country={qSet.country}
        isPremium={qSet.isPremium}
        offline={qSet.error === "offline_fallback"}
      />
      <Card className="bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card border-border dark:border-primary">
        <CardContent className="p-3 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">
              {childName}
              {t("components.olympiad_zone.s_daily_5")}
            </p>
            <p className="text-muted-foreground">
              {t("components.olympiad_zone.difficulty")}{" "}
              <strong>{DIFFICULTY_LABELS[stats.difficulty]}</strong>{" "}
              {t("components.olympiad_zone.earn_up_to_60_points")}
            </p>
          </div>
        </CardContent>
      </Card>
      <OlympiadQuizRunner
        childId={Number(childId)}
        ageBand={ageBand}
        questions={questions}
        pointsPerCorrect={10}
        perfectBonus={10}
        timeLimitSec={DAILY_TIME_LIMIT_SEC}
        onComplete={({ answers, score, pointsEarned, perfect, durationSec }) => {
          const bySubject = { ...stats.bySubject };
          questions.forEach((q, i) => {
            bySubject[q.subject] = {
              correct: bySubject[q.subject].correct + (answers[i] === q.correct ? 1 : 0),
              total: bySubject[q.subject].total + 1,
            };
          });
          const streakResult = computeDailyStreak(stats, date);
          const newDifficulty: OlympiadDifficulty =
            score >= 4 && stats.difficulty === "easy"
              ? "medium"
              : score >= 4 && stats.difficulty === "medium"
                ? "hard"
                : score <= 1 && stats.difficulty === "hard"
                  ? "medium"
                  : score <= 1 && stats.difficulty === "medium"
                    ? "easy"
                    : stats.difficulty;

          const historyEntry = {
            date,
            score,
            total: questions.length,
            accuracyPct: Math.round((score / questions.length) * 100),
          };

          const updated: ChildOlympiadStats = {
            ...stats,
            ...streakResult.statsPatch,
            totalPoints: stats.totalPoints + pointsEarned,
            difficulty: newDifficulty,
            streak: streakResult.streak,
            lastDailyDate: date,
            perfectDays: stats.perfectDays + (perfect ? 1 : 0),
            daily: {
              ...stats.daily,
              [date]: {
                picks: questions.map((q) => q.id),
                answers,
                submitted: true,
                score,
              },
            },
            bySubject,
            dailyHistory: appendDailyHistory(stats.dailyHistory, historyEntry),
            mistakeQuestionIds: collectMistakeIds(
              stats.mistakeQuestionIds,
              questions.map((q) => q.id),
              answers,
              questions,
            ),
          };
          updated.badges = recomputeBadges(updated);
          setStats(updated);
          void syncRun("daily", questions, answers, durationSec);
        }}
      />
    </div>
  );
}

function PracticeTab({
  childId,
  ageBand,
  stats,
  setStats,
  country,
  initialSubject,
  onClearInitialSubject,
}: {
  childId: string | number;
  ageBand: OlympiadAgeBand;
  stats: ChildOlympiadStats;
  setStats: (s: ChildOlympiadStats) => void;
  country: string;
  initialSubject?: OlympiadSubject | null;
  onClearInitialSubject?: () => void;
}) {
  const { t } = useTranslation();
  const syncRun = useOlympiadSync(Number(childId), ageBand);
  const [subject, setSubject] = useState<OlympiadSubject>(initialSubject ?? "math");
  const [difficulty, setDifficulty] = useState<OlympiadDifficulty>(stats.difficulty);
  const [session, setSession] = useState<OlympiadQuestion[] | null>(null);
  const [fetchPractice, setFetchPractice] = useState(false);
  const [timedMode, setTimedMode] = useState(false);

  useEffect(() => {
    if (initialSubject) {
      setSubject(initialSubject);
      onClearInitialSubject?.();
    }
  }, [initialSubject, onClearInitialSubject]);

  const qSet = useOlympiadQuestionSet(
    fetchPractice && !session
      ? {
          childId: Number(childId),
          ageBand,
          difficulty,
          kind: "practice",
          subject,
          country,
          count: 5,
        }
      : null,
  );

  useEffect(() => {
    if (fetchPractice && qSet.questions.length > 0 && !session) {
      setSession(qSet.questions);
      setFetchPractice(false);
    }
  }, [fetchPractice, qSet.questions, session]);

  const subjects: OlympiadSubject[] = ["math", "science", "reasoning", "gk"];
  const difficulties: OlympiadDifficulty[] = ["easy", "medium", "hard"];

  if (session) {
    return (
      <>
        <QuestionSourceBadge
          source={qSet.source}
          country={qSet.country}
          isPremium={qSet.isPremium}
          offline={qSet.error === "offline_fallback"}
        />
        <OlympiadQuizRunner
          childId={Number(childId)}
          ageBand={ageBand}
          questions={session}
          pointsPerCorrect={5}
          timeLimitSec={timedMode ? 300 : undefined}
          showRetryAfter
          onRetry={() => {
            setSession(null);
            setFetchPractice(true);
          }}
          onComplete={({ answers, pointsEarned, durationSec }) => {
            const updated = applyRunStats(stats, session, answers, pointsEarned);
            setStats(updated);
            void syncRun("practice", session, answers, durationSec);
            setSession(null);
          }}
        />
      </>
    );
  }

  const startMistakeReview = () => {
    const ids = new Set(stats.mistakeQuestionIds);
    const pool = finalizeLocalizedSet(
      pickDailyQuestions(ageBand, stats.difficulty, todayISO(), childId).filter((q) => ids.has(q.id)),
      country,
      ageBand,
      stats.difficulty,
    );
    if (pool.length > 0) setSession(pool.slice(0, 5));
  };

  return (
    <div className="space-y-4">
      {stats.mistakeQuestionIds.length > 0 && (
        <Button variant="outline" className="w-full" onClick={startMistakeReview}>
          {t("components.olympiad_zone.review_mistakes", { count: stats.mistakeQuestionIds.length })}
        </Button>
      )}
      <div>
        <p className="text-xs font-semibold mb-2 text-muted-foreground">{t("components.olympiad_zone.pick_a_subject")}</p>
        <div className="grid grid-cols-2 gap-2">
          {subjects.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSubject(s)}
              className={`px-3 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all ${subject === s ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <span className="text-xl mr-2">{SUBJECT_EMOJI[s]}</span>
              {SUBJECT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold mb-2 text-muted-foreground">{t("components.olympiad_zone.pick_difficulty")}</p>
        <div className="flex gap-2">
          {difficulties.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${difficulty === d ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{t("components.olympiad_zone.timed_practice")}</span>
        <button
          type="button"
          onClick={() => setTimedMode(!timedMode)}
          className={`px-2 py-1 rounded-lg border ${timedMode ? "border-primary bg-primary/10" : "border-border"}`}
        >
          {timedMode ? t("components.olympiad_zone.timed_on") : t("components.olympiad_zone.timed_off")}
        </button>
      </div>
      <Button className="w-full" disabled={fetchPractice || qSet.loading} onClick={() => setFetchPractice(true)}>
        <BookOpen className="h-4 w-4 mr-1" />{" "}
        {qSet.loading ? t("components.olympiad_zone.loading_questions") : t("components.olympiad_zone.start_practice")}
      </Button>
      <LearningLoadMoreButton
        section="olympiad"
        childId={Number(childId)}
        count={10}
        excludeIds={[]}
        params={{ ageBand, difficulty, subject, country }}
        onLoaded={(items) => {
          const qs = (items.questions ?? []) as OlympiadQuestion[];
          if (qs.length > 0) {
            setSession(qs);
            setFetchPractice(false);
          }
        }}
        className="w-full"
      />
      <p className="text-xs text-muted-foreground text-center">
        {t("components.olympiad_zone.practice_earns_5_points_per_correct_answer_vs_10_for_the_dai")}
      </p>
    </div>
  );
}

function WeeklyTestCard({
  childId,
  childName,
  ageBand,
  stats,
  setStats,
  country,
}: {
  childId: string | number;
  childName: string;
  ageBand: OlympiadAgeBand;
  stats: ChildOlympiadStats;
  setStats: (s: ChildOlympiadStats) => void;
  country: string;
}) {
  const { t } = useTranslation();
  const syncRun = useOlympiadSync(Number(childId), ageBand);
  const weekKey = weekStartISO();
  const weeklyRun = stats.weekly[weekKey];
  const [open, setOpen] = useState(false);
  const qSet = useOlympiadQuestionSet(
    open
      ? {
          childId: Number(childId),
          ageBand,
          difficulty: stats.difficulty,
          kind: "weekly",
          country,
          dateKey: weekKey,
        }
      : null,
  );
  const questions = qSet.questions;

  if (weeklyRun?.submitted) {
    return (
      <Card className="bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card border-border">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-primary shrink-0" />
            <div className="text-xs flex-1">
              <p className="font-semibold">{t("components.olympiad_zone.weekly_test_done")}</p>
              <p className="text-muted-foreground">
                {t("components.olympiad_zone.score")}{" "}
                <strong>{weeklyRun.score} / {questions.length || 20}</strong>
                {t("components.olympiad_zone.next_test_on_monday")}
              </p>
            </div>
          </div>
          <OlympiadCertificateButton
            childName={childName}
            stats={stats}
            weeklyScore={weeklyRun.score}
            weeklyTotal={questions.length || 20}
          />
        </CardContent>
      </Card>
    );
  }

  if (open) {
    if (qSet.loading || questions.length === 0) {
      return <Skeleton className="h-48 w-full rounded-2xl" />;
    }
    return (
      <Card className="border-border">
        <CardContent className="p-4 space-y-3">
          <QuestionSourceBadge source={qSet.source} country={qSet.country} isPremium={qSet.isPremium} offline={qSet.error === "offline_fallback"} />
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <p className="font-quicksand font-bold">
              {t("components.olympiad_zone.weekly_test")}
              {questions.length} {t("components.olympiad_zone.questions")}
            </p>
          </div>
          <OlympiadQuizRunner
            childId={Number(childId)}
            ageBand={ageBand}
            questions={questions}
            pointsPerCorrect={15}
            perfectBonus={50}
            onComplete={({ answers, score, pointsEarned, durationSec }) => {
              const updated = applyRunStats(stats, questions, answers, pointsEarned);
              updated.weekly = {
                ...updated.weekly,
                [weekKey]: {
                  picks: questions.map((q) => q.id),
                  answers,
                  submitted: true,
                  score,
                },
              };
              setStats(updated);
              void syncRun("weekly", questions, answers, durationSec);
              setOpen(false);
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card border-border">
      <CardContent className="p-3 flex items-center gap-3">
        <Crown className="h-5 w-5 text-primary shrink-0" />
        <div className="text-xs flex-1">
          <p className="font-semibold">{t("components.olympiad_zone.weekly_test_2")}</p>
          <p className="text-muted-foreground">
            {questions.length || 20}{" "}
            {t("components.olympiad_zone.questions_across_all_4_subjects_15_pts_each_50_bonus")}
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          {t("components.olympiad_zone.start")}
        </Button>
      </CardContent>
    </Card>
  );
}

function PrepTab({
  childId,
  childName,
  ageBand,
  stats,
  setStats,
  country,
}: {
  childId: string | number;
  childName: string;
  ageBand: OlympiadAgeBand;
  stats: ChildOlympiadStats;
  setStats: (s: ChildOlympiadStats) => void;
  country: string;
}) {
  const { t } = useTranslation();
  const syncRun = useOlympiadSync(Number(childId), ageBand);
  const [trackId, setTrackId] = useState<OlympiadTrackId>("nso");
  const [difficulty, setDifficulty] = useState<OlympiadDifficulty>(stats.difficulty);
  const [pendingKind, setPendingKind] = useState<"track" | "mock" | null>(null);
  const weekKey = weekStartISO();
  const mockKey = `mock:${weekKey}`;
  const mockDone = stats.weekly[mockKey]?.submitted === true;

  const qSet = useOlympiadQuestionSet(
    pendingKind
      ? {
          childId: Number(childId),
          ageBand,
          difficulty,
          kind: pendingKind,
          trackId: pendingKind === "track" ? trackId : undefined,
          country,
          count: pendingKind === "mock" ? MOCK_EXAM_QUESTION_COUNT : 10,
          dateKey: weekKey,
        }
      : null,
  );

  const [session, setSession] = useState<{
    questions: OlympiadQuestion[];
    runType: "track" | "mock";
    trackId?: OlympiadTrackId;
    source: "ai" | "dataset";
    isPremium: boolean;
    country: string;
  } | null>(null);

  useEffect(() => {
    if (pendingKind && qSet.questions.length > 0 && !session) {
      setSession({
        questions: qSet.questions,
        runType: pendingKind,
        trackId: pendingKind === "track" ? trackId : undefined,
        source: qSet.source,
        isPremium: qSet.isPremium,
        country: qSet.country,
      });
      setPendingKind(null);
    }
  }, [pendingKind, qSet.questions, session, trackId, qSet.source, qSet.isPremium, qSet.country]);

  if (session) {
    const isMock = session.runType === "mock";
    return (
      <>
        <QuestionSourceBadge source={session.source} country={session.country} isPremium={session.isPremium} />
        <OlympiadQuizRunner
          childId={Number(childId)}
          ageBand={ageBand}
          questions={session.questions}
          pointsPerCorrect={isMock ? 20 : 8}
          perfectBonus={isMock ? 100 : 0}
          timeLimitSec={isMock ? MOCK_EXAM_TIME_LIMIT_SEC : undefined}
          showRetryAfter={!isMock}
          onRetry={() => {
            setSession(null);
            setPendingKind("track");
          }}
          onComplete={({ answers, pointsEarned, durationSec }) => {
            let updated = applyRunStats(stats, session.questions, answers, pointsEarned);
            if (isMock) {
              const score = answers.reduce(
                (acc, a, i) => acc + (a === session.questions[i]!.correct ? 1 : 0),
                0,
              );
              updated = {
                ...updated,
                weekly: {
                  ...updated.weekly,
                  [mockKey]: {
                    picks: session.questions.map((q) => q.id),
                    answers,
                    submitted: true,
                    score,
                  },
                },
              };
            }
            setStats(updated);
            void syncRun(session.runType, session.questions, answers, durationSec, session.trackId);
            setSession(null);
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <WeeklyTestCard
        childId={childId}
        childName={childName}
        ageBand={ageBand}
        stats={stats}
        setStats={setStats}
        country={country}
      />

      <Card className="border-border">
        <CardContent className="p-4 space-y-3">
          <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.syllabus_tracks")}</p>
          <div className="space-y-2">
            {OLYMPIAD_TRACKS.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => setTrackId(track.id)}
                className={`w-full text-left px-3 py-3 rounded-xl border-2 transition-all ${trackId === track.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <span className="text-xl mr-2">{track.emoji}</span>
                <span className="font-semibold text-sm">{track.label}</span>
                <p className="text-xs text-muted-foreground mt-1 ml-8">{track.description}</p>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(["easy", "medium", "hard"] as OlympiadDifficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium ${difficulty === d ? "border-primary bg-primary/5" : "border-border"}`}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
          <Button className="w-full" disabled={pendingKind === "track" || qSet.loading} onClick={() => setPendingKind("track")}>
            <BookOpen className="h-4 w-4 mr-1" />
            {pendingKind === "track" || qSet.loading
              ? t("components.olympiad_zone.loading_questions")
              : t("components.olympiad_zone.start_track")}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card border-border">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.mock_exam")}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {MOCK_EXAM_QUESTION_COUNT} {t("components.olympiad_zone.questions")} ·{" "}
            {Math.floor(MOCK_EXAM_TIME_LIMIT_SEC / 60)} min · olympiad-style
          </p>
          {mockDone ? (
            <p className="text-xs text-muted-foreground">{t("components.olympiad_zone.mock_done_this_week")}</p>
          ) : (
            <Button size="sm" disabled={pendingKind === "mock" || qSet.loading} onClick={() => setPendingKind("mock")}>
              {pendingKind === "mock" || qSet.loading
                ? t("components.olympiad_zone.loading_questions")
                : t("components.olympiad_zone.start_mock")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LeaderboardCard({
  scope,
  ageBand,
  childId,
  title,
}: {
  scope: "family" | "global";
  ageBand: OlympiadAgeBand;
  childId: number;
  title: string;
}) {
  const { t } = useTranslation();
  const lb = useOlympiadLeaderboard(scope, ageBand, childId);
  if (!lb.data && !lb.loading) return null;
  return (
    <Card className="border-border dark:border-primary">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-4 w-4 text-primary" />
          <p className="font-quicksand font-bold text-sm">{title}</p>
        </div>
        {lb.loading ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            <Loader2 className="h-3.5 w-3.5 mx-auto animate-spin" />
          </p>
        ) : (
          <>
            {lb.data?.me && (
              <div className="mb-2 px-2 py-1.5 rounded-lg bg-primary/10 text-xs flex justify-between">
                <span>{t("components.olympiad_zone.your_rank")}</span>
                <span className="font-bold">
                  #{lb.data.me.rank} · {lb.data.me.points} pts
                </span>
              </div>
            )}
            <ol className="space-y-1">
              {(lb.data?.top ?? []).map((r) => (
                <li
                  key={`${scope}-${r.childId}-${r.rank}`}
                  className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg ${r.isMe ? "bg-primary/10 border border-primary/30" : "bg-muted dark:bg-primary/[0.06]"}`}
                >
                  <span className="w-5 font-bold text-primary">{r.rank}.</span>
                  <span className="flex-1 truncate font-medium">{r.name}</span>
                  <span className="font-semibold">{r.points} pts</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProgressTab({
  stats,
  childName,
  childId,
  ageBand,
  setStats,
  onDrillWeak,
}: {
  stats: ChildOlympiadStats;
  childName: string;
  childId: number;
  ageBand: OlympiadAgeBand;
  setStats: (s: ChildOlympiadStats) => void;
  onDrillWeak: (subject: OlympiadSubject) => void;
}) {
  const { t } = useTranslation();
  const { entitlements } = useSubscription();
  const acc = overallAccuracyPct(stats);
  const weak = weakestSubjects(stats.bySubject)[0] ?? null;
  const ai = useOlympiadInsight(childId);

  useEffect(() => {
    if (entitlements?.isPremium) {
      void ai.refresh({
        totalPoints: stats.totalPoints,
        streak: stats.streak,
        overallAccuracyPct: acc,
        bySubject: stats.bySubject,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, entitlements?.isPremium, stats.totalPoints, stats.streak]);

  const insightText = ai.insight ?? buildAmyInsightTemplate(stats, childName);
  const parentTip = ai.parentTip ?? buildParentTipTemplate(stats);

  return (
    <div className="space-y-4">
      <OlympiadRankCard totalPoints={stats.totalPoints} />
      <OlympiadMasteryRings stats={stats} />
      <OlympiadProgressCharts stats={stats} />
      <OlympiadWeeklyDigest stats={stats} childName={childName} />
      <OlympiadSiblingChallenge childId={childId} childName={childName} stats={stats} />
      <OlympiadReminderSettings
        stats={stats}
        onChange={(patch) => setStats({ ...stats, ...patch })}
      />

      <LeaderboardCard
        scope="family"
        ageBand={ageBand}
        childId={childId}
        title={t("components.olympiad_zone.family_leaderboard")}
      />
      <LeaderboardCard
        scope="global"
        ageBand={ageBand}
        childId={childId}
        title={t("components.olympiad_zone.global_leaderboard")}
      />

      {weak && (
        <Card className="border-border">
          <CardContent className="p-4 flex items-start gap-3">
            <GraduationCap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.weak_area_title")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {childName}{" "}
                {t("components.olympiad_zone.weak_area_body", { subject: SUBJECT_LABELS[weak] })}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" className="rounded-full" onClick={() => onDrillWeak(weak)}>
                  {t("components.olympiad_zone.start_weak_drill")}
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link href="/study">{t("components.olympiad_zone.open_study_zone")}</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card">
          <CardContent className="p-3 text-center">
            <Trophy className="h-5 w-5 mx-auto text-primary" />
            <p className="text-xl font-bold mt-1">{stats.totalPoints}</p>
            <p className="text-xs text-muted-foreground">{t("components.olympiad_zone.points_2")}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card">
          <CardContent className="p-3 text-center">
            <Flame className="h-5 w-5 mx-auto text-primary" />
            <p className="text-xl font-bold mt-1">{stats.streak}</p>
            <p className="text-xs text-muted-foreground">{t("components.olympiad_zone.day_streak")}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card">
          <CardContent className="p-3 text-center">
            <Target className="h-5 w-5 mx-auto text-primary" />
            <p className="text-xl font-bold mt-1">{acc}%</p>
            <p className="text-xs text-muted-foreground">{t("components.olympiad_zone.accuracy")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.by_subject")}</p>
          {(Object.entries(stats.bySubject) as [OlympiadSubject, { correct: number; total: number }][]).map(
            ([s, v]) => {
              const pct = v.total === 0 ? 0 : Math.round((v.correct / v.total) * 100);
              return (
                <div key={s}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">
                      {SUBJECT_EMOJI[s]} {SUBJECT_LABELS[s]}
                    </span>
                    <span className="text-muted-foreground">
                      {v.correct} / {v.total} {v.total > 0 ? `· ${pct}%` : ""}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            },
          )}
        </CardContent>
      </Card>

      <Card className="border-border dark:border-primary">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.amy_s_insight")}</p>
              {ai.loading ? (
                <Loader2 className="h-4 w-4 animate-spin mt-2 text-muted-foreground" />
              ) : (
                <p className="text-xs text-muted-foreground mt-1">{insightText}</p>
              )}
              {ai.source === "ai" && (
                <span className="text-[10px] text-primary font-semibold mt-1 inline-block">AI</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted dark:bg-card border-border dark:border-primary">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.for_you_parent")}</p>
              <p className="text-xs text-muted-foreground mt-1">{parentTip}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.badges")}</p>
          <div className="grid grid-cols-3 gap-2">
            {OLYMPIAD_BADGES.map((b) => {
              const earned = stats.badges.includes(b.id);
              return (
                <div
                  key={b.id}
                  title={b.hint}
                  className={`rounded-lg border p-2 text-center text-[11px] ${earned ? "bg-muted dark:bg-card border-border" : "opacity-50"}`}
                >
                  <div className="text-xl">{b.emoji}</div>
                  <div className="font-medium leading-tight mt-0.5">{b.label}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <OlympiadCertificateButton childName={childName} stats={stats} />
    </div>
  );
}

interface OlympiadZoneProps {
  child: { id: number | string; name: string; age: number };
}

export function OlympiadZone({ child }: OlympiadZoneProps) {
  const { t } = useTranslation();
  const { country } = useStudyCountry();
  const { entitlements } = useSubscription();
  const [stats, setStatsState] = useState<ChildOlympiadStats>(() => loadOlympiadStats(child.id));
  const [tab, setTab] = useState<"daily" | "practice" | "prep" | "progress">("daily");
  const [showOnboarding, setShowOnboarding] = useState(() => !isOlympiadOnboardingDone());
  const [drillSubject, setDrillSubject] = useState<OlympiadSubject | null>(null);

  useEffect(() => {
    setStatsState(loadOlympiadStats(child.id));
  }, [child.id]);

  const setStats = (s: ChildOlympiadStats) => {
    const saved = saveOlympiadStats(child.id, s);
    setStatsState(saved);
  };

  useOlympiadStatsAutoSync(Number(child.id), stats, setStats);
  useOlympiadBadgeCelebration(stats.badges);

  const date = todayISO();
  const dailyDone = stats.daily[date]?.submitted === true;
  useOlympiadDailyReminder(stats.reminderEnabled, stats.reminderHour, dailyDone);

  const ageBand = ageBandFor(child.age);
  const rank = nextRankProgress(stats.totalPoints);

  const handleDrillWeak = (subject: OlympiadSubject) => {
    setDrillSubject(subject);
    setTab("practice");
  };

  return (
    <div className="space-y-3">
      {showOnboarding && (
        <OlympiadOnboarding
          onComplete={() => {
            setShowOnboarding(false);
            setStats({ ...stats, onboardingComplete: true });
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <Star className="h-3.5 w-3.5 text-primary shrink-0" />
        <span>
          {rank.current.emoji} {rank.current.label}
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-0.5">
          <Flame className="h-3.5 w-3.5 text-primary" />
          <strong>{stats.streak}</strong> {t("components.olympiad_zone.day_streak")}
        </span>
        <span>·</span>
        <span>
          {stats.totalPoints} {t("components.olympiad_zone.pts")}
        </span>
        <OlympiadStreakFreezeBadge stats={stats} />
        {entitlements?.isPremium && (
          <>
            <span>·</span>
            <span className="text-primary font-semibold">{t("components.olympiad_zone.premium_ai")}</span>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        <span>
          {t("components.olympiad_zone.level")} <strong>{ageBandLabel(ageBand)}</strong>
        </span>
        <span>·</span>
        <span>
          {t("components.olympiad_zone.difficulty_2")} <strong>{DIFFICULTY_LABELS[stats.difficulty]}</strong>
        </span>
        <span>·</span>
        <span>{countryLabel(country)}</span>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daily">{t("components.olympiad_zone.daily")}</TabsTrigger>
          <TabsTrigger value="practice">{t("components.olympiad_zone.practice")}</TabsTrigger>
          <TabsTrigger value="prep">{t("components.olympiad_zone.prep")}</TabsTrigger>
          <TabsTrigger value="progress">{t("components.olympiad_zone.progress")}</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-3 space-y-3">
          <SubItemGate sectionId="hub_olympiad" subItemId="olympiad_daily">
            <DailyTab
              childId={child.id}
              childName={child.name}
              ageBand={ageBand}
              stats={stats}
              setStats={setStats}
              country={country}
            />
          </SubItemGate>
        </TabsContent>
        <TabsContent value="practice" className="mt-3">
          <SubItemGate sectionId="hub_olympiad" subItemId="olympiad_practice">
            <PracticeTab
              childId={child.id}
              ageBand={ageBand}
              stats={stats}
              setStats={setStats}
              country={country}
              initialSubject={drillSubject}
              onClearInitialSubject={() => setDrillSubject(null)}
            />
          </SubItemGate>
        </TabsContent>
        <TabsContent value="prep" className="mt-3">
          <SubItemGate sectionId="hub_olympiad" subItemId="olympiad_prep">
            <PrepTab
              childId={child.id}
              childName={child.name}
              ageBand={ageBand}
              stats={stats}
              setStats={setStats}
              country={country}
            />
          </SubItemGate>
        </TabsContent>
        <TabsContent value="progress" className="mt-3">
          <SubItemGate sectionId="hub_olympiad" subItemId="olympiad_progress">
            <ProgressTab
              stats={stats}
              childName={child.name}
              childId={Number(child.id)}
              ageBand={ageBand}
              setStats={setStats}
              onDrillWeak={handleDrillWeak}
            />
          </SubItemGate>
        </TabsContent>
      </Tabs>
    </div>
  );
}
