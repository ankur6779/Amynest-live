import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GraduationCap, BookOpen, Gamepad2, Headphones, Trophy, UserCheck, Sparkles, Volume2, VolumeX, RefreshCw, Star, CheckCircle2, XCircle, Loader2, Crown, Swords, Bot, User as UserIcon, Lock, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { type SpellingAgeGroup, type SpellingDifficulty, type SpellingWord, type SafeSessionWord, type SessionFinalizeSummary, type SpellingProgress, type SpellingAiOpponent, spellingAgeGroupFor, useSpellingTTS, useSpellingWords, useSpellingProgress, useSpellingLeaderboard, useSpellingSession, useSpellingTournament, BADGE_LABELS, levelFromStars } from "@/hooks/use-spelling";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useSpellingRetention, buildWeeklyReport } from "@/hooks/use-spelling-retention";
import {
  AchievementCabinet,
  DailyGoalCard,
  NextStepBanner,
  RetentionCelebrationOverlay,
  SmartRecommendationsCard,
  StreakCard,
  ParentTrustSummary,
  WeeklyReportCard,
  WordCollectionBook,
} from "@/components/spelling-retention-ui";
import { cn } from "@/lib/utils";
import {
  buildSpellingSessionPrewarmItems,
  prefetchSpellingAudioUrls,
} from "@/lib/spelling-audio-map";
interface SpellingMasteryProps {
  childId: number;
  childName: string;
  ageMonths: number;
}
type Mode = "learn" | "practice" | "dictation" | "competition" | "tournament" | "battle" | "parent";
const MODES: {
  id: Mode;
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  tint: string;
}[] = [{
  id: "learn",
  label: "Learn",
  icon: BookOpen,
  tint: "from-primary to-primary"
}, {
  id: "practice",
  label: "Practice",
  icon: Gamepad2,
  tint: "from-primary to-primary"
}, {
  id: "dictation",
  label: "Dictation",
  icon: Headphones,
  tint: "from-primary to-primary"
}, {
  id: "competition",
  label: "Competition",
  icon: Trophy,
  tint: "from-primary to-primary"
}, {
  id: "tournament",
  label: "Tournament",
  icon: Crown,
  tint: "from-primary to-primary"
}, {
  id: "battle",
  label: "Battle",
  icon: Swords,
  tint: "from-primary to-primary"
}, {
  id: "parent",
  label: "Parent Mode",
  icon: UserCheck,
  tint: "from-primary to-primary"
}];
const AGE_GROUPS: {
  id: SpellingAgeGroup;
  label: string;
}[] = [{
  id: "2-4",
  label: "Age 2–4"
}, {
  id: "4-6",
  label: "Age 4–6"
}, {
  id: "6-8",
  label: "Age 6–8"
}, {
  id: "8-10+",
  label: "Age 8–10+"
}];
const DIFFICULTIES: SpellingDifficulty[] = ["easy", "medium", "hard"];
const SESSION_WORD_COUNT = 5;
const COMPETITION_TIME_LIMIT_SEC = 600;
const TRANSITION_MS = 200;

const TOURNAMENT_LEAGUES = [{
  id: "bronze",
  label: "Bronze League",
  emoji: "🥉",
  starsRequired: 0
}, {
  id: "silver",
  label: "Silver League",
  emoji: "🥈",
  starsRequired: 100
}, {
  id: "gold",
  label: "Gold League",
  emoji: "🥇",
  starsRequired: 250
}, {
  id: "diamond",
  label: "Diamond League",
  emoji: "💎",
  starsRequired: 500
}] as const;

function formatCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function capitalizeDifficulty(d: SpellingDifficulty): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function liveCompetitionScore(correct: number, elapsedSec: number): number {
  const base = correct * 100;
  const speedBonus = Math.max(0, Math.round((COMPETITION_TIME_LIMIT_SEC - elapsedSec) / 10));
  return base + speedBonus;
}

// ────────────────────────────────────────────────────────────────────────────
// Shared micro-UI
// ────────────────────────────────────────────────────────────────────────────
function SessionProgressBar({
  current,
  total
}: {
  current: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round(current / total * 100)) : 0;
  return <div className="space-y-1">
      <div className="h-2 rounded-full bg-muted dark:bg-card overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-primary transition-all duration-200 ease-out" style={{
        width: `${pct}%`
      }} />
      </div>
    </div>;
}

function CelebrationFlash({
  show,
  message
}: {
  show: boolean;
  message: string;
}) {
  if (!show) return null;
  return <div className="animate-in fade-in zoom-in-95 duration-200 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-center">
      <p className="font-quicksand font-extrabold text-primary text-sm">{message}</p>
    </div>;
}

