import React, {  useEffect, useMemo, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import {
  type OlympiadQuestion,
  type OlympiadSubject,
  type OlympiadDifficulty,
  SUBJECT_LABELS,
  SUBJECT_EMOJI,
  DIFFICULTY_LABELS,
  ageBandFor,
  ageBandLabel,
  pickDailyQuestions,
  pickPracticeQuestions,
} from "@workspace/olympiad";
import { brand, palette } from "@/constants/colors";

type Child = { id: number; name: string; age: number };

interface DailyRun {
  picks: string[];
  answers: number[];
  submitted: boolean;
  score: number;
}
interface ChildOlympiadStats {
  totalPoints: number;
  difficulty: OlympiadDifficulty;
  streak: number;
  lastDailyDate: string | null;
  perfectDays: number;
  daily: Record<string, DailyRun>;
  bySubject: Record<OlympiadSubject, { correct: number; total: number }>;
}

const DEFAULT_STATS: ChildOlympiadStats = {
  totalPoints: 0,
  difficulty: "easy",
  streak: 0,
  lastDailyDate: null,
  perfectDays: 0,
  daily: {},
  bySubject: {
    math: { correct: 0, total: 0 },
    science: { correct: 0, total: 0 },
    reasoning: { correct: 0, total: 0 },
    gk: { correct: 0, total: 0 },
  },
};

const storageKey = (id: number) => `olympiad:v1:${id}`;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function loadStats(id: number): Promise<ChildOlympiadStats> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(id));
    if (!raw) return { ...DEFAULT_STATS, bySubject: { ...DEFAULT_STATS.bySubject } };
    const parsed = JSON.parse(raw) as Partial<ChildOlympiadStats>;
    return {
      ...DEFAULT_STATS,
      ...parsed,
      bySubject: { ...DEFAULT_STATS.bySubject, ...(parsed.bySubject || {}) },
      daily: parsed.daily || {},
    };
  } catch {
    return { ...DEFAULT_STATS, bySubject: { ...DEFAULT_STATS.bySubject } };
  }
}
async function saveStats(id: number, s: ChildOlympiadStats) {
  try { await AsyncStorage.setItem(storageKey(id), JSON.stringify(s)); } catch {}
}

type Mode = "home" | "daily" | "practice";

export default function OlympiadScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ childId?: string }>();
  const authFetch = useAuthFetch();

  const childrenQ = useQuery<{ children: Child[] }>({
    queryKey: ["olympiad-children"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const children = childrenQ.data?.children || [];
  const initialChildId = params.childId ? Number(params.childId) : children[0]?.id;
  const [activeChildId, setActiveChildId] = useState<number | undefined>(initialChildId);
  useEffect(() => {
    if (!activeChildId && children[0]) setActiveChildId(children[0].id);
  }, [children, activeChildId]);

  const child = children.find((c) => c.id === activeChildId) || children[0];

  if (childrenQ.isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }
  if (!child) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40, padding: 20 }]}>
        <Stack.Screen options={{ title: "Olympiad Zone" }} />
        <Ionicons name="trophy-outline" size={48} color={palette.gray400} />
        <Text style={{ marginTop: 12, fontWeight: "700", fontSize: 16 }}>Add a child first</Text>
        <Text style={{ marginTop: 4, color: palette.gray500, textAlign: "center" }}>
          Olympiad practice is personalised to your child's age band.
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.btn, { marginTop: 16 }]}>
          <Text style={styles.btnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return <OlympiadInner key={child.id} child={child} childOptions={children} onChange={setActiveChildId} />;
}

