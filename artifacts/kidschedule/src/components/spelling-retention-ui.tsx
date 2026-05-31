import { BookMarked, Flame, Gift, Sparkles, Star, Target, Trophy, UserCheck, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  RETENTION_ACHIEVEMENTS,
  STREAK_MILESTONES,
  LEVEL_UNLOCKS,
  OVERLAY_CELEBRATION_TYPES,
  type RetentionAchievementId,
  type RetentionCelebration,
  type SpellingRetentionState,
  getRecommendedWords,
  buildWeeklyReport,
} from "@/hooks/use-spelling-retention";
import type { SpellingAgeGroup, SpellingDifficulty, SpellingWord, UseSpellingTTSState } from "@/hooks/use-spelling";

const DELIGHT_MS = 400;

export function RetentionCelebrationOverlay({
  celebrations,
  onDismiss,
}: {
  celebrations: RetentionCelebration[];
  onDismiss: (id: string) => void;
}) {
  const top = celebrations.find((c) => OVERLAY_CELEBRATION_TYPES.has(c.type));
  if (!top) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-200"
      onClick={() => onDismiss(top.id)}
    >
      <div
        className={cn(
          "relative max-w-sm w-full rounded-2xl bg-gradient-to-br from-primary/95 to-primary p-6 text-center text-white shadow-xl",
          top.type === "level_up" ? "animate-in zoom-in-95 duration-300" : "animate-in zoom-in-95 duration-200",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onDismiss(top.id)}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="font-quicksand font-extrabold text-2xl">{top.title}</p>
        {top.subtitle && <p className="mt-2 text-sm text-white/90">{top.subtitle}</p>}
        <Button
          size="sm"
          variant="secondary"
          className="mt-4"
          onClick={() => onDismiss(top.id)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

export function DailyGoalCard({
  current,
  target,
  done,
  reward,
  progressPct,
  onStartLearn,
}: {
  current: number;
  target: number;
  done: boolean;
  reward: number;
  progressPct: number;
  onStartLearn?: () => void;
}) {
  return (
    <Card className="border-border dark:border-primary bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-primary/[0.08] dark:to-primary/[0.04]">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <p className="font-quicksand font-bold text-sm text-foreground">Today&apos;s Goal</p>
          </div>
          {done && (
            <Badge className="bg-primary text-white animate-in zoom-in-95 duration-200">
              Done! +{reward} ⭐
            </Badge>
          )}
        </div>
        <p className="text-lg font-quicksand font-extrabold text-primary">
          {Math.min(current, target)} / {target} words
        </p>
        <div className="h-2 rounded-full bg-muted dark:bg-card overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Gift className="h-3 w-3" /> Reward: +{reward} stars
        </p>
        {!done && current === 0 && onStartLearn && (
          <Button size="sm" className="w-full mt-1" onClick={onStartLearn}>
            Start learning — earn your stars!
          </Button>
        )}
        {done && (
          <p className="text-xs font-bold text-primary animate-in fade-in duration-200">
            🎉 Daily goal complete! Great work today!
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function StreakCard({
  streak,
  atRisk,
  milestones,
  onStartSession,
}: {
  streak: number;
  atRisk: boolean;
  milestones: number[];
  onStartSession?: () => void;
}) {
  return (
    <Card className="border-border dark:border-primary">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Flame className={cn("h-4 w-4", streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
          <p className="font-quicksand font-bold text-sm">
            {streak > 0 ? `${streak} Day Streak` : "Start Your Streak"}
          </p>
        </div>
        {atRisk && streak > 0 && (
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium animate-pulse">
            Complete 1 session today to keep your streak.
          </p>
        )}
        {streak === 0 && (
          <p className="text-xs text-muted-foreground">
            Complete a learn session today to begin your streak!
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {STREAK_MILESTONES.map((m) => {
            const hit = milestones.includes(m) || streak >= m;
            return (
              <span
                key={m}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold",
                  hit ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {hit ? "✓" : "○"} {m}d
              </span>
            );
          })}
        </div>
        {atRisk && onStartSession && (
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={onStartSession}>
            Keep streak alive →
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function WordCollectionBook({
  collection,
  counts,
}: {
  collection: SpellingRetentionState["collection"];
  counts: { learning: number; practicing: number; mastered: number; total: number };
}) {
  const sections = [
    { key: "learning" as const, label: "Learning", emoji: "📖", items: collection.learning },
    { key: "practicing" as const, label: "Practicing", emoji: "✏️", items: collection.practicing },
    { key: "mastered" as const, label: "Mastered", emoji: "⭐", items: collection.mastered },
  ];

  if (counts.total === 0) {
    return (
      <Card className="border-border dark:border-primary border-dashed">
        <CardContent className="p-4 text-center space-y-2">
          <BookMarked className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="font-quicksand font-bold text-sm">My Word Collection</p>
          <p className="text-xs text-muted-foreground">
            Your collection is empty — learn 5 words to start filling your book!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border dark:border-primary">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-quicksand font-bold text-sm flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-primary" /> My Word Collection
          </p>
          <Badge variant="outline" className="text-[10px]">{counts.total} total</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {sections.map((s) => (
            <div key={s.key} className="rounded-lg bg-muted/60 dark:bg-card p-2">
              <p className="text-lg">{s.emoji}</p>
              <p className="text-[10px] uppercase text-muted-foreground font-bold">{s.label}</p>
              <p className="font-quicksand font-extrabold text-primary">{counts[s.key]}</p>
            </div>
          ))}
        </div>
        {sections.map((s) =>
          s.items.length > 0 ? (
            <div key={s.key}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                {s.label}
              </p>
              <div className="flex flex-wrap gap-1">
                {s.items.slice(0, 8).map((w) => (
                  <span
                    key={w.id}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-white/70 dark:bg-white/[0.06] font-bold capitalize"
                  >
                    {w.word}
                  </span>
                ))}
                {s.items.length > 8 && (
                  <span className="text-[11px] text-muted-foreground self-center">
                    +{s.items.length - 8} more
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p key={s.key} className="text-[11px] text-muted-foreground italic">
              No words in {s.label.toLowerCase()} yet — keep going!
            </p>
          ),
        )}
      </CardContent>
    </Card>
  );
}

export function AchievementCabinet({
  unlocked,
}: {
  unlocked: Record<string, string>;
}) {
  const ids = Object.keys(RETENTION_ACHIEVEMENTS) as RetentionAchievementId[];

  return (
    <Card className="border-border dark:border-primary">
      <CardContent className="p-3 space-y-2">
        <p className="font-quicksand font-bold text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" /> Badge Cabinet
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ids.map((id) => {
            const meta = RETENTION_ACHIEVEMENTS[id];
            const has = !!unlocked[id];
            return (
              <div
                key={id}
                title={meta.desc}
                className={cn(
                  "rounded-xl p-2 text-center border transition-all duration-200",
                  has
                    ? "bg-primary/10 border-primary/30 animate-in fade-in duration-200"
                    : "bg-muted/40 border-transparent opacity-60",
                )}
              >
                <span className="text-2xl">{has ? meta.emoji : "🔒"}</span>
                <p className="text-[10px] font-bold mt-1 leading-tight">{meta.label}</p>
              </div>
            );
          })}
        </div>
        {Object.keys(unlocked).length === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Earn badges by learning words, keeping streaks, and winning competitions!
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function SmartRecommendationsCard({
  weakSound,
  ageGroup,
  difficulty,
  tts,
  onPracticeWord,
}: {
  weakSound: string | null;
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  tts: UseSpellingTTSState;
  onPracticeWord?: (word: SpellingWord) => void;
}) {
  if (!weakSound) {
    return (
      <Card className="border-border dark:border-primary border-dashed">
        <CardContent className="p-3 text-center text-xs text-muted-foreground">
          <Sparkles className="h-5 w-5 mx-auto mb-1 text-primary" />
          Keep practicing — Amy will recommend words once she spots a tricky sound.
        </CardContent>
      </Card>
    );
  }

  const recommended = getRecommendedWords(ageGroup, difficulty, weakSound, 4);

  return (
    <Card className="border-border dark:border-primary bg-gradient-to-br from-muted to-muted dark:from-primary/[0.06] dark:to-transparent">
      <CardContent className="p-3 space-y-2">
        <p className="font-quicksand font-bold text-sm">Practice Recommendation</p>
        <p className="text-xs text-muted-foreground">
          You struggle with <span className="font-bold text-primary">&quot;{weakSound}&quot;</span>
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Recommended</p>
        <div className="flex flex-wrap gap-1.5">
          {recommended.length > 0 ? (
            recommended.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  void tts.speak(w.word);
                  onPracticeWord?.(w);
                }}
                className="px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-bold capitalize hover:opacity-90 transition-opacity duration-150"
              >
                {w.word}
              </button>
            ))
          ) : (
            ["chair", "cheese", "school", "beach"].map((w) => (
              <span key={w} className="px-2.5 py-1 rounded-lg bg-muted text-xs font-bold capitalize">
                {w}
              </span>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function WeeklyReportCard({
  report,
  childName,
}: {
  report: ReturnType<typeof buildWeeklyReport>;
  childName: string;
}) {
  const empty = report.wordsLearned === 0 && report.daysActive === 0;

  if (empty) {
    return (
      <Card className="border-border dark:border-primary">
        <CardContent className="p-4 text-center space-y-2">
          <BookMarked className="h-8 w-8 mx-auto text-primary opacity-80" />
          <p className="font-quicksand font-bold text-sm">Weekly Report for {childName}</p>
          <p className="text-xs text-muted-foreground">
            No spelling activity this week yet. A short daily session builds strong habits!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border dark:border-primary bg-gradient-to-br from-muted to-muted dark:from-primary/[0.06] dark:to-transparent">
      <CardContent className="p-4 space-y-3">
        <p className="font-quicksand font-bold text-foreground">Weekly Report — {childName}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MiniStat label="Words Learned" value={String(report.wordsLearned)} />
          <MiniStat label="Accuracy" value={`${report.accuracy}%`} />
          <MiniStat label="Stars Earned" value={String(report.starsEarned)} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-white/70 dark:bg-white/[0.06] p-2">
            <p className="text-[10px] uppercase text-muted-foreground font-bold">Strong Sound</p>
            <p className="font-bold text-primary">{report.strongSound ? `"${report.strongSound}"` : "—"}</p>
          </div>
          <div className="rounded-lg bg-white/70 dark:bg-white/[0.06] p-2">
            <p className="text-[10px] uppercase text-muted-foreground font-bold">Weak Sound</p>
            <p className="font-bold text-primary">{report.weakSound ? `"${report.weakSound}"` : "—"}</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Active {report.daysActive} of the last 7 days — {report.weakSound ? `focus on "${report.weakSound}" sounds together.` : "great consistency!"}
        </p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 dark:bg-white/[0.06] p-2 text-center">
      <p className="text-[10px] uppercase text-muted-foreground font-bold">{label}</p>
      <p className="font-quicksand font-extrabold text-primary">{value}</p>
    </div>
  );
}

/** At-a-glance parent dashboard — answers learn / struggle / improve in ~5 seconds. */
export function ParentTrustSummary({
  report,
  collectionCounts,
  childName,
}: {
  report: ReturnType<typeof buildWeeklyReport>;
  collectionCounts: { learning: number; practicing: number; mastered: number };
  childName: string;
}) {
  const improving =
    report.accuracy >= 70
      ? "On track"
      : report.wordsLearned > 0
        ? "Building skills"
        : "Just getting started";
  const improvingDetail =
    report.accuracy >= 70
      ? `${report.accuracy}% accuracy this week`
      : report.daysActive >= 3
        ? `${report.daysActive} active days — keep the rhythm!`
        : "Short daily sessions add up fast";

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/[0.08] to-primary/[0.03]">
      <CardContent className="p-4 space-y-3">
        <p className="font-quicksand font-bold text-sm text-foreground flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          {childName}&apos;s Progress at a Glance
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/80 dark:bg-white/[0.06] p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">What they learned</p>
            <p className="font-quicksand font-extrabold text-lg text-primary">{report.wordsLearned} words</p>
            <p className="text-[11px] text-muted-foreground">
              {collectionCounts.mastered} mastered · {collectionCounts.practicing} practicing
            </p>
          </div>
          <div className="rounded-xl bg-white/80 dark:bg-white/[0.06] p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">What to focus on</p>
            <p className="font-quicksand font-extrabold text-lg text-primary">
              {report.weakSound ? `"${report.weakSound}"` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {report.weakSound ? "Tricky sound — practice together" : "No weak spots flagged yet"}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 dark:bg-white/[0.06] p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Are they improving?</p>
            <p className="font-quicksand font-extrabold text-lg text-primary">{improving}</p>
            <p className="text-[11px] text-muted-foreground">{improvingDetail}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NextStepBanner({
  dailyDone,
  dailyCurrent,
  dailyTarget,
  level,
  starsToNextLevel,
  onGoLearn,
}: {
  dailyDone: boolean;
  dailyCurrent: number;
  dailyTarget: number;
  level: number;
  starsToNextLevel: number;
  onGoLearn: () => void;
}) {
  const nextUnlockEntry = Object.entries(LEVEL_UNLOCKS)
    .map(([lvl, label]) => ({ level: Number(lvl), label }))
    .find((u) => u.level > level);

  return (
    <Card className="border-primary/30 bg-primary/[0.04]">
      <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs space-y-0.5">
          {!dailyDone ? (
            <>
              <p className="font-bold text-foreground flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-primary" /> Next: Learn {dailyTarget - dailyCurrent} more word{dailyTarget - dailyCurrent === 1 ? "" : "s"} today
              </p>
              <p className="text-muted-foreground">Earn +10 bonus stars when you hit today&apos;s goal.</p>
            </>
          ) : (
            <>
              <p className="font-bold text-foreground">Today&apos;s goal done — keep your streak!</p>
              <p className="text-muted-foreground">
                {starsToNextLevel} stars until Level {level + 1}
                {nextUnlockEntry ? ` · unlocks ${nextUnlockEntry.label}` : ""}
              </p>
            </>
          )}
        </div>
        {!dailyDone && (
          <Button size="sm" onClick={onGoLearn} className="shrink-0">
            Learn now →
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export { DELIGHT_MS };
