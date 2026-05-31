import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AppLink } from "@/components/app-link";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { RouteLoadingShell } from "@/components/route-loading-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, Sparkles, Heart, Palette, ChevronDown, MessageCircleHeart, Calendar, ArrowRight, Trophy, Compass, GraduationCap, ClipboardList, UserPlus, CheckCircle2, Users, AudioLines, Film, FileDown, Star, Baby, Gamepad2, Lightbulb, LayoutGrid, ScrollText, Moon, Gift } from "lucide-react";
import { PtmPrepAssistant } from "@/components/ptm-prep";
import { EventPrepCard } from "@/components/event-prep-card";
import { LifeSkillsZone } from "@/components/life-skills-zone";
import { HubLaunchCard } from "@/components/hub-launch-card";
import { PhonicsUnavailableFallback } from "@/components/phonics-unavailable-fallback";
import { ColoringBooks } from "@/components/coloring-books";
import { FunSheets } from "@/components/fun-sheets";
import { StoryHub } from "@/components/story-hub";
import { getAgeGroup, getAgeGroupInfo } from "@/lib/age-groups";
import { InfantModeShortcuts } from "@/components/infant/infant-mode-shortcuts";
import { InfantHub } from "@/components/infant-hub";
import { SkillFocusSection, StorySection, ParentTasksSection } from "@/components/age-based-sections";
import { DailyStorySection } from "@/components/daily-story-section";
import { ToddlerPreschoolMode, type ToddlerShowOnly } from "@/components/toddler-preschool-mode";
import { DailyPuzzle } from "@/components/daily-puzzle";
import { AmazingFacts } from "@/components/amazing-facts";
import { DailyKidsActivity } from "@/components/daily-kids-activity";
import { ArtCraftReels } from "@/components/art-craft-reels";
import { PrintableWorksheets } from "@/components/printable-worksheets";
import { DailyTips } from "@/components/daily-tips";
import { ParentingArticles } from "@/components/parenting-articles";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { warmParentHubVisibleContent } from "@/lib/parent-hub-audio-warmup";
import { AmyIcon } from "@/components/amy-icon";
import { FuturePredictor } from "@/components/future-predictor";
import { LockedBlock } from "@/components/locked-block";
import { TryFreeBadge } from "@/components/try-free-badge";
import { SubItemGate } from "@/components/sub-item-gate";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import type { AgeGroup } from "@/lib/age-groups";
import type { AgeBand } from "@/lib/age-bands";
import { getAgeBand, getNextAgeBand, getPreviousAgeBand, bandLabel } from "@/lib/age-bands";
import {
  isHubSectionVisible,
  shouldRenderHubTileContent,
  shouldShowExploreSection,
  shouldBypassHubMonthGates,
  shouldShowPreviousStageSection,
  getPreviousStageTileIds,
  SECTION_2_EARLY_ACCESS_TILE_IDS,
} from "@/lib/hub-visibility";
import { ComingNextWrapper } from "@/components/coming-next-wrapper";
import { PreviousStageWrapper } from "@/components/previous-stage-wrapper";
import { applyParentingHubDeepLink } from "@/lib/hub-activity-cross-link";
import {
  getAdaptiveMood,
  getLifeSkillPreviewText,
  getPtmPreviewText,
  isPtmSeason,
  orderEmotionalCards,
  sortSupportTileIds,
  type EmotionalCardId,
} from "@/lib/hub-support-utils";
import { getArticlesForAgeMonths } from "@/lib/articles-data";
import { NewParentTipsSection } from "@/components/new-parent-tips";
import { HubCollapsibleSubTile, HubSubTileLink } from "@/components/hub-collapsible-sub-tile";
import { HubJourneyPulse } from "@/components/hub-journey-pulse";
import { HubTodayLearningPanel } from "@/components/hub-today-learning-panel";
import { TodaysPathFromStatus } from "@/components/todays-path";
import { JourneyPreviewContent } from "@/components/journey-preview-overlay";
import { useHubJourney } from "@/hooks/use-hub-journey";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import { useRecordLearningActivity } from "@/hooks/use-record-learning-activity";
import {
  DailyFreshnessCard,
  NextSessionUnlocks,
  RewardCelebrationModal,
  DailyLearningSessionCard,
  SessionCompleteScreen,
  ComebackMissionCard,
  AdaptiveRecommendationsChips,
} from "@/components/learning-progress";
import { useRewardCelebrations } from "@/hooks/use-reward-celebrations";
import { HubFamilyPulseSection, HubExploreAgesSection } from "@/components/hub-light-layout";
import {
  PARENT_HUB_PAGE,
  getHubGroupStyle,
  HUB_GLASS_CARD,
  HUB_SECTION_LABEL,
  HUB_AGE_BADGE,
  HUB_BODY,
  HUB_QUICK_CHIP,
  hubQuickChipTint,
  HUB_SEE_ALL_CHIP,
  HUB_BOTTOM_CTA,
  getHubFeatureTileAccent,
  hubShadedSectionCardClasses,
  HUB_FEATURE_TILE_CHEVRON,
  HUB_FEATURE_TILE_DESC,
  HUB_FEATURE_TILE_HEADER,
  HUB_FEATURE_TILE_ICON,
  HUB_FEATURE_TILE_LAUNCH_ROW,
  HUB_FEATURE_TILE_PREVIEW,
  HUB_FEATURE_TILE_TEXT,
  HUB_FEATURE_TILE_TITLE,
} from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { HubShadedCardBody } from "@/components/hub-sub-tile-shell";
import { isPhonicsModuleAvailable } from "@/lib/phonics-manifest-validation";

// ── 5-section grouping for the "For You" content ────────────────────────────
// Maps each premium section key to the tile IDs that live inside it.
const WEB_HUB_SECTION_TILE_IDS: Record<string, string[]> = {
  today:      ["amy-ai", "daily-tips", "generate-routine", "tomorrow-forecast", "command-center"],
  learning:   ["smart-math-tricks", "abacus", "phonics", "spelling-mastery", "smart-study", "olympiad"],
  creativity: ["activities", "gaming-rewards", "art-craft", "worksheets", "coloring-books", "fun-sheets", "event-prep"],
  stories:    ["story-hub", "speech-coach"],
  support:    ["articles", "emotional", "life-skills", "ptm-prep", "new-parent-tips"],
};

/** Explicit render order inside the "Today For You" group. */
const TODAY_TILE_ORDER = [
  "amy-ai",
  "daily-tips",
  "generate-routine",
  "tomorrow-forecast",
  "command-center",
] as const;

const HUB_EXPANDED_GROUPS_KEY = "amynest:hub:expandedGroups:v2";
const DEFAULT_EXPANDED_GROUPS: string[] = [];

function loadExpandedGroups(): Set<string> {
  if (typeof window === "undefined") return new Set(DEFAULT_EXPANDED_GROUPS);
  try {
    const raw = window.localStorage.getItem(HUB_EXPANDED_GROUPS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore corrupt storage */
  }
  return new Set(DEFAULT_EXPANDED_GROUPS);
}

function persistExpandedGroups(groups: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HUB_EXPANDED_GROUPS_KEY, JSON.stringify([...groups]));
  } catch {
    /* ignore quota errors */
  }
}

const WEB_HUB_GROUPS = [
  { key: "today",      emoji: "✨", i18n: "parent_hub.section_groups.today"      },
  { key: "learning",   emoji: "📚", i18n: "parent_hub.section_groups.learning"   },
  { key: "creativity", emoji: "🎨", i18n: "parent_hub.section_groups.creativity" },
  { key: "stories",    emoji: "📖", i18n: "parent_hub.section_groups.stories"    },
  { key: "support",    emoji: "❤️", i18n: "parent_hub.section_groups.support"    },
] as const;

// ─── Section Wrapper ─────────────────────────────────────────────────────────
interface SectionProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentClass: string;
  /** Tailwind gradient classes for the card background tile tint */
  cardClass?: string;
  defaultOpen?: boolean;
  /** Subtle pulse glow — used for Ask Amy AI in Today For You. */
  highlighted?: boolean;
  /** Show a small "Try Free" pill in the header (first-time-free features). */
  tryFree?: boolean;
  /** One-line teaser shown while the tile is collapsed. */
  preview?: string;
  /** Journey soft lock — show blurred preview + unlock CTA when expanded. */
  previewLocked?: boolean;
  childName?: string;
  isInfant?: boolean;
  children: React.ReactNode;
}
function HubSection({
  id,
  icon,
  title,
  description,
  accentClass,
  cardClass,
  defaultOpen = false,
  highlighted = false,
  tryFree = false,
  preview,
  previewLocked = false,
  childName,
  isInfant = false,
  onOpen,
  children
}: SectionProps & {
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    setOpen(v => {
      const next = !v;
      if (next) onOpen?.();
      return next;
    });
  };
  const tileTheme = getHubFeatureTileAccent(id);
  return (
    <div
      data-section-id={id}
      className={cn(
        "group h-full",
        hubShadedSectionCardClasses(tileTheme),
        cardClass,
        highlighted && !open && "shadow-[0_0_28px_rgba(168,85,247,0.24)]",
      )}
    >
      <HubShadedCardBody theme={tileTheme} cardClass={cardClass}>
        <div className="min-w-0 flex-1 flex flex-col">
          <button
            onClick={toggle}
            className={cn(
              HUB_FEATURE_TILE_HEADER,
              open ? "bg-white/[0.04]" : "hover:bg-white/[0.03]",
            )}
            aria-expanded={open}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={cn(
                  HUB_FEATURE_TILE_ICON,
                  tileTheme.emojiShell,
                  accentClass,
                  highlighted && !open ? "animate-[pulse_3s_ease-in-out_infinite]" : "",
                )}
              >
                {icon}
              </div>
              <div className={HUB_FEATURE_TILE_TEXT}>
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  <p className={cn(HUB_FEATURE_TILE_TITLE, "flex-1")}>{title}</p>
                  {tryFree && <TryFreeBadge />}
                </div>
                <p className={HUB_FEATURE_TILE_DESC}>{description}</p>
              </div>
            </div>
            <span
              className={cn(
                HUB_FEATURE_TILE_CHEVRON,
                open ? "rotate-180 text-amber-300/90" : "text-muted-foreground",
              )}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </span>
          </button>
          {!open ? (
            <div className={HUB_FEATURE_TILE_PREVIEW}>
              {preview ? (
                <p className="text-[11px] font-medium text-amber-200/80 line-clamp-1 flex items-center gap-1 min-w-0">
                  <Sparkles className="h-3 w-3 shrink-0 opacity-80 hub-sparkle-glow" />
                  {preview}
                </p>
              ) : (
                <span className="invisible text-[11px]" aria-hidden>
                  .
                </span>
              )}
            </div>
          ) : null}
          {open && (
            <div className="px-3 pb-4 pt-2 border-t border-white/[0.08] animate-in fade-in slide-in-from-top-1 duration-200">
              {previewLocked && childName ? (
                <JourneyPreviewContent childName={childName} isInfant={isInfant}>
                  {children}
                </JourneyPreviewContent>
              ) : (
                children
              )}
            </div>
          )}
        </div>
      </HubShadedCardBody>
    </div>
  );
}

function RoutineLaunchCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const theme = getHubFeatureTileAccent("generate-routine");
  return (
    <AppLink
      href="/routines/generate"
      className={cn("group block h-full overflow-hidden p-0 pl-0", hubShadedSectionCardClasses(theme))}
      data-testid="routine-launch-card"
      data-section-id="generate-routine"
    >
      <HubShadedCardBody theme={theme}>
        <div className={HUB_FEATURE_TILE_LAUNCH_ROW}>
          <div className={cn(HUB_FEATURE_TILE_ICON, theme.emojiShell, "bg-gradient-to-br from-emerald-400 to-teal-500")}>
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div className={HUB_FEATURE_TILE_TEXT}>
            <p className={HUB_FEATURE_TILE_TITLE}>{title}</p>
            <p className={HUB_FEATURE_TILE_DESC}>{description}</p>
          </div>
          <span className="inline-flex h-8 shrink-0 items-center self-center rounded-full bg-primary px-3 text-xs font-black text-primary-foreground transition-transform group-active:scale-95">
            Open
          </span>
        </div>
      </HubShadedCardBody>
    </AppLink>
  );
}

const HUB_QUICK_ACTIONS = [
  { id: "ask-amy",    group: "today",      tileId: "amy-ai",              emoji: "💜", i18n: "parent_hub.quick_actions.ask_amy" },
  { id: "articles",   group: "support",    tileId: "articles",        emoji: "📚", i18n: "parent_hub.quick_actions.articles" },
  { id: "emotional",  group: "support",    tileId: "emotional",       emoji: "❤️", i18n: "parent_hub.quick_actions.emotional" },
  { id: "story",      group: "stories",    tileId: "story-hub",       emoji: "📖", i18n: "parent_hub.quick_actions.story" },
  { id: "phonics",    group: "learning",   tileId: "phonics",         emoji: "🔤", i18n: "parent_hub.quick_actions.phonics" },
  { id: "routine",    group: "today",      tileId: "generate-routine", emoji: "📅", i18n: "parent_hub.quick_actions.routine" },
  { id: "activities", group: "creativity", tileId: "activities",      emoji: "🎨", i18n: "parent_hub.quick_actions.activities" },
  { id: "gaming",     group: "creativity", tileId: "gaming-rewards", emoji: "🎮", i18n: "parent_hub.quick_actions.gaming_reward" },
  { id: "worksheets", group: "creativity", tileId: "worksheets",      emoji: "📄", i18n: "parent_hub.quick_actions.worksheets" },
] as const;

const HUB_QUICK_PRIMARY_IDS = new Set(["ask-amy", "routine", "story"]);