function OlympiadInner({
  child, childOptions, onChange,
}: { child: Child; childOptions: Child[]; onChange: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const [stats, setStats] = useState<ChildOlympiadStats | null>(null);
  const [mode, setMode] = useState<Mode>("home");

  useEffect(() => { loadStats(child.id).then(setStats); }, [child.id]);

  const ageBand = useMemo(() => ageBandFor(child.age), [child.age]);
  // Capture today's date once at mount so a quiz spanning midnight stays on the same day.
  const [today] = useState(todayISO);
  const todayRun: DailyRun | undefined = stats?.daily?.[today];
  const todayQuestions = useMemo(
    () => stats ? pickDailyQuestions(ageBand, stats.difficulty, today, child.id) : [],
    [stats, ageBand, today, child.id],
  );

  const persist = useCallback(async (s: ChildOlympiadStats) => {
    setStats(s);
    await saveStats(child.id, s);
  }, [child.id]);

  const onDailyComplete = useCallback(async (answers: number[]) => {
    if (!stats) return;
    const score = answers.reduce(
      (acc, a, i) => acc + (a === todayQuestions[i]?.correct ? 1 : 0), 0,
    );
    const perfect = score === todayQuestions.length;
    const pointsEarned = score * 10 + (perfect ? 20 : 0);
    const newBySubject = { ...stats.bySubject };
    todayQuestions.forEach((q, i) => {
      const e = newBySubject[q.subject];
      newBySubject[q.subject] = {
        correct: e.correct + (answers[i] === q.correct ? 1 : 0),
        total: e.total + 1,
      };
    });
    const wasYesterday = stats.lastDailyDate === yesterdayISO();
    const wasToday = stats.lastDailyDate === today;
    const newStreak = wasToday ? stats.streak : wasYesterday ? stats.streak + 1 : 1;
    await persist({
      ...stats,
      totalPoints: stats.totalPoints + pointsEarned,
      streak: newStreak,
      lastDailyDate: today,
      perfectDays: stats.perfectDays + (perfect ? 1 : 0),
      bySubject: newBySubject,
      daily: { ...stats.daily, [today]: {
        picks: todayQuestions.map((q) => q.id),
        answers, submitted: true, score,
      }},
    });
    setMode("home");
  }, [stats, todayQuestions, today, persist]);

  const onPracticeComplete = useCallback(async (questions: OlympiadQuestion[], answers: number[]) => {
    if (!stats) return;
    const newBySubject = { ...stats.bySubject };
    const score = answers.reduce(
      (acc, a, i) => acc + (a === questions[i]?.correct ? 1 : 0), 0,
    );
    questions.forEach((q, i) => {
      const e = newBySubject[q.subject];
      newBySubject[q.subject] = {
        correct: e.correct + (answers[i] === q.correct ? 1 : 0),
        total: e.total + 1,
      };
    });
    await persist({
      ...stats,
      totalPoints: stats.totalPoints + score * 5,
      bySubject: newBySubject,
    });
  }, [stats, persist]);

  const setDifficulty = useCallback(async (d: OlympiadDifficulty) => {
    if (!stats) return;
    await persist({ ...stats, difficulty: d });
  }, [stats, persist]);

  if (!stats) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
        <Stack.Screen options={{ title: "Olympiad Zone" }} />
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={theme.gradient}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <Stack.Screen options={{ title: "🏆 Olympiad Zone" }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}>
        {/* Header */}
        <LinearGradient
          colors={[palette.amber500, palette.red500]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <Text style={styles.headerTitle}>🏆 Olympiad Zone</Text>
          <Text style={styles.headerSub}>
            {child.name} · {ageBandLabel(ageBand)} · {DIFFICULTY_LABELS[stats.difficulty]}
          </Text>
          <View style={styles.headerStats}>
            <View style={styles.statCell}>
              <Text style={styles.statNum}>{stats.totalPoints}</Text>
              <Text style={styles.statLbl}>⭐ Points</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statNum}>{stats.streak}</Text>
              <Text style={styles.statLbl}>🔥 Streak</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statNum}>{stats.perfectDays}</Text>
              <Text style={styles.statLbl}>🏆 Perfect</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Child switcher */}
        {childOptions.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {childOptions.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => onChange(c.id)}
                style={[styles.chip, c.id === child.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, c.id === child.id && styles.chipTextActive]}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Mode tabs */}
        <View style={styles.tabs}>
          {(["home", "daily", "practice"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.tab, mode === m && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                {m === "home" ? "Overview" : m === "daily" ? "Daily 5" : "Practice"}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === "home" && (
          <View style={{ gap: 12 }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Difficulty</Text>
              <Text style={styles.cardSub}>Tap to change difficulty for daily quiz.</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                {(["easy", "medium", "hard"] as OlympiadDifficulty[]).map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setDifficulty(d)}
                    style={[styles.diffPill, stats.difficulty === d && styles.diffPillActive]}
                  >
                    <Text style={[styles.diffPillText, stats.difficulty === d && styles.diffPillTextActive]}>
                      {DIFFICULTY_LABELS[d]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Today's Daily 5</Text>
              {todayRun?.submitted ? (
                <Text style={styles.cardSub}>
                  ✅ Done! You scored {todayRun.score} / {todayQuestions.length}. Come back tomorrow.
                </Text>
              ) : (
                <>
                  <Text style={styles.cardSub}>5 fresh questions across math, science, reasoning, GK.</Text>
                  <Pressable onPress={() => setMode("daily")} style={[styles.btn, { marginTop: 10 }]}>
                    <Text style={styles.btnText}>Start daily quiz</Text>
                    <Ionicons name="chevron-forward" size={16} color="#fff" />
                  </Pressable>
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Subject progress</Text>
              <View style={{ marginTop: 6, gap: 8 }}>
                {(["math", "science", "reasoning", "gk"] as OlympiadSubject[]).map((s) => {
                  const e = stats.bySubject[s];
                  const pct = e.total > 0 ? Math.round((e.correct / e.total) * 100) : 0;
                  return (
                    <View key={s}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 13, fontWeight: "600" }}>
                          {SUBJECT_EMOJI[s]} {SUBJECT_LABELS[s]}
                        </Text>
                        <Text style={{ fontSize: 12, color: palette.gray500 }}>
                          {e.correct} / {e.total} ({pct}%)
                        </Text>
                      </View>
                      <View style={styles.bar}>
                        <View style={[styles.barFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {mode === "daily" && (
          <QuizRunner
            key={`daily-${today}`}
            questions={todayQuestions}
            initialAnswers={todayRun?.submitted ? todayRun.answers : []}
            onComplete={onDailyComplete}
            pointsPerCorrect={10}
            perfectBonus={20}
            disabled={todayRun?.submitted}
            onCancel={() => setMode("home")}
          />
        )}

        {mode === "practice" && (
          <PracticeRunner
            ageBand={ageBand}
            difficulty={stats.difficulty}
            onComplete={onPracticeComplete}
            onCancel={() => setMode("home")}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Quiz Runner ──────────────────────────────────────────────────────────────
function QuizRunner({
  questions, initialAnswers = [], onComplete, pointsPerCorrect, perfectBonus = 0,
  disabled, onCancel,
}: {
  questions: OlympiadQuestion[];
  initialAnswers?: number[];
  onComplete: (answers: number[]) => void;
  pointsPerCorrect: number;
  perfectBonus?: number;
  disabled?: boolean;
  onCancel?: () => void;
}) {
  const [idx, setIdx] = useState(initialAnswers.length);
  const [answers, setAnswers] = useState<number[]>(initialAnswers);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(initialAnswers.length >= questions.length);

  if (questions.length === 0) {
    return <Text style={{ color: palette.gray500 }}>No questions available yet.</Text>;
  }

  if (done) {
    const score = answers.reduce(
      (acc, a, i) => acc + (a === questions[i]?.correct ? 1 : 0), 0,
    );
    const perfect = score === questions.length;
    const pts = score * pointsPerCorrect + (perfect ? perfectBonus : 0);
    return (
      <View style={{ gap: 10 }}>
        <View style={[styles.card, { alignItems: "center" }]}>
          <Text style={{ fontSize: 48 }}>{perfect ? "🏆" : score >= questions.length / 2 ? "🎉" : "💪"}</Text>
          <Text style={{ fontSize: 22, fontWeight: "800" }}>{score} / {questions.length}</Text>
          <Text style={{ color: palette.gray500, marginTop: 4 }}>
            +{pts} points{perfect && perfectBonus > 0 ? ` (incl. ${perfectBonus} bonus)` : ""}
          </Text>
        </View>
        {questions.map((q, i) => {
          const ok = answers[i] === q.correct;
          return (
            <View key={q.id} style={[styles.card, { padding: 12 }]}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Ionicons
                  name={ok ? "checkmark-circle" : "close-circle"}
                  size={18}
                  color={ok ? palette.green600 : palette.rose600}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", fontSize: 13 }}>{q.question}</Text>
                  <Text style={{ fontSize: 12, marginTop: 4, color: palette.gray500 }}>
                    Correct: <Text style={{ fontWeight: "700", color: "#111" /* audit-ok: near-black answer text */ }}>{q.options[q.correct]}</Text>
                  </Text>
                  <Text style={{ fontSize: 12, marginTop: 4, color: palette.gray500, fontStyle: "italic" }}>
                    {q.explanation}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
        {!disabled && (
          <Pressable style={styles.btn} onPress={() => onComplete(answers)}>
            <Text style={styles.btnText}>Save & finish</Text>
          </Pressable>
        )}
        {disabled && onCancel && (
          <Pressable style={styles.btnSecondary} onPress={onCancel}>
            <Text style={styles.btnSecondaryText}>Back</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const q = questions[idx]!;
  const isAnswered = picked !== null;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12, color: palette.gray500 }}>Question {idx + 1} of {questions.length}</Text>
        <Text style={{ fontSize: 12, color: palette.gray500 }}>
          {SUBJECT_EMOJI[q.subject]} {SUBJECT_LABELS[q.subject]} · {DIFFICULTY_LABELS[q.difficulty]}
        </Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${(idx / questions.length) * 100}%` }]} />
      </View>
      <View style={styles.card}>
        <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 12 }}>{q.question}</Text>
        <View style={{ gap: 8 }}>
          {q.options.map((opt, i) => {
            const showCorrect = isAnswered && i === q.correct;
            const showWrong = isAnswered && picked === i && i !== q.correct;
            return (
              <Pressable
                key={i}
                onPress={() => !isAnswered && setPicked(i)}
                disabled={isAnswered}
                style={[
                  styles.opt,
                  showCorrect && { borderColor: palette.green600, backgroundColor: palette.emerald50 },
                  showWrong && { borderColor: palette.rose600, backgroundColor: palette.rose50 },
                  isAnswered && !showCorrect && !showWrong && { opacity: 0.6 },
                  picked === i && !isAnswered && { borderColor: brand.primary, backgroundColor: palette.violet50 },
                ]}
              >
                <Text style={{ fontWeight: "600", fontSize: 14 }}>
                  {String.fromCharCode(65 + i)}. {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {isAnswered && (
          <View style={[styles.expl, picked === q.correct ? { backgroundColor: palette.emerald50 } : { backgroundColor: palette.amber50 }]}>
            <Ionicons name="bulb-outline" size={16} color={picked === q.correct ? palette.green600 : palette.amber600} />
            <Text style={{ flex: 1, fontSize: 13 }}>{q.explanation}</Text>
          </View>
        )}
      </View>
      <Pressable
        onPress={() => {
          if (!isAnswered) return;
          const newAns = [...answers, picked!];
          setAnswers(newAns);
          setPicked(null);
          if (idx + 1 >= questions.length) setDone(true);
          else setIdx(idx + 1);
        }}
        disabled={!isAnswered}
        style={[styles.btn, !isAnswered && { opacity: 0.5 }]}
      >
        <Text style={styles.btnText}>
          {idx + 1 >= questions.length ? "See result" : "Next question"}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#fff" />
      </Pressable>
      {onCancel && (
        <Pressable style={styles.btnSecondary} onPress={onCancel}>
          <Text style={styles.btnSecondaryText}>Cancel</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Practice ─────────────────────────────────────────────────────────────────
function PracticeRunner({
  ageBand, difficulty, onComplete, onCancel,
}: {
  ageBand: ReturnType<typeof ageBandFor>;
  difficulty: OlympiadDifficulty;
  onComplete: (questions: OlympiadQuestion[], answers: number[]) => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState<OlympiadSubject | null>(null);
  const [questions, setQuestions] = useState<OlympiadQuestion[] | null>(null);

  if (questions) {
    return (
      <View style={{ gap: 10 }}>
        <QuizRunner
          questions={questions}
          onComplete={(answers) => {
            onComplete(questions, answers);
            setQuestions(null);
            setSubject(null);
          }}
          pointsPerCorrect={5}
          onCancel={() => { setQuestions(null); setSubject(null); }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pick a subject</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {(["math", "science", "reasoning", "gk"] as OlympiadSubject[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSubject(s)}
              style={[styles.subjPill, subject === s && styles.subjPillActive]}
            >
              <Text style={{ fontSize: 22 }}>{SUBJECT_EMOJI[s]}</Text>
              <Text style={[styles.subjPillText, subject === s && styles.subjPillTextActive]}>
                {SUBJECT_LABELS[s]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable
        onPress={() => {
          if (!subject) return;
          setQuestions(pickPracticeQuestions(ageBand, subject, difficulty, 10));
        }}
        disabled={!subject}
        style={[styles.btn, !subject && { opacity: 0.5 }]}
      >
        <Text style={styles.btnText}>Start practice (10 Qs)</Text>
        <Ionicons name="chevron-forward" size={16} color="#fff" />
      </Pressable>
      <Pressable style={styles.btnSecondary} onPress={onCancel}>
        <Text style={styles.btnSecondaryText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F7FF" }, // audit-ok: light lavender loading bg
  headerCard: { borderRadius: 18, padding: 16, gap: 6 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.92)", fontSize: 12 },
  headerStats: { flexDirection: "row", marginTop: 10, gap: 8 },
  statCell: { flex: 1, backgroundColor: "rgba(255,255,255,0.18)", padding: 10, borderRadius: 12, alignItems: "center" },
  statNum: { color: "#fff", fontSize: 18, fontWeight: "800" },
  statLbl: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: palette.gray200 },
  chipActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: palette.gray700 },
  chipTextActive: { color: "#fff" },
  tabs: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: brand.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: palette.gray500 },
  tabTextActive: { color: "#fff" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#EEE" /* audit-ok: light gray card border */ },
  cardTitle: { fontWeight: "700", fontSize: 15 },
  cardSub: { fontSize: 13, color: palette.gray500, marginTop: 4 },
  diffPill: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: palette.gray200, alignItems: "center" },
  diffPillActive: { borderColor: brand.primary, backgroundColor: palette.violet50 },
  diffPillText: { fontSize: 13, fontWeight: "600", color: palette.gray500 },
  diffPillTextActive: { color: brand.primary },
  subjPill: { width: "47%", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.gray200, alignItems: "center", gap: 4 },
  subjPillActive: { borderColor: brand.primary, backgroundColor: palette.violet50 },
  subjPillText: { fontSize: 13, fontWeight: "600", color: palette.gray700 },
  subjPillTextActive: { color: brand.primary },
  bar: { height: 8, backgroundColor: palette.gray200, borderRadius: 4, overflow: "hidden", marginTop: 4 },
  barFill: { height: "100%", backgroundColor: brand.primary },
  opt: { borderWidth: 2, borderColor: palette.gray200, padding: 12, borderRadius: 10, backgroundColor: "#fff" },
  expl: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 10, marginTop: 12, alignItems: "flex-start" },
  btn: { backgroundColor: brand.primary, padding: 12, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  btnText: { color: "#fff", fontWeight: "700" },
  btnSecondary: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.gray200, alignItems: "center" },
  btnSecondaryText: { fontWeight: "600", color: palette.gray700 },
});
