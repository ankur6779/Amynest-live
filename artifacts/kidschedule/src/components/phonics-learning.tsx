import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, Lightbulb, ChevronDown, ChevronUp, CheckCircle2, RefreshCw, BookOpen, Trophy, AlertCircle, Loader2, Download, FileText } from "lucide-react";
import { AudioPlayButton, preloadAmyVoice } from "@/components/audio-play-button";
import { PhonicsTest } from "@/components/phonics-test";
import { SubItemGate } from "@/components/sub-item-gate";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  usePhonicsData,
  type DisplayPhonicsItem,
  type PhonicsInsight,
  type PhonicsProgressMap,
} from "@/hooks/use-phonics-data";
import {
  PHONICS_LEVELS,
  type PhonicsAgeGroup,
  type PhonicsLevel,
} from "@/lib/phonics-content";
import { cn } from "@/lib/utils";

const PHONICS_STAGE_ORDER: PhonicsAgeGroup[] = [
  "12_24m",
  "2_3y",
  "3_4y",
  "4_5y",
  "5_6y",
];

// ─── Today's Activity helpers ────────────────────────────────────────────────
import { useTranslation } from "react-i18next";
function getTodaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function pickTodaysItem(items: DisplayPhonicsItem[], tick = 0): DisplayPhonicsItem | null {
  if (items.length === 0) return null;
  return items[(getTodaySeed() + tick) % items.length] ?? null;
}

// ─── Local insight builder (used only when API insights aren't available) ────

function buildLocalInsights(items: DisplayPhonicsItem[], progress: PhonicsProgressMap, shortLabel: string): PhonicsInsight[] {
  const ins: PhonicsInsight[] = [];
  const playedIds = Object.keys(progress.practiced);
  const masteredIds = Object.keys(progress.mastered);
  const totalPlays = Object.values(progress.practiced).reduce((a, b) => a + b, 0);
  if (playedIds.length === 0) {
    ins.push({
      tone: "info",
      emoji: "✨",
      text: `Tap any sound below to begin — ${shortLabel} is the perfect level for your child right now.`
    });
    return ins;
  }
  const coveragePct = items.length > 0 ? Math.round(playedIds.length / items.length * 100) : 0;
  if (coveragePct >= 80) {
    ins.push({
      tone: "good",
      emoji: "🎉",
      text: `Strong coverage! Practised ${playedIds.length}/${items.length} sounds (${coveragePct}%). Time to introduce the next level soon.`
    });
  } else if (coveragePct >= 40) {
    const unseen = items.filter(i => !progress.practiced[i.id]);
    const next = unseen.slice(0, 3).map(i => i.symbol).join(", ");
    if (next) {
      ins.push({
        tone: "info",
        emoji: "🎯",
        text: `Halfway there! Try these next: ${next}.`
      });
    }
  } else {
    ins.push({
      tone: "info",
      emoji: "🌱",
      text: `Just getting started — practise the same 2–3 sounds for a week before adding new ones.`
    });
  }
  if (masteredIds.length >= 3) {
    ins.push({
      tone: "good",
      emoji: "🌟",
      text: `${masteredIds.length} sound${masteredIds.length !== 1 ? "s" : ""} marked mastered — celebrate the win with your child!`
    });
  }
  const stuck = items.filter(i => (progress.practiced[i.id] ?? 0) >= 5 && !progress.mastered[i.id]);
  if (stuck.length > 0) {
    const list = stuck.slice(0, 3).map(i => i.symbol).join(", ");
    ins.push({
      tone: "warn",
      emoji: "🔁",
      text: `Needs more repetition: ${list}. Try pairing each sound with the picture and a hand action.`
    });
  }
  if (totalPlays >= 20) {
    ins.push({
      tone: "good",
      emoji: "💪",
      text: `${totalPlays} total practice plays — consistent practice is exactly how phonics sticks.`
    });
  }
  return ins;
}

// ─── ExampleChips: small horizontal row of example words for a letter ────────
//
// Renders ["Ball","Bat","Banana"] as compact rounded chips so the child sees
// multiple words that start with the sound, not just one. Sized "sm" for
// tile use and "md" for the larger Today's Focus card.

