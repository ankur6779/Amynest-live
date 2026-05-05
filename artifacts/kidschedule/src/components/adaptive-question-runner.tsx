/**
 * Smart Study Zone v2 — Adaptive Question Runner
 *
 * Fetches a batch of country-localized, anti-repetition, age-adaptive
 * questions from /api/smart-study/next-questions, renders one question at
 * a time with option buttons, instant feedback, and auto-advances. Wrong
 * answers reveal a hint and nudge the next question down a level (handled
 * server-side via the /attempt endpoint's bumpLevel logic). When the
 * batch is exhausted the runner refetches automatically — to the user it
 * feels like an endless adaptive practice stream.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Sparkles, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/firebase-auth-hooks";

export type SmartSubjectId =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "fractions"
  | "word-problems";

interface AdaptiveQuestion {
  id: string;
  q: string;
  options: string[];
  answer: string;
  hint?: string | null;
}

interface NextResponse {
  level: number;
  source: "ai" | "dataset";
  country: string;
  questions: AdaptiveQuestion[];
}

interface Props {
  childId: number;
  subject: SmartSubjectId;
  subjectTitle: string;
  subjectEmoji: string;
  onExit: () => void;
}

export function AdaptiveQuestionRunner({
  childId, subject, subjectTitle, subjectEmoji, onExit,
}: Props) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [questions, setQuestions] = useState<AdaptiveQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [level, setLevel] = useState<number>(1);
  const [source, setSource] = useState<"ai" | "dataset">("dataset");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Session counters — drive the progress bar and the "X correct in a row" feel.
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Lifecycle guard — `loadBatch` is async and could resolve after the
  // user navigates away from the runner. Without this, React would warn
  // about state updates on an unmounted component (and we'd briefly
  // render stale data).
  const mounted = useRef(true);

  const loadBatch = useCallback(async () => {
    if (!mounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!mounted.current) return;
      if (!token) {
        setError("auth");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/smart-study/next-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ childId, subject, count: 5 }),
      });
      if (!mounted.current) return;
      if (!res.ok) {
        setError("fetch");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as NextResponse;
      if (!mounted.current) return;
      setQuestions(data.questions ?? []);
      setLevel(data.level);
      setSource(data.source);
      setIdx(0);
      setPickedIdx(null);
      setReveal(false);
    } catch {
      if (mounted.current) setError("network");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [childId, subject, getToken]);

  useEffect(() => {
    mounted.current = true;
    loadBatch();
    return () => {
      mounted.current = false;
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [loadBatch]);

  const current = questions[idx];

  const reportAttempt = useCallback(
    async (q: AdaptiveQuestion, correct: boolean): Promise<void> => {
      try {
        const token = await getToken();
        if (!token) return;
        // Smart Study v2: include questionId so the server can dedupe
        // (anti-repetition). topicId mirrors the subject for compatibility
        // with the legacy attempt-tracking schema.
        await fetch("/api/smart-study/attempt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            childId,
            subject,
            topicId: subject,
            correct,
            questionId: q.id,
            ts: new Date().toISOString(),
          }),
        });
      } catch {
        /* best-effort — don't block the UI on telemetry */
      }
    },
    [childId, subject, getToken],
  );

  const onPick = (oi: number) => {
    if (!current || reveal) return;
    setPickedIdx(oi);
    setReveal(true);
    const correct = current.options[oi] === current.answer;
    setTotalAttempted((n) => n + 1);
    if (correct) setTotalCorrect((n) => n + 1);
    // Fire the persistence call now so the server has time to update
    // seenQuestionIds before the next /next-questions request — without
    // this, a fresh batch could re-serve the question we just answered.
    const persistP = reportAttempt(current, correct);

    // Auto-advance: 900ms for correct (snappy), 1700ms for wrong (so the
    // hint registers before it disappears).
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(async () => {
      const nextIdx = idx + 1;
      if (nextIdx >= questions.length) {
        // Wait for persistence so the next batch sees this question id in
        // seenQuestionIds. Best-effort: even if the await rejects, we
        // still load the next batch (anti-repetition is a UX nicety, not
        // a correctness guarantee).
        try { await persistP; } catch { /* swallow */ }
        if (!mounted.current) return;
        loadBatch();
        return;
      }
      if (!mounted.current) return;
      setIdx(nextIdx);
      setPickedIdx(null);
      setReveal(false);
    }, correct ? 900 : 1700);
  };

  const accuracy = totalAttempted === 0 ? 0 : Math.round((totalCorrect / totalAttempted) * 100);

  return (
    <div className="grid gap-4 animate-in fade-in duration-200">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={onExit}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="font-quicksand text-xl font-bold text-foreground flex items-center gap-2">
              <span className="text-2xl">{subjectEmoji}</span>
              {subjectTitle}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("screens.study.adaptive_subtitle", "Adaptive practice — questions get easier or harder as you go")}
            </div>
          </div>
        </div>
      </header>

      <Card className="rounded-2xl border-[hsl(var(--brand-indigo-300))] dark:border-[hsl(var(--brand-indigo-800))]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <div className="font-quicksand text-sm font-bold text-foreground inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[hsl(var(--brand-indigo-500))]" />
              {t("screens.study.adaptive_level_label", "Level {{level}} • {{accuracy}}% correct", {
                level, accuracy,
              })}
            </div>
            <div className="text-[11px] text-muted-foreground inline-flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-[hsl(var(--brand-amber-100))] dark:bg-[hsl(var(--brand-amber-900))] text-[hsl(var(--brand-amber-700))] dark:text-[hsl(var(--brand-amber-300))]">
                {source === "ai" ? "AI" : t("screens.study.adaptive_source_dataset", "Practice set")}
              </span>
              <span>{idx + 1}/{Math.max(questions.length, 1)}</span>
            </div>
          </div>
          <Progress
            value={questions.length === 0 ? 0 : ((idx + (reveal ? 1 : 0)) / questions.length) * 100}
            className="h-2"
          />
        </CardContent>
      </Card>

      {loading ? (
        <Card className="rounded-2xl">
          <CardContent className="p-5 grid gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ) : error || !current ? (
        <Card className="rounded-2xl border-destructive/40">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-foreground mb-3">
              {t("screens.study.adaptive_error", "Couldn't load questions just now.")}
            </p>
            <Button onClick={loadBatch} className="rounded-full" variant="outline">
              <RefreshCw className="h-4 w-4 mr-1" />
              {t("screens.study.adaptive_retry", "Try again")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="rounded-2xl">
              <CardContent className="p-5">
                <div className="font-quicksand text-xl font-bold text-foreground mb-4">
                  {current.q}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {current.options.map((opt, oi) => {
                    const isPicked = pickedIdx === oi;
                    const isAnswer = current.answer === opt;
                    const showState = reveal;
                    const cls = !showState
                      ? "border-border hover-elevate"
                      : isAnswer
                        ? "border-[hsl(var(--brand-emerald-500))] bg-[hsl(var(--brand-emerald-50))] dark:bg-[hsl(var(--brand-emerald-950))]"
                        : isPicked
                          ? "border-destructive bg-destructive/10"
                          : "border-border opacity-60";
                    return (
                      <button
                        key={`${current.id}-${oi}`}
                        onClick={() => onPick(oi)}
                        disabled={reveal}
                        data-testid={`adaptive-option-${oi}`}
                        className={`text-left rounded-xl border-2 px-4 py-3 text-base font-medium ${cls} transition-colors`}
                      >
                        <span className="inline-flex items-center gap-2">
                          {showState && isAnswer && <CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-emerald-600))]" />}
                          {showState && isPicked && !isAnswer && <XCircle className="h-4 w-4 text-destructive" />}
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {reveal && pickedIdx !== null && current.options[pickedIdx] !== current.answer && current.hint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 text-sm text-muted-foreground"
                  >
                    💡 {current.hint}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
