import { parseApiJson } from "@/lib/safe-json-response";
/**
 * Smart Study Zone v2 — Adaptive Question Runner
 *
 * Preloads 10 questions per batch, caches the next batch in sessionStorage,
 * and prefetches when the child is near the end of the current batch.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Sparkles, ArrowLeft, RefreshCw } from "lucide-react";
import { LearningLoadMoreButton } from "@/components/learning-load-more-button";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { getApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  STUDY_BACK_BTN,
  STUDY_SECTION_TITLE,
  studyPanelCard,
} from "@/lib/study-zone-theme";

const BATCH_SIZE = 10;
const PREFETCH_AT = 3;

interface AdaptiveQuestion {
  id: string;
  q: string;
  options: string[];
  answerToken: string;
}

interface NextResponse {
  level: number;
  source: "ai" | "dataset";
  country: string;
  questions: AdaptiveQuestion[];
}

interface Props {
  childId: number;
  /** Practice subject id sent to /next-questions (e.g. "plants", "addition"). */
  practiceSubject: string;
  /** Subject pack id for weak-topic tracking (e.g. "science", "math"). */
  progressPackId: string;
  topicId: string;
  country?: string;
  subjectTitle: string;
  subjectEmoji: string;
  onExit: () => void;
}

function cacheKey(childId: number, subject: string, country?: string): string {
  return `amynest:study:batch:${childId}:${subject}:${country ?? "auto"}`;
}

function readCache(key: string): NextResponse | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NextResponse;
    if (parsed?.questions?.length) return parsed;
  } catch { /* ignore */ }
  return null;
}

function writeCache(key: string, data: NextResponse): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota */ }
}

