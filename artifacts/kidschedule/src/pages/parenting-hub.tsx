import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, Sparkles, Heart, Palette, ChevronDown, ChevronUp, MessageCircleHeart, Calendar, ArrowRight, Trophy, Compass, GraduationCap, ClipboardList, Zap, UserPlus, CheckCircle2, Users, AudioLines, Film, FileDown, Star, Baby, Gamepad2, Lightbulb, LayoutGrid, ScrollText, Calculator, Sigma } from "lucide-react";
import { OlympiadZone } from "@/components/olympiad-zone";
import { SmartStudyZone } from "@/components/smart-study-zone";
import { PtmPrepAssistant } from "@/components/ptm-prep";
import { EventPrepCard } from "@/components/event-prep-card";
import { LifeSkillsZone } from "@/components/life-skills-zone";
import { PhonicsLearning } from "@/components/phonics-learning";
import { SpellingMastery } from "@/components/spelling-mastery";
import { ColoringBooks } from "@/components/coloring-books";
import { FunSheets } from "@/components/fun-sheets";
import { StoryHub } from "@/components/story-hub";
import { getAgeGroup, getAgeGroupInfo } from "@/lib/age-groups";
import { InfantMode, type InfantShowOnly } from "@/components/infant-mode";
import { InfantHub } from "@/components/infant-hub";
import { isInfantHubAge } from "@workspace/infant-hub";
import { SkillFocusSection, StorySection, ParentTasksSection } from "@/components/age-based-sections";
import { DailyStorySection } from "@/components/daily-story-section";
import { ToddlerPreschoolMode, type ToddlerShowOnly } from "@/components/toddler-preschool-mode";
import { DailyPuzzle } from "@/components/daily-puzzle";
import { SmartMathTricks } from "@/components/smart-math-tricks";
import { AbacusZone } from "@/components/abacus-zone";
import { AmazingFacts } from "@/components/amazing-facts";
import { DailyKidsActivity } from "@/components/daily-kids-activity";
import { ArtCraftReels } from "@/components/art-craft-reels";
import { PrintableWorksheets } from "@/components/printable-worksheets";
import { DailyTips } from "@/components/daily-tips";
import { ParentingArticles } from "@/components/parenting-articles";
import { AmyIcon } from "@/components/amy-icon";
import { LanguageSwitcher } from "@/components/language-switcher";
import { FuturePredictor } from "@/components/future-predictor";
import { ParentCommandCenter } from "@/components/parent-command-center";
import { LockedBlock } from "@/components/locked-block";
import { TryFreeBadge } from "@/components/try-free-badge";
import { SubItemGate } from "@/components/sub-item-gate";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import type { AgeGroup } from "@/lib/age-groups";
import type { AgeBand } from "@/lib/age-bands";
import { getAgeBand, getNextAgeBand, bandLabel } from "@/lib/age-bands";
import { ComingNextWrapper } from "@/components/coming-next-wrapper";

