import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useAppNavigate } from "@/components/app-link";
import { useLocation, Link } from "wouter";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useToast } from "@/hooks/use-toast";
import { useCoachJourney } from "@/hooks/use-coach-journey";
import { coachGoalCategoryId, coachCategoryGoalCount, goalIndexInCoachCategory, buildCoachGraduationViewModel, type GraduationPath } from "@workspace/coach-journey";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { usePaywall } from "@/contexts/paywall-context";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import {
  trackCoachCategoryOpened,
  trackCoachLockedClick,
  trackCoachPremiumItemViewed,
} from "@/lib/content-gating-analytics";
import { Sparkles, ArrowLeft, ArrowRight, Loader2, Search, Check, ChevronLeft, ChevronRight, ChevronDown, RotateCcw, BarChart3, Share2, Bookmark, Brain, Heart, Printer, Volume2, VolumeX, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { INFANT_PROBLEMS, isInfantProblemId, getInfantProblem, pickLang as pickInfLang } from "@workspace/infant-problems";
import { getTopicQuestions } from "@workspace/coach-topic-questions";
import { COACH_AUDIO_GOAL_STORAGE_KEY } from "@/lib/audio-lessons";
import { AGE_TILE_META } from "@/lib/audio-lessons-nav";
import {
  type CoachAgeBand,
  COACH_AGE_BAND_OPTIONS,
  childToCoachAgeBand,
  coachBandToAgeAnswer,
  coachAgeAnswerToApi,
  getCategoryHint,
  groupCategoriesForBand,
  isCategoryVisibleForBand,
  COACH_FOR_YOU_CATEGORY_ID,
  resolveActiveChild,
} from "@/lib/coach-age-nav";
import { getGenericQuestionOptions } from "@/lib/coach-generic-questions";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { formatAge } from "@/lib/age-groups";
import { pregenerateCoachPlanAudio } from "@/lib/coach-audio-playback";
import { prefetchCoachWin } from "@/lib/amy-voice-pipeline-optimizer";
import {
  createCoachAudioIdentity,
  buildCoachWinListenText,
  buildInfantCoachPlanCacheKey,
} from "@/lib/coach-audio-identity";
import { buildAmyUnderstandingView } from "@/lib/coach-understanding";
import { buildCoachWinRationale } from "@/lib/coach-win-rationale";
import { mirrorWinFeedbackLocally } from "@/lib/coach-intelligence-state";
import { useCoachIntelligence } from "@/hooks/use-coach-intelligence";
import { recordCoachActivity } from "@/lib/coach-check-in-state";
import {
  CoachUnderstandingScreen,
  CoachGeneratingScreen,
  COACH_LOADING_MESSAGES,
} from "@/pages/coach-understanding-screen";
import { CoachGraduationScreen } from "@/pages/coach-graduation-screen";
import {
  isSessionGraduated,
  saveCoachGraduation,
} from "@/lib/coach-graduation-state";

/** Lazy win generation can take ~25s server-side; default fetch timeout is 8s. */
const COACH_AI_FETCH_TIMEOUT_MS = 90_000;

// ─── Goals (categorized) ───────────────────────────────────────────────────
interface GoalItem {
  id: string;
  title: string;
  emoji: string;
  gradient: string;
}
interface GoalCategory {
  id: string;
  title: string;
  emoji: string;
  gradient: string;
  items: GoalItem[];
}
const GOAL_CATEGORIES: GoalCategory[] = [{
  id: "behavior",
  title: "Behavior",
  emoji: "🎯",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: [{
    id: "manage-tantrums",
    title: "Manage Tantrums",
    emoji: "😤",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "handle-aggression",
    title: "Handle Aggression",
    emoji: "✋",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "reduce-defiance",
    title: "Reduce Defiance",
    emoji: "🛑",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "emotional-regulation",
    title: "Emotional Regulation",
    emoji: "💗",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "separation-anxiety",
    title: "Separation Anxiety",
    emoji: "🫂",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }]
}, {
  id: "screen-focus",
  title: "Screen & Focus",
  emoji: "📱",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: [{
    id: "balance-screen-time",
    title: "Balance Screen Time",
    emoji: "📱",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "reduce-mobile-addiction",
    title: "Reduce Mobile Addiction",
    emoji: "📵",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "improve-focus-span",
    title: "Improve Focus Span",
    emoji: "🎯",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "reduce-shorts-overuse",
    title: "Reduce YouTube / Shorts Overuse",
    emoji: "🎬",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "reduce-instant-gratification",
    title: "Reduce Instant Gratification",
    emoji: "⏳",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }]
}, {
  id: "eating",
  title: "Eating",
  emoji: "🍽️",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: [{
    id: "encourage-independent-eating",
    title: "Encourage Independent Eating",
    emoji: "🥄",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "navigate-fussy-eating",
    title: "Navigate Fussy Eating",
    emoji: "🥦",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "stop-junk-food-craving",
    title: "Stop Junk Food Craving",
    emoji: "🍟",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "healthy-eating-routine",
    title: "Build Healthy Eating Routine",
    emoji: "🍎",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "improve-mealtime-behavior",
    title: "Improve Mealtime Behavior",
    emoji: "🍽️",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }]
}, {
  id: "sleep",
  title: "Sleep",
  emoji: "😴",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: [{
    id: "improve-sleep-patterns",
    title: "Improve Sleep Patterns",
    emoji: "😴",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "fix-bedtime-resistance",
    title: "Fix Bedtime Resistance",
    emoji: "🛏️",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "stop-night-waking",
    title: "Stop Night Waking",
    emoji: "🌙",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "consistent-sleep-routine",
    title: "Build Consistent Routine",
    emoji: "🕘",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "reduce-late-sleeping",
    title: "Reduce Late Sleeping Habit",
    emoji: "⏰",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }]
}, {
  id: "learning",
  title: "Learning",
  emoji: "📚",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: [{
    id: "boost-concentration",
    title: "Boost Concentration",
    emoji: "🎯",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "build-study-discipline",
    title: "Build Study Discipline",
    emoji: "📖",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "increase-learning-interest",
    title: "Increase Learning Interest",
    emoji: "💡",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "reduce-homework-resistance",
    title: "Reduce Homework Resistance",
    emoji: "✏️",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "develop-growth-mindset",
    title: "Develop Growth Mindset",
    emoji: "🌱",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }]
}, {
  id: "infant-problems",
  title: "Baby Care (0–2 yrs)",
  emoji: "👶",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: INFANT_PROBLEMS.map(p => ({
    id: p.id,
    title: p.title.en,
    emoji: p.emoji,
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }))
}, {
  id: "parenting-challenges",
  title: "Parenting Challenges",
  emoji: "💝",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: [{
    id: "manage-grandparents-interference",
    title: "Manage Grandparents' Interference",
    emoji: "👵",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "align-parenting-between-parents",
    title: "Align Parenting Between Parents",
    emoji: "🤝",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "handle-working-parent-guilt",
    title: "Handle Working Parent Guilt",
    emoji: "💼",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "set-consistent-family-rules",
    title: "Set Consistent Family Rules",
    emoji: "📋",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }]
},
// ─── NEW: Toddler Behavior (2–4 yrs focused) ─────────────────────────
{
  id: "toddler-behavior",
  title: "Toddler Behavior (2–4 yrs)",
  emoji: "🧒",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: [{
    id: "toddler-tantrums",
    title: "Toddler Tantrums (2–4)",
    emoji: "😤",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "hitting-biting",
    title: "Hitting & Biting",
    emoji: "🦷",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "no-phase",
    title: "The 'No' Phase",
    emoji: "🙅",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "public-meltdowns",
    title: "Public Meltdowns",
    emoji: "🛒",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "whining-and-clinginess",
    title: "Whining & Clinginess",
    emoji: "🥺",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }]
},
// ─── NEW: Daily Skills & Independence ────────────────────────────────
{
  id: "daily-skills",
  title: "Daily Skills & Independence",
  emoji: "🚽",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: [{
    id: "potty-training-readiness",
    title: "Potty Training Readiness",
    emoji: "🪴",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "potty-day-training",
    title: "Day Toilet Training",
    emoji: "🚽",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "potty-night-training",
    title: "Night-Time Dry",
    emoji: "🌙",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "potty-public-anxiety",
    title: "Public Toilet Anxiety",
    emoji: "🚻",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "self-dressing",
    title: "Self-Dressing & Hygiene",
    emoji: "👕",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }]
},
// ─── NEW: Family Dynamics ────────────────────────────────────────────
{
  id: "family-dynamics",
  title: "Family Dynamics",
  emoji: "👨‍👩‍👧‍👦",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: [{
    id: "sibling-rivalry",
    title: "Sibling Rivalry",
    emoji: "⚔️",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "sharing-turn-taking",
    title: "Sharing & Turn-Taking",
    emoji: "🤲",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "new-baby-adjustment",
    title: "Adjusting to New Baby",
    emoji: "👶",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "sibling-fights",
    title: "Sibling Fights & Hitting",
    emoji: "🥊",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "favouritism-feelings",
    title: "Handle Favouritism Feelings",
    emoji: "💔",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }]
},
// ─── NEW: Special Situations ─────────────────────────────────────────
{
  id: "special-situations",
  title: "Special Situations",
  emoji: "✈️",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: [{
    id: "travel-with-kids",
    title: "Travel With Kids",
    emoji: "✈️",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "hospital-doctor-visit",
    title: "Hospital / Doctor Visit",
    emoji: "🏥",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "daycare-school-transition",
    title: "Daycare / School Transition",
    emoji: "🎒",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "welcoming-new-sibling",
    title: "Welcoming a New Sibling",
    emoji: "🎀",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "moving-houses",
    title: "Moving to a New Home",
    emoji: "📦",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }]
},
// ─── NEW: Kids Health Concern (research & science-based) ─────────────
{
  id: "kids-health-concern",
  title: "Kids Health Concern",
  emoji: "🩺",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: [{
    id: "child-obesity-management",
    title: "Childhood Obesity & Weight Management",
    emoji: "⚖️",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "nutrition-deficiency",
    title: "Nutrition Deficiency (Hidden Problem)",
    emoji: "🥗",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "boost-immunity",
    title: "Immunity & Frequent Illness",
    emoji: "🛡️",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "dental-health",
    title: "Dental Health",
    emoji: "🦷",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "digital-health-eye-care",
    title: "Screen Addiction & Digital Health",
    emoji: "👀",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "early-milestones-0-5",
    title: "Early Development & Milestones (0–5 yrs)",
    emoji: "🌱",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }]
},
// ─── For You (Parent Self-Care) — age question is skipped for this category ─
{
  id: "for-you",
  title: "For You",
  emoji: "💖",
  gradient: "from-muted dark:from-card via-muted dark:via-card to-muted dark:to-card",
  items: [{
    id: "parent-burnout",
    title: "Beat Parent Burnout",
    emoji: "🪫",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "stay-calm-anger",
    title: "Stay Calm When Angry",
    emoji: "🧘",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "guilt-after-yelling",
    title: "Handle Guilt After Yelling",
    emoji: "💔",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "find-me-time",
    title: "Find 'Me Time' Daily",
    emoji: "☕",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "couple-time-balance",
    title: "Balance Partner & Parent Time",
    emoji: "💑",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "improve-own-sleep",
    title: "Improve Your Own Sleep",
    emoji: "🌙",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }, {
    id: "manage-overwhelm",
    title: "Manage Daily Overwhelm",
    emoji: "🌪️",
    gradient: "from-muted dark:from-card to-muted dark:to-card"
  }]
}];
const ALL_GOALS: GoalItem[] = GOAL_CATEGORIES.flatMap(c => c.items);
const GOAL_CATALOG = ALL_GOALS.map((g) => ({
  id: g.id,
  title: g.title,
  categoryId: coachGoalCategoryId(g.id) ?? "",
}));

/** Per-category tile gradients — same palette as Amy Audio Lessons age tiles. */
const COACH_CATEGORY_TILE_GRADIENTS: Record<string, string> = {
  behavior: "linear-gradient(135deg, hsl(var(--brand-pink-500) / 0.35), hsl(var(--brand-violet-600) / 0.25))",
  "screen-focus": "linear-gradient(135deg, hsl(var(--brand-amber-400) / 0.3), hsl(var(--brand-pink-500) / 0.25))",
  eating: "linear-gradient(135deg, hsl(var(--brand-emerald-500) / 0.28), hsl(var(--brand-violet-500) / 0.22))",
  sleep: "linear-gradient(135deg, hsl(var(--brand-violet-500) / 0.3), hsl(var(--brand-violet-700) / 0.28))",
  learning: "linear-gradient(135deg, hsl(var(--brand-violet-400) / 0.32), hsl(var(--brand-emerald-500) / 0.2))",
  "infant-problems": "linear-gradient(135deg, hsl(var(--brand-pink-500) / 0.38), hsl(var(--brand-violet-600) / 0.26))",
  "parenting-challenges": "linear-gradient(135deg, hsl(var(--brand-amber-400) / 0.28), hsl(var(--brand-violet-500) / 0.24))",
  "toddler-behavior": "linear-gradient(135deg, hsl(var(--brand-amber-400) / 0.32), hsl(var(--brand-pink-500) / 0.24))",
  "daily-skills": "linear-gradient(135deg, hsl(var(--brand-emerald-500) / 0.3), hsl(var(--brand-violet-500) / 0.22))",
  "family-dynamics": "linear-gradient(135deg, hsl(var(--brand-violet-400) / 0.3), hsl(var(--brand-pink-500) / 0.22))",
  "special-situations": "linear-gradient(135deg, hsl(var(--brand-violet-600) / 0.32), hsl(var(--brand-amber-400) / 0.18))",
  "kids-health-concern": "linear-gradient(135deg, hsl(var(--brand-emerald-500) / 0.26), hsl(var(--brand-violet-600) / 0.24))",
  "for-you": "linear-gradient(135deg, hsl(var(--brand-pink-500) / 0.32), hsl(var(--brand-violet-400) / 0.22))",
};

const COACH_TILE_BORDER = "1px solid rgba(139,92,246,0.28)";
const COACH_TILE_SHADOW = "0 0 35px hsl(var(--brand-violet-500) / 0.2), inset 0 1px 0 hsl(var(--foreground) / 0.08)";

function coachCategoryGradient(categoryId: string): string {
  return (
    COACH_CATEGORY_TILE_GRADIENTS[categoryId]
    ?? "linear-gradient(135deg, hsl(var(--brand-violet-500) / 0.3), hsl(var(--brand-violet-600) / 0.25))"
  );
}

/** Category gradient layered on the theme card surface — readable in light + dark. */
function coachCategoryPanelBackground(categoryId: string): string {
  return `${coachCategoryGradient(categoryId)}, hsl(var(--card))`;
}

function categoryGoalCount(categoryId: string, fallback: number): number {
  const fromCatalog = coachCategoryGoalCount(categoryId);
  return fromCatalog > 0 ? fromCatalog : fallback;
}

// ─── Free vs Premium goal gating ──────────────────────────────────────────
// Exactly ONE goal per category is offered as a free sample.
// Every other goal requires a premium subscription.
type GoalAccess = "open" | "try-free" | "locked";
function GoalBadge({
  access
}: {
  access: GoalAccess;
}) {
  const {
    t
  } = useTranslation();
  if (access === "open") return null;
  if (access === "try-free") {
    return <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full shadow-md pointer-events-none select-none">
        {t("pages.ai_coach.try_free")}
      </span>;
  }
  return <span data-on-dark className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold bg-black/30 text-white/90 px-1.5 py-0.5 rounded-full border border-white/25 backdrop-blur-sm pointer-events-none select-none">
      <Lock className="h-2.5 w-2.5" /> {t("pages.ai_coach.premium")}
    </span>;
}

function FreemiumCatalogBanner() {
  const { t } = useTranslation();
  return <div data-on-dark className="rounded-2xl border border-violet-400/25 px-4 py-3 text-sm" style={{
    background: "linear-gradient(135deg,rgba(76,29,149,0.35) 0%,rgba(124,58,237,0.22) 100%)",
  }}>
      <p className="font-semibold text-white">{t("pages.ai_coach.catalog_banner_title", { defaultValue: "Browse the full catalog" })}</p>
      <p className="text-xs mt-1 text-white/80">
        {t("pages.ai_coach.catalog_banner_body", {
          defaultValue: "Every topic is visible. The first goal in each category is free — upgrade for unlimited personalized plans.",
        })}
      </p>
    </div>;
}

// Goals whose parent category already implies an age → skip the ageGroup question.
// "for-you" is parent self-care, so age is irrelevant — we mark it as adult.
const CATEGORY_IMPLIED_AGE: Record<string, string> = {
  "toddler-behavior": "2–4 years",
  "daily-skills": "2–4 years",
  "for-you": "Adult (parent self-care)"
};
// Build a fast lookup: goalId → implied age answer
const GOAL_IMPLIED_AGE: Record<string, string> = {};
GOAL_CATEGORIES.forEach(cat => {
  const implied = CATEGORY_IMPLIED_AGE[cat.id];
  if (implied) cat.items.forEach(g => {
    GOAL_IMPLIED_AGE[g.id] = implied;
  });
});

// ─── Question definitions ──────────────────────────────────────────────────
type QuestionType = "single" | "multi";
interface Question {
  id: string;
  prompt: string;
  type: QuestionType;
  options: string[];
}
// Generic fallback question set — used for topics that don't have a custom
// schema in coachTopicQuestions.json. Options vary by category (see
// coach-generic-questions.ts). ageGroup + severity are prepended for
// topic-specific flows too.
const AGE_QUESTION: Question = {
  id: "ageGroup",
  prompt: "What's your child's age?",
  type: "single",
  options: ["0–2 years", "2–4 years", "5–7 years", "8–10 years", "10+ years (tween/teen)"],
};
const SEVERITY_QUESTION: Question = {
  id: "severity",
  prompt: "How challenging is it right now?",
  type: "single",
  options: ["Mild – occasional", "Moderate – frequent", "Severe – daily struggle"],
};

function buildGenericQuestions(categoryId: string): Question[] {
  const opts = getGenericQuestionOptions(categoryId);
  return [AGE_QUESTION, SEVERITY_QUESTION, {
    id: "triggers",
    prompt: "What triggers it most? (pick any)",
    type: "multi",
    options: opts.triggers,
  }, {
    id: "routine",
    prompt: "What's your current approach?",
    type: "single",
    options: opts.routine,
  }, {
    id: "goalRefinement",
    prompt: "What matters most to you?",
    type: "single",
    options: opts.goalRefinement,
  }];
}

// Reserved keys handled directly by the existing payload — never sent in
// the freeform `topicAnswers` blob to the server.
const RESERVED_ANSWER_KEYS = new Set(["ageGroup", "severity", "triggers", "routine", "goalRefinement"]);

// ─── Types ─────────────────────────────────────────────────────────────────
export interface Win {
  win: number;
  title: string;
  objective: string;
  deep_explanation: string;
  actions: string[];
  example: string;
  mistake_to_avoid: string;
  micro_task: string;
  duration: string;
  science_reference: string;
}
interface Plan {
  title: string;
  root_cause: string;
  summary: string;
  wins: Win[];
}
type Phase = "goals" | "questions" | "understanding" | "loading" | "result" | "graduation" | "infantProblem" | "resuming";
type Feedback = "yes" | "somewhat" | "no";

function coachFeedbackPoints(f: Feedback): number {
  return f === "yes" ? 1 : f === "somewhat" ? 0.5 : 0;
}

function computeCoachProgressPct(
  feedbackByWin: Record<number, Feedback>,
  denom: number,
): number {
  if (denom <= 0) return 0;
  const sum = Object.values(feedbackByWin).reduce(
    (acc, fb) => acc + coachFeedbackPoints(fb),
    0,
  );
  return Math.min(100, Math.round((sum / denom) * 100));
}

function summarizeCoachText(text: string, maxSentences = 2): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [trimmed];
  const summary = sentences.slice(0, maxSentences).join(" ").trim();
  if (summary.length > 0) return summary;
  return trimmed.length > 180 ? `${trimmed.slice(0, 177).trim()}…` : trimmed;
}

