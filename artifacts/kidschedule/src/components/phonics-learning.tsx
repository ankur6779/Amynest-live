import { parseApiJson } from "@/lib/safe-json-response";
import { useEffect, useMemo, useRef, useState } from "react";
import { PhonicsErrorBoundary } from "@/components/phonics-error-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, Lightbulb, ChevronDown, ChevronUp, CheckCircle2, RefreshCw, BookOpen, Trophy, AlertCircle, Loader2, Download, FileText, Lock, Library } from "lucide-react";
import { AudioPlayButton } from "@/components/audio-play-button";
import { getPhonicsSessionPrewarmLimit } from "@/lib/phonics-v2/audio-prefetch";
import { PhonicsTest } from "@/components/phonics-test";
import { SubItemGate } from "@/components/sub-item-gate";
import { LearningLoadMoreButton } from "@/components/learning-load-more-button";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { useHubJourney } from "@/hooks/use-hub-journey";
import { useRecordLearningActivity } from "@/hooks/use-record-learning-activity";
import { usePaywall } from "@/contexts/paywall-context";
import { useMountedRef } from "@/hooks/use-safe-async";
import { isCapacitorIosNative } from "@/lib/mic-permission-capacitor";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { applyPhonicsJourneyCap, premiumPracticeItems, type PhonicsPremiumMeta } from "@/lib/phonics-journey-access";
import type { PhonicsPrimaryCta } from "@/lib/phonics-journey-roadmap";
import { Link } from "wouter";
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
import {
  getCvcBlendPhonemeAt,
  getPhonemeAudioText,
  getPhonicsAudioText,
} from "@workspace/phonics-sounds";
import { playPhonicsBlend, playCvcBlendWithSpeak } from "@/lib/phonics-audio";
import {
  phonicsTilePlaybackText,
  phonicsTileCvcWordKey,
  phonicsTileUsesPhonicsMode,
} from "@/lib/phonics-tile-playback";
import { CvcBlendPanel } from "@/components/cvc-blend-panel";
import { PhonicsStopButton } from "@/components/phonics-stop-button";
import { stopPhonicsPlayback } from "@/lib/phonics-player";
import { PhonicsJourneyHub } from "@/components/phonics-journey-hub";
import { PhonicsLearningPacks } from "@/components/phonics-learning-packs";
import { PhonicsV2 } from "@/components/phonics-v2";
import { warmPhonicsSessionTiles } from "@/lib/phonics-v2/audio-prefetch";
import { usePhonicsCurriculum } from "@/hooks/use-phonics-curriculum";
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import { cn } from "@/lib/utils";
import { recordPhonicsHabitActivity } from "@/lib/phonics-journey-habit";
import { sanitizeDisplayPhonicsItems } from "@/lib/phonics-item-guards";
import {
  filterItemsByCurriculumLevel,
  resolveCurriculumLevel,
} from "@/lib/phonics-curriculum-filter";

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
  const safeItems = items ?? [];
  if (safeItems.length === 0) return null;
  return safeItems[(getTodaySeed() + tick) % safeItems.length] ?? null;
}

// ─── Local insight builder (used only when API insights aren't available) ────

