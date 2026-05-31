import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  ChevronRight,
  RotateCcw,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  type OlympiadQuestion,
  type OlympiadAgeBand,
  SUBJECT_LABELS,
  SUBJECT_EMOJI,
  DIFFICULTY_LABELS,
} from "@workspace/olympiad";
import { useOlympiadHint } from "@/hooks/use-olympiad-enhancements";
import { cn } from "@/lib/utils";

export interface QuizRunnerProps {
  childId: number;
  ageBand: OlympiadAgeBand;
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
  hintsEnabled?: boolean;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function OlympiadQuizRunner({
  childId,
  ageBand,
  questions,
  initialAnswers = [],
  pointsPerCorrect,
  perfectBonus = 0,
  timeLimitSec,
  onComplete,
  showRetryAfter,
  onRetry,
  hintsEnabled = true,
}: QuizRunnerProps) {
  const { t } = useTranslation();
  const startedAt = useRef(Date.now());
  const [idx, setIdx] = useState(initialAnswers.length);
  const [answers, setAnswers] = useState<number[]>(initialAnswers);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(initialAnswers.length >= questions.length);
  const [remainingSec, setRemainingSec] = useState(timeLimitSec ?? 0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const { fetchHint, loading: hintLoading } = useOlympiadHint(childId);

  const sigQuestions = questions.map((q) => q.id).join("|");
  const sigInitial = initialAnswers.join(",");

  useEffect(() => {
    startedAt.current = Date.now();
    setIdx(initialAnswers.length);
    setAnswers(initialAnswers);
    setPicked(null);
    setDone(initialAnswers.length >= questions.length);
    setRemainingSec(timeLimitSec ?? 0);
    setHintText(null);
    setHintUsed(false);
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
    return (
      <p className="text-sm text-muted-foreground">
        {t("components.olympiad_zone.no_questions_available_for_this_combination_yet")}
      </p>
    );
  }

  if (done) {
    const finalAnswers =
      answers.length >= questions.length
        ? answers
        : [
            ...answers,
            ...(picked !== null ? [picked] : [-1]),
            ...Array(Math.max(0, questions.length - answers.length - (picked !== null ? 1 : 0))).fill(-1),
          ];
    const score = finalAnswers.reduce((acc, a, i) => acc + (a === questions[i]!.correct ? 1 : 0), 0);
    const perfect = score === questions.length;
    const pointsEarned = score * pointsPerCorrect + (perfect ? perfectBonus : 0);
    const durationSec = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="text-center py-4">
          <div className={cn("text-5xl mb-2", perfect && "animate-bounce")}>
            {perfect ? "🏆" : score >= questions.length / 2 ? "🎉" : "💪"}
          </div>
          <p className="text-2xl font-bold">
            {score} / {questions.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            +{pointsEarned} {t("components.olympiad_zone.points")}
            {perfect && perfectBonus > 0 ? ` (incl. ${perfectBonus} bonus)` : ""}
          </p>
        </div>
        <div className="space-y-2">
          {questions.map((q, i) => {
            const userAns = finalAnswers[i];
            const ok = userAns === q.correct;
            return (
              <div
                key={q.id}
                className={cn(
                  "rounded-lg border p-3 text-sm transition-colors",
                  ok ? "border-emerald-500/40 bg-emerald-500/10" : "border-red-500/40 bg-red-500/10",
                )}
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
                      {t("components.olympiad_zone.correct")}{" "}
                      <span className="font-semibold text-foreground">{q.options[q.correct]}</span>
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground italic">{q.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() =>
              onComplete({ answers: finalAnswers, score, pointsEarned, perfect, durationSec })
            }
          >
            {t("components.olympiad_zone.save_finish")}
          </Button>
          {showRetryAfter && onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RotateCcw className="h-4 w-4 mr-1" /> {t("components.olympiad_zone.new_set")}
            </Button>
          )}
        </div>
      </div>
    );
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
    setHintText(null);
    setHintUsed(false);
    if (idx + 1 >= questions.length) setDone(true);
    else setIdx(idx + 1);
  };

  const onHint = async () => {
    if (hintUsed || isAnswered) return;
    const result = await fetchHint({
      question: q.question,
      options: [...q.options],
      explanation: q.explanation,
      correctOption: q.options[q.correct]!,
      difficulty: q.difficulty,
    });
    if (result) {
      setHintText(result.hint);
      setHintUsed(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t("components.olympiad_zone.question")} {idx + 1} of {questions.length}
        </span>
        <span className="flex items-center gap-2">
          {timeLimitSec ? (
            <span
              className={cn(
                "flex items-center gap-1 font-semibold",
                remainingSec <= 60 && "text-red-500 animate-pulse",
              )}
            >
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
      <Progress value={(idx / questions.length) * 100} />

      <Card className={cn(isAnswered && (isCorrect ? "ring-2 ring-emerald-500/50" : "ring-2 ring-red-500/50"))}>
        <CardContent className="p-4 space-y-3">
          <p className="font-quicksand font-bold text-base leading-snug">{q.question}</p>

          {hintsEnabled && !isAnswered && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={hintUsed || hintLoading}
              onClick={() => void onHint()}
            >
              {hintLoading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1" />
              )}
              {hintUsed
                ? t("components.olympiad_zone.hint_used")
                : t("components.olympiad_zone.ask_amy_hint")}
            </Button>
          )}

          {hintText && !isAnswered && (
            <div className="rounded-lg p-3 text-sm flex gap-2 bg-primary/10 border border-primary/20">
              <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <p>{hintText}</p>
            </div>
          )}

          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const showCorrect = isAnswered && i === q.correct;
              const showWrong = isAnswered && picked === i && i !== q.correct;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPick(i)}
                  disabled={isAnswered}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg border-2 text-sm transition-all duration-200",
                    showCorrect && "border-emerald-500 bg-emerald-500/15 scale-[1.01]",
                    showWrong && "border-red-500 bg-red-500/15 animate-shake",
                    !showCorrect &&
                      !showWrong &&
                      (isAnswered ? "border-border opacity-60" : picked === i ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"),
                  )}
                >
                  <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                  {showCorrect && <CheckCircle2 className="inline h-4 w-4 ml-2 text-emerald-600" />}
                  {showWrong && <XCircle className="inline h-4 w-4 ml-2 text-red-500" />}
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div
              className={cn(
                "rounded-lg p-3 text-sm flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
                isCorrect ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-red-500/10 text-red-800 dark:text-red-200",
              )}
            >
              <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{q.explanation}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={onNext} disabled={!isAnswered} className="w-full">
        {idx + 1 >= questions.length ? t("components.olympiad_zone.see_result") : t("components.olympiad_zone.next_question")}
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
