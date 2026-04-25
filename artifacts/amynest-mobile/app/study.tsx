import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { SvgXml } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import {
  PLAY_CATEGORIES, BASIC_SUBJECTS, ADVANCED_SUBJECTS,
  resolveStudyMode, MODE_LABELS,
  type StudyMode, type SubjectPack, type StudyTopic, type PlayItem,
} from "@workspace/study-zone";

type Child = { id: number; name: string; age: number; ageMonths?: number; childClass?: string | null };

interface StudyProgress {
  play: Record<string, string[]>;
  basic: Record<string, Record<string, { score: number; total: number; completed: boolean }>>;
  advanced: Record<string, Record<string, { score: number; total: number; completed: boolean }>>;
}
const emptyProgress = (): StudyProgress => ({ play: {}, basic: {}, advanced: {} });
const PROG_KEY = (id: number) => `amynest:study-progress:${id}`;

async function loadProgress(id: number): Promise<StudyProgress> {
  try {
    const raw = await AsyncStorage.getItem(PROG_KEY(id));
    if (!raw) return emptyProgress();
    return { ...emptyProgress(), ...JSON.parse(raw) };
  } catch { return emptyProgress(); }
}
async function saveProgress(id: number, p: StudyProgress) {
  try { await AsyncStorage.setItem(PROG_KEY(id), JSON.stringify(p)); } catch { /* noop */ }
}

type View0 =
  | { kind: "child-pick" }
  | { kind: "play-home"; childId: number }
  | { kind: "play-cat"; childId: number; categoryId: string }
  | { kind: "study-home"; childId: number; mode: "basic" | "advanced" }
  | { kind: "study-subject"; childId: number; mode: "basic" | "advanced"; subjectId: string }
  | { kind: "study-topic"; childId: number; mode: "basic" | "advanced"; subjectId: string; topicId: string };

export default function StudyScreen() {
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
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#6366F1", "#A855F7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>📚 Smart Study Zone</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {child ? `${child.name} · ${mode ? MODE_LABELS[mode].title : ""}` : "Pick a child to begin"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
        {isLoading ? (
          <ActivityIndicator color="#6366F1" style={{ marginTop: 24 }} />
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
          <PlayHome
            progress={progress}
            onOpen={(catId) => setView({ kind: "play-cat", childId: view.childId, categoryId: catId })}
          />
        ) : view.kind === "play-cat" ? (
          <PlayCategoryView
            categoryId={view.categoryId}
            progress={progress}
            onItemTap={(item, catId) => {
              void amySpeak(item.speak);
              updateProgress((prev) => {
                const set = new Set(prev.play[catId] ?? []);
                set.add(item.id);
                return { ...prev, play: { ...prev.play, [catId]: Array.from(set) } };
              });
            }}
          />
        ) : view.kind === "study-home" ? (
          <StudyHome mode={view.mode} progress={progress} onOpen={(sid) =>
            setView({ kind: "study-subject", childId: view.childId, mode: view.mode, subjectId: sid })
          } />
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
              updateProgress((prev) => {
                const subj = { ...(prev[m][sid] ?? {}) };
                const existing = subj[tid];
                const best = existing ? Math.max(existing.score, score) : score;
                subj[tid] = { score: best, total, completed: best >= Math.ceil(total * 0.6) };
                return { ...prev, [m]: { ...prev[m], [sid]: subj } };
              });
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-views ───────────────────────────────────────────────────────────────

function EmptyChildren() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>No children added yet</Text>
      <Text style={styles.cardDesc}>Add a child profile to start using the Smart Study Zone.</Text>
      <Pressable style={styles.primaryBtn} onPress={() => router.push("/children/new" as never)}>
        <Text style={styles.primaryBtnText}>Add a child</Text>
      </Pressable>
    </View>
  );
}

function ChildPicker({ children, onPick }: { children: Child[]; onPick: (c: Child) => void }) {
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
                {c.age} yr{c.childClass ? ` · Class ${c.childClass}` : ""} · {label.title}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </Pressable>
        );
      })}
    </View>
  );
}

