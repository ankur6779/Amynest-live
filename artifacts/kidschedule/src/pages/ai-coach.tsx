import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useLocation, Link } from "wouter";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useToast } from "@/hooks/use-toast";
import { useSectionUsage } from "@/hooks/use-section-usage";
import { usePaywall } from "@/contexts/paywall-context";
import {
  Sparkles, ArrowLeft, ArrowRight, Loader2, Search,
  Check, ChevronLeft, RotateCcw, BarChart3, Share2, Bookmark, Brain, Heart,
  Printer, Volume2, VolumeX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  INFANT_PROBLEMS,
  isInfantProblemId,
  getInfantProblem,
  pickLang as pickInfLang,
} from "@workspace/infant-problems";

// ─── Goals (categorized) ───────────────────────────────────────────────────
interface GoalItem { id: string; title: string; emoji: string; gradient: string }
interface GoalCategory { id: string; title: string; emoji: string; gradient: string; items: GoalItem[] }

const GOAL_CATEGORIES: GoalCategory[] = [
  {
    id: "behavior", title: "Behavior", emoji: "🎯",
    gradient: "from-rose-100 dark:from-rose-500/20 via-pink-50 dark:via-pink-500/15 to-orange-100 dark:to-orange-500/20",
    items: [
      { id: "manage-tantrums",       title: "Manage Tantrums",           emoji: "😤", gradient: "from-rose-100 dark:from-rose-500/20 to-pink-200 dark:to-pink-500/25" },
      { id: "handle-aggression",     title: "Handle Aggression",         emoji: "✋", gradient: "from-red-100 dark:from-red-500/20 to-rose-200 dark:to-rose-500/25" },
      { id: "reduce-defiance",       title: "Reduce Defiance",           emoji: "🛑", gradient: "from-amber-100 dark:from-amber-500/20 to-orange-200 dark:to-orange-500/25" },
      { id: "emotional-regulation",  title: "Emotional Regulation",      emoji: "💗", gradient: "from-pink-100 dark:from-pink-500/20 to-fuchsia-200 dark:to-fuchsia-500/25" },
      { id: "separation-anxiety",    title: "Separation Anxiety",        emoji: "🫂", gradient: "from-violet-100 dark:from-violet-500/20 to-purple-200 dark:to-purple-500/25" },
    ],
  },
  {
    id: "screen-focus", title: "Screen & Focus", emoji: "📱",
    gradient: "from-sky-100 dark:from-sky-500/20 via-blue-50 dark:via-blue-500/15 to-indigo-100 dark:to-indigo-500/20",
    items: [
      { id: "balance-screen-time",         title: "Balance Screen Time",         emoji: "📱", gradient: "from-sky-100 dark:from-sky-500/20 to-blue-200 dark:to-blue-500/25" },
      { id: "reduce-mobile-addiction",     title: "Reduce Mobile Addiction",     emoji: "📵", gradient: "from-blue-100 dark:from-blue-500/20 to-indigo-200 dark:to-indigo-500/25" },
      { id: "improve-focus-span",          title: "Improve Focus Span",          emoji: "🎯", gradient: "from-purple-100 dark:from-purple-500/20 to-fuchsia-200 dark:to-fuchsia-500/25" },
      { id: "reduce-shorts-overuse",       title: "Reduce YouTube / Shorts Overuse", emoji: "🎬", gradient: "from-rose-100 dark:from-rose-500/20 to-red-200 dark:to-red-500/25" },
      { id: "reduce-instant-gratification",title: "Reduce Instant Gratification", emoji: "⏳", gradient: "from-amber-100 dark:from-amber-500/20 to-yellow-200 dark:to-yellow-500/25" },
    ],
  },
  {
    id: "eating", title: "Eating", emoji: "🍽️",
    gradient: "from-emerald-100 dark:from-emerald-500/20 via-green-50 dark:via-green-500/15 to-teal-100 dark:to-teal-500/20",
    items: [
      { id: "encourage-independent-eating", title: "Encourage Independent Eating", emoji: "🥄", gradient: "from-emerald-100 dark:from-emerald-500/20 to-green-200 dark:to-green-500/25" },
      { id: "navigate-fussy-eating",        title: "Navigate Fussy Eating",        emoji: "🥦", gradient: "from-teal-100 dark:from-teal-500/20 to-cyan-200 dark:to-cyan-500/25" },
      { id: "stop-junk-food-craving",       title: "Stop Junk Food Craving",       emoji: "🍟", gradient: "from-orange-100 dark:from-orange-500/20 to-amber-200 dark:to-amber-500/25" },
      { id: "healthy-eating-routine",       title: "Build Healthy Eating Routine", emoji: "🍎", gradient: "from-green-100 dark:from-green-500/20 to-emerald-200 dark:to-emerald-500/25" },
      { id: "improve-mealtime-behavior",    title: "Improve Mealtime Behavior",    emoji: "🍽️", gradient: "from-lime-100 dark:from-lime-500/20 to-green-200 dark:to-green-500/25" },
    ],
  },
  {
    id: "sleep", title: "Sleep", emoji: "😴",
    gradient: "from-indigo-100 dark:from-indigo-500/20 via-violet-50 dark:via-violet-500/15 to-purple-100 dark:to-purple-500/20",
    items: [
      { id: "improve-sleep-patterns",    title: "Improve Sleep Patterns",    emoji: "😴", gradient: "from-indigo-100 dark:from-indigo-500/20 to-violet-200 dark:to-violet-500/25" },
      { id: "fix-bedtime-resistance",    title: "Fix Bedtime Resistance",    emoji: "🛏️", gradient: "from-purple-100 dark:from-purple-500/20 to-indigo-200 dark:to-indigo-500/25" },
      { id: "stop-night-waking",         title: "Stop Night Waking",         emoji: "🌙", gradient: "from-blue-100 dark:from-blue-500/20 to-indigo-200 dark:to-indigo-500/25" },
      { id: "consistent-sleep-routine",  title: "Build Consistent Routine",  emoji: "🕘", gradient: "from-violet-100 dark:from-violet-500/20 to-purple-200 dark:to-purple-500/25" },
      { id: "reduce-late-sleeping",      title: "Reduce Late Sleeping Habit",emoji: "⏰", gradient: "from-indigo-100 dark:from-indigo-500/20 to-blue-200 dark:to-blue-500/25" },
    ],
  },
  {
    id: "learning", title: "Learning", emoji: "📚",
    gradient: "from-purple-100 dark:from-purple-500/20 via-fuchsia-50 dark:via-fuchsia-500/15 to-pink-100 dark:to-pink-500/20",
    items: [
      { id: "boost-concentration",        title: "Boost Concentration",       emoji: "🎯", gradient: "from-purple-100 dark:from-purple-500/20 to-fuchsia-200 dark:to-fuchsia-500/25" },
      { id: "build-study-discipline",     title: "Build Study Discipline",    emoji: "📖", gradient: "from-blue-100 dark:from-blue-500/20 to-sky-200 dark:to-sky-500/25" },
      { id: "increase-learning-interest", title: "Increase Learning Interest",emoji: "💡", gradient: "from-yellow-100 dark:from-yellow-500/20 to-amber-200 dark:to-amber-500/25" },
      { id: "reduce-homework-resistance", title: "Reduce Homework Resistance",emoji: "✏️", gradient: "from-teal-100 dark:from-teal-500/20 to-emerald-200 dark:to-emerald-500/25" },
      { id: "develop-growth-mindset",     title: "Develop Growth Mindset",    emoji: "🌱", gradient: "from-green-100 dark:from-green-500/20 to-lime-200 dark:to-lime-500/25" },
    ],
  },
  {
    id: "infant-problems", title: "Infant Parent Problems (0–2 yrs)", emoji: "👶",
    gradient: "from-pink-100 dark:from-pink-500/20 via-rose-50 dark:via-rose-500/15 to-amber-100 dark:to-amber-500/20",
    items: INFANT_PROBLEMS.map((p) => ({
      id: p.id,
      title: p.title.en,
      emoji: p.emoji,
      gradient: "from-pink-100 dark:from-pink-500/20 to-rose-200 dark:to-rose-500/25",
    })),
  },
  {
    id: "parenting-challenges", title: "Parenting Challenges", emoji: "💝",
    gradient: "from-amber-100 dark:from-amber-500/20 via-orange-50 dark:via-orange-500/15 to-yellow-100 dark:to-yellow-500/20",
    items: [
      { id: "manage-grandparents-interference", title: "Manage Grandparents' Interference", emoji: "👵", gradient: "from-rose-100 dark:from-rose-500/20 to-pink-200 dark:to-pink-500/25" },
      { id: "align-parenting-between-parents",  title: "Align Parenting Between Parents",   emoji: "🤝", gradient: "from-violet-100 dark:from-violet-500/20 to-purple-200 dark:to-purple-500/25" },
      { id: "handle-working-parent-guilt",      title: "Handle Working Parent Guilt",       emoji: "💼", gradient: "from-sky-100 dark:from-sky-500/20 to-blue-200 dark:to-blue-500/25" },
      { id: "set-consistent-family-rules",      title: "Set Consistent Family Rules",       emoji: "📋", gradient: "from-amber-100 dark:from-amber-500/20 to-orange-200 dark:to-orange-500/25" },
    ],
  },
  // ─── NEW: Toddler Behavior (2–4 yrs focused) ─────────────────────────
  {
    id: "toddler-behavior", title: "Toddler Behavior (2–4 yrs)", emoji: "🧒",
    gradient: "from-rose-100 dark:from-rose-500/20 via-pink-50 dark:via-pink-500/15 to-amber-100 dark:to-amber-500/20",
    items: [
      { id: "toddler-tantrums",       title: "Toddler Tantrums (2–4)",     emoji: "😤", gradient: "from-rose-100 dark:from-rose-500/20 to-pink-200 dark:to-pink-500/25" },
      { id: "hitting-biting",         title: "Hitting & Biting",            emoji: "🦷", gradient: "from-red-100 dark:from-red-500/20 to-rose-200 dark:to-rose-500/25" },
      { id: "no-phase",               title: "The 'No' Phase",              emoji: "🙅", gradient: "from-amber-100 dark:from-amber-500/20 to-orange-200 dark:to-orange-500/25" },
      { id: "public-meltdowns",       title: "Public Meltdowns",            emoji: "🛒", gradient: "from-pink-100 dark:from-pink-500/20 to-fuchsia-200 dark:to-fuchsia-500/25" },
      { id: "whining-and-clinginess", title: "Whining & Clinginess",        emoji: "🥺", gradient: "from-violet-100 dark:from-violet-500/20 to-purple-200 dark:to-purple-500/25" },
    ],
  },
  // ─── NEW: Daily Skills & Independence ────────────────────────────────
  {
    id: "daily-skills", title: "Daily Skills & Independence", emoji: "🚽",
    gradient: "from-teal-100 dark:from-teal-500/20 via-emerald-50 dark:via-emerald-500/15 to-cyan-100 dark:to-cyan-500/20",
    items: [
      { id: "potty-training-readiness", title: "Potty Training Readiness",  emoji: "🪴", gradient: "from-teal-100 dark:from-teal-500/20 to-emerald-200 dark:to-emerald-500/25" },
      { id: "potty-day-training",       title: "Day Toilet Training",        emoji: "🚽", gradient: "from-cyan-100 dark:from-cyan-500/20 to-teal-200 dark:to-teal-500/25" },
      { id: "potty-night-training",     title: "Night-Time Dry",              emoji: "🌙", gradient: "from-indigo-100 dark:from-indigo-500/20 to-violet-200 dark:to-violet-500/25" },
      { id: "potty-public-anxiety",     title: "Public Toilet Anxiety",       emoji: "🚻", gradient: "from-sky-100 dark:from-sky-500/20 to-blue-200 dark:to-blue-500/25" },
      { id: "self-dressing",            title: "Self-Dressing & Hygiene",     emoji: "👕", gradient: "from-emerald-100 dark:from-emerald-500/20 to-green-200 dark:to-green-500/25" },
    ],
  },
  // ─── NEW: Family Dynamics ────────────────────────────────────────────
  {
    id: "family-dynamics", title: "Family Dynamics", emoji: "👨‍👩‍👧‍👦",
    gradient: "from-violet-100 dark:from-violet-500/20 via-fuchsia-50 dark:via-fuchsia-500/15 to-pink-100 dark:to-pink-500/20",
    items: [
      { id: "sibling-rivalry",       title: "Sibling Rivalry",            emoji: "⚔️", gradient: "from-rose-100 dark:from-rose-500/20 to-pink-200 dark:to-pink-500/25" },
      { id: "sharing-turn-taking",   title: "Sharing & Turn-Taking",      emoji: "🤲", gradient: "from-amber-100 dark:from-amber-500/20 to-orange-200 dark:to-orange-500/25" },
      { id: "new-baby-adjustment",   title: "Adjusting to New Baby",      emoji: "👶", gradient: "from-pink-100 dark:from-pink-500/20 to-rose-200 dark:to-rose-500/25" },
      { id: "sibling-fights",        title: "Sibling Fights & Hitting",   emoji: "🥊", gradient: "from-red-100 dark:from-red-500/20 to-rose-200 dark:to-rose-500/25" },
      { id: "favouritism-feelings",  title: "Handle Favouritism Feelings",emoji: "💔", gradient: "from-violet-100 dark:from-violet-500/20 to-purple-200 dark:to-purple-500/25" },
    ],
  },
  // ─── NEW: Special Situations ─────────────────────────────────────────
  {
    id: "special-situations", title: "Special Situations", emoji: "✈️",
    gradient: "from-orange-100 dark:from-orange-500/20 via-amber-50 dark:via-amber-500/15 to-yellow-100 dark:to-yellow-500/20",
    items: [
      { id: "travel-with-kids",    title: "Travel With Kids",            emoji: "✈️", gradient: "from-sky-100 dark:from-sky-500/20 to-blue-200 dark:to-blue-500/25" },
      { id: "hospital-doctor-visit", title: "Hospital / Doctor Visit",   emoji: "🏥", gradient: "from-rose-100 dark:from-rose-500/20 to-red-200 dark:to-red-500/25" },
      { id: "daycare-school-transition", title: "Daycare / School Transition", emoji: "🎒", gradient: "from-amber-100 dark:from-amber-500/20 to-orange-200 dark:to-orange-500/25" },
      { id: "welcoming-new-sibling", title: "Welcoming a New Sibling",   emoji: "🎀", gradient: "from-pink-100 dark:from-pink-500/20 to-rose-200 dark:to-rose-500/25" },
      { id: "moving-houses",        title: "Moving to a New Home",       emoji: "📦", gradient: "from-emerald-100 dark:from-emerald-500/20 to-teal-200 dark:to-teal-500/25" },
    ],
  },
  // ─── NEW: Kids Health Concern (research & science-based) ─────────────
  {
    id: "kids-health-concern", title: "Kids Health Concern", emoji: "🩺",
    gradient: "from-emerald-100 dark:from-emerald-500/20 via-teal-50 dark:via-teal-500/15 to-cyan-100 dark:to-cyan-500/20",
    items: [
      { id: "child-obesity-management", title: "Childhood Obesity & Weight Management",   emoji: "⚖️", gradient: "from-emerald-100 dark:from-emerald-500/20 to-teal-200 dark:to-teal-500/25" },
      { id: "nutrition-deficiency",     title: "Nutrition Deficiency (Hidden Problem)",    emoji: "🥗", gradient: "from-lime-100 dark:from-lime-500/20 to-green-200 dark:to-green-500/25" },
      { id: "boost-immunity",           title: "Immunity & Frequent Illness",              emoji: "🛡️", gradient: "from-cyan-100 dark:from-cyan-500/20 to-sky-200 dark:to-sky-500/25" },
      { id: "dental-health",            title: "Dental Health",                            emoji: "🦷", gradient: "from-blue-100 dark:from-blue-500/20 to-indigo-200 dark:to-indigo-500/25" },
      { id: "digital-health-eye-care",  title: "Screen Addiction & Digital Health",        emoji: "👀", gradient: "from-violet-100 dark:from-violet-500/20 to-purple-200 dark:to-purple-500/25" },
      { id: "early-milestones-0-5",     title: "Early Development & Milestones (0–5 yrs)", emoji: "🌱", gradient: "from-amber-100 dark:from-amber-500/20 to-yellow-200 dark:to-yellow-500/25" },
    ],
  },
  // ─── For You (Parent Self-Care) — age question is skipped for this category ─
  {
    id: "for-you", title: "For You (Parent Self-Care)", emoji: "💖",
    gradient: "from-fuchsia-100 dark:from-fuchsia-500/20 via-pink-50 dark:via-pink-500/15 to-rose-100 dark:to-rose-500/20",
    items: [
      { id: "parent-burnout",        title: "Beat Parent Burnout",         emoji: "🪫", gradient: "from-rose-100 dark:from-rose-500/20 to-pink-200 dark:to-pink-500/25" },
      { id: "stay-calm-anger",       title: "Stay Calm When Angry",        emoji: "🧘", gradient: "from-violet-100 dark:from-violet-500/20 to-purple-200 dark:to-purple-500/25" },
      { id: "guilt-after-yelling",   title: "Handle Guilt After Yelling",  emoji: "💔", gradient: "from-pink-100 dark:from-pink-500/20 to-rose-200 dark:to-rose-500/25" },
      { id: "find-me-time",          title: "Find 'Me Time' Daily",        emoji: "☕", gradient: "from-amber-100 dark:from-amber-500/20 to-orange-200 dark:to-orange-500/25" },
      { id: "couple-time-balance",   title: "Balance Partner & Parent Time", emoji: "💑", gradient: "from-fuchsia-100 dark:from-fuchsia-500/20 to-pink-200 dark:to-pink-500/25" },
      { id: "improve-own-sleep",     title: "Improve Your Own Sleep",      emoji: "🌙", gradient: "from-indigo-100 dark:from-indigo-500/20 to-violet-200 dark:to-violet-500/25" },
      { id: "manage-overwhelm",      title: "Manage Daily Overwhelm",      emoji: "🌪️", gradient: "from-sky-100 dark:from-sky-500/20 to-blue-200 dark:to-blue-500/25" },
    ],
  },
];