// ─── Section Wrapper ─────────────────────────────────────────────────────────
interface SectionProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentClass: string;
  defaultOpen?: boolean;
  /** Show a small "Try Free" pill in the header (first-time-free features). */
  tryFree?: boolean;
  children: React.ReactNode;
}
function HubSection({
  id,
  icon,
  title,
  description,
  accentClass,
  defaultOpen = false,
  tryFree = false,
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
  return <div data-section-id={id} className={["group relative rounded-2xl overflow-hidden transition-all duration-300 ease-out",
  // Glass surface — light & dark
  "bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl", "border border-white/50 dark:border-white/10", "shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]",
  // Hover glow
  "hover:border-primary/40 dark:hover:border-primary/40", "hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]",
  // Active (expanded) glow — stronger
  open ? "border-primary/60 dark:border-primary/50 shadow-[0_0_0_1px_rgba(168,85,247,0.45),0_18px_50px_-12px_rgba(168,85,247,0.45)]" : ""].join(" ")}>
      <button onClick={toggle} className={["w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left", "transition-colors duration-200", open ? "bg-primary/[0.06] dark:bg-primary/[0.08]" : "hover:bg-white/40 dark:hover:bg-white/[0.03]"].join(" ")} aria-expanded={open}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={["w-11 h-11 rounded-2xl flex items-center justify-center shrink-0", "shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]", "ring-1 ring-white/40 dark:ring-white/10", accentClass].join(" ")}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-quicksand font-bold text-[15px] leading-tight text-foreground truncate">{title}</p>
              {tryFree && <TryFreeBadge />}
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{description}</p>
          </div>
        </div>
        <span className={["shrink-0 w-7 h-7 rounded-full flex items-center justify-center", "border border-border/50 bg-white/50 dark:bg-white/5", "transition-transform duration-300", open ? "rotate-180 text-primary border-primary/40" : "text-muted-foreground"].join(" ")}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      {open && <div className="px-4 pb-5 pt-3 border-t border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/[0.015] animate-in fade-in slide-in-from-top-1 duration-300">
          {children}
        </div>}
    </div>;
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
function AmyAISuggestionsSection() {
  const {
    t
  } = useTranslation();
  return <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("parent_hub.amy.lead")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {AMY_PROMPT_IDS.map(id => {
        const label = t(`parent_hub.amy.prompts.${id}.label`);
        const prompt = t(`parent_hub.amy.prompts.${id}.prompt`);
        return <Link key={id} href={`/assistant?q=${encodeURIComponent(prompt)}`}>
              <button className="w-full text-left flex items-center gap-2.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 px-3 py-2.5 transition-all">
                <span className="text-xl shrink-0">{AMY_PROMPT_EMOJI[id]}</span>
                <span className="text-sm font-semibold text-foreground">{label}</span>
              </button>
            </Link>;
      })}
      </div>
      <Link href="/assistant">
        <Button variant="outline" className="w-full rounded-xl gap-2 text-sm font-semibold">
          <AmyIcon size={20} bounce />
          {t("parent_hub.amy.cta")}
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
      </Link>
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
const EMOTIONAL_CARD_BG: Record<typeof EMOTIONAL_CARD_IDS[number], string> = {
  overwhelmed: "bg-muted dark:bg-card border-border dark:border-border hover:border-border",
  anxious: "bg-muted dark:bg-card border-border dark:border-border hover:border-border",
  connect: "bg-muted dark:bg-card border-border dark:border-border hover:border-border",
  break: "bg-muted dark:bg-card border-border dark:border-border hover:border-border"
};
function EmotionalSupportSection() {
  const {
    t
  } = useTranslation();
  return <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("parent_hub.emotional_footer.lead")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {EMOTIONAL_CARD_IDS.map(id => {
        const title = t(`parent_hub.emotional_cards.${id}.title`);
        const subtitle = t(`parent_hub.emotional_cards.${id}.subtitle`);
        const prompt = t(`parent_hub.emotional_cards.${id}.prompt`);
        return <SubItemGate key={id} sectionId="hub_emotional" subItemId={id}>
              <Link href={`/assistant?q=${encodeURIComponent(prompt)}`}>
                <button className={`w-full text-left rounded-2xl border-2 px-4 py-3 transition-all ${EMOTIONAL_CARD_BG[id]}`}>
                  <span className="text-2xl block mb-1">{EMOTIONAL_CARD_EMOJI[id]}</span>
                  <p className="font-bold text-sm text-foreground leading-tight">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                </button>
              </Link>
            </SubItemGate>;
      })}
      </div>
      <div className="bg-gradient-to-r from-muted dark:from-card to-muted dark:to-card border border-border dark:border-border rounded-2xl p-4 flex gap-3 items-start">
        <AmyIcon size={36} />
        <div>
          <p className="font-bold text-sm text-foreground">{t("parent_hub.emotional_footer.reassure_title")}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t("parent_hub.emotional_footer.reassure_body")}
          </p>
        </div>
      </div>
    </div>;
}

// ─── Sub-section tile (Glass + Glow, collapsed by default) ──────────────────
interface SubSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentClass: string;
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
  gateSection,
  children
}: SubSectionProps) {
  const [open, setOpen] = useState(false);
  const inner = <div className={["relative rounded-2xl overflow-hidden transition-all duration-300 ease-out", "bg-white/50 dark:bg-white/[0.035] backdrop-blur-xl", "border border-white/60 dark:border-white/[0.08]", "shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]", open ? "border-primary/50 dark:border-primary/40 shadow-[0_0_0_1px_rgba(168,85,247,0.3),0_10px_28px_-8px_rgba(168,85,247,0.35)]" : "hover:border-primary/25 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.12),0_6px_20px_-6px_rgba(168,85,247,0.18)]"].join(" ")}>
      <button onClick={() => setOpen(v => !v)} className={["w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left", "transition-colors duration-200", open ? "bg-primary/[0.04] dark:bg-primary/[0.06]" : "hover:bg-white/40 dark:hover:bg-white/[0.025]"].join(" ")} aria-expanded={open}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={["w-9 h-9 rounded-xl flex items-center justify-center shrink-0", "shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ring-1 ring-white/40 dark:ring-white/10", accentClass].join(" ")}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[13px] leading-tight text-foreground truncate">{title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{description}</p>
          </div>
        </div>
        <span className={["shrink-0 w-6 h-6 rounded-full flex items-center justify-center", "border border-border/50 bg-white/60 dark:bg-white/5", "transition-transform duration-300", open ? "rotate-180 text-primary border-primary/40" : "text-muted-foreground"].join(" ")}>
          <ChevronDown className="h-3.5 w-3.5" />
        </span>
      </button>

      {open && <div className="px-3.5 pb-4 pt-3 border-t border-white/40 dark:border-white/[0.06] bg-white/20 dark:bg-white/[0.01] animate-in fade-in slide-in-from-top-1 duration-300">
          {children}
        </div>}
    </div>;
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
  const isInfant = ageGroup === "infant";
  const isToddlerOrPreschool = ageGroup === "toddler" || ageGroup === "preschool";
  const isOlder = !isInfant && !isToddlerOrPreschool;
  return <div className="space-y-2.5">

      {/* ── INFANT ─────────────────────────────────────────────────────── */}
      {isInfant && <>
          <SubSection gateSection="hub_activities" icon={<Baby className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.baby-activities.title")} description={t("parent_hub.subsections.baby-activities.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <InfantMode childName={effectiveChild.name} ageYears={effectiveChild.age} ageMonths={(effectiveChild as any).ageMonths ?? 0} showOnly={null} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<Lightbulb className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.amazing-facts-baby.title")} description={t("parent_hub.subsections.amazing-facts-baby.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <AmazingFacts childName={effectiveChild.name} ageGroup={ageGroup} />
          </SubSection>
        </>}

      {/* ── TODDLER / PRESCHOOL ────────────────────────────────────────── */}
      {isToddlerOrPreschool && <>
          <SubSection gateSection="hub_activities" icon={<Star className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.daily-activity.title")} description={t("parent_hub.subsections.daily-activity.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <DailyKidsActivity childName={effectiveChild.name} ageMonths={totalAgeMonths} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<Brain className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.skills-to-focus-toddler.title")} description={t("parent_hub.subsections.skills-to-focus-toddler.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <ToddlerPreschoolMode ageGroup={ageGroup as "toddler" | "preschool"} childName={effectiveChild.name} ageYears={effectiveChild.age} ageMonths={(effectiveChild as any).ageMonths ?? 0} showOnly="skill" />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<BookOpen className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.story-time.title")} description={t("parent_hub.subsections.story-time.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <DailyStorySection ageMonths={totalAgeMonths} childName={effectiveChild.name} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<Gamepad2 className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.fun-and-play.title")} description={t("parent_hub.subsections.fun-and-play.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <ToddlerPreschoolMode ageGroup={ageGroup as "toddler" | "preschool"} childName={effectiveChild.name} ageYears={effectiveChild.age} ageMonths={(effectiveChild as any).ageMonths ?? 0} showOnly="fun" />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<ScrollText className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.parent-tasks-toddler.title")} description={t("parent_hub.subsections.parent-tasks-toddler.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <ToddlerPreschoolMode ageGroup={ageGroup as "toddler" | "preschool"} childName={effectiveChild.name} ageYears={effectiveChild.age} ageMonths={(effectiveChild as any).ageMonths ?? 0} showOnly="task" />
          </SubSection>

          {ageGroup === "preschool" && <SubSection gateSection="hub_activities" icon={<LayoutGrid className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.daily-puzzle-pre.title")} description={t("parent_hub.subsections.daily-puzzle-pre.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
              <DailyPuzzle childName={effectiveChild.name} ageGroup={ageGroup} ageYears={effectiveChild.age} />
            </SubSection>}

          <SubSection gateSection="hub_activities" icon={<Lightbulb className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.amazing-facts-toddler.title")} description={t("parent_hub.subsections.amazing-facts-toddler.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <AmazingFacts childName={effectiveChild.name} ageGroup={ageGroup} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<GraduationCap className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.spelling-mastery.title")} description={t("parent_hub.subsections.spelling-mastery.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <SpellingMastery childId={effectiveChild.id} childName={effectiveChild.name} ageMonths={totalAgeMonths} />
          </SubSection>
        </>}

      {/* ── OLDER KIDS ─────────────────────────────────────────────────── */}
      {isOlder && <>
          {totalAgeMonths < 96 && <SubSection gateSection="hub_activities" icon={<Star className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.daily-activity-older.title")} description={t("parent_hub.subsections.daily-activity-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
              <DailyKidsActivity childName={effectiveChild.name} ageMonths={totalAgeMonths} />
            </SubSection>}

          <SubSection gateSection="hub_activities" icon={<Brain className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.skills-to-focus-older.title")} description={t("parent_hub.subsections.skills-to-focus-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <SkillFocusSection group={ageGroup} childName={effectiveChild.name} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<BookOpen className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.story-time-older.title")} description={t("parent_hub.subsections.story-time-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <DailyStorySection ageMonths={totalAgeMonths} childName={effectiveChild.name} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<LayoutGrid className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.daily-puzzle-older.title")} description={t("parent_hub.subsections.daily-puzzle-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <DailyPuzzle childName={effectiveChild.name} ageGroup={ageGroup} ageYears={effectiveChild.age} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<ScrollText className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.parent-tasks-older.title")} description={t("parent_hub.subsections.parent-tasks-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <ParentTasksSection group={ageGroup} childName={effectiveChild.name} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<Lightbulb className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.amazing-facts-older.title")} description={t("parent_hub.subsections.amazing-facts-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <AmazingFacts childName={effectiveChild.name} ageGroup={ageGroup} />
          </SubSection>

          <SubSection gateSection="hub_activities" icon={<GraduationCap className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.spelling-mastery-older.title")} description={t("parent_hub.subsections.spelling-mastery-older.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
            <SpellingMastery childId={effectiveChild.id} childName={effectiveChild.name} ageMonths={totalAgeMonths} />
          </SubSection>
        </>}

      {/* ── Printable Worksheets (all age groups) ──────────────────────── */}
      <SubSection gateSection="hub_activities" icon={<FileDown className="h-4 w-4 text-primary" />} title={t("parent_hub.subsections.printable-worksheets-all.title")} description={t("parent_hub.subsections.printable-worksheets-all.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
        <PrintableWorksheets childAgeMonths={totalAgeMonths} />
      </SubSection>
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
  if (childList.length === 0) return null;
  const getInitials = (name: string) => name.trim().split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const getAge = (child: any) => {
    const months = child.ageMonths ?? 0;
    if (child.age === 0) return `${months}m`;
    if (months > 0) return `${child.age}y ${months}m`;
    return `${child.age}y`;
  };
  return <div className="rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">
            {childList.length === 1 ? t("parent_hub.headers.current_child") : t("parent_hub.headers.select_child")}
          </span>
        </div>
        <Link href="/children/new">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            <UserPlus className="h-3.5 w-3.5" />
            {t("parent_hub.headers.add_child")}
          </button>
        </Link>
      </div>

      {/* Child cards */}
      <div className="flex gap-3 px-3 pb-3 overflow-x-auto scrollbar-none">
        {childList.map((child: any, idx: number) => {
        const group = getAgeGroup(child.age, (child as any).ageMonths ?? 0);
        const info = getAgeGroupInfo(group);
        const isSelected = effectiveChild?.id === child.id;
        const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
        const initials = getInitials(child.name);
        const ageLabel = getAge(child);
        return <button key={child.id} onClick={() => onSelect(child.id)} className={["shrink-0 relative flex flex-col items-center gap-2 rounded-2xl px-4 py-3 min-w-[96px] transition-all duration-200", isSelected ? "bg-primary/10 dark:bg-primary/15 border-2 border-primary shadow-[0_0_0_1px_rgba(168,85,247,0.3),0_4px_16px_-4px_rgba(168,85,247,0.4)]" : "bg-white/50 dark:bg-white/[0.03] border-2 border-border hover:border-primary/50 hover:bg-primary/5"].join(" ")}>
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
                  {child.name}
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ParentingHub() {
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
  const childList = children as any[] ?? [];
  const effectiveChild = selectedChildId ? childList.find((c: any) => c.id === selectedChildId) ?? childList[0] : childList[0];
  const ageGroup: AgeGroup | null = effectiveChild ? getAgeGroup(effectiveChild.age, (effectiveChild as any).ageMonths ?? 0) : null;
  const totalAgeMonths = effectiveChild ? effectiveChild.age * 12 + ((effectiveChild as any).ageMonths ?? 0) : 0;

  // First-Time Free + Preview Lock — every Parent Hub feature is usable ONCE
  // for free (server-tracked). After that, free users see the locked overlay;
  // premium users always get full access.
  const hubUsage = useFeatureUsage();
  const tryFreeFor = (id: string) => !hubUsage.isPremium && !hubUsage.hasUsedFeature(id);
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
            <Link href="/children/new">
              <button className="mt-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {t("parent_hub.empty.cta")}
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>;
  }

  // ── Two-section layout: For You (current band) + Explore Next (next band) ──
  const currentBand: AgeBand | null = effectiveChild ? getAgeBand(effectiveChild.age, (effectiveChild as any).ageMonths ?? 0) : null;
  const nextBand: AgeBand | null = currentBand ? getNextAgeBand(currentBand) : null;
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
    featured: true,
    render: () => {
      return <HubSection id="command-center" icon={<Zap className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.command-center.title")} description={t("parent_hub.web_tiles.command-center.description")} accentClass="bg-muted dark:bg-card" defaultOpen={false}>
          <ParentCommandCenter child={{
          id: effectiveChild.id,
          name: effectiveChild.name,
          age: effectiveChild.age
        }} />
        </HubSection>;
    }
  },
  // ── INFANT HUB (band-restricted, featured) ────────────────────────────
  // ONLY shown when the currently selected child is 0–24 months.
  {
    id: "infant-hub",
    bands: ["0-2"],
    featured: true,
    render: () => {
      if (!isInfantHubAge(totalAgeMonths)) return null;
      return <InfantHub childId={effectiveChild.id} childName={effectiveChild.name} ageMonths={totalAgeMonths} />;
    }
  }, {
    id: "tomorrow-forecast",
    alwaysCurrent: true,
    featured: true,
    render: () => {
      return <HubSection id="tomorrow-forecast" icon={<Sparkles className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.tomorrow-forecast.title")} description={t("parent_hub.web_tiles.tomorrow-forecast.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" defaultOpen={false}>
          <FuturePredictor childId={effectiveChild.id} />
        </HubSection>;
    }
  },
  // ── Smart Math Tricks (age 4–8, shown near top of grid) ─────────────
  {
    id: "smart-math-tricks",
    bands: ["4-6", "6-8"] as AgeBand[],
    render: () => {
      return ageGroup ? <HubSection id="smart-math-tricks" icon={<Sparkles className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.smart-math-tricks.title")} description={t("parent_hub.web_tiles.smart-math-tricks.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
          <SmartMathTricks childName={effectiveChild.name} ageYears={effectiveChild.age} />
        </HubSection> : null;
    }
  },
  // ── Abacus PRO Zone (age 4–10, learn/practice/challenge/mental/tutor) ─
  {
    id: "abacus",
    bands: ["4-6", "6-8", "8-10"] as AgeBand[],
    render: () => {
      return ageGroup ? <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_abacus")}>
          <HubSection id="abacus" icon={<Sparkles className="h-5 w-5 text-primary" />} title={t("pages.parenting_hub.abacus_pro_zone")} // audit-ok: brand product name, intentional EN-only
        description="Learn the soroban — beads, brain & speed math" accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" tryFree={tryFreeFor("hub_abacus")} onOpen={() => hubUsage.markFeatureUsed("hub_abacus")}>
            <AbacusZone childId={effectiveChild.id} childName={effectiveChild.name} ageYears={effectiveChild.age} />
          </HubSection>
        </LockedBlock> : null;
    }
  },
  // ── GRID — always-current ─────────────────────────────────────────────
  {
    id: "amy-ai",
    alwaysCurrent: true,
    render: () => {
      return <HubSection id="amy-ai" icon={<AmyIcon size={22} bounce />} title={t("parent_hub.web_tiles.amy-ai.title")} description={t("parent_hub.web_tiles.amy-ai.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card">
          <AmyAISuggestionsSection />
        </HubSection>;
    }
  }, {
    id: "articles",
    alwaysCurrent: true,
    render: () => {
      return <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_articles")}>
          <HubSection id="articles" icon={<BookOpen className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.articles.title")} description={t("parent_hub.web_tiles.articles.description")} accentClass="bg-muted dark:bg-card" tryFree={tryFreeFor("hub_articles")} onOpen={() => hubUsage.markFeatureUsed("hub_articles")}>
            <ParentingArticles childAgeMonths={totalAgeMonths} />
          </HubSection>
        </LockedBlock>;
    }
  }, {
    id: "daily-tips",
    alwaysCurrent: true,
    render: () => {
      return ageGroup ? <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_tips")}>
          <HubSection id="daily-tips" icon={<Sparkles className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.daily-tips.title")} description={t("parent_hub.web_tiles.daily-tips.description")} accentClass="bg-muted dark:bg-card" tryFree={tryFreeFor("hub_tips")} onOpen={() => hubUsage.markFeatureUsed("hub_tips")}>
            <DailyTips ageGroup={ageGroup} childName={effectiveChild.name} />
          </HubSection>
        </LockedBlock> : null;
    }
  }, {
    id: "emotional",
    alwaysCurrent: true,
    render: () => {
      return <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_emotional")}>
          <HubSection id="emotional" icon={<Heart className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.emotional.title")} description={t("parent_hub.web_tiles.emotional.description")} accentClass="bg-muted dark:bg-card" tryFree={tryFreeFor("hub_emotional")} onOpen={() => hubUsage.markFeatureUsed("hub_emotional")}>
            <EmotionalSupportSection />
          </HubSection>
        </LockedBlock>;
    }
  }, {
    id: "activities",
    alwaysCurrent: true,
    render: () => {
      return ageGroup ? <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_activities")}>
          <HubSection id="activities" icon={<Palette className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.activities.title")} description={t("parent_hub.web_tiles.activities.description")} accentClass="bg-muted dark:bg-card" tryFree={tryFreeFor("hub_activities")} onOpen={() => hubUsage.markFeatureUsed("hub_activities")}>
            <ActivitiesSection ageGroup={ageGroup} effectiveChild={effectiveChild} totalAgeMonths={totalAgeMonths} />
          </HubSection>
        </LockedBlock> : null;
    }
  },
  // ── Art & Craft Videos (always-current, standalone tile) ─────────────
  {
    id: "art-craft",
    alwaysCurrent: true,
    render: () => {
      return <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_art_craft")}>
          <HubSection id="art-craft" icon={<Palette className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.art-craft.title")} description={t("parent_hub.web_tiles.art-craft.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" tryFree={tryFreeFor("hub_art_craft")} onOpen={() => hubUsage.markFeatureUsed("hub_art_craft")}>
            <ArtCraftReels />
          </HubSection>
        </LockedBlock>;
    }
  },
  // ── GRID — band-based ─────────────────────────────────────────────────
  {
    id: "story-hub",
    bands: ["0-2", "2-4", "4-6", "6-8"],
    render: () => {
      return <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_story_hub")}>
          <HubSection id="story-hub" icon={<Film className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.story-hub.title")} description={t("parent_hub.web_tiles.story-hub.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" tryFree={tryFreeFor("hub_story_hub")} onOpen={() => hubUsage.markFeatureUsed("hub_story_hub")}>
            <StoryHub childId={effectiveChild.id} childName={effectiveChild.name} />
          </HubSection>
        </LockedBlock>;
    }
  }, {
    id: "phonics",
    bands: ["2-4", "4-6"],
    render: () => {
      return totalAgeMonths >= 12 && totalAgeMonths < 72 ? <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_phonics")}>
          <HubSection id="phonics" icon={<AudioLines className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.phonics.title")} description={t("parent_hub.web_tiles.phonics.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" tryFree={tryFreeFor("hub_phonics")} onOpen={() => hubUsage.markFeatureUsed("hub_phonics")}>
            <PhonicsLearning childId={effectiveChild.id} childName={effectiveChild.name} totalAgeMonths={totalAgeMonths} />
          </HubSection>
        </LockedBlock> : null;
    }
  }, {
    id: "ptm-prep",
    bands: ["4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      return totalAgeMonths >= 36 && totalAgeMonths < 216 ? <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_ptm_prep")}>
          <HubSection id="ptm-prep" icon={<ClipboardList className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.ptm-prep.title")} description={t("parent_hub.web_tiles.ptm-prep.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" tryFree={tryFreeFor("hub_ptm_prep")} onOpen={() => hubUsage.markFeatureUsed("hub_ptm_prep")}>
            <PtmPrepAssistant child={{
            id: effectiveChild.id,
            name: effectiveChild.name,
            age: effectiveChild.age
          }} />
          </HubSection>
        </LockedBlock> : null;
    }
  }, {
    id: "smart-study",
    bands: ["4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      return totalAgeMonths >= 36 && totalAgeMonths < 204 ? <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_smart_study")}>
          <HubSection id="smart-study" icon={<GraduationCap className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.smart-study.title")} description={t("parent_hub.web_tiles.smart-study.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" tryFree={tryFreeFor("hub_smart_study")} onOpen={() => hubUsage.markFeatureUsed("hub_smart_study")}>
            <SmartStudyZone />
          </HubSection>
        </LockedBlock> : null;
    }
  }, {
    id: "event-prep",
    bands: ["4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      return totalAgeMonths >= 36 && totalAgeMonths < 180 ? <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_event_prep")}>
          <HubSection id="event-prep" icon={<Sparkles className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.event-prep.title")} description={t("parent_hub.web_tiles.event-prep.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" tryFree={tryFreeFor("hub_event_prep")} onOpen={() => hubUsage.markFeatureUsed("hub_event_prep")}>
            <EventPrepCard />
          </HubSection>
        </LockedBlock> : null;
    }
  }, {
    id: "olympiad",
    bands: ["4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      return totalAgeMonths >= 36 && totalAgeMonths < 192 ? <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_olympiad")}>
          <HubSection id="olympiad" icon={<Trophy className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.olympiad.title")} description={t("parent_hub.web_tiles.olympiad.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" tryFree={tryFreeFor("hub_olympiad")} onOpen={() => hubUsage.markFeatureUsed("hub_olympiad")}>
            <OlympiadZone child={{
            id: effectiveChild.id,
            name: effectiveChild.name,
            age: effectiveChild.age
          }} />
          </HubSection>
        </LockedBlock> : null;
    }
  }, {
    id: "life-skills",
    bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      return totalAgeMonths >= 24 && totalAgeMonths < 192 ? <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_life_skills")}>
          <HubSection id="life-skills" icon={<Compass className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.life-skills.title")} description={t("parent_hub.web_tiles.life-skills.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" tryFree={tryFreeFor("hub_life_skills")} onOpen={() => hubUsage.markFeatureUsed("hub_life_skills")}>
            <LifeSkillsZone child={{
            id: effectiveChild.id,
            name: effectiveChild.name,
            age: effectiveChild.age
          }} />
          </HubSection>
        </LockedBlock> : null;
    }
  }, {
    // Coloring Books — Google-Drive-backed PDF library. Shows for age
    // 2+ only (preview tile in Section 2 covers the 0-2 band). Daily
    // download cap (2/day per child) and the "never repeat" rule are
    // enforced server-side in artifacts/api-server/src/routes/coloring.ts.
    id: "coloring-books",
    bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      return totalAgeMonths >= 24 ? <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_coloring_books")}>
          <HubSection id="coloring-books" icon={<Palette className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.coloring-books.title")} description={t("parent_hub.web_tiles.coloring-books.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" tryFree={tryFreeFor("hub_coloring_books")} onOpen={() => hubUsage.markFeatureUsed("hub_coloring_books")}>
            <ColoringBooks childId={effectiveChild.id} childName={effectiveChild.name} />
          </HubSection>
        </LockedBlock> : null;
    }
  }, {
    // Fun Sheets — activity & learning PDFs from two Google Drive folders.
    // Shows for age 2+ only; preview tile in Section 2 covers 0–24m.
    // Daily cap: 2 downloads/day per child (server-enforced).
    // Sorting: not-yet-downloaded first, already-downloaded last.
    id: "fun-sheets",
    bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"],
    render: () => {
      return totalAgeMonths >= 24 ? <LockedBlock reason="hub_locked" locked={hubUsage.isFeatureLocked("hub_fun_sheets")}>
          <HubSection id="fun-sheets" icon={<FileDown className="h-5 w-5 text-primary" />} title={t("parent_hub.web_tiles.fun-sheets.title")} description={t("parent_hub.web_tiles.fun-sheets.description")} accentClass="bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card" tryFree={tryFreeFor("hub_fun_sheets")} onOpen={() => hubUsage.markFeatureUsed("hub_fun_sheets")}>
            <FunSheets childId={effectiveChild.id} childName={effectiveChild.name} />
          </HubSection>
        </LockedBlock> : null;
    }
  }] : [];

  // Bucket sections by age band.
  const inForYou = (s: SectionEntry) => s.alwaysCurrent || currentBand !== null && (s.bands?.includes(currentBand) ?? false);
  const forYouAll = sections.filter(inForYou);
  const forYouFeatured = forYouAll.filter(s => s.featured);
  const forYouGrid = forYouAll.filter(s => !s.featured);

  // Section 2 ("Explore Next Stage") is shown ONLY for children whose age is
  // 0–24 months (band "0-2"). For 2+ children, Section 2 is removed entirely.
  // The preview tiles below are a fixed set the user has asked us to surface
  // for 0–24 month children, regardless of each tile's own band metadata.
  const showSection2 = currentBand === "0-2" && nextBand !== null;
  return <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <PageHeader />

      {/* ── Child Selector Panel ────────────────────────────────────────── */}
      <ChildSelectorPanel childList={childList} effectiveChild={effectiveChild} onSelect={handleChildSelect} />

      {effectiveChild && currentBand && <>
          {/* ── SECTION 1: For {Child Name} ─────────────────────────────── */}
          <ForYouHeader childName={effectiveChild.name} band={currentBand} ageGroup={ageGroup} />

          {/* Featured (full-width) */}
          {forYouFeatured.length > 0 && <div className="space-y-3">
              {forYouFeatured.map(s => {
          const node = s.render();
          return node ? <div key={s.id}>{node}</div> : null;
        })}
            </div>}

          {/* 2-column grid */}
          {forYouGrid.length > 0 && <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
              {forYouGrid.map(s => {
          const node = s.render();
          return node ? <div key={s.id}>{node}</div> : null;
        })}
            </div>}

          {/* ── SECTION 2: Explore Next Stage — ONLY for 0-24 month children ── */}
          {showSection2 && nextBand && <>
              <ExploreNextHeader childName={effectiveChild.name} band={nextBand} />
              <div data-testid="section-2-previews" className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start pt-2">
                {SECTION_2_PREVIEW_TILES.map(tile => {
            return <ComingNextWrapper key={tile.id} band={nextBand}>
                    <PreviewHubCard id={tile.id} icon={tile.icon} title={t(`parent_hub.web_tiles_preview.${tile.id}.title`)} description={t(`parent_hub.web_tiles_preview.${tile.id}.description`)} accentClass={tile.accentClass} />
                  </ComingNextWrapper>;
          })}
              </div>
            </>}
        </>}

      {/* Bottom CTA */}
      <div className="text-center pt-2">
        <Link href="/routines/generate">
          <button className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline">
            <Calendar className="h-4 w-4" />
            {t("parent_hub.headers.bottom_cta")}
          </button>
        </Link>
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
  return <div className="pt-1">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80">{t("parent_hub.headers.section1_for")}</span>
        <Badge variant="outline" className="rounded-full px-2.5 py-0 h-5 font-semibold text-[10px] gap-1">
          {bandLabel(band)}
        </Badge>
      </div>
      <h2 className="font-quicksand text-xl font-bold text-foreground mt-1.5 flex items-center gap-2 flex-wrap">
        <span>{t("parent_hub.headers.for_child", {
          name: childName
        })}</span>
        {groupInfo && <span className="text-base font-medium text-muted-foreground">
            {groupInfo.emoji} {groupInfo.label}
          </span>}
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5">
        {t("parent_hub.headers.personalised", {
        name: childName
      })}
      </p>
    </div>;
}

// ─── Section 2 preview tiles ────────────────────────────────────────────────
// Fixed list shown ONLY for 0–24 month children. Title & description are
// looked up at render time via `t("parent_hub.web_tiles_preview.<id>.title")`
// so each tile re-renders when the active language changes.
const SECTION_2_PREVIEW_TILES: Array<{
  id: string;
  icon: React.ReactNode;
  accentClass: string;
}> = [{
  id: "life-skills",
  icon: <Compass className="h-5 w-5 text-primary" />,
  accentClass: "bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card"
}, {
  id: "olympiad",
  icon: <Trophy className="h-5 w-5 text-primary" />,
  accentClass: "bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card"
}, {
  id: "event-prep",
  icon: <Sparkles className="h-5 w-5 text-primary" />,
  accentClass: "bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card"
}, {
  id: "smart-math-tricks",
  icon: <Sigma className="h-5 w-5 text-primary" />,
  accentClass: "bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card"
}, {
  id: "abacus",
  icon: <Calculator className="h-5 w-5 text-primary" />,
  accentClass: "bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card"
}, {
  id: "smart-study",
  icon: <GraduationCap className="h-5 w-5 text-primary" />,
  accentClass: "bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card"
}, {
  id: "ptm-prep",
  icon: <ClipboardList className="h-5 w-5 text-primary" />,
  accentClass: "bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card"
}, {
  id: "phonics",
  icon: <AudioLines className="h-5 w-5 text-primary" />,
  accentClass: "bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card"
}, {
  id: "coloring-books",
  icon: <Palette className="h-5 w-5 text-primary" />,
  accentClass: "bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card"
}, {
  id: "fun-sheets",
  icon: <FileDown className="h-5 w-5 text-primary" />,
  accentClass: "bg-gradient-to-br from-muted dark:from-card to-muted dark:to-card"
}];
function PreviewHubCard({
  id,
  icon,
  title,
  description,
  accentClass
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentClass: string;
}) {
  return <div data-section-id={id} data-preview-only="true" className={["group relative rounded-2xl overflow-hidden", "bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl", "border border-white/50 dark:border-white/10", "shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]"].join(" ")}>
      <div className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div className={["w-11 h-11 rounded-2xl flex items-center justify-center shrink-0", "shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]", "ring-1 ring-white/40 dark:ring-white/10", accentClass].join(" ")}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-quicksand font-bold text-[15px] leading-tight text-foreground truncate">
            {title}
          </p>
          <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
            {description}
          </p>
        </div>
      </div>
    </div>;
}
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
      </div>
      {/* Inline language toggle so caregivers can switch English / Hindi /
          Hinglish without leaving the Parent Hub. Mirrors the mobile
          `LanguageRow` placement in artifacts/amynest-mobile/app/(tabs)/hub.tsx. */}
      <LanguageSwitcher compact />
      <Link href="/assistant">
        <button className="shrink-0 flex items-center gap-2 bg-gradient-to-br from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card rounded-2xl px-3 py-2 border border-border hover:border-primary/40 transition-all">
          <AmyIcon size={24} bounce />
          <span className="text-xs font-bold text-foreground">{t("ai.ask_amy")}</span>
          <MessageCircleHeart className="h-4 w-4 text-primary" />
        </button>
      </Link>
    </div>;
}