function PlayHome({ progress, onOpen }: { progress: StudyProgress; onOpen: (id: string) => void }) {
  return (
    <View style={styles.grid2}>
      {PLAY_CATEGORIES.map((cat) => {
        const done = progress.play[cat.id]?.length ?? 0;
        const pct = cat.items.length === 0 ? 0 : Math.round((done / cat.items.length) * 100);
        return (
          <Pressable key={cat.id} style={styles.tile} onPress={() => onOpen(cat.id)}>
            <Text style={{ fontSize: 28 }}>{cat.emoji}</Text>
            <Text style={styles.tileTitle}>{cat.title}</Text>
            <Text style={styles.tileMeta}>{done}/{cat.items.length} done</Text>
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
  onItemTap: (item: PlayItem, categoryId: string) => void;
}) {
  const cat = PLAY_CATEGORIES.find((c) => c.id === (categoryId as any));
  if (!cat) return <Text>Category not found.</Text>;
  const done = new Set(progress.play[cat.id] ?? []);
  const isRhyme = cat.id === "rhymes";
  return (
    <View>
      <Text style={styles.h2}>{cat.emoji}  {cat.title}</Text>
      <View style={styles.grid2}>
        {cat.items.map((item) => {
          const isDone = done.has(item.id);
          return (
            <Pressable
              key={item.id}
              style={[styles.playCard, { borderColor: isDone ? "#34d399" : "#c7d2fe" }]}
              onPress={() => onItemTap(item, cat.id)}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 32 }}>{item.emoji ?? ""}</Text>
                {isDone && <Ionicons name="checkmark-circle" size={18} color="#16a34a" />}
              </View>
              <Text style={styles.playLabel}>{item.label}</Text>
              <Text style={styles.playSub} numberOfLines={isRhyme ? 3 : 2}>
                {isRhyme && item.body ? item.body : item.speak}
              </Text>
              <View style={styles.tapHint}>
                <Ionicons name="volume-high" size={11} color="#6366F1" />
                <Text style={styles.tapHintText}>Tap to hear</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StudyHome({
  mode, progress, onOpen,
}: { mode: "basic" | "advanced"; progress: StudyProgress; onOpen: (sid: string) => void }) {
  const subjects: SubjectPack[] = mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  return (
    <View style={{ gap: 10 }}>
      {subjects.map((s) => {
        const completed = Object.values(progress[mode][s.id] ?? {}).filter((t) => t.completed).length;
        const pct = s.topics.length === 0 ? 0 : Math.round((completed / s.topics.length) * 100);
        return (
          <Pressable key={s.id} style={styles.row} onPress={() => onOpen(s.id)}>
            <Text style={{ fontSize: 28 }}>{s.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{s.title}</Text>
              <Text style={styles.rowDesc}>{completed}/{s.topics.length} topics</Text>
              <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
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
  const subjects: SubjectPack[] = mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const subj = subjects.find((s) => s.id === subjectId);
  if (!subj) return <Text>Subject not found.</Text>;
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.h2}>{subj.emoji}  {subj.title}</Text>
      {subj.topics.map((t) => {
        const stat = progress[mode][subj.id]?.[t.id];
        return (
          <Pressable key={t.id} style={styles.row} onPress={() => onOpen(t.id)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t.title}</Text>
              <Text style={styles.rowDesc} numberOfLines={1}>{t.notes.split("\n")[0]}</Text>
              {stat && (
                <Text style={[styles.rowDesc, { color: "#6366F1", marginTop: 2 }]}>
                  🏆 Best: {stat.score}/{stat.total}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
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
  onScored: (score: number, total: number) => void;
}) {
  const subjects: SubjectPack[] = mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const subj = subjects.find((s) => s.id === subjectId);
  const topic: StudyTopic | undefined = subj?.topics.find((t) => t.id === topicId);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [picks, setPicks] = useState<number[]>(() => topic ? Array(topic.questions.length).fill(-1) : []);
  const [submitted, setSubmitted] = useState(false);
  const { speak: amySpeak, stop: amyStop } = useAmyVoice();
  useEffect(() => () => { amyStop(); }, [amyStop]);
  if (!subj || !topic) return <Text>Topic not found.</Text>;

  const total = topic.questions.length;
  const score = topic.questions.reduce((acc, q, i) => acc + (picks[i] === q.answer ? 1 : 0), 0);
  const submit = () => { setSubmitted(true); onScored(score, total); };
  const reset = () => { setPicks(Array(total).fill(-1)); setSubmitted(false); };

  return (
    <View style={{ gap: 12 }}>
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
          <Text style={styles.cardTitle}>✨ Notes from Amy</Text>
          <Pressable
            style={styles.outlineBtn}
            onPress={() => void amySpeak(topic.notes.replace(/\n/g, ". "))}
          >
            <Ionicons name="volume-high" size={14} color="#6366F1" />
            <Text style={styles.outlineBtnText}>Read aloud</Text>
          </Pressable>
        </View>
        <Text style={styles.notes}>{topic.notes}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => void amySpeak(topic.amyPrompt)}
          >
            <Text style={styles.secondaryBtnText}>Hear Amy's prompt</Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={() => router.push("/amy-ai" as never)}>
            <Text style={styles.ghostBtnText}>Ask Amy more →</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={styles.cardTitle}>Practice ({total} questions)</Text>
          {!practiceOpen && (
            <Pressable style={styles.primaryBtn} onPress={() => setPracticeOpen(true)}>
              <Text style={styles.primaryBtnText}>Try Now</Text>
            </Pressable>
          )}
        </View>
        {practiceOpen && (
          <View style={{ gap: 12 }}>
            {topic.questions.map((q, qi) => (
              <View key={qi} style={styles.qBox}>
                <Text style={styles.qText}>{qi + 1}. {q.q}</Text>
                <View style={{ gap: 6, marginTop: 8 }}>
                  {q.options.map((opt, oi) => {
                    const selected = picks[qi] === oi;
                    const correct = q.answer === oi;
                    let bg = "#fff", border = "#e5e7eb";
                    if (!submitted && selected) { bg = "#eef2ff"; border = "#6366F1"; }
                    if (submitted) {
                      if (correct) { bg = "#ecfdf5"; border = "#10b981"; }
                      else if (selected) { bg = "#fef2f2"; border = "#ef4444"; }
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
                <Text style={styles.primaryBtnText}>Submit</Text>
              </Pressable>
            ) : (
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <Text style={styles.cardTitle}>
                  You got {score} / {total} {score === total ? "🎉" : score >= Math.ceil(total * 0.6) ? "👍" : "💪"}
                </Text>
                <Pressable style={styles.outlineBtn} onPress={reset}>
                  <Ionicons name="refresh" size={14} color="#6366F1" />
                  <Text style={styles.outlineBtnText}>Try again</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  card: { backgroundColor: "#fff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  cardDesc: { fontSize: 13, color: "#64748b", marginTop: 6 },
  notes: { fontSize: 14, color: "#0f172a", lineHeight: 22 },
  h1: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  h2: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 8 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  rowTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  rowDesc: { fontSize: 12, color: "#64748b", marginTop: 2 },

  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "47.5%", backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 4 },
  tileTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  tileMeta: { fontSize: 11, color: "#64748b" },

  playCard: { width: "47.5%", backgroundColor: "#fff", borderRadius: 16, padding: 12, borderWidth: 2, gap: 4 },
  playLabel: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  playSub: { fontSize: 11, color: "#64748b" },
  tapHint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  tapHintText: { fontSize: 10, color: "#6366F1", fontWeight: "700" },

  barTrack: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden", marginTop: 6 },
  barFill: { height: "100%", backgroundColor: "#6366F1" },

  primaryBtn: { backgroundColor: "#6366F1", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  secondaryBtn: { backgroundColor: "#eef2ff", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  secondaryBtnText: { color: "#4338ca", fontWeight: "700", fontSize: 12 },
  ghostBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  ghostBtnText: { color: "#6366F1", fontWeight: "700", fontSize: 12 },
  outlineBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: "#c7d2fe", backgroundColor: "#fff" },
  outlineBtnText: { color: "#6366F1", fontWeight: "700", fontSize: 12 },

  qBox: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 },
  qText: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  qHint: { fontSize: 12, color: "#64748b", marginTop: 8 },
  opt: { borderWidth: 2, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  optText: { fontSize: 13, color: "#0f172a" },

  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  emptyDesc: { fontSize: 13, color: "#64748b", marginTop: 4 },

  imageWrap: { backgroundColor: "#fff", borderRadius: 16, padding: 8, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden" },
});
