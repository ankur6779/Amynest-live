import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { SvgXml } from "react-native-svg";

import {
  PLAY_CATEGORIES,
  BASIC_SUBJECTS,
  ADVANCED_SUBJECTS,
  SMART_SUBJECTS,
  resolveStudyMode,
  MODE_LABELS,
  type PlayCategory,
  type PlayItem,
  type SubjectPack,
  type StudyTopic,
  type StudyMode,
  type SmartSubjectId,
} from "@workspace/study-zone";

import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, ACCENT_PINK, palette } from "@/constants/colors";
import {
  loadProgress,
  markPlayItem,
  markTopicResult,
  categoryPercent,
  subjectPercent,
  type StudyProgress,
} from "@/lib/study-progress";

// ─── Server types (matching POST /api/smart-study/daily-plan) ────────────────

type Difficulty = "easy" | "medium" | "hard";

interface PlanItem {
  id: string;
  subject: string;
  subjectTitle: string;
  subjectEmoji: string;
  topicId: string;
  topicTitle: string;
  difficulty: Difficulty;
  source: "weak" | "fresh";
  mode: "basic" | "advanced";
}

interface DailyPlan {
  date: string;
  mode: "basic" | "advanced";
  items: PlanItem[];
}

interface DailyPlanResponse {
  child: { id: number; name: string; age: number | null; mode: StudyMode };
  plan: DailyPlan;
  completionPct: number;
  doneTopicIds: string[];
}

type Child = {
  id: number;
  name: string;
  age: number | null;
  childClass?: string | null;
};

// ─── View state ───────────────────────────────────────────────────────────────