const ALL_GOALS: GoalItem[] = GOAL_CATEGORIES.flatMap((c) => c.items);

// Goals whose parent category already implies an age → skip the ageGroup question.
// "for-you" is parent self-care, so age is irrelevant — we mark it as adult.
const CATEGORY_IMPLIED_AGE: Record<string, string> = {
  "toddler-behavior": "2–4 years",
  "daily-skills":     "2–4 years",
  "for-you":          "Adult (parent self-care)",
};
// Build a fast lookup: goalId → implied age answer
const GOAL_IMPLIED_AGE: Record<string, string> = {};
GOAL_CATEGORIES.forEach((cat) => {
  const implied = CATEGORY_IMPLIED_AGE[cat.id];
  if (implied) cat.items.forEach((g) => { GOAL_IMPLIED_AGE[g.id] = implied; });
});

// ─── Question definitions ──────────────────────────────────────────────────
type QuestionType = "single" | "multi";
interface Question {
  id: "ageGroup" | "severity" | "triggers" | "routine" | "goalRefinement";
  prompt: string;
  type: QuestionType;
  options: string[];
}

const COMMON_TRIGGERS = [
  "Hunger or tiredness", "Transitions or changes", "Being told 'no'", "Boredom",
  "Sibling conflict", "School/social stress", "Inconsistent rules", "Sensory overload",
];

