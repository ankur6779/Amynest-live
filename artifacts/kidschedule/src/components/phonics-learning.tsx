import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Target, Lightbulb, ChevronDown, ChevronUp, CheckCircle2,
  RefreshCw, BookOpen, Trophy, AlertCircle,
} from "lucide-react";
import { AudioPlayButton, preloadAmyVoice } from "@/components/audio-play-button";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  getPhonicsLevel,
  type PhonicsLevel,
  type PhonicsItem,
} from "@/lib/phonics-content";
import { cn } from "@/lib/utils";

// ─── Per-child progress (localStorage) ───────────────────────────────────────

type PhonicsProgress = {
  /** itemId → number of times Played */
  practiced: Record<string, number>;
  /** itemId → "got it" toggled by parent ("yes, my child knows this") */
  mastered: Record<string, true>;
  lastPracticedAt?: number;
};

const EMPTY_PROGRESS: PhonicsProgress = { practiced: {}, mastered: {} };

function progressKey(childId: number | string, ageGroup: string) {
  return `amynest_phonics_${childId}_${ageGroup}`;
}

function loadProgress(childId: number | string, ageGroup: string): PhonicsProgress {
  try {
    const raw = localStorage.getItem(progressKey(childId, ageGroup));
    if (!raw) return { ...EMPTY_PROGRESS };
    const parsed = JSON.parse(raw);
    return {
      practiced: parsed.practiced ?? {},
      mastered:  parsed.mastered  ?? {},
      lastPracticedAt: parsed.lastPracticedAt,
    };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

function saveProgress(childId: number | string, ageGroup: string, p: PhonicsProgress) {
  try {
    localStorage.setItem(progressKey(childId, ageGroup), JSON.stringify(p));
  } catch {}
}

// ─── Today's Activity (deterministic daily rotation) ─────────────────────────

function getTodaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function pickTodaysItem(items: PhonicsItem[], tick = 0): PhonicsItem {
  // Tick lets the parent press "another sound" and rotate without losing the
  // daily-deterministic baseline (tick=0 always returns today's pick).
  return items[(getTodaySeed() + tick) % items.length];
}

// ─── Rule-based AI insights from progress data ───────────────────────────────

type Insight = { tone: "good" | "warn" | "info"; emoji: string; text: string };

function buildInsights(level: PhonicsLevel, progress: PhonicsProgress): Insight[] {
  const ins: Insight[] = [];
  const items = level.items;
  const playedIds = Object.keys(progress.practiced);
  const masteredIds = Object.keys(progress.mastered);
  const totalPlays = Object.values(progress.practiced).reduce((a, b) => a + b, 0);

  // Empty state
  if (playedIds.length === 0) {
    ins.push({
      tone: "info",
      emoji: "✨",
      text: `Tap any sound below to begin — ${level.shortLabel} is the perfect level for your child right now.`,
    });
    return ins;
  }

  // Coverage
  const coveragePct = Math.round((playedIds.length / items.length) * 100);
  if (coveragePct >= 80) {
    ins.push({
      tone: "good",
      emoji: "🎉",
      text: `Strong coverage! Practised ${playedIds.length}/${items.length} sounds (${coveragePct}%). Time to introduce the next level soon.`,
    });
  } else if (coveragePct >= 40) {
    const unseen = items.filter((i) => !progress.practiced[i.id]);
    const next = unseen.slice(0, 3).map((i) => i.symbol).join(", ");
    ins.push({
      tone: "info",
      emoji: "🎯",
      text: `Halfway there! Try these next: ${next}.`,
    });
  } else {
    ins.push({
      tone: "info",
      emoji: "🌱",
      text: `Just getting started — practise the same 2–3 sounds for a week before adding new ones.`,
    });
  }

  // Mastery
  if (masteredIds.length >= 3) {
    ins.push({
      tone: "good",
      emoji: "🌟",
      text: `${masteredIds.length} sound${masteredIds.length !== 1 ? "s" : ""} marked mastered — celebrate the win with your child!`,
    });
  }

  // Repetition warning — sounds played a lot but never marked mastered
  const stuck = items.filter((i) => (progress.practiced[i.id] ?? 0) >= 5 && !progress.mastered[i.id]);
  if (stuck.length > 0) {
    const list = stuck.slice(0, 3).map((i) => i.symbol).join(", ");
    ins.push({
      tone: "warn",
      emoji: "🔁",
      text: `Needs more repetition: ${list}. Try pairing each sound with the picture and a hand action.`,
    });
  }

  // Streak / engagement
  if (totalPlays >= 20) {
    ins.push({
      tone: "good",
      emoji: "💪",
      text: `${totalPlays} total practice plays — consistent practice is exactly how phonics sticks.`,
    });
  }

  return ins;
}

// ─── Main component ──────────────────────────────────────────────────────────

interface PhonicsLearningProps {
  childId: number | string;
  childName: string;
  totalAgeMonths: number;
}

export function PhonicsLearning({ childId, childName, totalAgeMonths }: PhonicsLearningProps) {
  const level = useMemo(() => getPhonicsLevel(totalAgeMonths), [totalAgeMonths]);

  // Out-of-range fallback
  if (!level) {
    return (
      <Card className="rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
        <CardContent className="p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Phonics is for ages 1–6</p>
            <p className="text-sm text-muted-foreground mt-1">
              {childName} is {totalAgeMonths < 12 ? "still building sound awareness through everyday talk" : "ready for chapter books — phonics is no longer the focus"}.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <PersonalizationBadge level={level} childName={childName} />
      <TodaysActivityCard level={level} childId={childId} />
      <PracticeSoundsCard level={level} childId={childId} />
      <ProgressTrackerCard level={level} childId={childId} />
      <ParentTipsCard level={level} childId={childId} />
    </div>
  );
}

// ─── Personalization banner — shows the parent the level is age-targeted ────

function PersonalizationBadge({ level, childName }: { level: PhonicsLevel; childName: string }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-fuchsia-100/40 dark:via-fuchsia-500/10 to-violet-100/40 dark:to-violet-500/10 border border-primary/20 px-4 py-3 flex items-center gap-3">
      <span className="text-2xl">{level.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-primary/15 text-primary border-primary/30 font-bold text-[10px]">
            <Sparkles className="h-3 w-3 mr-1" /> Personalised for {childName}
          </Badge>
        </div>
        <p className="text-sm font-bold text-foreground mt-1 truncate">{level.label}</p>
        <p className="text-xs text-muted-foreground truncate">{level.description}</p>
      </div>
    </div>
  );
}

// ─── Card 1: Today's Activity ────────────────────────────────────────────────

function TodaysActivityCard({ level, childId }: { level: PhonicsLevel; childId: number | string }) {
  const authFetch = useAuthFetch();
  const [tick, setTick] = useState(0); // for refresh
  const [progress, setProgress] = useState<PhonicsProgress>(() => loadProgress(childId, level.ageGroup));
  const todaysItem = useMemo(() => pickTodaysItem(level.items, tick), [level.ageGroup, level.items, tick]);

  useEffect(() => {
    setProgress(loadProgress(childId, level.ageGroup));
  }, [childId, level.ageGroup]);

  // Warm the TTS cache for today's sound — first tap then plays instantly.
  useEffect(() => {
    const ctrl = new AbortController();
    void preloadAmyVoice(authFetch, todaysItem.sound, { signal: ctrl.signal });
    return () => ctrl.abort();
  }, [authFetch, todaysItem.sound]);

  const recordPlay = useCallback(() => {
    setProgress((p) => {
      const next: PhonicsProgress = {
        ...p,
        practiced: { ...p.practiced, [todaysItem.id]: (p.practiced[todaysItem.id] ?? 0) + 1 },
        lastPracticedAt: Date.now(),
      };
      saveProgress(childId, level.ageGroup, next);
      return next;
    });
  }, [childId, level.ageGroup, todaysItem.id]);

  const toggleMastered = useCallback(() => {
    setProgress((p) => {
      const isMastered = !!p.mastered[todaysItem.id];
      const hasPlayed = (p.practiced[todaysItem.id] ?? 0) > 0;
      // Don't let a parent mark a sound mastered before the child has heard
      // it once — this keeps the accuracy metric meaningful.
      if (!isMastered && !hasPlayed) return p;
      const nextMastered = { ...p.mastered };
      if (isMastered) delete nextMastered[todaysItem.id];
      else nextMastered[todaysItem.id] = true;
      const next: PhonicsProgress = { ...p, mastered: nextMastered };
      saveProgress(childId, level.ageGroup, next);
      return next;
    });
  }, [childId, level.ageGroup, todaysItem.id]);

  const playCount = progress.practiced[todaysItem.id] ?? 0;
  const isMastered = !!progress.mastered[todaysItem.id];
  const canMaster = playCount > 0 || isMastered;

  return (
    <Card
      data-testid="phonics-todays-activity"
      className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]"
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-violet-100 dark:bg-violet-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
            <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-base font-bold text-foreground">Today's Activity</h3>
            <p className="text-xs text-muted-foreground">{level.focus}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setTick((t) => t + 1)}
            aria-label="Pick another sound"
            className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-primary"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Big focus tile */}
        <div className="rounded-3xl bg-gradient-to-br from-violet-50 dark:from-violet-500/15 to-fuchsia-50 dark:to-fuchsia-500/15 border border-violet-200/60 dark:border-violet-400/20 p-5 flex items-center gap-4">
          {todaysItem.emoji && <span className="text-5xl shrink-0" aria-hidden>{todaysItem.emoji}</span>}
          <div className="flex-1 min-w-0">
            <p className="font-quicksand text-3xl font-bold text-foreground leading-none mb-1">{todaysItem.symbol}</p>
            {todaysItem.example && (
              <p className="text-xs text-muted-foreground">{todaysItem.example}</p>
            )}
          </div>
          <AudioPlayButton
            text={todaysItem.sound}
            size="lg"
            variant="violet"
            ariaLabel={`Play sound ${todaysItem.symbol}`}
            onPlay={recordPlay}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {playCount > 0 ? `Played ${playCount} time${playCount !== 1 ? "s" : ""}` : "Not practised yet"}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleMastered}
            disabled={!canMaster}
            title={canMaster ? undefined : "Play the sound at least once first"}
            className={cn(
              "rounded-full h-8 px-3 text-xs font-bold border",
              isMastered
                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border-emerald-300"
                : "bg-white/70 dark:bg-white/[0.06] text-foreground border-border hover:border-emerald-300 hover:text-emerald-700",
              !canMaster && "opacity-50 cursor-not-allowed hover:border-border hover:text-foreground",
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            {isMastered ? "Mastered!" : "Mark mastered"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Card 2: Practice Sounds ─────────────────────────────────────────────────

function PracticeSoundsCard({ level, childId }: { level: PhonicsLevel; childId: number | string }) {
  const authFetch = useAuthFetch();
  const [progress, setProgress] = useState<PhonicsProgress>(() => loadProgress(childId, level.ageGroup));
  const [blendItem, setBlendItem] = useState<PhonicsItem | null>(null);

  useEffect(() => {
    setProgress(loadProgress(childId, level.ageGroup));
  }, [childId, level.ageGroup]);

  // Preload the first batch of sounds so the first taps are instant. We
  // sequentialise to avoid stampeding the TTS server with N parallel calls.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      for (const it of level.items.slice(0, 6)) {
        if (ctrl.signal.aborted) return;
        await preloadAmyVoice(authFetch, it.sound, { signal: ctrl.signal });
      }
    })();
    return () => ctrl.abort();
  }, [authFetch, level.items]);

  const recordPlay = (id: string) => {
    setProgress((p) => {
      const next: PhonicsProgress = {
        ...p,
        practiced: { ...p.practiced, [id]: (p.practiced[id] ?? 0) + 1 },
        lastPracticedAt: Date.now(),
      };
      saveProgress(childId, level.ageGroup, next);
      return next;
    });
  };

  const useGrid = !level.features.sentenceReading; // letters use grid; sentences use list

  return (
    <Card
      data-testid="phonics-practice-sounds"
      className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]"
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-fuchsia-100 dark:bg-fuchsia-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
            <BookOpen className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-base font-bold text-foreground">Practice Sounds</h3>
            <p className="text-xs text-muted-foreground">Tap any tile to hear the sound</p>
          </div>
          <Badge className="bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-200 border-0 text-[10px] font-bold">
            {level.items.length} sounds
          </Badge>
        </div>

        {useGrid ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {level.items.map((it) => {
              const count = progress.practiced[it.id] ?? 0;
              const mastered = !!progress.mastered[it.id];
              return (
                <div
                  key={it.id}
                  data-testid={`phonics-tile-${it.id}`}
                  className={cn(
                    "relative rounded-2xl p-3 border bg-white/70 dark:bg-white/[0.05] transition-all",
                    mastered
                      ? "border-emerald-300 dark:border-emerald-400/40 ring-1 ring-emerald-300/50"
                      : "border-white/60 dark:border-white/10 hover:border-primary/30",
                  )}
                >
                  {mastered && (
                    <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-emerald-500 fill-emerald-100" />
                  )}
                  <div className="flex items-center gap-2">
                    {it.emoji && <span className="text-2xl shrink-0">{it.emoji}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="font-quicksand text-lg font-bold text-foreground leading-tight">{it.symbol}</p>
                      {it.example && (
                        <p className="text-[10px] text-muted-foreground truncate">{it.example}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <AudioPlayButton
                      text={it.sound}
                      size="sm"
                      variant="violet"
                      ariaLabel={`Play sound ${it.symbol}`}
                      onPlay={() => recordPlay(it.id)}
                    />
                    {level.features.blending && it.example?.includes("–") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setBlendItem(it)}
                        className="rounded-full h-7 px-2.5 text-[10px] font-bold border-violet-300 text-violet-700 dark:text-violet-200 hover:bg-violet-50 dark:hover:bg-violet-500/15"
                      >
                        Blend
                      </Button>
                    )}
                    {count > 0 && (
                      <span className="text-[10px] text-muted-foreground font-medium">{count}×</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {level.items.map((it) => {
              const count = progress.practiced[it.id] ?? 0;
              const mastered = !!progress.mastered[it.id];
              return (
                <div
                  key={it.id}
                  data-testid={`phonics-tile-${it.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 border bg-white/70 dark:bg-white/[0.05] transition-all",
                    mastered
                      ? "border-emerald-300 dark:border-emerald-400/40"
                      : "border-white/60 dark:border-white/10 hover:border-primary/30",
                  )}
                >
                  {it.emoji && <span className="text-xl shrink-0">{it.emoji}</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug">{it.symbol}</p>
                    {it.example && (
                      <p className="text-[10px] text-muted-foreground">{it.example}{count > 0 ? ` · played ${count}×` : ""}</p>
                    )}
                  </div>
                  {mastered && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  <AudioPlayButton
                    text={it.sound}
                    size="sm"
                    variant="violet"
                    ariaLabel={`Read aloud: ${it.symbol}`}
                    onPlay={() => recordPlay(it.id)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {blendItem && (
          <BlendPanel item={blendItem} onClose={() => setBlendItem(null)} onPlay={() => recordPlay(blendItem.id)} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Blend panel — shown for 3+ when user taps "Blend" ───────────────────────

function BlendPanel({ item, onClose, onPlay }: { item: PhonicsItem; onClose: () => void; onPlay: () => void }) {
  const sounds = (item.example ?? item.symbol).split("–").map((s) => s.trim()).filter(Boolean);

  return (
    <div
      role="dialog"
      aria-label={`Blend ${item.symbol}`}
      className="mt-4 rounded-2xl border border-violet-300 dark:border-violet-400/30 bg-violet-50/80 dark:bg-violet-500/15 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-violet-900 dark:text-violet-100">Blend it together</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 w-7 p-0 rounded-full text-violet-700 dark:text-violet-200"
          aria-label="Close blend panel"
        >
          ×
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
        {sounds.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="rounded-xl bg-white dark:bg-white/[0.08] border border-violet-200 dark:border-violet-400/30 px-3 py-2 flex items-center gap-2">
              <span className="font-quicksand text-xl font-bold text-violet-700 dark:text-violet-200">{s}</span>
              <AudioPlayButton text={`${s}.`} size="sm" variant="violet" ariaLabel={`Play ${s}`} />
            </div>
            {i < sounds.length - 1 && <span className="text-violet-400 text-xl">+</span>}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 pt-3 border-t border-violet-200 dark:border-violet-400/30">
        <span className="text-2xl">→</span>
        <div className="flex items-center gap-2">
          {item.emoji && <span className="text-2xl">{item.emoji}</span>}
          <span className="font-quicksand text-2xl font-bold text-foreground">{item.symbol}</span>
        </div>
        <AudioPlayButton text={item.sound} size="md" variant="violet" ariaLabel={`Play whole word ${item.symbol}`} onPlay={onPlay} />
      </div>
    </div>
  );
}

// ─── Card 3: Progress Tracker ────────────────────────────────────────────────

function ProgressTrackerCard({ level, childId }: { level: PhonicsLevel; childId: number | string }) {
  const [progress, setProgress] = useState<PhonicsProgress>(() => loadProgress(childId, level.ageGroup));

  useEffect(() => {
    setProgress(loadProgress(childId, level.ageGroup));
    // Re-read on storage events (other tabs / cards in same page write directly)
    const onStorage = (e: StorageEvent) => {
      if (e.key === progressKey(childId, level.ageGroup)) {
        setProgress(loadProgress(childId, level.ageGroup));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [childId, level.ageGroup]);

  // Light polling — local writes don't fire storage events
  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress(loadProgress(childId, level.ageGroup));
    }, 1500);
    return () => window.clearInterval(id);
  }, [childId, level.ageGroup]);

  const totalItems = level.items.length;
  const practicedCount = Object.keys(progress.practiced).length;
  // Only count mastered items that the child has actually played at least once,
  // otherwise accuracy can exceed 100% (e.g. 1 played, 2 marked mastered).
  const masteredFromPlayed = Object.keys(progress.mastered).filter(
    (id) => (progress.practiced[id] ?? 0) > 0,
  ).length;
  const masteredCount = Object.keys(progress.mastered).length;
  const totalPlays = Object.values(progress.practiced).reduce((a, b) => a + b, 0);
  const completionPct = Math.min(100, Math.round((masteredCount / totalItems) * 100));
  const accuracyPct = practicedCount > 0
    ? Math.min(100, Math.round((masteredFromPlayed / practicedCount) * 100))
    : 0;

  return (
    <Card
      data-testid="phonics-progress"
      className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]"
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
            <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-base font-bold text-foreground">Progress Tracker</h3>
            <p className="text-xs text-muted-foreground">{level.shortLabel} • saved on this device</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="Practised" value={`${practicedCount}/${totalItems}`} />
          <Stat label="Accuracy" value={`${accuracyPct}%`} sub={practicedCount === 0 ? "no data" : undefined} />
          <Stat label="Total plays" value={`${totalPlays}`} />
        </div>

        {/* Completion bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-foreground">Mastery</span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{completionPct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-emerald-100/60 dark:bg-emerald-500/15 overflow-hidden border border-emerald-200/60 dark:border-emerald-400/20">
            <div
              data-testid="phonics-mastery-bar"
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {masteredCount === 0
              ? "Tap 'Mark mastered' on a sound your child knows confidently."
              : `${masteredCount} of ${totalItems} mastered • keep going!`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white/70 dark:bg-white/[0.05] border border-white/60 dark:border-white/10 px-3 py-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{label}</p>
      <p className="font-quicksand text-lg font-bold text-foreground leading-tight">{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Card 4: Parent Tips (with rule-based AI insights) ──────────────────────

function ParentTipsCard({ level, childId }: { level: PhonicsLevel; childId: number | string }) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<PhonicsProgress>(() => loadProgress(childId, level.ageGroup));

  useEffect(() => {
    setProgress(loadProgress(childId, level.ageGroup));
    const id = window.setInterval(() => setProgress(loadProgress(childId, level.ageGroup)), 1500);
    return () => window.clearInterval(id);
  }, [childId, level.ageGroup]);

  const insights = useMemo(() => buildInsights(level, progress), [level, progress]);

  return (
    <Card
      data-testid="phonics-parent-tips"
      className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]"
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
            <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-base font-bold text-foreground">Parent Tips & Insights</h3>
            <p className="text-xs text-muted-foreground">Personalised to your child's progress</p>
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-2 mb-4">
          {insights.map((ins, i) => (
            <div
              key={i}
              data-testid={`phonics-insight-${ins.tone}`}
              className={cn(
                "rounded-2xl border px-3 py-2.5 flex items-start gap-2.5",
                ins.tone === "good" && "bg-emerald-50/80 dark:bg-emerald-500/15 border-emerald-200/60 dark:border-emerald-400/30",
                ins.tone === "warn" && "bg-amber-50/80 dark:bg-amber-500/15 border-amber-200/60 dark:border-amber-400/30",
                ins.tone === "info" && "bg-violet-50/80 dark:bg-violet-500/15 border-violet-200/60 dark:border-violet-400/30",
              )}
            >
              <span className="text-lg shrink-0" aria-hidden>{ins.emoji}</span>
              <p className={cn(
                "text-xs leading-relaxed font-medium",
                ins.tone === "good" && "text-emerald-900 dark:text-emerald-100",
                ins.tone === "warn" && "text-amber-900 dark:text-amber-100",
                ins.tone === "info" && "text-violet-900 dark:text-violet-100",
              )}>
                {ins.text}
              </p>
            </div>
          ))}
        </div>

        {/* Static tips list — collapsible */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between rounded-2xl px-3 py-2 bg-white/40 dark:bg-white/[0.03] border border-white/50 dark:border-white/10 hover:bg-white/60 transition-colors"
          aria-expanded={open}
        >
          <span className="text-xs font-bold text-foreground flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            How to teach {level.shortLabel} ({level.parentTips.length} tips)
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {open && (
          <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {level.parentTips.map((tip, i) => (
              <div key={i} className="rounded-xl bg-white/70 dark:bg-white/[0.05] border border-white/60 dark:border-white/10 px-3 py-2 flex items-start gap-2">
                <span className="text-xs font-bold text-primary shrink-0 mt-0.5">{i + 1}.</span>
                <p className="text-xs text-foreground leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
