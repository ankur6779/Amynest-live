import { useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Sparkles, Trophy, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isGrowLivingV1Enabled,
  livingGrowAcademyEyebrow,
} from "@/lib/grow/living-room";
import {
  DECODABLE_BOOK_LIBRARY,
  getUnlockedBooks,
  isBookUnlocked,
  type DecodableBook,
} from "@/lib/phonics-v3/decodable-books";
import {
  READING_ACADEMY_LEVELS,
  getReadingAcademyLevel,
  resolveReadingAcademyLevel,
  nextReadingAcademyLevel,
} from "@/lib/phonics-v3/reading-academy-levels";
import {
  loadAcademyProgress,
  saveAcademyProgress,
  markBookComplete,
} from "@/lib/phonics-v3/reading-academy-progress";
import {
  loadAcademyFluencyState,
  saveAcademyFluencyState,
  recordFluencySample,
  fluencyTrendSummary,
} from "@/lib/phonics-v3/reading-fluency-academy";
import {
  loadVocabularyState,
  saveVocabularyState,
  introduceBookVocabulary,
  vocabularyGrowthStats,
  getVocabularyDueForReview,
} from "@/lib/phonics-v3/reading-vocabulary";
import {
  loadAchievementState,
  saveAchievementState,
  evaluateAchievements,
  READING_ACHIEVEMENTS,
} from "@/lib/phonics-v3/reading-achievements";
import { buildAdaptiveReadingPlan } from "@/lib/phonics-v3/reading-adaptive-path";
import {
  getLastReadingRuntimeDecision,
  guidanceFromReadingDecision,
} from "@/lib/reading-world-learning-adapter";
import { buildParentWeeklyReport } from "@/lib/phonics-v3/parent-weekly-report";
import { teacherModeStatus } from "@/lib/phonics-v3/teacher-mode";
import {
  DecodableBookReader,
  type BookReaderCompletePayload,
} from "./DecodableBookReader";

type ReadingAcademyHubProps = {
  childId: number;
  childName: string;
  totalAgeMonths: number;
  letterGroupIndex: number;
  curriculumLevel: number;
  blendingScore?: number;
  pronunciationAvg?: number;
  className?: string;
};