function ExampleChips({
  words,
  size
}: {
  words: string[];
  size: "sm" | "md";
}) {
  if (words.length === 0) return null;
  const chipCls = size === "md" ? "px-2 py-0.5 text-[11px]" : "px-1.5 py-[1px] text-[10px]";
  return <div className="mt-1 flex flex-wrap gap-1" data-testid="phonics-example-chips">
      {words.map(w => <span key={w} className={cn("inline-flex items-center rounded-full bg-muted dark:bg-card text-primary dark:text-muted-foreground font-medium border border-border dark:border-border", chipCls)}>
          {w}
        </span>)}
    </div>;
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
  totalAgeMonths
}: PhonicsLearningProps) {
  const {
    t
  } = useTranslation();
  // Stage selector — parents asked to browse ALL 5 stages, not just the
  // child's age-derived default. `null` means "use my child's natural stage";
  // any other value is a manual override the API + hook respect.
  const [stageOverride, setStageOverride] = useState<PhonicsAgeGroup | null>(
    null,
  );
  // Reset the override whenever the parent switches to a different child —
  // otherwise stage stickiness leaks across siblings (architect flag).
  useEffect(() => {
    setStageOverride(null);
  }, [childId]);
  const data = usePhonicsData(childId, totalAgeMonths, stageOverride);
  const {
    level,
    defaultLevel,
    loading,
    items,
    dailyItems,
    progress,
    insights,
    recordPlay,
    toggleMastered,
  } = data;

  // Out-of-range fallback
  if (!level) {
    return <Card className="rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
        <CardContent className="p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">{t("components.phonics_learning.phonics_is_for_ages_1_6")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {childName}{" "}
              {totalAgeMonths < 12 ? "is still building sound awareness through everyday talk" : "is ready for chapter books — phonics is no longer the focus"}
              .
            </p>
          </div>
        </CardContent>
      </Card>;
  }

  // Initial loading skeleton
  if (loading && items.length === 0) {
    return <Card className="rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
        <CardContent className="p-8 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("components.phonics_learning.loading_phonics_for")} {childName}…</span>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-4">
      <PersonalizationBadge level={level} childName={childName} />
      <StageSelector
        active={level.ageGroup}
        defaultStage={defaultLevel?.ageGroup ?? null}
        onSelect={(g) => {
          // Tapping the child's natural stage clears the override so the URL
          // (and any future deep-link) behaves predictably.
          setStageOverride(g === defaultLevel?.ageGroup ? null : g);
        }}
      />
      <SubItemGate sectionId="hub_phonics" subItemId="phonics_test">
        <PhonicsTest childId={childId} childName={childName} totalAgeMonths={totalAgeMonths} />
      </SubItemGate>
      <SubItemGate sectionId="hub_phonics" subItemId="phonics_download">
        <PhonicsDownloadCard childId={childId} />
      </SubItemGate>
      <SubItemGate sectionId="hub_phonics" subItemId="phonics_todays_activity">
        <TodaysActivityCard level={level} dailyItems={dailyItems.length > 0 ? dailyItems : items} progress={progress} recordPlay={recordPlay} toggleMastered={toggleMastered} />
      </SubItemGate>
      <SubItemGate sectionId="hub_phonics" subItemId="phonics_practice_sounds">
        <PracticeSoundsCard level={level} items={items} progress={progress} recordPlay={recordPlay} />
      </SubItemGate>
      <SubItemGate sectionId="hub_phonics" subItemId="phonics_progress">
        <ProgressTrackerCard level={level} items={items} progress={progress} sourceLabel={data.source === "api" ? "synced to your account" : "saved on this device"} />
      </SubItemGate>
      <SubItemGate sectionId="hub_phonics" subItemId="phonics_parent_tips">
        <ParentTipsCard level={level} items={items} progress={progress} insights={insights} />
      </SubItemGate>
    </div>;
}

// ─── Stage selector — horizontal scroll across all 5 phonics stages ─────────
//
// Renders a pill row of every stage. The child's natural (age-derived) stage
// is highlighted with a "Yours" pip; the currently-active stage (which may
// be an override) gets the filled style. Parents can tap any pill to
// preview that stage's content; the API + hook honour the override.

function StageSelector({
  active,
  defaultStage,
  onSelect,
}: {
  active: PhonicsAgeGroup;
  defaultStage: PhonicsAgeGroup | null;
  onSelect: (g: PhonicsAgeGroup) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin"
      role="tablist"
      aria-label={t("components.phonics_learning.phonics_stage")}
      data-testid="phonics-stage-selector"
    >
      {PHONICS_STAGE_ORDER.map((g) => {
        const lvl = PHONICS_LEVELS[g];
        const isActive = g === active;
        const isDefault = g === defaultStage;
        return (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={`phonics-stage-pill-${g}`}
            onClick={() => onSelect(g)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-foreground/80 border-border hover:border-primary/40 hover:bg-primary/5",
            )}
          >
            <span aria-hidden="true">{lvl.emoji}</span>
            <span>{lvl.shortLabel}</span>
            {isDefault && (
              <span
                className={cn(
                  "ml-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                Yours
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Personalization banner ──────────────────────────────────────────────────

function PersonalizationBadge({
  level,
  childName
}: {
  level: PhonicsLevel;
  childName: string;
}) {
  const {
    t
  } = useTranslation();
  return <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-muted dark:via-card to-muted dark:to-card border border-primary/20 px-4 py-3 flex items-center gap-3">
      <span className="text-2xl">{level.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-primary/15 text-primary border-primary/30 font-bold text-[10px]">
            <Sparkles className="h-3 w-3 mr-1" /> {t("components.phonics_learning.personalised_for")} {childName}
          </Badge>
        </div>
        <p className="text-sm font-bold text-foreground mt-1 truncate">{level.label}</p>
        <p className="text-xs text-muted-foreground truncate">{level.description}</p>
      </div>
    </div>;
}

// ─── Card 1: Today's Activity ────────────────────────────────────────────────

function TodaysActivityCard({
  level,
  dailyItems,
  progress,
  recordPlay,
  toggleMastered
}: {
  level: PhonicsLevel;
  dailyItems: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  recordPlay: (id: string, contentId?: number) => void;
  toggleMastered: (id: string, contentId?: number) => void;
}) {
  const {
    t
  } = useTranslation();
  const authFetch = useAuthFetch();
  const [tick, setTick] = useState(0);
  const todaysItem = useMemo(() => pickTodaysItem(dailyItems, tick), [dailyItems, tick]);

  // Warm the TTS cache for today's sound — first tap then plays instantly.
  // For letter tiles we warm the bare phoneme in phonics mode (matches what
  // the Play button will actually request); for everything else we warm the
  // verbose `sound` line in default mode.
  useEffect(() => {
    if (!todaysItem) return;
    const ctrl = new AbortController();
    const useTts = todaysItem.phoneme ?? todaysItem.sound;
    const useMode: "phonics" | undefined = todaysItem.phoneme ? "phonics" : undefined;
    void preloadAmyVoice(authFetch, useTts, {
      mode: useMode,
      signal: ctrl.signal
    });
    return () => ctrl.abort();
  }, [authFetch, todaysItem?.sound, todaysItem?.phoneme]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!todaysItem) return null;
  const playCount = progress.practiced[todaysItem.id] ?? 0;
  const isMastered = !!progress.mastered[todaysItem.id];
  const canMaster = playCount > 0 || isMastered;

  // ── Type-aware focus tile rendering ─────────────────────────────────────
  const isLongForm = todaysItem.type === "sentence" || todaysItem.type === "story";
  return <Card data-testid="phonics-todays-activity" className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-muted dark:bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
            <Sparkles className="h-5 w-5 text-primary dark:text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-base font-bold text-foreground">{t("components.phonics_learning.today_s_activity")}</h3>
            <p className="text-xs text-muted-foreground">
              {todaysItem.type === "story" ? "Story time" : level.focus}
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setTick(t => t + 1)} aria-label={t("components.phonics_learning.pick_another_sound")} className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-primary">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Focus tile — taller layout for sentences/stories */}
        <div className={cn("rounded-3xl bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card border border-border dark:border-border p-5 transition-transform hover:scale-[1.01] active:scale-[0.99]", isLongForm ? "flex flex-col items-start gap-4" : "flex items-center gap-4")}>
          {todaysItem.emoji && <span className={isLongForm ? "text-4xl" : "text-5xl shrink-0"} aria-hidden>
              {todaysItem.emoji}
            </span>}
          <div className="flex-1 min-w-0 w-full">
            <p className={cn("font-quicksand font-bold text-foreground leading-tight", isLongForm ? "text-xl mb-2" : "text-3xl leading-none mb-1")}>
              {todaysItem.symbol}
            </p>
            {todaysItem.examples && todaysItem.examples.length > 0 ? <ExampleChips words={todaysItem.examples} size="md" /> : todaysItem.example ? <p className="text-xs text-muted-foreground">{todaysItem.example}</p> : null}
          </div>
          <AudioPlayButton text={todaysItem.phoneme ?? todaysItem.sound} mode={todaysItem.phoneme ? "phonics" : undefined} size="lg" variant="violet" ariaLabel={`Play sound ${todaysItem.symbol}`} onPlay={() => recordPlay(todaysItem.id, todaysItem.contentId)} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {playCount > 0 ? `Played ${playCount} time${playCount !== 1 ? "s" : ""}` : "Not practised yet"}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => toggleMastered(todaysItem.id, todaysItem.contentId)} disabled={!canMaster} title={canMaster ? undefined : "Play the sound at least once first"} className={cn("rounded-full h-8 px-3 text-xs font-bold border", isMastered ? "bg-muted dark:bg-card text-primary dark:text-muted-foreground border-border" : "bg-white/70 dark:bg-white/[0.06] text-foreground border-border hover:border-border hover:text-primary", !canMaster && "opacity-50 cursor-not-allowed hover:border-border hover:text-foreground")}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            {isMastered ? "Mastered!" : "Mark mastered"}
          </Button>
        </div>
      </CardContent>
    </Card>;
}

// ─── Card 2: Practice Sounds ─────────────────────────────────────────────────

function PracticeSoundsCard({
  level,
  items,
  progress,
  recordPlay
}: {
  level: PhonicsLevel;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  recordPlay: (id: string, contentId?: number) => void;
}) {
  const {
    t
  } = useTranslation();
  const authFetch = useAuthFetch();
  const [blendItem, setBlendItem] = useState<DisplayPhonicsItem | null>(null);

  // Preload the first batch of sounds so the first taps are instant. Letter
  // tiles warm the phoneme-mode cache; non-letter tiles warm default mode —
  // matches exactly what the Play button will request on tap.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      for (const it of items.slice(0, 6)) {
        if (ctrl.signal.aborted) return;
        const text = it.phoneme ?? it.sound;
        const mode: "phonics" | undefined = it.phoneme ? "phonics" : undefined;
        await preloadAmyVoice(authFetch, text, {
          mode,
          signal: ctrl.signal
        });
      }
    })();
    return () => ctrl.abort();
  }, [authFetch, items]);

  // Type-driven layout: items that are long-form (sentences/stories) get a
  // list layout with full-width text; everything else uses the tile grid.
  const hasLongForm = items.some(i => i.type === "sentence" || i.type === "story");
  const useGrid = !hasLongForm && !level.features.sentenceReading;
  return <Card data-testid="phonics-practice-sounds" className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-muted dark:bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
            <BookOpen className="h-5 w-5 text-primary dark:text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-base font-bold text-foreground">{t("components.phonics_learning.practice_sounds")}</h3>
            <p className="text-xs text-muted-foreground">{t("components.phonics_learning.tap_any_tile_to_hear_the_sound")}</p>
          </div>
          <Badge className="bg-muted dark:bg-card text-primary dark:text-muted-foreground border-0 text-[10px] font-bold">
            {items.length} {items.length === 1 ? "sound" : "sounds"}
          </Badge>
        </div>

        {useGrid ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {items.map(it => {
          const count = progress.practiced[it.id] ?? 0;
          const mastered = !!progress.mastered[it.id];
          const showBlend = level.features.blending && it.example?.includes("–");
          return <div key={it.id} data-testid={`phonics-tile-${it.id}`} className={cn("relative rounded-2xl p-3 border bg-white/70 dark:bg-white/[0.05] transition-all hover:scale-[1.02] hover:shadow-md active:scale-95", mastered ? "border-border dark:border-border ring-1 ring-primary animate-pulse-slow" : "border-white/60 dark:border-white/10 hover:border-primary/30")}>
                  {mastered && <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary fill-muted" />}
                  <div className="flex items-center gap-2">
                    {it.emoji && <span className="text-2xl shrink-0">{it.emoji}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="font-quicksand text-lg font-bold text-foreground leading-tight">{it.symbol}</p>
                      {it.examples && it.examples.length > 0 ? <ExampleChips words={it.examples} size="sm" /> : it.example ? <p className="text-[10px] text-muted-foreground truncate">{it.example}</p> : null}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <AudioPlayButton text={it.phoneme ?? it.sound} mode={it.phoneme ? "phonics" : undefined} size="sm" variant="violet" ariaLabel={`Play sound ${it.symbol}`} onPlay={() => recordPlay(it.id, it.contentId)} />
                    {showBlend && <Button type="button" size="sm" variant="outline" onClick={() => setBlendItem(it)} className="rounded-full h-7 px-2.5 text-[10px] font-bold border-border text-primary dark:text-muted-foreground hover:bg-muted dark:hover:bg-card">
                        {t("components.phonics_learning.blend")}
                      </Button>}
                    {count > 0 && <span className="text-[10px] text-muted-foreground font-medium">{count}×</span>}
                  </div>
                </div>;
        })}
          </div> : <div className="space-y-2">
            {items.map(it => {
          const count = progress.practiced[it.id] ?? 0;
          const mastered = !!progress.mastered[it.id];
          const isLong = it.type === "sentence" || it.type === "story";
          return <div key={it.id} data-testid={`phonics-tile-${it.id}`} className={cn("flex items-start gap-3 rounded-2xl p-3 border bg-white/70 dark:bg-white/[0.05] transition-all", mastered ? "border-border dark:border-border" : "border-white/60 dark:border-white/10 hover:border-primary/30")}>
                  {it.emoji && <span className="text-xl shrink-0">{it.emoji}</span>}
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold text-foreground leading-snug", isLong ? "text-sm" : "text-sm")}>
                      {it.symbol}
                    </p>
                    {it.examples && it.examples.length > 0 ? <div className="mt-1">
                        <ExampleChips words={it.examples} size="sm" />
                        {count > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">{t("components.phonics_learning.played")} {count}×</p>}
                      </div> : it.example ? <p className="text-[10px] text-muted-foreground">
                        {it.example}
                        {count > 0 ? ` · played ${count}×` : ""}
                      </p> : null}
                  </div>
                  {mastered && <CheckCircle2 className="h-4 w-4 text-primary mt-1" />}
                  <AudioPlayButton text={it.phoneme ?? it.sound} mode={it.phoneme ? "phonics" : undefined} size="sm" variant="violet" ariaLabel={`Read aloud: ${it.symbol}`} onPlay={() => recordPlay(it.id, it.contentId)} />
                </div>;
        })}
          </div>}

        {blendItem && <BlendPanel item={blendItem} onClose={() => setBlendItem(null)} onPlay={() => recordPlay(blendItem.id, blendItem.contentId)} />}
      </CardContent>
    </Card>;
}

// ─── Blend panel ─────────────────────────────────────────────────────────────

function BlendPanel({
  item,
  onClose,
  onPlay
}: {
  item: DisplayPhonicsItem;
  onClose: () => void;
  onPlay: () => void;
}) {
  const {
    t
  } = useTranslation();
  const sounds = (item.example ?? item.symbol).split("–").map(s => s.trim()).filter(Boolean);
  return <div role="dialog" aria-label={`Blend ${item.symbol}`} className="mt-4 rounded-2xl border border-border dark:border-border bg-muted dark:bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-primary dark:text-muted-foreground">{t("components.phonics_learning.blend_it_together")}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 rounded-full text-primary dark:text-muted-foreground" aria-label={t("components.phonics_learning.close_blend_panel")}>
          ×
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
        {sounds.map((s, i) => <div key={i} className="flex items-center gap-2">
            <div className="rounded-xl bg-white dark:bg-white/[0.08] border border-border dark:border-border px-3 py-2 flex items-center gap-2">
              <span className="font-quicksand text-xl font-bold text-primary dark:text-muted-foreground">{s}</span>
              {/* BlendPanel sounds are individual phonemes ("c", "a", "t") — */}
              {/* always use phonics mode for crisp single-sound pronunciation. */}
              <AudioPlayButton text={s} mode="phonics" size="sm" variant="violet" ariaLabel={`Play ${s}`} />
            </div>
            {i < sounds.length - 1 && <span className="text-primary text-xl">+</span>}
          </div>)}
      </div>

      <div className="flex items-center justify-center gap-3 pt-3 border-t border-border dark:border-border">
        <span className="text-2xl">→</span>
        <div className="flex items-center gap-2">
          {item.emoji && <span className="text-2xl">{item.emoji}</span>}
          <span className="font-quicksand text-2xl font-bold text-foreground">{item.symbol}</span>
        </div>
        <AudioPlayButton text={item.sound} size="md" variant="violet" ariaLabel={`Play whole word ${item.symbol}`} onPlay={onPlay} />
      </div>
    </div>;
}

// ─── Card 3: Progress Tracker ────────────────────────────────────────────────

function ProgressTrackerCard({
  level,
  items,
  progress,
  sourceLabel
}: {
  level: PhonicsLevel;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  sourceLabel: string;
}) {
  const {
    t
  } = useTranslation();
  const totalItems = Math.max(items.length, 1);
  const validIds = new Set(items.map(i => i.id));
  const practicedCount = Object.keys(progress.practiced).filter(id => validIds.has(id)).length;
  const masteredFromPlayed = Object.keys(progress.mastered).filter(id => validIds.has(id) && (progress.practiced[id] ?? 0) > 0).length;
  const masteredCount = Object.keys(progress.mastered).filter(id => validIds.has(id)).length;
  const totalPlays = Object.entries(progress.practiced).reduce((sum, [id, n]) => validIds.has(id) ? sum + n : sum, 0);
  const completionPct = Math.min(100, Math.round(masteredCount / totalItems * 100));
  const accuracyPct = practicedCount > 0 ? Math.min(100, Math.round(masteredFromPlayed / practicedCount * 100)) : 0;
  return <Card data-testid="phonics-progress" className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-muted dark:bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
            <Trophy className="h-5 w-5 text-primary dark:text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-base font-bold text-foreground">{t("components.phonics_learning.progress_tracker")}</h3>
            <p className="text-xs text-muted-foreground">{level.shortLabel} • {sourceLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="Practised" value={`${practicedCount}/${items.length}`} />
          <Stat label="Accuracy" value={`${accuracyPct}%`} sub={practicedCount === 0 ? "no data" : undefined} />
          <Stat label="Total plays" value={`${totalPlays}`} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-foreground">{t("components.phonics_learning.mastery")}</span>
            <span className="text-xs font-bold text-primary dark:text-muted-foreground">{completionPct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted dark:bg-card overflow-hidden border border-border dark:border-border">
            <div data-testid="phonics-mastery-bar" className="h-full bg-gradient-to-r from-primary to-primary transition-all duration-500" style={{
            width: `${completionPct}%`
          }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {masteredCount === 0 ? "Tap 'Mark mastered' on a sound your child knows confidently." : `${masteredCount} of ${items.length} mastered • keep going!`}
          </p>
        </div>
      </CardContent>
    </Card>;
}
function Stat({
  label,
  value,
  sub
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return <div className="rounded-2xl bg-white/70 dark:bg-white/[0.05] border border-white/60 dark:border-white/10 px-3 py-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{label}</p>
      <p className="font-quicksand text-lg font-bold text-foreground leading-tight">{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground">{sub}</p>}
    </div>;
}

// ─── Card 4: Parent Tips ─────────────────────────────────────────────────────

function ParentTipsCard({
  level,
  items,
  progress,
  insights
}: {
  level: PhonicsLevel;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  insights: PhonicsInsight[] | null;
}) {
  const {
    t
  } = useTranslation();
  const [open, setOpen] = useState(false);

  // Prefer server-built insights (richer + cached) — fall back to local rules.
  const display = useMemo(() => insights && insights.length > 0 ? insights : buildLocalInsights(items, progress, level.shortLabel), [insights, items, progress, level.shortLabel]);
  return <Card data-testid="phonics-parent-tips" className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-muted dark:bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
            <Lightbulb className="h-5 w-5 text-primary dark:text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-base font-bold text-foreground">{t("components.phonics_learning.parent_tips_insights")}</h3>
            <p className="text-xs text-muted-foreground">{t("components.phonics_learning.personalised_to_your_child_s_progress")}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {display.map((ins, i) => <div key={i} data-testid={`phonics-insight-${ins.tone}`} className={cn("rounded-2xl border px-3 py-2.5 flex items-start gap-2.5", ins.tone === "good" && "bg-muted dark:bg-card border-border dark:border-border", ins.tone === "warn" && "bg-muted dark:bg-card border-border dark:border-border", ins.tone === "info" && "bg-muted dark:bg-card border-border dark:border-border")}>
              <span className="text-lg shrink-0" aria-hidden>{ins.emoji}</span>
              <p className={cn("text-xs leading-relaxed font-medium", ins.tone === "good" && "text-primary dark:text-muted-foreground", ins.tone === "warn" && "text-primary dark:text-muted-foreground", ins.tone === "info" && "text-primary dark:text-muted-foreground")}>
                {ins.text}
              </p>
            </div>)}
        </div>

        <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between rounded-2xl px-3 py-2 bg-white/40 dark:bg-white/[0.03] border border-white/50 dark:border-white/10 hover:bg-white/60 transition-colors" aria-expanded={open}>
          <span className="text-xs font-bold text-foreground flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            {t("components.phonics_learning.how_to_teach")} {level.shortLabel} ({level.parentTips.length} {t("components.phonics_learning.tips")}
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {open && <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {level.parentTips.map((tip, i) => <div key={i} className="rounded-xl bg-white/70 dark:bg-white/[0.05] border border-white/60 dark:border-white/10 px-3 py-2 flex items-start gap-2">
                <span className="text-xs font-bold text-primary shrink-0 mt-0.5">{i + 1}.</span>
                <p className="text-xs text-foreground leading-relaxed">{tip}</p>
              </div>)}
          </div>}
      </CardContent>
    </Card>;
}

// ─── Card 0: Download printable workbook (PDF) ───────────────────────────────

const PHONICS_PDF = {
  fileKey: "phonics-mastery-15-sets",
  fileName: "Phonics-Mastery-15-Sets.pdf",
  url: "/phonics-mastery-15-sets.pdf"
} as const;
function PhonicsDownloadCard({
  childId
}: {
  childId: number | string;
}) {
  const {
    t
  } = useTranslation();
  const numericChildId = typeof childId === "number" ? childId : Number.isFinite(Number(childId)) ? Number(childId) : null;
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
          signal: ctrl.signal
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok?: boolean;
          downloads?: Array<{
            fileKey: string;
            count: number;
          }>;
        };
        const row = data.downloads?.find(d => d.fileKey === PHONICS_PDF.fileKey);
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileKey: PHONICS_PDF.fileKey,
          ...(numericChildId !== null ? {
            childId: numericChildId
          } : {})
        })
      });
      if (!res.ok) {
        setError(res.status === 401 ? "Please sign in again to download." : "Couldn't record your download. Please try again.");
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
  return <Card data-testid="phonics-download-card" className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-muted dark:bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
            <FileText className="h-5 w-5 text-primary dark:text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-base font-bold text-foreground">
              {t("components.phonics_learning.phonics_mastery_printable_workbook")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("components.phonics_learning.15_sets_covering_short_vowels_blends_digraphs_more")}
            </p>
          </div>
          {downloadCount !== null && downloadCount > 0 && <Badge data-testid="phonics-download-count" className="bg-muted dark:bg-card text-primary dark:text-muted-foreground border-border dark:border-border font-bold text-[10px] shrink-0">
              {downloadCount}{t("components.phonics_learning.downloaded")}
            </Badge>}
        </div>

        <Button type="button" onClick={handleDownload} disabled={downloading} data-testid="phonics-download-button" className="w-full rounded-2xl gap-2 font-semibold bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary text-white shadow-md disabled:opacity-70">
          {downloading ? <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("components.phonics_learning.preparing_download")}
            </> : <>
              <Download className="h-4 w-4" />
              {t("components.phonics_learning.download_pdf_free_unlimited_re_downloads")}
            </>}
        </Button>

        {error && <p className="text-xs text-primary dark:text-primary mt-2 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>}
      </CardContent>
    </Card>;
}