const QUESTIONS: Question[] = [
  { id: "ageGroup",       prompt: "What's your child's age?",         type: "single", options: ["2–4 years", "5–7 years", "8–10 years", "10+ years (tween/teen)"] },
  { id: "severity",       prompt: "How challenging is it right now?", type: "single", options: ["Mild – occasional", "Moderate – frequent", "Severe – daily struggle"] },
  { id: "triggers",       prompt: "What triggers it most? (pick any)",type: "multi",  options: COMMON_TRIGGERS },
  { id: "routine",        prompt: "What's your current approach?",    type: "single", options: ["No clear routine yet", "I try but it's inconsistent", "Strict rules, lots of pushback", "Trying gentle parenting", "Just starting to figure it out"] },
  { id: "goalRefinement", prompt: "What matters most to you?",        type: "single", options: ["Reduce frequency", "Stay calm myself", "Build my child's skills", "Long-term healthy pattern"] },
];

// ─── Types ─────────────────────────────────────────────────────────────────
interface Win {
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
interface Plan { title: string; root_cause: string; summary: string; wins: Win[]; }

type Phase = "goals" | "questions" | "loading" | "result" | "infantProblem" | "resuming";
type Feedback = "yes" | "somewhat" | "no";

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
export default function AICoachPage() {
  const [, setLocation] = useLocation();
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const { i18n, t } = useTranslation();

  // Detect ?resume=<sessionId> from URL (set by ai-coach-progress "Continue plan" button)
  const resumeSessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("resume") ?? "";
  }, []);

  const [phase, setPhase] = useState<Phase>(resumeSessionId ? "resuming" : "goals");
  const [goalSearch, setGoalSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string>("");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [feedbackByWin, setFeedbackByWin] = useState<Record<number, Feedback>>({});
  const [extending, setExtending] = useState(false);
  const [progressWinCount, setProgressWinCount] = useState(0);
  // True while we're still receiving streamed wins from the server. Used
  // to distinguish "Next is disabled because we're at the last available
  // win and more are still loading" from "we're at the genuine last card."
  const [isStreaming, setIsStreaming] = useState(false);

  // Keep last submitted answers/payload around so we can call /extend later
  const lastPayloadRef = useRef<{
    goal: string; ageGroup: string; severity: string; triggers: string[]; routine: string;
  } | null>(null);

  // Freeze the denominator at the original plan size (12).
  // Extension cards are bonus — adding them must never drop the progress %.
  const originalWinCountRef = useRef<number>(0);

  // Progress %: Worked = 100%, Partially = 50%, Not worked = 0%
  // Denominator = original plan win count (never grows with extensions).
  const progressPct = useMemo(() => {
    const denom = originalWinCountRef.current;
    if (!plan || denom === 0) return 0;
    const sum = Object.values(feedbackByWin).reduce(
      (acc, f) => acc + (f === "yes" ? 1 : f === "somewhat" ? 0.5 : 0),
      0,
    );
    return Math.min(100, Math.round((sum / denom) * 100));
  }, [feedbackByWin, plan]);

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

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return GOAL_CATEGORIES;
    return GOAL_CATEGORIES
      .map((c) => ({ ...c, items: c.items.filter((g) => g.title.toLowerCase().includes(searchQuery)) }))
      .filter((c) => c.items.length > 0);
  }, [searchQuery]);

  const totalMatches = useMemo(
    () => filteredCategories.reduce((n, c) => n + c.items.length, 0),
    [filteredCategories]
  );

  const selectedGoal = ALL_GOALS.find((g) => g.id === goalId);

  // Free-tier gate: parents may COMPLETE exactly ONE coach topic for free.
  // The free allowance is consumed only when a topic plan is successfully
  // shown. Picking a goal that is never finished does NOT burn it.
  const coachUsage = useSectionUsage("amy_coach");
  const { openPaywall } = usePaywall();

  // ─── Resume session: detect ?resume=<sessionId>, load plan + feedback ────
  useEffect(() => {
    if (!resumeSessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/ai-coach/session/${encodeURIComponent(resumeSessionId)}`);
        if (cancelled) return;
        if (!res.ok) throw new Error("session not found");
        const data = await res.json() as {
          sessionId: string;
          goalId: string;
          plan: Plan;
          inputs: { goal: string; ageGroup: string; severity: string; triggers: string[]; routine: string; language?: string };
          feedbacks: Record<string, string>;
        };
        if (cancelled) return;

        // Restore plan + session state
        const restoredFeedbacks: Record<number, Feedback> = {};
        for (const [k, v] of Object.entries(data.feedbacks)) {
          restoredFeedbacks[Number(k)] = v as Feedback;
        }

        setPlan(data.plan);
        setSessionId(data.sessionId);
        setGoalId(data.goalId);
        setFeedbackByWin(restoredFeedbacks);
        originalWinCountRef.current = data.plan.wins.length;

        // Restore lastPayloadRef so /extend can work if needed
        lastPayloadRef.current = {
          goal: data.inputs.goal,
          ageGroup: data.inputs.ageGroup,
          severity: data.inputs.severity,
          triggers: data.inputs.triggers ?? [],
          routine: data.inputs.routine,
        };

        // Jump to the first incomplete win (no feedback yet), or last win if all done
        const firstIncomplete = data.plan.wins.findIndex(
          (w) => !restoredFeedbacks[w.win]
        );
        setActiveIdx(firstIncomplete >= 0 ? firstIncomplete : data.plan.wins.length - 1);
        setPhase("result");
      } catch (err) {
        if (cancelled) return;
        toast({ title: "Could not load session", description: "Opening Amy Coach fresh.", variant: "destructive" });
        setPhase("goals");
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSessionId]);

  // ─── Goals → Questions (or → 12-card Result for the 0–2 yr topic)
  const handlePickGoal = (id: string) => {
    if (!coachUsage.isPremium && coachUsage.fullyUsed) {
      openPaywall("coach_locked");
      return;
    }
    setGoalId(id);
    if (isInfantProblemId(id)) {
      const problem = getInfantProblem(id);
      if (problem && problem.wins && problem.wins.length > 0) {
        // Build a static, science-backed Plan from the infant problem dataset
        // and route through the standard 12-card swipeable result UI.
        const staticPlan: Plan = {
          title: `${problem.emoji} ${problem.title.en}`,
          root_cause: problem.rootCause,
          summary: problem.summary,
          wins: problem.wins,
        };
        setPlan(staticPlan);
        originalWinCountRef.current = staticPlan.wins.length;
        setSessionId(`infant-${id}-${Date.now()}`);
        setActiveIdx(0);
        setFeedbackByWin({});
        setPhase("result");
        // Static infant plan renders immediately — counts as completion.
        if (!coachUsage.isPremium) coachUsage.markBlockUsed("completed");
        return;
      }
      // Fallback to the legacy 1-page view if the problem has no wins yet.
      setPhase("infantProblem");
      return;
    }
    const impliedAge = GOAL_IMPLIED_AGE[id];
    if (impliedAge) {
      // Age is already implied by the goal category — pre-fill and skip the age question
      setAnswers({ ageGroup: impliedAge });
      setQIndex(1);
    } else {
      setQIndex(0);
      setAnswers({});
    }
    setPhase("questions");
  };

  // ─── Question handlers
  const currentQ = QUESTIONS[qIndex];
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;
  const isAnswered = currentQ?.type === "multi"
    ? Array.isArray(currentAnswer) && currentAnswer.length > 0
    : typeof currentAnswer === "string" && currentAnswer.length > 0;

  const handleSelectOption = (opt: string) => {
    if (!currentQ) return;
    if (currentQ.type === "single") {
      setAnswers((a) => ({ ...a, [currentQ.id]: opt }));
    } else {
      const cur = (answers[currentQ.id] as string[]) ?? [];
      const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
      setAnswers((a) => ({ ...a, [currentQ.id]: next }));
    }
  };

  const handleNextQ = () => {
    if (qIndex < QUESTIONS.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      submitPlan();
    }
  };

  const handleBackQ = () => {
    // If age was auto-skipped for this goal (qIndex 0 is hidden), going back from
    // qIndex 1 should return to goals, not show the hidden age question.
    const ageImplied = goalId ? !!GOAL_IMPLIED_AGE[goalId] : false;
    if (qIndex > 0 && !(qIndex === 1 && ageImplied)) setQIndex((i) => i - 1);
    else setPhase("goals");
  };

  // ─── Submit to API
  const submitPlan = async () => {
    // Cancel any previous in-flight build (e.g. user retried) before starting.
    buildAbortRef.current?.abort();
    const ctrl = new AbortController();
    buildAbortRef.current = ctrl;
    setPhase("loading");
    setActiveIdx(0);
    setFeedbackByWin({});
    setProgressWinCount(0);
    setIsStreaming(false);
    setPlan(null);
    setSessionId("");
    const ageMap: Record<string, string> = { "2–4 years": "2-4", "5–7 years": "5-7", "8–10 years": "8-10", "10+ years (tween/teen)": "10+" };
    const sevMap: Record<string, string> = { "Mild – occasional": "mild", "Moderate – frequent": "moderate", "Severe – daily struggle": "severe" };
    const payload = {
      goal: goalId,
      ageGroup: ageMap[answers.ageGroup as string] ?? (answers.ageGroup as string) ?? "5-7",
      severity: sevMap[answers.severity as string] ?? "moderate",
      triggers: (answers.triggers as string[]) ?? [],
      routine: (answers.routine as string) ?? "",
      goalRefinement: (answers.goalRefinement as string) ?? "",
    };
    lastPayloadRef.current = {
      goal: payload.goal,
      ageGroup: payload.ageGroup,
      severity: payload.severity,
      triggers: payload.triggers,
      routine: payload.routine,
    };

    const handleSuccess = (data: { plan: Plan; sessionId: string }) => {
      if (!data?.plan?.wins?.length) {
        throw new Error("Empty plan from server");
      }
      window.dispatchEvent(new CustomEvent("amynest:refresh-subscription"));
      setPlan(data.plan);
      // Freeze denominator at the original win count so extensions never drop progress %
      originalWinCountRef.current = data.plan.wins.length;
      setSessionId(data.sessionId);
      setPhase("result");
      // Free allowance is consumed only on a successful topic completion.
      if (!coachUsage.isPremium) coachUsage.markBlockUsed("completed");
    };

    // Non-streaming fallback (existing endpoint).
    const buildViaJson = async (body: string): Promise<void> => {
      const res = await authFetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: ctrl.signal,
      });
      if (res.status === 402) {
        window.dispatchEvent(new CustomEvent("amynest:open-paywall", { detail: { reason: "ai_quota" } }));
        setPhase("questions");
        return;
      }
      if (!res.ok) {
        let bodySnippet = "";
        try { bodySnippet = (await res.text()).slice(0, 200); } catch { /* noop */ }
        throw new Error(`Server ${res.status}${bodySnippet ? ` — ${bodySnippet}` : ""}`);
      }
      const data = (await res.json()) as { plan: Plan; sessionId: string };
      handleSuccess(data);
    };

    try {
      const { default: i18nInstance } = await import("@/i18n");
      const body = JSON.stringify({ ...payload, language: i18nInstance.language || "en" });

      // Try the streaming endpoint first so the user sees real progress.
      const streamRes = await authFetch("/api/ai-coach/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
        body,
        signal: ctrl.signal,
      });
      if (streamRes.status === 402) {
        window.dispatchEvent(new CustomEvent("amynest:open-paywall", { detail: { reason: "ai_quota" } }));
        setPhase("questions");
        return;
      }
      const ctype = streamRes.headers.get("content-type") || "";
      if (!streamRes.ok || !ctype.includes("text/event-stream") || !streamRes.body) {
        // Stream endpoint unavailable — fall back to plain JSON.
        await buildViaJson(body);
        return;
      }

      // Read SSE stream.
      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let done: { plan: Plan; sessionId: string } | null = null;
      let streamError: string | null = null;

      // Progressive plan we build as `plan_meta` + `win` events stream in,
      // so the user can start reading win 1 long before all 12 are ready.
      let streamedMeta: { title: string; root_cause: string; summary: string } | null = null;
      const streamedWins: Win[] = [];
      let promotedToResult = false;

      const promoteIfReady = (streamSessionId?: string) => {
        if (promotedToResult) return;
        if (streamedWins.length === 0 || !streamedMeta) return;
        promotedToResult = true;
        const partialPlan: Plan = {
          title: streamedMeta.title,
          root_cause: streamedMeta.root_cause,
          summary: streamedMeta.summary,
          // Sort defensively in case wins arrive out of order.
          wins: [...streamedWins].sort((a, b) => a.win - b.win),
        };
        setPlan(partialPlan);
        // Denominator is frozen at the original target (12) so progress %
        // stays stable as more wins stream in.
        if (originalWinCountRef.current === 0) originalWinCountRef.current = 12;
        if (streamSessionId) setSessionId(streamSessionId);
        setIsStreaming(true);
        setPhase("result");
        // Treat the user reaching the result phase as "topic shown" — burns
        // the free allowance the same as the non-streaming path does.
        if (!coachUsage.isPremium) coachUsage.markBlockUsed("completed");
        window.dispatchEvent(new CustomEvent("amynest:refresh-subscription"));
      };

      let pendingStreamSessionId = "";

      while (true) {
        if (ctrl.signal.aborted) {
          try { await reader.cancel(); } catch { /* noop */ }
          return;
        }
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE events are delimited by a blank line.
        let sepIdx: number;
        while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          const lines = rawEvent.split("\n");
          let event = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith(":")) continue; // comment / heartbeat
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) dataStr += (dataStr ? "\n" : "") + line.slice(5).trim();
          }
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (event === "progress") {
              const n = Number(data?.winsBuilt) || 0;
              setProgressWinCount(Math.max(0, Math.min(12, n)));
            } else if (event === "session") {
              if (typeof data?.sessionId === "string" && data.sessionId) {
                pendingStreamSessionId = data.sessionId;
                if (promotedToResult) setSessionId(data.sessionId);
              }
            } else if (event === "plan_meta") {
              if (data?.title && data?.root_cause && data?.summary) {
                streamedMeta = {
                  title: String(data.title),
                  root_cause: String(data.root_cause),
                  summary: String(data.summary),
                };
                promoteIfReady(pendingStreamSessionId);
              }
            } else if (event === "win") {
              const w = data as Win;
              if (
                typeof w?.win === "number" &&
                !streamedWins.some((existing) => existing.win === w.win)
              ) {
                streamedWins.push(w);
                if (promotedToResult) {
                  // Already in result phase — append to the existing plan.
                  setPlan((prev) => {
                    if (!prev) return prev;
                    if (prev.wins.some((existing) => existing.win === w.win)) return prev;
                    return {
                      ...prev,
                      wins: [...prev.wins, w].sort((a, b) => a.win - b.win),
                    };
                  });
                } else {
                  promoteIfReady(pendingStreamSessionId);
                }
              }
            } else if (event === "done") {
              done = data as { plan: Plan; sessionId: string };
            } else if (event === "error") {
              streamError = String(data?.message || "stream error");
            }
          } catch {
            // ignore malformed event
          }
        }
      }

      setIsStreaming(false);
      if (done) {
        // The `done` event delivers the canonical, fully-validated plan.
        // Replace the progressive reconstruction with it so any drift
        // (e.g. fallback plan) is the single source of truth.
        if (promotedToResult) {
          // Already shown — just swap in the canonical plan + sessionId.
          if (!coachUsage.isPremium) {
            // markBlockUsed was already called during promotion; no-op now.
          }
          setPlan(done.plan);
          setSessionId(done.sessionId);
          originalWinCountRef.current = done.plan.wins.length;
        } else {
          handleSuccess(done);
        }
        return;
      }
      throw new Error(streamError || "Stream ended without a plan");
    } catch (err) {
      // Aborts (component unmount, retry, navigate-away) are expected — silent.
      const isAbort =
        ctrl.signal.aborted ||
        (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted")));
      if (isAbort) return;
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error("[ai-coach] Build Plan failed:", msg, err);
      toast({
        title: "Something went wrong",
        description: msg.length > 0 ? `Please try again. (${msg})` : "Please try again in a moment.",
        variant: "destructive",
      });
      setPhase("questions");
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
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [phase, activeIdx]);

  const goToCard = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  // ─── Feedback (yes / somewhat / no)
  const submitFeedback = async (winNumber: number, feedback: Feedback) => {
    if (!plan || !sessionId) return;

    // Build updated feedback map synchronously so we can compute progress now
    const newFeedbackByWin = { ...feedbackByWin, [winNumber]: feedback };
    setFeedbackByWin(newFeedbackByWin);

    // Save to DB (silent on failure — UI already updated)
    try {
      await authFetch("/api/ai-coach/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId, goalId,
          planTitle: plan.title,
          winNumber,
          totalWins: plan.wins.length,
          feedback,
        }),
      });
    } catch { /* silent */ }

    // Compute new progress inline using frozen denominator (never drops when extensions added)
    const newSum = Object.values(newFeedbackByWin).reduce(
      (acc, f) => acc + (f === "yes" ? 1 : f === "somewhat" ? 0.5 : 0),
      0,
    );
    const denom = originalWinCountRef.current || plan.wins.length;
    const newPct = Math.min(100, Math.round((newSum / denom) * 100));
    const isLastCard = activeIdx === plan.wins.length - 1;

    // Rule: extend ONLY when progress < 100% AND we have an AI payload
    // (infant static plans have no payload — they're pre-built, not AI-generated).
    //   - "Not worked for me" on any card → extend (adaptive help)
    //   - Any button on the LAST card while still below 100% → extend (keep going)
    // At 100% — no more extensions, ever.
    const canExtend = !!lastPayloadRef.current;
    if (canExtend && newPct < 100 && (feedback === "no" || isLastCard)) {
      await requestExtension(winNumber);
    } else {
      toast({
        title: feedback === "yes" ? "Win locked in 🎉" : "Progress noted 💜",
        description: feedback === "yes"
          ? "Marked as complete. Moving to next step."
          : "Partial progress counted. Keep going.",
      });
      // Auto-advance to the next card
      setTimeout(() => goToCard(activeIdx + 1), 300);
    }
  };

  // ─── Adaptive: ask backend for 3 more wins when a step doesn't work
  const requestExtension = async (failedWinNumber: number) => {
    if (!plan || !lastPayloadRef.current || extending) return;
    const failedWin = plan.wins.find((w) => w.win === failedWinNumber);
    if (!failedWin) return;
    // Capture the card the user is currently on — we'll go one step forward from here
    const nextIdx = activeIdx + 1;
    setExtending(true);
    try {
      const startWinNumber = plan.wins.length + 1;
      const res = await authFetch("/api/ai-coach/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...lastPayloadRef.current,
          failedWinTitle: failedWin.title,
          failedWinNumber,
          startWinNumber,
          existingWinTitles: plan.wins.map((w) => w.title),
        }),
      });
      if (res.status === 402) {
        window.dispatchEvent(new CustomEvent("amynest:refresh-subscription"));
        window.dispatchEvent(new CustomEvent("amynest:open-paywall", { detail: { reason: "ai_quota" } }));
        return;
      }
      if (!res.ok) throw new Error(`Server ${res.status}`);
      window.dispatchEvent(new CustomEvent("amynest:refresh-subscription"));
      const data = (await res.json()) as { wins: Win[] };
      if (Array.isArray(data.wins) && data.wins.length > 0) {
        setPlan((p) => p ? { ...p, wins: [...p.wins, ...data.wins] } : p);
        toast({
          title: "3 new strategies added 💛",
          description: "Scroll to the end of your deck to see them.",
        });
        // Go to the very next card from where the user tapped — NOT the extension cards
        setTimeout(() => goToCard(nextIdx), 80);
      }
    } catch {
      toast({
        title: "Couldn't load extras",
        description: "Please tap 'Not worked for me' again in a moment.",
        variant: "destructive",
      });
    } finally {
      setExtending(false);
    }
  };

  // ─── Share / Save
  const handleShare = async () => {
    if (!plan) return;
    const text = `${plan.title}\n\n${plan.summary}\n\nMy ${plan.wins.length} wins from AmyNest Amy Coach:\n${plan.wins.map((w) => `${w.win}. ${w.title}`).join("\n")}`;
    if (navigator.share) {
      try { await navigator.share({ title: plan.title, text }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: "Plan copied to clipboard." });
      } catch {}
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
    originalWinCountRef.current = 0;
    setSessionId("");
    setActiveIdx(0);
    setFeedbackByWin({});
    lastPayloadRef.current = null;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER PHASES
  // ═══════════════════════════════════════════════════════════════════════

  // ── PHASE: GOALS ─────────────────────────────────────────────────────
  if (phase === "goals") {
    const activeCat = selectedCategoryId
      ? GOAL_CATEGORIES.find((c) => c.id === selectedCategoryId) ?? null
      : null;

    // ── Search mode: flat results across all categories ──────────────
    if (searchQuery) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Back
            </Link>
            <Link href="/amy-coach/progress">
              <button className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-200 hover:bg-violet-200 dark:bg-violet-500/25 transition-all">
                <BarChart3 className="h-3.5 w-3.5" /> My Progress
              </button>
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input autoFocus type="text" value={goalSearch} onChange={(e) => setGoalSearch(e.target.value)}
              placeholder="Search goals…"
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-border bg-card text-sm focus:outline-none focus:border-violet-400"
            />
          </div>
          <div className="space-y-6">
            {filteredCategories.map((cat) => (
              <section key={cat.id}>
                <h2 className="font-quicksand font-bold text-xs uppercase tracking-wide text-white/50 mb-2 flex items-center gap-1.5 px-1">
                  <span>{cat.emoji}</span> {cat.title}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cat.items.map((g) => (
                    <button key={g.id} onClick={() => handlePickGoal(g.id)}
                      className="relative rounded-2xl p-4 border border-white/10 text-left backdrop-blur-md hover:border-violet-400/50 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center gap-3 overflow-hidden"
                      style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.02) 100%)", boxShadow: "0 0 15px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.05)" }}
                    >
                      <span className="text-2xl shrink-0">{g.emoji}</span>
                      <div>
                        <p className="font-quicksand font-bold text-sm text-white leading-tight">{g.title}</p>
                        <p className="text-[11px] text-white/40 mt-0.5">Tap to start →</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {totalMatches === 0 && (
              <p className="text-center py-8 text-sm text-white/40">No goals match "{goalSearch}"</p>
            )}
          </div>
        </div>
      );
    }

    // ── Sub-goal view: goals inside selected category ─────────────────
    if (activeCat) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedCategoryId(null)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Categories
            </button>
            <Link href="/amy-coach/progress">
              <button className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-200 hover:bg-violet-200 dark:bg-violet-500/25 transition-all">
                <BarChart3 className="h-3.5 w-3.5" /> My Progress
              </button>
            </Link>
          </div>

          <div className="relative rounded-3xl overflow-hidden backdrop-blur-md border border-violet-400/25 p-4"
            style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.2) 0%,rgba(236,72,153,0.1) 100%)", boxShadow: "0 0 35px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.07)" }}>
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(139,92,246,0.3)" }} />
            <div className="flex items-center gap-3 relative">
              <span className="text-4xl">{activeCat.emoji}</span>
              <div>
                <h1 className="font-quicksand text-xl font-bold text-white">{activeCat.title}</h1>
                <p className="text-xs text-white/50">{activeCat.items.length} goals — pick one to start</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" value={goalSearch} onChange={(e) => setGoalSearch(e.target.value)}
              placeholder={`Search in ${activeCat.title}…`}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-border bg-card text-sm focus:outline-none focus:border-violet-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeCat.items.map((g) => (
              <button key={g.id} data-on-dark onClick={() => handlePickGoal(g.id)}
                className="relative rounded-2xl p-5 border border-violet-400/40 text-left backdrop-blur-md hover:border-violet-300/70 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center gap-4 overflow-hidden"
                style={{ background: "linear-gradient(135deg,rgba(76,29,149,0.85) 0%,rgba(124,58,237,0.78) 60%,rgba(190,24,93,0.72) 100%)", boxShadow: "0 6px 22px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.14)" }}
              >
                <span className="text-3xl shrink-0">{g.emoji}</span>
                <div className="flex-1">
                  <p className="font-quicksand font-bold text-base text-white leading-tight">{g.title}</p>
                  <p className="text-[11px] text-white/80 mt-1">Tap to start →</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // ── Category grid: default view ───────────────────────────────────
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
          <Link href="/amy-coach/progress">
            <button className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-200 hover:bg-violet-200 dark:bg-violet-500/25 transition-all">
              <BarChart3 className="h-3.5 w-3.5" /> My Progress
            </button>
          </Link>
        </div>

        {/* Premium hero panel */}
        <div data-on-dark className="relative rounded-3xl overflow-hidden backdrop-blur-md border border-violet-400/40 p-5"
          style={{ background: "linear-gradient(135deg,rgba(76,29,149,0.92) 0%,rgba(124,58,237,0.85) 50%,rgba(190,24,93,0.82) 100%)", boxShadow: "0 0 50px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.18)" }}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(139,92,246,0.55)" }} />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ background: "rgba(236,72,153,0.4)" }} />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#a78bfa,#f472b6)", boxShadow: "0 0 20px rgba(139,92,246,0.7)" }}>
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-quicksand text-2xl font-bold">
                <span className="text-violet-200">Amy</span>{" "}
                <span className="text-white">Co-Parent</span>{" "}
                <span className="text-pink-200">AI</span>
              </h1>
              <p className="text-xs text-white/85 mt-0.5">Choose a goal — I'll build your 12-step science plan.</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={goalSearch} onChange={(e) => setGoalSearch(e.target.value)}
            placeholder="Search all goals…"
            className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-border bg-card text-sm focus:outline-none focus:border-violet-400"
          />
        </div>

        {/* Audio Lessons entry card */}
        <button
          data-on-dark
          onClick={() => setLocation("/audio-lessons")}
          className="relative w-full rounded-3xl p-4 border border-violet-400/50 text-left backdrop-blur-md hover:border-violet-400/80 hover:scale-[1.01] active:scale-[0.98] transition-all overflow-hidden flex items-center gap-4"
          style={{
            background: "linear-gradient(135deg,rgba(76,29,149,0.88) 0%,rgba(190,24,93,0.78) 100%)",
            boxShadow: "0 0 24px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.14)",
          }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-2xl"
            style={{ background: "linear-gradient(135deg,#a78bfa,#f472b6)" }}>
            🎙️
          </div>
          <div className="flex-1">
            <p className="font-quicksand font-bold text-base text-white leading-tight">Amy Audio Lessons</p>
            <p className="text-[11.5px] text-white/85 mt-0.5">Hands full? Listen to age-curated parenting lessons (3–5 min each).</p>
          </div>
          <span className="text-violet-100 text-lg shrink-0">→</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          {GOAL_CATEGORIES.map((cat, i) => (
            <button key={cat.id} data-on-dark onClick={() => setSelectedCategoryId(cat.id)}
              className="relative rounded-3xl p-5 border border-violet-400/40 text-left backdrop-blur-md hover:border-violet-300/70 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 overflow-hidden"
              style={{
                background: "linear-gradient(135deg,rgba(76,29,149,0.85) 0%,rgba(124,58,237,0.78) 60%,rgba(190,24,93,0.75) 100%)",
                boxShadow: "0 6px 24px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.14)",
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-60 pointer-events-none" style={{ background: "rgba(236,72,153,0.45)" }} />
              <span className="text-4xl block mb-3 relative">{cat.emoji}</span>
              <p className="font-quicksand font-bold text-base text-white leading-tight relative">{cat.title}</p>
              <p className="text-[11px] text-white/80 mt-1 relative">{cat.items.length} goals →</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── PHASE: QUESTIONS ────────────────────────────────────────────────
  if (phase === "questions" && currentQ) {
    const ageSkipped = goalId ? !!GOAL_IMPLIED_AGE[goalId] : false;
    const visibleTotal = ageSkipped ? QUESTIONS.length - 1 : QUESTIONS.length;
    const visibleNum   = ageSkipped ? qIndex : qIndex + 1;
    const progressPct  = (visibleNum / visibleTotal) * 100;
    return (
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <button onClick={handleBackQ} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div
          data-on-dark
          className="relative rounded-3xl overflow-hidden backdrop-blur-md border border-violet-400/40 p-5 space-y-5"
          style={{ background: "linear-gradient(135deg,rgba(76,29,149,0.92) 0%,rgba(124,58,237,0.85) 50%,rgba(190,24,93,0.82) 100%)", boxShadow: "0 0 50px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.18)" }}
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(139,92,246,0.55)" }} />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ background: "rgba(236,72,153,0.4)" }} />

          <div className="relative">
            <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
              <span className="font-semibold">Question {visibleNum} of {visibleTotal}</span>
              <span>{selectedGoal?.title}</span>
            </div>
            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-300 to-pink-300 transition-all"
                style={{ width: `${progressPct}%`, boxShadow: "0 0 8px rgba(255,255,255,0.6)" }} />
            </div>
          </div>

          <div className="relative space-y-1">
            <h2 className="font-quicksand text-xl font-bold text-white">{currentQ.prompt}</h2>
            {currentQ.type === "multi" && (
              <p className="text-xs text-white/70">Pick any that apply</p>
            )}
          </div>

          <div className="relative space-y-2">
            {currentQ.options.map((opt) => {
              const selected = currentQ.type === "multi"
                ? ((answers[currentQ.id] as string[]) ?? []).includes(opt)
                : answers[currentQ.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleSelectOption(opt)}
                  className="w-full text-left px-4 py-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 backdrop-blur-sm"
                  style={selected
                    ? { background: "linear-gradient(135deg,rgba(255,255,255,0.28) 0%,rgba(255,255,255,0.15) 100%)", border: "1px solid rgba(255,255,255,0.7)", color: "#fff", boxShadow: "0 0 20px rgba(255,255,255,0.25)" }
                    : { background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff" }}
                >
                  <span className="font-semibold text-sm">{opt}</span>
                  {selected && <Check className="h-5 w-5 text-white shrink-0" />}
                </button>
              );
            })}
          </div>

          <button
            data-on-dark
            onClick={handleNextQ}
            disabled={!isAnswered}
            className="relative w-full py-4 rounded-2xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: "linear-gradient(135deg,#a78bfa,#f472b6)", boxShadow: isAnswered ? "0 0 30px rgba(255,255,255,0.45)" : "none" }}
          >
            {qIndex < QUESTIONS.length - 1 ? "Next →" : "Build My Plan ✨"}
          </button>
        </div>
      </div>
    );
  }

  // ── PHASE: INFANT PROBLEM DETAIL ─────────────────────────────────────
  if (phase === "infantProblem") {
    const problem = getInfantProblem(goalId);
    if (!problem) {
      // Safe fallback view — never triggers a state update during render.
      return (
        <div className="max-w-2xl mx-auto px-4 py-10 text-center space-y-4">
          <p className="text-sm text-white/70">This topic isn't available.</p>
          <button
            onClick={() => setPhase("goals")}
            className="text-sm font-bold px-4 py-2 rounded-full bg-violet-500/20 text-violet-100"
          >
            ← Back to topics
          </button>
        </div>
      );
    }
    const lang = (i18n?.language as string) || "en";
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPhase("goals")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            data-testid="button-infant-problem-back"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        </div>

        {/* Hero card */}
        <div
          className="relative rounded-3xl overflow-hidden backdrop-blur-md border border-pink-400/25 p-5"
          style={{
            background: "linear-gradient(135deg,rgba(244,114,182,0.22) 0%,rgba(251,146,60,0.12) 100%)",
            boxShadow: "0 0 35px rgba(236,72,153,0.25), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(236,72,153,0.3)" }} />
          <div className="flex items-center gap-3 relative">
            <span className="text-4xl">{problem.emoji}</span>
            <div>
              <h1 className="font-quicksand text-xl font-bold text-white">{pickInfLang(problem.title, lang)}</h1>
              <p className="text-xs text-white/60 mt-0.5">{pickInfLang(problem.description, lang)}</p>
            </div>
          </div>
        </div>

        {/* (A) Possible Reason */}
        <section
          className="rounded-2xl p-4 border border-white/10 backdrop-blur-md"
          style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%)" }}
        >
          <h2 className="font-quicksand text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
            🔍 Possible Reason
          </h2>
          <p className="text-sm text-white/85 leading-relaxed">{pickInfLang(problem.reason, lang)}</p>
        </section>

        {/* (B) What You Can Do */}
        <section
          className="rounded-2xl p-4 border border-white/10 backdrop-blur-md"
          style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%)" }}
        >
          <h2 className="font-quicksand text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
            ✅ What You Can Do
          </h2>
          <ol className="space-y-2.5">
            {problem.solution.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-pink-500/25 border border-pink-400/40 text-pink-100 text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-white/90 leading-relaxed">{pickInfLang(s, lang)}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* (C) Amy AI Insight */}
        <section
          className="rounded-2xl p-4 border border-violet-400/30 backdrop-blur-md"
          style={{
            background: "linear-gradient(135deg,rgba(139,92,246,0.22) 0%,rgba(236,72,153,0.12) 100%)",
            boxShadow: "0 0 22px rgba(139,92,246,0.18)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-violet-200" />
            <h2 className="font-quicksand text-xs font-bold uppercase tracking-wider text-violet-100">
              Amy AI Insight
            </h2>
          </div>
          <p className="text-sm text-white leading-relaxed italic">"{pickInfLang(problem.insight, lang)}"</p>
        </section>

        {/* (D) Reassurance */}
        <section className="rounded-2xl p-4 border border-pink-400/30 backdrop-blur-md flex items-start gap-3"
          style={{ background: "linear-gradient(135deg,rgba(244,114,182,0.18) 0%,rgba(251,146,60,0.08) 100%)" }}
        >
          <Heart className="h-5 w-5 text-pink-300 shrink-0 mt-0.5 fill-pink-400/40" />
          <div>
            <p className="text-sm text-white/95 font-medium leading-relaxed">{pickInfLang(problem.reassure, lang)}</p>
            <p className="text-[11px] text-white/50 mt-1">I'm here to help ❤️ — Amy</p>
          </div>
        </section>

        <p className="text-[11px] text-white/40 text-center pt-1">
          Guidance only — not a medical diagnosis. If concerns persist, consult your pediatrician.
        </p>
      </div>
    );
  }

  // ── PHASE: LOADING ───────────────────────────────────────────────────
  if (phase === "resuming") {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-violet-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center text-white px-8 space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <Loader2 className="absolute inset-0 w-20 h-20 animate-spin" />
          </div>
          <h2 className="font-quicksand text-2xl font-bold">Resuming your plan…</h2>
          <p className="text-sm text-white/80 max-w-xs mx-auto">
            Loading where you left off.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    const TOTAL_WINS = 12;
    const built = Math.max(0, Math.min(TOTAL_WINS, progressWinCount));
    const pct = Math.round((built / TOTAL_WINS) * 100);
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-violet-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center text-white px-8 space-y-6 w-full max-w-sm">
          <div className="relative w-20 h-20 mx-auto">
            <Sparkles className="absolute inset-0 w-20 h-20 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <h2 className="font-quicksand text-2xl font-bold">
            {built === 0
              ? t("coach.building_starting", "Building your plan…")
              : built >= TOTAL_WINS
              ? t("coach.building_finalising", "Finalising your plan…")
              : t("coach.building_progress", "Crafting win {{built}} of {{total}}…", { built, total: TOTAL_WINS })}
          </h2>
          {/* Progress bar — 12 segments, lights up as wins arrive */}
          <div className="flex gap-1 w-full" aria-hidden="true">
            {Array.from({ length: TOTAL_WINS }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${
                  i < built ? "bg-white" : "bg-white/20"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-white/80 max-w-xs mx-auto">
            {t(
              "coach.building_subtitle",
              "Analysing your answers and crafting 12 deep, research-backed wins for {{goal}}.",
              { goal: selectedGoal?.title.toLowerCase() ?? "your goal" },
            )}
            {built > 0 && built < TOTAL_WINS ? ` (${pct}%)` : ""}
          </p>
        </div>
      </div>
    );
  }

  // ── PHASE: RESULT ────────────────────────────────────────────────────
  if (phase === "result" && plan) {
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: "linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0c1220 100%)",
        zIndex: 50, display: "flex", flexDirection: "column",
      }}>
        {/* Top bar — dark glass */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
          padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(180deg, rgba(15,12,41,0.95) 0%, rgba(15,12,41,0) 100%)",
          backdropFilter: "blur(8px)",
        }}>
          <button
            onClick={handleStartOver}
            style={{ color: "#6d28d9", background: "rgba(167,139,250,0.15)", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Progress % pill (TOP-RIGHT) */}
          <div data-on-dark style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
            color: "#fff", padding: "7px 14px", borderRadius: 999,
            fontSize: 12, fontWeight: 800, letterSpacing: 0.3,
            boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
          }}>
            Progress {progressPct}%
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handlePrintPlan}
              style={{ color: "#6d28d9", background: "rgba(167,139,250,0.15)", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
              aria-label="Print or save as PDF"
              title="Print / Save as PDF"
            >
              <Printer size={16} />
            </button>
            <button
              onClick={handleShare}
              style={{ color: "#6d28d9", background: "rgba(167,139,250,0.15)", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
              aria-label="Share"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => setLocation("/amy-coach/progress")}
              style={{ color: "#6d28d9", background: "rgba(167,139,250,0.15)", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
              aria-label="Progress"
            >
              <BarChart3 size={16} />
            </button>
          </div>
        </div>

        {/* Hidden print-only render — full plan in a clean A4 layout */}
        <PrintablePlan plan={plan} />

        {/* Progress dots */}
        <div style={{
          position: "absolute", top: 60, left: 16, right: 16, zIndex: 20,
          display: "flex", gap: 4,
        }}>
          {plan.wins.map((_, i) => (
            <button
              key={i}
              onClick={() => goToCard(i)}
              style={{
                flex: 1, height: 3, borderRadius: 2, border: "none", cursor: "pointer", padding: 0,
                background: i <= activeIdx ? "#8b5cf6" : "rgba(139,92,246,0.2)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* Scroller */}
        <div
          ref={scrollerRef}
          style={{
            display: "flex", overflowX: "auto", scrollSnapType: "x mandatory",
            width: "100%", flex: "1 1 0", minHeight: 0,
            scrollbarWidth: "none",
          }}
          className="ws-no-scrollbar"
        >
          {plan.wins.map((w, i) => (
            <WinCard
              key={`${w.win}-${i}`}
              win={w}
              total={plan.wins.length}
              isFirst={i === 0}
              planTitle={i === 0 ? plan.title : undefined}
              planSummary={i === 0 ? plan.summary : undefined}
              planRootCause={i === 0 ? plan.root_cause : undefined}
              currentFeedback={feedbackByWin[w.win]}
              extending={extending}
              onFeedback={(f) => submitFeedback(w.win, f)}
            />
          ))}
        </div>

        {/* Extending banner */}
        {extending && (
          <div style={{
            position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
            background: "rgba(99,102,241,0.95)", color: "#fff",
            padding: "10px 18px", borderRadius: 999, fontSize: 12.5, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
            zIndex: 25,
          }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            Loading 3 new strategies for you…
          </div>
        )}

        {/* Bottom nav */}
        {(() => {
          const currentWin = plan.wins[activeIdx];
          const hasFeedback = currentWin ? !!feedbackByWin[currentWin.win] : false;
          const atLastLoaded = activeIdx >= plan.wins.length - 1;
          // While streaming, "last loaded" doesn't mean "last in plan" — the
          // next win is still on its way, so we show a generating hint.
          const waitingForNext = atLastLoaded && isStreaming;
          // Next is disabled when (a) we're at the genuine last card, OR
          // (b) the next streamed win hasn't arrived yet, OR (c) the parent
          // hasn't selected feedback for the visible card yet.
          const nextDisabled = atLastLoaded || !hasFeedback;
          return (
            <div style={{
              flexShrink: 0, width: "100%", zIndex: 20,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "10px 16px 14px",
              background: "linear-gradient(0deg, rgba(13,10,30,0.98) 0%, rgba(13,10,30,0.85) 100%)",
              backdropFilter: "blur(12px)",
            }}>
              {!hasFeedback && !atLastLoaded && (
                <div style={{
                  fontSize: 11.5, fontWeight: 700, color: "#fbbf24",
                  background: "rgba(251,191,36,0.12)",
                  border: "1px solid rgba(251,191,36,0.35)",
                  padding: "5px 12px", borderRadius: 999,
                  letterSpacing: 0.2,
                }}>
                  Pick Worked / Partially / Not for me to continue
                </div>
              )}
              {waitingForNext && hasFeedback && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11.5, fontWeight: 700, color: "#c4b5fd",
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.35)",
                  padding: "5px 12px", borderRadius: 999,
                }}>
                  <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                  Generating next strategy…
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                <button
                  onClick={() => goToCard(Math.max(0, activeIdx - 1))}
                  disabled={activeIdx === 0}
                  style={{
                    color: "#c4b5fd",
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 0 15px rgba(139,92,246,0.15)",
                    borderRadius: 999, padding: "10px 16px", border: "1px solid rgba(139,92,246,0.3)",
                    cursor: activeIdx === 0 ? "default" : "pointer", opacity: activeIdx === 0 ? 0.4 : 1,
                    display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
                  }}
                >
                  <ArrowLeft size={14} /> Prev
                </button>
                <button
                  data-on-dark
                  onClick={() => goToCard(Math.min(plan.wins.length - 1, activeIdx + 1))}
                  disabled={nextDisabled}
                  title={
                    !hasFeedback
                      ? "Mark how this win went before moving on"
                      : waitingForNext
                      ? "Generating next strategy…"
                      : undefined
                  }
                  style={{
                    color: "#fff",
                    background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                    boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                    borderRadius: 999, padding: "10px 16px", border: "none",
                    cursor: nextDisabled ? "not-allowed" : "pointer",
                    opacity: nextDisabled ? 0.4 : 1,
                    display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700,
                  }}
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// WIN CARD — light gradient, no images, science reference, adaptive buttons
// ═══════════════════════════════════════════════════════════════════════════
function WinCard({
  win, total, isFirst, planTitle, planSummary, planRootCause,
  currentFeedback, extending, onFeedback,
}: {
  win: Win;
  total: number;
  isFirst: boolean;
  planTitle?: string;
  planSummary?: string;
  planRootCause?: string;
  currentFeedback?: Feedback;
  extending: boolean;
  onFeedback: (f: Feedback) => void;
}) {
  const isExtension = win.win > 12;

  return (
    <div
      style={{
        flex: "0 0 100%", width: "100%", height: "100%",
        scrollSnapAlign: "start", position: "relative",
        background: isExtension
          ? "linear-gradient(135deg, #1a0f2e 0%, #2d1b4e 50%, #1a1040 100%)"
          : "linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0c1220 100%)",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow orbs */}
      <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: isExtension ? "rgba(245,158,11,0.15)" : "rgba(139,92,246,0.2)", filter: "blur(60px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 80, left: -40, width: 160, height: 160, borderRadius: "50%", background: isExtension ? "rgba(236,72,153,0.12)" : "rgba(236,72,153,0.15)", filter: "blur(50px)", pointerEvents: "none" }} />

      {/* Scrollable content — full card */}
      <div style={{
        position: "absolute", inset: 0,
        padding: "92px 22px 130px",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        color: "#f8f8ff",
      }}>
        {/* Win counter chip */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: isExtension
            ? "linear-gradient(135deg, #f59e0b, #ec4899)"
            : "linear-gradient(135deg, #8b5cf6, #ec4899)",
          color: "#fff",
          padding: "5px 12px", borderRadius: 999,
          fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
          marginBottom: 10,
          boxShadow: "0 2px 8px rgba(139,92,246,0.25)",
        }}>
          {isExtension ? "💛 EXTRA STRATEGY" : "WIN"} {win.win} / {total}
        </div>

        {/* Plan header — only on first card */}
        {isFirst && planTitle && (
          <div style={{
            marginBottom: 18, paddingBottom: 16,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: "#a78bfa", marginBottom: 4 }}>
              YOUR PLAN
            </p>
            <h2 style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.2, marginBottom: 8, fontFamily: "Quicksand, sans-serif", color: "#fff" }}>
              {planTitle}
            </h2>
            {planRootCause && (
              <div style={{
                background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.25)",
                borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 8,
              }}>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#f9a8d4", marginBottom: 4 }}>
                  🧠 ROOT CAUSE
                </p>
                <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "rgba(255,255,255,0.75)" }}>{planRootCause}</p>
              </div>
            )}
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
              {planSummary}
            </p>
          </div>
        )}

        {/* Title + objective */}
        <h3 style={{
          fontSize: 24, fontWeight: 800, lineHeight: 1.15,
          marginBottom: 6, fontFamily: "Quicksand, sans-serif",
          color: "#fff",
        }}>
          {win.title}
        </h3>
        <p style={{
          fontSize: 13.5, color: "#c4b5fd",
          marginBottom: 16, lineHeight: 1.4, fontWeight: 600,
        }}>
          {win.objective}
        </p>

        {/* WHY THIS WORKS */}
        {win.deep_explanation && (
          <div style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: 14, padding: 14, marginBottom: 14,
            boxShadow: "0 0 20px rgba(99,102,241,0.1)",
          }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#a5b4fc", marginBottom: 6 }}>
              🔬 WHY THIS WORKS
            </p>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,0.8)" }}>
              {win.deep_explanation}
            </p>
          </div>
        )}

        {/* DO THIS */}
        <div style={{
          background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)",
          borderRadius: 14, padding: 14, marginBottom: 14,
          boxShadow: "0 0 20px rgba(139,92,246,0.15)",
        }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#c4b5fd", marginBottom: 10 }}>
            ✅ DO THIS
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
            {win.actions.map((a, i) => (
              <li key={i} style={{ fontSize: 13.5, lineHeight: 1.5, display: "flex", gap: 10, color: "rgba(255,255,255,0.85)" }}>
                <span style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: 999,
                  background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                  color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, marginTop: 1,
                }}>{i + 1}</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* REAL EXAMPLE */}
        {win.example && (
          <div style={{
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 14, padding: 12, marginBottom: 12,
          }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#86efac", marginBottom: 4 }}>
              💬 REAL EXAMPLE
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.75)", fontStyle: "italic" }}>
              {win.example}
            </p>
          </div>
        )}

        {/* MISTAKE TO AVOID */}
        {win.mistake_to_avoid && (
          <div style={{
            background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: 14, padding: 12, marginBottom: 12,
          }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#fca5a5", marginBottom: 4 }}>
              ⚠️ MISTAKE TO AVOID
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.75)" }}>
              {win.mistake_to_avoid}
            </p>
          </div>
        )}

        {/* MICRO-TASK */}
        {win.micro_task && (
          <div style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))",
            border: "1px solid rgba(167,139,250,0.4)",
            borderRadius: 14, padding: 14, marginBottom: 12,
            boxShadow: "0 0 20px rgba(139,92,246,0.2)",
          }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#c4b5fd", marginBottom: 4 }}>
              🎯 DO THIS TODAY (under 5 min)
            </p>
            <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#fff", fontWeight: 600 }}>
              {win.micro_task}
            </p>
          </div>
        )}

        {/* DURATION + LISTEN (Amy reads this win aloud) */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 999,
            background: "rgba(139,92,246,0.2)", color: "#c4b5fd", fontWeight: 700,
            border: "1px solid rgba(139,92,246,0.3)",
          }}>
            ⏱ {win.duration}
          </span>
          <ListenButton win={win} />
        </div>

        {win.science_reference && (
          <p style={{
            fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5,
            marginBottom: 14, fontStyle: "italic",
            paddingLeft: 10, borderLeft: "2px solid rgba(139,92,246,0.4)",
          }}>
            📚 Based on: {win.science_reference}
          </p>
        )}

        {/* Mark-as-done feedback */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: 14, marginBottom: 8,
          boxShadow: "0 0 20px rgba(139,92,246,0.1)",
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
            How did this win go?
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            {([
              { v: "yes" as const,      label: "Worked",            color: "#15803d", bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.45)" },
              { v: "somewhat" as const, label: "Partially worked",  color: "#a16207", bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.45)" },
              { v: "no" as const,       label: "Not worked for me", color: "#b91c1c", bg: "rgba(248,113,113,0.12)",border: "rgba(248,113,113,0.4)" },
            ]).map((b) => {
              const selected = currentFeedback === b.v;
              return (
                <button
                  key={b.v}
                  onClick={() => onFeedback(b.v)}
                  disabled={extending}
                  style={{
                    flex: 1, padding: "10px 4px", borderRadius: 10,
                    border: `1.5px solid ${selected ? b.color : b.border}`,
                    background: selected ? b.color : b.bg,
                    color: selected ? "#fff" : b.color,
                    fontSize: 11.5, fontWeight: 700,
                    cursor: extending ? "wait" : "pointer",
                    opacity: extending ? 0.7 : 1,
                    transition: "all 0.18s",
                    lineHeight: 1.2,
                  }}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* "Not worked for me" → 3 new strategies are appended automatically */}
        {currentFeedback === "no" && (
          <div style={{
            background: "rgba(254,243,199,0.7)", border: "1px solid rgba(245,158,11,0.4)",
            borderRadius: 14, padding: 14, marginTop: 10,
          }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#92400e", marginBottom: 6 }}>
              💛 EXTRA SUPPORT ADDED
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#78350f" }}>
              I've added 3 fresh strategies at the end of your plan — different angles to try:
              shrink the step, check a hidden blocker, or flip the approach. Tap <strong>Next</strong> to reach them.
            </p>
          </div>
        )}

        {(currentFeedback === "yes" || currentFeedback === "somewhat") && (
          <div style={{
            background: "rgba(220,252,231,0.6)", border: "1px solid rgba(34,197,94,0.4)",
            borderRadius: 12, padding: 10, marginTop: 8,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>{currentFeedback === "yes" ? "🎉" : "💜"}</span>
            <p style={{ fontSize: 12.5, color: "#14532d", fontWeight: 600, margin: 0 }}>
              {currentFeedback === "yes"
                ? "Logged as a full win. Swipe to the next step."
                : "Partial progress counted. Keep going — small wins compound."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LISTEN BUTTON — speaks the win aloud using Amy's ElevenLabs voice.
// ═══════════════════════════════════════════════════════════════════════════
function ListenButton({ win }: { win: Win }) {
  const { speak, stop, speaking, loading } = useAmyVoice();

  const buildText = useCallback(() => {
    return [
      `Win ${win.win}. ${win.title}.`,
      win.objective,
      win.deep_explanation,
      win.actions?.length ? `Steps to take: ${win.actions.join(". ")}` : "",
      win.example ? `For example. ${win.example}` : "",
      win.mistake_to_avoid ? `Mistake to avoid: ${win.mistake_to_avoid}.` : "",
      win.micro_task ? `Tiny task for today: ${win.micro_task}.` : "",
    ].filter(Boolean).join(" ");
  }, [win]);

  const handleClick = () => {
    if (speaking || loading) { stop(); return; }
    speak(buildText());
  };

  return (
    <button
      onClick={handleClick}
      style={{
        fontSize: 11, padding: "4px 10px", borderRadius: 999,
        background: (speaking || loading) ? "rgba(236,72,153,0.25)" : "rgba(34,197,94,0.18)",
        color: (speaking || loading) ? "#fbcfe8" : "#86efac",
        fontWeight: 700,
        border: (speaking || loading) ? "1px solid rgba(236,72,153,0.4)" : "1px solid rgba(34,197,94,0.35)",
        display: "inline-flex", alignItems: "center", gap: 5,
        cursor: "pointer",
      }}
      aria-label={(speaking || loading) ? "Stop listening" : "Listen to this win"}
      title={(speaking || loading) ? "Stop" : "Amy reads this aloud"}
    >
      {(speaking || loading) ? <VolumeX size={12} /> : <Volume2 size={12} />}
      {speaking ? "Stop" : loading ? "…" : "Listen"}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRINTABLE PLAN — A clean, paper-friendly render of the entire 12-win plan.
// Hidden on screen via the .ws-print-only class; revealed when window.print()
// is invoked. The accompanying CSS in src/index.css hides everything else.
// ═══════════════════════════════════════════════════════════════════════════
function PrintablePlan({ plan }: { plan: Plan }) {
  return (
    <div className="ws-print-only" aria-hidden="true">
      <div style={{ padding: 24, color: "#111", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <div style={{ borderBottom: "2px solid #6d28d9", paddingBottom: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: "#6d28d9", margin: 0, letterSpacing: 1, fontWeight: 700 }}>
            AMYNEST · AMY COACH · 12-WIN PLAN
          </p>
          <h1 style={{ fontSize: 22, margin: "6px 0 4px", color: "#111" }}>{plan.title}</h1>
          {plan.root_cause && (
            <p style={{ fontSize: 12, color: "#444", margin: "8px 0 0", lineHeight: 1.55 }}>
              <strong>Root cause:</strong> {plan.root_cause}
            </p>
          )}
          {plan.summary && (
            <p style={{ fontSize: 12, color: "#444", margin: "6px 0 0", lineHeight: 1.55 }}>
              <strong>Summary:</strong> {plan.summary}
            </p>
          )}
        </div>

        {plan.wins.map((w) => (
          <section key={w.win} style={{
            pageBreakInside: "avoid",
            borderLeft: "3px solid #8b5cf6",
            padding: "10px 14px",
            marginBottom: 14,
            background: "#fafafa",
          }}>
            <h2 style={{ fontSize: 14, margin: "0 0 4px", color: "#1f1147" }}>
              Win {w.win}: {w.title}
            </h2>
            <p style={{ fontSize: 11, fontStyle: "italic", color: "#555", margin: "0 0 8px" }}>
              {w.objective}
            </p>
            <p style={{ fontSize: 11, color: "#222", lineHeight: 1.55, margin: "0 0 8px" }}>
              {w.deep_explanation}
            </p>
            {w.actions?.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, margin: "6px 0 4px", color: "#1f1147" }}>Actions:</p>
                <ol style={{ fontSize: 11, color: "#222", margin: "0 0 6px 18px", paddingLeft: 0, lineHeight: 1.5 }}>
                  {w.actions.map((a, i) => <li key={i} style={{ marginBottom: 2 }}>{a}</li>)}
                </ol>
              </>
            )}
            {w.example && (
              <p style={{ fontSize: 11, color: "#222", margin: "6px 0", lineHeight: 1.5 }}>
                <strong>Example:</strong> {w.example}
              </p>
            )}
            {w.mistake_to_avoid && (
              <p style={{ fontSize: 11, color: "#7f1d1d", margin: "6px 0", lineHeight: 1.5 }}>
                <strong>Avoid:</strong> {w.mistake_to_avoid}
              </p>
            )}
            {w.micro_task && (
              <p style={{ fontSize: 11, color: "#065f46", margin: "6px 0", lineHeight: 1.5 }}>
                <strong>Today's micro-task:</strong> {w.micro_task}
              </p>
            )}
            <p style={{ fontSize: 10, color: "#666", margin: "6px 0 0" }}>
              ⏱ {w.duration} {w.science_reference ? ` · 📚 ${w.science_reference}` : ""}
            </p>
          </section>
        ))}

        <p style={{ fontSize: 10, color: "#666", marginTop: 16, textAlign: "center", borderTop: "1px solid #ddd", paddingTop: 8 }}>
          Generated by AmyNest · Amy Coach. Guidance only — not a medical diagnosis.
        </p>
      </div>
    </div>
  );
}