export function ReadingAcademyHub({
  childId,
  childName,
  totalAgeMonths,
  letterGroupIndex,
  curriculumLevel,
  blendingScore = 0,
  pronunciationAvg = 0,
  className,
}: ReadingAcademyHubProps) {
  const [progress, setProgress] = useState(() => loadAcademyProgress(childId));
  const [fluency, setFluency] = useState(() => loadAcademyFluencyState(childId));
  const [vocab, setVocab] = useState(() => loadVocabularyState(childId));
  const [achievements, setAchievements] = useState(() =>
    loadAchievementState(childId),
  );
  const [activeBook, setActiveBook] = useState<DecodableBook | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  const fluencyTrend = useMemo(() => fluencyTrendSummary(fluency), [fluency]);
  const vocabStats = useMemo(() => vocabularyGrowthStats(vocab), [vocab]);

  const academyLevelId = useMemo(
    () =>
      resolveReadingAcademyLevel({
        curriculumLevel,
        letterGroupIndex,
        wordsRead: fluency.wordsReadAloud,
        storiesCompleted: progress.completedBookIds.length,
        blendingScore,
      }),
    [
      curriculumLevel,
      letterGroupIndex,
      fluency.wordsReadAloud,
      progress.completedBookIds.length,
      blendingScore,
    ],
  );
  const level = getReadingAcademyLevel(academyLevelId);
  const nextLevel = nextReadingAcademyLevel(academyLevelId);

  const unlocked = useMemo(
    () => getUnlockedBooks(letterGroupIndex),
    [letterGroupIndex],
  );

  const plan = useMemo(() => {
    const guidance = guidanceFromReadingDecision(
      childId,
      getLastReadingRuntimeDecision(childId),
    );
    // Catalog filters (SATPIN unlocks) stay local; order + difficulty from Runtime.
    return buildAdaptiveReadingPlan({
      letterGroupIndex,
      completedBookIds: progress.completedBookIds,
      recentComprehensionScores: progress.comprehensionScores,
      avgAccuracy: fluencyTrend.avgAccuracy,
      avgWpm: fluencyTrend.avgWpm,
      weakVocabCount: getVocabularyDueForReview(vocab).length,
      preferredBookIds: guidance.preferredBookIds,
      runtimeDifficulty: guidance.decisionId != null ? guidance.difficulty : undefined,
      runtimePreferShorter: guidance.narrationLength === "short",
      runtimeReviewFirst: guidance.reviewQueue.length > 0,
      runtimeReason: guidance.decisionId != null ? guidance.reason : undefined,
    });
  }, [
    childId,
    letterGroupIndex,
    progress.completedBookIds,
    progress.comprehensionScores,
    fluencyTrend.avgAccuracy,
    fluencyTrend.avgWpm,
    vocab,
  ]);

  const weeklyReport = useMemo(
    () =>
      buildParentWeeklyReport({
        letterGroupIndex,
        academyLevel: academyLevelId,
        storiesCompleted: progress.completedBookIds.length,
        wordsRead: fluency.wordsReadAloud,
        pronunciationAvg,
        fluencyAvgAccuracy: fluencyTrend.avgAccuracy || pronunciationAvg,
        fluencyBand: fluencyTrend.band,
        comprehensionAvg:
          progress.comprehensionScores.length > 0
            ? progress.comprehensionScores.reduce((a, b) => a + b, 0) /
              progress.comprehensionScores.length
            : 0,
        vocabularyTotal: vocabStats.total,
        newAchievements: achievements.unlocked
          .slice(-3)
          .map(
            (id) =>
              READING_ACHIEVEMENTS.find((a) => a.id === id)?.title ?? id,
          ),
        childName,
      }),
    [
      letterGroupIndex,
      academyLevelId,
      progress,
      fluency.wordsReadAloud,
      pronunciationAvg,
      fluencyTrend,
      vocabStats.total,
      achievements.unlocked,
      childName,
    ],
  );

  const handleBookComplete = useCallback(
    (payload: BookReaderCompletePayload) => {
      const book = DECODABLE_BOOK_LIBRARY.find((b) => b.id === payload.bookId);
      if (!book) return;

      const nextProgress = markBookComplete(
        progress,
        payload.bookId,
        payload.pageCount,
        payload.comprehensionScorePct ?? undefined,
      );
      setProgress(nextProgress);
      saveAcademyProgress(childId, nextProgress);

      let nextFluency = fluency;
      if (payload.durationMs > 0 && payload.wordsOnPages > 0) {
        nextFluency = recordFluencySample(fluency, {
          bookId: payload.bookId,
          pageIndex: payload.pageCount - 1,
          wordCount: payload.wordsOnPages,
          durationMs: Math.max(payload.durationMs, 1000),
          accuracyPct: payload.avgAccuracy,
          pauseCount: Math.max(0, Math.round((100 - payload.avgAccuracy) / 20)),
          selfCorrections: 0,
        });
        setFluency(nextFluency);
        saveAcademyFluencyState(childId, nextFluency);
      }

      const nextVocab = introduceBookVocabulary(
        vocab,
        book.id,
        book.vocabulary,
      );
      setVocab(nextVocab);
      saveVocabularyState(childId, nextVocab);

      const evald = evaluateAchievements({
        state: achievements,
        wordsRead: nextFluency.wordsReadAloud,
        storiesCompleted: nextProgress.completedBookIds.length,
        sentencesRead: nextProgress.sentencesRead,
        fluencyBand: nextFluency.lastBand,
      });
      if (evald.newlyUnlocked.length > 0) {
        setAchievements(evald.state);
        saveAchievementState(childId, evald.state);
        setToast(
          `Achievement: ${evald.newlyUnlocked.map((a) => a.title).join(", ")}`,
        );
      }
    },
    [achievements, childId, fluency, progress, vocab],
  );

  if (activeBook) {
    return (
      <div id="reading-academy" className={cn("scroll-mt-24", className)}>
        <DecodableBookReader
          book={activeBook}
          childId={childId}
          childName={childName}
          totalAgeMonths={totalAgeMonths}
          unlocked={isBookUnlocked(activeBook.id, letterGroupIndex)}
          slowDefault={plan.suggestSlowPlayback}
          comprehensionDifficulty={plan.comprehensionDifficulty}
          onComplete={handleBookComplete}
          onClose={() => setActiveBook(null)}
        />
      </div>
    );
  }

  const teacher = teacherModeStatus();
  const living = isGrowLivingV1Enabled();

  return (
    <Card
      id="reading-academy"
      data-testid="reading-academy-hub"
      data-gw-living={living ? "1" : undefined}
      className={cn(
        "rounded-3xl scroll-mt-24",
        living
          ? "gw-living-deep-panel border-[rgba(232,212,184,0.28)]"
          : "border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.07] via-card/90 to-sky-500/[0.05]",
        className,
      )}
    >
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-wide",
                living
                  ? "gw-living-deep-eyebrow"
                  : "font-black text-emerald-700 dark:text-emerald-300",
              )}
            >
              {living ? livingGrowAcademyEyebrow() : "Reading Academy"}
            </p>
            <h3 className={cn("font-quicksand text-lg", living ? "font-bold" : "font-black")}>
              {living
                ? `${level.emoji} ${level.name}`
                : `${level.emoji} Level ${level.id}: ${level.name}`}
            </h3>
            <p className="text-xs text-muted-foreground">{level.description}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            Group {letterGroupIndex}
          </Badge>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {READING_ACADEMY_LEVELS.map((l) => (
            <div
              key={l.id}
              title={l.name}
              className={cn(
                "flex flex-col items-center rounded-xl px-0.5 py-1.5 text-center",
                l.id === academyLevelId
                  ? "bg-emerald-500/20 ring-1 ring-emerald-500/40"
                  : l.id < academyLevelId
                    ? "bg-muted/40 opacity-80"
                    : "opacity-40",
              )}
            >
              <span className="text-sm" aria-hidden>
                {l.emoji}
              </span>
              <span className="text-[8px] font-bold leading-tight">{l.shortName}</span>
            </div>
          ))}
        </div>

        {nextLevel && (
          <p className="text-[11px] text-muted-foreground">
            Next milestone: <span className="font-semibold">{nextLevel.milestoneLabel}</span>{" "}
            — {nextLevel.name}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Stories" value={String(progress.completedBookIds.length)} />
          <Stat label="Words read" value={String(fluency.wordsReadAloud)} />
          <Stat
            label="Fluency"
            value={
              fluencyTrend.avgWpm > 0
                ? `${fluencyTrend.avgWpm} wpm`
                : fluencyTrend.band
            }
          />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/70 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-bold">Amy&apos;s path for you</p>
          </div>
          <p className="text-[11px] text-muted-foreground">{plan.rationale}</p>
          {plan.recommendedBookIds[0] && (
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={() => {
                const b = DECODABLE_BOOK_LIBRARY.find(
                  (x) => x.id === plan.recommendedBookIds[0],
                );
                if (b) setActiveBook(b);
              }}
            >
              Open recommended book <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <h4 className="font-quicksand text-sm font-bold">Decodable library</h4>
            <Badge variant="outline" className="ml-auto text-[9px]">
              {unlocked.length}/{DECODABLE_BOOK_LIBRARY.length} open
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DECODABLE_BOOK_LIBRARY.map((book) => {
              const open = isBookUnlocked(book.id, letterGroupIndex);
              const done = progress.completedBookIds.includes(book.id);
              return (
                <button
                  key={book.id}
                  type="button"
                  disabled={!open}
                  onClick={() => open && setActiveBook(book)}
                  className={cn(
                    "min-h-14 rounded-2xl border-2 px-3 py-3 text-left transition",
                    open
                      ? "border-border bg-card hover:border-emerald-500/40"
                      : "cursor-not-allowed border-dashed border-border/50 opacity-55",
                    done && "ring-1 ring-emerald-500/30",
                  )}
                  data-testid={`academy-book-${book.id}`}
                >
                  <div className="flex items-start gap-2">
                    {open ? (
                      <BookOpen className="mt-0.5 h-4 w-4 text-emerald-600" />
                    ) : (
                      <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-quicksand text-sm font-bold">{book.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Level {book.academyLevel} · Group {book.minLetterGroup}+
                        {done ? " · Done ✓" : ""}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h4 className="font-quicksand text-sm font-bold">Achievements</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {READING_ACHIEVEMENTS.map((a) => {
              const got = achievements.unlocked.includes(a.id);
              return (
                <span
                  key={a.id}
                  title={a.description}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold",
                    got
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-border/50 opacity-40",
                  )}
                >
                  <span aria-hidden>{a.emoji}</span>
                  {a.title}
                </span>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold">Vocabulary growth</p>
            <span className="text-[10px] text-muted-foreground">
              {vocabStats.strong}/{vocabStats.total} strong
            </span>
          </div>
          <Progress
            value={
              vocabStats.total === 0
                ? 0
                : (vocabStats.strong / vocabStats.total) * 100
            }
            className="h-1.5"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setShowReport((v) => !v)}
          >
            {showReport ? "Hide" : "Weekly"} parent report
          </Button>
          {!teacher.enabled && (
            <span className="self-center text-[9px] text-muted-foreground">
              {teacher.message}
            </span>
          )}
        </div>

        {showReport && (
          <div
            data-testid="academy-weekly-report"
            className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4"
          >
            <p className="text-sm font-bold">{weeklyReport.readingLevelName}</p>
            <p className="text-xs text-muted-foreground">{weeklyReport.summaryLine}</p>
            <ul className="grid grid-cols-2 gap-1 text-[11px]">
              <li>Stories: {weeklyReport.storiesCompleted}</li>
              <li>Words: {weeklyReport.wordsRead}</li>
              <li>Comprehension: {weeklyReport.comprehensionScore}%</li>
              <li>Vocab: {weeklyReport.vocabularyGrowth}</li>
              <li>Pronunciation: {weeklyReport.pronunciationTrend}</li>
              <li>Fluency: {weeklyReport.fluencyTrend}%</li>
            </ul>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">
                Try at home
              </p>
              <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
                {weeklyReport.homeActivities.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {toast && (
          <p
            role="status"
            className="rounded-xl bg-amber-500/15 px-3 py-2 text-center text-xs font-semibold"
          >
            {toast}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 px-2 py-2">
      <p className="font-quicksand text-base font-black">{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