function CoachExpandable({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        marginBottom: 10,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "11px 14px",
          border: "none",
          background: "transparent",
          color: "rgba(255,255,255,0.72)",
          fontSize: 12.5,
          fontWeight: 700,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span>{label}</span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            opacity: 0.7,
          }}
        />
      </button>
      {open && (
        <div
          style={{
            padding: "0 14px 12px",
            fontSize: 13,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
export default function AICoachPage() {
  const [, setLocation] = useLocation();
  const { back: navigateBack } = useAppNavigate();
  const authFetch = useAuthFetch();
  const { userId } = useAuth();
  const {
    toast
  } = useToast();
  const {
    i18n,
    t
  } = useTranslation();

  // Detect ?resume=<sessionId> from URL (set by ai-coach-progress "Continue plan" button)
  const resumeSessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("resume") ?? "";
  }, []);
  const forceGraduationReview = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("graduation") === "1";
  }, []);
  const [phase, setPhase] = useState<Phase>(resumeSessionId ? "resuming" : "goals");
  const [goalSearch, setGoalSearch] = useState("");
  const [coachAgeBand, setCoachAgeBand] = useState<CoachAgeBand | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string>("");
  const coachIntelligence = useCoachIntelligence(goalId || undefined);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planCacheKey, setPlanCacheKey] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [feedbackByWin, setFeedbackByWin] = useState<Record<number, Feedback>>({});
  const [progressSnapshotByWin, setProgressSnapshotByWin] = useState<
    Record<number, { from: number; to: number }>
  >({});
  const [extending, setExtending] = useState(false);
  const [progressWinCount, setProgressWinCount] = useState(0);
  const [loadingNextWin, setLoadingNextWin] = useState(false);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const [isFirstCoachingWin, setIsFirstCoachingWin] = useState(false);
  const fetchingNextRef = useRef(false);
  const extendingRef = useRef(false);

  // Keep last submitted answers/payload around so lazy /next-win and /extend work
  const lastPayloadRef = useRef<{
    goal: string;
    ageGroup: string;
    severity: string;
    triggers: string[];
    routine: string;
    topicAnswers?: Record<string, string | string[]>;
  } | null>(null);

  const planRef = useRef(plan);
  planRef.current = plan;

  // Warm shared coach audio cache when a plan loads (all wins, global reuse).
  useEffect(() => {
    const key = planCacheKey.trim();
    if (!key || !plan?.wins?.length) return;
    pregenerateCoachPlanAudio(authFetch, key, plan.wins);
    const first = plan.wins[0];
    if (first) {
      prefetchCoachWin(createCoachAudioIdentity({ planCacheKey: key, win: first }), authFetch);
    }
  }, [authFetch, plan, planCacheKey]);

  // Freeze the denominator at the original plan size (12).
  // Extension cards are bonus — adding them must never drop the progress %.
  const originalWinCountRef = useRef<number>(0);

  // Progress %: Worked = 100%, Partially = 50%, Not worked = 0%
  // Denominator = original plan win count (never grows with extensions).
  const progressPct = useMemo(() => {
    const denom = originalWinCountRef.current;
    if (!plan || denom === 0) return 0;
    return computeCoachProgressPct(feedbackByWin, denom);
  }, [feedbackByWin, plan]);

  const coachRationaleAnswers = useMemo((): Record<string, string | string[]> => {
    if (Object.keys(answers).length > 0) return answers;
    const payload = lastPayloadRef.current;
    if (!payload) return {};
    const sevFromApi: Record<string, string> = {
      mild: "Mild – occasional",
      moderate: "Moderate – frequent",
      severe: "Severe – daily struggle",
    };
    const ageFromApi: Record<string, string> = {
      "0-2": "0–2 years",
      "2-4": "2–4 years",
      "5-7": "5–7 years",
      "8-10": "8–10 years",
      "10+": "10+ years",
      adult: "Adult (for me)",
    };
    const merged: Record<string, string | string[]> = {};
    if (payload.ageGroup) merged.ageGroup = ageFromApi[payload.ageGroup] ?? payload.ageGroup;
    if (payload.severity) merged.severity = sevFromApi[payload.severity] ?? payload.severity;
    if (payload.triggers?.length) merged.triggers = payload.triggers;
    if (payload.routine) merged.routine = payload.routine;
    if (payload.topicAnswers) Object.assign(merged, payload.topicAnswers);
    return merged;
  }, [answers, plan, goalId]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Tracks the in-flight Build Plan request so we can abort it if the user
  // navigates away or retries — prevents leaks and stale setState calls.
  const buildAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      buildAbortRef.current?.abort();
    };
  }, []);
  const searchQuery = goalSearch.toLowerCase().trim();

  const { data: childrenList } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      staleTime: 60_000,
    },
  });
  const activeChild = useMemo(
    () => resolveActiveChild(childrenList as { id: number; age: number; ageMonths?: number | null; name?: string | null }[] | undefined),
    [childrenList],
  );

  useEffect(() => {
    if (coachAgeBand !== null || resumeSessionId || phase !== "goals") return;
    if (!activeChild) return;
    setCoachAgeBand(childToCoachAgeBand(activeChild.age, activeChild.ageMonths ?? 0));
  }, [activeChild, coachAgeBand, phase, resumeSessionId]);

  const ageFilteredCategories = useMemo(() => {
    const childCategories = GOAL_CATEGORIES.filter((c) => c.id !== COACH_FOR_YOU_CATEGORY_ID);
    const forYouCat = GOAL_CATEGORIES.find((c) => c.id === COACH_FOR_YOU_CATEGORY_ID);
    if (!coachAgeBand) return GOAL_CATEGORIES;
    const filtered = childCategories.filter((c) => isCategoryVisibleForBand(c.id, coachAgeBand));
    if (searchQuery && forYouCat) return [...filtered, forYouCat];
    return filtered;
  }, [coachAgeBand, searchQuery]);

  const filteredCategories = useMemo(() => {
    const base = ageFilteredCategories;
    if (!searchQuery) return base;
    return base.map(c => ({
      ...c,
      items: c.items.filter(g => g.title.toLowerCase().includes(searchQuery))
    })).filter(c => c.items.length > 0);
  }, [searchQuery, ageFilteredCategories]);
  const totalMatches = useMemo(() => filteredCategories.reduce((n, c) => n + c.items.length, 0), [filteredCategories]);
  const selectedGoal = ALL_GOALS.find(g => g.id === goalId);

  // Free-tier gate: parents may COMPLETE up to TWO coach topics for free.
  // The free allowance is consumed only when a topic plan is successfully
  // shown. Picking a goal that is never finished does NOT burn it.
  const coachJourney = useCoachJourney();
  const {
    openPaywall
  } = usePaywall();

  const graduationView = useMemo(() => {
    if (!plan || !goalId) return null;
    const feedbackRows = Object.entries(feedbackByWin)
      .map(([win, feedback]) => ({
        win: Number(win),
        feedback,
        at: new Date().toISOString(),
      }))
      .sort((a, b) => a.win - b.win);
    return buildCoachGraduationViewModel({
      goalId,
      goalTitle: selectedGoal?.title ?? plan.title,
      answers: coachRationaleAnswers,
      plan,
      feedbacks: feedbackRows,
      completedGoalIds: coachJourney.completedGoalIds,
      relatedGoalCatalog: GOAL_CATALOG,
    });
  }, [
    coachJourney.completedGoalIds,
    coachRationaleAnswers,
    feedbackByWin,
    goalId,
    plan,
    selectedGoal?.title,
  ]);

  const persistGraduation = useCallback(
    (path: GraduationPath) => {
      if (!sessionId || !goalId || !plan) return;
      saveCoachGraduation(userId ?? "anon", {
        sessionId,
        goalId,
        goalTitle: selectedGoal?.title ?? plan.title,
        path,
        graduatedAt: new Date().toISOString(),
        maintenanceMode: path === "maintenance",
      });
      void authFetch("/api/ai-coach/graduate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          goalId,
          goalTitle: selectedGoal?.title ?? plan.title,
          path,
          progressPct: 100,
        }),
      }).catch(() => {});
    },
    [authFetch, goalId, plan, selectedGoal?.title, sessionId, userId],
  );

  const resetForNewCoachingGoal = useCallback((nextGoalId: string) => {
    setPlan(null);
    setPlanCacheKey("");
    setSessionId("");
    setFeedbackByWin({});
    setProgressSnapshotByWin({});
    setActiveIdx(0);
    setAnswers({});
    setQIndex(0);
    setGoalId(nextGoalId);
    setIsFirstCoachingWin(true);
    originalWinCountRef.current = 0;
    lastPayloadRef.current = null;
  }, []);

  const handleGraduationPath = useCallback(
    (path: GraduationPath, strengthenGoalId?: string) => {
      persistGraduation(path);
      if (path === "maintenance") {
        setLocation("/amy-coach/progress");
        return;
      }
      if (path === "strengthen") {
        resetForNewCoachingGoal(strengthenGoalId ?? goalId);
        setPhase("questions");
        return;
      }
      resetForNewCoachingGoal("");
      setPhase("goals");
    },
    [goalId, persistGraduation, resetForNewCoachingGoal, setLocation],
  );

  const handleGraduationRecommendedGoal = useCallback(
    (recommendedGoalId: string) => {
      persistGraduation("new_goal");
      resetForNewCoachingGoal(recommendedGoalId);
      setPhase("questions");
    },
    [persistGraduation, resetForNewCoachingGoal],
  );

  useEffect(() => {
    if (progressPct < 100 || !sessionId) return;
    if (phase !== "result" && phase !== "graduation") return;
    if (!forceGraduationReview && isSessionGraduated(userId ?? "anon", sessionId)) return;
    setPhase("graduation");
  }, [forceGraduationReview, phase, progressPct, sessionId, userId]);

  const journeyBanner = !coachJourney.isPremium ? <FreemiumCatalogBanner /> : null;

  const activeCategory = useMemo(
    () => (selectedCategoryId ? GOAL_CATEGORIES.find((c) => c.id === selectedCategoryId) ?? null : null),
    [selectedCategoryId],
  );

  const activeCategoryItems = useMemo(() => {
    if (!activeCategory) return [];
    if (!searchQuery) return activeCategory.items;
    return activeCategory.items.filter((g) =>
      g.title.toLowerCase().includes(searchQuery),
    );
  }, [activeCategory, searchQuery]);

  const paginatedCategoryGoals = usePaginatedList(activeCategoryItems);

  useEffect(() => {
    if (!activeCategory) return;
    trackCoachCategoryOpened(
      activeCategory.id,
      categoryGoalCount(activeCategory.id, activeCategory.items.length),
      coachJourney.isPremium,
    );
  }, [activeCategory, coachJourney.isPremium]);

  useEffect(() => {
    if (coachJourney.isPremium || !activeCategory) return;
    paginatedCategoryGoals.visible.forEach((g) => {
      const access = coachJourney.getGoalAccess(g.id);
      if (access !== "locked") return;
      trackCoachPremiumItemViewed(
        activeCategory.id,
        g.id,
        goalIndexInCoachCategory(g.id),
        false,
      );
    });
  }, [activeCategory, paginatedCategoryGoals.visible, coachJourney.isPremium, coachJourney.getGoalAccess]);

  const forYouCategory = useMemo(
    () => GOAL_CATEGORIES.find((c) => c.id === COACH_FOR_YOU_CATEGORY_ID) ?? null,
    [],
  );

  const openForYouCategory = useCallback(() => {
    setSelectedCategoryId(COACH_FOR_YOU_CATEGORY_ID);
  }, []);

  const groupedCategories = useMemo(
    () => (coachAgeBand ? groupCategoriesForBand(GOAL_CATEGORIES, coachAgeBand) : []),
    [coachAgeBand],
  );

  const selectedAgeOption = useMemo(
    () => COACH_AGE_BAND_OPTIONS.find((o) => o.id === coachAgeBand) ?? null,
    [coachAgeBand],
  );

  // Returns the access level for a given goal card.
  const getGoalAccess = useCallback((goalId: string): GoalAccess => {
    return coachJourney.getGoalAccess(goalId);
  }, [coachJourney.getGoalAccess]);

  // ─── Resume session: detect ?resume=<sessionId>, load plan + feedback ────
  useEffect(() => {
    if (!resumeSessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/ai-coach/session/${encodeURIComponent(resumeSessionId)}`);
        if (cancelled) return;
        if (!res.ok) throw new Error("session not found");
        const data = (await res.json()) as {
          sessionId: string;
          goalId: string;
          plan: Plan;
          planCacheKey?: string;
          inputs: {
            goal: string;
            ageGroup: string;
            severity: string;
            triggers: string[];
            routine: string;
            language?: string;
            topicAnswers?: Record<string, string | string[]>;
          };
          feedbacks: Record<string, string>;
        };
        if (cancelled) return;

        // Restore plan + session state
        const restoredFeedbacks: Record<number, Feedback> = {};
        for (const [k, v] of Object.entries(data.feedbacks)) {
          restoredFeedbacks[Number(k)] = v as Feedback;
        }
        setPlan(data.plan);
        setPlanCacheKey(data.planCacheKey ?? "");
        setSessionId(data.sessionId);
        setGoalId(data.goalId);
        setFeedbackByWin(restoredFeedbacks);
        originalWinCountRef.current = 12;

        // Restore lastPayloadRef so lazy /next-win and /extend work after resume
        const resumedTopicAnswers = data.inputs.topicAnswers;
        lastPayloadRef.current = {
          goal: data.inputs.goal,
          ageGroup: data.inputs.ageGroup,
          severity: data.inputs.severity,
          triggers: data.inputs.triggers ?? [],
          routine: data.inputs.routine,
          topicAnswers: resumedTopicAnswers && Object.keys(resumedTopicAnswers).length > 0
            ? resumedTopicAnswers
            : undefined,
        };

        // Jump to the first incomplete win (no feedback yet), or last win if all done
        const firstIncomplete = data.plan.wins.findIndex(w => !restoredFeedbacks[w.win]);
        setActiveIdx(firstIncomplete >= 0 ? firstIncomplete : data.plan.wins.length - 1);
        setIsFirstCoachingWin(false);
        setPhase("result");
      } catch (err) {
        if (cancelled) return;
        toast({
          title: t("toasts.ai_coach.load_session_failed_title"),
          description: t("toasts.ai_coach.load_session_failed_body"),
          variant: "destructive"
        });
        setPhase("goals");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSessionId]);

  // ─── Goals → Questions (or → 12-card Result for the 0–2 yr topic)
  const handlePickGoal = (id: string) => {
    const access = getGoalAccess(id);
    if (access === "locked") {
      trackCoachLockedClick(coachGoalCategoryId(id), id, Math.max(0, goalIndexInCoachCategory(id)));
      openPaywall("coach_locked");
      return;
    }
    setGoalId(id);
    try {
      sessionStorage.setItem(COACH_AUDIO_GOAL_STORAGE_KEY, id);
    } catch {
      /* private mode */
    }
    if (isInfantProblemId(id)) {
      const problem = getInfantProblem(id);
      if (problem && problem.wins && problem.wins.length > 0) {
        // Build a static, science-backed Plan from the infant problem dataset
        // and route through the standard 12-card swipeable result UI.
        const staticPlan: Plan = {
          title: `${problem.emoji} ${problem.title.en}`,
          root_cause: problem.rootCause,
          summary: problem.summary,
          wins: problem.wins
        };
        setPlan(staticPlan);
        void buildInfantCoachPlanCacheKey(id)
          .then(setPlanCacheKey)
          .catch(() => setPlanCacheKey(""));
        originalWinCountRef.current = staticPlan.wins.length;
        const infantSessionId = `infant-${id}-${Date.now()}`;
        setSessionId(infantSessionId);
        setActiveIdx(0);
        setFeedbackByWin({});
        setProgressSnapshotByWin({});
        setIsFirstCoachingWin(true);
        setPhase("result");
        if (!coachJourney.isPremium) {
          void coachJourney.completePlan(id, infantSessionId);
        }
        return;
      }
      // Fallback to the legacy 1-page view if the problem has no wins yet.
      setPhase("infantProblem");
      return;
    }
    const impliedAge = GOAL_IMPLIED_AGE[id];
    const bandAge = coachAgeBand ? coachBandToAgeAnswer(coachAgeBand) : null;
    if (impliedAge) {
      setAnswers({
        ageGroup: impliedAge
      });
      setQIndex(1);
    } else if (bandAge) {
      setAnswers({
        ageGroup: bandAge
      });
      setQIndex(1);
    } else {
      setQIndex(0);
      setAnswers({});
    }
    setPhase("questions");
  };

  // ─── Question handlers
  // Topic-specific question list (when goalId maps to a topic in
  // coachTopicQuestions.json). For mapped topics we ask: ageGroup +
  // severity + topic-specific questions. For unmapped topics we fall
  // back to the original 5-generic-question flow.
  const QUESTIONS = useMemo<Question[]>(() => {
    const categoryId = goalId ? coachGoalCategoryId(goalId) : "";
    const generic = buildGenericQuestions(categoryId);
    const topicQs = goalId ? getTopicQuestions(goalId, i18n.language) : null;
    if (!topicQs || topicQs.length === 0) return generic;
    return [AGE_QUESTION, SEVERITY_QUESTION, ...topicQs];
  }, [goalId, i18n.language]);
  const amyUnderstanding = useMemo(() => {
    if (!goalId || !selectedGoal) {
      return buildAmyUnderstandingView({
        goalId: goalId || "unknown",
        goalTitle: selectedGoal?.title ?? "Your goal",
        questions: QUESTIONS,
        answers,
      });
    }
    return buildAmyUnderstandingView({
      goalId,
      goalTitle: selectedGoal.title,
      questions: QUESTIONS,
      answers,
    });
  }, [QUESTIONS, answers, goalId, selectedGoal]);

  useEffect(() => {
    if (phase !== "loading") {
      setLoadingMessageIdx(0);
      return;
    }
    const id = window.setInterval(() => {
      setLoadingMessageIdx((i) => (i + 1) % COACH_LOADING_MESSAGES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [phase]);

  const currentQ = QUESTIONS[qIndex];
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;
  const isAnswered = currentQ?.type === "multi" ? Array.isArray(currentAnswer) && currentAnswer.length > 0 : typeof currentAnswer === "string" && currentAnswer.length > 0;
  const handleSelectOption = (opt: string) => {
    if (!currentQ) return;
    if (currentQ.type === "single") {
      setAnswers(a => ({
        ...a,
        [currentQ.id]: opt
      }));
    } else {
      const cur = answers[currentQ.id] as string[] ?? [];
      const next = cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt];
      setAnswers(a => ({
        ...a,
        [currentQ.id]: next
      }));
    }
  };
  const handleNextQ = () => {
    if (qIndex < QUESTIONS.length - 1) {
      setQIndex(i => i + 1);
    } else {
      setPhase("understanding");
    }
  };
  const handleBackQ = () => {
    const ageImplied = goalId ? !!GOAL_IMPLIED_AGE[goalId] : false;
    const ageFromBand = goalId ? !!coachAgeBand && !ageImplied : false;
    if (qIndex > 0 && !(qIndex === 1 && (ageImplied || ageFromBand))) setQIndex(i => i - 1);else setPhase("goals");
  };

  // ─── Submit to API
  const submitPlan = async () => {
    // Cancel any previous in-flight build (e.g. user retried) before starting.
    buildAbortRef.current?.abort();
    const ctrl = new AbortController();
    buildAbortRef.current = ctrl;
    setPhase("loading");
    setLoadingMessageIdx(0);
    setActiveIdx(0);
    setFeedbackByWin({});
    setProgressSnapshotByWin({});
    setProgressWinCount(0);
    setLoadingNextWin(false);
    fetchingNextRef.current = false;
    setPlan(null);
    setPlanCacheKey("");
    setSessionId("");
    const ageMap: Record<string, string> = {
      "0–2 years": "0-2",
      "2–4 years": "2-4",
      "5–7 years": "5-7",
      "8–10 years": "8-10",
      "10+ years (tween/teen)": "10+"
    };
    const sevMap: Record<string, string> = {
      "Mild – occasional": "mild",
      "Moderate – frequent": "moderate",
      "Severe – daily struggle": "severe"
    };
    // Anything beyond the reserved generic keys is treated as a free-form
    // topic-specific answer and forwarded to the server as `topicAnswers`.
    const topicAnswers: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(answers)) {
      if (RESERVED_ANSWER_KEYS.has(k)) continue;
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.length === 0) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      topicAnswers[k] = v;
    }
    const payload = {
      goal: goalId,
      ageGroup: ageMap[answers.ageGroup as string] ?? coachAgeAnswerToApi(answers.ageGroup as string) ?? "5-7",
      severity: sevMap[answers.severity as string] ?? "moderate",
      triggers: answers.triggers as string[] ?? [],
      routine: answers.routine as string ?? "",
      goalRefinement: answers.goalRefinement as string ?? "",
      topicAnswers
    };
    lastPayloadRef.current = {
      goal: payload.goal,
      ageGroup: payload.ageGroup,
      severity: payload.severity,
      triggers: payload.triggers,
      routine: payload.routine,
      topicAnswers: Object.keys(topicAnswers).length > 0 ? topicAnswers : undefined,
    };
    const applyCoachResponse = (data: {
      plan: Plan;
      sessionId: string;
      planCacheKey?: string;
      status?: "partial" | "complete";
      totalWins?: number;
    }): void => {
      if (!data?.plan?.wins?.length) {
        throw new Error("Empty plan from server");
      }
      window.dispatchEvent(new CustomEvent("amynest:refresh-subscription"));
      setPlan(data.plan);
      setPlanCacheKey(data.planCacheKey ?? "");
      originalWinCountRef.current = data.totalWins ?? 12;
      setSessionId(data.sessionId);
      setProgressWinCount(data.plan.wins.length);
      setIsFirstCoachingWin(true);
      setPhase("result");
      if (!coachJourney.isPremium && goalId) {
        void coachJourney.completePlan(goalId, data.sessionId);
      }
    };

    const buildViaProgressive = async (body: string): Promise<void> => {
      const res = await authFetch("/api/coach/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body,
        signal: ctrl.signal
      }, COACH_AI_FETCH_TIMEOUT_MS);
      if (res.status === 402) {
        const errBody = await res.json().catch(() => ({})) as { error?: string };
        window.dispatchEvent(new CustomEvent("amynest:open-paywall", {
          detail: {
            reason: errBody.error === "coach_locked" ? "coach_locked" : "ai_quota"
          }
        }));
        setPhase("understanding");
        return;
      }
      if (!res.ok) {
        let bodySnippet = "";
        try {
          bodySnippet = (await res.text()).slice(0, 200);
        } catch {/* noop */}
        throw new Error(`Server ${res.status}${bodySnippet ? ` — ${bodySnippet}` : ""}`);
      }
      const data = (await res.json()) as {
        plan: Plan;
        sessionId: string;
        planCacheKey?: string;
        status?: "partial" | "complete";
        totalWins?: number;
      };
      applyCoachResponse(data);
    };

    try {
      const {
        default: i18nInstance
      } = await import("@/i18n");
      const body = JSON.stringify({
        ...payload,
        language: i18nInstance.language || "en"
      });

      await buildViaProgressive(body);
    } catch (err) {
      // Aborts (component unmount, retry, navigate-away) are expected — silent.
      const isAbort = ctrl.signal.aborted || err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"));
      if (isAbort) return;
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error("[ai-coach] Build Plan failed:", msg, err);
      toast({
        title: "Something went wrong",
        description: msg.length > 0 ? `Please try again. (${msg})` : "Please try again in a moment.",
        variant: "destructive"
      });
      setPhase("understanding");
    } finally {
      if (buildAbortRef.current === ctrl) buildAbortRef.current = null;
    }
  };

  // ─── Result deck navigation
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || phase !== "result") return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      if (idx !== activeIdx) setActiveIdx(idx);
    };
    el.addEventListener("scroll", onScroll, {
      passive: true
    });
    return () => el.removeEventListener("scroll", onScroll);
  }, [phase, activeIdx]);
  const goToCard = (i: number) => {
    const el = scrollerRef.current;
    const currentPlan = planRef.current;
    if (!el || !currentPlan) return;
    const maxIdx = Math.max(0, currentPlan.wins.length - 1);
    const clamped = Math.max(0, Math.min(i, maxIdx));
    setActiveIdx(clamped);
    el.scrollTo({
      left: clamped * el.clientWidth,
      behavior: "smooth"
    });
  };

  const fetchNextWin = async (): Promise<number | null> => {
    const currentPlan = planRef.current;
    if (!currentPlan || !lastPayloadRef.current || !sessionId || fetchingNextRef.current) {
      return null;
    }
    const total = originalWinCountRef.current || 12;
    if (currentPlan.wins.length >= total) return currentPlan.wins.length;

    fetchingNextRef.current = true;
    setLoadingNextWin(true);
    try {
      const { default: i18nInstance } = await import("@/i18n");
      const res = await authFetch("/api/coach/next-win", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...lastPayloadRef.current,
          sessionId,
          plan: {
            title: currentPlan.title,
            root_cause: currentPlan.root_cause,
            summary: currentPlan.summary,
          },
          existingWins: currentPlan.wins,
          language: i18nInstance.language || "en",
        }),
      }, COACH_AI_FETCH_TIMEOUT_MS);
      if (res.status === 402) {
        window.dispatchEvent(new CustomEvent("amynest:open-paywall", {
          detail: { reason: "ai_quota" },
        }));
        return null;
      }
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const { readResolvedApiJson } = await import("@/lib/poll-result");
      const data = await readResolvedApiJson<{ win?: Win }>(res, authFetch, {
        poll: {
          maxAttempts: 45,
          intervalMs: 2000,
          requestTimeoutMs: 15_000,
        },
      });
      if (!data?.win) throw new Error("empty win");
      const newLen = currentPlan.wins.length + 1;
      setPlan((p) => (p ? { ...p, wins: [...p.wins, data.win!] } : p));
      setProgressWinCount(newLen);
      return newLen;
    } catch (err) {
      console.error("[ai-coach] fetchNextWin failed:", err);
      toast({
        title: t("toasts.ai_coach.next_step_failed_title", "Couldn't load the next step"),
        description: t("toasts.ai_coach.next_step_failed_body", "Please tap Next or try again in a moment."),
        variant: "destructive",
      });
      return null;
    } finally {
      fetchingNextRef.current = false;
      setLoadingNextWin(false);
    }
  };

  const advanceAfterFeedback = async (targetIdx: number): Promise<boolean> => {
    const currentPlan = planRef.current;
    if (!currentPlan) return false;
    const total = originalWinCountRef.current || 12;
    let deckLen = currentPlan.wins.length;
    if (targetIdx >= deckLen && deckLen < total && lastPayloadRef.current) {
      const fetched = await fetchNextWin();
      if (!fetched) return false;
      deckLen = fetched;
    }
    setTimeout(() => goToCard(Math.min(deckLen - 1, targetIdx)), 300);
    return true;
  };

  // ─── Feedback (yes / somewhat / no)
  const submitFeedback = async (winNumber: number, feedback: Feedback) => {
    if (!plan || !sessionId) return;

    const denom = originalWinCountRef.current || plan.wins.length;
    const prevPct = computeCoachProgressPct(feedbackByWin, denom);

    // Build updated feedback map synchronously so we can compute progress now
    const newFeedbackByWin = {
      ...feedbackByWin,
      [winNumber]: feedback
    };
    setFeedbackByWin(newFeedbackByWin);

    recordCoachActivity(userId ?? "anon", {
      sessionId,
      goalId,
      at: new Date().toISOString(),
      source: "win_feedback",
    });

    const winMeta = plan.wins.find((w) => w.win === winNumber);
    if (userId && winMeta) {
      mirrorWinFeedbackLocally(userId, {
        type: "win_feedback",
        sessionId,
        goalId,
        goalTitle: plan.title,
        winNumber,
        winTitle: winMeta.title,
        winObjective: winMeta.objective,
        winActions: winMeta.actions,
        feedback,
        childAgeGroup: lastPayloadRef.current?.ageGroup,
      });
      void coachIntelligence.refetch();
    }

    const newPct = computeCoachProgressPct(newFeedbackByWin, denom);
    setProgressSnapshotByWin((snap) => ({
      ...snap,
      [winNumber]: { from: prevPct, to: newPct },
    }));

    // Save to DB (silent on failure — UI already updated)
    try {
      await authFetch("/api/ai-coach/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId,
          goalId,
          planTitle: plan.title,
          winNumber,
          totalWins: plan.wins.length,
          feedback
        })
      });
    } catch {/* silent */}

    if (feedback === "yes") {
      toast({
        title: t("pages.ai_coach.celebration_worked_title", "✨ Nice work."),
        description:
          newPct > prevPct
            ? t("pages.ai_coach.celebration_progress_delta", "Progress increased from {{from}}% → {{to}}%", {
                from: prevPct,
                to: newPct,
              })
            : t("pages.ai_coach.celebration_moving_forward", "Every small step helps build lasting change."),
      });
      if (newPct >= 100) {
        setPhase("graduation");
        return;
      }
      await advanceAfterFeedback(activeIdx + 1);
      return;
    }

    // Partly or not yet — adaptive coaching continues until progress reaches 100%
    if (newPct < 100 && lastPayloadRef.current) {
      const winsBefore = planRef.current?.wins.length ?? 0;
      const ok = await requestExtension(winNumber, feedback);
      if (ok || (planRef.current?.wins.length ?? 0) > winsBefore) {
        return;
      }
      const currentPlan = planRef.current;
      const atLast = currentPlan ? activeIdx >= currentPlan.wins.length - 1 : true;
      const canFetchMore = currentPlan
        ? currentPlan.wins.length < (originalWinCountRef.current || 12)
        : false;
      if (!atLast) {
        await advanceAfterFeedback(activeIdx + 1);
        return;
      }
      if (canFetchMore) {
        const advanced = await advanceAfterFeedback(activeIdx + 1);
        if (advanced) return;
      }
      toast({
        title: t("toasts.ai_coach.extras_failed_title"),
        description: t("toasts.ai_coach.extras_failed_body"),
        variant: "destructive",
      });
      return;
    }

    toast({
      title:
        feedback === "somewhat"
          ? t("pages.ai_coach.celebration_partly_title", "🎉 You're moving forward.")
          : t("pages.ai_coach.celebration_not_yet_title", "Amy's adjusting your next step."),
      description:
        feedback === "somewhat"
          ? t("pages.ai_coach.celebration_partly_body", "Every small step helps build lasting change.")
          : t("pages.ai_coach.celebration_not_yet_body", "Your next win will try a different approach."),
    });
    if (newPct >= 100) {
      setPhase("graduation");
      return;
    }
    await advanceAfterFeedback(activeIdx + 1);
  };

  // ─── Adaptive: ask backend for 1 follow-up win when a step doesn't fully work
  const requestExtension = async (failedWinNumber: number, feedback: Feedback = "no"): Promise<boolean> => {
    if (!plan || !lastPayloadRef.current || extendingRef.current) return false;
    if (!coachJourney.extendUnlocked) {
      openPaywall("coach_locked");
      return false;
    }
    const failedWin = plan.wins.find(w => w.win === failedWinNumber);
    if (!failedWin) return false;
    const insertAt = activeIdx + 1;
    const nextWinNum = Math.max(0, ...plan.wins.map(w => w.win)) + 1;
    extendingRef.current = true;
    setExtending(true);
    try {
      const {
        default: i18nInstanceX
      } = await import("@/i18n");
      const res = await authFetch("/api/ai-coach/extend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...lastPayloadRef.current,
          failedWinTitle: failedWin.title,
          failedWinNumber,
          startWinNumber: nextWinNum,
          feedbackType: feedback === "somewhat" ? "partial" : "not_yet",
          existingWinTitles: plan.wins.map(w => w.title),
          language: i18nInstanceX.language || "en"
        })
      }, COACH_AI_FETCH_TIMEOUT_MS);
      if (res.status === 402) {
        const errBody = await res.json().catch(() => ({})) as { error?: string };
        window.dispatchEvent(new CustomEvent("amynest:refresh-subscription"));
        window.dispatchEvent(new CustomEvent("amynest:open-paywall", {
          detail: {
            reason: errBody.error === "coach_locked" ? "coach_locked" : "ai_quota"
          }
        }));
        return false;
      }
      if (!res.ok) throw new Error(`Server ${res.status}`);
      window.dispatchEvent(new CustomEvent("amynest:refresh-subscription"));
      const { readResolvedApiJson } = await import("@/lib/poll-result");
      const data = await readResolvedApiJson<{ wins?: Win[]; result?: { wins?: Win[] } }>(
        res,
        authFetch,
        {
          poll: {
            maxAttempts: 45,
            intervalMs: 2000,
            requestTimeoutMs: 15_000,
          },
        },
      );
      const newWins = data?.wins ?? data?.result?.wins;
      if (Array.isArray(newWins) && newWins.length > 0) {
        const newWin = { ...newWins[0]!, win: nextWinNum };
        setPlan(p => {
          if (!p) return p;
          const wins = [...p.wins];
          wins.splice(insertAt, 0, newWin);
          return { ...p, wins };
        });
        toast({
          title: t("toasts.ai_coach.extras_added_title", "Amy's preparing your next step"),
          description: t("toasts.ai_coach.extras_added_body", "A fresh approach is ready when you tap Next Win."),
        });
        setTimeout(() => goToCard(insertAt), 80);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[ai-coach] requestExtension failed:", err);
      return false;
    } finally {
      extendingRef.current = false;
      setExtending(false);
    }
  };

  // ─── Share / Save
  const handleShare = async () => {
    if (!plan) return;
    const text = `${plan.title}\n\n${plan.summary}\n\nMy ${plan.wins.length} wins from AmyNest Amy Coach:\n${plan.wins.map(w => `${w.win}. ${w.title}`).join("\n")}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: plan.title,
          text
        });
      } catch (e) { console.error("REAL ERROR:", e); }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: t("toasts.ai_coach.copied_title"),
          description: t("toasts.ai_coach.copied_body")
        });
      } catch (e) { console.error("REAL ERROR:", e); }
    }
  };

  // ─── Print / Save as PDF
  // Triggers the browser's native print dialog. The print-only stylesheet
  // (in src/index.css) hides the live UI and shows only the .ws-print-only
  // block, which is rendered by <PrintablePlan />.
  const handlePrintPlan = () => {
    if (!plan) return;
    if (typeof window !== "undefined") window.print();
  };
  const handleStartOver = () => {
    setPhase("goals");
    setGoalId("");
    setAnswers({});
    setPlan(null);
    setPlanCacheKey("");
    originalWinCountRef.current = 0;
    setSessionId("");
    setActiveIdx(0);
    setFeedbackByWin({});
    setProgressSnapshotByWin({});
    setIsFirstCoachingWin(false);
    lastPayloadRef.current = null;
    fetchingNextRef.current = false;
    extendingRef.current = false;
    setLoadingNextWin(false);
  };

  usePageBackHandler(() => {
    if (phase === "questions") {
      handleBackQ();
      return true;
    }
    if (phase === "understanding") {
      setPhase("questions");
      return true;
    }
    if (phase === "infantProblem") {
      setPhase("goals");
      return true;
    }
    if (phase === "result" || phase === "loading" || phase === "resuming" || phase === "graduation") {
      navigateBack("ai-coach-exit");
      return true;
    }
    if (phase === "goals") {
      if (searchQuery) {
        setGoalSearch("");
        return true;
      }
      if (selectedCategoryId) {
        setSelectedCategoryId(null);
        return true;
      }
      // Age band is auto-inferred from the active child — clearing it re-applies via
      // useEffect and makes the header back appear broken. Exit the screen instead.
      navigateBack("ai-coach-exit");
      return true;
    }
    return false;
  }, [phase, searchQuery, selectedCategoryId, qIndex, goalId, navigateBack]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER PHASES
  // ═══════════════════════════════════════════════════════════════════════

  // ── PHASE: GOALS ─────────────────────────────────────────────────────
  if (phase === "goals") {
    const activeCat = selectedCategoryId ? GOAL_CATEGORIES.find(c => c.id === selectedCategoryId) ?? null : null;

    // ── Search mode: flat results across all categories ──────────────
    if (searchQuery) {
      return <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> {t("pages.ai_coach.back")}
            </Link>
            <Link href="/amy-coach/progress">
              <button className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-muted dark:bg-card text-primary dark:text-muted-foreground hover:bg-muted dark:bg-card transition-all">
                <BarChart3 className="h-3.5 w-3.5" /> {t("pages.ai_coach.my_progress")}
              </button>
            </Link>
          </div>
          {journeyBanner}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input autoFocus type="text" value={goalSearch} onChange={e => setGoalSearch(e.target.value)} placeholder={t("pages.ai_coach.search_goals")} className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-border bg-card text-sm focus:outline-none focus:border-border" />
          </div>
          <div className="space-y-6">
            {filteredCategories.map(cat => <section key={cat.id}>
                <h2 className="font-quicksand font-bold text-xs uppercase tracking-wide text-white/50 mb-2 flex items-center gap-1.5 px-1">
                  <span>{cat.emoji}</span> {cat.title}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cat.items.map(g => {
                const access = getGoalAccess(g.id);
                return <button key={g.id} onClick={() => handlePickGoal(g.id)} className="relative rounded-2xl p-4 border text-left backdrop-blur-md hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center gap-3 overflow-hidden" style={{
                  background: "linear-gradient(135deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.02) 100%)",
                  boxShadow: "0 0 15px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
                  borderColor: access === "locked" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.18)",
                  opacity: access === "locked" ? 0.8 : 1
                }}>
                        <GoalBadge access={access} />
                        <span className="text-2xl shrink-0">{g.emoji}</span>
                        <div className="pr-14">
                          <p className="font-quicksand font-bold text-sm text-white leading-tight">{g.title}</p>
                          <p className="text-[11px] mt-0.5" style={{
                      color: access === "locked" ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.5)"
                    }}>
                            {access === "locked" ? "Unlock with Premium" : "Tap to start →"}
                          </p>
                        </div>
                      </button>;
              })}
                </div>
              </section>)}
            {totalMatches === 0 && <p className="text-center py-8 text-sm text-white/40">{t("pages.ai_coach.no_goals_match")}{goalSearch}"</p>}
          </div>
        </div>;
    }

    // ── Sub-goal view: goals inside selected category ─────────────────
    if (activeCat) {
      const categoryHint = coachAgeBand ? getCategoryHint(activeCat.id, coachAgeBand) : null;
      const isForYouEntry = activeCat.id === COACH_FOR_YOU_CATEGORY_ID;
      return <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedCategoryId(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> {isForYouEntry && !coachAgeBand ? t("pages.ai_coach.back_2") : t("pages.ai_coach.categories")}
            </button>
            <Link href="/amy-coach/progress">
              <button className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-muted dark:bg-card text-primary dark:text-muted-foreground hover:bg-muted dark:bg-card transition-all">
                <BarChart3 className="h-3.5 w-3.5" /> {t("pages.ai_coach.my_progress_2")}
              </button>
            </Link>
          </div>

          {selectedAgeOption && !isForYouEntry && <button type="button" onClick={() => setCoachAgeBand(null)} className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-muted dark:bg-card text-muted-foreground hover:text-foreground w-fit">
              <span>{selectedAgeOption.emoji}</span>
              <span>{selectedAgeOption.label}</span>
              <span className="text-primary">{t("pages.ai_coach.change_age")}</span>
            </button>}

          {categoryHint && <button type="button" onClick={() => setSelectedCategoryId(categoryHint.targetCategoryId)} className="w-full text-left rounded-2xl px-4 py-3 border border-primary/30 bg-primary/10 text-sm text-foreground hover:bg-primary/15 transition-colors">
              <span className="font-semibold text-primary">{t("pages.ai_coach.try_instead")}</span> {categoryHint.message}
            </button>}

          {journeyBanner}

          <div className="relative rounded-[18px] overflow-hidden backdrop-blur-md p-4" style={{
          background: coachCategoryGradient(activeCat.id),
          border: COACH_TILE_BORDER,
          boxShadow: "0 0 35px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.08)"
        }}>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />
            <div className="flex items-center gap-3 relative">
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center text-3xl shrink-0"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                {activeCat.emoji}
              </div>
              <div>
                <h1 className="font-quicksand text-xl font-bold text-white">{activeCat.title}</h1>
                <p className="text-xs" style={{ color: "rgba(199,192,232,0.9)" }}>{categoryGoalCount(activeCat.id, activeCat.items.length)} {t("pages.ai_coach.goals_pick_one_to_start")}</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" value={goalSearch} onChange={e => setGoalSearch(e.target.value)} placeholder={`Search in ${activeCat.title}…`} className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-border bg-card text-sm focus:outline-none focus:border-border" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paginatedCategoryGoals.visible.map(g => {
            const access = getGoalAccess(g.id);
            return <button key={g.id} data-on-dark onClick={() => handlePickGoal(g.id)} className="relative rounded-[18px] p-5 text-left backdrop-blur-md hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center gap-4 overflow-hidden" style={{
              background: coachCategoryGradient(activeCat.id),
              border: COACH_TILE_BORDER,
              boxShadow: "0 0 18px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
              opacity: access === "locked" ? 0.85 : 1
            }}>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  />
                  <GoalBadge access={access} />
                  <div
                    className="w-11 h-11 rounded-[14px] flex items-center justify-center text-2xl shrink-0 relative"
                    style={{ background: "rgba(255,255,255,0.12)" }}
                  >
                    {g.emoji}
                  </div>
                  <div className="flex-1 pr-14 relative">
                    <p className="font-quicksand font-bold text-base text-white leading-tight">{g.title}</p>
                    <p className="text-[11px] mt-1" style={{
                  color: access === "locked" ? "rgba(255,255,255,0.55)" : "rgba(199,192,232,0.9)"
                }}>
                      {access === "locked" ? "Unlock with Premium" : "Tap to start →"}
                    </p>
                  </div>
                </button>;
          })}
          </div>
          {paginatedCategoryGoals.hasMore && <div className="flex justify-center pt-2">
              <button type="button" onClick={paginatedCategoryGoals.loadMore} className="text-sm font-semibold px-4 py-2 rounded-full bg-muted dark:bg-card text-primary">
                {t("pages.ai_coach.load_more_goals", {
                  defaultValue: "Load more ({{shown}} of {{total}})",
                  shown: paginatedCategoryGoals.visible.length,
                  total: paginatedCategoryGoals.total,
                })}
              </button>
            </div>}
        </div>;
    }

    // ── Age band picker (step 1) ──────────────────────────────────────
    if (!coachAgeBand) {
      return <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> {t("pages.ai_coach.back_2")}
            </Link>
            <Link href="/amy-coach/progress">
              <button className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-muted dark:bg-card text-primary dark:text-muted-foreground hover:bg-muted dark:bg-card transition-all">
                <BarChart3 className="h-3.5 w-3.5" /> {t("pages.ai_coach.my_progress_3")}
              </button>
            </Link>
          </div>

          <div data-on-dark className="relative rounded-3xl overflow-hidden backdrop-blur-md border border-border p-5" style={{
          background: "linear-gradient(135deg,rgba(76,29,149,0.92) 0%,rgba(124,58,237,0.85) 50%,rgba(190,24,93,0.82) 100%)",
          boxShadow: "0 0 50px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.18)"
        }}>
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{
              background: "linear-gradient(135deg,hsl(var(--brand-violet-400)),hsl(var(--brand-pink-400)))",
              boxShadow: "0 0 20px rgba(139,92,246,0.7)"
            }}>
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-quicksand text-xl font-bold text-white">{t("pages.ai_coach.pick_child_age")}</h1>
                <p className="text-xs text-white/85 mt-0.5">{t("pages.ai_coach.pick_child_age_sub")}</p>
              </div>
            </div>
          </div>

          {activeChild && <p className="text-xs text-muted-foreground px-1">
              {t("pages.ai_coach.suggested_from_profile", {
            name: activeChild.name ?? "Your child",
            age: formatAge(activeChild.age, activeChild.ageMonths ?? 0),
          })}
            </p>}

          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
            {t("pages.ai_coach.for_your_child")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COACH_AGE_BAND_OPTIONS.map((band) => <button key={band.id} type="button" data-on-dark onClick={() => setCoachAgeBand(band.id)} className="relative rounded-[18px] p-4 text-left backdrop-blur-md hover:scale-[1.02] active:scale-[0.97] transition-all overflow-hidden flex items-center gap-4 min-h-[88px]" style={{
            background: coachCategoryGradient(band.id === "0-2" ? "infant-problems" : band.id === "2-4" ? "toddler-behavior" : "learning"),
            border: COACH_TILE_BORDER,
            boxShadow: "0 0 20px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(255,255,255,0.04)" }} />
                <div className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 text-2xl relative" style={{ background: "rgba(255,255,255,0.12)" }}>
                  {band.emoji}
                </div>
                <div className="relative flex-1 min-w-0">
                  <p className="font-quicksand font-bold text-[15px] text-white leading-tight">{band.label}</p>
                  <p className="text-[11px] mt-1" style={{ color: "rgba(199,192,232,0.9)" }}>{band.description}</p>
                </div>
                <ChevronRight size={18} color="rgba(255,255,255,0.5)" className="shrink-0 relative" />
              </button>)}
          </div>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-border" />
            </div>
            <p className="relative mx-auto w-fit px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-background">
              {t("pages.ai_coach.or_for_you")}
            </p>
          </div>

          {forYouCategory && <button type="button" data-on-dark onClick={openForYouCategory} className="relative w-full rounded-[18px] p-4 text-left backdrop-blur-md hover:scale-[1.01] active:scale-[0.98] transition-all overflow-hidden flex items-center gap-4" style={{
          background: coachCategoryGradient(COACH_FOR_YOU_CATEGORY_ID),
          border: "1px solid rgba(236,72,153,0.35)",
          boxShadow: "0 0 28px rgba(236,72,153,0.22), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(255,255,255,0.05)" }} />
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 text-2xl relative" style={{ background: "rgba(255,255,255,0.15)" }}>
                {forYouCategory.emoji}
              </div>
              <div className="flex-1 relative min-w-0">
                <p className="font-quicksand font-bold text-[16px] text-white leading-tight">{t("pages.ai_coach.for_you_entry_title")}</p>
                <p className="text-[12px] mt-1 leading-snug" style={{ color: "rgba(255,220,235,0.92)" }}>{t("pages.ai_coach.for_you_entry_sub")}</p>
                <p className="text-[11px] mt-1.5 font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {categoryGoalCount(forYouCategory.id, forYouCategory.items.length)} {t("pages.ai_coach.goals_parent")}
                </p>
              </div>
              <ChevronRight size={18} color="rgba(255,255,255,0.55)" className="shrink-0 relative" />
            </button>}
        </div>;
    }

    // ── Category grid: grouped by topic (step 2) ──────────────────────
    const renderCategoryTile = (cat: GoalCategory) => <button key={cat.id} data-on-dark onClick={() => setSelectedCategoryId(cat.id)} className="relative rounded-[18px] p-4 text-left backdrop-blur-md hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 overflow-hidden flex flex-col gap-3 min-h-[132px]" style={{
      background: coachCategoryGradient(cat.id),
      border: COACH_TILE_BORDER,
      boxShadow: "0 0 20px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
    }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="flex items-start justify-between gap-2 relative">
          <div className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 text-2xl" style={{ background: "rgba(255,255,255,0.12)" }}>
            {cat.emoji}
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.5)" className="shrink-0 mt-1" />
        </div>
        <div className="relative flex-1 flex flex-col">
          <p className="font-quicksand font-bold text-[15px] text-white leading-tight">{cat.title}</p>
          <p className="text-[11px] mt-1" style={{ color: "rgba(169,159,217,0.85)" }}>
            {categoryGoalCount(cat.id, cat.items.length)} {t("pages.ai_coach.goals")}
          </p>
        </div>
      </button>;

    return <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> {t("pages.ai_coach.back_2")}
          </Link>
          <Link href="/amy-coach/progress">
            <button className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-muted dark:bg-card text-primary dark:text-muted-foreground hover:bg-muted dark:bg-card transition-all">
              <BarChart3 className="h-3.5 w-3.5" /> {t("pages.ai_coach.my_progress_3")}
            </button>
          </Link>
        </div>

        <div data-on-dark className="relative rounded-3xl overflow-hidden backdrop-blur-md border border-border p-5" style={{
        background: "linear-gradient(135deg,rgba(76,29,149,0.92) 0%,rgba(124,58,237,0.85) 50%,rgba(190,24,93,0.82) 100%)",
        boxShadow: "0 0 50px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.18)"
      }}>
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{
            background: "linear-gradient(135deg,hsl(var(--brand-violet-400)),hsl(var(--brand-pink-400)))",
            boxShadow: "0 0 20px rgba(139,92,246,0.7)"
          }}>
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-quicksand text-2xl font-bold">
                <span className="text-muted-foreground">{t("pages.ai_coach.amy")}</span>{" "}
                <span className="text-white">{t("pages.ai_coach.co_parent")}</span>{" "}
                <span className="text-muted-foreground">AI</span>
              </h1>
              <p className="text-xs text-white/85 mt-0.5">{t("pages.ai_coach.choose_a_goal_i_ll_build_your_12_step_science_plan")}</p>
            </div>
          </div>
        </div>

        {journeyBanner}

        {selectedAgeOption && <button type="button" onClick={() => setCoachAgeBand(null)} className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-muted dark:bg-card text-muted-foreground hover:text-foreground w-fit">
            <span>{selectedAgeOption.emoji}</span>
            <span>{selectedAgeOption.label}</span>
            <span className="text-primary">{t("pages.ai_coach.change_age")}</span>
          </button>}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={goalSearch} onChange={e => setGoalSearch(e.target.value)} placeholder={t("pages.ai_coach.search_all_goals")} className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-border bg-card text-sm focus:outline-none focus:border-border" />
        </div>

        <button data-on-dark onClick={() => {
          const q = goalId ? `?goal=${encodeURIComponent(goalId)}` : "";
          setLocation(`/audio-lessons${q}`);
        }} className="relative w-full rounded-[18px] p-4 text-left backdrop-blur-md hover:scale-[1.01] active:scale-[0.98] transition-all overflow-hidden flex items-center gap-4" style={{
        background: AGE_TILE_META[0]!.gradient,
        border: COACH_TILE_BORDER,
        boxShadow: "0 0 24px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.08)"
      }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(255,255,255,0.04)" }} />
          <div className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 text-2xl relative" style={{ background: "rgba(255,255,255,0.12)" }}>
            🎙️
          </div>
          <div className="flex-1 relative min-w-0">
            <p className="font-quicksand font-bold text-[15px] text-white leading-tight">{t("pages.ai_coach.amy_audio_lessons")}</p>
            <p className="text-[12px] mt-1 leading-snug" style={{ color: "rgba(199,192,232,0.9)" }}>{t("pages.ai_coach.hands_full_listen_to_age_curated_parenting_lessons_3_5_min_e")}</p>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.5)" className="shrink-0 relative" />
        </button>

        {forYouCategory && <section>
            <h2 className="font-quicksand font-bold text-xs uppercase tracking-wide text-muted-foreground mb-2 px-1">
              {t("pages.ai_coach.for_you_section")}
            </h2>
            <button type="button" data-on-dark onClick={openForYouCategory} className="relative w-full rounded-[18px] p-4 text-left backdrop-blur-md hover:scale-[1.01] active:scale-[0.98] transition-all overflow-hidden flex items-center gap-4" style={{
          background: coachCategoryGradient(COACH_FOR_YOU_CATEGORY_ID),
          border: "1px solid rgba(236,72,153,0.35)",
          boxShadow: "0 0 28px rgba(236,72,153,0.22), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(255,255,255,0.05)" }} />
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 text-2xl relative" style={{ background: "rgba(255,255,255,0.15)" }}>
                {forYouCategory.emoji}
              </div>
              <div className="flex-1 relative min-w-0">
                <p className="font-quicksand font-bold text-[16px] text-white leading-tight">{t("pages.ai_coach.for_you_entry_title")}</p>
                <p className="text-[12px] mt-1 leading-snug" style={{ color: "rgba(255,220,235,0.92)" }}>{t("pages.ai_coach.for_you_entry_sub")}</p>
                <p className="text-[11px] mt-1.5 font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {categoryGoalCount(forYouCategory.id, forYouCategory.items.length)} {t("pages.ai_coach.goals_parent")}
                </p>
              </div>
              <ChevronRight size={18} color="rgba(255,255,255,0.55)" className="shrink-0 relative" />
            </button>
          </section>}

        <div className="space-y-6">
          {groupedCategories.length > 0 && <h2 className="font-quicksand font-bold text-xs uppercase tracking-wide text-muted-foreground px-1 -mb-3">
              {t("pages.ai_coach.for_your_child")}
            </h2>}
          {groupedCategories.map(({ group, categories }) => <section key={group.id}>
              <h2 className="font-quicksand font-bold text-xs uppercase tracking-wide text-muted-foreground mb-2 px-1">
                {group.label}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => renderCategoryTile(cat))}
              </div>
            </section>)}
        </div>
      </div>;
  }

  // ── PHASE: QUESTIONS ────────────────────────────────────────────────
  if (phase === "questions" && currentQ) {
    const ageImplied = goalId ? !!GOAL_IMPLIED_AGE[goalId] : false;
    const ageSkipped = ageImplied || !!coachAgeBand;
    const visibleTotal = ageSkipped ? QUESTIONS.length - 1 : QUESTIONS.length;
    const visibleNum = ageSkipped ? qIndex : qIndex + 1;
    const progressPct = visibleNum / visibleTotal * 100;
    const questionCategoryId = coachGoalCategoryId(goalId);
    return <div className="app-fixed-below-header fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col space-y-6 px-4 py-6">
        <button onClick={handleBackQ} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> {t("pages.ai_coach.back_3")}
        </button>

        <div data-on-dark className="coach-question-panel relative rounded-3xl overflow-hidden backdrop-blur-md p-5 space-y-5" style={{
        background: coachCategoryPanelBackground(questionCategoryId),
        border: COACH_TILE_BORDER,
        boxShadow: COACH_TILE_SHADOW
      }}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />

          <div className="relative">
            <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "rgba(199,192,232,0.9)" }}>
              <span className="font-semibold">{t("pages.ai_coach.question")} {visibleNum} of {visibleTotal}</span>
              <span>{selectedGoal?.title}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div className="h-full transition-all rounded-full" style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--brand-violet-400)))",
              boxShadow: "0 0 8px hsl(var(--primary) / 0.45)"
            }} />
            </div>
          </div>

          <div className="relative space-y-1">
            <h2 className="font-quicksand text-xl font-bold text-white">{currentQ.prompt}</h2>
            {currentQ.type === "multi" && <p className="text-xs" style={{ color: "rgba(199,192,232,0.9)" }}>{t("pages.ai_coach.pick_any_that_apply")}</p>}
          </div>

          <div className="relative space-y-2">
            {currentQ.options.map(opt => {
            const selected = currentQ.type === "multi" ? (answers[currentQ.id] as string[] ?? []).includes(opt) : answers[currentQ.id] === opt;
            return <button key={opt} onClick={() => handleSelectOption(opt)} className="coach-question-option w-full text-left px-4 py-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 backdrop-blur-sm" style={selected ? {
              background: "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.15) 100%)",
              border: "1px solid rgba(255,255,255,0.55)",
              color: "#fff",
              boxShadow: "0 0 16px hsl(var(--primary) / 0.25)"
            } : {
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff"
            }}>
                  <span className="font-semibold text-sm">{opt}</span>
                  {selected && <Check className="h-5 w-5 text-white shrink-0" />}
                </button>;
          })}
          </div>

          <button data-on-dark onClick={handleNextQ} disabled={!isAnswered} className="relative w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all" style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--brand-violet-500)))",
          boxShadow: isAnswered ? "0 0 24px hsl(var(--primary) / 0.45)" : "none"
        }}>
            {qIndex < QUESTIONS.length - 1 ? "Next →" : t("pages.ai_coach.continue_to_understanding", "Continue →")}
          </button>
        </div>
        </div>
      </div>;
  }

  // ── PHASE: AMY'S UNDERSTANDING ───────────────────────────────────────
  if (phase === "understanding" && selectedGoal) {
    return (
      <CoachUnderstandingScreen
        goalTitle={selectedGoal.title}
        understanding={amyUnderstanding}
        onBack={() => setPhase("questions")}
        onGenerate={() => void submitPlan()}
      />
    );
  }

  // ── PHASE: INFANT PROBLEM DETAIL ─────────────────────────────────────
  if (phase === "infantProblem") {
    const problem = getInfantProblem(goalId);
    if (!problem) {
      // Safe fallback view — never triggers a state update during render.
      return <div className="max-w-2xl mx-auto px-4 py-10 text-center space-y-4">
          <p className="text-sm text-white/70">{t("pages.ai_coach.this_topic_isn_t_available")}</p>
          <button onClick={() => setPhase("goals")} className="text-sm font-bold px-4 py-2 rounded-full bg-primary text-muted-foreground">
            {t("pages.ai_coach.back_to_topics")}
          </button>
        </div>;
    }
    const lang = i18n?.language as string || "en";
    return <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setPhase("goals")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="button-infant-problem-back">
            <ChevronLeft className="h-4 w-4" /> {t("pages.ai_coach.back_4")}
          </button>
        </div>

        {/* Hero card */}
        <div className="relative rounded-3xl overflow-hidden backdrop-blur-md border border-border p-5" style={{
        background: "linear-gradient(135deg,rgba(244,114,182,0.22) 0%,rgba(251,146,60,0.12) 100%)",
        boxShadow: "0 0 35px rgba(236,72,153,0.25), inset 0 1px 0 rgba(255,255,255,0.07)"
      }}>
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-3xl pointer-events-none" style={{
          background: "rgba(236,72,153,0.3)"
        }} />
          <div className="flex items-center gap-3 relative">
            <span className="text-4xl">{problem.emoji}</span>
            <div>
              <h1 className="font-quicksand text-xl font-bold text-white">{pickInfLang(problem.title, lang)}</h1>
              <p className="text-xs text-white/60 mt-0.5">{pickInfLang(problem.description, lang)}</p>
            </div>
          </div>
        </div>

        {/* (A) Possible Reason */}
        <section className="rounded-2xl p-4 border border-white/10 backdrop-blur-md" style={{
        background: "linear-gradient(135deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%)"
      }}>
          <h2 className="font-quicksand text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
            {t("pages.ai_coach.possible_reason")}
          </h2>
          <p className="text-sm text-white/85 leading-relaxed">{pickInfLang(problem.reason, lang)}</p>
        </section>

        {/* (B) What You Can Do */}
        <section className="rounded-2xl p-4 border border-white/10 backdrop-blur-md" style={{
        background: "linear-gradient(135deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%)"
      }}>
          <h2 className="font-quicksand text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
            {t("pages.ai_coach.what_you_can_do")}
          </h2>
          <ol className="space-y-2.5">
            {problem.solution.map((s, i) => <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary border border-border text-muted-foreground text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-white/90 leading-relaxed">{pickInfLang(s, lang)}</span>
              </li>)}
          </ol>
        </section>

        {/* (C) Amy AI Insight */}
        <section className="rounded-2xl p-4 border border-border backdrop-blur-md" style={{
        background: "linear-gradient(135deg,rgba(139,92,246,0.22) 0%,rgba(236,72,153,0.12) 100%)",
        boxShadow: "0 0 22px rgba(139,92,246,0.18)"
      }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-quicksand text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("pages.ai_coach.amy_ai_insight")}
            </h2>
          </div>
          <p className="text-sm text-white leading-relaxed italic">"{pickInfLang(problem.insight, lang)}"</p>
        </section>

        {/* (D) Reassurance */}
        <section className="rounded-2xl p-4 border border-border backdrop-blur-md flex items-start gap-3" style={{
        background: "linear-gradient(135deg,rgba(244,114,182,0.18) 0%,rgba(251,146,60,0.08) 100%)"
      }}>
          <Heart className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 fill-primary" />
          <div>
            <p className="text-sm text-white/95 font-medium leading-relaxed">{pickInfLang(problem.reassure, lang)}</p>
            <p className="text-[11px] text-white/50 mt-1">{t("pages.ai_coach.i_m_here_to_help_amy")}</p>
          </div>
        </section>

        <p className="text-[11px] text-white/40 text-center pt-1">
          {t("pages.ai_coach.guidance_only_not_a_medical_diagnosis_if_concerns_persist_co")}
        </p>
      </div>;
  }

  // ── PHASE: LOADING ───────────────────────────────────────────────────
  if (phase === "resuming") {
    return <div className="app-fixed-below-header fixed inset-0 z-50 bg-gradient-to-br from-primary via-primary to-primary flex items-center justify-center">
        <div className="text-center text-white px-8 space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <Loader2 className="absolute inset-0 w-20 h-20 animate-spin" />
          </div>
          <h2 className="font-quicksand text-2xl font-bold">{t("pages.ai_coach.resuming_your_plan")}</h2>
          <p className="text-sm text-white/80 max-w-xs mx-auto">
            {t("pages.ai_coach.loading_where_you_left_off")}
          </p>
        </div>
      </div>;
  }
  if (phase === "loading") {
    return (
      <CoachGeneratingScreen messageKey={COACH_LOADING_MESSAGES[loadingMessageIdx]!} />
    );
  }

  if (phase === "graduation" && graduationView) {
    return (
      <CoachGraduationScreen
        view={graduationView}
        onChoosePath={handleGraduationPath}
        onPickRecommendedGoal={handleGraduationRecommendedGoal}
      />
    );
  }

  // ── PHASE: RESULT ────────────────────────────────────────────────────
  if (phase === "result" && plan) {
    return <div className="app-fixed-below-header fixed inset-0 z-50 flex flex-col" style={{
      background: "linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0c1220 100%)",
    }}>
        {/* Top bar — dark glass */}
        <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "linear-gradient(180deg, rgba(15,12,41,0.95) 0%, rgba(15,12,41,0) 100%)",
        backdropFilter: "blur(8px)"
      }}>
          <button onClick={handleStartOver} style={{
          color: "hsl(var(--brand-violet-700))",
          background: "rgba(167,139,250,0.15)",
          borderRadius: 999,
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          cursor: "pointer"
        }} aria-label={t("pages.ai_coach.back_5")}>
            <ArrowLeft size={18} />
          </button>

          {/* Goal progress pill */}
          <div data-on-dark style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
          background: "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
          color: "#fff",
          padding: "6px 12px",
          borderRadius: 14,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.2,
          boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
          maxWidth: "46vw",
        }}>
            <span style={{ fontSize: 10, opacity: 0.9, fontWeight: 700 }}>
              {t("pages.ai_coach.progress_toward_goal", "{{pct}}% toward goal", { pct: progressPct })}
            </span>
            <span style={{
              fontSize: 11.5,
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}>
              {plan.title}
            </span>
          </div>

          <div style={{
          display: "flex",
          gap: 6
        }}>
            <button onClick={handlePrintPlan} style={{
            color: "hsl(var(--brand-violet-700))",
            background: "rgba(167,139,250,0.15)",
            borderRadius: 999,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer"
          }} aria-label={t("pages.ai_coach.print_or_save_as_pdf")} title={t("pages.ai_coach.print_save_as_pdf")}>
              <Printer size={16} />
            </button>
            <button onClick={handleShare} style={{
            color: "hsl(var(--brand-violet-700))",
            background: "rgba(167,139,250,0.15)",
            borderRadius: 999,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer"
          }} aria-label={t("pages.ai_coach.share")}>
              <Share2 size={16} />
            </button>
            <button onClick={() => setLocation("/amy-coach/progress")} style={{
            color: "hsl(var(--brand-violet-700))",
            background: "rgba(167,139,250,0.15)",
            borderRadius: 999,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer"
          }} aria-label={t("pages.ai_coach.progress_2")}>
              <BarChart3 size={16} />
            </button>
          </div>
        </div>

        {/* Hidden print-only render — full plan in a clean A4 layout */}
        <PrintablePlan plan={plan} />

        {/* Goal progress bar — toward 100%, not a fixed win count */}
        <div style={{
        position: "absolute",
        top: 58,
        left: 16,
        right: 16,
        zIndex: 20,
      }}>
          <div style={{
          height: 4,
          borderRadius: 999,
          background: "rgba(139,92,246,0.18)",
          overflow: "hidden",
        }}>
            <div style={{
            height: "100%",
            width: `${progressPct}%`,
            borderRadius: 999,
            background: "linear-gradient(90deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
            transition: "width 0.45s ease",
          }} />
          </div>
        </div>

        {/* Scroller */}
        <div ref={scrollerRef} style={{
        display: "flex",
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        width: "100%",
        flex: "1 1 0",
        minHeight: 0,
        scrollbarWidth: "none"
      }} className="ws-no-scrollbar">
          {plan.wins.map((w, i) => (
            <WinCard
              key={`${w.win}-${i}`}
              win={w}
              planCacheKey={planCacheKey}
              goalId={goalId}
              goalTitle={plan.title}
              planRootCause={plan.root_cause}
              planSummary={plan.summary}
              progressPct={progressPct}
              progressSnapshot={progressSnapshotByWin[w.win]}
              currentFeedback={feedbackByWin[w.win]}
              feedbackByWin={feedbackByWin}
              coachAnswers={coachRationaleAnswers}
              winDeckIndex={i}
              extending={extending}
              isFirstCoachingWin={isFirstCoachingWin && i === 0}
              usedPhraseHashes={coachIntelligence.usedPhraseHashes}
              familyReference={coachIntelligence.familyReference}
              contentDensity={coachIntelligence.contentDensity}
              onFeedback={(f) => submitFeedback(w.win, f)}
            />
          ))}
        </div>

        {/* Extending banner */}
        {extending && <div style={{
        position: "absolute",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(99,102,241,0.95)",
        color: "#fff",
        padding: "10px 18px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
        zIndex: 25
      }}>
            <Loader2 size={14} style={{
          animation: "spin 1s linear infinite"
        }} />
            {t("pages.ai_coach.loading_1_new_strategy_for_you")}
          </div>}

        {/* Bottom nav */}
        {(() => {
        const currentWin = plan.wins[activeIdx];
        const hasFeedback = currentWin ? !!feedbackByWin[currentWin.win] : false;
        const atLastLoaded = activeIdx >= plan.wins.length - 1;
        const waitingForNext = atLastLoaded && loadingNextWin;
        const progressComplete = progressPct >= 100;
        const atGenuineEnd = atLastLoaded && progressComplete;
        const nextDisabled = !hasFeedback || loadingNextWin || extending || atGenuineEnd;
        return <div className="app-bottom-action-bar" style={{
          flexShrink: 0,
          width: "100%",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          padding: "10px 16px 14px",
          background: "linear-gradient(0deg, rgba(13,10,30,0.98) 0%, rgba(13,10,30,0.85) 100%)",
          backdropFilter: "blur(12px)"
        }}>
              {waitingForNext && hasFeedback && <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11.5,
            fontWeight: 700,
            color: "hsl(var(--brand-violet-300))",
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.35)",
            padding: "5px 12px",
            borderRadius: 999
          }}>
                  <Loader2 size={11} style={{
              animation: "spin 1s linear infinite"
            }} />
                  {t("pages.ai_coach.generating_next_strategy")}
                </div>}
              <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 12
          }}>
                <button onClick={() => goToCard(Math.max(0, activeIdx - 1))} disabled={activeIdx === 0} style={{
              color: "hsl(var(--brand-violet-300))",
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 0 15px rgba(139,92,246,0.15)",
              borderRadius: 999,
              padding: "10px 16px",
              border: "1px solid rgba(139,92,246,0.3)",
              cursor: activeIdx === 0 ? "default" : "pointer",
              opacity: activeIdx === 0 ? 0.4 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600
            }}>
                  <ArrowLeft size={14} /> {t("pages.ai_coach.prev")}
                </button>
                <button data-on-dark onClick={() => void advanceAfterFeedback(activeIdx + 1)} disabled={nextDisabled} title={!hasFeedback ? t("pages.ai_coach.feedback_required_hint", "Share how this win went to continue") : waitingForNext ? t("pages.ai_coach.generating_next_strategy") : undefined} style={{
              color: "#fff",
              background: hasFeedback
                ? "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))"
                : "rgba(255,255,255,0.12)",
              boxShadow: hasFeedback ? "0 4px 12px rgba(139,92,246,0.3)" : "none",
              borderRadius: 999,
              padding: "10px 18px",
              border: hasFeedback ? "none" : "1px solid rgba(139,92,246,0.25)",
              cursor: nextDisabled ? "not-allowed" : "pointer",
              opacity: nextDisabled ? 0.45 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 700
            }}>
                  {t("pages.ai_coach.next_win", "Next Win")} <ArrowRight size={14} />
                </button>
              </div>
            </div>;
      })()}
      </div>;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// WIN CARD — action-first, adaptive coaching layout
