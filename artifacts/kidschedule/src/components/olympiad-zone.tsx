import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubItemGate } from "@/components/sub-item-gate";
import { LearningLoadMoreButton } from "@/components/learning-load-more-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Star, Sparkles, CheckCircle2, XCircle, Lightbulb, ChevronRight, RotateCcw, Crown, Target, BookOpen, Clock, Loader2, GraduationCap } from "lucide-react";
import {
  type OlympiadQuestion, type OlympiadSubject, type OlympiadAgeBand, type OlympiadDifficulty,
  type OlympiadRunType, type OlympiadTrackId,
  SUBJECT_LABELS, SUBJECT_EMOJI, DIFFICULTY_LABELS,
  ageBandFor, ageBandLabel,
  OLYMPIAD_TRACKS, DAILY_TIME_LIMIT_SEC, MOCK_EXAM_TIME_LIMIT_SEC, MOCK_EXAM_QUESTION_COUNT,
  countryLabel, pickDailyQuestions, finalizeLocalizedSet,
} from "@workspace/olympiad";
import { useSubmitOlympiadScore, useOlympiadLeaderboard } from "@/hooks/use-olympiad";
import { useOlympiadQuestionSet, readOlympiadQuestionCache } from "@/hooks/use-olympiad-questions";
import { useStudyCountry } from "@/hooks/use-study-country";
import { useSubscription } from "@/hooks/use-subscription";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Storage shape ────────────────────────────────────────────────────────────
import { useTranslation } from "react-i18next";
interface DailyRun {
  picks: string[];
  answers: number[];
  submitted: boolean;
  score: number;
}
interface ChildOlympiadStats {
  totalPoints: number;
  difficulty: OlympiadDifficulty;
  streak: number;
  lastDailyDate: string | null;
  perfectDays: number;
  daily: Record<string, DailyRun>;
  weekly: Record<string, DailyRun>;
  bySubject: Record<OlympiadSubject, {
    correct: number;
    total: number;
  }>;
  badges: string[];
}
const DEFAULT_STATS: ChildOlympiadStats = {
  totalPoints: 0,
  difficulty: "easy",
  streak: 0,
  lastDailyDate: null,
  perfectDays: 0,
  daily: {},
  weekly: {},
  bySubject: {
    math: {
      correct: 0,
      total: 0
    },
    science: {
      correct: 0,
      total: 0
    },
    reasoning: {
      correct: 0,
      total: 0
    },
    gk: {
      correct: 0,
      total: 0
    }
  },
  badges: []
};
const storageKey = (childId: string | number) => `olympiad:v1:${childId}`;
function freshDefault(): ChildOlympiadStats {
  return {
    ...DEFAULT_STATS,
    bySubject: {
      math: {
        correct: 0,
        total: 0
      },
      science: {
        correct: 0,
        total: 0
      },
      reasoning: {
        correct: 0,
        total: 0
      },
      gk: {
        correct: 0,
        total: 0
      }
    },
    daily: {},
    weekly: {},
    badges: []
  };
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function sanitizeDaily(raw: unknown): Record<string, DailyRun> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, DailyRun> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const r = v as Partial<DailyRun>;
    out[k] = {
      picks: Array.isArray(r.picks) ? r.picks.filter((x): x is string => typeof x === "string") : [],
      answers: Array.isArray(r.answers) ? r.answers.filter((x): x is number => typeof x === "number") : [],
      submitted: r.submitted === true,
      score: num(r.score)
    };
  }
  return out;
}
function loadStats(childId: string | number): ChildOlympiadStats {
  const def = freshDefault();
  if (typeof window === "undefined") return def;
  try {
    const raw = localStorage.getItem(storageKey(childId));
    if (!raw) return def;
    const parsed = JSON.parse(raw) as Partial<ChildOlympiadStats>;
    const subjects: OlympiadSubject[] = ["math", "science", "reasoning", "gk"];
    const bySubject = {
      ...def.bySubject
    };
    if (parsed.bySubject && typeof parsed.bySubject === "object") {
      for (const s of subjects) {
        const e = (parsed.bySubject as Record<string, unknown>)[s] as {
          correct?: unknown;
          total?: unknown;
        } | undefined;
        bySubject[s] = {
          correct: num(e?.correct),
          total: num(e?.total)
        };
      }
    }
    const difficulty: OlympiadDifficulty = parsed.difficulty === "medium" || parsed.difficulty === "hard" || parsed.difficulty === "easy" ? parsed.difficulty : "easy";
    return {
      totalPoints: num(parsed.totalPoints),
      difficulty,
      streak: num(parsed.streak),
      lastDailyDate: typeof parsed.lastDailyDate === "string" ? parsed.lastDailyDate : null,
      perfectDays: num(parsed.perfectDays),
      daily: sanitizeDaily(parsed.daily),
      weekly: sanitizeDaily(parsed.weekly),
      bySubject,
      badges: Array.isArray(parsed.badges) ? parsed.badges.filter((x): x is string => typeof x === "string") : []
    };
  } catch {
    return def;
  }
}
function saveStats(childId: string | number, stats: ChildOlympiadStats) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(childId), JSON.stringify(stats));
  } catch {/* quota — ignore */}
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function weekStartISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // make Monday week start
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
        childId: Number(childId),
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