function buildLocalInsights(items: DisplayPhonicsItem[], progress: PhonicsProgressMap, shortLabel: string): PhonicsInsight[] {
  const safeItems = sanitizeDisplayPhonicsItems(items);
  if (safeItems.length === 0) {
    return [];
  }
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
  const coveragePct = safeItems.length > 0 ? Math.round(playedIds.length / safeItems.length * 100) : 0;
  if (coveragePct >= 80) {
    ins.push({
      tone: "good",
      emoji: "🎉",
      text: `Strong coverage! Practised ${playedIds.length}/${safeItems.length} sounds (${coveragePct}%). Time to introduce the next level soon.`
    });
  } else if (coveragePct >= 40) {
    const unseen = safeItems.filter(i => !progress.practiced[i.id]);
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
  const stuck = safeItems.filter(i => (progress.practiced[i.id] ?? 0) >= 5 && !progress.mastered[i.id]);
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
  const safeWords = words ?? [];
  if (safeWords.length === 0) {
    return <div className="text-xs text-muted-foreground">Loading...</div>;
  }
  const chipCls = size === "md" ? "px-2 py-0.5 text-[11px]" : "px-1.5 py-[1px] text-[10px]";
  return <div className="mt-1 flex flex-wrap gap-1" data-testid="phonics-example-chips">
      {(safeWords ?? []).map(w => <span key={w} className={cn("inline-flex items-center rounded-full bg-muted dark:bg-card text-primary dark:text-muted-foreground font-medium border border-border dark:border-border", chipCls)}>
          {w}
        </span>)}
    </div>;
}

// ─── Main component ──────────────────────────────────────────────────────────

interface PhonicsLearningProps {
  childId: number | string;
  childName: string;
  totalAgeMonths: number;
  /** Deep-link from /phonics/test?type=daily|weekly */
  initialTestType?: "daily" | "weekly";
  /** Query string suffix for navigation (e.g. `&foo=bar`). */
  childQuery?: string;
  onPrimaryCtaChange?: (cta: PhonicsPrimaryCta) => void;
}
export function PhonicsLearning(props: PhonicsLearningProps) {
  return (
    <PhonicsErrorBoundary childName={props.childName}>
      <PhonicsLearningContent {...props} />
      <PhonicsStopButton />
    </PhonicsErrorBoundary>
  );
}

function PhonicsLearningContent({
  childId,
  childName,
  totalAgeMonths,
  initialTestType,
  childQuery = "",
  onPrimaryCtaChange,
}: PhonicsLearningProps) {
  const {
    t
  } = useTranslation();
  const { isPremium } = useSubscription();
  const numericChildId = typeof childId === "number" ? childId : Number(childId);
  const hubJourney = useHubJourney(Number.isFinite(numericChildId) ? numericChildId : null);
  const journeyDay = hubJourney.journeyDay;
  const isFreeJourneyPeriod = hubJourney.isFreeJourneyPeriod;
  const journeyGated = !isPremium && !!hubJourney.access;

  // Stage selector — parents asked to browse ALL 5 stages, not just the
  // child's age-derived default. `null` means "use my child's natural stage";
  // any other value is a manual override the API + hook respect.
  // Free journey users stay on their child's natural stage only.
  const [stageOverride, setStageOverride] = useState<PhonicsAgeGroup | null>(
    null,
  );
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [extraCvcWords, setExtraCvcWords] = useState<string[]>([]);
  const [stageBrowseOpen, setStageBrowseOpen] = useState(false);
  const [weeklyTestOpen, setWeeklyTestOpen] = useState(false);
  // Reset the override whenever the parent switches to a different child —
  // otherwise stage stickiness leaks across siblings (architect flag).
  useEffect(() => {
    setStageOverride(null);
  }, [childId]);

  useEffect(() => {
    if (initialTestType === "weekly") setWeeklyTestOpen(true);
  }, [initialTestType]);

  // Leaving the phonics module must stop any lingering phoneme/blend audio.
  useEffect(() => {
    return () => stopPhonicsPlayback("leave_phonics");
  }, []);
  const phonicsData = usePhonicsData(childId, totalAgeMonths, stageOverride);
  const phonicsCurriculum = usePhonicsCurriculum(
    typeof childId === "number" ? childId : null,
  );
  const { recordActivity } = useRecordLearningActivity(
    Number.isFinite(numericChildId) ? numericChildId : null,
  );

  const {
    level,
    defaultLevel,
    loading,
    items,
    dailyItems,
    totalCatalog,
    journeyMeta,
    premiumMeta,
    progress,
    insights,
    recordPlay: recordPlayBase,
    toggleMastered,
  } = phonicsData;

  const recordPlay = (id: string, contentId?: number) => {
    recordPlayBase(id, contentId);
    if (Number.isFinite(numericChildId)) {
      void recordActivity({
        activityId: `phonics_${id}`,
        section: "phonics",
        correct: true,
      });
      const item = (items ?? []).find((i) => i.id === id);
      if (item) {
        recordPhonicsHabitActivity(numericChildId, {
          type: "play",
          itemId: id,
          symbol: item.symbol,
        });
      }
    }
  };

  const handleToggleMastered = (id: string, contentId?: number) => {
    toggleMastered(id, contentId);
    if (Number.isFinite(numericChildId)) {
      const item = (items ?? []).find((i) => i.id === id);
      if (item) {
        recordPhonicsHabitActivity(numericChildId, {
          type: "master",
          itemId: id,
          symbol: item.symbol,
        });
      }
    }
  };

  const curriculumLevel = resolveCurriculumLevel(
    phonicsCurriculum.data?.progress?.currentLevel ?? phonicsCurriculum.data?.plan?.currentLevel,
    totalAgeMonths,
  );

  const curriculumFilteredItems = useMemo(
    () => filterItemsByCurriculumLevel(items ?? [], curriculumLevel),
    [items, curriculumLevel],
  );
  const curriculumFilteredDaily = useMemo(
    () => filterItemsByCurriculumLevel(dailyItems ?? [], curriculumLevel),
    [dailyItems, curriculumLevel],
  );

  const journeyApplied = useMemo(
    () =>
      applyPhonicsJourneyCap(curriculumFilteredItems, curriculumFilteredDaily, {
        isPremium,
        journeyDay,
        isFreePeriod: isFreeJourneyPeriod,
        isJourneyLocked: hubJourney.isJourneyLocked,
        apiMeta: journeyMeta,
        premiumMeta,
        totalCatalog: totalCatalog || (items?.length ?? 0),
      }),
    [
      curriculumFilteredItems,
      curriculumFilteredDaily,
      isPremium,
      journeyDay,
      isFreeJourneyPeriod,
      hubJourney.isJourneyLocked,
      journeyMeta,
      premiumMeta,
      totalCatalog,
    ],
  );

  const safeItems = journeyApplied.items;
  const safeDailyItems = journeyApplied.dailyItems;
  const activeJourneyMeta = journeyApplied.journeyMeta;
  const activePremiumMeta = journeyApplied.premiumMeta;
  const practiceItems = useMemo(
    () =>
      isPremium
        ? premiumPracticeItems(safeDailyItems, safeItems)
        : safeItems,
    [isPremium, safeDailyItems, safeItems],
  );
  const emptyProgress = useMemo<PhonicsProgressMap>(
    () => ({ practiced: {}, mastered: {} }),
    [],
  );
  const safeProgress = progress ?? emptyProgress;
  const safeInsights = insights ?? [];
  const showBlending =
    !!level?.features.blending &&
    (isPremium || !journeyGated || journeyDay >= 2);
  const lockStageSelector = journeyGated && isFreeJourneyPeriod && !isPremium;

  const gateProps = {
    childId: Number.isFinite(numericChildId) ? numericChildId : undefined,
    journeyDay,
    journeyGated,
    journeyFreePeriod: isFreeJourneyPeriod,
  };

  const preloadKeyRef = useRef<string>("");
  useEffect(() => {
    if (practiceItems.length === 0) return;
    const limit = getPhonicsSessionPrewarmLimit();
    const key = practiceItems.map((i) => i.id).join(",");
    if (preloadKeyRef.current === key) return;
    preloadKeyRef.current = key;
    void warmPhonicsSessionTiles(practiceItems, { limit }).catch((err) => {
      console.warn("[phonics] library audio warm skipped", err);
    });
  }, [practiceItems]);

  // Guard while hook is still resolving API / fallback content
  if (loading && !level && safeItems.length === 0) {
    return (
      <Card className="rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
        <CardContent className="p-8 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading phonics...</span>
        </CardContent>
      </Card>
    );
  }

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
  if (loading && safeItems.length === 0) {
    return <Card className="rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
        <CardContent className="p-8 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("components.phonics_learning.loading_phonics_for")} {childName}…</span>
        </CardContent>
      </Card>;
  }
  return <div id="phonics-learning" className="space-y-4 scroll-mt-24">
      {typeof childId === "number" && (
        <PhonicsJourneyHub
          childId={childId}
          childName={childName}
          totalAgeMonths={totalAgeMonths}
          level={level}
          progress={safeProgress}
          practiceItems={practiceItems}
          insights={safeInsights}
          onPrimaryCtaChange={onPrimaryCtaChange}
        />
      )}

      {typeof childId === "number" && level && (
        <PhonicsV2
          childId={childId}
          childName={childName}
          totalAgeMonths={totalAgeMonths}
          level={level}
          items={safeItems}
          progress={safeProgress}
          recordPlay={recordPlay}
          curriculumLevel={curriculumLevel}
          curriculumPlan={phonicsCurriculum.data?.plan ?? null}
          curriculumMasteryScore={phonicsCurriculum.data?.progress?.masteryScore ?? 0}
          curriculumLastTestAt={phonicsCurriculum.data?.progress?.lastTestAt ?? null}
          curriculumStreak={phonicsCurriculum.data?.progress?.streak ?? 0}
          onCompleteCurriculumActivity={phonicsCurriculum.completeActivity}
        />
      )}

      <div id="phonics-daily-quiz" className="scroll-mt-24">
        <SubItemGate sectionId="hub_phonics" subItemId="phonics_test" {...gateProps}>
          <PhonicsTest
            childId={childId}
            childName={childName}
            totalAgeMonths={totalAgeMonths}
            initialTestType={initialTestType === "weekly" ? undefined : initialTestType ?? "daily"}
            testFilter="daily"
            embeddedTitle="Quick Check"
          />
        </SubItemGate>
      </div>

      {isPremium && activePremiumMeta && activePremiumMeta.lockedCount > 0 && (
        <PhonicsPremiumBanner meta={activePremiumMeta} childName={childName} />
      )}
      {!isPremium && activeJourneyMeta.isFreePeriod && (
        <PhonicsJourneyBanner meta={activeJourneyMeta} childName={childName} />
      )}

      <SubItemGate sectionId="hub_phonics" subItemId="phonics_practice_sounds" {...gateProps}>
        <PhonicsLearningPacks
          level={level}
          items={practiceItems}
          progress={safeProgress}
          recordPlay={recordPlay}
          toggleMastered={handleToggleMastered}
          lockedCount={isPremium ? 0 : activeJourneyMeta.lockedCount}
        />
        {showBlending && (
          <Card className="rounded-2xl border-dashed">
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t("components.learning_load_more.extra_words")}
                </p>
                {extraCvcWords.length > 0 && (
                  <p className="text-sm font-medium flex flex-wrap gap-1.5">
                    {extraCvcWords.map((w) => (
                      <span
                        key={w}
                        className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold"
                      >
                        {w}
                      </span>
                    ))}
                  </p>
                )}
                <LearningLoadMoreButton
                  section="phonics"
                  count={10}
                  excludeIds={extraCvcWords}
                  params={{
                    level:
                      { "12_24m": 1, "2_3y": 2, "3_4y": 3, "4_5y": 4, "5_6y": 5 }[
                        level.ageGroup
                      ] ?? 3,
                    vowelFocus: "a",
                  }}
                  onLoaded={(items) => {
                    const words = (items.words ?? []) as string[];
                    if (words.length > 0) {
                      setExtraCvcWords((prev) => [...prev, ...words]);
                    }
                  }}
                />
              </CardContent>
            </Card>
        )}
      </SubItemGate>

      {isPremium && (
        <FullLibrarySection
          open={libraryOpen}
          onToggle={() => setLibraryOpen((o) => !o)}
          items={safeItems}
          totalCatalog={activePremiumMeta?.totalCatalog ?? activeJourneyMeta.totalCatalog}
          lockedCount={activePremiumMeta?.lockedCount ?? 0}
          level={level}
          progress={safeProgress}
          recordPlay={recordPlay}
        />
      )}

      <Card className="rounded-3xl border-border bg-card">
        <CardContent className="p-0">
          <button
            type="button"
            className="flex w-full items-center gap-3 p-4 text-left"
            onClick={() => setWeeklyTestOpen((o) => !o)}
            aria-expanded={weeklyTestOpen}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-quicksand text-sm font-bold text-foreground">
                Weekly Assessment
              </p>
              <p className="text-[11px] text-muted-foreground">
                Deeper review — unlocks once a week
              </p>
            </div>
            {weeklyTestOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          {weeklyTestOpen && (
            <div id="phonics-test" className="scroll-mt-24 border-t border-border px-4 pb-4 pt-2">
              <SubItemGate sectionId="hub_phonics" subItemId="phonics_test" {...gateProps}>
                <PhonicsTest
                  childId={childId}
                  childName={childName}
                  totalAgeMonths={totalAgeMonths}
                  initialTestType={initialTestType === "weekly" ? "weekly" : undefined}
                  testFilter="weekly"
                  embeddedTitle="Weekly Assessment"
                />
              </SubItemGate>
            </div>
          )}
        </CardContent>
      </Card>

      <SubItemGate sectionId="hub_phonics" subItemId="phonics_download" {...gateProps}>
        <PhonicsDownloadCard childId={childId} />
      </SubItemGate>

      <div id="phonics-progress" className="scroll-mt-24">
        <SubItemGate sectionId="hub_phonics" subItemId="phonics_progress" {...gateProps}>
          <ProgressTrackerCard level={level} items={safeItems} progress={safeProgress} totalCatalog={activeJourneyMeta.totalCatalog} lockedCount={activeJourneyMeta.lockedCount} sourceLabel={phonicsData.source === "api" ? "synced to your account" : "saved on this device"} />
        </SubItemGate>
      </div>

      <SubItemGate sectionId="hub_phonics" subItemId="phonics_parent_tips" {...gateProps}>
        <ParentTipsCard level={level} items={safeItems} progress={safeProgress} insights={safeInsights} />
      </SubItemGate>

      <Card className="rounded-3xl border-dashed border-border bg-transparent">
        <CardContent className="p-0">
          <button
            type="button"
            className="flex w-full items-center gap-3 p-4 text-left text-muted-foreground"
            onClick={() => setStageBrowseOpen((o) => !o)}
            aria-expanded={stageBrowseOpen}
            data-testid="phonics-stage-selector"
          >
            <span className="text-sm font-semibold">Browse by age stage</span>
            {stageBrowseOpen ? (
              <ChevronUp className="ml-auto h-4 w-4" />
            ) : (
              <ChevronDown className="ml-auto h-4 w-4" />
            )}
          </button>
          {stageBrowseOpen && (
            <div className="px-4 pb-4">
              <StageSelector
                active={level.ageGroup}
                defaultStage={defaultLevel?.ageGroup ?? null}
                lockOtherStages={lockStageSelector}
                onSelect={(g) => {
                  if (lockStageSelector && g !== defaultLevel?.ageGroup) return;
                  setStageOverride(g === defaultLevel?.ageGroup ? null : g);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
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
  lockOtherStages = false,
  onSelect,
}: {
  active: PhonicsAgeGroup;
  defaultStage: PhonicsAgeGroup | null;
  lockOtherStages?: boolean;
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
        if (!lvl) {
          return (
            <div key={g} className="text-xs text-muted-foreground px-3 py-1.5">
              Loading...
            </div>
          );
        }
        const isActive = g === active;
        const isDefault = g === defaultStage;
        const isLocked = lockOtherStages && !isDefault;
        return (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isLocked}
            data-testid={`phonics-stage-pill-${g}`}
            onClick={() => !isLocked && onSelect(g)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : isLocked
                  ? "bg-muted/50 text-muted-foreground border-border opacity-60 cursor-not-allowed"
                  : "bg-card text-foreground/80 border-border hover:border-primary/40 hover:bg-primary/5",
            )}
          >
            <span aria-hidden="true">{lvl.emoji}</span>
            <span>{lvl.shortLabel}</span>
            {isLocked && <Lock className="h-3 w-3 opacity-70" aria-hidden />}
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

function PhonicsPremiumBanner({
  meta,
  childName,
}: {
  meta: PhonicsPremiumMeta;
  childName: string;
}) {
  const { t } = useTranslation();
  return (
    <Card
      data-testid="phonics-premium-banner"
      className="rounded-2xl border-amber-300/30 bg-gradient-to-br from-amber-500/10 via-card to-card"
    >
      <CardContent className="p-4">
        <p className="text-sm font-bold text-foreground">
          {t("components.phonics_learning.premium_banner_title", {
            day: meta.dripDay,
            name: childName,
          })}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("components.phonics_learning.premium_banner_body", {
            unlocked: meta.itemLimit,
            total: meta.totalCatalog,
          })}
          {meta.unlocksTomorrow > 0
            ? ` ${t("components.phonics_learning.premium_banner_tomorrow", {
                count: meta.unlocksTomorrow,
              })}`
            : ""}
        </p>
      </CardContent>
    </Card>
  );
}

function FullLibrarySection({
  open,
  onToggle,
  items,
  totalCatalog,
  lockedCount,
  level,
  progress,
  recordPlay,
}: {
  open: boolean;
  onToggle: () => void;
  items: DisplayPhonicsItem[];
  totalCatalog: number;
  lockedCount: number;
  level: PhonicsLevel;
  progress: PhonicsProgressMap;
  recordPlay: (id: string, contentId?: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card
      data-testid="phonics-full-library"
      className="rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10"
    >
      <CardContent className="p-5">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center gap-3 text-left"
          aria-expanded={open}
        >
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-muted dark:bg-card">
            <Library className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-base font-bold text-foreground">
              {t("components.phonics_learning.full_library_title")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("components.phonics_learning.full_library_subtitle", {
                unlocked: items.length,
                total: totalCatalog,
              })}
            </p>
          </div>
          {open ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
        </button>
        {open && (
          <div className="mt-4 space-y-3">
            <PracticeSoundsCard
              level={level}
              items={items}
              progress={progress}
              recordPlay={recordPlay}
              lockedCount={lockedCount}
              compact
            />
            {lockedCount > 0 && (
              <p className="text-[11px] text-center text-muted-foreground">
                {t("components.phonics_learning.full_library_locked", { count: lockedCount })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PhonicsJourneyBanner({
  meta,
  childName,
}: {
  meta: import("@/lib/phonics-journey-access").PhonicsJourneyMeta;
  childName: string;
}) {
  const { t } = useTranslation();
  return (
    <Card
      data-testid="phonics-journey-banner"
      className="rounded-2xl border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card"
    >
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">
            {t("components.phonics_learning.journey_banner_title", {
              day: meta.journeyDay,
              name: childName,
            })}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("components.phonics_learning.journey_banner_body", {
              unlocked: meta.itemLimit,
              total: meta.totalCatalog,
            })}
            {meta.unlocksTomorrow > 0
              ? ` ${t("components.phonics_learning.journey_banner_tomorrow", {
                  count: meta.unlocksTomorrow,
                })}`
              : ""}
          </p>
        </div>
        <Link href="/parenting-hub">
          <Button type="button" size="sm" variant="outline" className="rounded-full shrink-0">
            {t("components.phonics_learning.journey_banner_cta")}
          </Button>
        </Link>
      </CardContent>
    </Card>
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
  // REMOVED TTS preload on mount — avoids background synthesize during app boot.

  if (!todaysItem) {
    return (
      <Card data-testid="phonics-todays-activity" className="rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10">
        <CardContent className="p-5 text-sm text-muted-foreground">Loading phonics...</CardContent>
      </Card>
    );
  }
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
          <AudioPlayButton
            text={practicePlaybackText(todaysItem)}
            mode={phonicsTileUsesPhonicsMode(todaysItem) ? "phonics" : undefined}
            phonemeKey={todaysItem.phoneme}
            cvcWordKey={phonicsTileCvcWordKey(todaysItem)}
            size="lg"
            variant="violet"
            ariaLabel={`Play sound ${todaysItem.symbol}`}
            onPlay={() => recordPlay(todaysItem.id, todaysItem.contentId)}
          />
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

function practicePlaybackText(it: DisplayPhonicsItem): string {
  return phonicsTilePlaybackText(it);
}

// ─── Card 2: Practice Sounds ─────────────────────────────────────────────────

function PracticeSoundsCard({
  level,
  items,
  progress,
  recordPlay,
  lockedCount = 0,
  titleOverride,
  subtitleOverride,
  compact = false,
}: {
  level: PhonicsLevel;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  recordPlay: (id: string, contentId?: number) => void;
  lockedCount?: number;
  titleOverride?: string;
  subtitleOverride?: string;
  compact?: boolean;
}) {
  const {
    t
  } = useTranslation();
  const [blendItem, setBlendItem] = useState<DisplayPhonicsItem | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const safeItems = items ?? [];

  const preloadedKeyRef = useRef<string | null>(null);
  // REMOVED batch TTS preload — only synthesize on user tap (AudioPlayButton).
  useEffect(() => {
    const key = safeItems[0]?.id ?? null;
    if (key) preloadedKeyRef.current = key;
  }, [safeItems[0]?.id]);

  if (safeItems.length === 0) {
    return (
      <Card data-testid="phonics-practice-sounds" className="rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10">
        <CardContent className="p-5 text-sm text-muted-foreground">Loading phonics...</CardContent>
      </Card>
    );
  }

  // Type-driven layout: items that are long-form (sentences/stories) get a
  // list layout with full-width text; everything else uses the tile grid.
  const hasLongForm = safeItems.some(i => i.type === "sentence" || i.type === "story");
  const useGrid = !hasLongForm && !level.features.sentenceReading;
  const cardCls = compact
    ? "rounded-2xl border border-border/60 bg-transparent shadow-none"
    : "group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]";
  return <Card data-testid="phonics-practice-sounds" className={cardCls}>
      <CardContent className={compact ? "p-0 pt-1" : "p-5"}>
        {!compact && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-muted dark:bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/40 dark:ring-white/10">
            <BookOpen className="h-5 w-5 text-primary dark:text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-base font-bold text-foreground">{titleOverride ?? t("components.phonics_learning.practice_sounds")}</h3>
            <p className="text-xs text-muted-foreground">{subtitleOverride ?? t("components.phonics_learning.tap_any_tile_to_hear_the_sound")}</p>
          </div>
          <Badge className="bg-muted dark:bg-card text-primary dark:text-muted-foreground border-0 text-[10px] font-bold">
            {safeItems.length} {safeItems.length === 1 ? "sound" : "sounds"}
            {lockedCount > 0 ? ` · +${lockedCount} 🔒` : ""}
          </Badge>
        </div>
        )}

        {!compact && lockedCount > 0 && (
          <p className="text-[11px] text-muted-foreground mb-3">
            {t("components.phonics_learning.journey_locked_sounds", { count: lockedCount })}
          </p>
        )}

        {useGrid ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {safeItems.map((it, idx) => {
          const count = progress.practiced[it.id] ?? 0;
          const mastered = !!progress.mastered[it.id];
          const showBlend = level.features.blending && it.example?.includes("–");
          const nextItem = safeItems[idx + 1];
          const prefetchNextText = nextItem
            ? practicePlaybackText(nextItem)
            : undefined;
          const playbackText = practicePlaybackText(it);
          const isActive = highlightId === it.id;
          return <div key={it.id} data-testid={`phonics-tile-${it.id}`} className={cn("relative rounded-2xl p-3 border bg-white/70 dark:bg-white/[0.05] transition-all hover:scale-[1.02] hover:shadow-md active:scale-95", mastered ? "border-border dark:border-border ring-1 ring-primary animate-pulse-slow" : "border-white/60 dark:border-white/10 hover:border-primary/30", isActive && "ring-2 ring-violet-500 border-violet-400/60 scale-[1.02]")}>
                  {mastered && <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary fill-muted" />}
                  <div className="flex items-center gap-2">
                    {it.emoji && <span className="text-2xl shrink-0">{it.emoji}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="font-quicksand text-lg font-bold text-foreground leading-tight">{it.symbol}</p>
                      {it.examples && it.examples.length > 0 ? <ExampleChips words={it.examples} size="sm" /> : it.example ? <p className="text-[10px] text-muted-foreground truncate">{it.example}</p> : null}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <AudioPlayButton
                        text={playbackText}
                        mode={phonicsTileUsesPhonicsMode(it) ? "phonics" : undefined}
                        phonemeKey={it.phoneme}
                        cvcWordKey={phonicsTileCvcWordKey(it)}
                        prefetchNextText={prefetchNextText}
                        size="sm"
                        variant="violet"
                        ariaLabel={`Play sound ${it.symbol}`}
                        onPlay={() => {
                          setHighlightId(it.id);
                          recordPlay(it.id, it.contentId);
                        }}
                        onSpeakingEnd={() => setHighlightId((id) => (id === it.id ? null : id))}
                      />
                      {it.phoneme && (
                        <AudioPlayButton
                          text={playbackText}
                          mode="phonics"
                          phonemeKey={it.phoneme}
                          cvcWordKey={phonicsTileCvcWordKey(it)}
                          slow
                          size="sm"
                          variant="outline"
                          ariaLabel={`Play ${it.symbol} slowly`}
                          onPlay={() => setHighlightId(it.id)}
                          onSpeakingEnd={() => setHighlightId((id) => (id === it.id ? null : id))}
                        />
                      )}
                    </div>
                    {showBlend && <Button type="button" size="sm" variant="outline" onClick={() => setBlendItem(it)} className="rounded-full h-7 px-2.5 text-[10px] font-bold border-border text-primary dark:text-muted-foreground hover:bg-muted dark:hover:bg-card">
                        {t("components.phonics_learning.blend")}
                      </Button>}
                    {count > 0 && <span className="text-[10px] text-muted-foreground font-medium">{count}×</span>}
                  </div>
                </div>;
        })}
          </div> : <div className="space-y-2">
            {safeItems.map((it, idx) => {
          const count = progress.practiced[it.id] ?? 0;
          const mastered = !!progress.mastered[it.id];
          const isLong = it.type === "sentence" || it.type === "story";
          const nextItem = safeItems[idx + 1];
          const prefetchNextText = nextItem
            ? practicePlaybackText(nextItem)
            : undefined;
          const playbackText = practicePlaybackText(it);
          const isActive = highlightId === it.id;
          return <div key={it.id} data-testid={`phonics-tile-${it.id}`} className={cn("flex items-start gap-3 rounded-2xl p-3 border bg-white/70 dark:bg-white/[0.05] transition-all", mastered ? "border-border dark:border-border" : "border-white/60 dark:border-white/10 hover:border-primary/30", isActive && "ring-2 ring-violet-500")}>
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
                  <AudioPlayButton
                    text={playbackText}
                    mode={phonicsTileUsesPhonicsMode(it) ? "phonics" : undefined}
                    phonemeKey={it.phoneme}
                    cvcWordKey={phonicsTileCvcWordKey(it)}
                    prefetchNextText={prefetchNextText}
                    size="sm"
                    variant="violet"
                    ariaLabel={`Read aloud: ${it.symbol}`}
                    onPlay={() => {
                      setHighlightId(it.id);
                      recordPlay(it.id, it.contentId);
                    }}
                    onSpeakingEnd={() => setHighlightId((id) => (id === it.id ? null : id))}
                  />
                </div>;
        })}
          </div>}

        {blendItem &&
          (getCvcWordEntry(blendItem.symbol) ? (
            <CvcBlendPanel
              word={blendItem.symbol.trim().toLowerCase()}
              emoji={blendItem.emoji}
              practiceLevel={level.ageGroup === "3_4y" ? 1 : level.ageGroup === "4_5y" ? 2 : 3}
              onClose={() => setBlendItem(null)}
              onComplete={() => recordPlay(blendItem.id, blendItem.contentId)}
            />
          ) : (
            <BlendPanel
              item={blendItem}
              onClose={() => setBlendItem(null)}
              onPlay={() => recordPlay(blendItem.id, blendItem.contentId)}
            />
          ))}
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
  const [activeLetter, setActiveLetter] = useState<number | null>(null);
  const [blending, setBlending] = useState(false);
  const sounds = (item.example ?? item.symbol).split("–").map(s => s.trim()).filter(Boolean);
  const word = item.symbol.trim().toLowerCase();
  const cvcEntry = getCvcWordEntry(word);

  const runBlend = async (slow: boolean) => {
    setBlending(true);
    try {
      if (cvcEntry) {
        await playCvcBlendWithSpeak(cvcEntry, {
          skipSlowPass: !slow,
          onPhoneme: (idx, phase) => {
            if (phase === "word") setActiveLetter(null);
            else setActiveLetter(idx >= 0 ? idx : null);
          },
        });
      } else {
        await playPhonicsBlend(word, undefined, {
          slow,
          onLetter: (idx) => setActiveLetter(idx >= 0 ? idx : null),
        });
      }
      onPlay();
    } finally {
      setBlending(false);
      setActiveLetter(null);
    }
  };

  return <div role="dialog" aria-label={`Blend ${item.symbol}`} className="mt-4 rounded-2xl border border-border dark:border-border bg-muted dark:bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-primary dark:text-muted-foreground">{t("components.phonics_learning.blend_it_together")}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 rounded-full text-primary dark:text-muted-foreground" aria-label={t("components.phonics_learning.close_blend_panel")}>
          ×
        </Button>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-3">
        <Button type="button" size="sm" disabled={blending} onClick={() => void runBlend(false)} className="rounded-full text-xs font-bold">
          Play blend
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={blending} onClick={() => void runBlend(true)} className="rounded-full text-xs font-bold">
          Slow repeat
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
        {sounds.map((s, i) => {
          const blendPhoneme = getCvcBlendPhonemeAt(word, i);
          const phonemePlaybackText = blendPhoneme
            ? getPhonemeAudioText(blendPhoneme)
            : getPhonicsAudioText(s);
          const nextPhoneme = sounds[i + 1]
            ? getCvcBlendPhonemeAt(word, i + 1)
            : undefined;
          return <div key={i} className="flex items-center gap-2">
            <div className={cn(
              "rounded-xl bg-white dark:bg-white/[0.08] border px-3 py-2 flex items-center gap-2 transition-all",
              activeLetter === i ? "border-violet-500 ring-2 ring-violet-400/50" : "border-border dark:border-border",
            )}>
              <span className="font-quicksand text-xl font-bold text-primary dark:text-muted-foreground">{s}</span>
              <AudioPlayButton
                text={phonemePlaybackText}
                mode="phonics"
                phonemeKey={blendPhoneme}
                prefetchNextText={
                  nextPhoneme ? getPhonemeAudioText(nextPhoneme) : undefined
                }
                size="sm"
                variant="violet"
                ariaLabel={`Play sound ${s}`}
                onPlay={() => setActiveLetter(i)}
                onSpeakingEnd={() => setActiveLetter((a) => (a === i ? null : a))}
              />
            </div>
            {i < sounds.length - 1 && <span className="text-primary text-xl">+</span>}
          </div>;
        })}
      </div>

      <div className="flex items-center justify-center gap-3 pt-3 border-t border-border dark:border-border">
        <span className="text-2xl">→</span>
        <div className="flex items-center gap-2">
          {item.emoji && <span className="text-2xl">{item.emoji}</span>}
          <span className="font-quicksand text-2xl font-bold text-foreground">{item.symbol}</span>
        </div>
        <AudioPlayButton
          text={word}
          mode="phonics"
          cvcWordKey={word}
          size="md"
          variant="violet"
          ariaLabel={`Play whole word ${item.symbol}`}
          onPlay={onPlay}
        />
      </div>
    </div>;
}

// ─── Card 3: Progress Tracker ────────────────────────────────────────────────

function ProgressTrackerCard({
  level,
  items,
  progress,
  sourceLabel,
  totalCatalog,
  lockedCount = 0,
}: {
  level: PhonicsLevel;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  sourceLabel: string;
  totalCatalog?: number;
  lockedCount?: number;
}) {
  const {
    t
  } = useTranslation();
  const catalogTotal = totalCatalog ?? items.length;
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

        {lockedCount > 0 && (
          <p className="text-[11px] text-muted-foreground mb-3">
            {t("components.phonics_learning.journey_progress_locked", {
              unlocked: items.length,
              total: catalogTotal,
            })}
          </p>
        )}

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
  const safeInsights = insights ?? [];

  // Prefer server-built insights (richer + cached) — fall back to local rules.
  const display = useMemo(
    () => (safeInsights.length > 0 ? safeInsights : buildLocalInsights(items, progress, level.shortLabel)),
    [safeInsights, items, progress, level.shortLabel],
  );
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
            {t("components.phonics_learning.how_to_teach")} {level.shortLabel} ({(level.parentTips ?? []).length} {t("components.phonics_learning.tips")}
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {open && <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {(level.parentTips ?? []).map((tip, i) => <div key={i} className="rounded-xl bg-white/70 dark:bg-white/[0.05] border border-white/60 dark:border-white/10 px-3 py-2 flex items-start gap-2">
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
} as const;

/** WKWebView ignores `<a download>` — use Share sheet or in-app preview on native shells. */
async function deliverWorkbookPdf(blob: Blob, fileName: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: "application/pdf" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return true;
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    if (isCapacitorIosNative() || isNativeAmyNestShell()) {
      window.open(objectUrl, "_blank");
      return true;
    }
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }
}

function PhonicsDownloadCard({
  childId
}: {
  childId: number | string;
}) {
  const {
    t
  } = useTranslation();
  const { isPremium } = useSubscription();
  const { openPaywall } = usePaywall();
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
        const data = await parseApiJson<{
          ok?: boolean;
          downloads?: Array<{
            fileKey: string;
            count: number;
          }>;
        }>(res);
        const row = data.downloads?.find(d => d.fileKey === PHONICS_PDF.fileKey);
        if (row) setDownloadCount(row.count);
      } catch {
        // Silent — historical count is nice-to-have, not blocking.
      }
    })();
    return () => ctrl.abort();
  }, [authFetch]);
  const handleDownloadClick = () => {
    if (downloading) return;
    if (!isPremium) {
      openPaywall("phonics_workbook");
      return;
    }
    void handlePremiumDownload();
  };

  const handlePremiumDownload = async () => {
    setDownloading(true);
    setError(null);

    try {
      const downloadRes = await authFetch(
        `/api/phonics/workbook/download?fileKey=${encodeURIComponent(PHONICS_PDF.fileKey)}`,
        { method: "GET" },
      );
      if (downloadRes.status === 403) {
        openPaywall("phonics_workbook");
        return;
      }
      if (!downloadRes.ok) {
        setError(
          downloadRes.status === 401
            ? "Please sign in again to download."
            : downloadRes.status === 404
              ? "Workbook is temporarily unavailable on the server. Please try again shortly."
              : "Couldn't download the workbook. Please try again.",
        );
        return;
      }

      const blob = await downloadRes.blob();
      if (!blob.size || blob.type.includes("json")) {
        setError("Workbook is temporarily unavailable on the server. Please try again shortly.");
        return;
      }

      await deliverWorkbookPdf(blob, PHONICS_PDF.fileName);

      // Log every successful download to the DB (server also enforces premium).
      const logRes = await authFetch("/api/phonics/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKey: PHONICS_PDF.fileKey,
          ...(numericChildId !== null ? { childId: numericChildId } : {}),
        }),
      });
      if (logRes.ok) {
        const data = (await parseApiJson<{ totalDownloads?: number }>(logRes));
        if (typeof data.totalDownloads === "number") {
          setDownloadCount(data.totalDownloads);
        }
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  };

  return <Card data-testid="phonics-download-card" className="group relative rounded-3xl overflow-hidden transition-all duration-300 ease-out bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]">
      <span className="absolute top-3 right-3 z-10 text-xs bg-yellow-500 text-black px-2 py-1 rounded-md font-semibold">
        Premium
      </span>
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

        <button
          type="button"
          onClick={handleDownloadClick}
          disabled={downloading}
          data-testid="phonics-download-button"
          className={cn(
            "w-full rounded-xl py-3 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-70",
            isPremium
              ? "bg-orange-500 hover:bg-orange-600"
              : "bg-gray-600 opacity-70",
          )}
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("components.phonics_learning.preparing_download")}
            </>
          ) : (
            <>
              {!isPremium ? <span aria-hidden>🔒</span> : <Download className="h-4 w-4" />}
              {t("components.phonics_learning.download_pdf")}
            </>
          )}
        </button>

        {!isPremium && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            {t("components.phonics_learning.available_with_premium")}
          </p>
        )}

        {error && <p className="text-xs text-primary dark:text-primary mt-2 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>}
      </CardContent>
    </Card>;
}