import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Target, Lightbulb, ChevronDown, ChevronUp, CheckCircle2,
  RefreshCw, BookOpen, Trophy, AlertCircle, Loader2, Download, FileText,
} from "lucide-react";
import { AudioPlayButton, preloadAmyVoice } from "@/components/audio-play-button";
import { PhonicsTest } from "@/components/phonics-test";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  usePhonicsData,
  type DisplayPhonicsItem,
  type PhonicsInsight,
  type PhonicsProgressMap,
} from "@/hooks/use-phonics-data";
import { type PhonicsLevel } from "@/lib/phonics-content";
import { cn } from "@/lib/utils";

// ─── Today's Activity helpers ────────────────────────────────────────────────

function getTodaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function pickTodaysItem(
  items: DisplayPhonicsItem[],
  tick = 0,
): DisplayPhonicsItem | null {
  if (items.length === 0) return null;
  return items[(getTodaySeed() + tick) % items.length] ?? null;
}

// ─── Local insight builder (used only when API insights aren't available) ────

function buildLocalInsights(
  items: DisplayPhonicsItem[],
  progress: PhonicsProgressMap,
  shortLabel: string,
): PhonicsInsight[] {
  const ins: PhonicsInsight[] = [];
  const playedIds = Object.keys(progress.practiced);
  const masteredIds = Object.keys(progress.mastered);
  const totalPlays = Object.values(progress.practiced).reduce((a, b) => a + b, 0);

  if (playedIds.length === 0) {
    ins.push({
      tone: "info",
      emoji: "✨",
      text: `Tap any sound below to begin — ${shortLabel} is the perfect level for your child right now.`,
    });
    return ins;
  }

  const coveragePct =
    items.length > 0 ? Math.round((playedIds.length / items.length) * 100) : 0;
  if (coveragePct >= 80) {
    ins.push({
      tone: "good",
      emoji: "🎉",
      text: `Strong coverage! Practised ${playedIds.length}/${items.length} sounds (${coveragePct}%). Time to introduce the next level soon.`,
    });
  } else if (coveragePct >= 40) {
    const unseen = items.filter((i) => !progress.practiced[i.id]);
    const next = unseen.slice(0, 3).map((i) => i.symbol).join(", ");
    if (next) {
      ins.push({
        tone: "info",
        emoji: "🎯",
        text: `Halfway there! Try these next: ${next}.`,
      });
    }
  } else {
    ins.push({
      tone: "info",
      emoji: "🌱",
      text: `Just getting started — practise the same 2–3 sounds for a week before adding new ones.`,
    });
  }

  if (masteredIds.length >= 3) {
    ins.push({
      tone: "good",
      emoji: "🌟",
      text: `${masteredIds.length} sound${masteredIds.length !== 1 ? "s" : ""} marked mastered — celebrate the win with your child!`,
    });
  }

  const stuck = items.filter(
    (i) => (progress.practiced[i.id] ?? 0) >= 5 && !progress.mastered[i.id],
  );
  if (stuck.length > 0) {
    const list = stuck.slice(0, 3).map((i) => i.symbol).join(", ");
    ins.push({
      tone: "warn",
      emoji: "🔁",
      text: `Needs more repetition: ${list}. Try pairing each sound with the picture and a hand action.`,
    });
  }

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

export function PhonicsLearning({
  childId,
  childName,
  totalAgeMonths,
}: PhonicsLearningProps) {
  const data = usePhonicsData(childId, totalAgeMonths);
  const { level, loading, items, dailyItems, progress, insights, recordPlay, toggleMastered } = data;

  // Out-of-range fallback
  if (!level) {
    return (
      <Card className="rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
        <CardContent className="p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Phonics is for ages 1–6</p>
            <p className="text-sm text-muted-foreground mt-1">
              {childName}{" "}
              {totalAgeMonths < 12
                ? "is still building sound awareness through everyday talk"
                : "is ready for chapter books — phonics is no longer the focus"}
              .
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial loading skeleton
  if (loading && items.length === 0) {
    return (
      <Card className="rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
        <CardContent className="p-8 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading phonics for {childName}…</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <PersonalizationBadge level={level} childName={childName} />
      <PhonicsTest
        childId={childId}
        childName={childName}
        totalAgeMonths={totalAgeMonths}
      />
      <PhonicsDownloadCard childId={childId} />
      <TodaysActivityCard
        level={level}
        dailyItems={dailyItems.length > 0 ? dailyItems : items}
        progress={progress}
        recordPlay={recordPlay}
        toggleMastered={toggleMastered}
      />
      <PracticeSoundsCard
        level={level}
        items={items}
        progress={progress}
        recordPlay={recordPlay}
      />
      <ProgressTrackerCard
        level={level}
        items={items}
        progress={progress}
        sourceLabel={data.source === "api" ? "synced to your account" : "saved on this device"}
      />
      <ParentTipsCard
        level={level}
        items={items}
        progress={progress}
        insights={insights}
      />
    </div>
  );
}

// ─── Personalization banner ──────────────────────────────────────────────────

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

function TodaysActivityCard({
  level,
  dailyItems,
  progress,
  recordPlay,
  toggleMastered,
}: {
  level: PhonicsLevel;
  dailyItems: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  recordPlay: (id: string, contentId?: number) => void;
  toggleMastered: (id: string, contentId?: number) => void;
}) {
  const authFetch = useAuthFetch();
  const [tick, setTick] = useState(0);
  const todaysItem = useMemo(
    () => pickTodaysItem(dailyItems, tick),
    [dailyItems, tick],
  );

  // Warm the TTS cache for today's sound — first tap then plays instantly.
  useEffect(() => {
    if (!todaysItem) return;
    const ctrl = new AbortController();
    void preloadAmyVoice(authFetch, todaysItem.sound, { signal: ctrl.signal });
    return () => ctrl.abort();
  }, [authFetch, todaysItem?.sound]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!todaysItem) return null;

  const playCount = progress.practiced[todaysItem.id] ?? 0;
  const isMastered = !!progress.mastered[todaysItem.id];
  const canMaster = playCount > 0 || isMastered;

  // ── Type-aware focus tile rendering ─────────────────────────────────────
  const isLongForm =
    todaysItem.type === "sentence" || todaysItem.type === "story";

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
            <p className="text-xs text-muted-foreground">
              {todaysItem.type === "story" ? "Story time" : level.focus}
            </p>
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

        {/* Focus tile — taller layout for sentences/stories */}
        <div
          className={cn(
            "rounded-3xl bg-gradient-to-br from-violet-50 dark:from-violet-500/15 to-fuchsia-50 dark:to-fuchsia-500/15 border border-violet-200/60 dark:border-violet-400/20 p-5",
            isLongForm
              ? "flex flex-col items-start gap-4"
              : "flex items-center gap-4",
          )}
        >
          {todaysItem.emoji && (
            <span
              className={isLongForm ? "text-4xl" : "text-5xl shrink-0"}
              aria-hidden
            >
              {todaysItem.emoji}
            </span>
          )}
          <div className="flex-1 min-w-0 w-full">
            <p
              className={cn(
                "font-quicksand font-bold text-foreground leading-tight",
                isLongForm ? "text-xl mb-2" : "text-3xl leading-none mb-1",
              )}
            >
              {todaysItem.symbol}
            </p>
            {todaysItem.example && (
              <p className="text-xs text-muted-foreground">{todaysItem.example}</p>
            )}
          </div>
          <AudioPlayButton
            text={todaysItem.sound}
            size="lg"
            variant="violet"
            ariaLabel={`Play sound ${todaysItem.symbol}`}
            onPlay={() => recordPlay(todaysItem.id, todaysItem.contentId)}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {playCount > 0
              ? `Played ${playCount} time${playCount !== 1 ? "s" : ""}`
              : "Not practised yet"}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => toggleMastered(todaysItem.id, todaysItem.contentId)}
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

function PracticeSoundsCard({
  level,
  items,
  progress,
  recordPlay,
}: {
  level: PhonicsLevel;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  recordPlay: (id: string, contentId?: number) => void;
}) {
  const authFetch = useAuthFetch();
  const [blendItem, setBlendItem] = useState<DisplayPhonicsItem | null>(null);

  // Preload the first batch of sounds so the first taps are instant.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      for (const it of items.slice(0, 6)) {
        if (ctrl.signal.aborted) return;
        await preloadAmyVoice(authFetch, it.sound, { signal: ctrl.signal });
      }
    })();
    return () => ctrl.abort();
  }, [authFetch, items]);

  // Type-driven layout: items that are long-form (sentences/stories) get a
  // list layout with full-width text; everything else uses the tile grid.
  const hasLongForm = items.some(
    (i) => i.type === "sentence" || i.type === "story",
  );
  const useGrid = !hasLongForm && !level.features.sentenceReading;

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
            {items.length} {items.length === 1 ? "sound" : "sounds"}
          </Badge>
        </div>

        {useGrid ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {items.map((it) => {
              const count = progress.practiced[it.id] ?? 0;
              const mastered = !!progress.mastered[it.id];
              const showBlend =
                level.features.blending && it.example?.includes("–");
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
                      onPlay={() => recordPlay(it.id, it.contentId)}
                    />
                    {showBlend && (
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
            {items.map((it) => {
              const count = progress.practiced[it.id] ?? 0;
              const mastered = !!progress.mastered[it.id];
              const isLong = it.type === "sentence" || it.type === "story";
              return (
                <div
                  key={it.id}
                  data-testid={`phonics-tile-${it.id}`}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl p-3 border bg-white/70 dark:bg-white/[0.05] transition-all",
                    mastered
                      ? "border-emerald-300 dark:border-emerald-400/40"
                      : "border-white/60 dark:border-white/10 hover:border-primary/30",
                  )}
                >
                  {it.emoji && <span className="text-xl shrink-0">{it.emoji}</span>}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-semibold text-foreground leading-snug",
                        isLong ? "text-sm" : "text-sm",
                      )}
                    >
                      {it.symbol}
                    </p>
                    {it.example && (
                      <p className="text-[10px] text-muted-foreground">
                        {it.example}
                        {count > 0 ? ` · played ${count}×` : ""}
                      </p>
                    )}
                  </div>
                  {mastered && <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1" />}
                  <AudioPlayButton
                    text={it.sound}
                    size="sm"
                    variant="violet"
                    ariaLabel={`Read aloud: ${it.symbol}`}
                    onPlay={() => recordPlay(it.id, it.contentId)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {blendItem && (
          <BlendPanel
            item={blendItem}
            onClose={() => setBlendItem(null)}
            onPlay={() => recordPlay(blendItem.id, blendItem.contentId)}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Blend panel ─────────────────────────────────────────────────────────────

function BlendPanel({
  item,
  onClose,
  onPlay,
}: {
  item: DisplayPhonicsItem;
  onClose: () => void;
  onPlay: () => void;
}) {
  const sounds = (item.example ?? item.symbol)
    .split("–")
    .map((s) => s.trim())
    .filter(Boolean);

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

function ProgressTrackerCard({
  level,
  items,
  progress,
  sourceLabel,
}: {
  level: PhonicsLevel;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  sourceLabel: string;
}) {
  const totalItems = Math.max(items.length, 1);
  const validIds = new Set(items.map((i) => i.id));
  const practicedCount = Object.keys(progress.practiced).filter((id) =>
    validIds.has(id),
  ).length;
  const masteredFromPlayed = Object.keys(progress.mastered).filter(
    (id) => validIds.has(id) && (progress.practiced[id] ?? 0) > 0,
  ).length;
  const masteredCount = Object.keys(progress.mastered).filter((id) =>
    validIds.has(id),
  ).length;
  const totalPlays = Object.entries(progress.practiced).reduce(
    (sum, [id, n]) => (validIds.has(id) ? sum + n : sum),
    0,
  );
  const completionPct = Math.min(
    100,
    Math.round((masteredCount / totalItems) * 100),
  );
  const accuracyPct =
    practicedCount > 0
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
            <p className="text-xs text-muted-foreground">{level.shortLabel} • {sourceLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="Practised" value={`${practicedCount}/${items.length}`} />
          <Stat
            label="Accuracy"
            value={`${accuracyPct}%`}
            sub={practicedCount === 0 ? "no data" : undefined}
          />
          <Stat label="Total plays" value={`${totalPlays}`} />
        </div>

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
              : `${masteredCount} of ${items.length} mastered • keep going!`}
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

// ─── Card 4: Parent Tips ─────────────────────────────────────────────────────

function ParentTipsCard({
  level,
  items,
  progress,
  insights,
}: {
  level: PhonicsLevel;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  insights: PhonicsInsight[] | null;
}) {
  const [open, setOpen] = useState(false);

  // Prefer server-built insights (richer + cached) — fall back to local rules.
  const display = useMemo(
    () =>
      insights && insights.length > 0
        ? insights
        : buildLocalInsights(items, progress, level.shortLabel),
    [insights, items, progress, level.shortLabel],
  );

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

        <div className="space-y-2 mb-4">
          {display.map((ins, i) => (
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

// ─── Card 0: Download printable workbook (PDF) ───────────────────────────────

const PHONICS_PDF = {
  fileKey: "phonics-mastery-15-sets",
  fileName: "Phonics-Mastery-15-Sets.pdf",
  url: "/phonics-mastery-15-sets.pdf",
} as const;

function PhonicsDownloadCard({ childId }: { childId: number | string }) {
  const numericChildId =
    typeof childId === "number"
      ? childId
      : Number.isFinite(Number(childId))
        ? Number(childId)
        : null;
  const authFetch = useAuthFetch();
  const [downloading, setDownloading] = useState(false);
  const [downloadCount, setDownloadCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hydrate the historical count once on mount so the badge isn't blank.
  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      try {
        const res = await authFetch("/api/phonics/downloads", {
          method: "GET",
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok?: boolean;
          downloads?: Array<{ fileKey: string; count: number }>;
        };
        const row = data.downloads?.find((d) => d.fileKey === PHONICS_PDF.fileKey);
        if (row) setDownloadCount(row.count);
      } catch {
        // Silent — historical count is nice-to-have, not blocking.
      }
    })();
    return () => ctrl.abort();
  }, [authFetch]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setError(null);

    // Strict requirement: every download MUST be saved to the DB. So we
    // log first and only trigger the browser download if logging succeeds.
    // The badge count is server-authoritative — never incremented on
    // failure — so it always reflects what's actually in the DB.
    try {
      const res = await authFetch("/api/phonics/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKey: PHONICS_PDF.fileKey,
          ...(numericChildId !== null ? { childId: numericChildId } : {}),
        }),
      });
      if (!res.ok) {
        setError(
          res.status === 401
            ? "Please sign in again to download."
            : "Couldn't record your download. Please try again.",
        );
        setDownloading(false);
        return;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        totalDownloads?: number;
      };
      if (typeof data.totalDownloads === "number") {
        setDownloadCount(data.totalDownloads);
      }

      // Logging confirmed — now trigger the browser download.
      const a = document.createElement("a");
      a.href = PHONICS_PDF.url;
      a.download = PHONICS_PDF.fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card
      data-testid="phonics-download-card"
      className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]"
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-fuchsia-100 dark:bg-fuchsia-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
            <FileText className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-base font-bold text-foreground">
              Phonics Mastery — Printable Workbook
            </h3>
            <p className="text-xs text-muted-foreground">
              15 sets covering short vowels, blends, digraphs & more
            </p>
          </div>
          {downloadCount !== null && downloadCount > 0 && (
            <Badge
              data-testid="phonics-download-count"
              className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-200/80 dark:border-emerald-400/30 font-bold text-[10px] shrink-0"
            >
              {downloadCount}× downloaded
            </Badge>
          )}
        </div>

        <Button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          data-testid="phonics-download-button"
          className="w-full rounded-2xl gap-2 font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-md disabled:opacity-70"
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing download…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download PDF (free, unlimited re-downloads)
            </>
          )}
        </Button>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