export function AdaptiveQuestionRunner({
  childId,
  practiceSubject,
  progressPackId,
  topicId,
  country,
  subjectTitle,
  subjectEmoji,
  onExit,
}: Props) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [questions, setQuestions] = useState<AdaptiveQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [pickedCorrect, setPickedCorrect] = useState<boolean | null>(null);
  const [reveal, setReveal] = useState(false);
  const [level, setLevel] = useState<number>(1);
  const [source, setSource] = useState<"ai" | "dataset">("dataset");
  const [resolvedCountry, setResolvedCountry] = useState<string>(country ?? "US");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const prefetching = useRef(false);
  const prefetchPromise = useRef<Promise<NextResponse | null> | null>(null);
  const storageKey = cacheKey(childId, practiceSubject, country);

  const fetchBatch = useCallback(async (): Promise<NextResponse | null> => {
    const token = await getToken();
    if (!token) return null;
    const res = await fetch(getApiUrl("/api/smart-study/next-questions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ childId, subject: practiceSubject, count: BATCH_SIZE, country }),
    });
    if (!res.ok) return null;
    return (await parseApiJson<NextResponse>(res));
  }, [childId, practiceSubject, country, getToken]);

  const applyBatch = useCallback((data: NextResponse, fromCache: boolean) => {
    setQuestions(data.questions ?? []);
    setLevel(data.level);
    setSource(data.source);
    setResolvedCountry(data.country);
    setIdx(0);
    setPickedIdx(null);
    setPickedCorrect(null);
    setReveal(false);
    if (!fromCache) writeCache(storageKey, data);
  }, [storageKey]);

  const prefetchNext = useCallback(async () => {
    if (prefetching.current) return;
    prefetching.current = true;
    prefetchPromise.current = fetchBatch().then((data) => {
      if (data?.questions?.length) writeCache(storageKey, data);
      prefetching.current = false;
      return data;
    }).catch(() => {
      prefetching.current = false;
      return null;
    });
  }, [fetchBatch, storageKey]);

  const loadBatch = useCallback(async (preferCache = true) => {
    if (!mounted.current) return;
    setLoading(true);
    setError(null);
    try {
      if (preferCache) {
        const cached = readCache(storageKey);
        if (cached?.questions?.length) {
          applyBatch(cached, true);
          sessionStorage.removeItem(storageKey);
          setLoading(false);
          void prefetchNext();
          return;
        }
      }
      if (prefetchPromise.current) {
        const prefetched = await prefetchPromise.current;
        prefetchPromise.current = null;
        if (prefetched?.questions?.length && mounted.current) {
          applyBatch(prefetched, false);
          setLoading(false);
          void prefetchNext();
          return;
        }
      }
      const data = await fetchBatch();
      if (!mounted.current) return;
      if (!data?.questions?.length) {
        setError("fetch");
        setLoading(false);
        return;
      }
      applyBatch(data, false);
      void prefetchNext();
    } catch {
      if (mounted.current) setError("network");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [applyBatch, fetchBatch, prefetchNext, storageKey]);

  useEffect(() => {
    mounted.current = true;
    void loadBatch(true);
    return () => {
      mounted.current = false;
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [loadBatch]);

  useEffect(() => {
    const remaining = questions.length - idx;
    if (remaining > 0 && remaining <= PREFETCH_AT && !prefetching.current && !loading) {
      void prefetchNext();
    }
  }, [idx, questions.length, loading, prefetchNext]);

  const current = questions[idx];

  const reportAttempt = useCallback(
    async (q: AdaptiveQuestion, selectedAnswer: string): Promise<boolean | null> => {
      try {
        const token = await getToken();
        if (!token) return null;
        const ts = new Date().toISOString();
        const res = await fetch(getApiUrl("/api/smart-study/attempt"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            childId,
            subject: practiceSubject,
            topicId: practiceSubject,
            questionId: q.id,
            selectedAnswer,
            answerToken: q.answerToken,
            ts,
          }),
        });
        if (!res.ok) return null;
        const body = await parseApiJson<{ correct?: boolean }>(res);
        const correct = body.correct ?? null;
        if (correct != null) {
          void fetch(getApiUrl("/api/smart-study/attempt"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              childId,
              subject: progressPackId,
              topicId,
              correct,
              ts,
            }),
          });
        }
        return correct;
      } catch {
        /* best-effort */
        return null;
      }
    },
    [childId, practiceSubject, progressPackId, topicId, getToken],
  );

  const onPick = (oi: number) => {
    if (!current || reveal) return;
    const selectedAnswer = current.options[oi];
    setPickedIdx(oi);
    const persistP = reportAttempt(current, selectedAnswer).then((correct) => {
      if (!mounted.current) return null;
      setReveal(true);
      setPickedCorrect(correct);
      setTotalAttempted((n) => n + 1);
      if (correct) setTotalCorrect((n) => n + 1);
      return correct;
    });

    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(async () => {
      const correct = await persistP;
      const nextIdx = idx + 1;
      if (nextIdx >= questions.length) {
        if (!mounted.current) return;
        void loadBatch(true);
        return;
      }
      if (!mounted.current) return;
      setIdx(nextIdx);
      setPickedIdx(null);
      setPickedCorrect(null);
      setReveal(false);
    }, 1700);
  };

  const accuracy = totalAttempted === 0 ? 0 : Math.round((totalCorrect / totalAttempted) * 100);

  return (
    <div className="grid gap-4 animate-in fade-in duration-200">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" className={STUDY_BACK_BTN} onClick={onExit} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className={STUDY_SECTION_TITLE}>
              <span className="text-2xl">{subjectEmoji}</span>
              {subjectTitle}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("screens.study.adaptive_subtitle", "Adaptive practice — questions get easier or harder as you go")}
            </div>
          </div>
        </div>
      </header>

      <div className={studyPanelCard()}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <div className="font-quicksand text-sm font-bold text-foreground inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[hsl(var(--brand-indigo-500))]" />
              {t("screens.study.adaptive_level_label", "Level {{level}} • {{accuracy}}% correct", {
                level, accuracy,
              })}
            </div>
            <div className="text-[11px] text-muted-foreground inline-flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/80">
                {resolvedCountry}
              </span>
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
        </div>
      </div>

      {loading ? (
        <div className={studyPanelCard()}>
          <div className="grid gap-3 p-5">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ) : error || !current ? (
        <div className={cn(studyPanelCard(), "border-rose-400/40")}>
          <div className="p-5 text-center">
            <p className="text-sm text-foreground mb-3">
              {t("screens.study.adaptive_error", "Couldn't load questions just now.")}
            </p>
            <Button onClick={() => void loadBatch(false)} className="rounded-full" variant="outline">
              <RefreshCw className="h-4 w-4 mr-1" />
              {t("screens.study.adaptive_retry", "Try again")}
            </Button>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div className={studyPanelCard()}>
              <div className="p-5">
                <div className="mb-4 font-quicksand text-xl font-bold text-foreground">
                  {current.q}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {current.options.map((opt, oi) => {
                    const isPicked = pickedIdx === oi;
                    const showState = reveal;
                    const cls = !showState
                      ? "border-white/[0.10] bg-[rgba(18,28,60,0.35)] hover:-translate-y-0.5"
                      : isPicked && pickedCorrect
                        ? "border-emerald-400/60 bg-emerald-500/10"
                        : isPicked
                          ? "border-rose-400/50 bg-rose-500/10"
                          : "border-white/[0.08] opacity-60";
                    return (
                      <button
                        key={`${current.id}-${oi}`}
                        onClick={() => onPick(oi)}
                        disabled={reveal}
                        data-testid={`adaptive-option-${oi}`}
                        className={`text-left rounded-xl border-2 px-4 py-3 text-base font-medium ${cls} transition-colors`}
                      >
                        <span className="inline-flex items-center gap-2">
                          {showState && isPicked && pickedCorrect && <CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-emerald-600))]" />}
                          {showState && isPicked && !pickedCorrect && <XCircle className="h-4 w-4 text-destructive" />}
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {!loading && questions.length > 0 && (
        <LearningLoadMoreButton
          section="smart_study"
          childId={childId}
          count={BATCH_SIZE}
          excludeIds={questions.map((q) => q.id)}
          params={{
            subject: practiceSubject,
            level,
            country: resolvedCountry,
          }}
          onLoaded={(items) => {
            const next = (items.questions ?? []) as AdaptiveQuestion[];
            if (next.length > 0) {
              setQuestions((prev) => [...prev, ...next]);
              setSource("ai");
            }
          }}
          className="flex justify-center pt-1"
        />
      )}
    </div>
  );
}