// ─── Badge catalog ────────────────────────────────────────────────────────────
interface BadgeDef {
  id: string;
  emoji: string;
  label: string;
  hint: string;
  check: (s: ChildOlympiadStats) => boolean;
}
const BADGES: BadgeDef[] = [{
  id: "streak3",
  emoji: "🔥",
  label: "3-Day Streak",
  hint: "Play 3 days in a row",
  check: s => s.streak >= 3
}, {
  id: "streak7",
  emoji: "🔥🔥",
  label: "7-Day Streak",
  hint: "Play 7 days in a row",
  check: s => s.streak >= 7
}, {
  id: "streak30",
  emoji: "🔥🔥🔥",
  label: "30-Day Streak",
  hint: "Play 30 days in a row",
  check: s => s.streak >= 30
}, {
  id: "points100",
  emoji: "⭐",
  label: "100 Points",
  hint: "Earn 100 points",
  check: s => s.totalPoints >= 100
}, {
  id: "points500",
  emoji: "🌟",
  label: "500 Points",
  hint: "Earn 500 points",
  check: s => s.totalPoints >= 500
}, {
  id: "points1000",
  emoji: "💎",
  label: "1000 Points",
  hint: "Earn 1000 points",
  check: s => s.totalPoints >= 1000
}, {
  id: "perfect3",
  emoji: "🏆",
  label: "Perfect x3",
  hint: "Score 5/5 three times",
  check: s => s.perfectDays >= 3
}, {
  id: "math50",
  emoji: "🔢",
  label: "Math Whiz",
  hint: "50 correct Math answers",
  check: s => s.bySubject.math.correct >= 50
}, {
  id: "science50",
  emoji: "🔬",
  label: "Science Star",
  hint: "50 correct Science answers",
  check: s => s.bySubject.science.correct >= 50
}, {
  id: "reasoning50",
  emoji: "🧩",
  label: "Reasoning Pro",
  hint: "50 correct Reasoning answers",
  check: s => s.bySubject.reasoning.correct >= 50
}, {
  id: "gk50",
  emoji: "🌍",
  label: "GK Guru",
  hint: "50 correct GK answers",
  check: s => s.bySubject.gk.correct >= 50
}, {
  id: "weekly1",
  emoji: "👑",
  label: "Weekly Champ",
  hint: "Complete a weekly test",
  check: s => Object.values(s.weekly).some(w => w.submitted)
}];
function recomputeBadges(s: ChildOlympiadStats): string[] {
  const next = new Set(s.badges);
  for (const b of BADGES) if (b.check(s)) next.add(b.id);
  return Array.from(next);
}