function HubQuickActions({
  onNavigate,
}: {
  onNavigate: (group: string, tileId?: string) => void;
}) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll
    ? HUB_QUICK_ACTIONS
    : HUB_QUICK_ACTIONS.filter((a) => HUB_QUICK_PRIMARY_IDS.has(a.id));

  return (
    <div className="space-y-2" data-testid="hub-quick-actions">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {visible.map(action => (
          <button
            key={action.id}
            type="button"
            onClick={() => onNavigate(action.group, action.tileId)}
            className={cn(HUB_QUICK_CHIP, hubQuickChipTint(action.id))}
          >
            <span aria-hidden>{action.emoji}</span>
            {t(action.i18n)}
          </button>
        ))}
        {!showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={HUB_SEE_ALL_CHIP}
          >
            {t("parent_hub.quick_actions.see_all")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Amy AI Suggestions Section ───────────────────────────────────────────────
const AMY_PROMPT_IDS = ["sleep", "tantrums", "picky", "school", "screen", "language"] as const;
const AMY_PROMPT_EMOJI: Record<typeof AMY_PROMPT_IDS[number], string> = {
  sleep: "😴",
  tantrums: "😤",
  picky: "🥦",
  school: "📚",
  screen: "📱",
  language: "💬"
};
const AMY_PROMPT_TINT: Record<typeof AMY_PROMPT_IDS[number], string> = {
  sleep: "129,140,248",
  tantrums: "244,114,182",
  picky: "52,211,153",
  school: "96,165,250",
  screen: "251,191,36",
  language: "167,139,250",
};
function AmyAISuggestionsSection() {
  const {
    t
  } = useTranslation();
  return <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("parent_hub.amy.lead")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {AMY_PROMPT_IDS.slice(0, 4).map(id => {
        const label = t(`parent_hub.amy.prompts.${id}.label`);
        const prompt = t(`parent_hub.amy.prompts.${id}.prompt`);
        return <AppLink key={id} href={`/assistant?q=${encodeURIComponent(prompt)}`}>
              <HubSubTileLink
                tintRgb={AMY_PROMPT_TINT[id]}
                icon={<span className="text-xl leading-none">{AMY_PROMPT_EMOJI[id]}</span>}
                title={label}
              />
            </AppLink>;
      })}
      </div>
      <AppLink href="/assistant">
        <Button variant="outline" className="w-full rounded-xl gap-2 text-sm font-semibold">
          <AmyIcon size={20} bounce />
          {t("parent_hub.amy.cta")}
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
      </AppLink>
    </div>;
}

// ─── Emotional Support Section ────────────────────────────────────────────────
const EMOTIONAL_CARD_IDS = ["overwhelmed", "anxious", "connect", "break"] as const;
const EMOTIONAL_CARD_EMOJI: Record<typeof EMOTIONAL_CARD_IDS[number], string> = {
  overwhelmed: "🫂",
  anxious: "😰",
  connect: "😔",
  break: "😮‍💨"
};
const EMOTIONAL_CARD_TINT: Record<typeof EMOTIONAL_CARD_IDS[number], string> = {
  overwhelmed: "244,114,182",
  anxious: "167,139,250",
  connect: "251,191,36",
  break: "56,189,248",
};
function EmotionalSupportSection({
  cardOrder,
  moodHighlight = false,
}: {
  cardOrder?: readonly EmotionalCardId[];
  moodHighlight?: boolean;
}) {
  const {
    t
  } = useTranslation();
  const orderedIds = cardOrder ?? EMOTIONAL_CARD_IDS;
  return <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("parent_hub.emotional_footer.lead")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {orderedIds.map((id, idx) => {
        const title = t(`parent_hub.emotional_cards.${id}.title`);
        const subtitle = t(`parent_hub.emotional_cards.${id}.subtitle`);
        const prompt = t(`parent_hub.emotional_cards.${id}.prompt`);
        const isHighlighted = moodHighlight && idx === 0;
        return <SubItemGate key={id} sectionId="hub_emotional" subItemId={id}>
              <AppLink href={`/assistant?q=${encodeURIComponent(prompt)}`}>
                <HubSubTileLink
                  tintRgb={EMOTIONAL_CARD_TINT[id]}
                  highlighted={isHighlighted}
                  icon={<span className="text-2xl leading-none">{EMOTIONAL_CARD_EMOJI[id]}</span>}
                  title={
                    <>
                      {isHighlighted ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-primary mb-1 block">
                          {t("parent_hub.emotional_footer.suggested_for_you")}
                        </span>
                      ) : null}
                      <span className="font-bold text-[15px] leading-snug text-foreground">{title}</span>
                    </>
                  }
                  subtitle={subtitle}
                />
              </AppLink>
            </SubItemGate>;
      })}
      </div>
      <HubSubTileLink
        tintRgb="167,139,250"
        icon={<AmyIcon size={28} bounce />}
        title={t("parent_hub.emotional_footer.reassure_title")}
        subtitle={t("parent_hub.emotional_footer.reassure_body")}
      />

      <AppLink href="/assistant">
        <Button variant="default" className="w-full rounded-xl gap-2 text-sm font-semibold">
          <AmyIcon size={20} bounce />
          {t("parent_hub.emotional_footer.talk_to_amy")}
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
      </AppLink>

      {/* Feedback entry point */}
      <AppLink href="/feedback">
        <HubSubTileLink
          tintRgb="251,191,36"
          icon={<span className="text-xl leading-none">💡</span>}
          title={t("parent_hub.feedback_cta.title", { defaultValue: "Share your ideas with us" })}
          subtitle={t("parent_hub.feedback_cta.subtitle", { defaultValue: "Help shape AmyNest for every family ❤️" })}
          trailing={
            <span className="text-primary text-xs font-semibold shrink-0">→</span>
          }
        />
      </AppLink>
    </div>;
}

// ─── Sub-section tile (Glass + Glow, collapsed by default) ──────────────────
interface SubSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentClass: string;
  /** RGB string "r,g,b" for left→right shade gradient */
  tintRgb?: string;
  /** @deprecated Prefer tintRgb — legacy linear-gradient cardClass still parsed for RGB */
  cardClass?: string;
  /**
   * Optional gating: when set, wraps the entire SubSection with a
   * <SubItemGate> using the given sectionId and the SubSection's title
   * as the sub-item id. This implements the per-section "one free
   * sub-item" rule for free users.
   */
  gateSection?: string;
  children: React.ReactNode;
}
function SubSection({
  icon,
  title,
  description,
  accentClass,
  tintRgb,
  cardClass,
  gateSection,
  children
}: SubSectionProps) {
  const inner = (
    <HubCollapsibleSubTile
      icon={icon}
      title={title}
      description={description}
      accentClass={accentClass}
      tintRgb={tintRgb}
      cardClass={cardClass}
    >
      {children}
    </HubCollapsibleSubTile>
  );
  if (gateSection) {
    return <SubItemGate sectionId={gateSection} subItemId={title}>
        {inner}
      </SubItemGate>;
  }
  return inner;
}

// ─── Activities Section ───────────────────────────────────────────────────────
interface ActivitiesSectionProps {
  ageGroup: AgeGroup;
  effectiveChild: any;
  totalAgeMonths: number;
}
function ActivitiesSection({
  ageGroup,
  effectiveChild,
  totalAgeMonths
}: ActivitiesSectionProps) {
  const {
    t
  } = useTranslation();
  const hubUsage = useFeatureUsage();
  const hubJourney = useHubJourney(effectiveChild?.id);
  const tryFreeFor = (featureId: string) => {
    if (hubUsage.isPremium) return false;
    if (hubJourney.isFreeJourneyPeriod) return true;
    if (hubJourney.access) return !hubJourney.isHubFeatureLocked(featureId);
    return hubUsage.tryFreeFor(featureId);
  };
  const isHubLocked = (featureId: string) => {
    if (hubUsage.isPremium) return false;
    if (hubJourney.access) return hubJourney.isHubFeatureLocked(featureId);
    return hubUsage.isFeatureLocked(featureId);
  };
  const markHubUsed = (featureId: string) => {
    if (!hubJourney.access) hubUsage.markFeatureUsed(featureId);
  };
  const journeySoftLock = hubJourney.isJourneyLocked;
  const isInfant = ageGroup === "infant";
  const isToddlerOrPreschool = ageGroup === "toddler" || ageGroup === "preschool";
  const isOlder = !isInfant && !isToddlerOrPreschool;
  return <div className="space-y-2.5">
      <SubSection gateSection="hub_activities" icon={<AudioLines className="h-4 w-4 text-white" />} title={t("parent_hub.tiles_activity.audio_lessons.title")} description={t("parent_hub.tiles_activity.audio_lessons.desc")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(34,211,238,0.26)0%,rgba(6,182,212,0.12)100%)">
        <p className="text-sm text-muted-foreground mb-3">
          {t("parent_hub.tiles.activities.lead")}
        </p>
        <AppLink href="/audio-lessons" source="hub-audio-lessons">
          <Button className="w-full rounded-xl gap-2 text-sm font-semibold" data-testid="open-audio-lessons">
            {t("pages.audio_lessons.amy_audio_lessons")}
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </AppLink>
      </SubSection>

      <LockedBlock locked={isHubLocked("hub_rewards_shop")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
        <SubSection
          gateSection="hub_activities"
          icon={<Gift className="h-4 w-4 text-white" />}
          title={t("parent_hub.tiles_activity.rewards_shop.title")}
          description={t("parent_hub.tiles_activity.rewards_shop.desc")}
          accentClass="bg-gradient-to-br from-amber-400 to-orange-500"
          cardClass="linear-gradient(135deg,rgba(251,191,36,0.28)0%,rgba(234,179,8,0.12)100%)"
        >
          <div className="flex items-center gap-2 mb-2">
            {tryFreeFor("hub_rewards_shop") ? <TryFreeBadge /> : null}
          </div>
          <AppLink href="/rewards" onClick={() => markHubUsed("hub_rewards_shop")}>
            <Button variant="outline" className="w-full rounded-xl gap-2 text-sm font-semibold" data-testid="open-rewards-shop">
              {t("parent_hub.tiles_activity.rewards_shop.title")}
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </AppLink>
        </SubSection>
      </LockedBlock>

      {/* ── INFANT ─────────────────────────────────────────────────────── */}
      {isInfant && <>
          <SubSection gateSection="hub_activities" icon={<Baby className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.baby-activities.title")} description={t("parent_hub.subsections.baby-activities.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(244,114,182,0.26)0%,rgba(251,113,133,0.12)100%)">
            <InfantModeShortcuts
              childId={effectiveChild.id}
              childName={effectiveChild.name}
              ageMonths={totalAgeMonths}
            />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<Lightbulb className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.amazing-facts-baby.title")} description={t("parent_hub.subsections.amazing-facts-baby.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(251,191,36,0.26)0%,rgba(234,179,8,0.12)100%)">
            <AmazingFacts childName={effectiveChild.name} ageGroup={ageGroup} />
          </SubSection>
        </>}

      {/* ── TODDLER / PRESCHOOL ────────────────────────────────────────── */}
      {isToddlerOrPreschool && <>
          <SubSection gateSection="hub_activities" icon={<Star className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.daily-activity.title")} description={t("parent_hub.subsections.daily-activity.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(250,204,21,0.26)0%,rgba(251,146,60,0.12)100%)">
            <DailyKidsActivity childName={effectiveChild.name} ageMonths={totalAgeMonths} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<Brain className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.skills-to-focus-toddler.title")} description={t("parent_hub.subsections.skills-to-focus-toddler.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(129,140,248,0.26)0%,rgba(168,85,247,0.12)100%)">
            <ToddlerPreschoolMode ageGroup={ageGroup as "toddler" | "preschool"} childName={effectiveChild.name} ageYears={effectiveChild.age} ageMonths={(effectiveChild as any).ageMonths ?? 0} showOnly="skill" />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<BookOpen className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.story-time.title")} description={t("parent_hub.subsections.story-time.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(96,165,250,0.26)0%,rgba(99,102,241,0.12)100%)">
            <DailyStorySection ageMonths={totalAgeMonths} childName={effectiveChild.name} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<Gamepad2 className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.fun-and-play.title")} description={t("parent_hub.subsections.fun-and-play.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(52,211,153,0.26)0%,rgba(34,197,94,0.12)100%)">
            <ToddlerPreschoolMode ageGroup={ageGroup as "toddler" | "preschool"} childName={effectiveChild.name} ageYears={effectiveChild.age} ageMonths={(effectiveChild as any).ageMonths ?? 0} showOnly="fun" />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<ScrollText className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.parent-tasks-toddler.title")} description={t("parent_hub.subsections.parent-tasks-toddler.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(45,212,191,0.26)0%,rgba(34,211,238,0.12)100%)">
            <ToddlerPreschoolMode ageGroup={ageGroup as "toddler" | "preschool"} childName={effectiveChild.name} ageYears={effectiveChild.age} ageMonths={(effectiveChild as any).ageMonths ?? 0} showOnly="task" />
          </SubSection>

          {ageGroup === "preschool" && <SubSection gateSection="hub_activities" icon={<LayoutGrid className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.daily-puzzle-pre.title")} description={t("parent_hub.subsections.daily-puzzle-pre.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(56,189,248,0.26)0%,rgba(59,130,246,0.12)100%)">
              <DailyPuzzle childName={effectiveChild.name} ageGroup={ageGroup} ageYears={effectiveChild.age} />
            </SubSection>}

          <SubSection gateSection="hub_activities" icon={<Lightbulb className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.amazing-facts-toddler.title")} description={t("parent_hub.subsections.amazing-facts-toddler.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(251,191,36,0.26)0%,rgba(234,179,8,0.12)100%)">
            <AmazingFacts childName={effectiveChild.name} ageGroup={ageGroup} />
          </SubSection>
        </>}

      {/* ── OLDER KIDS ─────────────────────────────────────────────────── */}
      {isOlder && <>
          {totalAgeMonths < 96 && <SubSection gateSection="hub_activities" icon={<Star className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.daily-activity-older.title")} description={t("parent_hub.subsections.daily-activity-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(250,204,21,0.26)0%,rgba(251,146,60,0.12)100%)">
              <DailyKidsActivity childName={effectiveChild.name} ageMonths={totalAgeMonths} />
            </SubSection>}

          <SubSection gateSection="hub_activities" icon={<Brain className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.skills-to-focus-older.title")} description={t("parent_hub.subsections.skills-to-focus-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(129,140,248,0.26)0%,rgba(168,85,247,0.12)100%)">
            <SkillFocusSection group={ageGroup} childName={effectiveChild.name} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<BookOpen className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.story-time-older.title")} description={t("parent_hub.subsections.story-time-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(96,165,250,0.26)0%,rgba(99,102,241,0.12)100%)">
            <DailyStorySection ageMonths={totalAgeMonths} childName={effectiveChild.name} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<LayoutGrid className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.daily-puzzle-older.title")} description={t("parent_hub.subsections.daily-puzzle-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(56,189,248,0.26)0%,rgba(59,130,246,0.12)100%)">
            <DailyPuzzle childName={effectiveChild.name} ageGroup={ageGroup} ageYears={effectiveChild.age} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<ScrollText className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.parent-tasks-older.title")} description={t("parent_hub.subsections.parent-tasks-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(45,212,191,0.26)0%,rgba(34,211,238,0.12)100%)">
            <ParentTasksSection group={ageGroup} childName={effectiveChild.name} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<Lightbulb className="h-4 w-4 text-white" />} title={t("parent_hub.subsections.amazing-facts-older.title")} description={t("parent_hub.subsections.amazing-facts-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" cardClass="linear-gradient(135deg,rgba(251,191,36,0.26)0%,rgba(234,179,8,0.12)100%)">
            <AmazingFacts childName={effectiveChild.name} ageGroup={ageGroup} />
          </SubSection>
        </>}

    </div>;
}

