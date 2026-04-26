import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Brain, Sparkles, Heart, Palette,
  ChevronDown, ChevronUp, MessageCircleHeart,
  Calendar, ArrowRight, Trophy, Compass, GraduationCap, ClipboardList, Zap,
  UserPlus, CheckCircle2, Users, AudioLines, Film,
} from "lucide-react";
import { OlympiadZone } from "@/components/olympiad-zone";
import { SmartStudyZone } from "@/components/smart-study-zone";
import { PtmPrepAssistant } from "@/components/ptm-prep";
import { EventPrepCard } from "@/components/event-prep-card";
import { LifeSkillsZone } from "@/components/life-skills-zone";
import { PhonicsLearning } from "@/components/phonics-learning";
import { StoryHub } from "@/components/story-hub";
import { getAgeGroup, getAgeGroupInfo } from "@/lib/age-groups";
import { InfantMode, type InfantShowOnly } from "@/components/infant-mode";
import { InfantHub } from "@/components/infant-hub";
import { isInfantHubAge } from "@workspace/infant-hub";
import { SkillFocusSection, StorySection, ParentTasksSection } from "@/components/age-based-sections";
import { ToddlerPreschoolMode, type ToddlerShowOnly } from "@/components/toddler-preschool-mode";
import { DailyPuzzle } from "@/components/daily-puzzle";
import { AmazingFacts } from "@/components/amazing-facts";
import { DailyKidsActivity } from "@/components/daily-kids-activity";
import { ArtCraftReels } from "@/components/art-craft-reels";
import { PrintableWorksheets } from "@/components/printable-worksheets";
import { DailyTips } from "@/components/daily-tips";
import { ParentingArticles } from "@/components/parenting-articles";
import { AmyIcon } from "@/components/amy-icon";
import { FuturePredictor } from "@/components/future-predictor";
import { ParentCommandCenter } from "@/components/parent-command-center";
import { LockedBlock } from "@/components/locked-block";
import { TryFreeBadge } from "@/components/try-free-badge";
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