function AnimatedWordCard({
  wordKey,
  children,
  className
}: {
  wordKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  return <Card key={wordKey} className={cn("border-border dark:border-primary animate-in fade-in slide-in-from-right-2 duration-200", className)}>
      {children}
    </Card>;
}

// ────────────────────────────────────────────────────────────────────────────
// Main container
// ────────────────────────────────────────────────────────────────────────────
export function SpellingMastery({
  childId,
  childName,
  ageMonths
}: SpellingMasteryProps) {
  const {
    t
  } = useTranslation();
  const {
    toast
  } = useToast();
  const initialAge = spellingAgeGroupFor(ageMonths);
  const [ageGroup, setAgeGroup] = useState<SpellingAgeGroup>(initialAge);
  const [difficulty, setDifficulty] = useState<SpellingDifficulty>("easy");
  const [mode, setMode] = useState<Mode>("learn");
  const [contentRevision, setContentRevision] = useState(0);
  const progressState = useSpellingProgress(childId, ageGroup);
  const playerLevel = levelFromStars(progressState.progress?.totalStars ?? 0);
  const wordsState = useSpellingWords(childId, ageGroup, difficulty, playerLevel);
  const retention = useSpellingRetention(childId);
  const {
    syncLevelBaseline,
    checkLevelUp,
    dismissCelebration,
    daily: retentionDaily,
    streak: retentionStreak,
    streakAtRisk,
    bonusStars,
    collectionCounts,
    collection,
    achievements,
    celebrations,
    weeklyReport,
    recordWordLearned,
    recordWordPracticed,
    recordSessionComplete,
    recordCompetitionWin,
    getWeakestSound,
    state: retentionState,
  } = retention;
  const tts = useSpellingTTS();
  const displayWords = wordsState.words;
  const activeSessionWords = displayWords;

  const bumpContentRevision = useCallback(() => {
    setContentRevision(r => r + 1);
  }, []);

  const modePanelRef = useRef<HTMLDivElement>(null);

  const handleModeChange = useCallback((next: Mode) => {
    const label = MODES.find(m => m.id === next)?.label ?? next;
    if (next === mode) {
      toast({ title: `Already in ${label}` });
      modePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    setMode(next);
    toast({ title: `${label} mode` });
    requestAnimationFrame(() => {
      modePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [mode, toast]);

  const handleAgeChange = useCallback((next: SpellingAgeGroup) => {
    const label = AGE_GROUPS.find(g => g.id === next)?.label ?? next;
    if (next === ageGroup) {
      toast({ title: `Already on ${label}` });
      return;
    }
    setAgeGroup(next);
    bumpContentRevision();
    toast({ title: `Age group: ${label}` });
  }, [ageGroup, bumpContentRevision, toast]);

  const handleDifficultyChange = useCallback((next: SpellingDifficulty) => {
    if (next === difficulty) {
      toast({ title: `Already on ${capitalizeDifficulty(next)}` });
      return;
    }
    setDifficulty(next);
    bumpContentRevision();
    toast({
      title: `Difficulty: ${capitalizeDifficulty(next)}`
    });
  }, [difficulty, bumpContentRevision, toast]);

  const handleNewWords = useCallback(() => {
    bumpContentRevision();
    const fresh = wordsState.refresh({
      count: SESSION_WORD_COUNT
    });
    if (fresh.length === 0) {
      toast({
        title: "Couldn't load words",
        description: "Tap New Words again — we'll pick a fresh set.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: `${fresh.length} new words ready`
    });
  }, [wordsState, bumpContentRevision, toast]);

  // Re-sync age group if the child's stored age changes mid-session.
  useEffect(() => {
    setAgeGroup(spellingAgeGroupFor(ageMonths));
  }, [ageMonths]);

  useEffect(() => {
    bumpContentRevision();
  }, [ageGroup, difficulty, bumpContentRevision]);

  useEffect(() => {
    const level = progressState.progress?.currentLevel ?? 1;
    syncLevelBaseline(level);
  }, [progressState.progress?.currentLevel, syncLevelBaseline]);

  const prevLevelRef = useRef<number | null>(null);
  useEffect(() => {
    const level = progressState.progress?.currentLevel ?? 1;
    if (prevLevelRef.current !== null && level > prevLevelRef.current) {
      checkLevelUp(level);
    }
    prevLevelRef.current = level;
  }, [progressState.progress?.currentLevel, checkLevelUp]);

  const goLearn = useCallback(() => setMode("learn"), []);
  const stars = progressState.progress?.totalStars ?? 0;
  const level = progressState.progress?.currentLevel ?? 1;
  const starsToNext = 10 - (stars % 10);

  return <div className="space-y-3">
      <RetentionCelebrationOverlay
        celebrations={celebrations}
        onDismiss={dismissCelebration}
      />

      <SpellingHero progress={progressState.progress} childName={childName} bonusStars={bonusStars} dailyStreak={retentionStreak} />

      <NextStepBanner
        dailyDone={retentionDaily.done}
        dailyCurrent={retentionDaily.current}
        dailyTarget={retentionDaily.target}
        level={level}
        starsToNextLevel={starsToNext}
        onGoLearn={goLearn}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <DailyGoalCard
          {...retentionDaily}
          onStartLearn={retentionDaily.done ? undefined : goLearn}
        />
        <StreakCard
          streak={retentionStreak}
          atRisk={streakAtRisk}
          milestones={retentionState.streakMilestones}
          onStartSession={goLearn}
        />
      </div>

      <SmartRecommendationsCard
        weakSound={getWeakestSound()}
        ageGroup={ageGroup}
        difficulty={difficulty}
        tts={tts}
        onPracticeWord={(w) => recordWordPracticed(w, true)}
      />

      <WordCollectionBook collection={collection} counts={collectionCounts} />

      <AchievementCabinet unlocked={achievements} />

      {/* Age + Difficulty + Word source */}
      <Card className="border-border dark:border-primary bg-gradient-to-br from-muted to-muted dark:from-primary/[0.06] dark:to-primary/[0.06]">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {AGE_GROUPS.map(g => <button key={g.id} onClick={() => handleAgeChange(g.id)} className={["px-3 py-1.5 rounded-full text-xs font-quicksand font-bold transition-colors duration-200", ageGroup === g.id ? "bg-primary text-white shadow-md ring-2 ring-primary/30" : "bg-white/70 dark:bg-white/[0.06] text-foreground hover:bg-white"].join(" ")}>
                {g.label}
              </button>)}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              {t("components.spelling_mastery.difficulty")}
            </span>
            {DIFFICULTIES.map(d => <button key={d} onClick={() => handleDifficultyChange(d)} className={["px-2.5 py-1 rounded-md text-xs font-bold capitalize transition-colors duration-200", difficulty === d ? "bg-foreground text-background ring-2 ring-foreground/20" : "bg-white/60 dark:bg-white/[0.06] text-muted-foreground hover:text-foreground"].join(" ")}>
                {d}
              </button>)}
            <Badge variant="outline" className="text-[10px] font-bold">
              {activeSessionWords.length} / {wordsState.bucketSize} pool
            </Badge>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleNewWords} className="h-8 text-xs transition-all duration-200">
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                {t("components.spelling_mastery.new_words")}
              </Button>
            </div>
          </div>

          {activeSessionWords.length > 0 && <div className="text-[11px] text-muted-foreground animate-in fade-in duration-200">
              Now showing: {activeSessionWords.map(w => w.word).join(", ")}
            </div>}
          {wordsState.source === "ai" && <div className="text-[11px] text-primary dark:text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> {t("components.spelling_mastery.showing_ai_generated_words")}
            </div>}
          {wordsState.error && <div className="text-[11px] text-primary dark:text-primary">
              {t("components.spelling_mastery.couldn_t_load_words")}{wordsState.error}{t("components.spelling_mastery.try_new_words")}
            </div>}
        </CardContent>
      </Card>

      {/* Mode tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {MODES.map(m => {
        const Icon = m.icon;
        const active = mode === m.id;
        return <button key={m.id} onClick={() => handleModeChange(m.id)} className={["shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-quicksand transition-colors duration-200", active ? `bg-gradient-to-r ${m.tint} text-white shadow-md` : "bg-white/70 dark:bg-white/[0.06] text-foreground hover:bg-white"].join(" ")}>
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>;
      })}
      </div>

      {/* Active mode panel */}
      <div ref={modePanelRef} key={`${mode}-${contentRevision}`} className="animate-in fade-in duration-200">
        {mode === "learn" && <LearnView words={activeSessionWords} tts={tts} contentRevision={contentRevision} onWordLearned={w => recordWordLearned(w)} onSessionComplete={words => {
        wordsState.markSessionCompleted();
        recordSessionComplete(words);
      }} onPracticeAgain={bumpContentRevision} onGenerateNewWords={handleNewWords} onStartCompetition={() => setMode("competition")} />}
        {mode === "practice" && <PracticeView words={activeSessionWords} tts={tts} onAttempt={(correct, word) => word && recordWordPracticed(word, correct)} />}
        {mode === "dictation" && <DictationView childId={childId} ageGroup={ageGroup} difficulty={difficulty} wordsSource="catalog" tts={tts} onProgressUpdate={progressState.setProgress} />}
        {mode === "competition" && <CompetitionView childId={childId} ageGroup={ageGroup} difficulty={difficulty} wordsSource="catalog" tts={tts} onProgressUpdate={p => {
        progressState.setProgress(p);
        checkLevelUp(p.currentLevel);
      }} onCompetitionWin={() => recordCompetitionWin()} />}
        {mode === "tournament" && <TournamentView childId={childId} ageGroup={ageGroup} totalStars={progressState.progress?.totalStars ?? 0} tts={tts} onProgressUpdate={progressState.setProgress} />}
        {mode === "battle" && <BattleView childId={childId} ageGroup={ageGroup} difficulty={difficulty} wordsSource="catalog" tts={tts} onProgressUpdate={progressState.setProgress} />}
        {mode === "parent" && <ParentView words={displayWords} weeklyReport={weeklyReport} collectionCounts={collectionCounts} childName={childName} tts={tts} onAttempt={(correct, word) => {
        if (word) recordWordPracticed(word, correct);
        void progressState.recordAttempt(correct, "parent");
      }} />}
      </div>

      {/* Always-visible leaderboard for the active age group */}
      <LeaderboardPanel ageGroup={ageGroup} />
    </div>;
}

// ────────────────────────────────────────────────────────────────────────────
// Hero — stars / level / badges
// ────────────────────────────────────────────────────────────────────────────
function SpellingHero({
  progress,
  childName,
  bonusStars = 0,
  dailyStreak
}: {
  progress: ReturnType<typeof useSpellingProgress>["progress"];
  childName: string;
  bonusStars?: number;
  dailyStreak?: number;
}) {
  const {
    t
  } = useTranslation();
  const stars = progress?.totalStars ?? 0;
  const level = progress?.currentLevel ?? 1;
  const streak = dailyStreak ?? progress?.currentStreak ?? 0;
  const badges = progress?.badges ?? [];
  // 10 stars per level — show progress to next.
  const progressPct = Math.min(100, Math.round(stars % 10 / 10 * 100));
  return <Card className="border-border dark:border-primary bg-gradient-to-br from-muted via-muted to-muted dark:from-primary/[0.08] dark:via-primary/[0.06] dark:to-primary/[0.08]">
      <CardContent className="p-3.5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center shadow-md shrink-0">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-quicksand font-bold text-[15px] text-foreground">
                {childName}{t("components.spelling_mastery.s_spelling_journey")}
              </p>
              <Badge className="bg-primary text-primary dark:text-muted-foreground border-primary">
                {t("components.spelling_mastery.level")} {level}
              </Badge>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-bold text-primary dark:text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                {stars}{bonusStars > 0 ? ` (+${bonusStars})` : ""}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-[10px]">🔥</span> {streak} Day{streak === 1 ? "" : "s"}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {stars % 10}/10 to L{level + 1}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted dark:bg-card overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary transition-all" style={{
              width: `${progressPct}%`
            }} />
            </div>
            {badges.length > 0 && <div className="mt-2 flex flex-wrap gap-1">
                {badges.map(id => {
              const meta = BADGE_LABELS[id];
              if (!meta) return null;
              return <span key={id} title={meta.label} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-white/[0.06] text-[10px] font-bold">
                      <span>{meta.emoji}</span>
                      <span>{meta.label}</span>
                    </span>;
            })}
              </div>}
          </div>
        </div>
      </CardContent>
    </Card>;
}

// ────────────────────────────────────────────────────────────────────────────
// Shared sub-bits
// ────────────────────────────────────────────────────────────────────────────
function PlayButtons({
  text,
  catalogId,
  tts,
  showLabel = true
}: {
  text: string;
  catalogId?: string;
  tts: ReturnType<typeof useSpellingTTS>;
  showLabel?: boolean;
}) {
  const {
    t
  } = useTranslation();

  const stopTts = tts.stop;

  useEffect(() => {
    return () => {
      stopTts();
    };
  }, [text, stopTts]);

  const handlePlay = () => {
    if (tts.speaking) {
      tts.stop();
      return;
    }
    void tts.speak(text, { catalogId });
  };

  const handleSlow = () => {
    tts.stop();
    void tts.speak(text, { slow: true, catalogId });
  };

  return <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <Button size="sm" onPointerDown={() => tts.prime(text, catalogId)} onClick={handlePlay} disabled={tts.loading} className="bg-primary hover:bg-primary text-white">
          {tts.loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : tts.speaking ? <VolumeX className="h-4 w-4 mr-1" /> : <Volume2 className="h-4 w-4 mr-1" />}
          {showLabel && (tts.speaking ? "Stop" : "Play")}
        </Button>
        <Button size="sm" variant="outline" onPointerDown={() => tts.prime(text, catalogId)} onClick={handleSlow} disabled={tts.loading}>
          {t("components.spelling_mastery.slow")}
        </Button>
      </div>
      {tts.error && <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={handlePlay}>
          Retry audio
        </Button>}
    </div>;
}

/**
 * Like PlayButtons but plays a pre-prepared audio URL (session-scoped).
 * Used by Competition / Dictation where the server hides the answer text.
 */
function PlayButtonsForUrl({
  url,
  tts
}: {
  url: string;
  tts: ReturnType<typeof useSpellingTTS>;
}) {
  const {
    t
  } = useTranslation();

  const stopTts = tts.stop;

  useEffect(() => {
    return () => {
      stopTts();
    };
  }, [url, stopTts]);

  const handlePlay = () => {
    if (tts.speaking) {
      tts.stop();
      return;
    }
    void tts.playUrl(url);
  };

  const handleSlow = () => {
    tts.stop();
    void tts.playUrl(url, { slow: true });
  };

  return <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <Button size="sm" onPointerDown={() => url && tts.primeUrl(url)} onClick={handlePlay} disabled={tts.loading || !url} className="bg-primary hover:bg-primary text-white">
          {tts.loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : tts.speaking ? <VolumeX className="h-4 w-4 mr-1" /> : <Volume2 className="h-4 w-4 mr-1" />}
          {tts.speaking ? "Stop" : "Play"}
        </Button>
        <Button size="sm" variant="outline" onPointerDown={() => url && tts.primeUrl(url)} onClick={handleSlow} disabled={tts.loading || !url}>
          {t("components.spelling_mastery.slow_2")}
        </Button>
      </div>
      {tts.error && url && <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={handlePlay}>
          Retry audio
        </Button>}
    </div>;
}
function EmptyOrLoading({
  loading,
  empty,
  emptyMsg = "No words available yet.",
  loadingMessage,
  actionLabel,
  onAction
}: {
  loading: boolean;
  empty: boolean;
  emptyMsg?: string;
  loadingMessage?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const {
    t
  } = useTranslation();
  if (loading) {
    return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
        <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" /> {loadingMessage ?? t("components.spelling_mastery.loading_words")}
      </CardContent></Card>;
  }
  if (empty) {
    return <Card><CardContent className="p-6 text-center space-y-3">
        <BookOpen className="h-10 w-10 mx-auto text-primary opacity-80" />
        <p className="text-sm text-muted-foreground">{emptyMsg}</p>
        {actionLabel && onAction && <Button size="sm" onClick={onAction} className="bg-primary text-white">
            {actionLabel}
          </Button>}
      </CardContent></Card>;
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Learn — show word + syllables + sound chunks + audio
// ────────────────────────────────────────────────────────────────────────────
function LearnView({
  words,
  tts,
  contentRevision,
  onWordLearned,
  onSessionComplete,
  onPracticeAgain,
  onGenerateNewWords,
  onStartCompetition
}: {
  words: SpellingWord[];
  tts: ReturnType<typeof useSpellingTTS>;
  contentRevision: number;
  onWordLearned: (word: SpellingWord) => void;
  onSessionComplete: (words: SpellingWord[]) => void;
  onPracticeAgain: () => void;
  onGenerateNewWords: () => void;
  onStartCompetition: () => void;
}) {
  const {
    t
  } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [learnedCount, setLearnedCount] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [complete, setComplete] = useState(false);
  const empty = words.length === 0;
  const word = words[idx];
  const stopTts = tts.stop;
  useEffect(() => {
    setIdx(0);
    setLearnedCount(0);
    setCelebrating(false);
    setComplete(false);
    stopTts();
  }, [words, contentRevision, stopTts]);
  useEffect(() => {
    stopTts();
  }, [idx, word?.id, stopTts]);
  useEffect(() => {
    if (words.length === 0) return;
    prefetchSpellingAudioUrls(
      buildSpellingSessionPrewarmItems(words, idx, 3).map((i) => i.url),
    );
  }, [words, idx]);
  if (empty || !word && !complete) {
    return <EmptyOrLoading loading={false} empty={empty} emptyMsg="Pick New Words above, then tap Learn to start today's goal!" />;
  }
  if (complete) {
    const accuracy = words.length > 0 ? 100 : 0;
    const starsEarned = learnedCount * 5;
    return <Card className="border-border dark:border-primary bg-gradient-to-br from-muted to-muted dark:from-primary/[0.06] dark:to-primary/[0.06] animate-in fade-in zoom-in-95 duration-200">
        <CardContent className="p-5 space-y-4 text-center">
          <p className="font-quicksand font-extrabold text-xl text-foreground">Session Complete 🎉</p>
          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
            <Stat label="Words Learned" value={String(learnedCount)} />
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Stars Earned" value={`+${starsEarned}`} />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => {
          setComplete(false);
          setIdx(0);
          setLearnedCount(0);
          onPracticeAgain();
        }} className="bg-primary hover:bg-primary text-white">
              Practice Again
            </Button>
            <Button variant="outline" onClick={onGenerateNewWords}>
              Generate New Words
            </Button>
            <Button variant="outline" onClick={onStartCompetition}>
              Start Competition
            </Button>
          </div>
        </CardContent>
      </Card>;
  }
  const advance = () => {
    if (word) onWordLearned(word);
    const nextLearned = learnedCount + 1;
    setLearnedCount(nextLearned);
    if (idx + 1 >= words.length) {
      onSessionComplete(words);
      setTimeout(() => setComplete(true), TRANSITION_MS);
      return;
    }
    setCelebrating(true);
    setTimeout(() => {
      setCelebrating(false);
      setIdx(i => i + 1);
    }, TRANSITION_MS + 150);
  };
  return <AnimatedWordCard wordKey={`${word.id}-${contentRevision}`}>
      <CardContent className="p-4 space-y-4">
        <SessionProgressBar current={idx + (celebrating ? 1 : 0)} total={words.length} />
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            {t("components.spelling_mastery.word")} {idx + 1} of {words.length}
          </p>
          <p className="mt-2 text-5xl font-quicksand font-extrabold tracking-wide text-primary dark:text-muted-foreground capitalize min-h-[3.5rem]">
            {word.word}
          </p>
          <p className="mt-2 text-sm text-muted-foreground italic">
            "{word.hint}"
          </p>
        </div>

        <CelebrationFlash show={celebrating} message="✓ Great Job! Next word unlocked" />

        <div className="flex justify-center">
          <PlayButtons text={word.word} catalogId={word.id} tts={tts} />
        </div>

        <div className="rounded-xl bg-muted dark:bg-card p-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-primary dark:text-muted-foreground font-bold mb-1.5">
              {t("components.spelling_mastery.syllables")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(word.syllables ?? []).map((s, i) => <span key={i} className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/[0.08] text-base font-quicksand font-bold text-primary dark:text-muted-foreground">
                  {s}
                </span>)}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-primary dark:text-muted-foreground font-bold mb-1.5">
              {t("components.spelling_mastery.sounds")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(word.chunks ?? []).map((s, i) => <button key={i} onClick={() => {
              tts.stop();
              void tts.speak(s, { slow: true });
            }} className="px-2.5 py-1 rounded-md bg-white dark:bg-white/[0.08] text-sm font-bold text-primary dark:text-muted-foreground hover:bg-muted dark:hover:bg-card">
                  {s}
                </button>)}
            </div>
          </div>
        </div>

        <Button onClick={advance} disabled={celebrating} className="w-full bg-primary hover:bg-primary text-white transition-all duration-200">
          <CheckCircle2 className="h-4 w-4 mr-1" /> {t("components.spelling_mastery.i_learned_it")}
        </Button>
      </CardContent>
    </AnimatedWordCard>;
}

// ────────────────────────────────────────────────────────────────────────────
// Practice — alternates between Missing-Letter and Jumbled-Letter games
// ────────────────────────────────────────────────────────────────────────────
function PracticeView({
  words,
  tts,
  onAttempt
}: {
  words: SpellingWord[];
  tts: ReturnType<typeof useSpellingTTS>;
  onAttempt: (correct: boolean, word?: SpellingWord) => void;
}) {
  const [idx, setIdx] = useState(0);
  const empty = words.length === 0;
  useEffect(() => {
    setIdx(0);
  }, [words]);
  const word = words[idx];
  const game: "missing" | "jumbled" = idx % 2 === 0 ? "missing" : "jumbled";
  if (empty || !word) {
    return <EmptyOrLoading loading={false} empty={empty} emptyMsg="Tap New Words above, then switch to Practice to play spelling games." actionLabel="Get new words" onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })} />;
  }
  const next = () => setIdx(i => (i + 1) % words.length);
  return <div className="space-y-3">
      <div className="text-center text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
        {game === "missing" ? "Missing Letter" : "Jumbled Letters"} — {idx + 1} / {words.length}
      </div>
      {game === "missing" ? <MissingLetterGame key={`m-${word.id}`} word={word} tts={tts} onResult={c => {
      onAttempt(c, word);
    }} onNext={next} /> : <JumbledLetterGame key={`j-${word.id}`} word={word} tts={tts} onResult={c => {
      onAttempt(c, word);
    }} onNext={next} />}
    </div>;
}
function MissingLetterGame({
  word,
  tts,
  onResult,
  onNext
}: {
  word: SpellingWord;
  tts: ReturnType<typeof useSpellingTTS>;
  onResult: (correct: boolean) => void;
  onNext: () => void;
}) {
  const {
    t
  } = useTranslation();
  // Hide one "chunk" (letter or digraph) and ask the child to choose it
  // from a small set of distractor chunks pulled from the same word's
  // siblings. Determined once per word so the puzzle is stable.
  const {
    chunks
  } = word;
  const hideIdx = useMemo(() => Math.floor(Math.random() * chunks.length), [chunks]);
  const target = chunks[hideIdx];
  const options = useMemo(() => {
    // Take up to 3 distractor letters from the rest of the word + a few
    // common letters, dedupe, then shuffle in the correct answer.
    const distractors = new Set<string>();
    chunks.forEach((c, i) => {
      if (i !== hideIdx) distractors.add(c);
    });
    const filler = ["a", "e", "i", "o", "u", "s", "t", "n", "r"];
    for (const f of filler) {
      if (distractors.size >= 3) break;
      if (f !== target) distractors.add(f);
    }
    const arr = [target, ...Array.from(distractors).slice(0, 3)];
    // Fisher-Yates
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [chunks, hideIdx, target]);
  const [chosen, setChosen] = useState<string | null>(null);
  const correct = chosen !== null && chosen === target;
  const pick = (val: string) => {
    if (chosen !== null) return;
    setChosen(val);
    onResult(val === target);
  };
  return <Card className="border-border dark:border-primary">
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <p className="text-3xl font-quicksand font-extrabold tracking-wider text-primary dark:text-muted-foreground capitalize">
            {chunks.map((c, i) => <span key={i} className={i === hideIdx ? chosen === null ? "text-muted-foreground underline" : correct ? "text-primary" : "text-primary line-through" : ""}>
                {i === hideIdx && chosen === null ? "_".repeat(Math.max(1, c.length)) : i === hideIdx ? chosen : c}
              </span>)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground italic">"{word.hint}"</p>
        </div>

        <div className="flex justify-center">
          <PlayButtons text={word.word} catalogId={word.id} tts={tts} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {options.map(o => {
          const picked = chosen === o;
          const isAns = chosen !== null && o === target;
          return <button key={o} onClick={() => pick(o)} disabled={chosen !== null} className={["py-3 rounded-xl text-lg font-quicksand font-extrabold transition-all", chosen === null ? "bg-muted hover:bg-muted dark:bg-card dark:hover:bg-card text-primary dark:text-muted-foreground" : isAns ? "bg-primary text-white" : picked ? "bg-primary text-white" : "bg-white/40 dark:bg-white/[0.04] text-muted-foreground"].join(" ")}>
                {o}
              </button>;
        })}
        </div>

        {chosen !== null && <div className="flex items-center justify-between gap-2">
            <p className={["text-sm font-bold", correct ? "text-primary" : "text-primary"].join(" ")}>
              {correct ? "✅ Nice spelling!" : `❌ It's "${word.word}"`}
            </p>
            <Button onClick={onNext} className="bg-primary hover:bg-primary text-white">
              {t("components.spelling_mastery.next")}
            </Button>
          </div>}
      </CardContent>
    </Card>;
}
function JumbledLetterGame({
  word,
  tts,
  onResult,
  onNext
}: {
  word: SpellingWord;
  tts: ReturnType<typeof useSpellingTTS>;
  onResult: (correct: boolean) => void;
  onNext: () => void;
}) {
  const {
    t
  } = useTranslation();
  // Tap-to-pick from a shuffled tile bank. Build/typed string is committed
  // when the child has placed exactly word.length letters.
  const target = word.word;
  const tiles = useMemo(() => {
    const arr = target.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.map((ch, i) => ({
      id: `${ch}-${i}`,
      ch
    }));
  }, [target]);
  const [picked, setPicked] = useState<typeof tiles>([]);
  const [committed, setCommitted] = useState<"ok" | "bad" | null>(null);
  const pick = (tile: typeof tiles[number]) => {
    if (committed) return;
    if (picked.find(p => p.id === tile.id)) return;
    const nextPicked = [...picked, tile];
    setPicked(nextPicked);
    if (nextPicked.length === target.length) {
      const guess = nextPicked.map(p => p.ch).join("");
      const ok = guess === target;
      setCommitted(ok ? "ok" : "bad");
      onResult(ok);
    }
  };
  const remove = (i: number) => {
    if (committed) return;
    setPicked(picked.filter((_, idx) => idx !== i));
  };
  return <Card className="border-border dark:border-primary">
      <CardContent className="p-4 space-y-4">
        <div className="text-center text-[11px] text-muted-foreground italic">
          {t("components.spelling_mastery.tap_the_letters_in_the_right_order_clue")}{word.hint}"
        </div>
        <div className="flex justify-center">
          <PlayButtons text={target} tts={tts} />
        </div>

        {/* Picked row */}
        <div className="min-h-[56px] rounded-xl border-2 border-dashed border-border dark:border-primary bg-muted dark:bg-primary/[0.05] p-2 flex flex-wrap justify-center gap-1.5">
          {picked.length === 0 && <span className="text-xs text-muted-foreground self-center">{t("components.spelling_mastery.tap_letters_below")}</span>}
          {picked.map((p, i) => <button key={p.id} onClick={() => remove(i)} className={["w-10 h-10 rounded-lg font-quicksand font-extrabold text-lg transition-all", committed === "ok" ? "bg-primary text-white" : committed === "bad" ? "bg-primary text-white" : "bg-white dark:bg-white/[0.08] text-primary dark:text-muted-foreground hover:bg-muted dark:hover:bg-card"].join(" ")}>
              {p.ch}
            </button>)}
        </div>

        {/* Tile bank */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {tiles.map(t => {
          const used = picked.find(p => p.id === t.id);
          return <button key={t.id} onClick={() => pick(t)} disabled={!!used || !!committed} className={["w-10 h-10 rounded-lg font-quicksand font-extrabold text-lg transition-all", used ? "bg-white/30 dark:bg-white/[0.04] text-muted-foreground/50" : "bg-primary text-white hover:bg-primary shadow-sm"].join(" ")}>
                {t.ch}
              </button>;
        })}
        </div>

        {committed && <div className="flex items-center justify-between gap-2">
            <p className={["text-sm font-bold", committed === "ok" ? "text-primary" : "text-primary"].join(" ")}>
              {committed === "ok" ? "✅ Spelt right!" : `❌ It's "${target}"`}
            </p>
            <Button onClick={() => {
          setPicked([]);
          setCommitted(null);
          onNext();
        }} className="bg-primary hover:bg-primary text-white">
              {t("components.spelling_mastery.next_2")}
            </Button>
          </div>}
        {!committed && picked.length > 0 && <Button variant="outline" onClick={() => setPicked([])} className="w-full">
            {t("components.spelling_mastery.clear")}
          </Button>}
      </CardContent>
    </Card>;
}

// ────────────────────────────────────────────────────────────────────────────
// Dictation — server-graded session flow
// ────────────────────────────────────────────────────────────────────────────
//
// v2: the server picks the words, plays them via session-scoped audio
// URLs, and grades each typed guess. The client never sees the answer
// until the server reveals it in the attempt response.
function DictationView({
  childId,
  ageGroup,
  difficulty,
  wordsSource,
  tts,
  onProgressUpdate
}: {
  childId: number;
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  wordsSource: "catalog" | "curated" | "ai";
  tts: ReturnType<typeof useSpellingTTS>;
  onProgressUpdate: (p: SpellingProgress) => void;
}) {
  const {
    t
  } = useTranslation();
  const session = useSpellingSession(childId, ageGroup, onProgressUpdate);
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [verdict, setVerdict] = useState<{
    correct: boolean;
    correctAnswer: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-start the first session on mount + restart whenever the
  // configuration (age/difficulty/source) changes underneath us.
  useEffect(() => {
    setIdx(0);
    setGuess("");
    setVerdict(null);
    void session.start({
      mode: "dictation",
      difficulty,
      count: 10,
      source: wordsSource
    });
    // We deliberately ignore session in deps — calling start again on
    // every render would loop forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, ageGroup, difficulty, wordsSource]);
  const word = session.words[idx];

  // REMOVED auto-play on word change — user taps play to hear the word.
  if (session.loading && session.words.length === 0) {
    return <EmptyOrLoading loading empty={false} />;
  }
  if (!word) {
    return <EmptyOrLoading loading={false} empty emptyMsg="No words loaded for this run." />;
  }
  const submit = async () => {
    if (verdict || submitting) return;
    const trimmed = guess.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const result = await session.attempt(idx, trimmed);
    setSubmitting(false);
    if (result) setVerdict(result);
  };
  const next = async () => {
    if (idx + 1 >= session.words.length) {
      // End of run — finalize quietly so the session is closed out.
      await session.finalize();
      // Restart with a fresh batch of words.
      setIdx(0);
      setGuess("");
      setVerdict(null);
      void session.start({
        mode: "dictation",
        difficulty,
        count: 10,
        source: wordsSource
      });
      return;
    }
    setIdx(i => i + 1);
    setGuess("");
    setVerdict(null);
  };
  return <Card className="border-border dark:border-primary">
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            {t("components.spelling_mastery.dictation")} {idx + 1} / {session.words.length}
          </p>
          <p className="mt-2 text-base text-primary dark:text-muted-foreground font-bold">
            {t("components.spelling_mastery.listen_and_spell_the_word")}
          </p>
        </div>

        <div className="flex justify-center">
          <PlayButtonsForUrl url={word.audioUrl} tts={tts} />
        </div>

        <Input value={guess} onChange={e => !verdict && setGuess(e.target.value)} onKeyDown={e => {
        if (e.key === "Enter") void submit();
      }} placeholder={`Type the word… (${word.letterCount} letters)`} autoFocus disabled={!!verdict || submitting} className={["text-center text-xl font-quicksand font-bold tracking-wider h-12", verdict?.correct === true ? "border-primary bg-muted dark:bg-card" : "", verdict?.correct === false ? "border-primary bg-muted dark:bg-card" : ""].join(" ")} />

        {!verdict ? <Button onClick={() => void submit()} disabled={!guess.trim() || submitting} className="w-full bg-primary hover:bg-primary text-white">
            {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            {t("components.spelling_mastery.check")}
          </Button> : <div className="space-y-2">
            <div className={["flex items-center justify-center gap-2 text-sm font-bold", verdict.correct ? "text-primary" : "text-primary"].join(" ")}>
              {verdict.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {verdict.correct ? `Spot on — "${verdict.correctAnswer}"` : `It's "${verdict.correctAnswer}"`}
            </div>
            <Button onClick={() => void next()} className="w-full bg-primary hover:bg-primary text-white">
              {idx + 1 >= session.words.length ? "Start a new round →" : "Next word →"}
            </Button>
          </div>}

        {session.error && <p className="text-[11px] text-primary dark:text-primary text-center">
            {session.error === "already_graded" ? "Already graded — moving on." : `Couldn't grade (${session.error}).`}
          </p>}
      </CardContent>
    </Card>;
}

// ────────────────────────────────────────────────────────────────────────────
// Competition — server-graded, server-timed, server-scored
// ────────────────────────────────────────────────────────────────────────────
function CompetitionView({
  childId,
  ageGroup,
  difficulty,
  wordsSource,
  tts,
  onProgressUpdate,
  onCompetitionWin
}: {
  childId: number;
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  wordsSource: "catalog" | "curated" | "ai";
  tts: ReturnType<typeof useSpellingTTS>;
  onProgressUpdate: (p: SpellingProgress) => void;
  onCompetitionWin?: () => void;
}) {
  const {
    t
  } = useTranslation();
  const session = useSpellingSession(childId, ageGroup, onProgressUpdate);
  type Phase = "idle" | "running" | "done";
  const [phase, setPhase] = useState<Phase>("idle");
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(COMPETITION_TIME_LIMIT_SEC);
  const [summary, setSummary] = useState<SessionFinalizeSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lb = useSpellingLeaderboard(ageGroup);

  // 1Hz timer based on the server-issued startedAt — so a tab that
  // sleeps and wakes still shows the right elapsed time.
  useEffect(() => {
    if (phase !== "running" || !session.startedAt) return;
    const startMs = new Date(session.startedAt).getTime();
    const tick = () => {
      const sec = Math.max(0, Math.round((Date.now() - startMs) / 1000));
      setElapsed(sec);
      setTimeLeft(Math.max(0, COMPETITION_TIME_LIMIT_SEC - sec));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [phase, session.startedAt]);
  const start = async () => {
    setIdx(0);
    setGuess("");
    setCorrectCount(0);
    setElapsed(0);
    setTimeLeft(COMPETITION_TIME_LIMIT_SEC);
    setSummary(null);
    const ok = await session.start({
      mode: "competition",
      difficulty,
      count: 10,
      source: wordsSource
    });
    if (ok) setPhase("running");
  };
  const word = session.words[idx];
  const liveScore = liveCompetitionScore(correctCount, elapsed);

  // REMOVED auto-play during competition run — user taps play to hear the word.
  const submit = async () => {
    if (phase !== "running" || !word || submitting) return;
    const trimmed = guess.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const result = await session.attempt(idx, trimmed);
    setSubmitting(false);
    if (!result) return;
    if (result.correct) setCorrectCount(c => c + 1);
    setGuess("");
    const nextIdx = idx + 1;
    if (nextIdx >= session.words.length) {
      // End of run — server computes the final score from its own
      // attempt log and stamps duration from its own start timestamp.
      setPhase("done");
      const final = await session.finalize();
      if (final) {
        setSummary(final);
        if (final.accuracyPct >= 60) onCompetitionWin?.();
      }
    } else {
      setIdx(nextIdx);
    }
  };
  if (phase === "idle") {
    return <Card className="border-border dark:border-primary bg-gradient-to-br from-muted to-muted dark:from-primary/[0.06] dark:to-primary/[0.06] animate-in fade-in duration-200">
        <CardContent className="p-5 space-y-3 text-center">
          <Trophy className="h-10 w-10 mx-auto text-primary" />
          <p className="font-quicksand font-bold text-base text-foreground">
            {t("components.spelling_mastery.spelling_competition")}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            10 timed words · {formatCountdown(COMPETITION_TIME_LIMIT_SEC)} countdown · live score
          </p>
          <Button onClick={() => void start()} disabled={session.loading} className="bg-gradient-to-r from-primary to-primary text-white hover:from-primary hover:to-primary transition-all duration-200">
            {session.loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trophy className="h-4 w-4 mr-1" />}
            {t("components.spelling_mastery.start_competition")}
          </Button>
          {session.error && <p className="text-[11px] text-primary dark:text-primary">
              {t("components.spelling_mastery.couldn_t_start")} {session.error}
            </p>}
        </CardContent>
      </Card>;
  }
  if (phase === "done") {
    const rank = lb.rows.findIndex(r => r.score === (summary?.score ?? 0)) + 1;
    const rankLabel = rank > 0 ? `#${rank}` : "—";
    const starsEarned = Math.max(1, Math.round((summary?.accuracyPct ?? 0) / 20));
    return <Card className="border-border dark:border-primary bg-gradient-to-br from-muted to-muted dark:from-primary/[0.06] dark:to-primary/[0.06] animate-in fade-in zoom-in-95 duration-200">
        <CardContent className="p-5 space-y-3 text-center">
          <Trophy className="h-12 w-12 mx-auto text-primary" />
          <p className="font-quicksand font-extrabold text-lg text-foreground">
            Competition Complete!
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-md mx-auto">
            <Stat label="Rank" value={rankLabel} />
            <Stat label="Score" value={String(summary?.score ?? liveScore)} />
            <Stat label="Accuracy" value={`${summary?.accuracyPct ?? 0}%`} />
            <Stat label="Stars" value={`+${starsEarned}`} />
          </div>
          <div className="grid grid-cols-2 gap-2 max-w-md mx-auto text-xs text-muted-foreground">
            <span>Correct: {summary?.wordsCorrect ?? correctCount}/{summary?.wordsAttempted ?? session.words.length}</span>
            <span>Time: {summary?.durationSec ?? elapsed}s</span>
          </div>
          <Button onClick={() => void start()} className="bg-gradient-to-r from-primary to-primary text-white">
            {t("components.spelling_mastery.play_again")}
          </Button>
        </CardContent>
      </Card>;
  }

  // running
  if (!word) return null;
  return <Card className="border-border dark:border-primary animate-in fade-in duration-200">
      <CardContent className="p-4 space-y-4">
        <SessionProgressBar current={idx} total={session.words.length} />
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-muted dark:bg-card p-2 text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-bold">Word</p>
            <p className="font-quicksand font-extrabold text-primary">{idx + 1}/{session.words.length}</p>
          </div>
          <div className="rounded-lg bg-muted dark:bg-card p-2 text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-bold flex items-center justify-center gap-0.5"><Clock className="h-3 w-3" /> Time Left</p>
            <p className="font-mono font-bold text-foreground">{formatCountdown(timeLeft)}</p>
          </div>
          <div className="rounded-lg bg-muted dark:bg-card p-2 text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-bold">Score</p>
            <p className="font-quicksand font-extrabold text-primary">{liveScore}</p>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {t("components.spelling_mastery.listen_and_type_the_word_no_hints")}
        </p>
        <div className="flex justify-center">
          <PlayButtonsForUrl url={word.audioUrl} tts={tts} />
        </div>
        <Input value={guess} onChange={e => setGuess(e.target.value)} onKeyDown={e => {
        if (e.key === "Enter") void submit();
      }} placeholder={`Spell the word… (${word.letterCount} letters)`} autoFocus disabled={submitting} className="text-center text-xl font-quicksand font-bold tracking-wider h-12" />
        <Button onClick={() => void submit()} disabled={!guess.trim() || submitting} className="w-full bg-primary hover:bg-primary text-white">
          {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          {t("components.spelling_mastery.submit")}
        </Button>
      </CardContent>
    </Card>;
}

// ────────────────────────────────────────────────────────────────────────────
// TournamentView — 3-round elimination ladder (Easy → Medium → Hard)
// ────────────────────────────────────────────────────────────────────────────
//
// Phases:
//   idle      → not started; show overview + Start button
//   playing   → grading the active round's words (auto-played + typed)
//   between   → just finalized a round; show pass/fail banner + Continue
//   done      → terminal status (eliminated or completed)
//
// Round progression is server-owned (POST /tournaments/:t/advance). The
// difficulty + word count + pass thresholds are baked into
// TOURNAMENT_ROUND_CONFIG on the server — the client just plays whatever
// session it's handed.
function TournamentView({
  childId,
  ageGroup,
  totalStars,
  tts,
  onProgressUpdate
}: {
  childId: number;
  ageGroup: SpellingAgeGroup;
  totalStars: number;
  tts: ReturnType<typeof useSpellingTTS>;
  onProgressUpdate: (p: SpellingProgress) => void;
}) {
  const {
    t: tFn
  } = useTranslation();
  const t = useSpellingTournament(childId, ageGroup, onProgressUpdate);
  type Phase = "idle" | "playing" | "between" | "done";
  const [phase, setPhase] = useState<Phase>("idle");
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const start = async () => {
    setIdx(0);
    setGuess("");
    const ok = await t.start();
    if (ok) setPhase("playing");
  };

  const word = t.activeSession?.words[idx];
  // REMOVED auto-play during the round — user taps play to hear the word.
  const submit = async () => {
    if (phase !== "playing" || !word || submitting) return;
    const trimmed = guess.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const result = await t.attempt(idx, trimmed);
    setSubmitting(false);
    if (!result || !t.activeSession) return;
    setGuess("");
    const nextIdx = idx + 1;
    if (nextIdx >= t.activeSession.words.length) {
      // Round done — flip to "between" while we await the server's
      // verdict. The advance() call decides eliminated vs. next round.
      setPhase("between");
      setAdvancing(true);
      const updated = await t.advance();
      setAdvancing(false);
      setIdx(0);
      if (!updated || updated.status !== "active") {
        setPhase("done");
      }
    } else {
      setIdx(nextIdx);
    }
  };
  const continueAfterRound = () => {
    // After the inter-round banner, return to playing the next round.
    if (t.activeSession && t.tournament?.status === "active") {
      setPhase("playing");
    }
  };
  if (phase === "idle") {
    const activeLeagueIdx = TOURNAMENT_LEAGUES.reduce((best, league, i) => totalStars >= league.starsRequired ? i : best, 0);
    return <Card className="border-border dark:border-primary bg-gradient-to-br from-muted to-muted dark:from-primary/[0.06] dark:to-primary/[0.06] animate-in fade-in duration-200">
        <CardContent className="p-5 space-y-4 text-center">
          <Crown className="h-10 w-10 mx-auto text-primary" />
          <p className="font-quicksand font-bold text-base text-foreground">
            {tFn("components.spelling_mastery.spelling_tournament")}
          </p>
          <div className="space-y-2 text-left max-w-sm mx-auto">
            {TOURNAMENT_LEAGUES.map((league, i) => {
            const unlocked = totalStars >= league.starsRequired;
            const isActive = i === activeLeagueIdx && unlocked;
            const nextLeague = TOURNAMENT_LEAGUES[i + 1];
            return <div key={league.id} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 border transition-all duration-200", isActive ? "border-primary bg-primary/10" : "border-border dark:border-primary bg-white/70 dark:bg-white/[0.06]", !unlocked && "opacity-70")}>
                  <span className="text-lg">{league.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{league.label}</p>
                    {!unlocked ? <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Earn {league.starsRequired} stars to unlock {league.label}
                      </p> : nextLeague && totalStars < nextLeague.starsRequired ? <p className="text-[10px] text-muted-foreground">
                        {nextLeague.starsRequired - totalStars} stars to {nextLeague.label}
                      </p> : <p className="text-[10px] text-primary font-bold">Unlocked</p>}
                  </div>
                  {unlocked ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : <Lock className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>;
          })}
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {tFn("components.spelling_mastery.3_rounds")} <b>{tFn("components.spelling_mastery.easy_medium_hard")}</b>{tFn("components.spelling_mastery.get_at_least_3_of_5_in_each_round_to_advance_survive_all_3_t")}
          </p>
          <div className="flex justify-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-muted text-primary dark:bg-card dark:text-muted-foreground">{tFn("components.spelling_mastery.r1_easy")}</span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-primary dark:bg-card dark:text-muted-foreground">{tFn("components.spelling_mastery.r2_medium")}</span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-primary dark:bg-card dark:text-muted-foreground">{tFn("components.spelling_mastery.r3_hard")}</span>
          </div>
          <Button onClick={() => void start()} disabled={t.loading || totalStars < TOURNAMENT_LEAGUES[0].starsRequired} className="bg-gradient-to-r from-primary to-primary text-white hover:from-primary hover:to-primary transition-all duration-200">
            {t.loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Crown className="h-4 w-4 mr-1" />}
            {tFn("components.spelling_mastery.enter_tournament")}
          </Button>
          {t.error && <p className="text-[11px] text-primary dark:text-primary">
              {tFn("components.spelling_mastery.couldn_t_start_2")} {t.error}
            </p>}
        </CardContent>
      </Card>;
  }
  if (phase === "between") {
    const last = t.lastRound;
    return <Card className="border-border dark:border-primary bg-gradient-to-br from-muted to-muted dark:from-primary/[0.06] dark:to-primary/[0.06]">
        <CardContent className="p-5 space-y-3 text-center">
          {advancing || !last ? <>
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{tFn("components.spelling_mastery.tallying_round")}</p>
            </> : last.passed ? <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
              <p className="font-quicksand font-extrabold text-lg text-foreground">
                {tFn("components.spelling_mastery.round")} {last.round} {tFn("components.spelling_mastery.cleared")}
              </p>
              <p className="text-xs text-muted-foreground">
                {last.wordsCorrect} of {last.wordsAttempted} {tFn("components.spelling_mastery.correct")}{last.score} {tFn("components.spelling_mastery.points")}
              </p>
              {t.tournament?.status === "active" && <Button onClick={continueAfterRound} className="bg-gradient-to-r from-primary to-primary text-white">
                  {tFn("components.spelling_mastery.continue_to_round")} {t.tournament.currentRound} →
                </Button>}
            </> : <>
              <XCircle className="h-12 w-12 mx-auto text-primary" />
              <p className="font-quicksand font-extrabold text-lg text-foreground">
                {tFn("components.spelling_mastery.knocked_out_at_round")} {last.round}
              </p>
              <p className="text-xs text-muted-foreground">
                {tFn("components.spelling_mastery.needed_3_correct_got")} {last.wordsCorrect}{tFn("components.spelling_mastery.better_luck_next_time")}
              </p>
              <Button onClick={() => {
            setPhase("idle");
            t.reset();
          }} variant="outline">
                {tFn("components.spelling_mastery.try_again")}
              </Button>
            </>}
        </CardContent>
      </Card>;
  }
  if (phase === "done") {
    const tournament = t.tournament;
    const completed = tournament?.status === "completed";
    return <Card className="border-border dark:border-primary bg-gradient-to-br from-muted to-muted dark:from-primary/[0.06] dark:to-primary/[0.06]">
        <CardContent className="p-5 space-y-3 text-center">
          {completed ? <>
              <Trophy className="h-14 w-14 mx-auto text-primary" />
              <p className="font-quicksand font-extrabold text-xl text-foreground">
                {tFn("components.spelling_mastery.tournament_champion")}
              </p>
              <p className="text-xs text-muted-foreground">
                {tFn("components.spelling_mastery.all_3_rounds_cleared_total_score")}
              </p>
              <p className="font-quicksand font-extrabold text-3xl text-primary dark:text-muted-foreground">
                {tournament?.totalScore ?? 0}
              </p>
            </> : <>
              <XCircle className="h-12 w-12 mx-auto text-primary" />
              <p className="font-quicksand font-extrabold text-lg text-foreground">
                {tFn("components.spelling_mastery.eliminated_at_round")} {tournament?.eliminatedAtRound ?? "—"}
              </p>
            </>}
          {tournament?.rounds && tournament.rounds.length > 0 && <div className="space-y-1 max-w-sm mx-auto">
              {tournament.rounds.map(r => {
            return <div key={r.round} className="flex items-center justify-between text-xs rounded-md px-2 py-1 bg-white/70 dark:bg-white/[0.06]">
                  <span className="font-bold capitalize">
                    R{r.round} · {r.difficulty}
                  </span>
                  <span className="text-muted-foreground">
                    {r.wordsCorrect}/{r.wordsAttempted}
                  </span>
                  {r.passed ? <span className="text-primary font-bold">+{r.score}</span> : <span className="text-primary font-bold">{tFn("components.spelling_mastery.eliminated")}</span>}
                </div>;
          })}
            </div>}
          <Button onClick={() => {
          setPhase("idle");
          t.reset();
        }} className="bg-gradient-to-r from-primary to-primary text-white">
            {tFn("components.spelling_mastery.play_again_2")}
          </Button>
        </CardContent>
      </Card>;
  }

  // playing
  const session = t.activeSession;
  if (!session || !word) return null;
  return <Card className="border-border dark:border-primary">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-primary dark:text-muted-foreground capitalize">
            {tFn("components.spelling_mastery.round_2")} {session.round} of 3 · {session.difficulty}
          </span>
          <span className="font-mono">
            {idx + 1}/{session.words.length}
          </span>
          <span className="font-bold text-primary">
            ✓ {t.gradedIndices.size}
          </span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {tFn("components.spelling_mastery.listen_and_type_pass")} {session.passThreshold > 0 ? `${session.passThreshold} of ${session.words.length}` : "everything you can"} to {session.round < 3 ? "advance" : "win"}.
        </p>
        <div className="flex justify-center">
          <PlayButtonsForUrl url={word.audioUrl} tts={tts} />
        </div>
        <Input value={guess} onChange={e => setGuess(e.target.value)} onKeyDown={e => {
        if (e.key === "Enter") void submit();
      }} placeholder={`Spell the word… (${word.letterCount} letters)`} autoFocus disabled={submitting} className="text-center text-xl font-quicksand font-bold tracking-wider h-12" />
        <Button onClick={() => void submit()} disabled={!guess.trim() || submitting} className="w-full bg-gradient-to-r from-primary to-primary text-white">
          {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          {tFn("components.spelling_mastery.submit_2")}
        </Button>
      </CardContent>
    </Card>;
}

// ────────────────────────────────────────────────────────────────────────────
// BattleView — turn-based You vs AI
// ────────────────────────────────────────────────────────────────────────────
//
// Each word, the server returns BOTH the child's verdict AND the AI's
// pre-simulated result for that same index — so we can show a side-by-
// side scoreboard that updates word-by-word. Final score uses the same
// computeCompetitionScore formula on both sides; winner is whoever has
// the higher score (or "tie").
function BattleView({
  childId,
  ageGroup,
  difficulty,
  wordsSource,
  tts,
  onProgressUpdate
}: {
  childId: number;
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  wordsSource: "catalog" | "curated" | "ai";
  tts: ReturnType<typeof useSpellingTTS>;
  onProgressUpdate: (p: SpellingProgress) => void;
}) {
  const {
    t
  } = useTranslation();
  const session = useSpellingSession(childId, ageGroup, onProgressUpdate);
  type Phase = "idle" | "running" | "done";
  const [phase, setPhase] = useState<Phase>("idle");
  const [opponent, setOpponent] = useState<SpellingAiOpponent>("ai_medium");
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [youCorrect, setYouCorrect] = useState(0);
  const [aiCorrect, setAiCorrect] = useState(0);
  /** Per-word reveal: child + AI verdicts after submit, for the running tally. */
  const [reveals, setReveals] = useState<Array<{
    you: boolean;
    ai: {
      correct: boolean;
      ms: number;
    } | null;
  }>>([]);
  const [lastReveal, setLastReveal] = useState<{
    you: boolean;
    ai: boolean;
  } | null>(null);
  const [summary, setSummary] = useState<SessionFinalizeSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const start = async () => {
    setIdx(0);
    setGuess("");
    setYouCorrect(0);
    setAiCorrect(0);
    setReveals([]);
    setLastReveal(null);
    setSummary(null);
    const ok = await session.start({
      mode: "battle",
      difficulty,
      count: 5,
      source: wordsSource,
      opponent
    });
    if (ok) setPhase("running");
  };
  const word = session.words[idx];
  const stopTts = tts.stop;
  useEffect(() => {
    if (phase !== "running" || !word?.audioUrl) return;
    stopTts();
    const handle = setTimeout(() => void tts.playUrl(word.audioUrl), 250);
    return () => {
      clearTimeout(handle);
      stopTts();
    };
  }, [phase, idx, word?.audioUrl, stopTts, tts.playUrl]);
  const submit = async () => {
    if (phase !== "running" || !word || submitting) return;
    const trimmed = guess.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const result = await session.attempt(idx, trimmed);
    setSubmitting(false);
    if (!result) return;
    setReveals(prev => [...prev, {
      you: result.correct,
      ai: result.aiResult
    }]);
    setLastReveal({
      you: result.correct,
      ai: result.aiResult?.correct ?? false
    });
    if (result.correct) setYouCorrect(c => c + 1);
    if (result.aiResult?.correct) setAiCorrect(c => c + 1);
    setGuess("");
    const nextIdx = idx + 1;
    if (nextIdx >= session.words.length) {
      setPhase("done");
      const final = await session.finalize();
      if (final) setSummary(final);
    } else {
      setTimeout(() => {
        setLastReveal(null);
        setIdx(nextIdx);
      }, TRANSITION_MS + 100);
    }
  };
  if (phase === "idle") {
    return <Card className="border-border dark:border-primary bg-gradient-to-br from-muted to-muted dark:from-primary/[0.06] dark:to-primary/[0.06] animate-in fade-in duration-200">
        <CardContent className="p-5 space-y-4 text-center">
          <Swords className="h-10 w-10 mx-auto text-primary" />
          <div>
            <p className="font-quicksand font-bold text-base text-foreground">
              Battle vs Amy
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              5 words head-to-head. You spell, Amy answers too — highest score wins!
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Amy's difficulty
            </p>
            <div className="flex justify-center gap-1.5 flex-wrap">
              {(["ai_easy", "ai_medium", "ai_hard"] as const).map(op => <button key={op} onClick={() => setOpponent(op)} className={["px-3 py-1.5 rounded-full text-xs font-quicksand font-bold transition-all duration-200", opponent === op ? "bg-primary text-white shadow-md" : "bg-white/70 dark:bg-white/[0.06] text-foreground hover:bg-white"].join(" ")}>
                  {op === "ai_easy" ? "Easy Amy" : op === "ai_medium" ? "Amy" : "Hard Amy"}
                </button>)}
            </div>
          </div>
          <Button onClick={() => void start()} disabled={session.loading} className="bg-gradient-to-r from-primary to-primary text-white hover:from-primary hover:to-primary transition-all duration-200">
            {session.loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Swords className="h-4 w-4 mr-1" />}
            {t("components.spelling_mastery.start_battle")}
          </Button>
          {session.error && <p className="text-[11px] text-primary dark:text-primary">
              {t("components.spelling_mastery.couldn_t_start_3")} {session.error}
            </p>}
        </CardContent>
      </Card>;
  }
  if (phase === "done") {
    const winner = summary?.winner ?? null;
    const winnerLabel = winner === "you" ? "You won!" : winner === "ai" ? "Amy won!" : winner === "tie" ? "It's a tie!" : "All done";
    const winnerTint = winner === "you" ? "text-primary dark:text-primary" : winner === "ai" ? "text-primary dark:text-primary" : "text-primary dark:text-muted-foreground";
    return <Card className="border-border dark:border-primary bg-gradient-to-br from-muted to-muted dark:from-primary/[0.06] dark:to-primary/[0.06]">
        <CardContent className="p-5 space-y-3 text-center">
          {winner === "you" ? <Trophy className="h-12 w-12 mx-auto text-primary" /> : <Swords className="h-12 w-12 mx-auto text-primary" />}
          <p className={`font-quicksand font-extrabold text-xl ${winnerTint}`}>
            {winnerLabel}
          </p>
          <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
            <div className="rounded-lg bg-white/70 dark:bg-white/[0.06] p-3">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <UserIcon className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold">{t("components.spelling_mastery.you")}</span>
              </div>
              <div className="font-quicksand font-extrabold text-2xl text-primary dark:text-muted-foreground">
                {summary?.score ?? 0}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {summary?.wordsCorrect ?? youCorrect}/{summary?.wordsAttempted ?? session.words.length} · {summary?.durationSec ?? 0}s
              </div>
            </div>
            <div className="rounded-lg bg-white/70 dark:bg-white/[0.06] p-3">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold">Amy</span>
              </div>
              <div className="font-quicksand font-extrabold text-2xl text-primary dark:text-muted-foreground">
                {summary?.aiScore ?? 0}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {aiCorrect}/{session.words.length}
              </div>
            </div>
          </div>
          <Button onClick={() => void start()} className="bg-gradient-to-r from-primary to-primary text-white">
            {t("components.spelling_mastery.rematch")}
          </Button>
          <Button onClick={() => {
          setPhase("idle");
          session.reset();
        }} variant="outline" className="ml-2">
            {t("components.spelling_mastery.change_opponent")}
          </Button>
        </CardContent>
      </Card>;
  }

  // running
  if (!word) return null;
  return <Card className="border-border dark:border-primary animate-in fade-in duration-200">
      <CardContent className="p-4 space-y-4">
        <SessionProgressBar current={idx} total={session.words.length} />
        {/* Live scoreboard */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted dark:bg-card p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-primary dark:text-muted-foreground">
              <UserIcon className="h-3 w-3" /> You
            </div>
            <div className="font-quicksand font-extrabold text-xl text-primary dark:text-muted-foreground">
              {youCorrect}
            </div>
          </div>
          <div className="rounded-lg bg-muted dark:bg-card p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-primary dark:text-muted-foreground">
              <Bot className="h-3 w-3" /> Amy
            </div>
            <div className="font-quicksand font-extrabold text-xl text-primary dark:text-muted-foreground">
              {aiCorrect}
            </div>
          </div>
        </div>
        {lastReveal && <div className="flex justify-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <span className="text-sm font-bold">You {lastReveal.you ? "✅" : "❌"}</span>
            <span className="text-sm font-bold">Amy {lastReveal.ai ? "✅" : "❌"}</span>
          </div>}
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold">{t("components.spelling_mastery.word_3")} {idx + 1} of {session.words.length}</span>
          <span className="text-muted-foreground capitalize">{difficulty}</span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {t("components.spelling_mastery.listen_and_type_beat_the_bot")}
        </p>
        <div className="flex justify-center">
          <PlayButtonsForUrl url={word.audioUrl} tts={tts} />
        </div>
        <Input value={guess} onChange={e => setGuess(e.target.value)} onKeyDown={e => {
        if (e.key === "Enter") void submit();
      }} placeholder={`Spell the word… (${word.letterCount} letters)`} autoFocus disabled={submitting} className="text-center text-xl font-quicksand font-bold tracking-wider h-12" />
        <Button onClick={() => void submit()} disabled={!guess.trim() || submitting} className="w-full bg-gradient-to-r from-primary to-primary text-white">
          {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          {t("components.spelling_mastery.submit_3")}
        </Button>
        {/* Last-word reveal: small running list of who got what. */}
        {reveals.length > 0 && <div className="flex flex-wrap gap-1 justify-center pt-1">
            {reveals.map((r, i) => <span key={i} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-white/60 dark:bg-white/[0.06]">
                <span className="text-muted-foreground">#{i + 1}</span>
                <span className={r.you ? "text-primary" : "text-primary"}>
                  {r.you ? "✓" : "✗"}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className={r.ai?.correct ? "text-primary" : "text-primary"}>
                  {r.ai?.correct ? "✓" : "✗"}
                </span>
                {r.ai?.ms !== undefined && <span className="text-muted-foreground">{(r.ai.ms / 1000).toFixed(1)}s</span>}
              </span>)}
          </div>}
      </CardContent>
    </Card>;
}
function Stat({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return <div className="rounded-lg bg-white/70 dark:bg-white/[0.06] p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-quicksand font-bold text-sm text-foreground">{value}</p>
    </div>;
}

// ────────────────────────────────────────────────────────────────────────────
// Parent Mode — list of words for parent to read aloud, child answers
// ────────────────────────────────────────────────────────────────────────────
function ParentView({
  words,
  weeklyReport,
  collectionCounts,
  childName,
  tts,
  onAttempt
}: {
  words: SpellingWord[];
  weeklyReport: ReturnType<typeof buildWeeklyReport>;
  collectionCounts: { learning: number; practicing: number; mastered: number };
  childName: string;
  tts: ReturnType<typeof useSpellingTTS>;
  onAttempt: (correct: boolean, word: SpellingWord) => void;
}) {
  const {
    t
  } = useTranslation();
  const empty = words.length === 0;
  if (empty) return <EmptyOrLoading loading={false} empty={empty} emptyMsg="Load words above, then practice together in Parent Mode." actionLabel="Go to word picker" onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })} />;
  return <div className="space-y-3 animate-in fade-in duration-200">
      <ParentTrustSummary report={weeklyReport} collectionCounts={collectionCounts} childName={childName} />
      <WeeklyReportCard report={weeklyReport} childName={childName} />
      <Card className="border-border dark:border-primary">
        <CardContent className="p-4 space-y-3">
          <div className="text-center">
            <p className="font-quicksand font-bold text-foreground">
              {t("components.spelling_mastery.ask_your_child_to_spell_these_words")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("components.spelling_mastery.tap_to_hear_the_word_then_ask_your_child_mark_right_or_wrong")}
            </p>
          </div>
          <div className="space-y-2">
            {words.map(w => <ParentRow key={w.id} word={w} tts={tts} onAttempt={onAttempt} />)}
          </div>
        </CardContent>
      </Card>
    </div>;
}
function ParentRow({
  word,
  tts,
  onAttempt
}: {
  word: SpellingWord;
  tts: ReturnType<typeof useSpellingTTS>;
  onAttempt: (correct: boolean, word: SpellingWord) => void;
}) {
  const [marked, setMarked] = useState<"ok" | "bad" | null>(null);
  return <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted dark:bg-primary/[0.06] border border-border dark:border-primary">
      <button onClick={() => void tts.speak(word.word)} className="w-9 h-9 shrink-0 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary" aria-label={`Play ${word.word}`}>
        <Volume2 className="h-4 w-4" />
      </button>
      <button onClick={() => void tts.speak(word.word, {
      slow: true
    })} className="w-9 h-9 shrink-0 rounded-lg bg-muted dark:bg-card text-primary dark:text-muted-foreground flex items-center justify-center hover:bg-muted" aria-label={`Play ${word.word} slowly`}>
        <span className="text-base">🐢</span>
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-quicksand font-bold text-sm text-foreground capitalize">{word.word}</p>
        <p className="text-[11px] text-muted-foreground italic truncate">"{word.hint}"</p>
      </div>
      <Button size="sm" variant={marked === "ok" ? "default" : "outline"} onClick={() => {
      if (marked) return;
      setMarked("ok");
      onAttempt(true, word);
    }} disabled={!!marked} className={marked === "ok" ? "bg-primary hover:bg-primary text-white" : ""}>
        ✓
      </Button>
      <Button size="sm" variant={marked === "bad" ? "default" : "outline"} onClick={() => {
      if (marked) return;
      setMarked("bad");
      onAttempt(false, word);
    }} disabled={!!marked} className={marked === "bad" ? "bg-primary hover:bg-primary text-white" : ""}>
        ✗
      </Button>
    </div>;
}

// ────────────────────────────────────────────────────────────────────────────
// Always-visible family leaderboard for the active age group
// ────────────────────────────────────────────────────────────────────────────
function LeaderboardPanel({
  ageGroup
}: {
  ageGroup: SpellingAgeGroup;
}) {
  const {
    t
  } = useTranslation();
  const lb = useSpellingLeaderboard(ageGroup);
  return <Card className="border-border dark:border-primary">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-4 w-4 text-primary" />
          <p className="font-quicksand font-bold text-sm text-foreground">
            {t("components.spelling_mastery.family_leaderboard")} {ageGroup}
          </p>
        </div>
        {lb.loading ? <p className="text-xs text-muted-foreground text-center py-2">
            <Loader2 className="h-3.5 w-3.5 mx-auto animate-spin" />
          </p> : lb.rows.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">
            No scores yet — complete a Competition to claim the top spot!
          </p> : <ol className="space-y-1">
            {lb.rows.map((r, i) => <li key={r.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-muted dark:bg-primary/[0.06]">
                <span className="w-5 text-primary dark:text-muted-foreground font-bold">
                  {i + 1}.
                </span>
                <span className="flex-1 truncate font-bold text-foreground">
                  {r.childName ?? "—"}
                </span>
                <span className="text-muted-foreground">
                  {r.wordsCorrect}/{r.wordsAttempted}
                </span>
                <span className="text-muted-foreground">{r.accuracyPct}%</span>
                <span className="text-muted-foreground">{r.durationSec}s</span>
                <span className="font-quicksand font-extrabold text-primary dark:text-muted-foreground">
                  {r.score}
                </span>
              </li>)}
          </ol>}
      </CardContent>
    </Card>;
}