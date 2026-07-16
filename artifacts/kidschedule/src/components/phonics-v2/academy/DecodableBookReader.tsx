import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { DecodableBook } from "@/lib/phonics-v3/decodable-books";
import { analyseCompanionReading } from "@/lib/phonics-v3/reading-companion";
import {
  buildComprehensionQuiz,
  scoreComprehensionQuiz,
  type ComprehensionQuestion,
} from "@/lib/phonics-v3/reading-comprehension";
import { AiPronunciationCoach } from "../lesson/AiPronunciationCoach";
import { Snail, BookOpen, ChevronRight, Lock } from "lucide-react";

export type BookReaderCompletePayload = {
  bookId: string;
  pageCount: number;
  comprehensionScorePct: number | null;
  wordsOnPages: number;
  avgAccuracy: number;
  durationMs: number;
};

type DecodableBookReaderProps = {
  book: DecodableBook;
  childId: number;
  childName: string;
  totalAgeMonths: number;
  unlocked: boolean;
  slowDefault?: boolean;
  comprehensionDifficulty?: "easy" | "medium" | "hard";
  onComplete: (payload: BookReaderCompletePayload) => void;
  onClose: () => void;
};

type Phase = "read" | "vocab" | "quiz" | "done";

export function DecodableBookReader({
  book,
  childId,
  childName,
  totalAgeMonths,
  unlocked,
  slowDefault = false,
  comprehensionDifficulty = "easy",
  onComplete,
  onClose,
}: DecodableBookReaderProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("read");
  const [slow, setSlow] = useState(slowDefault);
  const [nudge, setNudge] = useState<string | null>(null);
  const [accuracies, setAccuracies] = useState<number[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const startedAt = useRef(Date.now());
  const pageStartedAt = useRef(Date.now());

  const quiz: ComprehensionQuestion[] = useMemo(
    () => buildComprehensionQuiz(book, comprehensionDifficulty),
    [book, comprehensionDifficulty],
  );

  const page = book.pages[pageIndex];
  const wordsOnPages = useMemo(
    () =>
      book.pages.reduce((s, p) => s + p.text.split(/\s+/).filter(Boolean).length, 0),
    [book.pages],
  );

  useEffect(() => {
    startedAt.current = Date.now();
    pageStartedAt.current = Date.now();
    setPageIndex(0);
    setPhase("read");
    setAccuracies([]);
    setQuizAnswers([]);
    setQuizIndex(0);
    setNudge(null);
  }, [book.id]);

  const finishBook = useCallback(
    (comprehensionScorePct: number | null) => {
      const avgAccuracy =
        accuracies.length > 0
          ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
          : 80;
      onComplete({
        bookId: book.id,
        pageCount: book.pages.length,
        comprehensionScorePct,
        wordsOnPages,
        avgAccuracy,
        durationMs: Date.now() - startedAt.current,
      });
      setPhase("done");
    },
    [accuracies, book.id, book.pages.length, onComplete, wordsOnPages],
  );

  if (!unlocked) {
    return (
      <div className="rounded-3xl border border-border p-6 text-center space-y-2">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="font-quicksand font-bold">Keep practising sounds to unlock this book</p>
        <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>
          Back to library
        </Button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="space-y-3 rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 text-center">
        <p className="text-3xl" aria-hidden>
          🎉
        </p>
        <h3 className="font-quicksand text-lg font-black">You finished {book.title}!</h3>
        <Button type="button" className="rounded-full" onClick={onClose}>
          Back to library
        </Button>
      </div>
    );
  }

  if (phase === "vocab") {
    return (
      <div data-testid="book-vocab" className="space-y-4 rounded-3xl border border-border p-5">
        <h3 className="font-quicksand text-base font-bold">New words in this book</h3>
        <div className="space-y-3">
          {book.vocabulary.map((v) => (
            <div
              key={v.word}
              className="flex gap-3 rounded-2xl border border-border/60 bg-card/80 p-3"
            >
              <span className="text-3xl" aria-hidden>
                {v.emoji}
              </span>
              <div>
                <p className="font-quicksand text-lg font-black">{v.word}</p>
                <p className="text-xs text-muted-foreground">{v.definition}</p>
                <p className="mt-1 text-[11px] italic">“{v.example}”</p>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          className="w-full rounded-full"
          onClick={() => {
            if (quiz.length > 0) setPhase("quiz");
            else finishBook(null);
          }}
        >
          {quiz.length > 0 ? "Story questions" : "Finish"}
        </Button>
      </div>
    );
  }

  if (phase === "quiz") {
    const q = quiz[quizIndex]!;
    return (
      <div data-testid="book-comprehension" className="space-y-4 rounded-3xl border border-border p-5">
        <Badge variant="secondary" className="text-[10px]">
          Question {quizIndex + 1}/{quiz.length}
        </Badge>
        <p className="font-quicksand text-base font-bold">{q.question}</p>
        <div className="grid gap-2">
          {q.options.map((opt, i) => (
            <button
              key={opt}
              type="button"
              className="min-h-12 rounded-2xl border-2 border-border bg-card px-4 text-left font-semibold hover:border-primary/40"
              onClick={() => {
                const nextAnswers = [...quizAnswers, i];
                setQuizAnswers(nextAnswers);
                if (quizIndex + 1 >= quiz.length) {
                  const scored = scoreComprehensionQuiz(book.id, quiz, nextAnswers);
                  finishBook(scored.scorePct);
                } else {
                  setQuizIndex((n) => n + 1);
                }
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // phase === read
  return (
    <div
      data-testid="decodable-book-reader"
      className="space-y-4 rounded-3xl border border-primary/20 bg-card/95 p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-primary">
            {book.title}
          </p>
          <p className="text-xs text-muted-foreground">
            Page {pageIndex + 1} of {book.pages.length}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
          onClick={() => setSlow((s) => !s)}
          aria-pressed={slow}
        >
          <Snail className="h-3 w-3" />
          {slow ? "Slow on" : "Slow off"}
        </button>
      </div>
      <Progress
        value={((pageIndex + 1) / book.pages.length) * 100}
        className="h-1.5"
      />

      <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-8 text-center">
        <p className="text-4xl" aria-hidden>
          {page?.emoji ?? "📖"}
        </p>
        <p
          className={cn(
            "mt-4 font-quicksand text-3xl font-black tracking-wide",
            slow && "tracking-widest",
          )}
          lang="en"
        >
          {page?.text}
        </p>
      </div>

      <AiPronunciationCoach
        childId={childId}
        childName={childName}
        totalAgeMonths={totalAgeMonths}
        expected={page?.text.replace(/[.!?,]/g, "") ?? ""}
        targetKind="phrase"
        showArticulation={false}
        onEvaluation={(ev) => {
          const analysis = analyseCompanionReading({
            expectedText: page?.text ?? "",
            transcript: ev.transcript,
            confidence: ev.confidencePct,
          });
          setAccuracies((a) => [...a, analysis.accuracyPct]);
          setNudge(analysis.nudge);
        }}
        onPassed={() => {
          /* advance via Continue */
        }}
        onSkip={() => setNudge("That's okay — tap Continue when you're ready.")}
      />

      {nudge && (
        <p className="rounded-xl bg-primary/5 px-3 py-2 text-center text-xs text-foreground">
          {nudge}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>
          Close
        </Button>
        <Button
          type="button"
          className="ml-auto rounded-full"
          onClick={() => {
            void pageStartedAt.current;
            if (pageIndex + 1 >= book.pages.length) {
              setPhase("vocab");
            } else {
              setPageIndex((i) => i + 1);
              pageStartedAt.current = Date.now();
              setNudge(null);
            }
          }}
        >
          {pageIndex + 1 >= book.pages.length ? (
            <>
              <BookOpen className="mr-1 h-4 w-4" /> Words & questions
            </>
          ) : (
            <>
              Next page <ChevronRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
