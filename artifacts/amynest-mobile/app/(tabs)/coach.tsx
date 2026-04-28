import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { ProfileLockScreen } from "@/components/ProfileLockScreen";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, FlatList, TextInput, Share,
  useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTheme } from "@/contexts/ThemeContext";
import { paletteFor } from "@/lib/theme";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import AiQuotaBanner from "@/components/AiQuotaBanner";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useSectionUsage } from "@/hooks/useSectionUsage";
import { useTranslation } from "react-i18next";
import colors, { brand, brandAlpha } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import {
  INFANT_PROBLEMS,
  isInfantProblemId,
  getInfantProblem,
  pickLang as pickInfLang,
} from "@workspace/infant-problems";

// ─── Types ─────────────────────────────────────────────────────────────────
interface GoalItem { id: string; title: string; emoji: string; bg: [string, string] }
interface GoalCategory { id: string; title: string; emoji: string; bg: [string, string]; items: GoalItem[] }
interface Win {
  win: number; title: string; objective: string; deep_explanation: string;
  actions: string[]; example: string; mistake_to_avoid: string;
  micro_task: string; duration: string; science_reference: string;
}
interface Plan { title: string; root_cause: string; summary: string; wins: Win[] }
type Phase = "goals" | "questions" | "loading" | "result" | "infantProblem" | "resuming";
type Feedback = "yes" | "somewhat" | "no";
type Question = {
  id: "ageGroup" | "severity" | "triggers" | "routine" | "goalRefinement";
  prompt: string; type: "single" | "multi"; options: string[];
};

// ─── Goals (categorized) — mirrors web ────────────────────────────────────
// audit-block-ignore-start: category gradient bg arrays — semantic pastel swatches, no theme tokens available
function getGoalCategories(infoBg: string): GoalCategory[] {
  return [
    {
      id: "behavior", title: "Behavior", emoji: "🎯", bg: ["#FFE4E6", "#FED7AA"],
      items: [
        { id: "manage-tantrums",      title: "Manage Tantrums",      emoji: "😤", bg: ["#FFE4E6", "#FBCFE8"] },
        { id: "handle-aggression",    title: "Handle Aggression",    emoji: "✋", bg: ["#FEE2E2", "#FECACA"] },
        { id: "reduce-defiance",      title: "Reduce Defiance",      emoji: "🛑", bg: ["#FEF3C7", "#FED7AA"] },
        { id: "emotional-regulation", title: "Emotional Regulation", emoji: "💗", bg: ["#FCE7F3", "#FBCFE8"] },
        { id: "separation-anxiety",   title: "Separation Anxiety",   emoji: "🫂", bg: [brand.violet100, brand.violet200] },
      ],
    },
    {
      id: "screen-focus", title: "Screen & Focus", emoji: "📱", bg: ["#E0F2FE", "#C7D2FE"],
      items: [
        { id: "balance-screen-time",          title: "Balance Screen Time",        emoji: "📱", bg: ["#E0F2FE", "#BFDBFE"] },
        { id: "reduce-mobile-addiction",      title: "Reduce Mobile Addiction",    emoji: "📵", bg: [infoBg, "#C7D2FE"] },
        { id: "improve-focus-span",           title: "Improve Focus Span",         emoji: "🎯", bg: [brand.violet100, "#FBCFE8"] },
        { id: "reduce-shorts-overuse",        title: "Reduce Shorts Overuse",      emoji: "🎬", bg: ["#FFE4E6", "#FECACA"] },
        { id: "reduce-instant-gratification", title: "Reduce Instant Gratification",emoji: "⏳", bg: ["#FEF3C7", "#FDE68A"] },
      ],
    },
    {
      id: "eating", title: "Eating", emoji: "🍽️", bg: ["#D1FAE5", "#CCFBF1"],
      items: [
        { id: "encourage-independent-eating", title: "Independent Eating",  emoji: "🥄", bg: ["#D1FAE5", "#BBF7D0"] },
        { id: "navigate-fussy-eating",        title: "Navigate Fussy Eating",emoji: "🥦", bg: ["#CCFBF1", "#A7F3D0"] },
        { id: "stop-junk-food-craving",       title: "Stop Junk Cravings",  emoji: "🍟", bg: ["#FED7AA", "#FDE68A"] },
        { id: "healthy-eating-routine",       title: "Healthy Eating",      emoji: "🍎", bg: ["#BBF7D0", "#D1FAE5"] },
        { id: "improve-mealtime-behavior",    title: "Mealtime Behavior",   emoji: "🍽️", bg: ["#ECFCCB", "#BBF7D0"] },
      ],
    },
    {
      id: "sleep", title: "Sleep", emoji: "😴", bg: [brand.indigo100, brand.violet100],
      items: [
        { id: "improve-sleep-patterns",   title: "Improve Sleep",        emoji: "😴", bg: [brand.indigo100, brand.violet200] },
        { id: "fix-bedtime-resistance",   title: "Bedtime Resistance",   emoji: "🛏️", bg: [brand.violet100, brand.indigo100] },
        { id: "stop-night-waking",        title: "Stop Night Waking",    emoji: "🌙", bg: [infoBg, brand.indigo100] },
        { id: "consistent-sleep-routine", title: "Consistent Routine",   emoji: "🕘", bg: [brand.violet100, brand.violet200] },
        { id: "reduce-late-sleeping",     title: "Reduce Late Sleep",    emoji: "⏰", bg: [brand.indigo100, infoBg] },
      ],
    },
    {
      id: "learning", title: "Learning", emoji: "📚", bg: [brand.violet100, "#FCE7F3"],
      items: [
        { id: "boost-concentration",        title: "Boost Concentration",  emoji: "🎯", bg: [brand.violet100, "#FBCFE8"] },
        { id: "build-study-discipline",     title: "Study Discipline",     emoji: "📖", bg: [infoBg, "#BFDBFE"] },
        { id: "increase-learning-interest", title: "Learning Interest",    emoji: "💡", bg: ["#FEF3C7", "#FDE68A"] },
        { id: "reduce-homework-resistance", title: "Homework Resistance",  emoji: "✏️", bg: ["#CCFBF1", "#A7F3D0"] },
        { id: "develop-growth-mindset",     title: "Growth Mindset",       emoji: "🌱", bg: ["#BBF7D0", "#ECFCCB"] },
      ],
    },
    {
      id: "infant-problems", title: "Infant Problems (0–2 yrs)", emoji: "👶", bg: ["#FCE7F3", "#FED7AA"],
      items: INFANT_PROBLEMS.map((p) => ({
        id: p.id,
        title: p.title.en,
        emoji: p.emoji,
        bg: ["#FCE7F3", "#FED7AA"] as [string, string],
      })),
    },
    {
      id: "parenting-challenges", title: "Parenting", emoji: "💝", bg: ["#FEF3C7", "#FED7AA"],
      items: [
        { id: "manage-grandparents-interference", title: "Grandparents",         emoji: "👵", bg: ["#FFE4E6", "#FBCFE8"] },
        { id: "align-parenting-between-parents",  title: "Align Co-Parenting",   emoji: "🤝", bg: [brand.violet100, brand.violet200] },
        { id: "handle-working-parent-guilt",      title: "Working Parent Guilt", emoji: "💼", bg: ["#E0F2FE", "#BFDBFE"] },
        { id: "set-consistent-family-rules",      title: "Family Rules",         emoji: "📋", bg: ["#FEF3C7", "#FED7AA"] },
      ],
    },
  ];
}
// audit-block-ignore-end