type StudyView =
  | { kind: "child-pick" }
  | { kind: "play-home"; childId: number }
  | { kind: "play-cat"; childId: number; categoryId: string }
  | { kind: "study-home"; childId: number; mode: "basic" | "advanced" }
  | {
      kind: "study-subject";
      childId: number;
      mode: "basic" | "advanced";
      subjectId: string;
    }
  | {
      kind: "study-topic";
      childId: number;
      mode: "basic" | "advanced";
      subjectId: string;
      topicId: string;
    }
  | { kind: "smart-pick"; childId: number; mode: "basic" | "advanced" }
  | {
      kind: "smart-runner";
      childId: number;
      mode: "basic" | "advanced";
      subjectId: SmartSubjectId;
    };

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [view, setView] = useState<StudyView>({ kind: "child-pick" });
  const [progress, setProgress] = useState<StudyProgress | null>(null);

  // Load children list
  const { data: childrenData, isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["children-for-study"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      return r.ok ? r.json() : [];
    },
    staleTime: 60_000,
  });
  const children = useMemo(
    () => (Array.isArray(childrenData) ? childrenData : []),
    [childrenData],
  );

  // Auto-pick when single child
  useEffect(() => {
    if (view.kind === "child-pick" && children.length === 1) {
      const c = children[0]!;
      pickChild(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, view.kind]);

  const pickChild = useCallback(
    (c: Child) => {
      const mode = resolveStudyMode(c.age ?? 0, c.childClass);
      if (mode === "play") {
        setView({ kind: "play-home", childId: c.id });
      } else {
        setView({ kind: "study-home", childId: c.id, mode });
      }
    },
    [],
  );

  // Load progress when child changes
  useEffect(() => {
    const childId =
      "childId" in view ? (view as { childId: number }).childId : null;
    if (childId == null) return;
    loadProgress(childId).then(setProgress);
  }, ["childId" in view ? (view as { childId: number }).childId : null]);

  const refreshProgress = useCallback(async (childId: number) => {
    const p = await loadProgress(childId);
    setProgress(p);
  }, []);

  // Back navigation
  const goBack = useCallback(() => {
    if (view.kind === "child-pick") {
      router.back();
      return;
    }
    if (view.kind === "play-home" || view.kind === "study-home") {
      if (children.length > 1) {
        setView({ kind: "child-pick" });
      } else {
        router.back();
      }
      return;
    }
    if (view.kind === "play-cat") {
      setView({ kind: "play-home", childId: view.childId });
      return;
    }
    if (view.kind === "study-subject") {
      setView({
        kind: "study-home",
        childId: view.childId,
        mode: view.mode,
      });
      return;
    }
    if (view.kind === "study-topic") {
      setView({
        kind: "study-subject",
        childId: view.childId,
        mode: view.mode,
        subjectId: view.subjectId,
      });
      return;
    }
    if (view.kind === "smart-pick") {
      setView({ kind: "study-home", childId: view.childId, mode: view.mode });
      return;
    }
    if (view.kind === "smart-runner") {
      setView({ kind: "smart-pick", childId: view.childId, mode: view.mode });
      return;
    }
    router.back();
  }, [view, children.length, router]);

  const child =
    "childId" in view
      ? children.find(
          (c) => c.id === (view as { childId: number }).childId,
        )
      : undefined;

  const studyMode =
    child ? resolveStudyMode(child.age ?? 0, child.childClass) : undefined;
  const modeLabel =
    studyMode ? MODE_LABELS[studyMode] : null;

  const subtitle =
    view.kind === "child-pick"
      ? t("screens.study.pick_child_subtitle")
      : child
        ? `${child.name}${modeLabel ? ` · ${modeLabel.title}` : ""}`
        : "";

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable
        onPress={goBack}
        hitSlop={10}
        style={styles.backBtn}
        accessibilityLabel={t("screens.study.back")}
      >
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </Pressable>
      <LinearGradient
        colors={[brand.primary, ACCENT_PINK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerIcon}
      >
        <Ionicons name="school" size={22} color="#fff" />
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t("screens.study.title")}
        </Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>
  );

  // Loading
  if (childrenLoading) {
    return (
      <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
        <View style={[styles.safe, { paddingTop: insets.top + 12 }]}>
          {renderHeader()}
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
          </View>
        </View>
      </LinearGradient>
    );
  }

  // No children
  if (children.length === 0) {
    return (
      <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
        <View style={[styles.safe, { paddingTop: insets.top + 12 }]}>
          {renderHeader()}
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>
              {t("screens.study.no_children_title")}
            </Text>
            <Text style={styles.emptyDesc}>
              {t("screens.study.no_children_desc")}
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/children" as never)}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>
                {t("screens.study.add_child_btn")}
              </Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // ─── View routing ─────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      <View style={[styles.safe, { paddingTop: insets.top + 12 }]}>
        {renderHeader()}

        {view.kind === "child-pick" && (
          <ChildPicker children={children} onPick={pickChild} t={t} />
        )}

        {view.kind === "play-home" && (
          <PlayHome
            childId={view.childId}
            progress={progress}
            onOpenCat={(catId) =>
              setView({
                kind: "play-cat",
                childId: view.childId,
                categoryId: catId,
              })
            }
            t={t}
          />
        )}

        {view.kind === "play-cat" && (
          <PlayCategoryView
            childId={view.childId}
            categoryId={view.categoryId}
            progress={progress}
            onItemDone={(p) => setProgress(p)}
            t={t}
          />
        )}

        {view.kind === "study-home" && child && (
          <StudyHome
            childId={view.childId}
            childName={child.name}
            mode={view.mode}
            progress={progress}
            authFetch={authFetch}
            onOpenSubject={(subjectId) =>
              setView({
                kind: "study-subject",
                childId: view.childId,
                mode: view.mode,
                subjectId,
              })
            }
            onOpenTopic={(item) =>
              setView({
                kind: "study-topic",
                childId: view.childId,
                mode: item.mode,
                subjectId: item.subject,
                topicId: item.topicId,
              })
            }
            onOpenSmartPick={() =>
              setView({ kind: "smart-pick", childId: view.childId, mode: view.mode })
            }
            onPlanRefreshed={() => refreshProgress(view.childId)}
            t={t}
          />
        )}

        {view.kind === "study-subject" && (
          <SubjectTopicList
            childId={view.childId}
            mode={view.mode}
            subjectId={view.subjectId}
            progress={progress}
            onOpen={(topicId) =>
              setView({
                kind: "study-topic",
                childId: view.childId,
                mode: view.mode,
                subjectId: view.subjectId,
                topicId,
              })
            }
            t={t}
          />
        )}

        {view.kind === "study-topic" && child && (
          <TopicDetail
            childId={view.childId}
            childName={child.name}
            mode={view.mode}
            subjectId={view.subjectId}
            topicId={view.topicId}
            authFetch={authFetch}
            onScored={async () => {
              const p = await loadProgress(view.childId);
              setProgress(p);
            }}
            t={t}
          />
        )}

        {view.kind === "smart-pick" && (
          <SmartSubjectPicker
            onPick={(subjectId) =>
              setView({
                kind: "smart-runner",
                childId: view.childId,
                mode: view.mode,
                subjectId,
              })
            }
            t={t}
          />
        )}

        {view.kind === "smart-runner" && (
          <AdaptiveRunner
            childId={view.childId}
            subjectId={view.subjectId}
            authFetch={authFetch}
            onExit={() =>
              setView({ kind: "smart-pick", childId: view.childId, mode: view.mode })
            }
            t={t}
          />
        )}
      </View>
    </LinearGradient>
  );
}

// ─── EngagementStrip ─────────────────────────────────────────────────────────

function EngagementStrip({
  progress,
  t,
}: {
  progress: StudyProgress | null;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  if (!progress) return null;
  const { engagement } = progress;
  const GOAL = 3;
  const goalPct = Math.min(100, Math.round((engagement.goalProgress / GOAL) * 100));

  return (
    <View style={styles.engagementStrip}>
      <View style={styles.engagementItem}>
        <Text style={styles.engagementEmoji}>🔥</Text>
        <Text style={styles.engagementLabel}>
          {t("screens.study.label_streak")}
        </Text>
        <Text style={styles.engagementValue}>
          {t("screens.study.streak_unit_d", { n: engagement.streak })}
        </Text>
      </View>
      <View style={styles.engagementItem}>
        <Text style={styles.engagementEmoji}>⭐</Text>
        <Text style={styles.engagementLabel}>
          {t("screens.study.label_xp")}
        </Text>
        <Text style={styles.engagementValue}>{engagement.xp}</Text>
      </View>
      <View style={[styles.engagementItem, { flex: 2 }]}>
        <Text style={styles.engagementEmoji}>🎯</Text>
        <Text style={styles.engagementLabel}>{t("screens.study.label_daily_goal")}</Text>
        <View style={styles.goalTrack}>
          <View
            style={[
              styles.goalFill,
              {
                width: `${goalPct}%`,
                backgroundColor:
                  goalPct >= 100 ? palette.green400 : brand.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.engagementValue}>
          {engagement.goalProgress}/{GOAL}
        </Text>
      </View>
    </View>
  );
}

// ─── XP Popup ────────────────────────────────────────────────────────────────

function XpPopup({ amount, trigger }: { amount: number; trigger: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const { t } = useTranslation();

  useEffect(() => {
    if (trigger === 0) return;
    opacity.setValue(1);
    translateY.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1400,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -36,
        duration: 1800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [trigger, opacity, translateY]);

  if (trigger === 0 || amount === 0) return null;

  return (
    <Animated.View
      style={[styles.xpPopup, { opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Text style={styles.xpPopupText}>
        {t("screens.study.xp_popup", { amount })}
      </Text>
    </Animated.View>
  );
}

// ─── ChildPicker ─────────────────────────────────────────────────────────────

function ChildPicker({
  children,
  onPick,
  t,
}: {
  children: Child[];
  onPick: (c: Child) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      {children.map((c) => {
        const mode = resolveStudyMode(c.age ?? 0, c.childClass);
        const label = MODE_LABELS[mode];
        return (
          <Pressable
            key={c.id}
            onPress={() => onPick(c)}
            style={({ pressed }) => [
              styles.childRow,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.childAvatar}>
              <Text style={styles.childAvatarText}>
                {c.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.childName}>{c.name}</Text>
              <Text style={styles.childMeta}>
                {c.age != null ? `${c.age} yr` : "—"}
                {c.childClass ? ` · Class ${c.childClass}` : ""} ·{" "}
                {label.emoji} {label.title}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── PlayHome ────────────────────────────────────────────────────────────────

function PlayHome({
  childId,
  progress,
  onOpenCat,
  t,
}: {
  childId: number;
  progress: StudyProgress | null;
  onOpenCat: (catId: string) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.playGrid}
      showsVerticalScrollIndicator={false}
    >
      {progress && <EngagementStrip progress={progress} t={t} />}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("screens.study.play_mode_title")}</Text>
        <Text style={styles.sectionSub}>{t("screens.study.play_mode_subtitle")}</Text>
      </View>
      <View style={styles.catGrid}>
        {PLAY_CATEGORIES.map((cat) => {
          const pct = progress
            ? categoryPercent(progress, cat.id, cat.items.length)
            : 0;
          const done = progress?.play[cat.id]?.length ?? 0;
          return (
            <Pressable
              key={cat.id}
              onPress={() => onOpenCat(cat.id)}
              style={({ pressed }) => [
                styles.catCard,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={styles.catTitle}>{cat.title}</Text>
              <Text style={styles.catMeta}>
                {t("screens.study.done_count", {
                  done,
                  total: cat.items.length,
                })}
              </Text>
              <View style={styles.catProgress}>
                <View
                  style={[
                    styles.catProgressFill,
                    { width: `${pct}%` },
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── PlayCategoryView ────────────────────────────────────────────────────────

function PlayCategoryView({
  childId,
  categoryId,
  progress,
  onItemDone,
  t,
}: {
  childId: number;
  categoryId: string;
  progress: StudyProgress | null;
  onItemDone: (p: StudyProgress) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const [xpTrigger, setXpTrigger] = useState(0);
  const [xpAmount, setXpAmount] = useState(0);
  const cat = PLAY_CATEGORIES.find((c) => c.id === categoryId) as
    | PlayCategory
    | undefined;

  if (!cat) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>
          {t("screens.study.category_not_found")}
        </Text>
      </View>
    );
  }

  const completed = new Set(progress?.play[cat.id] ?? []);
  const isRhymes = cat.id === "rhymes";

  const handleTap = async (item: PlayItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Speech.speak(item.speak, { language: "en-IN", rate: 0.85 });
    const { progress: nextP, engagement } = await markPlayItem(
      childId,
      cat.id,
      item.id,
    );
    onItemDone(nextP);
    if (engagement.xpDelta > 0) {
      setXpAmount(engagement.xpDelta);
      setXpTrigger((n) => n + 1);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <XpPopup amount={xpAmount} trigger={xpTrigger} />
      <View style={styles.catViewHeader}>
        <Text style={styles.catViewTitle}>
          {cat.emoji} {cat.title}
        </Text>
        <Text style={styles.catViewSub}>
          {t("screens.study.done_count", {
            done: completed.size,
            total: cat.items.length,
          })}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.itemsGrid}
        showsVerticalScrollIndicator={false}
      >
        {cat.items.map((item) => {
          const done = completed.has(item.id);
          return (
            <Pressable
              key={item.id}
              onPress={() => handleTap(item)}
              style={({ pressed }) => [
                styles.playItem,
                done && styles.playItemDone,
                pressed && { opacity: 0.85 },
              ]}
            >
              {done && (
                <View style={styles.playItemCheck}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={palette.green400}
                  />
                </View>
              )}
              {item.emoji ? (
                <Text style={styles.playItemEmoji}>{item.emoji}</Text>
              ) : null}
              <Text style={styles.playItemLabel}>{item.label}</Text>
              {isRhymes && item.body ? (
                <Text style={styles.playItemBody} numberOfLines={3}>
                  {item.body}
                </Text>
              ) : (
                <Text style={styles.playItemSpeak} numberOfLines={2}>
                  {item.speak}
                </Text>
              )}
              <View style={styles.playItemHearRow}>
                <Ionicons
                  name="volume-medium"
                  size={12}
                  color="rgba(255,255,255,0.7)"
                />
                <Text style={styles.playItemHearText}>
                  {t("screens.study.tap_to_hear")}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── StudyHome ───────────────────────────────────────────────────────────────

function StudyHome({
  childId,
  childName,
  mode,
  progress,
  authFetch,
  onOpenSubject,
  onOpenTopic,
  onOpenSmartPick,
  onPlanRefreshed,
  t,
}: {
  childId: number;
  childName: string;
  mode: "basic" | "advanced";
  progress: StudyProgress | null;
  authFetch: ReturnType<typeof useAuthFetch>;
  onOpenSubject: (subjectId: string) => void;
  onOpenTopic: (item: PlanItem) => void;
  onOpenSmartPick: () => void;
  onPlanRefreshed: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const subjects: SubjectPack[] =
    mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const qc = useQueryClient();

  const dailyKey = ["smart-study-daily-plan", childId] as const;
  const {
    data: planData,
    isLoading: planLoading,
    isFetching: planFetching,
    isError: planErrored,
    refetch: refetchPlan,
  } = useQuery<DailyPlanResponse>({
    queryKey: dailyKey,
    queryFn: async () => {
      const res = await authFetch("/api/smart-study/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      });
      if (!res.ok) throw new Error(`daily_plan_failed_${res.status}`);
      return res.json() as Promise<DailyPlanResponse>;
    },
    staleTime: 30_000,
    retry: 1,
  });

  const doneSet = useMemo(
    () => new Set<string>(planData?.doneTopicIds ?? []),
    [planData?.doneTopicIds],
  );

  const markMutation = useMutation<unknown, Error, PlanItem, { prev?: DailyPlanResponse | null }>({
    mutationFn: async (item) => {
      const res = await authFetch("/api/smart-study/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          subject: item.subject,
          topicId: item.topicId,
          correct: true,
          ts: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("attempt_failed");
      return res.json();
    },
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: dailyKey });
      const prev = qc.getQueryData<DailyPlanResponse | null>(dailyKey);
      if (prev) {
        const next = {
          ...prev,
          doneTopicIds: Array.from(
            new Set([...prev.doneTopicIds, item.topicId]),
          ),
        };
        const totalItems = prev.plan.items.length;
        const doneItems = prev.plan.items.filter((it) =>
          new Set(next.doneTopicIds).has(it.topicId),
        ).length;
        next.completionPct =
          totalItems === 0
            ? 0
            : Math.round((doneItems / totalItems) * 100);
        qc.setQueryData(dailyKey, next);
      }
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      return { prev };
    },
    onError: (_err, _item, ctx) => {
      if (ctx?.prev) qc.setQueryData(dailyKey, ctx.prev);
    },
    onSettled: () => {
      void refetchPlan();
      onPlanRefreshed();
    },
  });

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      refreshControl={
        <RefreshControl
          refreshing={planFetching}
          onRefresh={() => refetchPlan()}
          tintColor="#fff"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {progress && <EngagementStrip progress={progress} t={t} />}

      {/* Spelling Mastery banner */}
      <SpellingBanner t={t} />

      {/* Smart Adaptive Practice CTA */}
      <SmartAdaptiveCta onOpen={onOpenSmartPick} t={t} />

      {/* Today's plan */}
      {planLoading ? (
        <View style={[styles.completionCard, { alignItems: "center" }]}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : planErrored ? null : planData ? (
        <TodaysPlanCard
          plan={planData.plan}
          completionPct={planData.completionPct}
          childName={childName}
          doneSet={doneSet}
          busy={markMutation.isPending}
          onOpen={onOpenTopic}
          t={t}
        />
      ) : null}

      {/* Subject grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {mode === "basic"
            ? t("screens.study.subject_grid_title_basic")
            : t("screens.study.subject_grid_title_advanced")}
        </Text>
        <Text style={styles.sectionSub}>
          {t("screens.study.subject_grid_sub")}
        </Text>
      </View>
      {subjects.map((s) => {
        const pct = progress
          ? subjectPercent(progress, mode, s.id, s.topics.length)
          : 0;
        const done = progress
          ? Object.values(progress[mode][s.id] ?? {}).filter(
              (tp) => tp.completed,
            ).length
          : 0;
        return (
          <Pressable
            key={s.id}
            onPress={() => onOpenSubject(s.id)}
            style={({ pressed }) => [
              styles.subjectCard,
              pressed && { opacity: 0.85 },
            ]}
          >
            <LinearGradient
              colors={[`${brand.primary}1A`, `${ACCENT_PINK}0D`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={{ fontSize: 30 }}>{s.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.subjectTitle}>{s.title}</Text>
              <Text style={styles.subjectMeta}>
                {t("screens.study.topics_count", {
                  done,
                  total: s.topics.length,
                })}
              </Text>
              <View style={styles.subjectProgressTrack}>
                <View
                  style={[
                    styles.subjectProgressFill,
                    { width: `${pct}%` },
                  ]}
                />
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color="rgba(255,255,255,0.7)"
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── TodaysPlanCard ──────────────────────────────────────────────────────────

function TodaysPlanCard({
  plan,
  completionPct,
  childName,
  doneSet,
  busy,
  onOpen,
  t,
}: {
  plan: DailyPlan;
  completionPct: number;
  childName: string;
  doneSet: Set<string>;
  busy: boolean;
  onOpen: (item: PlanItem) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const totalItems = plan.items.length;
  const doneItems = plan.items.filter((it) => doneSet.has(it.topicId)).length;

  return (
    <View style={styles.completionCard}>
      <View style={styles.completionHeader}>
        <Text style={styles.completionTitle}>
          ✨ {t("screens.study.todays_plan")}
        </Text>
        <Text style={styles.completionPct}>
          {t("screens.study.plan_completion", { pct: completionPct })}
        </Text>
      </View>
      <Text style={styles.completionSubtitle}>
        {t("screens.study.todays_plan_subtitle", { name: childName })}
      </Text>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${completionPct}%` },
          ]}
        />
      </View>
      {totalItems > 0 ? (
        <Text style={styles.progressMeta}>
          {t("screens.study.done_count", {
            done: doneItems,
            total: totalItems,
          })}
        </Text>
      ) : null}

      {totalItems === 0 ? (
        <Text style={[styles.progressMeta, { marginTop: 8 }]}>
          {t("screens.study.todays_plan_empty")}
        </Text>
      ) : (
        plan.items.map((item) => {
          const done = doneSet.has(item.topicId);
          const diffKey =
            item.difficulty === "easy"
              ? "screens.study.plan_difficulty_easy"
              : item.difficulty === "medium"
                ? "screens.study.plan_difficulty_medium"
                : "screens.study.plan_difficulty_hard";
          const sourceKey =
            item.source === "weak"
              ? "screens.study.plan_source_weak"
              : "screens.study.plan_source_fresh";

          return (
            <Pressable
              key={item.id}
              onPress={() => onOpen(item)}
              style={({ pressed }) => [
                styles.planItem,
                done && styles.planItemDone,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.itemEmoji}>{item.subjectEmoji}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.itemSubject} numberOfLines={1}>
                  {item.subjectTitle}
                </Text>
                <Text style={styles.itemTopic} numberOfLines={2}>
                  {item.topicTitle}
                </Text>
                <View style={styles.pillRow}>
                  <View
                    style={[
                      styles.pill,
                      item.difficulty === "easy"
                        ? styles.pillEasy
                        : item.difficulty === "medium"
                          ? styles.pillMedium
                          : styles.pillHard,
                    ]}
                  >
                    <Text style={styles.pillText}>{t(diffKey)}</Text>
                  </View>
                  <View
                    style={[
                      styles.pill,
                      item.source === "weak"
                        ? styles.pillWeak
                        : styles.pillFresh,
                    ]}
                  >
                    <Text style={styles.pillText}>{t(sourceKey)}</Text>
                  </View>
                </View>
              </View>
              {done ? (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={palette.green400}
                />
              ) : (
                <View style={styles.openBtn}>
                  <Text style={styles.openBtnText}>
                    {t("screens.study.plan_open")}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

// ─── SubjectTopicList ────────────────────────────────────────────────────────

function SubjectTopicList({
  childId,
  mode,
  subjectId,
  progress,
  onOpen,
  t,
}: {
  childId: number;
  mode: "basic" | "advanced";
  subjectId: string;
  progress: StudyProgress | null;
  onOpen: (topicId: string) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const subjects: SubjectPack[] =
    mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const subj = subjects.find((s) => s.id === subjectId);
  if (!subj) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>
          {t("screens.study.subject_not_found")}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {subj.emoji} {subj.title}
        </Text>
        <Text style={styles.sectionSub}>{subj.topics.length} topics</Text>
      </View>
      {subj.topics.map((topic) => {
        const stat = progress?.[mode][subj.id]?.[topic.id];
        return (
          <Pressable
            key={topic.id}
            onPress={() => onOpen(topic.id)}
            style={({ pressed }) => [
              styles.topicRow,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicNote} numberOfLines={1}>
                {topic.notes.split("\n")[0]}
              </Text>
              {stat && (
                <Text style={styles.topicBest}>
                  {t("screens.study.best_score", {
                    score: stat.score,
                    total: stat.total,
                  })}
                </Text>
              )}
            </View>
            {stat?.completed ? (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={palette.green400}
              />
            ) : (
              <Ionicons
                name="chevron-forward"
                size={18}
                color="rgba(255,255,255,0.7)"
              />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── TopicDetail ──────────────────────────────────────────────────────────────

function TopicDetail({
  childId,
  childName,
  mode,
  subjectId,
  topicId,
  authFetch,
  onScored,
  t,
}: {
  childId: number;
  childName: string;
  mode: "basic" | "advanced";
  subjectId: string;
  topicId: string;
  authFetch: ReturnType<typeof useAuthFetch>;
  onScored: () => Promise<void>;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const subjects: SubjectPack[] =
    mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const subj = subjects.find((s) => s.id === subjectId);
  const topic: StudyTopic | undefined = subj?.topics.find(
    (tp) => tp.id === topicId,
  );

  const [practiceOpen, setPracticeOpen] = useState(false);
  const [picks, setPicks] = useState<number[]>(() =>
    topic ? Array(topic.questions.length).fill(-1) : [],
  );
  const [submitted, setSubmitted] = useState(false);
  const [xpTrigger, setXpTrigger] = useState(0);
  const [xpAmount, setXpAmount] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  if (!subj || !topic) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>
          {t("screens.study.topic_not_found")}
        </Text>
      </View>
    );
  }

  const score = topic.questions.reduce(
    (acc, q, i) => acc + (picks[i] === q.answer ? 1 : 0),
    0,
  );
  const total = topic.questions.length;
  const isPerfect = submitted && score === total && total > 0;

  const handleSubmit = async () => {
    setSubmitted(true);
    const passed = score >= Math.ceil(total * 0.6);
    if (passed) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    const { engagement } = await markTopicResult(
      childId,
      mode,
      subj.id,
      topic.id,
      score,
      total,
    );
    await onScored();

    if (engagement.xpDelta > 0) {
      setXpAmount(engagement.xpDelta);
      setXpTrigger((n) => n + 1);
    }

    // Fire-and-forget server sync
    const nowIso = new Date().toISOString();
    const perQuestion = topic.questions.map((q, i) => ({
      childId,
      subject: subj.id,
      topicId: topic.id,
      correct: picks[i] === q.answer,
      ts: nowIso,
    }));
    void authFetch("/api/smart-study/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(perQuestion),
    }).catch(() => {});
  };

  const handleSpeak = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    const text = topic.notes.replace(/\n/g, ". ");
    Speech.speak(text, {
      language: "en-IN",
      rate: 0.85,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const emoji =
    isPerfect ? "🎉" : score >= Math.ceil(total * 0.6) ? "👍" : "💪";

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <XpPopup amount={xpAmount} trigger={xpTrigger} />

      {/* Topic header */}
      <Text style={styles.topicDetailTitle}>{topic.title}</Text>
      <Text style={styles.topicDetailSubj}>
        {subj.emoji} {subj.title}
      </Text>

      {/* Notes card */}
      <View style={styles.notesCard}>
        {topic.imageExample ? (
          <View style={styles.svgContainer}>
            <SvgXml
              xml={topic.imageExample}
              width="100%"
              height={160}
            />
          </View>
        ) : null}

        <View style={styles.notesHeader}>
          <Text style={styles.notesTitle}>
            {t("screens.study.notes_title")}
          </Text>
          <Pressable
            onPress={handleSpeak}
            style={({ pressed }) => [
              styles.speakBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons
              name={speaking ? "volume-mute" : "volume-medium"}
              size={18}
              color={brand.primary}
            />
            <Text style={styles.speakBtnText}>
              {speaking
                ? t("screens.study.try_again")
                : t("screens.study.read_aloud")}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.notesText}>{topic.notes}</Text>

        <Pressable
          onPress={handleSpeak}
          style={({ pressed }) => [
            styles.amyPromptBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.amyPromptBtnText}>
            {t("screens.study.hear_amy_prompt")}
          </Text>
        </Pressable>
      </View>

      {/* Practice card */}
      <View style={styles.practiceCard}>
        <View style={styles.practiceHeader}>
          <Text style={styles.practiceTitle}>
            {t("screens.study.practice_title", { total })}
          </Text>
          {!practiceOpen && (
            <Pressable
              onPress={() => setPracticeOpen(true)}
              style={({ pressed }) => [
                styles.tryNowBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.tryNowBtnText}>
                {t("screens.study.try_now")}
              </Text>
            </Pressable>
          )}
        </View>

        {practiceOpen && (
          <>
            {topic.questions.map((q, qi) => (
              <View key={qi} style={styles.questionBlock}>
                <Text style={styles.questionText}>
                  {qi + 1}. {q.q}
                </Text>
                <View style={styles.optionGrid}>
                  {q.options.map((opt, oi) => {
                    const selected = picks[qi] === oi;
                    const correct = q.answer === oi;
                    const optStyle = !submitted
                      ? selected
                        ? styles.optionSelected
                        : styles.option
                      : correct
                        ? styles.optionCorrect
                        : selected
                          ? styles.optionWrong
                          : [styles.option, { opacity: 0.55 }];
                    return (
                      <Pressable
                        key={oi}
                        disabled={submitted}
                        onPress={() =>
                          setPicks((p) => {
                            const n = [...p];
                            n[qi] = oi;
                            return n;
                          })
                        }
                        style={({ pressed }) => [
                          optStyle,
                          pressed && !submitted && { opacity: 0.75 },
                        ]}
                      >
                        {submitted && correct && (
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={palette.green400}
                          />
                        )}
                        {submitted && !correct && selected && (
                          <Ionicons
                            name="close-circle"
                            size={14}
                            color={palette.red400}
                          />
                        )}
                        <Text style={styles.optionText}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {submitted && q.hint ? (
                  <Text style={styles.hintText}>💡 {q.hint}</Text>
                ) : null}
              </View>
            ))}

            {!submitted ? (
              <Pressable
                onPress={handleSubmit}
                disabled={picks.some((p) => p === -1)}
                style={({ pressed }) => [
                  styles.submitBtn,
                  picks.some((p) => p === -1) && { opacity: 0.5 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.submitBtnText}>
                  {t("screens.study.submit")}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.scoreRow}>
                <Text style={styles.scoreText}>
                  {t("screens.study.you_got", { score, total, emoji })}
                </Text>
                <Pressable
                  onPress={() => {
                    setPicks(Array(total).fill(-1));
                    setSubmitted(false);
                  }}
                  style={({ pressed }) => [
                    styles.retryBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons
                    name="refresh"
                    size={15}
                    color={brand.primary}
                  />
                  <Text style={styles.retryBtnText}>
                    {t("screens.study.try_again")}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ─── SmartAdaptiveCta ────────────────────────────────────────────────────────

function SmartAdaptiveCta({
  onOpen,
  t,
}: {
  onOpen: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.adaptiveCta,
        pressed && { opacity: 0.85 },
      ]}
    >
      <LinearGradient
        colors={[`${brand.primary}22`, `${ACCENT_PINK}11`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={{ fontSize: 22 }}>🧠</Text>
      <View style={{ flex: 1 }}>
        <View style={styles.adaptiveCtaRow}>
          <Text style={styles.adaptiveCtaTitle}>
            {t("screens.study.adaptive_cta_title")}
          </Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>
        <Text style={styles.adaptiveCtaSub}>
          {t("screens.study.adaptive_cta_sub")}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={brand.primary} />
    </Pressable>
  );
}

// ─── SmartSubjectPicker ──────────────────────────────────────────────────────

function SmartSubjectPicker({
  onPick,
  t,
}: {
  onPick: (subjectId: SmartSubjectId) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {t("screens.study.adaptive_pick_title")}
        </Text>
        <Text style={styles.sectionSub}>
          {t("screens.study.adaptive_pick_sub")}
        </Text>
      </View>
      <View style={styles.smartGrid}>
        {SMART_SUBJECTS.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onPick(s.id)}
            style={({ pressed }) => [
              styles.smartCard,
              pressed && { opacity: 0.82 },
            ]}
          >
            <LinearGradient
              colors={[`${brand.primary}1A`, `${ACCENT_PINK}0D`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={{ fontSize: 28 }}>{s.emoji}</Text>
            <Text style={styles.smartCardTitle}>{s.title}</Text>
            <Text style={styles.smartCardBlurb} numberOfLines={2}>
              {s.blurb}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── AdaptiveRunner ──────────────────────────────────────────────────────────

interface AdaptiveQuestion {
  id: string;
  q: string;
  options: string[];
  answer: string;
  hint?: string | null;
}

interface AdaptiveBatch {
  level: number;
  source: "ai" | "dataset";
  questions: AdaptiveQuestion[];
}

function AdaptiveRunner({
  childId,
  subjectId,
  authFetch,
  onExit,
  t,
}: {
  childId: number;
  subjectId: SmartSubjectId;
  authFetch: ReturnType<typeof useAuthFetch>;
  onExit: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const meta = SMART_SUBJECTS.find((s) => s.id === subjectId)!;

  const [questions, setQuestions] = useState<AdaptiveQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [level, setLevel] = useState(1);
  const [source, setSource] = useState<"ai" | "dataset">("dataset");
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);

  const mountedRef = useRef(true);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBatch = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setHasError(false);
    try {
      const res = await authFetch("/api/smart-study/next-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, subject: subjectId, count: 5 }),
      });
      if (!mountedRef.current) return;
      if (!res.ok) { setHasError(true); setLoading(false); return; }
      const data = (await res.json()) as AdaptiveBatch;
      if (!mountedRef.current) return;
      setQuestions(data.questions ?? []);
      setLevel(data.level);
      setSource(data.source);
      setIdx(0);
      setPickedIdx(null);
      setReveal(false);
    } catch {
      if (mountedRef.current) setHasError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [childId, subjectId, authFetch]);

  useEffect(() => {
    mountedRef.current = true;
    void loadBatch();
    return () => {
      mountedRef.current = false;
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [loadBatch]);

  const reportAttempt = useCallback(
    (q: AdaptiveQuestion, correct: boolean) => {
      void authFetch("/api/smart-study/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          subject: subjectId,
          topicId: subjectId,
          correct,
          questionId: q.id,
          ts: new Date().toISOString(),
        }),
      });
    },
    [childId, subjectId, authFetch],
  );

  const onPick = useCallback(
    (oi: number) => {
      if (reveal) return;
      const current = questions[idx];
      if (!current) return;
      setPickedIdx(oi);
      setReveal(true);
      const correct = current.options[oi] === current.answer;
      setTotalAttempted((n) => n + 1);
      if (correct) setTotalCorrect((n) => n + 1);
      reportAttempt(current, correct);
      void Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(async () => {
        const nextIdx = idx + 1;
        if (nextIdx >= questions.length) {
          await loadBatch();
          return;
        }
        if (!mountedRef.current) return;
        setIdx(nextIdx);
        setPickedIdx(null);
        setReveal(false);
      }, correct ? 900 : 1700);
    },
    [reveal, questions, idx, reportAttempt, loadBatch],
  );

  const current = questions[idx];
  const accuracy =
    totalAttempted === 0
      ? 0
      : Math.round((totalCorrect / totalAttempted) * 100);
  const progressPct =
    questions.length === 0
      ? 0
      : ((idx + (reveal ? 1 : 0)) / questions.length) * 100;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header row */}
      <View style={styles.adaptiveHeader}>
        <Text style={{ fontSize: 26 }}>{meta.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.adaptiveSubjectTitle}>{meta.title}</Text>
          <Text style={styles.adaptiveSubtitle}>
            {t("screens.study.adaptive_subtitle")}
          </Text>
        </View>
      </View>

      {/* Level + progress bar */}
      <View style={styles.adaptiveLevelRow}>
        <Text style={styles.adaptiveLevelText}>
          ✨ {t("screens.study.adaptive_level_label", { level, accuracy })}
        </Text>
        <View style={styles.adaptiveSourceBadge}>
          <Text style={styles.adaptiveSourceText}>
            {source === "ai"
              ? t("screens.study.adaptive_source_ai")
              : t("screens.study.adaptive_source_dataset")}
          </Text>
        </View>
      </View>
      <View style={styles.adaptiveProgressTrack}>
        <View
          style={[styles.adaptiveProgressFill, { width: `${progressPct}%` }]}
        />
      </View>

      {loading ? (
        <View style={[styles.completionCard, { alignItems: "center", marginTop: 16 }]}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : hasError || !current ? (
        <View style={[styles.completionCard, { alignItems: "center", marginTop: 16, gap: 12 }]}>
          <Text style={{ color: "#fff", fontSize: 14 }}>
            {t("screens.study.adaptive_error")}
          </Text>
          <Pressable
            onPress={() => void loadBatch()}
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={styles.retryBtnText}>
              {t("screens.study.adaptive_retry")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.completionCard, { marginTop: 16 }]}>
          <Text style={styles.adaptiveQuestion}>{current.q}</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {current.options.map((opt, oi) => {
              const isPicked = pickedIdx === oi;
              const isAnswer = current.answer === opt;
              const optStyle = !reveal
                ? styles.optionDefault
                : isAnswer
                  ? styles.optionCorrect
                  : isPicked
                    ? styles.optionWrong
                    : styles.optionDimmed;
              return (
                <Pressable
                  key={`${current.id}-${oi}`}
                  onPress={() => onPick(oi)}
                  disabled={reveal}
                  style={({ pressed }) => [
                    optStyle,
                    pressed && !reveal && { opacity: 0.8 },
                  ]}
                >
                  {reveal && isAnswer && (
                    <Ionicons name="checkmark-circle" size={16} color={palette.green400} />
                  )}
                  {reveal && isPicked && !isAnswer && (
                    <Ionicons name="close-circle" size={16} color={palette.red400} />
                  )}
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
          {reveal && pickedIdx !== null && current.options[pickedIdx] !== current.answer && current.hint && (
            <Text style={styles.hintText}>💡 {current.hint}</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─── SpellingBanner ───────────────────────────────────────────────────────────

function SpellingBanner({
  t,
}: {
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push("/spelling" as never)}
      style={({ pressed }) => [
        styles.spellingBanner,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={{ fontSize: 22 }}>🔤</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.spellingBannerTitle}>
          {t("screens.study.spelling_banner_title")}
        </Text>
        <Text style={styles.spellingBannerSub}>
          {t("screens.study.spelling_banner_sub")}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={brand.primary} />
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDesc: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },
  cta: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 999,
  },
  ctaText: { color: brand.primary, fontWeight: "800" },

  // ChildPicker
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  childAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  childAvatarText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  childName: { color: "#fff", fontWeight: "700", fontSize: 15 },
  childMeta: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },

  // Engagement strip
  engagementStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  engagementItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  engagementEmoji: { fontSize: 18 },
  engagementLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  engagementValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  goalTrack: {
    width: "100%",
    height: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 2,
  },
  goalFill: { height: "100%", borderRadius: 3 },

  // XP popup
  xpPopup: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    zIndex: 99,
    backgroundColor: "rgba(99,102,241,0.9)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  xpPopupText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // PlayHome
  playGrid: { padding: 16, paddingBottom: 60 },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  catCard: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  catEmoji: { fontSize: 32, marginBottom: 4 },
  catTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  catMeta: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 3 },
  catProgress: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 8,
  },
  catProgressFill: {
    height: "100%",
    backgroundColor: palette.green400,
    borderRadius: 3,
  },

  // PlayCategoryView
  catViewHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  catViewTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 20,
  },
  catViewSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 2,
  },
  itemsGrid: {
    padding: 16,
    paddingBottom: 60,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  playItem: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
  },
  playItemDone: {
    borderColor: palette.green400,
    backgroundColor: "rgba(74,222,128,0.12)",
  },
  playItemCheck: { position: "absolute", top: 8, right: 8 },
  playItemEmoji: { fontSize: 30, marginBottom: 4 },
  playItemLabel: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 2,
  },
  playItemSpeak: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
  },
  playItemBody: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    lineHeight: 14,
  },
  playItemHearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  playItemHearText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "700",
  },

  // StudyHome / Subject cards
  sectionHeader: { marginBottom: 10, marginTop: 8 },
  sectionTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },
  sectionSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 2,
  },
  subjectCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    marginBottom: 10,
    overflow: "hidden",
  },
  subjectTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  subjectMeta: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 2,
  },
  subjectProgressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 6,
  },
  subjectProgressFill: {
    height: "100%",
    backgroundColor: brand.primary,
    borderRadius: 2,
  },

  // TodaysPlanCard
  completionCard: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 14,
  },
  completionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  completionTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  completionPct: { color: "#fff", fontWeight: "800", fontSize: 14 },
  completionSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 4,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: { height: "100%", backgroundColor: palette.green400 },
  progressMeta: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 6 },

  // Plan items (now pressable, navigate to topic)
  planItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  planItemDone: { opacity: 0.6 },
  itemEmoji: { fontSize: 26 },
  itemSubject: { color: "#fff", fontWeight: "800", fontSize: 14 },
  itemTopic: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 2 },
  pillRow: {
    flexDirection: "row",
    gap: 5,
    marginTop: 6,
    flexWrap: "wrap",
  },
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  pillEasy: { backgroundColor: "rgba(52,211,153,0.25)" },
  pillMedium: { backgroundColor: "rgba(251,191,36,0.25)" },
  pillHard: { backgroundColor: "rgba(248,113,113,0.25)" },
  pillWeak: { backgroundColor: "rgba(244,114,182,0.25)" },
  pillFresh: { backgroundColor: "rgba(96,165,250,0.25)" },
  pillText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  openBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: brand.primary,
    borderRadius: 999,
  },
  openBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  // SubjectTopicList
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    marginBottom: 8,
  },
  topicTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  topicNote: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  topicBest: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    marginTop: 3,
  },

  // TopicDetail
  topicDetailTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 22,
    marginBottom: 2,
  },
  topicDetailSubj: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginBottom: 14,
  },
  notesCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginBottom: 14,
  },
  svgContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  notesTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  speakBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  notesText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 14,
    lineHeight: 22,
  },
  amyPromptBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  amyPromptBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Practice / MCQ
  practiceCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  practiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  practiceTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  tryNowBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: brand.primary,
    borderRadius: 999,
  },
  tryNowBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  questionBlock: {
    marginBottom: 16,
  },
  questionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 8,
  },
  optionGrid: { gap: 6 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  optionSelected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: brand.primary,
    backgroundColor: `${brand.primary}28`,
  },
  optionCorrect: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: palette.green400,
    backgroundColor: "rgba(74,222,128,0.15)",
  },
  optionWrong: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: palette.red400,
    backgroundColor: "rgba(248,113,113,0.15)",
  },
  optionText: { color: "#fff", fontSize: 13 },
  hintText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 6,
    fontStyle: "italic",
  },
  submitBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: brand.primary,
    marginTop: 4,
  },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  scoreText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  // Smart Adaptive CTA
  adaptiveCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${brand.primary}55`,
    overflow: "hidden",
  },
  adaptiveCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  adaptiveCtaTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  adaptiveCtaSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 2,
  },
  aiBadge: {
    backgroundColor: `${brand.primary}44`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  // Smart subject picker grid
  smartGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  smartCard: {
    width: "47%",
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  smartCardTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  smartCardBlurb: { color: "rgba(255,255,255,0.65)", fontSize: 11 },

  // Adaptive runner
  adaptiveHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  adaptiveSubjectTitle: { color: "#fff", fontWeight: "800", fontSize: 18 },
  adaptiveSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  adaptiveLevelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  adaptiveLevelText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  adaptiveSourceBadge: {
    backgroundColor: "rgba(255,210,122,0.25)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  adaptiveSourceText: { color: palette.amber400, fontSize: 11, fontWeight: "700" },
  adaptiveProgressTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginBottom: 4,
  },
  adaptiveProgressFill: {
    height: 6,
    borderRadius: 4,
    backgroundColor: brand.primary,
  },
  adaptiveQuestion: { color: "#fff", fontWeight: "800", fontSize: 18 },

  // Default option (not yet revealed)
  optionDefault: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  // Dimmed option (revealed, not picked, not answer)
  optionDimmed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    opacity: 0.5,
  },

  // Spelling banner
  spellingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.35)",
  },
  spellingBannerTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  spellingBannerSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 2,
  },
});