// ═══════════════════════════════════════════════════════════════════════════
function WinCard({
  win,
  planCacheKey,
  goalId,
  goalTitle,
  planRootCause,
  planSummary,
  progressPct,
  progressSnapshot,
  currentFeedback,
  feedbackByWin,
  coachAnswers,
  winDeckIndex,
  extending,
  isFirstCoachingWin = false,
  usedPhraseHashes = [],
  familyReference = null,
  contentDensity = "standard",
  onFeedback,
}: {
  win: Win;
  planCacheKey?: string;
  goalId: string;
  goalTitle: string;
  planRootCause?: string;
  planSummary?: string;
  progressPct: number;
  progressSnapshot?: { from: number; to: number };
  currentFeedback?: Feedback;
  feedbackByWin: Record<number, Feedback>;
  coachAnswers: Record<string, string | string[]>;
  winDeckIndex: number;
  extending: boolean;
  isFirstCoachingWin?: boolean;
  usedPhraseHashes?: string[];
  familyReference?: string | null;
  contentDensity?: "concise" | "standard" | "detailed";
  onFeedback: (f: Feedback) => void;
}) {
  const { t } = useTranslation();
  const winRationale = useMemo(
    () =>
      buildCoachWinRationale({
        goalId: goalId || "coach-goal",
        goalTitle,
        win,
        winDeckIndex,
        answers: coachAnswers,
        feedbackByWin,
        progressPct,
        isFirstCoachingWin,
        usedPhraseHashes,
        familyReference,
        contentDensity,
      }),
    [
      coachAnswers,
      contentDensity,
      familyReference,
      feedbackByWin,
      goalId,
      goalTitle,
      isFirstCoachingWin,
      progressPct,
      usedPhraseHashes,
      win,
      winDeckIndex,
    ],
  );
  const rootCauseShort = planRootCause ? summarizeCoachText(planRootCause, 2) : "";
  const rootCauseHasMore = Boolean(
    planRootCause && planRootCause.trim().length > rootCauseShort.length + 8,
  );

  const feedbackOptions = [
    {
      v: "yes" as const,
      label: t("pages.ai_coach.feedback_worked", "😊 Worked"),
      color: "hsl(var(--brand-green-600))",
      bg: "rgba(34,197,94,0.14)",
      border: "rgba(34,197,94,0.45)",
    },
    {
      v: "somewhat" as const,
      label: t("pages.ai_coach.feedback_partly", "😐 Partly"),
      color: "#a16207",
      bg: "rgba(251,191,36,0.14)",
      border: "rgba(251,191,36,0.45)",
    },
    {
      v: "no" as const,
      label: t("pages.ai_coach.feedback_not_yet", "😕 Not Yet"),
      color: "hsl(var(--brand-violet-400))",
      bg: "rgba(139,92,246,0.12)",
      border: "rgba(139,92,246,0.35)",
    },
  ];

  return (
    <div
      style={{
        flex: "0 0 100%",
        width: "100%",
        height: "100%",
        scrollSnapAlign: "start",
        position: "relative",
        background: "linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0c1220 100%)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "rgba(139,92,246,0.16)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="app-win-card-body"
        style={{
          position: "absolute",
          inset: 0,
          padding: "78px 18px 118px",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          color: "#f8f8ff",
        }}
      >
        {/* Goal + current win context */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: 0.4,
              marginBottom: 8,
            }}
          >
            {isFirstCoachingWin
              ? t("pages.ai_coach.your_first_coaching_win", "Your First Coaching Win")
              : `${t("pages.ai_coach.current_win", "Current Win")} · ${t("pages.ai_coach.win", "Win")} ${win.win}`}
          </div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "hsl(var(--brand-violet-300))",
              marginBottom: 4,
              letterSpacing: 0.3,
            }}
          >
            {t("pages.ai_coach.progress_toward_goal", "{{pct}}% toward goal", { pct: progressPct })}
          </p>
          <h2
            style={{
              fontSize: 17,
              fontWeight: 800,
              lineHeight: 1.25,
              margin: 0,
              fontFamily: "Quicksand, sans-serif",
              color: "#fff",
            }}
          >
            {goalTitle}
          </h2>
        </div>

        {/* Win title */}
        <h3
          style={{
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 12,
            fontFamily: "Quicksand, sans-serif",
            color: "#fff",
          }}
        >
          {win.title}
        </h3>

        {/* Why this happens — short */}
        {rootCauseShort && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 12px",
              borderRadius: 14,
              background: "rgba(244,114,182,0.08)",
              border: "1px solid rgba(244,114,182,0.2)",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "hsl(var(--brand-pink-300))",
                marginBottom: 4,
              }}
            >
              {t("pages.ai_coach.why_this_happens", "🧠 Why this happens")}
            </p>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                color: "rgba(255,255,255,0.78)",
                margin: 0,
              }}
            >
              {rootCauseShort}
            </p>
          </div>
        )}

        {/* Why Amy chose this win — recommendation transparency */}
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(139,92,246,0.06))",
            border: "1px solid rgba(167,139,250,0.24)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Sparkles
              size={14}
              style={{
                color: "hsl(var(--brand-violet-300))",
                flexShrink: 0,
                marginTop: 2,
              }}
              aria-hidden
            />
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "hsl(var(--brand-violet-300))",
                  marginBottom: 4,
                }}
              >
                {t("pages.ai_coach.why_amy_chose_this_win", "Why Amy chose this win")}
              </p>
              <p
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: "rgba(255,255,255,0.82)",
                  margin: 0,
                }}
              >
                {winRationale}
              </p>
            </div>
          </div>
        </div>

        {/* Duration + compact listen */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(139,92,246,0.16)",
              color: "hsl(var(--brand-violet-300))",
              fontWeight: 700,
              border: "1px solid rgba(139,92,246,0.25)",
            }}
          >
            ⏱ {win.duration}
          </span>
          <ListenButton win={win} planCacheKey={planCacheKey} compact />
        </div>

        {/* DO THIS — primary action */}
        <div
          style={{
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 14,
            padding: "12px 14px",
            marginBottom: 12,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "hsl(var(--brand-violet-300))",
              marginBottom: 8,
            }}
          >
            {t("pages.ai_coach.do_this")}
          </p>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {win.actions.map((a, i) => (
              <li
                key={i}
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.45,
                  display: "flex",
                  gap: 10,
                  color: "rgba(255,255,255,0.88)",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* REAL EXAMPLE */}
        {win.example && (
          <div
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.22)",
              borderRadius: 14,
              padding: "10px 12px",
              marginBottom: 12,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "hsl(var(--brand-green-300))",
                marginBottom: 4,
              }}
            >
              {t("pages.ai_coach.real_example")}
            </p>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.78)",
                margin: 0,
                whiteSpace: "pre-line",
              }}
            >
              {win.example}
            </p>
          </div>
        )}

        {/* TRY TODAY */}
        {win.micro_task && (
          <div
            style={{
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(167,139,250,0.28)",
              borderRadius: 14,
              padding: "10px 12px",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "hsl(var(--brand-violet-300))",
                marginBottom: 4,
              }}
            >
              {t("pages.ai_coach.try_today", "🎯 Try Today")}
            </p>
            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.45,
                color: "#fff",
                fontWeight: 600,
                margin: 0,
              }}
            >
              {win.micro_task}
            </p>
          </div>
        )}

        {/* Feedback — prominent, supportive */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {feedbackOptions.map((b) => {
              const selected = currentFeedback === b.v;
              return (
                <button
                  key={b.v}
                  type="button"
                  onClick={() => onFeedback(b.v)}
                  disabled={extending}
                  style={{
                    flex: 1,
                    padding: "12px 6px",
                    borderRadius: 12,
                    border: `1.5px solid ${selected ? b.color : b.border}`,
                    background: selected ? b.color : b.bg,
                    color: selected ? "#fff" : "rgba(255,255,255,0.92)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: extending ? "wait" : "pointer",
                    opacity: extending ? 0.7 : 1,
                    transition: "all 0.18s",
                    lineHeight: 1.25,
                  }}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Micro celebration / adaptive coaching note */}
        {currentFeedback === "yes" && (
          <div
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.28)",
              borderRadius: 14,
              padding: "10px 12px",
              marginBottom: 10,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
              {t("pages.ai_coach.celebration_worked_title", "✨ Nice work.")}
            </p>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.78)", margin: 0, lineHeight: 1.45 }}>
              {progressSnapshot && progressSnapshot.to > progressSnapshot.from
                ? t("pages.ai_coach.celebration_progress_delta", "Progress increased from {{from}}% → {{to}}%", progressSnapshot)
                : t("pages.ai_coach.celebration_moving_forward", "Every small step helps build lasting change.")}
            </p>
          </div>
        )}
        {currentFeedback === "somewhat" && (
          <div
            style={{
              background: "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.28)",
              borderRadius: 14,
              padding: "10px 12px",
              marginBottom: 10,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
              {t("pages.ai_coach.celebration_partly_title", "🎉 You're moving forward.")}
            </p>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.78)", margin: 0, lineHeight: 1.45 }}>
              {t(
                "pages.ai_coach.adaptive_partly_body",
                "Amy will refine this approach in your next win. Partial progress counts.",
              )}
            </p>
          </div>
        )}
        {currentFeedback === "no" && (
          <div
            style={{
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.28)",
              borderRadius: 14,
              padding: "10px 12px",
              marginBottom: 10,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
              {t("pages.ai_coach.adaptive_not_yet_title", "Amy noticed this strategy may need adjusting.")}
            </p>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.78)", margin: 0, lineHeight: 1.45 }}>
              {t(
                "pages.ai_coach.adaptive_not_yet_body",
                "Your next win will try a different approach — same goal, new angle.",
              )}
            </p>
          </div>
        )}

        {/* Collapsed educational content */}
        {win.deep_explanation && (
          <CoachExpandable label={t("pages.ai_coach.why_this_works", "▼ Why this works")}>
            {win.deep_explanation}
          </CoachExpandable>
        )}
        {win.science_reference && (
          <CoachExpandable label={t("pages.ai_coach.research_behind_this", "▼ Research behind this")}>
            {win.science_reference}
          </CoachExpandable>
        )}
        {(rootCauseHasMore || planSummary) && (
          <CoachExpandable label={t("pages.ai_coach.root_cause_details", "▼ Root cause details")}>
            {rootCauseHasMore && planRootCause && (
              <p style={{ margin: "0 0 10px" }}>{planRootCause}</p>
            )}
            {planSummary && <p style={{ margin: 0 }}>{planSummary}</p>}
          </CoachExpandable>
        )}
        {win.mistake_to_avoid && (
          <CoachExpandable label={t("pages.ai_coach.mistake_to_avoid", "▼ Mistake to avoid")}>
            {win.mistake_to_avoid}
          </CoachExpandable>
        )}
        {win.objective && (
          <CoachExpandable label={t("pages.ai_coach.win_objective", "▼ What this win targets")}>
            {win.objective}
          </CoachExpandable>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LISTEN BUTTON — Amy Coach win read-aloud via dedicated shared cache layer.
export function ListenButton({
  win,
  planCacheKey,
  compact = false,
}: {
  win: Win;
  planCacheKey?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { speak, pause, loading, speaking, primeSpeakGesture } = useAmyVoice();
  const [isListening, setIsListening] = useState(false);
  const audioIdentity = useMemo(() => {
    const key = (planCacheKey ?? "").trim();
    if (!key) return null;
    try {
      return createCoachAudioIdentity({ planCacheKey: key, win });
    } catch {
      return null;
    }
  }, [planCacheKey, win]);
  const buildText = useCallback(() => buildCoachWinListenText(win), [win]);
  const primeListen = useCallback(() => {
    const text = buildText();
    primeSpeakGesture(text, audioIdentity ? { coach: true, audioIdentity } : undefined);
  }, [buildText, primeSpeakGesture, audioIdentity]);
  const handleClick = () => {
    if (isListening || loading || speaking) {
      pause();
      setIsListening(false);
      return;
    }
    const text = buildText();
    const onFinished = () => setIsListening(false);
    setIsListening(true);
    const opts = audioIdentity
      ? {
          coach: true as const,
          audioIdentity,
          playbackMode: "partial-ok" as const,
          onFinished,
        }
      : {
          playbackMode: "partial-ok" as const,
          onFinished,
        };
    void speak(text, opts).then((res) => {
      if (!res?.success) setIsListening(false);
    });
  };
  const isActive = isListening || loading || speaking;
  const listenLabel = isActive && !loading
    ? t("pages.ai_coach.listen_stop", "Stop")
    : loading
      ? "…"
      : compact
        ? t("pages.ai_coach.listen_compact", "🔊 Listen")
        : t("pages.ai_coach.listen", "Listen");
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      data-testid="coach-listen-row"
    >
      <button
        type="button"
        onPointerDown={primeListen}
        onClick={handleClick}
        data-testid="coach-listen-btn"
        style={{
          fontSize: compact ? 11 : 11,
          padding: compact ? "5px 10px" : "4px 10px",
          borderRadius: 999,
          background: isActive ? "rgba(139,92,246,0.22)" : "rgba(255,255,255,0.06)",
          color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.82)",
          fontWeight: 700,
          border: isActive
            ? "1px solid rgba(167,139,250,0.45)"
            : "1px solid rgba(255,255,255,0.12)",
          display: "inline-flex",
          alignItems: "center",
          gap: compact ? 0 : 5,
          cursor: "pointer",
        }}
        aria-label={isActive ? t("pages.ai_coach.listen_stop", "Stop listening") : t("pages.ai_coach.listen_aria", "Listen to this win")}
        title={isActive ? t("pages.ai_coach.listen_stop", "Stop") : t("pages.ai_coach.listen_aria", "Amy reads this aloud")}
      >
        {!compact && (isActive ? <VolumeX size={12} /> : <Volume2 size={12} />)}
        {listenLabel}
      </button>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRINTABLE PLAN — A clean, paper-friendly render of the entire 12-win plan.
// Hidden on screen via the .ws-print-only class; revealed when window.print()
// is invoked. The accompanying CSS in src/index.css hides everything else.
// ═══════════════════════════════════════════════════════════════════════════
function PrintablePlan({
  plan
}: {
  plan: Plan;
}) {
  const {
    t
  } = useTranslation();
  return <div className="ws-print-only" aria-hidden="true">
      <div style={{
      padding: 24,
      color: "#111",
      fontFamily: "Georgia, 'Times New Roman', serif"
    }}>
        <div style={{
        borderBottom: "2px solid hsl(var(--brand-violet-700))",
        paddingBottom: 12,
        marginBottom: 16
      }}>
          <p style={{
          fontSize: 11,
          color: "hsl(var(--brand-violet-700))",
          margin: 0,
          letterSpacing: 1,
          fontWeight: 700
        }}>
            {t("pages.ai_coach.amynest_amy_coach_12_win_plan")}
          </p>
          <h1 style={{
          fontSize: 22,
          margin: "6px 0 4px",
          color: "#111"
        }}>{plan.title}</h1>
          {plan.root_cause && <p style={{
          fontSize: 12,
          color: "#444",
          margin: "8px 0 0",
          lineHeight: 1.55
        }}>
              <strong>{t("pages.ai_coach.root_cause_2")}</strong> {plan.root_cause}
            </p>}
          {plan.summary && <p style={{
          fontSize: 12,
          color: "#444",
          margin: "6px 0 0",
          lineHeight: 1.55
        }}>
              <strong>{t("pages.ai_coach.summary")}</strong> {plan.summary}
            </p>}
        </div>

        {plan.wins.map(w => {
        return <section key={w.win} style={{
          pageBreakInside: "avoid",
          borderLeft: "3px solid hsl(var(--brand-violet-500))",
          padding: "10px 14px",
          marginBottom: 14,
          background: "#fafafa"
        }}>
            <h2 style={{
            fontSize: 14,
            margin: "0 0 4px",
            color: "#1f1147"
          }}>
              {t("pages.ai_coach.win")} {w.win}: {w.title}
            </h2>
            <p style={{
            fontSize: 11,
            fontStyle: "italic",
            color: "#555",
            margin: "0 0 8px"
          }}>
              {w.objective}
            </p>
            <p style={{
            fontSize: 11,
            color: "#222",
            lineHeight: 1.55,
            margin: "0 0 8px"
          }}>
              {w.deep_explanation}
            </p>
            {w.actions?.length > 0 && <>
                <p style={{
              fontSize: 11,
              fontWeight: 700,
              margin: "6px 0 4px",
              color: "#1f1147"
            }}>{t("pages.ai_coach.actions")}</p>
                <ol style={{
              fontSize: 11,
              color: "#222",
              margin: "0 0 6px 18px",
              paddingLeft: 0,
              lineHeight: 1.5
            }}>
                  {w.actions.map((a, i) => <li key={i} style={{
                marginBottom: 2
              }}>{a}</li>)}
                </ol>
              </>}
            {w.example && <p style={{
            fontSize: 11,
            color: "#222",
            margin: "6px 0",
            lineHeight: 1.5
          }}>
                <strong>{t("pages.ai_coach.example")}</strong> {w.example}
              </p>}
            {w.mistake_to_avoid && <p style={{
            fontSize: 11,
            color: "hsl(var(--brand-red-900))",
            margin: "6px 0",
            lineHeight: 1.5
          }}>
                <strong>{t("pages.ai_coach.avoid")}</strong> {w.mistake_to_avoid}
              </p>}
            {w.micro_task && <p style={{
            fontSize: 11,
            color: "hsl(var(--brand-emerald-800))",
            margin: "6px 0",
            lineHeight: 1.5
          }}>
                <strong>{t("pages.ai_coach.today_s_micro_task")}</strong> {w.micro_task}
              </p>}
            <p style={{
            fontSize: 10,
            color: "#666",
            margin: "6px 0 0"
          }}>
              ⏱ {w.duration} {w.science_reference ? ` · 📚 ${w.science_reference}` : ""}
            </p>
          </section>;
      })}

        <p style={{
        fontSize: 10,
        color: "#666",
        marginTop: 16,
        textAlign: "center",
        borderTop: "1px solid #ddd",
        paddingTop: 8
      }}>
          {t("pages.ai_coach.generated_by_amynest_amy_coach_guidance_only_not_a_medical_d")}
        </p>
      </div>
    </div>;
}