const COMMON_TRIGGERS = [
  "Hunger or tiredness", "Transitions or changes", "Being told 'no'", "Boredom",
  "Sibling conflict", "School/social stress", "Inconsistent rules", "Sensory overload",
];
const QUESTIONS: Question[] = [
  { id: "ageGroup",       prompt: "What's your child's age?",          type: "single", options: ["2–4 years", "5–7 years", "8–10 years"] },
  { id: "severity",       prompt: "How challenging is it right now?",  type: "single", options: ["Mild – occasional", "Moderate – frequent", "Severe – daily struggle"] },
  { id: "triggers",       prompt: "What triggers it most? (pick any)", type: "multi",  options: COMMON_TRIGGERS },
  { id: "routine",        prompt: "What's your current approach?",     type: "single", options: ["No clear routine yet", "I try but it's inconsistent", "Strict rules, lots of pushback", "Trying gentle parenting", "Just starting to figure it out"] },
  { id: "goalRefinement", prompt: "What matters most to you?",         type: "single", options: ["Reduce frequency", "Stay calm myself", "Build my child's skills", "Long-term healthy pattern"] },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const authFetch = useAuthFetch();
  const c = useColors();
  const { mode } = useTheme();
  const theme = paletteFor(mode);
  const GOAL_CATEGORIES = useMemo(() => getGoalCategories(c.statusInfoBg), [c.statusInfoBg]);
  const ALL_GOALS = useMemo(() => GOAL_CATEGORIES.flatMap((cat) => cat.items), [GOAL_CATEGORIES]);
  const { profileComplete, isLoading: profileLoading } = useProfileComplete();
  const { width } = useWindowDimensions();

  const params = useLocalSearchParams<{ resume?: string }>();
  const resumeSessionId = typeof params.resume === "string" ? params.resume : "";
  const [phase, setPhase] = useState<Phase>(resumeSessionId ? "resuming" : "goals");
  const [goalSearch, setGoalSearch] = useState("");
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string>("");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [feedbackByWin, setFeedbackByWin] = useState<Record<number, Feedback>>({});
  const [extending, setExtending] = useState(false);

  const scrollerRef = useRef<FlatList<Win>>(null);
  const lastPayloadRef = useRef<{ goal: string; ageGroup: string; severity: string; triggers: string[]; routine: string; } | null>(null);
  const originalWinCountRef = useRef<number>(0);

  const searchQuery = goalSearch.toLowerCase().trim();
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return GOAL_CATEGORIES;
    return GOAL_CATEGORIES
      .map((c) => ({ ...c, items: c.items.filter((g) => g.title.toLowerCase().includes(searchQuery)) }))
      .filter((c) => c.items.length > 0);
  }, [searchQuery]);
  const totalMatches = filteredCategories.reduce((n, c) => n + c.items.length, 0);
  const selectedGoal = ALL_GOALS.find((g) => g.id === goalId);

  const progressPct = useMemo(() => {
    const denom = originalWinCountRef.current;
    if (!plan || denom === 0) return 0;
    const sum = Object.values(feedbackByWin).reduce(
      (acc, f) => acc + (f === "yes" ? 1 : f === "somewhat" ? 0.5 : 0), 0,
    );
    return Math.min(100, Math.round((sum / denom) * 100));
  }, [feedbackByWin, plan]);

  const { i18n } = useTranslation();

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
          inputs: { goal: string; ageGroup: string; severity: string; triggers: string[]; routine: string; language?: string };
          feedbacks: Record<string, string>;
        };
        if (cancelled) return;

        const restoredFeedbacks: Record<number, Feedback> = {};
        for (const [k, v] of Object.entries(data.feedbacks)) {
          restoredFeedbacks[Number(k)] = v as Feedback;
        }

        setPlan(data.plan);
        setSessionId(data.sessionId);
        setGoalId(data.goalId);
        setFeedbackByWin(restoredFeedbacks);
        originalWinCountRef.current = data.plan.wins.length;

        lastPayloadRef.current = {
          goal: data.inputs.goal,
          ageGroup: data.inputs.ageGroup,
          severity: data.inputs.severity,
          triggers: data.inputs.triggers ?? [],
          routine: data.inputs.routine,
        };

        const firstIncomplete = data.plan.wins.findIndex((w) => !restoredFeedbacks[w.win]);
        setActiveIdx(firstIncomplete >= 0 ? firstIncomplete : data.plan.wins.length - 1);
        setPhase("result");
      } catch {
        if (cancelled) return;
        setPhase("goals");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSessionId]);

  // Free-tier gate: parents may COMPLETE exactly ONE coach topic for free.
  // The free allowance is consumed only when a topic plan is successfully
  // shown (in submitPlan / infant-problem static plan). Picking a goal that
  // they don't finish must NOT burn the allowance.
  const coachUsage = useSectionUsage("amy_coach");

  // ─── Goal pick → questions (or → Infant Problem detail for the 0–2 yr topic)
  const handlePickGoal = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Pessimistically block taps until persisted usage has loaded — prevents
    // an exhausted free user from sneaking through during the async hydrate
    // window on cold render or account switch.
    if (!coachUsage.isPremium && !coachUsage.loaded) {
      return;
    }
    // Block any new pick once a free topic has been completed.
    if (!coachUsage.isPremium && coachUsage.fullyUsed) {
      router.push({ pathname: "/paywall", params: { reason: "coach_locked" } });
      return;
    }
    setGoalId(id);
    if (isInfantProblemId(id)) {
      // Infant problem flow renders a static plan immediately on next screen —
      // counts as a completion for free-quota purposes.
      if (!coachUsage.isPremium) coachUsage.markBlockUsed("completed");
      setPhase("infantProblem");
      return;
    }
    setQIndex(0); setAnswers({}); setPhase("questions");
  };

  const currentQ = QUESTIONS[qIndex];
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;
  const isAnswered = currentQ?.type === "multi"
    ? Array.isArray(currentAnswer) && currentAnswer.length > 0
    : typeof currentAnswer === "string" && currentAnswer.length > 0;

  const handleSelectOption = (opt: string) => {
    if (!currentQ) return;
    Haptics.selectionAsync();
    if (currentQ.type === "single") {
      setAnswers((a) => ({ ...a, [currentQ.id]: opt }));
    } else {
      const cur = (answers[currentQ.id] as string[]) ?? [];
      const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
      setAnswers((a) => ({ ...a, [currentQ.id]: next }));
    }
  };

  const handleNextQ = () => {
    if (qIndex < QUESTIONS.length - 1) setQIndex((i) => i + 1);
    else submitPlan();
  };
  const handleBackQ = () => {
    if (qIndex > 0) setQIndex((i) => i - 1);
    else setPhase("goals");
  };

  // ─── Submit
  const submitPlan = async () => {
    setPhase("loading");
    setActiveIdx(0); setFeedbackByWin({});
    const ageMap: Record<string, string> = { "2–4 years": "2-4", "5–7 years": "5-7", "8–10 years": "8-10" };
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
      goal: payload.goal, ageGroup: payload.ageGroup, severity: payload.severity,
      triggers: payload.triggers, routine: payload.routine,
    };
    try {
      const { default: i18nInstance } = await import("@/i18n");
      const res = await authFetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, language: i18nInstance.language || "en" }),
      });
      if (res.status === 402) {
        await useSubscriptionStore.getState().refresh();
        setPhase("questions");
        router.push({ pathname: "/paywall", params: { reason: "ai_quota" } });
        return;
      }
      if (!res.ok) throw new Error(`Server ${res.status}`);
      void useSubscriptionStore.getState().refresh();
      const data = (await res.json()) as { plan: Plan; sessionId: string };
      setPlan(data.plan);
      originalWinCountRef.current = data.plan.wins.length;
      setSessionId(data.sessionId);
      setPhase("result");
      // Free allowance is consumed only on a successful topic completion.
      if (!coachUsage.isPremium) coachUsage.markBlockUsed("completed");
    } catch {
      setPhase("questions");
    }
  };

  const goToCard = useCallback((i: number) => {
    scrollerRef.current?.scrollToIndex({ index: i, animated: true });
    setActiveIdx(i);
  }, []);

  const onScrollerMomentum = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  // ─── Feedback
  const submitFeedback = async (winNumber: number, feedback: Feedback) => {
    if (!plan || !sessionId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newMap = { ...feedbackByWin, [winNumber]: feedback };
    setFeedbackByWin(newMap);
    try {
      await authFetch("/api/ai-coach/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId, goalId, planTitle: plan.title,
          winNumber, totalWins: plan.wins.length, feedback,
        }),
      });
    } catch { /* silent */ }
    const newSum = Object.values(newMap).reduce(
      (acc, f) => acc + (f === "yes" ? 1 : f === "somewhat" ? 0.5 : 0), 0,
    );
    const denom = originalWinCountRef.current || plan.wins.length;
    const newPct = Math.min(100, Math.round((newSum / denom) * 100));
    const isLastCard = activeIdx === plan.wins.length - 1;
    if (newPct < 100 && (feedback === "no" || isLastCard)) {
      await requestExtension(winNumber);
    } else {
      setTimeout(() => goToCard(Math.min(plan.wins.length - 1, activeIdx + 1)), 250);
    }
  };

  const requestExtension = async (failedWinNumber: number) => {
    if (!plan || !lastPayloadRef.current || extending) return;
    const failedWin = plan.wins.find((w) => w.win === failedWinNumber);
    if (!failedWin) return;
    const nextIdx = activeIdx + 1;
    setExtending(true);
    try {
      const startWinNumber = plan.wins.length + 1;
      const res = await authFetch("/api/ai-coach/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...lastPayloadRef.current,
          failedWinTitle: failedWin.title, failedWinNumber, startWinNumber,
          existingWinTitles: plan.wins.map((w) => w.title),
        }),
      });
      if (res.status === 402) {
        await useSubscriptionStore.getState().refresh();
        router.push({ pathname: "/paywall", params: { reason: "ai_quota" } });
        return;
      }
      if (!res.ok) throw new Error(`Server ${res.status}`);
      void useSubscriptionStore.getState().refresh();
      const data = (await res.json()) as { wins: Win[] };
      if (Array.isArray(data.wins) && data.wins.length > 0) {
        setPlan((p) => p ? { ...p, wins: [...p.wins, ...data.wins] } : p);
        setTimeout(() => goToCard(nextIdx), 80);
      }
    } catch { /* silent */ } finally {
      setExtending(false);
    }
  };

  const handleShare = async () => {
    if (!plan) return;
    const text = `${plan.title}\n\n${plan.summary}\n\nMy ${plan.wins.length} wins from AmyNest Amy Coach:\n${plan.wins.map((w) => `${w.win}. ${w.title}`).join("\n")}`;
    try { await Share.share({ title: plan.title, message: text }); } catch {}
  };

  const handleStartOver = () => {
    setPhase("goals"); setGoalId(""); setAnswers({}); setPlan(null);
    originalWinCountRef.current = 0; setSessionId(""); setActiveIdx(0);
    setFeedbackByWin({}); lastPayloadRef.current = null;
  };

  const topPad = insets.top + (Platform.OS === "web" ? 16 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 16 : 0);

  if (profileLoading) {
    return (
      <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={c.primary} />
      </LinearGradient>
    );
  }

  if (!profileComplete) {
    return <ProfileLockScreen sectionName="Amy Coach" />;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  // ── PHASE: RESUMING ──────────────────────────────────────────────────
  if (phase === "resuming") {
    return (
      <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ color: c.textSubtle, fontSize: 13, fontWeight: "600" }}>Loading your plan…</Text>
      </LinearGradient>
    );
  }

  // ── PHASE: GOALS ──────────────────────────────────────────────────────
  if (phase === "goals") {
    const activeCat = selectedCategoryId
      ? GOAL_CATEGORIES.find((c) => c.id === selectedCategoryId) ?? null
      : null;

    // SEARCH MODE
    if (searchQuery) {
      return (
        <View style={[styles.screen, { paddingTop: topPad }]}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 100 }}>
            <View style={styles.topBar}>
              <View style={{ width: 36 }} />
              <Text style={styles.topTitle}>Search Goals</Text>
              <View style={{ width: 36 }} />
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/coach/premium" as never)}
              accessibilityRole="button"
              accessibilityLabel="Open Amy's premium guided wins"
              testID="open-premium-coach"
              style={{ marginTop: 12, marginBottom: 14, borderRadius: 20, overflow: "hidden" }}
            >
              <LinearGradient
                colors={[brand.purple500, brand.pink500 /* audit-ok: accent pink gradient end-stop */]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.20)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="sparkles" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>Amy's Guided Wins</Text>
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12.5, marginTop: 2 }}>
                    Swipe through deep, expert-level wins
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={c.textFaint} />
              <TextInput
                value={goalSearch}
                onChangeText={setGoalSearch}
                placeholder="Search goals…"
                placeholderTextColor={c.textFaint}
                autoFocus
                style={styles.searchInput}
              />
            </View>
            {filteredCategories.map((cat) => (
              <View key={cat.id} style={{ marginTop: 18 }}>
                <Text style={styles.catHeader}>{cat.emoji}  {cat.title.toUpperCase()}</Text>
                <View style={{ gap: 10, marginTop: 8 }}>
                  {cat.items.map((g) => (
                    <TouchableOpacity key={g.id} onPress={() => handlePickGoal(g.id)} activeOpacity={0.85}>
                      <LinearGradient colors={g.bg} style={styles.goalRow}>
                        <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.goalRowTitle}>{g.title}</Text>
                          <Text style={styles.goalRowSub}>Tap to start →</Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            {totalMatches === 0 && (
              <Text style={styles.emptyText}>No goals match "{goalSearch}"</Text>
            )}
          </ScrollView>
        </View>
      );
    }

    // SUB-CATEGORY MODE
    if (activeCat) {
      return (
        <View style={[styles.screen, { paddingTop: topPad }]}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 100 }}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => setSelectedCategoryId(null)} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={20} color={c.textSubtle} />
                <Text style={styles.backText}>Categories</Text>
              </TouchableOpacity>
              <View style={{ width: 36 }} />
            </View>
            <LinearGradient colors={activeCat.bg} style={styles.catHeroBox}>
              <Text style={{ fontSize: 36 }}>{activeCat.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.catHeroTitle}>{activeCat.title}</Text>
                <Text style={styles.catHeroSub}>{activeCat.items.length} goals — pick one to start</Text>
              </View>
            </LinearGradient>

            <View style={[styles.searchBox, { marginTop: 14 }]}>
              <Ionicons name="search" size={16} color={c.textFaint} />
              <TextInput
                value={goalSearch}
                onChangeText={setGoalSearch}
                placeholder={`Search in ${activeCat.title}…`}
                placeholderTextColor={c.textFaint}
                style={styles.searchInput}
              />
            </View>

            <View style={{ gap: 10, marginTop: 16 }}>
              {activeCat.items.map((g) => (
                <TouchableOpacity key={g.id} onPress={() => handlePickGoal(g.id)} activeOpacity={0.85}>
                  <LinearGradient colors={g.bg} style={styles.goalRow}>
                    <Text style={{ fontSize: 28 }}>{g.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalRowTitle}>{g.title}</Text>
                      <Text style={styles.goalRowSub}>Tap to start →</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      );
    }

    // CATEGORY GRID
    return (
      <View style={[styles.screen, { paddingTop: topPad }]}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 100 }}>
          <View style={styles.heroRow}>
            <View style={[styles.heroBadge, { backgroundColor: c.heroBadgeBg }]}>
              <Ionicons name="sparkles" size={20} color={brand.violet600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Amy Coach</Text>
              <Text style={styles.heroSub}>Pick a category — I'll build a 12-step plan</Text>
            </View>
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); router.push("/coach/progress" as never); }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="View my coaching progress"
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
                backgroundColor: brandAlpha.violet500_25,
              }}
            >
              <Ionicons name="bar-chart" size={14} color={brand.violet600} />
              <Text style={{ color: brand.violet600, fontSize: 12, fontWeight: "800" }}>Progress</Text>
            </TouchableOpacity>
          </View>

          <AiQuotaBanner />

          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={c.textFaint} />
            <TextInput
              value={goalSearch}
              onChangeText={setGoalSearch}
              placeholder="Search all goals…"
              placeholderTextColor={c.textFaint}
              style={styles.searchInput}
            />
          </View>

          <View style={styles.catGrid}>
            {GOAL_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id} style={styles.catCell}
                onPress={() => { Haptics.selectionAsync(); setSelectedCategoryId(cat.id); }}
                activeOpacity={0.85}
              >
                <View style={styles.catCellGlow}>
                  <LinearGradient
                    colors={[
                      "rgba(124,58,237,0.32)" /* audit-ok: brand violet glass start */,
                      "rgba(168,85,247,0.18)" /* audit-ok: brand purple glass mid */,
                      "rgba(236,72,153,0.20)" /* audit-ok: brand pink glass end */,
                    ]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.catCellInner}
                  >
                    <View style={styles.catEmojiBadge}>
                      <Text style={styles.catEmoji}>{cat.emoji}</Text>
                    </View>
                    <Text style={styles.catCellTitle}>{cat.title}</Text>
                    <View style={styles.catCellMetaRow}>
                      <Text style={styles.catCellSub}>{cat.items.length} goals</Text>
                      <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.85)" />
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── PHASE: QUESTIONS ──────────────────────────────────────────────────
  if (phase === "questions" && currentQ) {
    const qProgress = ((qIndex + 1) / QUESTIONS.length) * 100;
    return (
      <View style={[styles.screen, { paddingTop: topPad }]}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 120 }}>
          <TouchableOpacity onPress={handleBackQ} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={c.textSubtle} />
            <Text style={[styles.backText, { color: c.textSubtle }]}>Back</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 18 }}>
            <View style={styles.qProgressRow}>
              <Text style={[styles.qProgressText, { color: c.textMuted }]}>
                Question {qIndex + 1} of {QUESTIONS.length}
              </Text>
              <Text style={[styles.qProgressGoal, { color: c.textMuted }]}>
                {selectedGoal?.title}
              </Text>
            </View>
            <View style={[styles.qProgressBar, { backgroundColor: c.surfaceTrack }]}>
              <LinearGradient
                colors={[brand.violet500, brand.pink500 /* audit-ok: accent pink gradient end-stop */]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.qProgressFill, { width: `${qProgress}%` }]}
              />
            </View>
          </View>

          <Text style={[styles.qPrompt, { color: c.text }]}>{currentQ.prompt}</Text>
          {currentQ.type === "multi" && (
            <Text style={[styles.qHint, { color: c.textMuted }]}>Pick any that apply</Text>
          )}

          <View style={{ gap: 8, marginTop: 16 }}>
            {currentQ.options.map((opt) => {
              const selected = currentQ.type === "multi"
                ? ((answers[currentQ.id] as string[]) ?? []).includes(opt)
                : answers[currentQ.id] === opt;
              return (
                <TouchableOpacity
                  key={opt} onPress={() => handleSelectOption(opt)} activeOpacity={0.8}
                  style={[
                    styles.qOption,
                    { backgroundColor: c.surface, borderColor: c.border },
                    selected && styles.qOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.qOptionText,
                      { color: c.text },
                      selected && styles.qOptionTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={20} color={brand.violet600} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={handleNextQ} disabled={!isAnswered} activeOpacity={0.85}
            style={{ marginTop: 24, opacity: isAnswered ? 1 : 0.4 }}
          >
            <LinearGradient
              colors={[brand.violet600, brand.pink500 /* audit-ok: accent pink gradient end-stop */]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.qNextBtn}
            >
              <Text style={styles.qNextText}>
                {qIndex < QUESTIONS.length - 1 ? "Next" : "Build My Plan ✨"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── PHASE: INFANT PROBLEM DETAIL ──────────────────────────────────────
  if (phase === "infantProblem") {
    const problem = getInfantProblem(goalId);
    if (!problem) {
      // Safe fallback view — never triggers a state update during render.
      return (
        <View style={{ flex: 1, paddingTop: topPad, padding: 24, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
            This topic isn't available.
          </Text>
          <TouchableOpacity
            onPress={() => setPhase("goals")}
            style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: brandAlpha.violet500_25 }}
          >
            <Text style={{ color: brand.violetMist, fontWeight: "700" }}>← Back to topics</Text>
          </TouchableOpacity>
        </View>
      );
    }
    const lang = (i18n?.language as string) || "en";
    return (
      <LinearGradient
        colors={["#1a0b2e", "#3b0a4f", "#1a0b2e"] /* audit-ok: always-dark branded overlay gradient */}
        style={{ flex: 1, paddingTop: topPad }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: botPad + 32, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Back row */}
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setPhase("goals");
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 }}
          >
            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>Back</Text>
          </TouchableOpacity>

          {/* Hero card */}
          <LinearGradient
            colors={["rgba(244,114,182,0.22)", "rgba(251,146,60,0.12)"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24, padding: 18,
              borderWidth: 1, borderColor: "rgba(244,114,182,0.3)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 36 }}>{problem.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>
                  {pickInfLang(problem.title, lang)}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 }}>
                  {pickInfLang(problem.description, lang)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* (A) Possible Reason */}
          <View style={{
            borderRadius: 18, padding: 14,
            backgroundColor: "rgba(255,255,255,0.05)",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
          }}>
            <Text style={{
              color: "rgba(255,255,255,0.55)", fontSize: 11,
              fontWeight: "800", letterSpacing: 1, marginBottom: 8,
            }}>
              🔍 POSSIBLE REASON
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20 }}>
              {pickInfLang(problem.reason, lang)}
            </Text>
          </View>

          {/* (B) What You Can Do */}
          <View style={{
            borderRadius: 18, padding: 14,
            backgroundColor: "rgba(255,255,255,0.05)",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
          }}>
            <Text style={{
              color: "rgba(255,255,255,0.55)", fontSize: 11,
              fontWeight: "800", letterSpacing: 1, marginBottom: 12,
            }}>
              ✅ WHAT YOU CAN DO
            </Text>
            {problem.solution.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <View style={{
                  width: 24, height: 24, borderRadius: 12,
                  backgroundColor: "rgba(244,114,182,0.25)",
                  borderWidth: 1, borderColor: "rgba(244,114,182,0.5)",
                  alignItems: "center", justifyContent: "center",
                  marginTop: 1,
                }}>
                  <Text style={{ color: "#fce7f3" /* audit-ok: light-pink numeral on dark badge */, fontSize: 11, fontWeight: "800" }}>{i + 1}</Text>
                </View>
                <Text style={{
                  color: "rgba(255,255,255,0.92)",
                  fontSize: 14, lineHeight: 20, flex: 1,
                }}>
                  {pickInfLang(s, lang)}
                </Text>
              </View>
            ))}
          </View>

          {/* (C) Amy AI Insight */}
          <LinearGradient
            colors={[brandAlpha.violet500_22, "rgba(236,72,153,0.12)"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 18, padding: 14,
              borderWidth: 1, borderColor: brandAlpha.violet500_40,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Ionicons name="sparkles" size={14} color={brand.violetMist} />
              <Text style={{
                color: brand.violetMist, fontSize: 11,
                fontWeight: "800", letterSpacing: 1,
              }}>
                AMY AI INSIGHT
              </Text>
            </View>
            <Text style={{
              color: "#fff", fontSize: 14, lineHeight: 20, fontStyle: "italic",
            }}>
              "{pickInfLang(problem.insight, lang)}"
            </Text>
          </LinearGradient>

          {/* (D) Reassurance */}
          <LinearGradient
            colors={["rgba(244,114,182,0.18)", "rgba(251,146,60,0.08)"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 18, padding: 14, flexDirection: "row", gap: 10,
              borderWidth: 1, borderColor: "rgba(244,114,182,0.4)",
            }}
          >
            {/* audit-ok: always-dark section — pink heart icon, no theme token for this tint */}
            <Ionicons name="heart" size={20} color="#f9a8d4" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{
                color: "rgba(255,255,255,0.95)", fontSize: 14,
                fontWeight: "600", lineHeight: 20,
              }}>
                {pickInfLang(problem.reassure, lang)}
              </Text>
              <Text style={{
                color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 4,
              }}>
                I'm here to help ❤️ — Amy
              </Text>
            </View>
          </LinearGradient>

          <Text style={{
            color: "rgba(255,255,255,0.4)", fontSize: 11,
            textAlign: "center", paddingTop: 4,
          }}>
            Guidance only — not a medical diagnosis. If concerns persist, consult your pediatrician.
          </Text>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── PHASE: LOADING ────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <LinearGradient
        colors={[brand.violet900, brand.purple900, "#831843" /* audit-ok: dark rose gradient end-stop on loading screen */]}
        style={[styles.loaderScreen, { paddingTop: topPad, paddingBottom: botPad }]}
      >
        <View style={{ alignItems: "center", paddingHorizontal: 32 }}>
          <View style={styles.loaderIcon}>
            <Ionicons name="sparkles" size={48} color="#fff" />
          </View>
          <Text style={styles.loaderTitle}>Building your plan…</Text>
          <Text style={styles.loaderSub}>
            Analysing your answers and crafting 12 deep, research-backed wins for {selectedGoal?.title.toLowerCase()}. Takes ~10 seconds.
          </Text>
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 24 }} />
        </View>
      </LinearGradient>
    );
  }

  // ── PHASE: RESULT ─────────────────────────────────────────────────────
  if (phase === "result" && plan) {
    return (
      <LinearGradient colors={theme.gradient} style={[styles.screen, { paddingTop: topPad }]}>
        {/* Top bar */}
        <View style={styles.resultTopBar}>
          <TouchableOpacity onPress={handleStartOver} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={18} color={brand.violet700} />
          </TouchableOpacity>

          <LinearGradient
            colors={[brand.violet500, brand.pink500 /* audit-ok: accent pink gradient end-stop */]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.progressPill}
          >
            <Text style={styles.progressPillText}>Progress {progressPct}%</Text>
          </LinearGradient>

          <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={16} color={brand.violet700} />
          </TouchableOpacity>
        </View>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {plan.wins.map((_, i) => (
            <TouchableOpacity
              key={i} onPress={() => goToCard(i)}
              style={[
                styles.dot,
                { backgroundColor: i <= activeIdx ? brand.violet500 : brandAlpha.violet500_20 },
              ]}
            />
          ))}
        </View>

        {/* Card pager */}
        <FlatList
          ref={scrollerRef}
          data={plan.wins}
          keyExtractor={(w, i) => `${w.win}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollerMomentum}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          renderItem={({ item: w, index: i }) => (
            <WinCard
              w={w}
              total={plan.wins.length}
              isFirst={i === 0}
              planTitle={i === 0 ? plan.title : undefined}
              planSummary={i === 0 ? plan.summary : undefined}
              planRootCause={i === 0 ? plan.root_cause : undefined}
              currentFeedback={feedbackByWin[w.win]}
              extending={extending}
              onFeedback={(f) => submitFeedback(w.win, f)}
              width={width}
            />
          )}
        />

        {/* Extending banner */}
        {extending && (
          <View style={styles.extBanner}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.extBannerText}>Loading 3 new strategies for you…</Text>
          </View>
        )}

        {/* Bottom nav */}
        {(() => {
          const currentWin = plan.wins[activeIdx];
          const hasFeedback = currentWin ? !!feedbackByWin[currentWin.win] : false;
          const atLast = activeIdx >= plan.wins.length - 1;
          // Next is gated on (a) not being on the very last card AND
          // (b) the parent having selected a feedback option for this win.
          const nextDisabled = atLast || !hasFeedback;
          return (
            <View style={[styles.resultBottomNav, { paddingBottom: botPad + 12, flexDirection: "column", gap: 8 }]}>
              {!hasFeedback && !atLast && (
                <View style={styles.nextHint}>
                  <Text style={styles.nextHintText}>
                    Pick Worked / Partially / Not for me to continue
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center", justifyContent: "center" }}>
                <TouchableOpacity
                  onPress={() => goToCard(Math.max(0, activeIdx - 1))}
                  disabled={activeIdx === 0}
                  style={[styles.prevBtn, activeIdx === 0 && { opacity: 0.4 }]}
                >
                  <Ionicons name="arrow-back" size={14} color={brand.violet700} />
                  <Text style={styles.prevBtnText}>Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => goToCard(Math.min(plan.wins.length - 1, activeIdx + 1))}
                  disabled={nextDisabled}
                  activeOpacity={0.85}
                  style={{ opacity: nextDisabled ? 0.4 : 1 }}
                >
                  <LinearGradient
                    colors={[brand.violet500, brand.pink500 /* audit-ok: accent pink gradient end-stop */]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.nextBtn}
                  >
                    <Text style={styles.nextBtnText}>Next</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </LinearGradient>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// WIN CARD
// ═══════════════════════════════════════════════════════════════════════════
function WinCard({
  w, total, isFirst, planTitle, planSummary, planRootCause,
  currentFeedback, extending, onFeedback, width,
}: {
  w: Win; total: number; isFirst: boolean;
  planTitle?: string; planSummary?: string; planRootCause?: string;
  currentFeedback?: Feedback; extending: boolean;
  onFeedback: (f: Feedback) => void; width: number;
}) {
  const isExtension = w.win > 12;
  const cardColors: [string, string, string] = isExtension
    ? ["#1B1B3A", "#241640", "#0B0B1A"] // audit-ok: always-dark win-card background gradient
    : ["#0B0B1A", "#14142B", "#1B1B3A"]; // audit-ok: always-dark win-card background gradient

  return (
    <LinearGradient colors={cardColors} style={{ width, height: "100%" }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: 84, paddingBottom: 140, paddingHorizontal: 22 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Win counter chip */}
        <LinearGradient
          colors={isExtension ? ["#F59E0B" /* audit-ok: amber gradient for extension chip */, brand.pink500 /* audit-ok: accent pink */] : [brand.violet500, brand.pink500 /* audit-ok: accent pink gradient end-stop */]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.winChip}
        >
          <Text style={styles.winChipText}>
            {isExtension ? "💛 EXTRA STRATEGY " : "WIN "}{w.win} / {total}
          </Text>
        </LinearGradient>

        {isFirst && planTitle && (
          <View style={styles.planHeaderBox}>
            <Text style={styles.planHeaderEyebrow}>YOUR PLAN</Text>
            <Text style={styles.planHeaderTitle}>{planTitle}</Text>
            {planRootCause ? (
              <View style={styles.rootCauseBox}>
                <Text style={styles.rootCauseEyebrow}>🧠 ROOT CAUSE</Text>
                <Text style={styles.rootCauseText}>{planRootCause}</Text>
              </View>
            ) : null}
            <Text style={styles.planSummaryText}>{planSummary}</Text>
          </View>
        )}

        <Text style={styles.winTitle}>{w.title}</Text>
        <Text style={styles.winObjective}>{w.objective}</Text>

        {w.deep_explanation ? (
          <View style={styles.section}>
            <Text style={[styles.sectionEyebrow, { color: "#4338CA" /* audit-ok: semantic indigo callout "why this works" */ }]}>🔬 WHY THIS WORKS</Text>
            <Text style={styles.sectionBody}>{w.deep_explanation}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionEyebrow, { color: brand.violet600 }]}>✅ DO THIS</Text>
          <View style={{ gap: 10, marginTop: 4 }}>
            {w.actions.map((a, i) => (
              <View key={i} style={styles.actionRow}>
                <LinearGradient
                  colors={[brand.violet500, brand.pink500 /* audit-ok: accent pink gradient end-stop */]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.actionDot}
                >
                  <Text style={styles.actionDotText}>{i + 1}</Text>
                </LinearGradient>
                <Text style={styles.actionText}>{a}</Text>
              </View>
            ))}
          </View>
        </View>

        {w.example ? (
          <View style={[styles.section, { backgroundColor: "rgba(220,252,231,0.8)", borderColor: "rgba(34,197,94,0.35)" }]}>
            <Text style={[styles.sectionEyebrow, { color: "#15803D" /* audit-ok: semantic success-green eyebrow */ }]}>💬 REAL EXAMPLE</Text>
            <Text style={[styles.sectionBody, { color: "#14532D" /* audit-ok: semantic success-green dark body */, fontStyle: "italic" }]}>{w.example}</Text>
          </View>
        ) : null}

        {w.mistake_to_avoid ? (
          <View style={[styles.section, { backgroundColor: "rgba(254,226,226,0.7)", borderColor: "rgba(248,113,113,0.4)" }]}>
            <Text style={[styles.sectionEyebrow, { color: "#B91C1C" /* audit-ok: semantic danger-red eyebrow */ }]}>⚠️ MISTAKE TO AVOID</Text>
            <Text style={[styles.sectionBody, { color: "#7F1D1D" /* audit-ok: semantic danger-red dark body */ }]}>{w.mistake_to_avoid}</Text>
          </View>
        ) : null}

        {w.micro_task ? (
          <LinearGradient
            colors={["rgba(167,139,250,0.18)", "rgba(236,72,153,0.15)"]}
            style={styles.microTaskBox}
          >
            <Text style={styles.microTaskEyebrow}>🎯 DO THIS TODAY (under 5 min)</Text>
            <Text style={styles.microTaskBody}>{w.micro_task}</Text>
          </LinearGradient>
        ) : null}

        <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
          <View style={styles.durationChip}>
            <Text style={styles.durationChipText}>⏱ {w.duration}</Text>
          </View>
        </View>

        {w.science_reference ? (
          <Text style={styles.scienceRef}>📚 Based on: {w.science_reference}</Text>
        ) : null}

        {/* Feedback */}
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackTitle}>How did this win go?</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {([
              // audit-block-ignore-start: feedback button semantic color triplet — green/amber/red status, no theme tokens
              { v: "yes" as const,      label: "Worked",           color: "#15803D", bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.45)" },
              { v: "somewhat" as const, label: "Partially",        color: "#A16207", bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.45)" },
              { v: "no" as const,       label: "Not for me",       color: "#B91C1C", bg: "rgba(248,113,113,0.12)",border: "rgba(248,113,113,0.4)" },
              // audit-block-ignore-end
            ]).map((b) => {
              const selected = currentFeedback === b.v;
              return (
                <TouchableOpacity
                  key={b.v}
                  onPress={() => onFeedback(b.v)}
                  disabled={extending}
                  activeOpacity={0.7}
                  style={[
                    styles.fbBtn,
                    {
                      backgroundColor: selected ? b.color : b.bg,
                      borderColor: selected ? b.color : b.border,
                      opacity: extending ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.fbBtnText, { color: selected ? "#fff" : b.color }]}>{b.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {currentFeedback === "no" && (
          <View style={[styles.section, { backgroundColor: "rgba(254,243,199,0.7)", borderColor: "rgba(245,158,11,0.4)", marginTop: 10 }]}>
            <Text style={[styles.sectionEyebrow, { color: "#92400E" /* audit-ok: semantic amber-dark eyebrow */ }]}>💛 EXTRA SUPPORT ADDED</Text>
            <Text style={[styles.sectionBody, { color: "#78350F" /* audit-ok: semantic amber-dark body */ }]}>
              I've added 3 fresh strategies at the end of your plan — different angles to try. Tap Next to reach them.
            </Text>
          </View>
        )}

        {(currentFeedback === "yes" || currentFeedback === "somewhat") && (
          <View style={styles.fbConfirm}>
            <Text style={{ fontSize: 18 }}>{currentFeedback === "yes" ? "🎉" : "💜"}</Text>
            <Text style={styles.fbConfirmText}>
              {currentFeedback === "yes"
                ? "Logged as a full win. Swipe to the next step."
                : "Partial progress counted. Keep going — small wins compound."}
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  screen: { flex: 1 },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  topTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 14, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_500Medium" },

  heroRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  heroBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#F3E8FF" /* audit-ok: light violet badge always on dark header */, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 },

  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#14142B" /* audit-ok: always-dark search box */, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#FFFFFF", fontFamily: "Inter_400Regular", padding: 0 },

  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  catCell: { width: "47.5%" },
  catCellGlow: {
    borderRadius: 20,
    backgroundColor: "rgba(20,20,43,0.55)" /* audit-ok: dark glass base for theme-agnostic violet glow card */,
    shadowColor: "#7C3AED" /* audit-ok: brand violet glow */,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  catCellInner: {
    borderRadius: 20,
    padding: 16,
    minHeight: 132,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.45)" /* audit-ok: brand violet400 glass border */,
    backgroundColor: "rgba(15,10,40,0.55)" /* audit-ok: deep violet-navy glass overlay */,
  },
  catEmojiBadge: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 10,
  },
  catEmoji: { fontSize: 24, lineHeight: 28 },
  catCellTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF", lineHeight: 18 },
  catCellMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  catCellSub: { fontSize: 11, color: "rgba(255,255,255,0.85)", fontFamily: "Inter_500Medium" },

  catHeader: { fontSize: 11, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.6)", letterSpacing: 0.6 },

  catHeroBox: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 18, marginTop: 6 },
  catHeroTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  catHeroSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },

  goalRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18 },
  goalRowTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  goalRowSub: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },

  emptyText: { textAlign: "center", marginTop: 30, color: "rgba(255,255,255,0.6)", fontSize: 14 },

  // Questions
  qProgressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  qProgressText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.6)" },
  qProgressGoal: { fontSize: 11, color: "rgba(255,255,255,0.6)" },
  qProgressBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  qProgressFill: { height: "100%", borderRadius: 4 },

  qPrompt: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 22, lineHeight: 28 },
  qHint: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 6 },

  qOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16,
    backgroundColor: "#14142B" /* audit-ok: always-dark option button */, borderWidth: 2, borderColor: "rgba(255,255,255,0.08)",
  },
  qOptionSelected: { backgroundColor: brand.violet50, borderColor: brand.violet500 },
  qOptionText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", flex: 1 },
  qOptionTextSelected: { color: brand.violet800 },

  qNextBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  qNextText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },

  // Loader
  loaderScreen: { flex: 1, alignItems: "center", justifyContent: "center" },
  loaderIcon: {
    width: 88, height: 88, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  loaderTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  loaderSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, textAlign: "center", marginTop: 12, lineHeight: 20 },

  // Result top
  resultTopBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 10,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 999, backgroundColor: "rgba(167,139,250,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  progressPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
  },
  progressPillText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },

  dotsRow: { flexDirection: "row", gap: 4, paddingHorizontal: 16, marginBottom: 6 },
  dot: { flex: 1, height: 3, borderRadius: 2 },

  // Win card
  winChip: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 10 },
  winChipText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  planHeaderBox: { marginBottom: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: brandAlpha.violet500_18 },
  planHeaderEyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2, color: brand.violet600, marginBottom: 4 },
  planHeaderTitle: { fontSize: 19, fontFamily: "Inter_700Bold", color: "#FFFFFF", lineHeight: 23 },
  rootCauseBox: { backgroundColor: "rgba(244,114,182,0.1)", borderWidth: 1, borderColor: "rgba(244,114,182,0.3)", borderRadius: 12, padding: 12, marginTop: 10, marginBottom: 8 },
  rootCauseEyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, color: "#BE185D" /* audit-ok: semantic rose eyebrow on dark card */, marginBottom: 4 },
  rootCauseText: { fontSize: 12.5, lineHeight: 19, color: "#4C1D3A" /* audit-ok: semantic rose-dark body text on dark card */ },
  planSummaryText: { fontSize: 12.5, color: "rgba(255,255,255,0.7)", lineHeight: 19 },

  winTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF", lineHeight: 28, marginBottom: 6 },
  winObjective: { fontSize: 13.5, color: brand.violet600, lineHeight: 19, fontFamily: "Inter_600SemiBold", marginBottom: 16 },

  section: {
    backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: brandAlpha.indigo500_25,
    borderRadius: 14, padding: 14, marginBottom: 14,
  },
  sectionEyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 6 },
  sectionBody: { fontSize: 13.5, lineHeight: 21, color: "#FFFFFF" },

  actionRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  actionDot: { width: 22, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center", marginTop: 1 },
  actionDotText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  actionText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: "#FFFFFF" },

  microTaskBox: {
    borderWidth: 1, borderColor: "rgba(167,139,250,0.5)",
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  microTaskEyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, color: brand.violet700, marginBottom: 4 },
  microTaskBody: { fontSize: 13.5, lineHeight: 19, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },

  durationChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: brandAlpha.violet500_12 },
  durationChipText: { fontSize: 11, color: brand.violet700, fontFamily: "Inter_700Bold" },

  scienceRef: {
    fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 17, marginBottom: 14,
    fontStyle: "italic", paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: brandAlpha.violet500_30,
    marginTop: 8,
  },

  feedbackBox: {
    backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: brandAlpha.violet500_35,
    borderRadius: 16, padding: 14, marginBottom: 8,
  },
  feedbackTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 10 },
  fbBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  fbBtnText: { fontSize: 11.5, fontFamily: "Inter_700Bold", lineHeight: 14 },

  fbConfirm: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(220,252,231,0.6)", borderWidth: 1, borderColor: "rgba(34,197,94,0.4)",
    borderRadius: 12, padding: 10, marginTop: 8,
  },
  fbConfirmText: { flex: 1, fontSize: 12.5, color: "#14532D" /* audit-ok: semantic success-green confirm text */, fontFamily: "Inter_600SemiBold" },

  // Result bottom
  extBanner: {
    position: "absolute", bottom: 80, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: brandAlpha.indigo500_95, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
  },
  extBannerText: { color: "#fff", fontSize: 12.5, fontFamily: "Inter_700Bold" },

  resultBottomNav: {
    flexDirection: "row", justifyContent: "center", gap: 12, paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  prevBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: brandAlpha.violet500_20,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
  },
  prevBtnText: { color: brand.violet700, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  nextBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  nextBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  nextHint: {
    alignSelf: "center",
    backgroundColor: "rgba(251,191,36,0.12)",
    borderColor: "rgba(251,191,36,0.35)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  nextHintText: { color: "#FBBF24", fontSize: 11.5, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
});
