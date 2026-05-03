import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  Animated, Easing, Platform, ToastAndroid, Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { router, Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { SvgXml } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { brand, brandAlpha, palette } from "@/constants/colors";
import { enqueueAttempt, flushAttemptQueue } from "@/lib/smart-study-queue";
import { useTranslation } from "react-i18next";
import {
  PLAY_CATEGORIES, BASIC_SUBJECTS, ADVANCED_SUBJECTS,
  resolveStudyMode, MODE_LABELS,
  applyEvent as applyEngagementEvent,
  emptyEngagement,
  noopApplyResult,
  viewState as freshenEngagement,
  badgeLabel,
  DAILY_GOAL_TARGET,
  type StudyMode, type SubjectPack, type StudyTopic, type PlayItem,
  type EngagementState, type ApplyResult,
  type DailyPlan, type PlanItem,
} from "@workspace/study-zone";

type Child = { id: number; name: string; age: number; ageMonths?: number; childClass?: string | null };

interface StudyProgress {
  play: Record<string, string[]>;
  basic: Record<string, Record<string, { score: number; total: number; completed: boolean }>>;
  advanced: Record<string, Record<string, { score: number; total: number; completed: boolean }>>;
  engagement: EngagementState;
}
const emptyProgress = (): StudyProgress => ({
  play: {}, basic: {}, advanced: {}, engagement: emptyEngagement(),
});
const PROG_KEY = (id: number) => `amynest:study-progress:${id}`;

async function loadProgress(id: number): Promise<StudyProgress> {
  try {
    const raw = await AsyncStorage.getItem(PROG_KEY(id));
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    const merged: StudyProgress = {
      ...emptyProgress(),
      ...parsed,
      engagement: { ...emptyEngagement(), ...(parsed.engagement ?? {}) },
    };
    merged.engagement = freshenEngagement(merged.engagement);
    return merged;
  } catch { return emptyProgress(); }
}
async function saveProgress(id: number, p: StudyProgress) {
  try { await AsyncStorage.setItem(PROG_KEY(id), JSON.stringify(p)); } catch { /* noop */ }
}

function flashToast(msg: string, title: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else if (Platform.OS === "ios") {
    Alert.alert(title, msg);
  }
}

function lightTap() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
function successTap() {
  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
function warningTap() {
  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

type View0 =
  | { kind: "child-pick" }
  | { kind: "play-home"; childId: number }
  | { kind: "play-cat"; childId: number; categoryId: string }
  | { kind: "study-home"; childId: number; mode: "basic" | "advanced" }
  | { kind: "study-subject"; childId: number; mode: "basic" | "advanced"; subjectId: string }
  | { kind: "study-topic"; childId: number; mode: "basic" | "advanced"; subjectId: string; topicId: string };

export default function StudyScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const [view, setView] = useState<View0>({ kind: "child-pick" });
  const [progress, setProgress] = useState<StudyProgress>(emptyProgress());

  useEffect(() => {
    if (view.kind === "child-pick" && children.length === 1) {
      const c = children[0];
      const m = resolveStudyMode(c.age, c.childClass);
      setView(m === "play"
        ? { kind: "play-home", childId: c.id }
        : { kind: "study-home", childId: c.id, mode: m });
    }
  }, [children, view.kind]);

  useEffect(() => {
    if ("childId" in view) loadProgress(view.childId).then(setProgress);
  }, [("childId" in view) ? view.childId : null]);

  const { speak: amySpeak, stop: amyStop } = useAmyVoice();

  useEffect(() => () => { amyStop(); }, [amyStop]);

  const child = "childId" in view ? children.find((c) => c.id === view.childId) : undefined;
  const mode: StudyMode | undefined = child ? resolveStudyMode(child.age, child.childClass) : undefined;

  const goBack = () => {
    amyStop();
    if (view.kind === "play-home" || view.kind === "study-home") {
      if (children.length > 1) setView({ kind: "child-pick" });
      else router.back();
      return;
    }
    if (view.kind === "play-cat" || view.kind === "study-subject") {
      setView(mode === "play"
        ? { kind: "play-home", childId: view.childId }
        : { kind: "study-home", childId: view.childId, mode: (view as any).mode });
      return;
    }
    if (view.kind === "study-topic") {
      setView({ kind: "study-subject", childId: view.childId, mode: view.mode, subjectId: view.subjectId });
      return;
    }
    router.back();
  };

  // Functional updater to avoid races on rapid taps; persistence happens
  // off the render path against the freshest state.
  const updateProgress = (mut: (prev: StudyProgress) => StudyProgress) => {
    if (!("childId" in view)) return;
    const childId = view.childId;
    setProgress((prev) => {
      const next = mut(prev);
      saveProgress(childId, next);
      return next;
    });
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={theme.gradient}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={[palette.indigo500, brand.purple500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t("screens.study.title")}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {child ? `${child.name} · ${mode ? MODE_LABELS[mode].title : ""}` : t("screens.study.pick_child_subtitle")}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
        {isLoading ? (
          <ActivityIndicator color={palette.indigo500} style={{ marginTop: 24 }} />
        ) : children.length === 0 ? (
          <EmptyChildren />
        ) : view.kind === "child-pick" ? (
          <ChildPicker children={children} onPick={(c) => {
            const m = resolveStudyMode(c.age, c.childClass);
            setView(m === "play"
              ? { kind: "play-home", childId: c.id }
              : { kind: "study-home", childId: c.id, mode: m });
          }} />
        ) : view.kind === "play-home" ? (
          <>
            <EngagementStrip engagement={progress.engagement} />
            <PlayHome
              progress={progress}
              onOpen={(catId) => setView({ kind: "play-cat", childId: view.childId, categoryId: catId })}
            />
          </>
        ) : view.kind === "play-cat" ? (
          <PlayCategoryView
            categoryId={view.categoryId}
            progress={progress}
            onItemTap={(item, catId) => {
              void amySpeak(item.speak);
              lightTap();
              let result: ApplyResult | null = null;
              updateProgress((prev) => {
                const set = new Set(prev.play[catId] ?? []);
                // Idempotent: only award engagement on the first tap of an item.
                const wasNew = !set.has(item.id);
                set.add(item.id);
                const eventResult = wasNew
                  ? applyEngagementEvent(prev.engagement, {
                      kind: "play-tap", categoryId: catId, itemId: item.id,
                    })
                  : noopApplyResult(prev.engagement);
                result = eventResult;
                return {
                  ...prev,
                  play: { ...prev.play, [catId]: Array.from(set) },
                  engagement: eventResult.next,
                };
              });
              return result;
            }}
          />
        ) : view.kind === "study-home" ? (
          <>
            <EngagementStrip engagement={progress.engagement} />
            <TodaysPlanSection
              childId={view.childId}
              childName={child?.name ?? ""}
              onOpen={(item) => setView({
                kind: "study-topic",
                childId: view.childId,
                mode: item.mode,
                subjectId: item.subject,
                topicId: item.topicId,
              })}
            />
            <StudyHome mode={view.mode} progress={progress} onOpen={(sid) =>
              setView({ kind: "study-subject", childId: view.childId, mode: view.mode, subjectId: sid })
            } />
          </>
        ) : view.kind === "study-subject" ? (
          <SubjectTopicList
            mode={view.mode}
            subjectId={view.subjectId}
            progress={progress}
            onOpen={(tid) => setView({
              kind: "study-topic", childId: view.childId, mode: view.mode, subjectId: view.subjectId, topicId: tid,
            })}
          />
        ) : (
          <TopicDetail
            mode={view.mode}
            subjectId={view.subjectId}
            topicId={view.topicId}
            onScored={(score, total) => {
              const m = view.mode;
              const sid = view.subjectId;
              const tid = view.topicId;
              const cid = view.childId;
              const passed = score >= Math.ceil(total * 0.6);
              // Persist the attempt locally first so a flaky network
              // never loses data, then flush. Anything still queued
              // (offline, 5xx) replays on next mount of TodaysPlanSection.
              (async () => {
                await enqueueAttempt({
                  childId: cid, subject: sid, topicId: tid, correct: passed,
                });
                await flushAttemptQueue(authFetch);
              })();
              let result: ApplyResult | null = null;
              updateProgress((prev) => {
                const subj = { ...(prev[m][sid] ?? {}) };
                const existing = subj[tid];
                const wasCompleted = existing?.completed === true;
                const wasPerfect = existing?.score === total && total > 0;
                const best = existing ? Math.max(existing.score, score) : score;
                const willBeCompleted = best >= Math.ceil(total * 0.6);
                subj[tid] = { score: best, total, completed: willBeCompleted };
                // Idempotent: only award engagement when the topic newly clears
                // the pass bar OR newly hits a perfect score. Re-runs are silent.
                const isNewCompletion = !wasCompleted && willBeCompleted;
                const isNewPerfect = !wasPerfect && score === total && total > 0;
                const eventResult = (isNewCompletion || isNewPerfect)
                  ? applyEngagementEvent(prev.engagement, {
                      kind: "topic-result",
                      mode: m,
                      subjectId: sid,
                      topicId: tid,
                      score, total,
                    })
                  : noopApplyResult(prev.engagement);
                result = eventResult;
                return {
                  ...prev,
                  [m]: { ...prev[m], [sid]: subj },
                  engagement: eventResult.next,
                };
              });
              return result;
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-views ───────────────────────────────────────────────────────────────

function EmptyChildren() {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t("screens.study.no_children_title")}</Text>
      <Text style={styles.cardDesc}>{t("screens.study.no_children_desc")}</Text>
      <Pressable style={styles.primaryBtn} onPress={() => router.push("/children/new" as never)}>
        <Text style={styles.primaryBtnText}>{t("screens.study.add_child_btn")}</Text>
      </Pressable>
    </View>
  );
}

function ChildPicker({ children, onPick }: { children: Child[]; onPick: (c: Child) => void }) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: 10 }}>
      {children.map((c) => {
        const m = resolveStudyMode(c.age, c.childClass);
        const label = MODE_LABELS[m];
        return (
          <Pressable key={c.id} style={styles.row} onPress={() => onPick(c)}>
            <Text style={{ fontSize: 26 }}>{label.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{c.name}</Text>
              <Text style={styles.rowDesc}>
                {c.childClass
                  ? t("screens.study.child_meta_class", { age: c.age, cls: c.childClass, title: label.title })
                  : t("screens.study.child_meta", { age: c.age, title: label.title })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.slate400} />
          </Pressable>
        );
      })}
    </View>
  );
}

function PlayHome({ progress, onOpen }: { progress: StudyProgress; onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.grid2}>
      {PLAY_CATEGORIES.map((cat) => {
        const done = progress.play[cat.id]?.length ?? 0;
        const pct = cat.items.length === 0 ? 0 : Math.round((done / cat.items.length) * 100);
        return (
          <Pressable key={cat.id} style={styles.tile} onPress={() => onOpen(cat.id)}>
            <Text style={{ fontSize: 28 }}>{cat.emoji}</Text>
            <Text style={styles.tileTitle}>{cat.title}</Text>
            <Text style={styles.tileMeta}>{t("screens.study.done_count", { done, total: cat.items.length })}</Text>
            <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
          </Pressable>
        );
      })}
    </View>
  );
}

function PlayCategoryView({
  categoryId, progress, onItemTap,
}: {
  categoryId: string;
  progress: StudyProgress;
  onItemTap: (item: PlayItem, categoryId: string) => ApplyResult | null;
}) {
  const { t } = useTranslation();
  const cat = PLAY_CATEGORIES.find((c) => c.id === (categoryId as any));
  const [xpAmount, setXpAmount] = useState(0);
  const [xpKey, setXpKey] = useState(0);
  const [poppedId, setPoppedId] = useState<string | null>(null);
  if (!cat) return <Text>{t("screens.study.category_not_found")}</Text>;
  const done = new Set(progress.play[cat.id] ?? []);
  const isRhyme = cat.id === "rhymes";
  const handleTap = (item: PlayItem) => {
    setPoppedId(item.id);
    setTimeout(() => setPoppedId((v) => (v === item.id ? null : v)), 400);
    const res = onItemTap(item, cat.id);
    if (res && res.xpDelta > 0) {
      setXpAmount(res.xpDelta);
      setXpKey((k) => k + 1);
    }
    if (res?.streakIncreased && res.next.streak > 1) {
      flashToast(t("screens.study.toast_streak", { n: res.next.streak }), t("screens.study.alert_title"));
    } else if (res && res.newBadges.length > 0) {
      flashToast(t("screens.study.toast_badge"), t("screens.study.alert_title"));
    }
  };
  return (
    <View>
      <XpPopup amount={xpAmount} triggerKey={xpKey} />
      <Text style={styles.h2}>{cat.emoji}  {cat.title}</Text>
      <View style={styles.grid2}>
        {cat.items.map((item) => {
          const isDone = done.has(item.id);
          return (
            <PlayItemCard
              key={item.id}
              item={item}
              isDone={isDone}
              isPopping={poppedId === item.id}
              isRhyme={isRhyme}
              onPress={() => handleTap(item)}
            />
          );
        })}
      </View>
    </View>
  );
}

function PlayItemCard({
  item, isDone, isPopping, isRhyme, onPress,
}: {
  item: PlayItem;
  isDone: boolean;
  isPopping: boolean;
  isRhyme: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;
  const emojiScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isPopping) return;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(emojiScale, { toValue: 1.4, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(emojiScale, { toValue: 1, duration: 220, easing: Easing.elastic(1.5), useNativeDriver: true }),
      ]),
    ]).start();
  }, [isPopping, scale, emojiScale]);
  return (
    <Animated.View style={{ width: "47.5%", transform: [{ scale }] }}>
      <Pressable
        style={[styles.playCard, { width: "100%", borderColor: isDone ? palette.emerald400 : palette.indigo200 }]}
        onPress={onPress}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Animated.Text style={{ fontSize: 32, transform: [{ scale: emojiScale }] }}>
            {item.emoji ?? ""}
          </Animated.Text>
          {isDone && <Ionicons name="checkmark-circle" size={18} color={palette.green600} />}
        </View>
        <Text style={styles.playLabel}>{item.label}</Text>
        <Text style={styles.playSub} numberOfLines={isRhyme ? 3 : 2}>
          {isRhyme && item.body ? item.body : item.speak}
        </Text>
        <View style={styles.tapHint}>
          <Ionicons name="volume-high" size={11} color={palette.indigo500} />
          <Text style={styles.tapHintText}>{t("screens.study.tap_to_hear")}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function StudyHome({
  mode, progress, onOpen,
}: { mode: "basic" | "advanced"; progress: StudyProgress; onOpen: (sid: string) => void }) {
  const { t } = useTranslation();
  const subjects: SubjectPack[] = mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  return (
    <View style={{ gap: 10 }}>
      {subjects.map((s) => {
        const completed = Object.values(progress[mode][s.id] ?? {}).filter((tp) => tp.completed).length;
        const pct = s.topics.length === 0 ? 0 : Math.round((completed / s.topics.length) * 100);
        return (
          <Pressable key={s.id} style={styles.row} onPress={() => onOpen(s.id)}>
            <Text style={{ fontSize: 28 }}>{s.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{s.title}</Text>
              <Text style={styles.rowDesc}>{t("screens.study.topics_count", { done: completed, total: s.topics.length })}</Text>
              <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.slate400} />
          </Pressable>
        );
      })}
    </View>
  );
}

function SubjectTopicList({
  mode, subjectId, progress, onOpen,
}: {
  mode: "basic" | "advanced";
  subjectId: string;
  progress: StudyProgress;
  onOpen: (tid: string) => void;
}) {
  const { t } = useTranslation();
  const subjects: SubjectPack[] = mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const subj = subjects.find((s) => s.id === subjectId);
  if (!subj) return <Text>{t("screens.study.subject_not_found")}</Text>;
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.h2}>{subj.emoji}  {subj.title}</Text>
      {subj.topics.map((tp) => {
        const stat = progress[mode][subj.id]?.[tp.id];
        return (
          <Pressable key={tp.id} style={styles.row} onPress={() => onOpen(tp.id)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{tp.title}</Text>
              <Text style={styles.rowDesc} numberOfLines={1}>{tp.notes.split("\n")[0]}</Text>
              {stat && (
                <Text style={[styles.rowDesc, { color: palette.indigo500, marginTop: 2 }]}>
                  {t("screens.study.best_score", { score: stat.score, total: stat.total })}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.slate400} />
          </Pressable>
        );
      })}
    </View>
  );
}

function TopicDetail({
  mode, subjectId, topicId, onScored,
}: {
  mode: "basic" | "advanced";
  subjectId: string;
  topicId: string;
  onScored: (score: number, total: number) => ApplyResult | null;
}) {
  const { t } = useTranslation();
  const subjects: SubjectPack[] = mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const subj = subjects.find((s) => s.id === subjectId);
  const topic: StudyTopic | undefined = subj?.topics.find((tp) => tp.id === topicId);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [picks, setPicks] = useState<number[]>(() => topic ? Array(topic.questions.length).fill(-1) : []);
  const [submitted, setSubmitted] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const [xpKey, setXpKey] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const { speak: amySpeak, stop: amyStop } = useAmyVoice();
  useEffect(() => () => { amyStop(); }, [amyStop]);
  if (!subj || !topic) return <Text>{t("screens.study.topic_not_found")}</Text>;

  const total = topic.questions.length;
  const score = topic.questions.reduce((acc, q, i) => acc + (picks[i] === q.answer ? 1 : 0), 0);
  const isPerfect = submitted && score === total && total > 0;
  const submit = () => {
    setSubmitted(true);
    const res = onScored(score, total);
    const perfect = score === total && total > 0;
    const passed = score >= Math.ceil(total * 0.6);
    if (perfect) {
      successTap();
      setConfettiKey((k) => k + 1);
    } else if (passed) {
      successTap();
    } else {
      warningTap();
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
    if (res && res.xpDelta > 0) {
      setXpAmount(res.xpDelta);
      setXpKey((k) => k + 1);
    }
    if (res?.streakIncreased && res.next.streak > 1) {
      flashToast(t("screens.study.toast_streak", { n: res.next.streak }), t("screens.study.alert_title"));
    } else if (res?.goalReached) {
      flashToast(t("screens.study.toast_goal"), t("screens.study.alert_title"));
    } else if (res && res.newBadges.some((b) => b.startsWith("perfect-"))) {
      flashToast(t("screens.study.toast_perfect"), t("screens.study.alert_title"));
    }
  };
  const reset = () => { setPicks(Array(total).fill(-1)); setSubmitted(false); };

  return (
    <View style={{ gap: 12 }}>
      <XpPopup amount={xpAmount} triggerKey={xpKey} />
      <ConfettiBurst triggerKey={confettiKey} />
      <View>
        <Text style={styles.h1}>{topic.title}</Text>
        <Text style={styles.rowDesc}>{subj.emoji} {subj.title}</Text>
      </View>

      {topic.imageExample && (
        <View style={styles.imageWrap}>
          <SvgXml xml={topic.imageExample} width="100%" height={180} />
        </View>
      )}

      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={styles.cardTitle}>{t("screens.study.notes_title")}</Text>
          <Pressable
            style={styles.outlineBtn}
            onPress={() => void amySpeak(topic.notes.replace(/\n/g, ". "))}
          >
            <Ionicons name="volume-high" size={14} color={palette.indigo500} />
            <Text style={styles.outlineBtnText}>{t("screens.study.read_aloud")}</Text>
          </Pressable>
        </View>
        <Text style={styles.notes}>{topic.notes}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => void amySpeak(topic.amyPrompt)}
          >
            <Text style={styles.secondaryBtnText}>{t("screens.study.hear_amy_prompt")}</Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={() => router.push("/amy-ai" as never)}>
            <Text style={styles.ghostBtnText}>{t("screens.study.ask_amy_more")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={styles.cardTitle}>{t("screens.study.practice_title", { total })}</Text>
          {!practiceOpen && (
            <Pressable style={styles.primaryBtn} onPress={() => setPracticeOpen(true)}>
              <Text style={styles.primaryBtnText}>{t("screens.study.try_now")}</Text>
            </Pressable>
          )}
        </View>
        {practiceOpen && (
          <Animated.View style={{ gap: 12, transform: [{ translateX: shakeAnim }] }}>
            {topic.questions.map((q, qi) => (
              <View key={qi} style={styles.qBox}>
                <Text style={styles.qText}>{qi + 1}. {q.q}</Text>
                <View style={{ gap: 6, marginTop: 8 }}>
                  {q.options.map((opt, oi) => {
                    const selected = picks[qi] === oi;
                    const correct = q.answer === oi;
                    let bg: string = "#fff", border: string = palette.gray200;
                    if (!submitted && selected) { bg = palette.indigo50; border = palette.indigo500; }
                    if (submitted) {
                      if (correct) { bg = palette.emerald50; border = palette.emerald500; }
                      else if (selected) { bg = palette.red50; border = palette.red500; }
                    }
                    return (
                      <Pressable
                        key={oi}
                        disabled={submitted}
                        onPress={() => setPicks((p) => { const n = [...p]; n[qi] = oi; return n; })}
                        style={[styles.opt, { backgroundColor: bg, borderColor: border }]}
                      >
                        <Text style={styles.optText}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {submitted && q.hint && <Text style={styles.qHint}>💡 {q.hint}</Text>}
              </View>
            ))}
            {!submitted ? (
              <Pressable
                style={[styles.primaryBtn, picks.some((p) => p === -1) && { opacity: 0.5 }]}
                disabled={picks.some((p) => p === -1)}
                onPress={submit}
              >
                <Text style={styles.primaryBtnText}>{t("screens.study.submit")}</Text>
              </Pressable>
            ) : (
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <Text style={[styles.cardTitle, isPerfect && { color: palette.amber600 }]}>
                  {t("screens.study.you_got", {
                    score,
                    total,
                    emoji: score === total ? "🎉" : score >= Math.ceil(total * 0.6) ? "👍" : "💪",
                  })}
                </Text>
                <Pressable style={styles.outlineBtn} onPress={reset}>
                  <Ionicons name="refresh" size={14} color={palette.indigo500} />
                  <Text style={styles.outlineBtnText}>{t("screens.study.try_again")}</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ─── Engagement components ───────────────────────────────────────────────────

function TodaysPlanSection({
  childId, childName, onOpen,
}: {
  childId: number;
  childName: string;
  onOpen: (item: PlanItem) => void;
}) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [completionPct, setCompletionPct] = useState(0);
  const [doneTopicIds, setDoneTopicIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      // Reconcile any attempts captured offline before asking for today's
      // plan, so the response reflects them.
      try { await flushAttemptQueue(authFetch); } catch { /* ignore */ }
      try {
        const r = await authFetch("/api/smart-study/daily-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId }),
        });
        if (!r.ok) { if (!cancelled) setLoading(false); return; }
        const data = (await r.json()) as { plan: DailyPlan; completionPct: number; doneTopicIds: string[] };
        if (cancelled) return;
        setPlan(data.plan);
        setCompletionPct(data.completionPct);
        setDoneTopicIds(new Set(data.doneTopicIds));
      } catch { /* falls back to subject grid */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [childId, authFetch]);

  if (loading || !plan) return null;

  return (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <Text style={styles.planTitle}>✨ {t("screens.study.todays_plan")}</Text>
        <Text style={styles.planPct}>{t("screens.study.plan_completion", { pct: completionPct })}</Text>
      </View>
      <Text style={styles.planSub}>{t("screens.study.todays_plan_subtitle", { name: childName })}</Text>
      {plan.items.length === 0 ? (
        <Text style={styles.planEmpty}>{t("screens.study.todays_plan_empty")}</Text>
      ) : (
        <View style={{ gap: 8, marginTop: 10 }}>
          {plan.items.map((it) => {
            const done = doneTopicIds.has(it.topicId);
            return (
              <Pressable
                key={it.id}
                onPress={() => { lightTap(); onOpen(it); }}
                style={styles.planItem}
              >
                <Text style={{ fontSize: 22 }}>{it.subjectEmoji}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.planItemTitle} numberOfLines={1}>{it.topicTitle}</Text>
                  <View style={styles.planItemMetaRow}>
                    <Text style={styles.planItemSubject}>{it.subjectTitle}</Text>
                    <Text style={styles.planDot}>·</Text>
                    <View style={[styles.planChip, { backgroundColor: palette.indigo50 }]}>
                      <Text style={[styles.planChipText, { color: palette.indigo700 }]}>
                        {t(`screens.study.plan_difficulty_${it.difficulty}`)}
                      </Text>
                    </View>
                    <View style={[styles.planChip, { backgroundColor: palette.amber100 }]}>
                      <Text style={[styles.planChipText, { color: palette.amber700 }]}>
                        {t(`screens.study.plan_source_${it.source}`)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons
                  name={done ? "checkmark-circle" : "chevron-forward"}
                  size={20}
                  color={done ? palette.emerald500 : palette.slate500}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function EngagementStrip({ engagement }: { engagement: EngagementState }) {
  const { t } = useTranslation();
  const goalPct = Math.min(100, Math.round((engagement.goalProgress / DAILY_GOAL_TARGET) * 100));
  const recentBadges = engagement.badges.slice(-6).reverse();
  return (
    <View style={styles.engStrip}>
      <View style={styles.engRow}>
        <View style={styles.engStat}>
          <Text style={{ fontSize: 16 }}>🔥</Text>
          <Text style={styles.engStatLabel}>{t("screens.study.label_streak")}</Text>
          <View style={[styles.engPill, { backgroundColor: palette.orange100 }]}>
            <Text style={[styles.engPillText, { color: palette.orange700 }]}>
              {t("screens.study.streak_unit_d", { n: engagement.streak })}
            </Text>
          </View>
        </View>
        <View style={styles.engStat}>
          <Text style={{ fontSize: 16 }}>⭐</Text>
          <Text style={styles.engStatLabel}>{t("screens.study.label_xp")}</Text>
          <View style={[styles.engPill, { backgroundColor: palette.amber100 }]}>
            <Text style={[styles.engPillText, { color: palette.amber700 }]}>
              {engagement.xp}
            </Text>
          </View>
        </View>
        <GoalRing pct={goalPct} done={engagement.goalProgress} target={DAILY_GOAL_TARGET} />
      </View>
      {recentBadges.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingTop: 8 }}
        >
          <Text style={{ fontSize: 12, alignSelf: "center", marginRight: 2 }}>🏆</Text>
          {recentBadges.map((id) => {
            const b = badgeLabel(id);
            if (!b) return null;
            return (
              <View key={id} style={styles.engBadge}>
                <Text style={styles.engBadgeEmoji}>{b.emoji}</Text>
                <Text style={styles.engBadgeText}>{b.label}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function GoalRing({ pct, done, target }: { pct: number; done: number; target: number }) {
  // Simple ring effect: outer circle fills proportionally with a coloured arc
  // approximated by rotating an inner overlay. Lightweight (no SVG).
  return (
    <View style={styles.goalRing}>
      <View style={[styles.goalRingFill, { borderTopColor: palette.indigo500, borderRightColor: pct > 25 ? palette.indigo500 : palette.indigo200, borderBottomColor: pct > 50 ? palette.indigo500 : palette.indigo200, borderLeftColor: pct > 75 ? palette.indigo500 : palette.indigo200 }]} />
      <View style={styles.goalRingInner}>
        <Text style={styles.goalRingText}>🎯</Text>
        <Text style={styles.goalRingNum}>{done}/{target}</Text>
      </View>
    </View>
  );
}

function XpPopup({ amount, triggerKey }: { amount: number; triggerKey: number }) {
  const { t } = useTranslation();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (triggerKey === 0 || amount <= 0) return;
    opacity.setValue(0);
    translateY.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(450),
        Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.timing(translateY, { toValue: -38, duration: 980, useNativeDriver: true }),
    ]).start();
  }, [triggerKey, amount, opacity, translateY]);
  if (triggerKey === 0 || amount <= 0) return null;
  return (
    <View pointerEvents="none" style={styles.xpPopupWrap}>
      <Animated.View style={[styles.xpPopup, { opacity, transform: [{ translateY }] }]}>
        <Text style={styles.xpPopupText}>{t("screens.study.xp_popup", { amount })}</Text>
      </Animated.View>
    </View>
  );
}

function ConfettiBurst({ triggerKey }: { triggerKey: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const dist = 90 + Math.random() * 60;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          rot: Math.random() * 360,
          emoji: ["🎉", "✨", "⭐", "🎊", "💫", "🌟"][i % 6],
          delay: Math.random() * 80,
        };
      }),
    [],
  );
  const animValues = useRef(pieces.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (triggerKey === 0) return;
    animValues.forEach((v) => v.setValue(0));
    Animated.stagger(
      30,
      animValues.map((v, i) =>
        Animated.timing(v, { toValue: 1, duration: 1100, delay: pieces[i].delay, useNativeDriver: true }),
      ),
    ).start();
  }, [triggerKey, animValues, pieces]);
  if (triggerKey === 0) return null;
  return (
    <View pointerEvents="none" style={styles.confettiWrap}>
      {pieces.map((p, i) => {
        const v = animValues[i];
        return (
          <Animated.Text
            key={`${triggerKey}-${i}`}
            style={[
              styles.confettiPiece,
              {
                opacity: v.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] }) },
                  { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, p.y] }) },
                  { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.rot}deg`] }) },
                ],
              },
            ]}
          >
            {p.emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.slate50 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  card: { backgroundColor: "#fff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: palette.gray200 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: palette.slate900 },
  cardDesc: { fontSize: 13, color: palette.slate500, marginTop: 6 },
  notes: { fontSize: 14, color: palette.slate900, lineHeight: 22 },
  h1: { fontSize: 22, fontWeight: "800", color: palette.slate900 },
  h2: { fontSize: 18, fontWeight: "800", color: palette.slate900, marginBottom: 8 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: palette.gray200 },
  rowTitle: { fontSize: 15, fontWeight: "800", color: palette.slate900 },
  rowDesc: { fontSize: 12, color: palette.slate500, marginTop: 2 },

  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "47.5%", backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: palette.gray200, gap: 4 },
  tileTitle: { fontSize: 14, fontWeight: "800", color: palette.slate900 },
  tileMeta: { fontSize: 11, color: palette.slate500 },

  playCard: { width: "47.5%", backgroundColor: "#fff", borderRadius: 16, padding: 12, borderWidth: 2, gap: 4 },
  playLabel: { fontSize: 16, fontWeight: "800", color: palette.slate900 },
  playSub: { fontSize: 11, color: palette.slate500 },
  tapHint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  tapHintText: { fontSize: 10, color: palette.indigo500, fontWeight: "700" },

  barTrack: { height: 6, backgroundColor: palette.gray200, borderRadius: 3, overflow: "hidden", marginTop: 6 },
  barFill: { height: "100%", backgroundColor: palette.indigo500 },

  primaryBtn: { backgroundColor: palette.indigo500, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  secondaryBtn: { backgroundColor: palette.indigo50, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  secondaryBtnText: { color: palette.indigo700, fontWeight: "700", fontSize: 12 },
  ghostBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  ghostBtnText: { color: palette.indigo500, fontWeight: "700", fontSize: 12 },
  outlineBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: palette.indigo200, backgroundColor: "#fff" },
  outlineBtnText: { color: palette.indigo500, fontWeight: "700", fontSize: 12 },

  qBox: { borderWidth: 1, borderColor: palette.gray200, borderRadius: 12, padding: 12 },
  qText: { fontSize: 14, fontWeight: "700", color: palette.slate900 },
  qHint: { fontSize: 12, color: palette.slate500, marginTop: 8 },
  opt: { borderWidth: 2, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  optText: { fontSize: 13, color: palette.slate900 },

  emptyTitle: { fontSize: 16, fontWeight: "800", color: palette.slate900 },
  emptyDesc: { fontSize: 13, color: palette.slate500, marginTop: 4 },

  imageWrap: { backgroundColor: "#fff", borderRadius: 16, padding: 8, borderWidth: 1, borderColor: palette.gray200, overflow: "hidden" },

  // Today's Plan
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: brandAlpha.indigo500_20,
    marginBottom: 4,
  },
  planHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planTitle: { fontSize: 15, fontWeight: "800", color: palette.slate900 },
  planPct: { fontSize: 11, color: palette.slate500, fontWeight: "700" },
  planSub: { fontSize: 12, color: palette.slate500, marginTop: 2 },
  planEmpty: { fontSize: 13, color: palette.slate500, marginTop: 10 },
  planItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: "#fff",
  },
  planItemTitle: { fontSize: 14, fontWeight: "800", color: palette.slate900 },
  planItemMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" },
  planItemSubject: { fontSize: 11, color: palette.slate500 },
  planDot: { fontSize: 11, color: palette.slate500 },
  planChip: { paddingVertical: 1, paddingHorizontal: 6, borderRadius: 999 },
  planChipText: { fontSize: 10, fontWeight: "800" },

  // Engagement strip
  engStrip: {
    backgroundColor: brandAlpha.indigo500_08,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: brandAlpha.indigo500_20,
    padding: 12,
    marginBottom: 4,
  },
  engRow: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  engStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  engStatLabel: { fontSize: 10, fontWeight: "700", color: palette.slate500, letterSpacing: 0.6 },
  engPill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  engPillText: { fontSize: 11, fontWeight: "800" },
  engBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fff",
    borderColor: brandAlpha.indigo500_20,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  engBadgeEmoji: { fontSize: 11 },
  engBadgeText: { fontSize: 10, fontWeight: "700", color: palette.indigo700 },

  // Goal ring (lightweight)
  goalRing: {
    marginLeft: "auto",
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  goalRingFill: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: palette.indigo200,
    transform: [{ rotate: "-90deg" }],
  },
  goalRingInner: { alignItems: "center", justifyContent: "center" },
  goalRingText: { fontSize: 12 },
  goalRingNum: { fontSize: 9, fontWeight: "800", color: palette.indigo700, marginTop: -1 },

  // XP popup
  xpPopupWrap: {
    position: "absolute",
    top: -10,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  xpPopup: {
    backgroundColor: palette.amber400,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  xpPopupText: { color: palette.amber800, fontWeight: "800", fontSize: 13 },

  // Confetti burst
  confettiWrap: {
    position: "absolute",
    top: "30%",
    left: 0,
    right: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
  },
  confettiPiece: { position: "absolute", fontSize: 22 },
});