function HubSection({ id, icon, title, description, accentClass, defaultOpen = false, tryFree = false, onOpen, children }: SectionProps & { onOpen?: () => void }) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next) onOpen?.();
      return next;
    });
  };
  return (
    <div
      data-section-id={id}
      className={[
        "group relative rounded-2xl overflow-hidden transition-all duration-300 ease-out",
        // Glass surface — light & dark
        "bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl",
        "border border-white/50 dark:border-white/10",
        "shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]",
        // Hover glow
        "hover:border-primary/40 dark:hover:border-primary/40",
        "hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_10px_36px_-10px_rgba(168,85,247,0.35)]",
        // Active (expanded) glow — stronger
        open
          ? "border-primary/60 dark:border-primary/50 shadow-[0_0_0_1px_rgba(168,85,247,0.45),0_18px_50px_-12px_rgba(168,85,247,0.45)]"
          : "",
      ].join(" ")}
    >
      <button
        onClick={toggle}
        className={[
          "w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left",
          "transition-colors duration-200",
          open ? "bg-primary/[0.06] dark:bg-primary/[0.08]" : "hover:bg-white/40 dark:hover:bg-white/[0.03]",
        ].join(" ")}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={[
              "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
              "ring-1 ring-white/40 dark:ring-white/10",
              accentClass,
            ].join(" ")}
          >
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
        <span
          className={[
            "shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
            "border border-border/50 bg-white/50 dark:bg-white/5",
            "transition-transform duration-300",
            open ? "rotate-180 text-primary border-primary/40" : "text-muted-foreground",
          ].join(" ")}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      {open && (
        <div className="px-4 pb-5 pt-3 border-t border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/[0.015] animate-in fade-in slide-in-from-top-1 duration-300">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Amy AI Suggestions Section ───────────────────────────────────────────────
const AMY_PROMPTS = [
  { emoji: "😴", label: "Sleep problems", prompt: "My child is having trouble sleeping. What should I do?" },
  { emoji: "😤", label: "Tantrums",       prompt: "My child is having frequent tantrums. How should I handle this?" },
  { emoji: "🥦", label: "Picky eating",   prompt: "My child is a picky eater. What strategies can help?" },
  { emoji: "📚", label: "School anxiety", prompt: "My child is anxious about going to school. How can I help?" },
  { emoji: "📱", label: "Screen time",    prompt: "How much screen time is appropriate for my child's age?" },
  { emoji: "💬", label: "Language",       prompt: "How can I support my child's language and speech development?" },
];

function AmyAISuggestionsSection() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Tap a topic and Amy will give you warm, practical parenting advice — instantly.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {AMY_PROMPTS.map(p => (
          <Link key={p.label} href={`/assistant?q=${encodeURIComponent(p.prompt)}`}>
            <button className="w-full text-left flex items-center gap-2.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 px-3 py-2.5 transition-all">
              <span className="text-xl shrink-0">{p.emoji}</span>
              <span className="text-sm font-semibold text-foreground">{p.label}</span>
            </button>
          </Link>
        ))}
      </div>
      <Link href="/assistant">
        <Button variant="outline" className="w-full rounded-xl gap-2 text-sm font-semibold">
          <AmyIcon size={20} bounce />
          Ask Amy anything
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
      </Link>
    </div>
  );
}

// ─── Emotional Support Section ────────────────────────────────────────────────
const EMOTIONAL_CARDS = [
  {
    emoji: "🫂",
    title: "I'm feeling overwhelmed",
    subtitle: "It's okay. You're not alone.",
    prompt: "I'm feeling completely overwhelmed as a parent. What can I do to feel better?",
    bg: "bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-400/30 hover:border-rose-400",
  },
  {
    emoji: "😰",
    title: "My child seems anxious",
    subtitle: "Let's figure this out together.",
    prompt: "My child seems anxious and worried a lot. How can I help them?",
    bg: "bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-400/30 hover:border-amber-400",
  },
  {
    emoji: "😔",
    title: "We're struggling to connect",
    subtitle: "Small steps can make a big difference.",
    prompt: "I feel like my child and I aren't connecting well. How can we build a stronger bond?",
    bg: "bg-violet-50 dark:bg-violet-500/15 border-violet-200 dark:border-violet-400/30 hover:border-violet-400",
  },
  {
    emoji: "😮‍💨",
    title: "I need a parenting break",
    subtitle: "Self-care is part of good parenting.",
    prompt: "I'm a parent who needs some time for myself. How can I take care of my own wellbeing?",
    bg: "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-400/30 hover:border-emerald-400",
  },
];

function EmotionalSupportSection() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Parenting is hard. Amy is here to listen and help — no judgment.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {EMOTIONAL_CARDS.map(card => (
          <Link key={card.title} href={`/assistant?q=${encodeURIComponent(card.prompt)}`}>
            <button className={`w-full text-left rounded-2xl border-2 px-4 py-3 transition-all ${card.bg}`}>
              <span className="text-2xl block mb-1">{card.emoji}</span>
              <p className="font-bold text-sm text-foreground leading-tight">{card.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
            </button>
          </Link>
        ))}
      </div>
      <div className="bg-gradient-to-r from-pink-50 dark:from-pink-500/15 to-violet-50 dark:to-violet-500/15 border border-pink-200 dark:border-pink-400/30 rounded-2xl p-4 flex gap-3 items-start">
        <AmyIcon size={36} />
        <div>
          <p className="font-bold text-sm text-foreground">You're doing better than you think 💜</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Research shows that the fact you're seeking information and support makes you an above-average parent. The worry itself is evidence of love.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Activities Section ───────────────────────────────────────────────────────
interface ActivitiesSectionProps {
  ageGroup: AgeGroup;
  effectiveChild: any;
  totalAgeMonths: number;
}

function ActivitiesSection({ ageGroup, effectiveChild, totalAgeMonths }: ActivitiesSectionProps) {
  const isInfant = ageGroup === "infant";
  const isToddlerOrPreschool = ageGroup === "toddler" || ageGroup === "preschool";
  const isOlder = !isInfant && !isToddlerOrPreschool;

  return (
    <div className="space-y-4">
      {/* INFANT */}
      {isInfant && (
        <>
          <AmazingFacts childName={effectiveChild.name} ageGroup={ageGroup} />
          <InfantMode
            childName={effectiveChild.name}
            ageYears={effectiveChild.age}
            ageMonths={(effectiveChild as any).ageMonths ?? 0}
            showOnly={null}
          />
        </>
      )}

      {/* TODDLER / PRESCHOOL */}
      {isToddlerOrPreschool && (
        <>
          <DailyKidsActivity childName={effectiveChild.name} ageMonths={totalAgeMonths} />
          <ToddlerPreschoolMode
            ageGroup={ageGroup as "toddler" | "preschool"}
            childName={effectiveChild.name}
            ageYears={effectiveChild.age}
            ageMonths={(effectiveChild as any).ageMonths ?? 0}
            showOnly={null}
          />
          {ageGroup === "preschool" && (
            <DailyPuzzle
              childName={effectiveChild.name}
              ageGroup={ageGroup}
              ageYears={effectiveChild.age}
            />
          )}
          <AmazingFacts childName={effectiveChild.name} ageGroup={ageGroup} />
        </>
      )}

      {/* OLDER KIDS */}
      {isOlder && (
        <>
          {totalAgeMonths < 96 && (
            <DailyKidsActivity childName={effectiveChild.name} ageMonths={totalAgeMonths} />
          )}
          <SkillFocusSection group={ageGroup} childName={effectiveChild.name} />
          <StorySection group={ageGroup} childName={effectiveChild.name} />
          <DailyPuzzle
            childName={effectiveChild.name}
            ageGroup={ageGroup}
            ageYears={effectiveChild.age}
          />
          <ParentTasksSection group={ageGroup} childName={effectiveChild.name} />
          <AmazingFacts childName={effectiveChild.name} ageGroup={ageGroup} />
        </>
      )}

      {/* ── Google Drive: Art & Craft Reels ───────────────────── */}
      <ArtCraftReels />

      {/* ── Google Drive: Printable Worksheets ────────────────── */}
      <PrintableWorksheets childAgeMonths={totalAgeMonths} />
    </div>
  );
}

// ─── Child Selector Panel ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
];

function ChildSelectorPanel({
  childList,
  effectiveChild,
  onSelect,
}: {
  childList: any[];
  effectiveChild: any;
  onSelect: (id: number) => void;
}) {
  if (childList.length === 0) return null;

  const getInitials = (name: string) =>
    name.trim().split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const getAge = (child: any) => {
    const months = (child.ageMonths ?? 0);
    if (child.age === 0) return `${months}m`;
    if (months > 0) return `${child.age}y ${months}m`;
    return `${child.age}y`;
  };

  return (
    <div className="rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">
            {childList.length === 1 ? "Current Child" : "Select Child"}
          </span>
        </div>
        <Link href="/children/new">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            <UserPlus className="h-3.5 w-3.5" />
            Add child
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

          return (
            <button
              key={child.id}
              onClick={() => onSelect(child.id)}
              className={[
                "shrink-0 relative flex flex-col items-center gap-2 rounded-2xl px-4 py-3 min-w-[96px] transition-all duration-200",
                isSelected
                  ? "bg-primary/10 dark:bg-primary/15 border-2 border-primary shadow-[0_0_0_1px_rgba(168,85,247,0.3),0_4px_16px_-4px_rgba(168,85,247,0.4)]"
                  : "bg-white/50 dark:bg-white/[0.03] border-2 border-border hover:border-primary/50 hover:bg-primary/5",
              ].join(" ")}
            >
              {/* Selected check */}
              {isSelected && (
                <span className="absolute top-2 right-2">
                  <CheckCircle2 className="h-4 w-4 text-primary fill-primary/20" />
                </span>
              )}

              {/* Avatar */}
              <div
                className={[
                  "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base",
                  "bg-gradient-to-br shadow-md ring-2",
                  colorClass,
                  isSelected ? "ring-primary/60" : "ring-white dark:ring-white/10",
                ].join(" ")}
              >
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
              {isSelected && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80 bg-primary/10 rounded-full px-2 py-0.5">
                  Viewing
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ParentingHub() {
  const { t } = useTranslation();
  const { data: children = [], isLoading } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const STORAGE_KEY = "amynest:hub:activeChildId";
  const [selectedChildId, setSelectedChildId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? Number(saved) : null;
    }
    return null;
  });

  const childList = (children as any[]) ?? [];

  const effectiveChild = selectedChildId
    ? childList.find((c: any) => c.id === selectedChildId) ?? childList[0]
    : childList[0];

  const ageGroup: AgeGroup | null = effectiveChild
    ? getAgeGroup(effectiveChild.age, (effectiveChild as any).ageMonths ?? 0)
    : null;

  const totalAgeMonths = effectiveChild
    ? (effectiveChild.age * 12) + ((effectiveChild as any).ageMonths ?? 0)
    : 0;

  // First-Time Free + Preview Lock — every Parent Hub feature is usable ONCE
  // for free (server-tracked). After that, free users see the locked overlay;
  // premium users always get full access.
  const hubUsage = useFeatureUsage();
  const tryFreeFor = (id: string) =>
    !hubUsage.isPremium && !hubUsage.hasUsedFeature(id);

  const handleChildSelect = (id: number) => {
    setSelectedChildId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-muted-foreground animate-pulse">{t("common.loading")}</div>
      </div>
    );
  }

  // ── No children ───────────────────────────────────────────────────────────
  if (childList.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">{/* keep narrow for empty state */}
        <PageHeader />
        <Card className="rounded-3xl border-2 border-dashed">
          <CardContent className="p-10 text-center space-y-4">
            <AmyIcon size={56} bounce />
            <h3 className="font-bold text-lg">Add a child to get started</h3>
            <p className="text-sm text-muted-foreground">
              Add your child's profile to unlock age-personalised tips, articles, and activities.
            </p>
            <Link href="/children/new">
              <button className="mt-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                Add Child
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Two-section layout: For You (current band) + Explore Next (next band) ──
  const currentBand: AgeBand | null = effectiveChild
    ? getAgeBand(effectiveChild.age, (effectiveChild as any).ageMonths ?? 0)
    : null;
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
      render: () => (
        <HubSection
          id="command-center"
          icon={<Zap className="h-5 w-5 text-sky-600" />}
          title="Command Center"
          description="Today's overview, mood, sleep & quick actions"
          accentClass="bg-sky-100 dark:bg-sky-500/20"
          defaultOpen={false}
        >
          <ParentCommandCenter child={{ id: effectiveChild.id, name: effectiveChild.name }} />
        </HubSection>
      ),
    },

    // ── INFANT HUB (band-restricted, featured) ────────────────────────────
    // ONLY shown when the currently selected child is 0–24 months.
    {
      id: "infant-hub",
      bands: ["0-2"],
      featured: true,
      render: () => {
        if (!isInfantHubAge(totalAgeMonths)) return null;
        return <InfantHub childName={effectiveChild.name} ageMonths={totalAgeMonths} />;
      },
    },

    {
      id: "tomorrow-forecast",
      alwaysCurrent: true,
      featured: true,
      render: () => (
        <HubSection
          id="tomorrow-forecast"
          icon={<Sparkles className="h-5 w-5 text-violet-600" />}
          title="Amy AI — Tomorrow's Forecast"
          description="Mood, energy & sleep prediction for tomorrow"
          accentClass="bg-gradient-to-br from-violet-100 dark:from-violet-500/20 to-fuchsia-100 dark:to-fuchsia-500/20"
          defaultOpen={false}
        >
          <FuturePredictor childId={effectiveChild.id} />
        </HubSection>
      ),
    },

    // ── GRID — always-current ─────────────────────────────────────────────
    {
      id: "amy-ai",
      alwaysCurrent: true,
      render: () => (
        <HubSection
          id="amy-ai"
          icon={<AmyIcon size={22} bounce />}
          title="Ask Amy AI"
          description="Get warm, practical parenting advice"
          accentClass="bg-gradient-to-br from-amber-100 dark:from-amber-500/20 to-rose-100 dark:to-rose-500/20"
        >
          <AmyAISuggestionsSection />
        </HubSection>
      ),
    },

    {
      id: "articles",
      alwaysCurrent: true,
      render: () => (
        <LockedBlock
          reason="hub_locked"
          locked={hubUsage.isFeatureLocked("hub_articles")}
          label="Unlock to continue"
          cta="Unlock Premium"
        >
          <HubSection
            id="articles"
            icon={<BookOpen className="h-5 w-5 text-emerald-600" />}
            title="Parenting Articles"
            description="Research-based, age-matched reading"
            accentClass="bg-emerald-100 dark:bg-emerald-500/20"
            tryFree={tryFreeFor("hub_articles")}
            onOpen={() => hubUsage.markFeatureUsed("hub_articles")}
          >
            <ParentingArticles childAgeMonths={totalAgeMonths} />
          </HubSection>
        </LockedBlock>
      ),
    },

    {
      id: "daily-tips",
      alwaysCurrent: true,
      render: () => ageGroup ? (
        <LockedBlock
          reason="hub_locked"
          locked={hubUsage.isFeatureLocked("hub_tips")}
          label="Unlock to continue"
          cta="Unlock Premium"
        >
          <HubSection
            id="daily-tips"
            icon={<Sparkles className="h-5 w-5 text-violet-600" />}
            title="Daily Tips"
            description="Amy AI picks today's best tips for you"
            accentClass="bg-violet-100 dark:bg-violet-500/20"
            tryFree={tryFreeFor("hub_tips")}
            onOpen={() => hubUsage.markFeatureUsed("hub_tips")}
          >
            <DailyTips ageGroup={ageGroup} childName={effectiveChild.name} />
          </HubSection>
        </LockedBlock>
      ) : null,
    },

    {
      id: "emotional",
      alwaysCurrent: true,
      render: () => (
        <LockedBlock
          reason="hub_locked"
          locked={hubUsage.isFeatureLocked("hub_emotional")}
          label="Unlock to continue"
          cta="Unlock Premium"
        >
          <HubSection
            id="emotional"
            icon={<Heart className="h-5 w-5 text-rose-500" />}
            title="Emotional Support"
            description="For the tough parenting days"
            accentClass="bg-rose-100 dark:bg-rose-500/20"
            tryFree={tryFreeFor("hub_emotional")}
            onOpen={() => hubUsage.markFeatureUsed("hub_emotional")}
          >
            <EmotionalSupportSection />
          </HubSection>
        </LockedBlock>
      ),
    },

    {
      id: "activities",
      alwaysCurrent: true,
      render: () => ageGroup ? (
        <LockedBlock
          reason="hub_locked"
          locked={hubUsage.isFeatureLocked("hub_activities")}
          label="Unlock to continue"
          cta="Unlock Premium"
        >
          <HubSection
            id="activities"
            icon={<Palette className="h-5 w-5 text-fuchsia-600" />}
            title="Activities & Learning"
            description="Age-based games, stories & skills"
            accentClass="bg-fuchsia-100 dark:bg-fuchsia-500/20"
            tryFree={tryFreeFor("hub_activities")}
            onOpen={() => hubUsage.markFeatureUsed("hub_activities")}
          >
            <ActivitiesSection
              ageGroup={ageGroup}
              effectiveChild={effectiveChild}
              totalAgeMonths={totalAgeMonths}
            />
          </HubSection>
        </LockedBlock>
      ) : null,
    },

    // ── GRID — band-based ─────────────────────────────────────────────────
    {
      id: "story-hub",
      bands: ["0-2", "2-4", "4-6", "6-8"],
      render: () => (
        <LockedBlock
          reason="hub_locked"
          locked={hubUsage.isFeatureLocked("hub_story_hub")}
          label="Unlock to continue"
          cta="Unlock Premium"
        >
          <HubSection
            id="story-hub"
            icon={<Film className="h-5 w-5 text-rose-600" />}
            title="🎬 Kids Story Hub"
            description="A whole library of bedtime, moral & fun stories — for ages 0–8"
            accentClass="bg-gradient-to-br from-rose-100 dark:from-rose-500/20 to-purple-100 dark:to-purple-500/20"
            tryFree={tryFreeFor("hub_story_hub")}
            onOpen={() => hubUsage.markFeatureUsed("hub_story_hub")}
          >
            <StoryHub childId={effectiveChild.id} childName={effectiveChild.name} />
          </HubSection>
        </LockedBlock>
      ),
    },

    {
      id: "phonics",
      bands: ["2-4", "4-6"],
      render: () => (totalAgeMonths >= 12 && totalAgeMonths < 72) ? (
        <LockedBlock
          reason="hub_locked"
          locked={hubUsage.isFeatureLocked("hub_phonics")}
          label="Unlock to continue"
          cta="Unlock Premium"
        >
          <HubSection
            id="phonics"
            icon={<AudioLines className="h-5 w-5 text-violet-600" />}
            title="🔤 Phonics Learning"
            description="Sound awareness → blending → reading, paced for your child's age"
            accentClass="bg-gradient-to-br from-violet-100 dark:from-violet-500/20 to-fuchsia-100 dark:to-fuchsia-500/20"
            tryFree={tryFreeFor("hub_phonics")}
            onOpen={() => hubUsage.markFeatureUsed("hub_phonics")}
          >
            <PhonicsLearning
              childId={effectiveChild.id}
              childName={effectiveChild.name}
              totalAgeMonths={totalAgeMonths}
            />
          </HubSection>
        </LockedBlock>
      ) : null,
    },

    {
      id: "ptm-prep",
      bands: ["4-6", "6-8", "8-10", "10-12", "12-15"],
      render: () => (totalAgeMonths >= 36 && totalAgeMonths < 216) ? (
        <LockedBlock
          reason="hub_locked"
          locked={hubUsage.isFeatureLocked("hub_ptm_prep")}
          label="Unlock to continue"
          cta="Unlock Premium"
        >
          <HubSection
            id="ptm-prep"
            icon={<ClipboardList className="h-5 w-5 text-violet-600" />}
            title="🧾 PTM Prep Assistant"
            description="Prepare questions, take notes & turn them into action steps"
            accentClass="bg-gradient-to-br from-violet-100 dark:from-violet-500/20 to-pink-100 dark:to-pink-500/20"
            tryFree={tryFreeFor("hub_ptm_prep")}
            onOpen={() => hubUsage.markFeatureUsed("hub_ptm_prep")}
          >
            <PtmPrepAssistant child={{ id: effectiveChild.id, name: effectiveChild.name, age: effectiveChild.age }} />
          </HubSection>
        </LockedBlock>
      ) : null,
    },

    {
      id: "smart-study",
      bands: ["4-6", "6-8", "8-10", "10-12", "12-15"],
      render: () => (totalAgeMonths >= 36 && totalAgeMonths < 204) ? (
        <LockedBlock
          reason="hub_locked"
          locked={hubUsage.isFeatureLocked("hub_smart_study")}
          label="Unlock to continue"
          cta="Unlock Premium"
        >
          <HubSection
            id="smart-study"
            icon={<GraduationCap className="h-5 w-5 text-indigo-600" />}
            title="📚 Smart Study Zone"
            description="Adaptive learning Nursery → Class 10, with audio + practice"
            accentClass="bg-gradient-to-br from-indigo-100 dark:from-indigo-500/20 to-purple-100 dark:to-purple-500/20"
            tryFree={tryFreeFor("hub_smart_study")}
            onOpen={() => hubUsage.markFeatureUsed("hub_smart_study")}
          >
            <SmartStudyZone />
          </HubSection>
        </LockedBlock>
      ) : null,
    },

    {
      id: "event-prep",
      bands: ["4-6", "6-8", "8-10", "10-12", "12-15"],
      render: () => (totalAgeMonths >= 36 && totalAgeMonths < 180) ? (
        <LockedBlock
          reason="hub_locked"
          locked={hubUsage.isFeatureLocked("hub_event_prep")}
          label="Unlock to continue"
          cta="Unlock Premium"
        >
          <HubSection
            id="event-prep"
            icon={<Sparkles className="h-5 w-5 text-pink-600" />}
            title="🎉 Event Prep (School Ready)"
            description="Fancy dress, DIY guide & speeches for school events"
            accentClass="bg-gradient-to-br from-pink-100 dark:from-pink-500/20 to-orange-100 dark:to-orange-500/20"
            tryFree={tryFreeFor("hub_event_prep")}
            onOpen={() => hubUsage.markFeatureUsed("hub_event_prep")}
          >
            <EventPrepCard />
          </HubSection>
        </LockedBlock>
      ) : null,
    },

    {
      id: "olympiad",
      bands: ["4-6", "6-8", "8-10", "10-12", "12-15"],
      render: () => (totalAgeMonths >= 36 && totalAgeMonths < 192) ? (
        <LockedBlock
          reason="hub_locked"
          locked={hubUsage.isFeatureLocked("hub_olympiad")}
          label="Unlock to continue"
          cta="Unlock Premium"
        >
          <HubSection
            id="olympiad"
            icon={<Trophy className="h-5 w-5 text-amber-600" />}
            title="Smart Olympiad Zone"
            description="Daily 5 MCQs, weekly tests, badges & insights"
            accentClass="bg-gradient-to-br from-amber-100 dark:from-amber-500/20 to-yellow-100 dark:to-yellow-500/20"
            tryFree={tryFreeFor("hub_olympiad")}
            onOpen={() => hubUsage.markFeatureUsed("hub_olympiad")}
          >
            <OlympiadZone child={{ id: effectiveChild.id, name: effectiveChild.name, age: effectiveChild.age }} />
          </HubSection>
        </LockedBlock>
      ) : null,
    },

    {
      id: "life-skills",
      bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"],
      render: () => (totalAgeMonths >= 24 && totalAgeMonths < 192) ? (
        <LockedBlock
          reason="hub_locked"
          locked={hubUsage.isFeatureLocked("hub_life_skills")}
          label="Unlock to continue"
          cta="Unlock Premium"
        >
          <HubSection
            id="life-skills"
            icon={<Compass className="h-5 w-5 text-emerald-600" />}
            title="🧭 Life Skills Mode"
            description="Daily real-life skills tailored to your child's age"
            accentClass="bg-gradient-to-br from-emerald-100 dark:from-emerald-500/20 to-teal-100 dark:to-teal-500/20"
            tryFree={tryFreeFor("hub_life_skills")}
            onOpen={() => hubUsage.markFeatureUsed("hub_life_skills")}
          >
            <LifeSkillsZone child={{ id: effectiveChild.id, name: effectiveChild.name, age: effectiveChild.age }} />
          </HubSection>
        </LockedBlock>
      ) : null,
    },
  ] : [];

  // Bucket sections by age band.
  const inForYou = (s: SectionEntry) =>
    s.alwaysCurrent || (currentBand !== null && (s.bands?.includes(currentBand) ?? false));

  const forYouAll = sections.filter(inForYou);
  const forYouFeatured = forYouAll.filter((s) => s.featured);
  const forYouGrid = forYouAll.filter((s) => !s.featured);

  // Section 2 ("Explore Next Stage") is shown ONLY for children whose age is
  // 0–24 months (band "0-2"). For 2+ children, Section 2 is removed entirely.
  // The preview tiles below are a fixed set the user has asked us to surface
  // for 0–24 month children, regardless of each tile's own band metadata.
  const showSection2 = currentBand === "0-2" && nextBand !== null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <PageHeader />

      {/* ── Child Selector Panel ────────────────────────────────────────── */}
      <ChildSelectorPanel
        childList={childList}
        effectiveChild={effectiveChild}
        onSelect={handleChildSelect}
      />

      {effectiveChild && currentBand && (
        <>
          {/* ── SECTION 1: For {Child Name} ─────────────────────────────── */}
          <ForYouHeader
            childName={effectiveChild.name}
            band={currentBand}
            ageGroup={ageGroup}
          />

          {/* Featured (full-width) */}
          {forYouFeatured.length > 0 && (
            <div className="space-y-3">
              {forYouFeatured.map((s) => {
                const node = s.render();
                return node ? <div key={s.id}>{node}</div> : null;
              })}
            </div>
          )}

          {/* 2-column grid */}
          {forYouGrid.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
              {forYouGrid.map((s) => {
                const node = s.render();
                return node ? <div key={s.id}>{node}</div> : null;
              })}
            </div>
          )}

          {/* ── SECTION 2: Explore Next Stage — ONLY for 0-24 month children ── */}
          {showSection2 && nextBand && (
            <>
              <ExploreNextHeader
                childName={effectiveChild.name}
                band={nextBand}
              />
              <div
                data-testid="section-2-previews"
                className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start pt-2"
              >
                {SECTION_2_PREVIEW_TILES.map((t) => (
                  <ComingNextWrapper key={t.id} band={nextBand}>
                    <PreviewHubCard
                      id={t.id}
                      icon={t.icon}
                      title={t.title}
                      description={t.description}
                      accentClass={t.accentClass}
                    />
                  </ComingNextWrapper>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Bottom CTA */}
      <div className="text-center pt-2">
        <Link href="/routines/generate">
          <button className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline">
            <Calendar className="h-4 w-4" />
            Generate today's routine
          </button>
        </Link>
      </div>
    </div>
  );
}

// ─── Section 1 / Section 2 headers ───────────────────────────────────────────
function ForYouHeader({
  childName,
  band,
  ageGroup,
}: {
  childName: string;
  band: AgeBand;
  ageGroup: AgeGroup | null;
}) {
  const groupInfo = ageGroup ? getAgeGroupInfo(ageGroup) : null;
  return (
    <div className="pt-1">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80">
          Section 1 · For you
        </span>
        <Badge variant="outline" className="rounded-full px-2.5 py-0 h-5 font-semibold text-[10px] gap-1">
          {bandLabel(band)}
        </Badge>
      </div>
      <h2 className="font-quicksand text-xl font-bold text-foreground mt-1.5 flex items-center gap-2 flex-wrap">
        <span>For {childName}</span>
        {groupInfo && (
          <span className="text-base font-medium text-muted-foreground">
            {groupInfo.emoji} {groupInfo.label}
          </span>
        )}
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5">
        Personalised content tuned to where {childName} is right now.
      </p>
    </div>
  );
}

// ─── Section 2 preview tiles ────────────────────────────────────────────────
// Fixed list shown ONLY for 0–24 month children. These mirror the metadata of
// the corresponding interactive sections (life-skills, olympiad, event-prep,
// smart-study, ptm-prep, phonics) so parents can preview what's coming.
const SECTION_2_PREVIEW_TILES: Array<{
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentClass: string;
}> = [
  {
    id: "life-skills",
    icon: <Compass className="h-5 w-5 text-emerald-600" />,
    title: "🧭 Life Skills Mode",
    description: "Daily real-life skills tailored to your child's age",
    accentClass: "bg-gradient-to-br from-emerald-100 dark:from-emerald-500/20 to-teal-100 dark:to-teal-500/20",
  },
  {
    id: "olympiad",
    icon: <Trophy className="h-5 w-5 text-amber-600" />,
    title: "🏆 Smart Olympiad Zone",
    description: "Daily 5 MCQs, weekly tests, badges & insights",
    accentClass: "bg-gradient-to-br from-amber-100 dark:from-amber-500/20 to-yellow-100 dark:to-yellow-500/20",
  },
  {
    id: "event-prep",
    icon: <Sparkles className="h-5 w-5 text-pink-600" />,
    title: "🎉 Event Prep (School Ready)",
    description: "Fancy dress, DIY guide & speeches for school events",
    accentClass: "bg-gradient-to-br from-pink-100 dark:from-pink-500/20 to-orange-100 dark:to-orange-500/20",
  },
  {
    id: "smart-study",
    icon: <GraduationCap className="h-5 w-5 text-indigo-600" />,
    title: "📚 Smart Study Zone",
    description: "Adaptive learning Nursery → Class 10, with audio + practice",
    accentClass: "bg-gradient-to-br from-indigo-100 dark:from-indigo-500/20 to-purple-100 dark:to-purple-500/20",
  },
  {
    id: "ptm-prep",
    icon: <ClipboardList className="h-5 w-5 text-violet-600" />,
    title: "🧾 PTM Prep Assistance",
    description: "Prepare questions, take notes & turn them into action steps",
    accentClass: "bg-gradient-to-br from-violet-100 dark:from-violet-500/20 to-pink-100 dark:to-pink-500/20",
  },
  {
    id: "phonics",
    icon: <AudioLines className="h-5 w-5 text-violet-600" />,
    title: "🔤 Phonics Learning",
    description: "Sound awareness → blending → reading, paced for your child's age",
    accentClass: "bg-gradient-to-br from-violet-100 dark:from-violet-500/20 to-fuchsia-100 dark:to-fuchsia-500/20",
  },
  {
    id: "coloring-books",
    icon: <Palette className="h-5 w-5 text-rose-600" />,
    title: "🎨 Coloring Books",
    description: "Printable coloring sheets with preview & one-tap download",
    accentClass: "bg-gradient-to-br from-rose-100 dark:from-rose-500/20 to-pink-100 dark:to-pink-500/20",
  },
];

function PreviewHubCard({
  id,
  icon,
  title,
  description,
  accentClass,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentClass: string;
}) {
  return (
    <div
      data-section-id={id}
      data-preview-only="true"
      className={[
        "group relative rounded-2xl overflow-hidden",
        "bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl",
        "border border-white/50 dark:border-white/10",
        "shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]",
      ].join(" ")}
    >
      <div className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div
          className={[
            "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
            "ring-1 ring-white/40 dark:ring-white/10",
            accentClass,
          ].join(" ")}
        >
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
    </div>
  );
}

function ExploreNextHeader({
  childName,
  band,
}: {
  childName: string;
  band: AgeBand;
}) {
  return (
    <div className="pt-6">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
          Section 2 · Coming next
        </span>
        <Badge
          variant="outline"
          className="rounded-full px-2.5 py-0 h-5 font-semibold text-[10px] gap-1 border-amber-300/60 dark:border-amber-400/30 text-amber-800 dark:text-amber-200"
        >
          {bandLabel(band)}
        </Badge>
      </div>
      <h2 className="font-quicksand text-xl font-bold text-foreground mt-1.5">
        Explore the next stage for {childName}
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
        We grow as {childName} grows — here's a peek at what unlocks next so you
        can plan ahead and stay one step in front.
      </p>
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────
function PageHeader() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <h1 className="font-quicksand text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-emerald-600" />
          {t("hub.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("hub.subtitle")}
        </p>
      </div>
      <Link href="/assistant">
        <button className="shrink-0 flex items-center gap-2 bg-gradient-to-br from-amber-100 dark:from-amber-500/20 via-rose-100 dark:via-rose-500/20 to-violet-200 dark:to-violet-500/25 rounded-2xl px-3 py-2 border border-border hover:border-primary/40 transition-all">
          <AmyIcon size={24} bounce />
          <span className="text-xs font-bold text-foreground">{t("ai.ask_amy")}</span>
          <MessageCircleHeart className="h-4 w-4 text-rose-500" />
        </button>
      </Link>
    </div>
  );
}