// ─── Quiz Runner ──────────────────────────────────────────────────────────────
interface QuizRunnerProps {
  questions: OlympiadQuestion[];
  initialAnswers?: number[];
  pointsPerCorrect: number;
  perfectBonus?: number;
  timeLimitSec?: number;
  onComplete: (result: {
    answers: number[];
    score: number;
    pointsEarned: number;
    perfect: boolean;
    durationSec: number;
  }) => void;
  showRetryAfter?: boolean;
  onRetry?: () => void;
}
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function QuizRunner({
  questions,
  initialAnswers = [],
  pointsPerCorrect,
  perfectBonus = 0,
  timeLimitSec,
  onComplete,
  showRetryAfter,
  onRetry
}: QuizRunnerProps) {
  const {
    t
  } = useTranslation();
  const startedAt = useRef(Date.now());
  const [idx, setIdx] = useState(initialAnswers.length);
  const [answers, setAnswers] = useState<number[]>(initialAnswers);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(initialAnswers.length >= questions.length);
  const [remainingSec, setRemainingSec] = useState(timeLimitSec ?? 0);

  const sigQuestions = questions.map(q => q.id).join("|");
  const sigInitial = initialAnswers.join(",");
  useEffect(() => {
    startedAt.current = Date.now();
    setIdx(initialAnswers.length);
    setAnswers(initialAnswers);
    setPicked(null);
    setDone(initialAnswers.length >= questions.length);
    setRemainingSec(timeLimitSec ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sigQuestions, sigInitial, timeLimitSec]);

  useEffect(() => {
    if (!timeLimitSec || done) return;
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
      const left = Math.max(0, timeLimitSec - elapsed);
      setRemainingSec(left);
      if (left <= 0) setDone(true);
    }, 1000);
    return () => clearInterval(tick);
  }, [timeLimitSec, done, sigQuestions]);
  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("components.olympiad_zone.no_questions_available_for_this_combination_yet")}</p>;
  }
  if (done) {
    const finalAnswers = answers.length >= questions.length
      ? answers
      : [...answers, ...(picked !== null ? [picked] : [-1]), ...Array(Math.max(0, questions.length - answers.length - (picked !== null ? 1 : 0))).fill(-1)];
    const score = finalAnswers.reduce((acc, a, i) => acc + (a === questions[i]!.correct ? 1 : 0), 0);
    const perfect = score === questions.length;
    const pointsEarned = score * pointsPerCorrect + (perfect ? perfectBonus : 0);
    const durationSec = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    return <div className="space-y-4">
        <div className="text-center py-4">
          <div className="text-5xl mb-2">{perfect ? "🏆" : score >= questions.length / 2 ? "🎉" : "💪"}</div>
          <p className="text-2xl font-bold">{score} / {questions.length}</p>
          <p className="text-sm text-muted-foreground mt-1">
            +{pointsEarned} {t("components.olympiad_zone.points")}{perfect && perfectBonus > 0 ? ` (incl. ${perfectBonus} bonus)` : ""}
          </p>
        </div>
        <div className="space-y-2">
          {questions.map((q, i) => {
          const userAns = finalAnswers[i];
          const ok = userAns === q.correct;
          return <div key={q.id} className="rounded-lg border bg-card p-3 text-sm">
                <div className="flex items-start gap-2">
                  {ok ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="font-medium">{q.question}</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      {t("components.olympiad_zone.correct")} <span className="font-semibold text-foreground">{q.options[q.correct]}</span>
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground italic">{q.explanation}</p>
                  </div>
                </div>
              </div>;
        })}
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => onComplete({
          answers: finalAnswers,
          score,
          pointsEarned,
          perfect,
          durationSec,
        })}>
            {t("components.olympiad_zone.save_finish")}
          </Button>
          {showRetryAfter && onRetry && <Button variant="outline" onClick={onRetry}>
              <RotateCcw className="h-4 w-4 mr-1" /> {t("components.olympiad_zone.new_set")}
            </Button>}
        </div>
      </div>;
  }
  const q = questions[idx]!;
  const isAnswered = picked !== null;
  const isCorrect = picked === q.correct;
  const onPick = (i: number) => {
    if (!isAnswered) setPicked(i);
  };
  const onNext = () => {
    const newAnswers = [...answers, picked!];
    setAnswers(newAnswers);
    setPicked(null);
    if (idx + 1 >= questions.length) setDone(true);else setIdx(idx + 1);
  };
  return <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("components.olympiad_zone.question")} {idx + 1} of {questions.length}</span>
        <span className="flex items-center gap-2">
          {timeLimitSec ? (
            <span className={`flex items-center gap-1 font-semibold ${remainingSec <= 60 ? "text-primary" : ""}`}>
              <Clock className="h-3.5 w-3.5" />
              {formatTime(remainingSec)}
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <span>{SUBJECT_EMOJI[q.subject]}</span>
            <span>{SUBJECT_LABELS[q.subject]}</span>
            <span>·</span>
            <span>{DIFFICULTY_LABELS[q.difficulty]}</span>
          </span>
        </span>
      </div>
      <Progress value={idx / questions.length * 100} />

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-quicksand font-bold text-base leading-snug">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
            const showCorrect = isAnswered && i === q.correct;
            const showWrong = isAnswered && picked === i && i !== q.correct;
            return <button key={i} onClick={() => onPick(i)} disabled={isAnswered} className={`w-full text-left px-3 py-2.5 rounded-lg border-2 text-sm transition-all ${showCorrect ? "bg-muted dark:bg-card border-primary" : showWrong ? "bg-muted dark:bg-card border-primary" : isAnswered ? "border-border opacity-60" : picked === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                  {showCorrect && <CheckCircle2 className="inline h-4 w-4 ml-2 text-primary" />}
                  {showWrong && <XCircle className="inline h-4 w-4 ml-2 text-primary" />}
                </button>;
          })}
          </div>

          {isAnswered && <div className={`rounded-lg p-3 text-sm flex gap-2 ${isCorrect ? "bg-muted dark:bg-card text-primary dark:text-muted-foreground" : "bg-muted dark:bg-card text-primary dark:text-muted-foreground"}`}>
              <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{q.explanation}</p>
            </div>}
        </CardContent>
      </Card>

      <Button onClick={onNext} disabled={!isAnswered} className="w-full">
        {idx + 1 >= questions.length ? "See result" : "Next question"}
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>;
}

function QuestionSourceBadge({
  source,
  country,
  isPremium,
}: {
  source: "ai" | "dataset";
  country: string;
  isPremium: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px]">
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

// ─── Daily Tab ────────────────────────────────────────────────────────────────
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
  const {
    t
  } = useTranslation();
  const syncRun = useOlympiadSync(Number(childId), ageBand);
  const date = todayISO();
  const existingRun = stats.daily[date];
  const alreadyDone = existingRun?.submitted === true;
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
        },
  );
  const questions = qSet.questions;
  const reviewQuestions = alreadyDone
    ? readOlympiadQuestionCache(Number(childId), "daily", date) ??
      finalizeLocalizedSet(
        pickDailyQuestions(ageBand, stats.difficulty, date, childId),
        country,
        ageBand,
        stats.difficulty,
      )
    : questions;
  if (alreadyDone) {
    return <div className="space-y-3">
        <Card>
          <CardContent className="p-4 text-center space-y-1">
            <div className="text-3xl mb-1">✅</div>
            <p className="font-quicksand font-bold">{t("components.olympiad_zone.today_s_challenge_done")}</p>
            <p className="text-sm text-muted-foreground">
              {t("components.olympiad_zone.you_scored")} <span className="font-semibold text-foreground">{existingRun.score}/5</span> {t("components.olympiad_zone.today_come_back_tomorrow_for_a_fresh_set")}
            </p>
          </CardContent>
        </Card>
        <div className="space-y-2">
          {reviewQuestions.map((q, i) => {
          const userAns = existingRun.answers[i];
          const ok = userAns === q.correct;
          return <div key={q.id} className="rounded-lg border bg-card p-3 text-sm">
                <div className="flex items-start gap-2">
                  {ok ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="font-medium">{q.question}</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      {t("components.olympiad_zone.correct_2")} <span className="font-semibold text-foreground">{q.options[q.correct]}</span>
                    </p>
                  </div>
                </div>
              </div>;
        })}
        </div>
      </div>;
  }
  if (qSet.loading || questions.length === 0) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  return <div className="space-y-3">
      <QuestionSourceBadge source={qSet.source} country={qSet.country} isPremium={qSet.isPremium} />
      <Card className="bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card border-border dark:border-primary">
        <CardContent className="p-3 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">{childName}{t("components.olympiad_zone.s_daily_5")}</p>
            <p className="text-muted-foreground">
              {t("components.olympiad_zone.difficulty")} <strong>{DIFFICULTY_LABELS[stats.difficulty]}</strong> {t("components.olympiad_zone.earn_up_to_60_points")}
            </p>
          </div>
        </CardContent>
      </Card>
      <QuizRunner questions={questions} pointsPerCorrect={10} perfectBonus={10} timeLimitSec={DAILY_TIME_LIMIT_SEC} onComplete={({
      answers,
      score,
      pointsEarned,
      perfect,
      durationSec,
    }) => {
      // Update subject totals
      const bySubject = {
        ...stats.bySubject
      };
      questions.forEach((q, i) => {
        const subj = q.subject;
        bySubject[subj] = {
          correct: bySubject[subj].correct + (answers[i] === q.correct ? 1 : 0),
          total: bySubject[subj].total + 1
        };
      });
      // Streak: +1 if last was yesterday or today; reset to 1 if older.
      const last = stats.lastDailyDate;
      const newStreak = last === date ? stats.streak : last === yesterdayISO() ? stats.streak + 1 : 1;
      // Adaptive difficulty
      const newDifficulty: OlympiadDifficulty = score >= 4 && stats.difficulty === "easy" ? "medium" : score >= 4 && stats.difficulty === "medium" ? "hard" : score <= 1 && stats.difficulty === "hard" ? "medium" : score <= 1 && stats.difficulty === "medium" ? "easy" : stats.difficulty;
      const updated: ChildOlympiadStats = {
        ...stats,
        totalPoints: stats.totalPoints + pointsEarned,
        difficulty: newDifficulty,
        streak: newStreak,
        lastDailyDate: date,
        perfectDays: stats.perfectDays + (perfect ? 1 : 0),
        daily: {
          ...stats.daily,
          [date]: {
            picks: questions.map(q => q.id),
            answers,
            submitted: true,
            score
          }
        },
        bySubject
      };
      updated.badges = recomputeBadges(updated);
      setStats(updated);
      void syncRun("daily", questions, answers, durationSec);
    }} />
    </div>;
}

// ─── Practice Tab ─────────────────────────────────────────────────────────────
function PracticeTab({
  childId,
  ageBand,
  stats,
  setStats,
  country,
}: {
  childId: string | number;
  ageBand: OlympiadAgeBand;
  stats: ChildOlympiadStats;
  setStats: (s: ChildOlympiadStats) => void;
  country: string;
}) {
  const {
    t
  } = useTranslation();
  const syncRun = useOlympiadSync(Number(childId), ageBand);
  const [subject, setSubject] = useState<OlympiadSubject>("math");
  const [difficulty, setDifficulty] = useState<OlympiadDifficulty>(stats.difficulty);
  const [session, setSession] = useState<OlympiadQuestion[] | null>(null);
  const [fetchPractice, setFetchPractice] = useState(false);
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
    return <>
        <QuestionSourceBadge source={qSet.source} country={qSet.country} isPremium={qSet.isPremium} />
        <QuizRunner questions={session} pointsPerCorrect={5} showRetryAfter onRetry={() => {
        setSession(null);
        setFetchPractice(true);
      }} onComplete={({
      answers,
      pointsEarned,
      durationSec,
    }) => {
      const bySubject = {
        ...stats.bySubject
      };
      session.forEach((q, i) => {
        const subj = q.subject;
        bySubject[subj] = {
          correct: bySubject[subj].correct + (answers[i] === q.correct ? 1 : 0),
          total: bySubject[subj].total + 1
        };
      });
      const updated = {
        ...stats,
        totalPoints: stats.totalPoints + pointsEarned,
        bySubject
      };
      updated.badges = recomputeBadges(updated);
      setStats(updated);
      void syncRun("practice", session, answers, durationSec);
      setSession(null);
    }} />
      </>;
  }
  return <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold mb-2 text-muted-foreground">{t("components.olympiad_zone.pick_a_subject")}</p>
        <div className="grid grid-cols-2 gap-2">
          {subjects.map(s => <button key={s} onClick={() => setSubject(s)} className={`px-3 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all ${subject === s ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
              <span className="text-xl mr-2">{SUBJECT_EMOJI[s]}</span>
              {SUBJECT_LABELS[s]}
            </button>)}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold mb-2 text-muted-foreground">{t("components.olympiad_zone.pick_difficulty")}</p>
        <div className="flex gap-2">
          {difficulties.map(d => <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${difficulty === d ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
              {DIFFICULTY_LABELS[d]}
            </button>)}
        </div>
      </div>
      <Button className="w-full" disabled={fetchPractice || qSet.loading} onClick={() => setFetchPractice(true)}>
        <BookOpen className="h-4 w-4 mr-1" /> {qSet.loading ? t("components.olympiad_zone.loading_questions") : t("components.olympiad_zone.start_practice")}
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
    </div>;
}

// ─── Prep Tab (syllabus tracks + mock exam) ───────────────────────────────────
function PrepTab({
  childId,
  ageBand,
  stats,
  setStats,
  country,
}: {
  childId: string | number;
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
    return <>
        <QuestionSourceBadge source={session.source} country={session.country} isPremium={session.isPremium} />
        <QuizRunner
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
          const bySubject = { ...stats.bySubject };
          session.questions.forEach((q, i) => {
            bySubject[q.subject] = {
              correct: bySubject[q.subject].correct + (answers[i] === q.correct ? 1 : 0),
              total: bySubject[q.subject].total + 1,
            };
          });
          const updated: ChildOlympiadStats = {
            ...stats,
            totalPoints: stats.totalPoints + pointsEarned,
            bySubject,
            weekly: isMock
              ? {
                  ...stats.weekly,
                  [mockKey]: {
                    picks: session.questions.map((q) => q.id),
                    answers,
                    submitted: true,
                    score: answers.reduce(
                      (acc, a, i) => acc + (a === session.questions[i]!.correct ? 1 : 0),
                      0,
                    ),
                  },
                }
              : stats.weekly,
          };
          updated.badges = recomputeBadges(updated);
          setStats(updated);
          void syncRun(session.runType, session.questions, answers, durationSec, session.trackId);
          setSession(null);
        }}
      />
      </>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardContent className="p-4 space-y-3">
          <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.syllabus_tracks")}</p>
          <div className="space-y-2">
            {OLYMPIAD_TRACKS.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => setTrackId(track.id)}
                className={`w-full text-left px-3 py-3 rounded-xl border-2 transition-all ${
                  trackId === track.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
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
                className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium ${
                  difficulty === d ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={pendingKind === "track" || qSet.loading}
            onClick={() => setPendingKind("track")}
          >
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
            {MOCK_EXAM_QUESTION_COUNT} {t("components.olympiad_zone.questions")} · {Math.floor(MOCK_EXAM_TIME_LIMIT_SEC / 60)} min · olympiad-style
          </p>
          {mockDone ? (
            <p className="text-xs text-muted-foreground">{t("components.olympiad_zone.mock_done_this_week")}</p>
          ) : (
            <Button
              size="sm"
              disabled={pendingKind === "mock" || qSet.loading}
              onClick={() => setPendingKind("mock")}
            >
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

// ─── Progress Tab ─────────────────────────────────────────────────────────────
function buildAmyInsight(stats: ChildOlympiadStats, childName: string): string {
  const subjEntries = (Object.entries(stats.bySubject) as [OlympiadSubject, {
    correct: number;
    total: number;
  }][]).filter(([, v]) => v.total >= 3);
  if (subjEntries.length === 0) {
    return `${childName} is just getting started. Try the Daily 5 today and Amy will share insights as scores come in.`;
  }
  const withAcc = subjEntries.map(([s, v]) => ({
    s,
    acc: v.correct / v.total
  }));
  withAcc.sort((a, b) => b.acc - a.acc);
  const best = withAcc[0]!;
  const worst = withAcc[withAcc.length - 1]!;
  const bestPct = Math.round(best.acc * 100);
  const worstPct = Math.round(worst.acc * 100);
  if (best.s === worst.s) {
    return `${childName} is averaging ${bestPct}% in ${SUBJECT_LABELS[best.s]} so far. Add more subjects to see a fuller picture.`;
  }
  return `${childName} is strongest in ${SUBJECT_LABELS[best.s]} (${bestPct}% correct) and could use a little extra practice in ${SUBJECT_LABELS[worst.s]} (${worstPct}%). Try a 5-question Practice round there today.`;
}
function buildParentTip(stats: ChildOlympiadStats): string {
  if (stats.streak === 0) return "Tip: Set a fixed 'Olympiad time' each day — even 5 minutes builds the habit.";
  if (stats.streak < 3) return "Tip: Celebrate the streak! A high-five after each Daily 5 keeps motivation high.";
  if (stats.streak < 7) return "Tip: Talk through one question together. Reasoning out loud cements understanding.";
  return "Tip: Try the Weekly Test together as a family quiz night — make it fun!";
}
function weakestSubject(stats: ChildOlympiadStats): OlympiadSubject | null {
  const entries = (Object.entries(stats.bySubject) as [OlympiadSubject, { correct: number; total: number }][]).filter(
    ([, v]) => v.total >= 3,
  );
  if (entries.length === 0) return null;
  entries.sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
  return entries[0]![0];
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
                <span className="font-bold">#{lb.data.me.rank} · {lb.data.me.points} pts</span>
              </div>
            )}
            <ol className="space-y-1">
              {(lb.data?.top ?? []).map((r) => (
                <li
                  key={`${scope}-${r.childId}-${r.rank}`}
                  className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg ${
                    r.isMe ? "bg-primary/10 border border-primary/30" : "bg-muted dark:bg-primary/[0.06]"
                  }`}
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
}: {
  stats: ChildOlympiadStats;
  childName: string;
  childId: number;
  ageBand: OlympiadAgeBand;
}) {
  const {
    t
  } = useTranslation();
  const totalCorrect = (Object.values(stats.bySubject) as {
    correct: number;
    total: number;
  }[]).reduce((acc, v) => acc + v.correct, 0);
  const totalAnswered = (Object.values(stats.bySubject) as {
    correct: number;
    total: number;
  }[]).reduce((acc, v) => acc + v.total, 0);
  const overallPct = totalAnswered === 0 ? 0 : Math.round(totalCorrect / totalAnswered * 100);
  const weak = weakestSubject(stats);
  return <div className="space-y-4">
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
                {childName} {t("components.olympiad_zone.weak_area_body", { subject: SUBJECT_LABELS[weak] })}
              </p>
              <Button asChild size="sm" className="mt-2 rounded-full">
                <Link href="/study">{t("components.olympiad_zone.open_study_zone")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top stats */}
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
            <p className="text-xl font-bold mt-1">{overallPct}%</p>
            <p className="text-xs text-muted-foreground">{t("components.olympiad_zone.accuracy")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per subject */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.by_subject")}</p>
          {(Object.entries(stats.bySubject) as [OlympiadSubject, {
          correct: number;
          total: number;
        }][]).map(([s, v]) => {
          const pct = v.total === 0 ? 0 : Math.round(v.correct / v.total * 100);
          return <div key={s}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{SUBJECT_EMOJI[s]} {SUBJECT_LABELS[s]}</span>
                    <span className="text-muted-foreground">
                      {v.correct} / {v.total} {v.total > 0 ? `· ${pct}%` : ""}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>;
        })}
        </CardContent>
      </Card>

      {/* Amy AI insight */}
      <Card className="border-border dark:border-primary">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.amy_s_insight")}</p>
              <p className="text-xs text-muted-foreground mt-1">{buildAmyInsight(stats, childName)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parent guidance */}
      <Card className="bg-muted dark:bg-card border-border dark:border-primary">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.for_you_parent")}</p>
              <p className="text-xs text-muted-foreground mt-1">{buildParentTip(stats)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.badges")}</p>
          <div className="grid grid-cols-3 gap-2">
            {BADGES.map(b => {
            const earned = stats.badges.includes(b.id);
            return <div key={b.id} title={b.hint} className={`rounded-lg border p-2 text-center text-[11px] ${earned ? "bg-muted dark:bg-card border-border" : "opacity-50"}`}>
                  <div className="text-xl">{b.emoji}</div>
                  <div className="font-medium leading-tight mt-0.5">{b.label}</div>
                </div>;
          })}
          </div>
        </CardContent>
      </Card>
    </div>;
}

// ─── Weekly Card (within Daily tab footer) ────────────────────────────────────
function WeeklyTestCard({
  childId,
  ageBand,
  stats,
  setStats,
  country,
}: {
  childId: string | number;
  ageBand: OlympiadAgeBand;
  stats: ChildOlympiadStats;
  setStats: (s: ChildOlympiadStats) => void;
  country: string;
}) {
  const {
    t
  } = useTranslation();
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
    return <Card className="bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card border-border">
        <CardContent className="p-3 flex items-center gap-3">
          <Crown className="h-5 w-5 text-primary shrink-0" />
          <div className="text-xs flex-1">
            <p className="font-semibold">{t("components.olympiad_zone.weekly_test_done")}</p>
            <p className="text-muted-foreground">
              {t("components.olympiad_zone.score")} <strong>{weeklyRun.score} / {questions.length}</strong>{t("components.olympiad_zone.next_test_on_monday")}
            </p>
          </div>
        </CardContent>
      </Card>;
  }
  if (open) {
    if (qSet.loading || questions.length === 0) {
      return <Skeleton className="h-48 w-full rounded-2xl" />;
    }
    return <Card className="border-border">
        <CardContent className="p-4 space-y-3">
          <QuestionSourceBadge source={qSet.source} country={qSet.country} isPremium={qSet.isPremium} />
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <p className="font-quicksand font-bold">{t("components.olympiad_zone.weekly_test")}{questions.length} {t("components.olympiad_zone.questions")}</p>
          </div>
          <QuizRunner questions={questions} pointsPerCorrect={15} perfectBonus={50} onComplete={({
          answers,
          score,
          pointsEarned,
          durationSec,
        }) => {
          const bySubject = {
            ...stats.bySubject
          };
          questions.forEach((q, i) => {
            const subj = q.subject;
            bySubject[subj] = {
              correct: bySubject[subj].correct + (answers[i] === q.correct ? 1 : 0),
              total: bySubject[subj].total + 1
            };
          });
          const updated: ChildOlympiadStats = {
            ...stats,
            totalPoints: stats.totalPoints + pointsEarned,
            bySubject,
            weekly: {
              ...stats.weekly,
              [weekKey]: {
                picks: questions.map(q => q.id),
                answers,
                submitted: true,
                score
              }
            }
          };
          updated.badges = recomputeBadges(updated);
          setStats(updated);
          void syncRun("weekly", questions, answers, durationSec);
          setOpen(false);
        }} />
        </CardContent>
      </Card>;
  }
  return <Card className="bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card border-border">
      <CardContent className="p-3 flex items-center gap-3">
        <Crown className="h-5 w-5 text-primary shrink-0" />
        <div className="text-xs flex-1">
          <p className="font-semibold">{t("components.olympiad_zone.weekly_test_2")}</p>
          <p className="text-muted-foreground">{questions.length || 20} {t("components.olympiad_zone.questions_across_all_4_subjects_15_pts_each_50_bonus")}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>{t("components.olympiad_zone.start")}</Button>
      </CardContent>
    </Card>;
}

// ─── Public component ─────────────────────────────────────────────────────────
interface OlympiadZoneProps {
  child: {
    id: number | string;
    name: string;
    age: number;
  };
}
export function OlympiadZone({
  child
}: OlympiadZoneProps) {
  const {
    t
  } = useTranslation();
  const { country } = useStudyCountry();
  const { entitlements } = useSubscription();
  const [stats, setStatsState] = useState<ChildOlympiadStats>(() => loadStats(child.id));
  const [tab, setTab] = useState<"daily" | "practice" | "prep" | "progress">("daily");

  // Reload stats when child changes
  useEffect(() => {
    setStatsState(loadStats(child.id));
  }, [child.id]);
  const setStats = (s: ChildOlympiadStats) => {
    setStatsState(s);
    saveStats(child.id, s);
  };
  const ageBand = ageBandFor(child.age);
  return <div className="space-y-3">
      {/* Header strip */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Star className="h-3.5 w-3.5 text-primary" />
        <span>{t("components.olympiad_zone.level")} <strong>{ageBandLabel(ageBand)}</strong></span>
        <span>·</span>
        <span>{t("components.olympiad_zone.difficulty_2")} <strong>{DIFFICULTY_LABELS[stats.difficulty]}</strong></span>
        <span>·</span>
        <span>{stats.totalPoints} {t("components.olympiad_zone.pts")}</span>
        <span>·</span>
        <span>{countryLabel(country)}</span>
        {entitlements?.isPremium && (
          <>
            <span>·</span>
            <span className="text-primary font-semibold">{t("components.olympiad_zone.premium_ai")}</span>
          </>
        )}
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daily">{t("components.olympiad_zone.daily")}</TabsTrigger>
          <TabsTrigger value="practice">{t("components.olympiad_zone.practice")}</TabsTrigger>
          <TabsTrigger value="prep">{t("components.olympiad_zone.prep")}</TabsTrigger>
          <TabsTrigger value="progress">{t("components.olympiad_zone.progress")}</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-3 space-y-3">
          <SubItemGate sectionId="hub_olympiad" subItemId="olympiad_daily">
            <DailyTab childId={child.id} childName={child.name} ageBand={ageBand} stats={stats} setStats={setStats} country={country} />
            <WeeklyTestCard childId={child.id} ageBand={ageBand} stats={stats} setStats={setStats} country={country} />
          </SubItemGate>
        </TabsContent>
        <TabsContent value="practice" className="mt-3">
          <SubItemGate sectionId="hub_olympiad" subItemId="olympiad_practice">
            <PracticeTab childId={child.id} ageBand={ageBand} stats={stats} setStats={setStats} country={country} />
          </SubItemGate>
        </TabsContent>
        <TabsContent value="prep" className="mt-3">
          <SubItemGate sectionId="hub_olympiad" subItemId="olympiad_prep">
            <PrepTab childId={child.id} ageBand={ageBand} stats={stats} setStats={setStats} country={country} />
          </SubItemGate>
        </TabsContent>
        <TabsContent value="progress" className="mt-3">
          <SubItemGate sectionId="hub_olympiad" subItemId="olympiad_progress">
            <ProgressTab stats={stats} childName={child.name} childId={Number(child.id)} ageBand={ageBand} />
          </SubItemGate>
        </TabsContent>
      </Tabs>
    </div>;
}