// ─── Child Selector Panel ─────────────────────────────────────────────────────
const AVATAR_COLORS = ["from-primary to-primary", "from-primary to-primary", "from-primary to-primary", "from-primary to-primary", "from-primary to-primary"];
function ChildSelectorPanel({
  childList,
  effectiveChild,
  onSelect
}: {
  childList: any[];
  effectiveChild: any;
  onSelect: (id: number) => void;
}) {
  const {
    t
  } = useTranslation();
  if ((childList ?? []).length === 0) {
    return <div className="text-xs text-muted-foreground px-4 py-2">Loading...</div>;
  }
  const safeChildList = childList ?? [];
  const getInitials = (name: string) => name.trim().split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const getAge = (child: any) => {
    const months = child.ageMonths ?? 0;
    if (child.age === 0) return `${months}m`;
    if (months > 0) return `${child.age}y ${months}m`;
    return `${child.age}y`;
  };
  return <div className={cn(HUB_GLASS_CARD, "overflow-hidden p-0 active:scale-100")}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">
            {safeChildList.length === 1 ? t("parent_hub.headers.current_child") : t("parent_hub.headers.select_child")}
          </span>
        </div>
        <AppLink href="/children/new">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            <UserPlus className="h-3.5 w-3.5" />
            {t("parent_hub.headers.add_child")}
          </button>
        </AppLink>
      </div>

      {/* Child cards */}
      <div className="flex gap-3 px-3 pb-3 overflow-x-auto scrollbar-none">
        {(safeChildList ?? []).map((child: any, idx: number) => {
        const group = getAgeGroup(child?.age ?? 0, (child as any)?.ageMonths ?? 0);
        const info = getAgeGroupInfo(group);
        const isSelected = effectiveChild?.id === child?.id;
        const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
        const initials = getInitials(child?.name ?? "Child");
        const ageLabel = getAge(child);
        return <button key={child?.id ?? idx} onClick={() => onSelect(child.id)} className={cn("shrink-0 relative flex flex-col items-center gap-2 rounded-2xl px-4 py-3 min-w-[96px] transition-all duration-[220ms] ease-[ease]", isSelected ? "border-2 border-violet-400/50 bg-violet-500/10 shadow-[0_0_24px_rgba(168,85,247,0.28)]" : "border border-white/10 bg-white/[0.04] hover:border-white/20 hover:shadow-[0_0_16px_rgba(168,85,247,0.12)]")}>
              {/* Selected check */}
              {isSelected && <span className="absolute top-2 right-2">
                  <CheckCircle2 className="h-4 w-4 text-primary fill-primary/20" />
                </span>}

              {/* Avatar */}
              <div className={["w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base", "bg-gradient-to-br shadow-md ring-2", colorClass, isSelected ? "ring-primary/60" : "ring-white dark:ring-white/10"].join(" ")}>
                {initials}
              </div>

              {/* Info */}
              <div className="text-center min-w-0 w-full">
                <p className={`font-bold text-sm truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {child?.name ?? "Child"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {info.emoji} {ageLabel}
                </p>
              </div>

              {/* Active chip */}
              {isSelected && <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80 bg-primary/10 rounded-full px-2 py-0.5">
                  {t("pages.parenting_hub.viewing")}
                </span>}
            </button>;
      })}
      </div>
    </div>;
}

// ─── Infant 3-day trial intro banner ─────────────────────────────────────────
function InfantTrialBanner({ childName }: { childName: string }) {
  const { t } = useTranslation();
  return (
    <div
      data-testid="infant-trial-banner"
      className={cn(
        HUB_GLASS_CARD,
        "overflow-hidden p-0 pl-0 active:scale-100",
        "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(56,189,248,0.14)]",
      )}
    >
      <div className="flex min-w-0">
        <div className="w-1.5 shrink-0 self-stretch bg-gradient-to-b from-sky-400 via-cyan-400 to-blue-500" aria-hidden />
        <div className="px-4 py-3.5 flex-1 flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center shadow-[0_0_14px_rgba(56,189,248,0.35)] ring-1 ring-white/20">
            <Baby className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground leading-snug">
              {t("parent_hub.journey.infant.trial_intro", { name: childName })}
            </p>
            <p className={cn(HUB_BODY, "mt-0")}>
              {t("parent_hub.journey.infant.trial_intro_cta")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function ParentingHubPage() {
  const {
    t
  } = useTranslation();
  const {
    data: children = [],
    isLoading
  } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey()
    }
  });
  const STORAGE_KEY = "amynest:hub:activeChildId";
  const [selectedChildId, setSelectedChildId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? Number(saved) : null;
    }
    return null;
  });
  const childList = (children ?? []) as any[];
  const effectiveChild = selectedChildId ? childList.find((c: any) => c.id === selectedChildId) ?? childList[0] : childList[0];
  const ageGroup: AgeGroup | null = effectiveChild ? getAgeGroup(effectiveChild.age, (effectiveChild as any).ageMonths ?? 0) : null;
  const totalAgeMonths = effectiveChild ? effectiveChild.age * 12 + ((effectiveChild as any).ageMonths ?? 0) : 0;
  const isInfant = totalAgeMonths < 24;
  const isTwoPlus = totalAgeMonths >= 24;

  // Hub Journey: 3 guided free days → paywall (replaces per-tile quota for hub features).
  const hubJourney = useHubJourney(effectiveChild?.id);
  const learningProgress = useLearningProgress(effectiveChild?.id);
  const rewardCelebrations = useRewardCelebrations();
  const { trackNextSessionOpened } = useRecordLearningActivity(effectiveChild?.id, {
    onRewards: rewardCelebrations.celebrate,
  });
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const [learningPanelOpen, setLearningPanelOpen] = useState(false);
  const learningPanelRef = useRef<HTMLDivElement>(null);

  const openLearningPanel = useCallback(() => {
    setLearningPanelOpen(true);
    window.setTimeout(() => {
      learningPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

  const handleSessionStep = async (stepId: string) => {
    const result = await learningProgress.completeSessionStep(stepId);
    if (result.rewardEvents?.length) {
      rewardCelebrations.celebrate(result.rewardEvents);
    }
    if (result.sessionComplete) {
      setShowSessionComplete(true);
      setLearningPanelOpen(true);
    }
  };
  const hubUsage = useFeatureUsage();
  const authFetch = useAuthFetch();

  useEffect(() => {
    if (!effectiveChild || !ageGroup) return;
    warmParentHubVisibleContent(authFetch, {
      ageGroup,
      ageMonths: totalAgeMonths,
      childName: effectiveChild.name,
    });
  }, [authFetch, effectiveChild?.id, effectiveChild?.name, ageGroup, totalAgeMonths]);

  const isHubLocked = useCallback(
    (featureId: string) => {
      if (hubUsage.isPremium) return false;
      if (hubJourney.access) return hubJourney.isHubFeatureLocked(featureId);
      return hubUsage.isFeatureLocked(featureId);
    },
    [hubUsage, hubJourney],
  );

  const tryFreeFor = useCallback(
    (featureId: string) => {
      if (hubUsage.isPremium) return false;
      if (hubJourney.isFreeJourneyPeriod) return true;
      if (hubJourney.access) return !hubJourney.isHubFeatureLocked(featureId);
      return hubUsage.tryFreeFor(featureId);
    },
    [hubUsage, hubJourney],
  );

  const markHubUsed = useCallback(
    (featureId: string) => {
      if (!hubJourney.access) hubUsage.markFeatureUsed(featureId);
    },
    [hubUsage, hubJourney],
  );

  const journeySoftLock = hubJourney.isJourneyLocked;

  // Section-group expand/collapse — all groups collapsed by default; persisted.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(loadExpandedGroups);
  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      persistExpandedGroups(next);
      return next;
    });
  };
  const navigateHub = (group: string, tileId?: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.add(group);
      persistExpandedGroups(next);
      return next;
    });
    requestAnimationFrame(() => {
      if (tileId) {
        document.querySelector(`[data-section-id="${tileId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        document.getElementById(`hub-group-${group}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const handleChildSelect = (id: number) => {
    setSelectedChildId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return <div className="flex items-center justify-center py-24">
        <div className="text-sm text-muted-foreground animate-pulse">{t("common.loading")}</div>
      </div>;
  }

  // ── No children ───────────────────────────────────────────────────────────
  if (childList.length === 0) {
    return <div className="max-w-2xl mx-auto space-y-6">{/* keep narrow for empty state */}
        <PageHeader />
        <Card className="rounded-3xl border-2 border-dashed">
          <CardContent className="p-10 text-center space-y-4">
            <AmyIcon size={56} bounce />
            <h3 className="font-bold text-lg">{t("parent_hub.empty.heading")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("parent_hub.empty.body")}
            </p>
            <AppLink href="/children/new">
              <button className="mt-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {t("parent_hub.empty.cta")}
              </button>
            </AppLink>
          </CardContent>
        </Card>
      </div>;
  }

  // ── Two-section layout: For You (current band) + Early Access (2+ modules) ──
  const currentBand: AgeBand | null = effectiveChild ? getAgeBand(effectiveChild.age, (effectiveChild as any).ageMonths ?? 0) : null;
  const nextBand: AgeBand | null = currentBand ? getNextAgeBand(currentBand) : null;
  const showSection2 = shouldShowExploreSection(totalAgeMonths, currentBand, nextBand);
  const previousBand: AgeBand | null = currentBand ? getPreviousAgeBand(currentBand) : null;
  const showPreviousStage = shouldShowPreviousStageSection(totalAgeMonths, currentBand);
  const earlyAccessBypass = shouldBypassHubMonthGates(totalAgeMonths, currentBand, nextBand);

  /** Which hub surface is calling section.render() — drives infant-only tiles in Previous Stage. */
  const hubSurface = { current: "main" as "main" | "previous" | "early" };

  const ptmSeason = isPtmSeason();
  const adaptiveMood = effectiveChild ? getAdaptiveMood(effectiveChild.id) : "neutral";
  const emotionalCardOrder = orderEmotionalCards(adaptiveMood);
  const moodHighlight = adaptiveMood === "low";
  const lifeSkillPreview = effectiveChild
    ? getLifeSkillPreviewText(effectiveChild.age, effectiveChild.id)
    : null;
  const ptmPreview = getPtmPreviewText();
  const featuredArticle = hubJourney.status?.articleOfDay ?? getArticlesForAgeMonths(totalAgeMonths)[0];
  const articlePreview = featuredArticle
    ? t("parent_hub.support.article_preview", { title: featuredArticle.title })
    : undefined;

  useEffect(() => {
    if (!effectiveChild || !currentBand) return;
    const frame = requestAnimationFrame(() => {
      applyParentingHubDeepLink(navigateHub);
    });
    return () => cancelAnimationFrame(frame);
  }, [effectiveChild?.id, currentBand]);

  type SectionEntry = {
    id: string;
    /** Always renders in "For You" regardless of band. */
    alwaysCurrent?: boolean;
    /** Bands this section is appropriate for. Required when !alwaysCurrent. */
    bands?: AgeBand[];
    /** Render full-width above the grid (only honoured in "For You"). */
    featured?: boolean;
    render: () => React.ReactNode;
  };
  const sections: SectionEntry[] = effectiveChild ? [
  // ── FEATURED (full-width, always-current) ─────────────────────────────
  {
    id: "command-center",
    alwaysCurrent: true,
    render: () => (
      <HubFamilyPulseSection
        childId={effectiveChild.id}
        childName={effectiveChild.name}
      />
    ),
  },
  // ── INFANT HUB (band-restricted, featured) ────────────────────────────
  // ONLY shown when the currently selected child is 0–24 months.
  {
    id: "infant-hub",
    bands: ["0-2"],
    featured: true,
    render: () => {
      if (!isInfant && hubSurface.current !== "previous") return null;
      const infantMonths = hubSurface.current === "previous"
        ? Math.min(totalAgeMonths, 23)
        : totalAgeMonths;
      return <InfantHub childId={effectiveChild.id} childName={effectiveChild.name} ageMonths={infantMonths} />;
    }
  }, {
    id: "tomorrow-forecast",
    alwaysCurrent: true,
    render: () => {
      return <HubSection id="tomorrow-forecast" icon={<Moon className="h-5 w-5 text-white" />} title={t("parent_hub.web_tiles.tomorrow-forecast.title")} description={t("parent_hub.web_tiles.tomorrow-forecast.description")} accentClass="bg-gradient-to-br from-sky-400 to-cyan-500" cardClass="linear-gradient(135deg,rgba(56,189,248,0.30)0%,rgba(34,211,238,0.14)100%)" defaultOpen={false}> {/* audit-ok: brand tile accent gradient */}
          <FuturePredictor childId={effectiveChild.id} />
        </HubSection>;
    }
  },
  // ── Amy tutors (learning routes) ─────────────────────────────────────
  {
    id: "amy-learning-tutor",
    alwaysCurrent: true,
    render: () => (
      <HubLaunchCard
        href="/learn-with-amy"
        title={t("parent_hub.web_tiles.amy-learning-tutor.title")}
        description={t("parent_hub.web_tiles.amy-learning-tutor.description")}
        icon={<GraduationCap className="h-5 w-5 text-white" />}
        accentClass="bg-gradient-to-br from-violet-500 to-indigo-600"
        cardClass="bg-gradient-to-br from-violet-500/30 to-indigo-600/15 hover:shadow-[0_10px_36px_-10px_rgba(99,102,241,0.45)]"
        testId="amy-learning-tutor-launch-card"
        sectionId="amy-learning-tutor"
      />
    ),
  },
  {
    id: "amy-quick-tutor",
    alwaysCurrent: true,
    render: () => (
      <HubLaunchCard
        href="/amy-ai-tutor"
        title={t("parent_hub.web_tiles.amy-quick-tutor.title")}
        description={t("parent_hub.web_tiles.amy-quick-tutor.description")}
        icon={<Sparkles className="h-5 w-5 text-white" />}
        accentClass="bg-gradient-to-br from-fuchsia-500 to-purple-600"
        cardClass="bg-gradient-to-br from-fuchsia-500/30 to-purple-600/15 hover:shadow-[0_10px_36px_-10px_rgba(192,38,211,0.45)]"
        testId="amy-quick-tutor-launch-card"
        sectionId="amy-quick-tutor"
      />
    ),
  },
  // ── Smart Math Tricks (age 2–8, full-screen route) ───────────────────
  {
    id: "smart-math-tricks",
    bands: ["2-4", "4-6", "6-8"] as AgeBand[],
    render: () => {
      if (!ageGroup && !isTwoPlus && !earlyAccessBypass) return null;
      return (
        <LockedBlock reason="hub_locked" locked={isHubLocked("hub_smart_math_tricks")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubLaunchCard
            href="/smart-math-tricks"
            title={t("parent_hub.web_tiles.smart-math-tricks.title")}
            description={t("parent_hub.web_tiles.smart-math-tricks.description")}
            icon={<Sparkles className="h-5 w-5 text-white" />}
            accentClass="bg-gradient-to-br from-orange-400 to-amber-500"
            cardClass="bg-gradient-to-br from-orange-400/30 to-amber-500/15 hover:shadow-[0_10px_36px_-10px_rgba(251,146,60,0.45)]"
            tryFree={tryFreeFor("hub_smart_math_tricks")}
            testId="smart-math-tricks-launch-card"
            sectionId="smart-math-tricks"
          />
        </LockedBlock>
      );
    }
  },
  // ── Abacus PRO Zone (age 2–10, full-screen route) ────────────────────
  {
    id: "abacus",
    bands: ["2-4", "4-6", "6-8", "8-10"] as AgeBand[],
    render: () => {
      if (!ageGroup && !isTwoPlus && !earlyAccessBypass) return null;
      return (
        <LockedBlock reason="hub_locked" locked={isHubLocked("hub_abacus")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubLaunchCard
            href="/abacus"
            title={t("pages.parenting_hub.abacus_pro_zone")}
            description="Learn the soroban — beads, brain & speed math"
            icon={<Sparkles className="h-5 w-5 text-white" />}
            accentClass="bg-gradient-to-br from-teal-400 to-cyan-500"
            cardClass="bg-gradient-to-br from-teal-400/30 to-cyan-500/15 hover:shadow-[0_10px_36px_-10px_rgba(45,212,191,0.45)]"
            tryFree={tryFreeFor("hub_abacus")}
            testId="abacus-launch-card"
            sectionId="abacus"
          />
        </LockedBlock>
      );
    }
  },
  // ── GRID — always-current ─────────────────────────────────────────────
  {
    id: "amy-ai",
    alwaysCurrent: true,
    render: () => {
      return <HubSection id="amy-ai" highlighted icon={<AmyIcon size={22} bounce />} title={t("parent_hub.web_tiles.amy-ai.title")} description={t("parent_hub.web_tiles.amy-ai.description")} accentClass="bg-gradient-to-br from-violet-500 to-purple-600" cardClass="linear-gradient(135deg,rgba(139,92,246,0.30)0%,rgba(217,70,239,0.14)100%)" defaultOpen={false}> {/* audit-ok: brand tile accent gradient */}
          <AmyAISuggestionsSection />
        </HubSection>;
    }
  }, {
    id: "generate-routine",
    alwaysCurrent: true,
    render: () => {
      return (
        <RoutineLaunchCard
          title={t("parent_hub.web_tiles.generate-routine.title")}
          description={t("parent_hub.web_tiles.generate-routine.description")}
        />
      );
    }
  }, {
    id: "articles",
    alwaysCurrent: true,
    render: () => {
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_articles")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="articles" icon={<BookOpen className="h-5 w-5 text-white" />} title={t("parent_hub.web_tiles.articles.title")} description={t("parent_hub.web_tiles.articles.description")} accentClass="bg-gradient-to-br from-blue-500 to-indigo-600" cardClass="linear-gradient(135deg,rgba(59,130,246,0.30)0%,rgba(99,102,241,0.14)100%)" tryFree={tryFreeFor("hub_articles")} preview={articlePreview} onOpen={() => markHubUsed("hub_articles")}> {/* audit-ok: brand tile accent gradient */}
            <ParentingArticles childAgeMonths={totalAgeMonths} compact />
          </HubSection>
        </LockedBlock>;
    }
  }, {
    id: "daily-tips",
    alwaysCurrent: true,
    render: () => {
      if (!ageGroup && !isTwoPlus) return null;
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_tips")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="daily-tips" icon={<Lightbulb className="h-5 w-5 text-white" />} title={t("parent_hub.web_tiles.daily-tips.title")} description={t("parent_hub.web_tiles.daily-tips.description")} accentClass="bg-gradient-to-br from-amber-400 to-yellow-500" cardClass="linear-gradient(135deg,rgba(251,191,36,0.30)0%,rgba(234,179,8,0.14)100%)" tryFree={tryFreeFor("hub_tips")} onOpen={() => markHubUsed("hub_tips")}> {/* audit-ok: brand tile accent gradient */}
            <DailyTips ageGroup={ageGroup!} childName={effectiveChild.name} />
          </HubSection>
        </LockedBlock>;
    }
  }, {
    id: "emotional",
    alwaysCurrent: true,
    render: () => {
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_emotional")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="emotional" icon={<Heart className="h-5 w-5 text-white" />} title={t("parent_hub.web_tiles.emotional.title")} description={t("parent_hub.web_tiles.emotional.description")} accentClass="bg-gradient-to-br from-rose-400 to-pink-500" cardClass="linear-gradient(135deg,rgba(251,113,133,0.30)0%,rgba(236,72,153,0.14)100%)" tryFree={tryFreeFor("hub_emotional")} preview={moodHighlight ? t("parent_hub.support.emotional_mood_preview") : undefined} onOpen={() => markHubUsed("hub_emotional")}> {/* audit-ok: brand tile accent gradient */}
            <EmotionalSupportSection cardOrder={emotionalCardOrder} moodHighlight={moodHighlight} />
          </HubSection>
        </LockedBlock>;
    }
  }, {
    id: "new-parent-tips",
    alwaysCurrent: true,
    render: () => {
      const showTips = isInfant || hubSurface.current === "previous";
      if (!showTips) return null;
      const tipsAgeGroup: AgeGroup = hubSurface.current === "previous" ? "infant" : ageGroup!;
      return (
        <HubSection
          id="new-parent-tips"
          icon={<Baby className="h-5 w-5 text-white" />}
          title={t("parent_hub.web_tiles.new-parent-tips.title")}
          description={t("parent_hub.web_tiles.new-parent-tips.description")}
          accentClass="bg-gradient-to-br from-rose-300 to-pink-400"
          cardClass="linear-gradient(135deg,rgba(253,164,175,0.30)0%,rgba(244,114,182,0.14)100%)"
        >
          <NewParentTipsSection ageGroup={tipsAgeGroup} />
        </HubSection>
      );
    }
  }, {
    id: "activities",
    alwaysCurrent: true,
    render: () => {
      if (!ageGroup && !isTwoPlus) return null;
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_activities")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="activities" icon={<Palette className="h-5 w-5 text-white" />} title={t("parent_hub.web_tiles.activities.title")} description={t("parent_hub.web_tiles.activities.description")} accentClass="bg-gradient-to-br from-emerald-400 to-green-500" cardClass="linear-gradient(135deg,rgba(52,211,153,0.30)0%,rgba(34,197,94,0.14)100%)" tryFree={tryFreeFor("hub_activities")} onOpen={() => markHubUsed("hub_activities")}> {/* audit-ok: brand tile accent gradient */}
            <ActivitiesSection ageGroup={ageGroup!} effectiveChild={effectiveChild} totalAgeMonths={totalAgeMonths} />
          </HubSection>
        </LockedBlock>;
    }
  },
  {
    id: "gaming-rewards",
    alwaysCurrent: true,
    render: () => {
      if (!ageGroup && !isTwoPlus) return null;
      return (
        <LockedBlock reason="hub_locked" locked={isHubLocked("hub_gaming_rewards")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubLaunchCard
            href="/games"
            title={t("parent_hub.web_tiles.gaming-rewards.title")}
            description={t("parent_hub.web_tiles.gaming-rewards.description")}
            icon={<Gamepad2 className="h-5 w-5 text-white" />}
            accentClass="bg-gradient-to-br from-violet-500 to-purple-600"
            cardClass="bg-gradient-to-br from-violet-500/30 to-purple-600/15 hover:shadow-[0_10px_36px_-10px_rgba(139,92,246,0.45)]"
            tryFree={tryFreeFor("hub_gaming_rewards")}
            testId="gaming-rewards-launch-card"
            sectionId="gaming-rewards"
            onNavigate={() => markHubUsed("hub_gaming_rewards")}
          />
        </LockedBlock>
      );
    }
  },
  // ── Art & Craft Videos (always-current, standalone tile) ─────────────
  {
    id: "art-craft",
    alwaysCurrent: true,
    render: () => {
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_art_craft")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="art-craft" icon={<Palette className="h-5 w-5 text-white" />} title={t("parent_hub.web_tiles.art-craft.title")} description={t("parent_hub.web_tiles.art-craft.description")} accentClass="bg-gradient-to-br from-orange-400 to-red-500" cardClass="linear-gradient(135deg,rgba(251,146,60,0.30)0%,rgba(239,68,68,0.14)100%)" tryFree={tryFreeFor("hub_art_craft")} onOpen={() => markHubUsed("hub_art_craft")}> {/* audit-ok: brand tile accent gradient */}
            <ArtCraftReels />
          </HubSection>
        </LockedBlock>;
    }
  },
  {
    id: "worksheets",
    alwaysCurrent: true,
    render: () => {
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_worksheets")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="worksheets" icon={<FileDown className="h-5 w-5 text-white" />} title={t("parent_hub.tiles.worksheets.title")} description={t("parent_hub.tiles.worksheets.desc")} accentClass="bg-gradient-to-br from-sky-400 to-indigo-500" cardClass="linear-gradient(135deg,rgba(56,189,248,0.30)0%,rgba(99,102,241,0.14)100%)" tryFree={tryFreeFor("hub_worksheets")} onOpen={() => markHubUsed("hub_worksheets")}> {/* audit-ok: brand tile accent gradient */}
            <PrintableWorksheets childAgeMonths={totalAgeMonths} childId={effectiveChild.id} />
          </HubSection>
        </LockedBlock>;
    }
  },
  // ── GRID — band-based ─────────────────────────────────────────────────
  {
    id: "story-hub",
    bands: ["0-2", "2-4", "4-6", "6-8"],
    render: () => {
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_story_hub")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="story-hub" icon={<Film className="h-5 w-5 text-white" />} title={t("parent_hub.web_tiles.story-hub.title")} description={t("parent_hub.web_tiles.story-hub.description")} accentClass="bg-gradient-to-br from-purple-500 to-fuchsia-600" cardClass="linear-gradient(135deg,rgba(168,85,247,0.30)0%,rgba(217,70,239,0.14)100%)" tryFree={tryFreeFor("hub_story_hub")} onOpen={() => markHubUsed("hub_story_hub")}> {/* audit-ok: brand tile accent gradient */}
            <StoryHub childId={effectiveChild.id} childName={effectiveChild.name} />
          </HubSection>
        </LockedBlock>;
    }
  }, {
    id: "phonics",
    bands: ["2-4", "4-6"],
    render: () => {
      if (!shouldRenderHubTileContent("phonics", totalAgeMonths, isTwoPlus || earlyAccessBypass)) return null;
      return (
        <LockedBlock reason="hub_locked" locked={isHubLocked("hub_phonics")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          {isPhonicsModuleAvailable() ? (
          <HubLaunchCard
            href="/phonics"
            title={t("parent_hub.web_tiles.phonics.title")}
            description={t("parent_hub.web_tiles.phonics.description")}
            icon={<AudioLines className="h-5 w-5 text-white" />}
            accentClass="bg-gradient-to-br from-sky-400 to-blue-500"
            cardClass="bg-gradient-to-br from-sky-400/30 to-blue-500/15 hover:shadow-[0_10px_36px_-10px_rgba(56,189,248,0.45)]"
            tryFree={tryFreeFor("hub_phonics")}
            testId="phonics-launch-card"
            sectionId="phonics"
          />
          ) : (
            <PhonicsUnavailableFallback compact />
          )}
        </LockedBlock>
      );
    }
  }, {
    id: "ptm-prep",
    bands: ["4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      if (!shouldRenderHubTileContent("ptm-prep", totalAgeMonths, isTwoPlus || earlyAccessBypass)) return null;
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_ptm_prep")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="ptm-prep" highlighted={ptmSeason} icon={<ClipboardList className="h-5 w-5 text-white" />} title={t("parent_hub.web_tiles.ptm-prep.title")} description={t("parent_hub.web_tiles.ptm-prep.description")} accentClass="bg-gradient-to-br from-slate-500 to-blue-600" cardClass="linear-gradient(135deg,rgba(100,116,139,0.30)0%,rgba(37,99,235,0.14)100%)" tryFree={tryFreeFor("hub_ptm_prep")} preview={ptmPreview ?? (ptmSeason ? t("parent_hub.support.ptm_season_preview") : undefined)} onOpen={() => markHubUsed("hub_ptm_prep")}> {/* audit-ok: brand tile accent gradient */}
            <PtmPrepAssistant child={{
            id: effectiveChild.id,
            name: effectiveChild.name,
            age: effectiveChild.age
          }} />
          </HubSection>
        </LockedBlock>;
    }
  }, {
    id: "smart-study",
    bands: ["4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      if (!shouldRenderHubTileContent("smart-study", totalAgeMonths, isTwoPlus || earlyAccessBypass)) return null;
      return (
        <LockedBlock reason="hub_locked" locked={isHubLocked("hub_smart_study")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubLaunchCard
            href="/study"
            title={t("parent_hub.web_tiles.smart-study.title")}
            description={t("parent_hub.web_tiles.smart-study.description")}
            icon={<GraduationCap className="h-5 w-5 text-white" />}
            accentClass="bg-gradient-to-br from-fuchsia-500 to-violet-600"
            cardClass="bg-gradient-to-br from-fuchsia-500/30 to-violet-600/15 hover:shadow-[0_10px_36px_-10px_rgba(192,38,211,0.45)]"
            tryFree={tryFreeFor("hub_smart_study")}
            testId="smart-study-launch-card"
            sectionId="smart-study"
            onNavigate={() => markHubUsed("hub_smart_study")}
          />
        </LockedBlock>
      );
    }
  }, {
    // ── Spelling Mastery — full-screen route ───────────────────────────
    id: "spelling-mastery",
    bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      if (!shouldRenderHubTileContent("spelling-mastery", totalAgeMonths, isTwoPlus)) return null;
      return (
        <LockedBlock reason="hub_locked" locked={isHubLocked("hub_spelling_mastery")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubLaunchCard
            href="/spelling"
            title={t("parent_hub.web_tiles.spelling-mastery.title")}
            description={t("parent_hub.web_tiles.spelling-mastery.description")}
            icon={<GraduationCap className="h-5 w-5 text-white" />}
            accentClass="bg-gradient-to-br from-green-400 to-teal-500"
            cardClass="bg-gradient-to-br from-green-400/30 to-teal-500/15 hover:shadow-[0_10px_36px_-10px_rgba(74,222,128,0.45)]"
            tryFree={tryFreeFor("hub_spelling_mastery")}
            testId="spelling-mastery-launch-card"
            sectionId="spelling-mastery"
          />
        </LockedBlock>
      );
    }
  }, {
    id: "olympiad",
    bands: ["4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      if (!shouldRenderHubTileContent("olympiad", totalAgeMonths, isTwoPlus || earlyAccessBypass)) return null;
      return (
        <LockedBlock reason="hub_locked" locked={isHubLocked("hub_olympiad")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubLaunchCard
            href="/olympiad"
            title={t("parent_hub.web_tiles.olympiad.title")}
            description={t("parent_hub.web_tiles.olympiad.description")}
            icon={<Trophy className="h-5 w-5 text-white" />}
            accentClass="bg-gradient-to-br from-yellow-400 to-amber-500"
            cardClass="bg-gradient-to-br from-yellow-400/30 to-amber-500/15 hover:shadow-[0_10px_36px_-10px_rgba(250,204,21,0.45)]"
            tryFree={tryFreeFor("hub_olympiad")}
            testId="olympiad-launch-card"
            sectionId="olympiad"
          />
        </LockedBlock>
      );
    }
  }, {
    id: "life-skills",
    bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      if (!shouldRenderHubTileContent("life-skills", totalAgeMonths, isTwoPlus || earlyAccessBypass)) return null;
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_life_skills")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="life-skills" icon={<Compass className="h-5 w-5 text-white" />} title={t("parent_hub.web_tiles.life-skills.title")} description={t("parent_hub.web_tiles.life-skills.description")} accentClass="bg-gradient-to-br from-emerald-400 to-cyan-500" cardClass="linear-gradient(135deg,rgba(52,211,153,0.30)0%,rgba(34,211,238,0.14)100%)" tryFree={tryFreeFor("hub_life_skills")} preview={lifeSkillPreview ? t("parent_hub.support.life_skill_preview", { skill: lifeSkillPreview }) : undefined} onOpen={() => markHubUsed("hub_life_skills")}> {/* audit-ok: brand tile accent gradient */}
            <LifeSkillsZone child={{
            id: effectiveChild.id,
            name: effectiveChild.name,
            age: effectiveChild.age
          }} />
          </HubSection>
        </LockedBlock>;
    }
  }, {
    // Coloring Books — Google-Drive-backed PDF library. Shows for age
    // 2+ only (early-access tile in Section 2 covers the 0-2 band). Daily
    // download cap (2/day per child) and the "never repeat" rule are
    // enforced server-side in artifacts/api-server/src/routes/coloring.ts.
    id: "coloring-books",
    bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      if (!shouldRenderHubTileContent("coloring-books", totalAgeMonths, isTwoPlus || earlyAccessBypass)) return null;
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_coloring_books")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="coloring-books" icon={<Palette className="h-5 w-5 text-white" />} title={t("parent_hub.web_tiles.coloring-books.title")} description={t("parent_hub.web_tiles.coloring-books.description")} accentClass="bg-gradient-to-br from-pink-400 to-rose-500" cardClass="linear-gradient(135deg,rgba(244,114,182,0.30)0%,rgba(251,113,133,0.14)100%)" tryFree={tryFreeFor("hub_coloring_books")} onOpen={() => markHubUsed("hub_coloring_books")}> {/* audit-ok: brand tile accent gradient */}
            <ColoringBooks childId={effectiveChild.id} childName={effectiveChild.name} />
          </HubSection>
        </LockedBlock>;
    }
  }, {
    // Fun Sheets — activity & learning PDFs from two Google Drive folders.
    // Shows for age 2+ only; early-access tile in Section 2 covers 0–24m.
    // Daily cap: 2 downloads/day per child (server-enforced).
    // Sorting: not-yet-downloaded first, already-downloaded last.
    id: "fun-sheets",
    bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      if (!shouldRenderHubTileContent("fun-sheets", totalAgeMonths, isTwoPlus || earlyAccessBypass)) return null;
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_fun_sheets")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="fun-sheets" icon={<FileDown className="h-5 w-5 text-white" />} title={t("parent_hub.web_tiles.fun-sheets.title")} description={t("parent_hub.web_tiles.fun-sheets.description")} accentClass="bg-gradient-to-br from-lime-400 to-green-500" cardClass="linear-gradient(135deg,rgba(163,230,53,0.30)0%,rgba(34,197,94,0.14)100%)" tryFree={tryFreeFor("hub_fun_sheets")} onOpen={() => markHubUsed("hub_fun_sheets")}> {/* audit-ok: brand tile accent gradient */}
            <FunSheets childId={effectiveChild.id} childName={effectiveChild.name} />
          </HubSection>
        </LockedBlock>;
    }
  }, {
    id: "event-prep",
    bands: ["4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      if (!shouldRenderHubTileContent("event-prep", totalAgeMonths, isTwoPlus || earlyAccessBypass)) return null;
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_event_prep")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="event-prep" icon={<Sparkles className="h-5 w-5 text-white" />} title={t("parent_hub.web_tiles.event-prep.title")} description={t("parent_hub.web_tiles.event-prep.description")} accentClass="bg-gradient-to-br from-amber-400 to-orange-500" cardClass="linear-gradient(135deg,rgba(251,191,36,0.30)0%,rgba(249,115,22,0.14)100%)" tryFree={tryFreeFor("hub_event_prep")} onOpen={() => markHubUsed("hub_event_prep")}> {/* audit-ok: brand tile accent gradient */}
            <EventPrepCard />
          </HubSection>
        </LockedBlock>;
    }
  }, {
    // Amy Speech Coach — opens dedicated /parenting-hub/speech-coach page.
    // Visible for all infants and children up to 8 years (bands 0-2 → 6-8).
    // No minimum-age gate — age-band-aware content covers all ages from birth.
    id: "speech-coach",
    bands: ["0-2", "2-4", "4-6", "6-8"],
    render: () => {
      if (!shouldRenderHubTileContent("speech-coach", totalAgeMonths, isTwoPlus)) return null;
      return <LockedBlock reason="hub_locked" locked={isHubLocked("hub_speech")} journeySoft={journeySoftLock} childName={effectiveChild.name} isInfant={isInfant}>
          <HubSection id="speech-coach" icon={<MessageCircleHeart className="h-5 w-5 text-white" />} title={t("screens.speech_coach.hub_tile.title")} description={t("screens.speech_coach.hub_tile.description")} accentClass="bg-gradient-to-br from-violet-500 to-fuchsia-500" cardClass="linear-gradient(135deg,rgba(139,92,246,0.30)0%,rgba(217,70,239,0.14)100%)" tryFree={tryFreeFor("hub_speech")} onOpen={() => markHubUsed("hub_speech")}>  {/* audit-ok: intentional vibrant violet→fuchsia accent gradient for Speech Coach tile */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("screens.speech_coach.subtitle")}
              </p>
              <AppLink href="/speech-coach" source="hub-speech-coach">
                <Button className="w-full rounded-xl gap-2 text-sm font-semibold" data-testid="open-speech-coach">
                  {t("screens.speech_coach.cta.start_practice")}
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </AppLink>
            </div>
          </HubSection>
        </LockedBlock>;
    }
  }] : [];

  const forYouAll = sections.filter(s =>
    isHubSectionVisible(s, currentBand, totalAgeMonths),
  );
  const forYouFeatured = forYouAll.filter(s => s.featured);
  const forYouStandaloneFeatured = forYouFeatured.filter(s => s.id === "infant-hub");
  const forYouGrid = forYouAll.filter(s => !s.featured);

  const sectionById = new Map(sections.map(s => [s.id, s]));
  const todayTiles = TODAY_TILE_ORDER
    .map(id => sectionById.get(id))
    .filter((s): s is SectionEntry => !!s && isHubSectionVisible(s, currentBand!, totalAgeMonths));

  const renderHubSection = (s: SectionEntry, surface: "main" | "previous" | "early" = "main") => {
    hubSurface.current = surface;
    const node = s.render();
    hubSurface.current = "main";
    return node;
  };

  const previousStageTileIds = getPreviousStageTileIds(sections, currentBand, totalAgeMonths);

  return <div className={cn(PARENT_HUB_PAGE, "max-w-6xl mx-auto space-y-4 pb-12")}>
      <PageHeader />

      {/* ── Child Selector Panel ────────────────────────────────────────── */}
      <ChildSelectorPanel childList={childList} effectiveChild={effectiveChild} onSelect={handleChildSelect} />

      {effectiveChild && isInfant && !hubUsage.isPremium && hubJourney.isFreeJourneyPeriod && (
        <InfantTrialBanner childName={effectiveChild.name} />
      )}

      {effectiveChild && (
        <>
          <HubJourneyPulse
            childName={effectiveChild.name}
            bandLabel={currentBand ? bandLabel(currentBand) : undefined}
            isInfant={isInfant}
            isPremium={hubUsage.isPremium}
            access={hubJourney.access}
            journeyProgress={hubJourney.progress}
            pathSteps={hubJourney.status?.pathSteps}
            pathCompleted={hubJourney.status?.pathCompleted}
            isJourneyLocked={hubJourney.isJourneyLocked}
            learningProfile={learningProgress.profile}
            wallet={learningProgress.phase3?.wallet ?? null}
            onOpenLearning={openLearningPanel}
          />

          <HubTodayLearningPanel
            childName={effectiveChild.name}
            open={learningPanelOpen}
            onOpenChange={setLearningPanelOpen}
            panelRef={learningPanelRef}
            weeklyReport={hubUsage.isPremium ? learningProgress.weeklyReport ?? null : null}
            showGrowthLink={hubUsage.isPremium && !!learningProgress.phase3}
            growthLinkLabel={t("parent_hub.today_summary.growth_link")}
          >
            {hubJourney.status ? (
              <TodaysPathFromStatus
                status={hubJourney.status}
                isPremium={hubUsage.isPremium}
                isJourneyLocked={hubJourney.isJourneyLocked}
                onComplete={hubJourney.completePath}
                onPeekAhead={hubJourney.peekAheadUnlock}
                isCompleting={hubJourney.isCompleting}
              />
            ) : null}
            {learningProgress.phase3?.comeback ? (
              <ComebackMissionCard mission={learningProgress.phase3.comeback} />
            ) : null}
            {learningProgress.phase3 && !showSessionComplete ? (
              <DailyLearningSessionCard
                session={learningProgress.phase3.dailySession}
                childId={effectiveChild.id}
                childName={effectiveChild.name}
                onStepComplete={handleSessionStep}
                completing={learningProgress.isCompleting}
                parentHub
              />
            ) : null}
            {showSessionComplete && learningProgress.phase3 && learningProgress.unlocks ? (
              <SessionCompleteScreen
                xpEarned={
                  rewardCelebrations.events.reduce((sum, e) => sum + (e.amount ?? 0), 0) ||
                  25
                }
                rewardEvents={rewardCelebrations.events.length > 0 ? rewardCelebrations.events : []}
                tomorrowPreview={learningProgress.unlocks.nextSessionUnlocks}
                childName={effectiveChild.name}
                activitiesCompleted={learningProgress.phase3.dailySession.completedCount}
                activitiesTotal={learningProgress.phase3.dailySession.totalCount}
                streakDays={learningProgress.phase3.wallet.streakDays}
                skillHighlight={
                  learningProgress.phase3.recommendations[0]?.title ?? null
                }
                onClose={() => setShowSessionComplete(false)}
              />
            ) : null}
            {learningProgress.phase3 && (learningProgress.phase3.recommendations?.length ?? 0) > 0 ? (
              <AdaptiveRecommendationsChips
                items={learningProgress.phase3.recommendations}
                parentHub
              />
            ) : null}
            {learningProgress.unlocks ? (
              <div className="grid gap-2 md:grid-cols-2">
                <DailyFreshnessCard
                  items={learningProgress.unlocks.todaysUnlocks}
                  isRevisionDay={learningProgress.unlocks.isRevisionDay}
                  parentHub
                />
                <NextSessionUnlocks
                  items={learningProgress.unlocks.nextSessionUnlocks}
                  childName={effectiveChild.name}
                  onVisible={trackNextSessionOpened}
                />
              </div>
            ) : null}
          </HubTodayLearningPanel>
        </>
      )}

      <RewardCelebrationModal
        events={rewardCelebrations.events}
        open={rewardCelebrations.open}
        onClose={rewardCelebrations.close}
      />

      {effectiveChild && currentBand && <>
          {/* ── SECTION 1: For {Child Name} ─────────────────────────────── */}
          <ForYouHeader childName={effectiveChild.name} band={currentBand} ageGroup={ageGroup} />

          <HubQuickActions onNavigate={navigateHub} />

          {/* Infant Hub gets its own parent-level tile for 0-24 month children. */}
          {forYouStandaloneFeatured.length > 0 && <div className="space-y-3">
              {forYouStandaloneFeatured.map(s => {
                const node = renderHubSection(s);
                return node ? <div key={s.id}>{node}</div> : null;
              })}
            </div>}

          {/* 5 collapsible section groups — glass + glow tiles */}
          <div className="space-y-3">
            {WEB_HUB_GROUPS.map(group => {
              const tileIds = new Set(WEB_HUB_SECTION_TILE_IDS[group.key] ?? []);
              const isToday = group.key === "today";
              const isSupport = group.key === "support";
              const rawGrid = isToday ? [] : forYouGrid.filter(s => tileIds.has(s.id));
              const groupGrid = isSupport
                ? sortSupportTileIds(rawGrid.map(s => s.id), { ptmSeason })
                    .map(id => sectionById.get(id))
                    .filter((s): s is SectionEntry => !!s)
                : rawGrid;
              if (isToday) {
                if (todayTiles.length === 0) return null;
              } else if (groupGrid.length === 0) {
                return null;
              }
              const isOpen = expandedGroups.has(group.key);
              const gs = getHubGroupStyle(group.key);
              return (
                <div
                  key={group.key}
                  id={`hub-group-${group.key}`}
                  className={cn(hubShadedSectionCardClasses(gs), "hub-page-enter")}
                >
                  <HubShadedCardBody theme={gs}>
                    <div className="min-w-0 flex-1">
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className={cn(
                      "w-full flex items-center gap-3 text-left px-3 py-3.5",
                      "transition-all duration-[220ms] ease-[ease]",
                      isOpen ? "bg-white/[0.04]" : "hover:bg-white/[0.03]",
                    )}
                    aria-expanded={isOpen}
                  >
                    <span className={cn("flex items-center justify-center w-8 h-8 rounded-xl shrink-0 text-base", gs.emojiShell)}>
                      {group.emoji}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={cn("block font-quicksand font-bold text-sm leading-tight truncate", isOpen ? "text-amber-100/95" : "text-foreground")}>
                        {t(group.i18n)}
                      </span>
                      {isSupport && !isOpen ? (
                        <span className={cn("block text-[11px] mt-0.5 line-clamp-1", HUB_BODY)}>
                          {t("parent_hub.support.group_subtitle", { count: groupGrid.length })}
                        </span>
                      ) : null}
                    </span>
                    <span className={cn(
                      "shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                      "border border-white/10 bg-white/[0.05] transition-transform duration-300",
                      isOpen ? "rotate-180 text-amber-300/90" : "text-muted-foreground",
                    )}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-4 pt-2 border-t border-white/[0.08] animate-in fade-in slide-in-from-top-1 duration-200 space-y-3">
                      {isSupport && ptmSeason ? (
                        <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2.5 text-xs text-blue-100/90 leading-relaxed">
                          {t("parent_hub.support.ptm_season_banner")}
                        </div>
                      ) : null}
                      {isToday ? (
                        todayTiles.map(s => {
                          const node = renderHubSection(s);
                          return node ? <div key={s.id}>{node}</div> : null;
                        })
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
                          {groupGrid.map(s => {
                            const node = renderHubSection(s);
                            return node ? <div key={s.id} className="h-full [&>*]:h-full">{node}</div> : null;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                    </div>
                  </HubShadedCardBody>
                </div>
              );
            })}
          </div>

          {showSection2 && nextBand && (
            <HubExploreAgesSection
              title={t("parent_hub.headers.explore_next", { name: effectiveChild.name })}
              subtitle={t("parent_hub.headers.explore_blurb", { name: effectiveChild.name })}
              testId="section-2-early-access"
              accentKey="explore-next"
              headerEmoji="🔭"
            >
              {SECTION_2_EARLY_ACCESS_TILE_IDS.map(tileId => {
                const section = sectionById.get(tileId);
                if (!section) return null;
                const node = renderHubSection(section, "early");
                return node ? (
                  <ComingNextWrapper key={tileId} band={nextBand}>
                    {node}
                  </ComingNextWrapper>
                ) : null;
              })}
            </HubExploreAgesSection>
          )}

          {showPreviousStage && previousBand && previousStageTileIds.length > 0 && (
            <HubExploreAgesSection
              title={t("parent_hub.headers.previous_stage_title")}
              subtitle={t("parent_hub.headers.previous_stage_blurb", { name: effectiveChild.name })}
              testId="section-previous-stage"
            >
              {previousStageTileIds.map(tileId => {
                const section = sectionById.get(tileId);
                if (!section) return null;
                const node = renderHubSection(section, "previous");
                return node ? (
                  <PreviousStageWrapper key={tileId}>
                    {node}
                  </PreviousStageWrapper>
                ) : null;
              })}
            </HubExploreAgesSection>
          )}
        </>}

      {/* Bottom CTA */}
      <div className="text-center pt-2">
        <AppLink href="/routines/generate">
          <button type="button" className={HUB_BOTTOM_CTA}>
            <Calendar className="h-4 w-4" />
            {t("parent_hub.headers.bottom_cta")}
          </button>
        </AppLink>
      </div>
    </div>;
}

// ─── Section 1 / Section 2 headers ───────────────────────────────────────────
function ForYouHeader({
  childName,
  band,
  ageGroup
}: {
  childName: string;
  band: AgeBand;
  ageGroup: AgeGroup | null;
}) {
  const {
    t
  } = useTranslation();
  const groupInfo = ageGroup ? getAgeGroupInfo(ageGroup) : null;
  return <div className="pt-1 hub-page-enter">
      <h2 className="font-quicksand text-[22px] font-bold text-foreground flex items-center gap-2 flex-wrap">
        <span>{t("parent_hub.headers.for_child", {
          name: childName
        })}</span>
        {groupInfo && <span className="text-base font-medium text-muted-foreground/80">
            {groupInfo.emoji} {groupInfo.label}
          </span>}
      </h2>
      <p className={cn(HUB_BODY, "mt-1")}>
        {t("parent_hub.headers.personalised", {
        name: childName
      })}
      </p>
    </div>;
}

// ─── Previous Stage header ───────────────────────────────────────────────────
function PreviousStageHeader({
  childName,
  band,
}: {
  childName: string;
  band: AgeBand;
}) {
  const { t } = useTranslation();
  return <div className="pt-6">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">{t("parent_hub.headers.previous_stage_section")}</span>
        <Badge variant="outline" className="rounded-full px-2.5 py-0 h-5 font-semibold text-[10px] gap-1 border-muted-foreground/30 text-muted-foreground">
          {bandLabel(band)}
        </Badge>
      </div>
      <h2 className="font-quicksand text-xl font-bold text-foreground mt-1.5">
        {t("parent_hub.headers.previous_stage_title")}
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
        {t("parent_hub.headers.previous_stage_blurb", { name: childName })}
      </p>
    </div>;
}

// ─── Section 2 header ───────────────────────────────────────────────────────
function ExploreNextHeader({
  childName,
  band
}: {
  childName: string;
  band: AgeBand;
}) {
  const {
    t
  } = useTranslation();
  return <div className="pt-6">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80">{t("parent_hub.headers.section2_next")}</span>
        <Badge variant="outline" className="rounded-full px-2.5 py-0 h-5 font-semibold text-[10px] gap-1 border-border text-primary">
          {bandLabel(band)}
        </Badge>
      </div>
      <h2 className="font-quicksand text-xl font-bold text-foreground mt-1.5">
        {t("parent_hub.headers.explore_next", {
        name: childName
      })}
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
        {t("parent_hub.headers.explore_blurb", {
        name: childName
      })}
      </p>
    </div>;
}

// ─── Page Header ─────────────────────────────────────────────────────────────
function PageHeader() {
  const {
    t
  } = useTranslation();
  return <div className="flex items-center gap-3">
      <div className="flex-1">
        <h1 className="font-quicksand text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          {t("hub.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("hub.subtitle")}
        </p>
        <p className="text-[9px] font-bold uppercase tracking-widest mt-1 text-primary/35">
          {t("patent_pending.hub_trust")}
        </p>
      </div>
      <AppLink href="/assistant">
        <button className="shrink-0 flex items-center gap-2 bg-gradient-to-br from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card rounded-2xl px-3 py-2 border border-border hover:border-primary/40 transition-all">
          <AmyIcon size={24} bounce />
          <span className="text-xs font-bold text-foreground">{t("ai.ask_amy")}</span>
          <MessageCircleHeart className="h-4 w-4 text-primary" />
        </button>
      </AppLink>
    </div>;
}

export default function ParentingHub() {
  return (
    <AppErrorBoundary label="ParentingHub">
      <Suspense fallback={<RouteLoadingShell />}>
        <ParentingHubPage />
      </Suspense>
    </AppErrorBoundary>
  );
}