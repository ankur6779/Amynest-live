import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, TextInput,
} from "react-native";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { brand, palette } from "@/constants/colors";
import {
  abacusFromValue, abacusValue, buildLessonScript, emptyAbacus,
  generateChallenge, generateProblem, highestUnlockedLevel, isLevelUnlocked,
  LEVELS, rng, scoreAnswer, setLowerCount, summarizeSession, toggleUpper,
  type AbacusProblem, type AbacusState, type LevelId,
} from "@workspace/abacus";

type Mode = "learn" | "practice" | "challenge" | "mental" | "tutor";

interface Props {
  childId: number;
  childName: string;
  ageYears: number;
}

interface ProgressShape {
  currentLevel: LevelId;
  lastMode: Mode;
  completedLevels: LevelId[];
  highestUnlocked: LevelId;
  bestScores: Record<string, { points: number; accuracyPct: number; completedAt: string }>;
  totalCorrect: number;
  totalAttempts: number;
  totalPoints: number;
}

// ─── Bead UI (animated soroban beads) ───────────────────────────────────

function UpperBead({ active }: { active: boolean }) {
  const y = useSharedValue(active ? 16 : 0);
  useEffect(() => {
    y.value = withSpring(active ? 16 : 0, { damping: 18, stiffness: 380 });
  }, [active, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View
      style={[styles.upperBead, style, { backgroundColor: palette.rose500 }]}
    />
  );
}

function LowerBead({ up }: { up: boolean }) {
  const y = useSharedValue(up ? -8 : 0);
  useEffect(() => {
    y.value = withSpring(up ? -8 : 0, { damping: 18, stiffness: 380 });
  }, [up, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View
      style={[styles.lowerBead, style, { backgroundColor: palette.amber500 }]}
    />
  );
}

function BeadColumn({
  rod, rodIndex, onToggleUpper, onSetLower, highlight, disabled,
}: {
  rod: { upper: 0 | 1; lower: 0 | 1 | 2 | 3 | 4 };
  rodIndex: number;
  onToggleUpper: (i: number) => void;
  onSetLower: (i: number, n: 0 | 1 | 2 | 3 | 4) => void;
  highlight?: boolean;
  disabled?: boolean;
}) {
  return (
    <View
      style={[
        styles.rodColumn,
        {
          backgroundColor: palette.amber50,
          borderColor: highlight ? palette.amber500 : palette.amber200,
          borderWidth: highlight ? 3 : 2,
        },
      ]}
    >
      <Pressable
        disabled={disabled}
        onPress={() => {
          if (!disabled) {
            Haptics.selectionAsync().catch(() => {});
            onToggleUpper(rodIndex);
          }
        }}
        style={styles.upperSlot}
        accessibilityLabel={`rod ${rodIndex + 1} upper bead`}
      >
        <UpperBead active={rod.upper === 1} />
      </Pressable>

      <View style={[styles.crossbar, { backgroundColor: palette.amber600 }]} />

      <View style={styles.lowerStack}>
        {[0, 1, 2, 3].map((i) => {
          const beadIndexFromBottom = 3 - i;
          const isUp = rod.lower > beadIndexFromBottom;
          return (
            <Pressable
              key={i}
              disabled={disabled}
              onPress={() => {
                if (disabled) return;
                Haptics.selectionAsync().catch(() => {});
                const target = (isUp ? beadIndexFromBottom : beadIndexFromBottom + 1) as 0 | 1 | 2 | 3 | 4;
                onSetLower(rodIndex, target);
              }}
              style={styles.lowerSlot}
            >
              <LowerBead up={isUp} />
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.rodValue, { color: palette.amber800 }]}>
        {rod.upper * 5 + rod.lower}
      </Text>
    </View>
  );
}

function AbacusBoard({
  state, onChange, highlightRod, disabled,
}: {
  state: AbacusState;
  onChange: (next: AbacusState) => void;
  highlightRod?: number;
  disabled?: boolean;
}) {
  return (
    <View
      style={[
        styles.board,
        { backgroundColor: palette.amber100, borderColor: palette.amber300 },
      ]}
    >
      <View style={styles.boardRow}>
        {state.map((rod, i) => (
          <BeadColumn
            key={i}
            rod={rod}
            rodIndex={i}
            highlight={highlightRod === i}
            disabled={disabled}
            onToggleUpper={(idx) => onChange(toggleUpper(state, idx))}
            onSetLower={(idx, n) => onChange(setLowerCount(state, idx, n))}
          />
        ))}
      </View>
      <Text style={[styles.boardValue, { color: palette.amber800 }]}>
        = {abacusValue(state)}
      </Text>
    </View>
  );
}

// ─── Sub-modes ──────────────────────────────────────────────────────────

function LearnMode({ level }: { level: LevelId }) {
  const { t } = useTranslation();
  const c = useColors();
  const amy = useAmyVoice();
  const script = useMemo(() => buildLessonScript(level), [level]);
  const [step, setStep] = useState(0);
  const cur = script.steps[step];
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.rowBetween}>
        <Text style={[styles.subTitle, { color: c.text }]}>{script.title}</Text>
        <Text style={[styles.muted, { color: c.muted }]}>
          {t("abacus.step")} {step + 1} / {script.steps.length}
        </Text>
      </View>
      <AbacusBoard state={cur.state} onChange={() => {}} highlightRod={cur.highlightRod} disabled />
      <View style={[styles.narration, { backgroundColor: palette.amber50 }]}>
        <Text style={{ color: palette.amber800, fontSize: 13, lineHeight: 18 }}>{cur.text}</Text>
      </View>
      <View style={styles.row}>
        <Pressable
          onPress={() => (amy.speaking || amy.loading ? amy.stop() : amy.speak(cur.text))}
          style={[styles.btn, { backgroundColor: brand.violet600 }]}
        >
          <Ionicons
            name={amy.speaking ? "volume-mute" : "volume-high"}
            size={14}
            color="#fff"
          />
          <Text style={styles.btnLabel}>
            {amy.speaking ? t("abacus.stop_voice") : t("abacus.amy_voice")}
          </Text>
        </Pressable>
        <Pressable
          disabled={step === 0}
          onPress={() => setStep((s) => Math.max(0, s - 1))}
          style={[styles.btn, { backgroundColor: c.surface, opacity: step === 0 ? 0.4 : 1 }]}
        >
          <Text style={[styles.btnLabel, { color: c.text }]}>← {t("abacus.back")}</Text>
        </Pressable>
        <Pressable
          disabled={step >= script.steps.length - 1}
          onPress={() => setStep((s) => Math.min(script.steps.length - 1, s + 1))}
          style={[styles.btn, {
            backgroundColor: palette.amber600,
            opacity: step >= script.steps.length - 1 ? 0.4 : 1,
          }]}
        >
          <Text style={styles.btnLabel}>{t("abacus.next")} →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PracticeMode({ level }: { level: LevelId }) {
  const { t } = useTranslation();
  const c = useColors();
  const [problem, setProblem] = useState<AbacusProblem>(() => generateProblem(level, rng(Date.now())));
  const [board, setBoard] = useState<AbacusState>(() => problem.initialState ?? emptyAbacus(problem.rods));
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");
  const [showHint, setShowHint] = useState(false);

  const next = useCallback(() => {
    const p = generateProblem(level, rng(Date.now() + Math.floor(Math.random() * 1000)));
    setProblem(p);
    setBoard(p.initialState ?? emptyAbacus(p.rods));
    setFeedback("none");
    setShowHint(false);
  }, [level]);

  useEffect(() => { next(); }, [level, next]);

  const check = () => {
    const v = abacusValue(board);
    const ok = v === problem.answer;
    setFeedback(ok ? "correct" : "wrong");
    Haptics.notificationAsync(
      ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={[styles.questionCard, { backgroundColor: brand.violet100 }]}>
        <Text style={[styles.questionLabel, { color: brand.violet700 }]}>
          {t("abacus.show_on_abacus")}
        </Text>
        <Text style={[styles.questionText, { color: brand.violet800 }]}>{problem.prompt}</Text>
      </View>
      <AbacusBoard state={board} onChange={setBoard} />
      {feedback !== "none" && (
        <View
          style={[
            styles.feedbackBox,
            {
              backgroundColor: feedback === "correct" ? palette.emerald100 : palette.rose100,
            },
          ]}
        >
          <Text
            style={{
              color: feedback === "correct" ? palette.emerald700 : palette.rose700,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {feedback === "correct"
              ? `🎉 ${t("abacus.correct")}`
              : `❌ ${t("abacus.try_again")} — ${t("abacus.answer_was", { n: problem.answer })}`}
          </Text>
        </View>
      )}
      <View style={styles.row}>
        <Pressable onPress={check} style={[styles.btn, { backgroundColor: palette.emerald600 }]}>
          <Text style={styles.btnLabel}>✓ {t("abacus.check")}</Text>
        </Pressable>
        <Pressable onPress={next} style={[styles.btn, { backgroundColor: brand.violet600 }]}>
          <Text style={styles.btnLabel}>↻ {t("abacus.new_problem")}</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowHint(true)}
          style={[styles.btn, { backgroundColor: palette.amber200 }]}
        >
          <Text style={[styles.btnLabel, { color: palette.amber800 }]}>💡 {t("abacus.hint")}</Text>
        </Pressable>
        <Pressable
          onPress={() => setBoard(problem.initialState ?? emptyAbacus(problem.rods))}
          style={[styles.btn, { backgroundColor: c.surface }]}
        >
          <Text style={[styles.btnLabel, { color: c.text }]}>↺ {t("abacus.reset")}</Text>
        </Pressable>
      </View>
      {showHint && (
        <Text style={[styles.hint, { color: c.muted, backgroundColor: palette.amber50 }]}>
          💡 {problem.hint}
        </Text>
      )}
    </View>
  );
}

function ChallengeMode({
  level, onComplete,
}: {
  level: LevelId;
  onComplete: (accuracyPct: number, points: number) => void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const lvlDef = useMemo(() => LEVELS.find((l) => l.id === level)!, [level]);
  const [seed] = useState(() => Date.now());
  const problems = useMemo(() => generateChallenge(level, seed), [level, seed]);
  const [idx, setIdx] = useState(0);
  const [board, setBoard] = useState<AbacusState>(() => problems[0].initialState ?? emptyAbacus(problems[0].rods));
  const [results, setResults] = useState<{ correct: boolean; points: number }[]>([]);
  const [tLeft, setTLeft] = useState(lvlDef.challengeSecondsPerQ);
  const startedAt = useRef(Date.now());

  const advance = useCallback((correct: boolean, elapsedMs: number) => {
    const score = scoreAnswer({
      correct, elapsedMs,
      limitMs: lvlDef.challengeSecondsPerQ * 1000,
      fastBonusFraction: lvlDef.fastBonusFraction,
    });
    setResults((rs) => {
      const next = [...rs, { correct, points: score.points }];
      if (next.length >= problems.length) {
        const summary = summarizeSession(level, next);
        onComplete(summary.accuracyPct, summary.totalPoints);
      }
      return next;
    });
    const nextIdx = idx + 1;
    if (nextIdx < problems.length) {
      setIdx(nextIdx);
      const p = problems[nextIdx];
      setBoard(p.initialState ?? emptyAbacus(p.rods));
      setTLeft(lvlDef.challengeSecondsPerQ);
      startedAt.current = Date.now();
    }
  }, [idx, level, lvlDef, onComplete, problems]);

  useEffect(() => {
    if (results.length >= problems.length) return;
    const id = setInterval(() => {
      setTLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          advance(false, lvlDef.challengeSecondsPerQ * 1000);
          return lvlDef.challengeSecondsPerQ;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [idx, advance, lvlDef.challengeSecondsPerQ, problems.length, results.length]);

  if (results.length >= problems.length) {
    const summary = summarizeSession(level, results);
    return (
      <View style={{ alignItems: "center", gap: 8, paddingVertical: 8 }}>
        <MaterialCommunityIcons name="trophy" size={48} color={palette.amber500} />
        <Text style={{ fontSize: 18, fontWeight: "900", color: c.text }}>
          {summary.label === "perfect"
            ? t("abacus.label_perfect")
            : summary.label === "great"
              ? t("abacus.label_great")
              : summary.label === "good"
                ? t("abacus.label_good")
                : t("abacus.label_keep_going")}
        </Text>
        <Text style={{ fontSize: 13, color: c.text }}>
          {summary.correct} / {summary.totalQuestions} {t("abacus.correct_lower")} •{" "}
          <Text style={{ fontWeight: "800" }}>{summary.totalPoints}</Text> {t("abacus.points")}
        </Text>
        <Text style={{
          fontSize: 12, fontWeight: "700",
          color: summary.passed ? palette.emerald600 : palette.amber600,
        }}>
          {summary.passed
            ? `🔓 ${t("abacus.level_unlocked")}`
            : t("abacus.need_pct", { pct: lvlDef.unlockAccuracyPct })}
        </Text>
      </View>
    );
  }

  const cur = problems[idx];
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.rowBetween}>
        <Text style={{ color: c.muted, fontSize: 12, fontFamily: "monospace" }}>
          Q {idx + 1} / {problems.length}
        </Text>
        <Text style={{
          fontSize: 12, fontWeight: "800",
          color: tLeft <= 5 ? palette.rose600 : brand.violet600,
        }}>
          ⏱ {tLeft}s
        </Text>
      </View>
      <View style={[styles.questionCard, { backgroundColor: brand.violet100 }]}>
        <Text style={[styles.questionText, { color: brand.violet800 }]}>{cur.prompt}</Text>
      </View>
      <AbacusBoard state={board} onChange={setBoard} />
      <Pressable
        onPress={() => advance(abacusValue(board) === cur.answer, Date.now() - startedAt.current)}
        style={[styles.btnFull, { backgroundColor: palette.emerald600 }]}
      >
        <Text style={[styles.btnLabel, { fontSize: 14 }]}>✓ {t("abacus.submit")}</Text>
      </Pressable>
    </View>
  );
}

function MentalMode({ level }: { level: LevelId }) {
  const { t } = useTranslation();
  const c = useColors();
  const [problem, setProblem] = useState<AbacusProblem>(() => generateProblem(level, rng(Date.now())));
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");
  const next = () => {
    setProblem(generateProblem(level, rng(Date.now() + Math.floor(Math.random() * 1000))));
    setAnswer("");
    setFeedback("none");
  };
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: c.muted, fontSize: 12, textAlign: "center" }}>
        {t("abacus.mental_intro")}
      </Text>
      <View style={[styles.questionCard, { backgroundColor: palette.fuchsia50, paddingVertical: 18 }]}>
        <Text style={{ fontSize: 36, fontWeight: "900", color: palette.fuchsia700, textAlign: "center" }}>
          {problem.prompt}
        </Text>
      </View>
      <TextInput
        value={answer}
        onChangeText={setAnswer}
        keyboardType="number-pad"
        placeholder={t("abacus.your_answer")}
        placeholderTextColor={c.muted}
        style={{
          borderWidth: 2,
          borderColor: palette.fuchsia300,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          textAlign: "center",
          fontSize: 22,
          fontWeight: "800",
          color: c.text,
          backgroundColor: c.surface,
        }}
      />
      {feedback !== "none" && (
        <View
          style={[
            styles.feedbackBox,
            { backgroundColor: feedback === "correct" ? palette.emerald100 : palette.rose100 },
          ]}
        >
          <Text style={{
            color: feedback === "correct" ? palette.emerald700 : palette.rose700,
            fontWeight: "700",
            textAlign: "center",
          }}>
            {feedback === "correct" ? `🎉 ${t("abacus.correct")}` : `❌ ${problem.answer}`}
          </Text>
        </View>
      )}
      <View style={styles.row}>
        <Pressable
          disabled={!answer.trim()}
          onPress={() => {
            const ok = Number(answer) === problem.answer;
            setFeedback(ok ? "correct" : "wrong");
            Haptics.notificationAsync(
              ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
            ).catch(() => {});
          }}
          style={[styles.btn, {
            backgroundColor: palette.fuchsia600,
            opacity: answer.trim() ? 1 : 0.4,
            flex: 1,
          }]}
        >
          <Text style={styles.btnLabel}>{t("abacus.check")}</Text>
        </Pressable>
        <Pressable onPress={next} style={[styles.btn, { backgroundColor: brand.violet600 }]}>
          <Text style={styles.btnLabel}>{t("abacus.new_problem")} →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TutorMode({ childId, level }: { childId: number; level: LevelId }) {
  const { t, i18n } = useTranslation();
  const c = useColors();
  const authFetch = useAuthFetch();
  const amy = useAmyVoice();
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setErr(null);
    setReply("");
    try {
      const lang = (i18n.language as string) || "en";
      const res = await authFetch("/api/abacus/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId, level,
          language: lang === "hi" ? "hi" : lang === "hinglish" ? "hinglish" : "en",
          question: question.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.reply) throw new Error(data?.error ?? "ai_failed");
      setReply(data.reply as string);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ai_failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: c.muted, fontSize: 12 }}>{t("abacus.tutor_intro")}</Text>
      <TextInput
        value={question}
        onChangeText={setQuestion}
        placeholder={t("abacus.tutor_placeholder")}
        placeholderTextColor={c.muted}
        multiline
        numberOfLines={3}
        style={{
          borderWidth: 2,
          borderColor: brand.violet200,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          minHeight: 70,
          color: c.text,
          backgroundColor: c.surface,
          textAlignVertical: "top",
        }}
      />
      <Pressable
        disabled={loading || !question.trim()}
        onPress={ask}
        style={[styles.btnFull, {
          backgroundColor: brand.violet600,
          opacity: loading || !question.trim() ? 0.4 : 1,
        }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="sparkles" size={14} color="#fff" />
            <Text style={[styles.btnLabel, { fontSize: 14 }]}>{t("abacus.ask_amy")}</Text>
          </View>
        )}
      </Pressable>
      {err && <Text style={{ color: palette.rose600, fontSize: 12, textAlign: "center" }}>⚠️ {err}</Text>}
      {reply && (
        <View style={{ backgroundColor: brand.violet50, borderRadius: 12, padding: 12, gap: 6 }}>
          <Text style={{ color: c.text, fontSize: 13, lineHeight: 18 }}>{reply}</Text>
          <Pressable
            onPress={() => (amy.speaking || amy.loading ? amy.stop() : amy.speak(reply))}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Ionicons
              name={amy.speaking ? "volume-mute" : "volume-high"}
              size={14}
              color={brand.violet700}
            />
            <Text style={{ color: brand.violet700, fontWeight: "700", fontSize: 12 }}>
              {amy.speaking ? t("abacus.stop_voice") : t("abacus.amy_voice")}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Top-level component ────────────────────────────────────────────────

export function AbacusZone({ childId, childName, ageYears }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const authFetch = useAuthFetch();
  const [progress, setProgress] = useState<ProgressShape | null>(null);
  const [mode, setMode] = useState<Mode>("learn");
  const [level, setLevel] = useState<LevelId>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    authFetch(`/api/abacus/progress?childId=${childId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.eligible && data.progress) {
          const p = data.progress as ProgressShape;
          setProgress(p);
          setMode((p.lastMode as Mode) || "learn");
          setLevel((p.currentLevel as LevelId) || 1);
        } else {
          setProgress(null);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [authFetch, childId]);

  const persistMode = useCallback((next: Mode, lvl: LevelId) => {
    void authFetch("/api/abacus/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_mode", childId, mode: next, level: lvl }),
    }).catch(() => {});
  }, [authFetch, childId]);

  const onChallengeComplete = useCallback(async (accuracyPct: number, points: number) => {
    const def = LEVELS.find((l) => l.id === level)!;
    if (accuracyPct >= def.unlockAccuracyPct) {
      const res = await authFetch("/api/abacus/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_level", childId, level,
          accuracyPct, points,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.progress) {
        setProgress((prev) => ({
          ...(prev ?? {
            currentLevel: level, lastMode: mode, completedLevels: [],
            highestUnlocked: level, bestScores: {},
            totalCorrect: 0, totalAttempts: 0, totalPoints: 0,
          }),
          currentLevel: data.progress.currentLevel,
          completedLevels: data.progress.completedLevels ?? [],
          highestUnlocked: highestUnlockedLevel(data.progress.completedLevels ?? []),
          bestScores: data.progress.bestScores ?? {},
        }));
      }
    }
    void authFetch("/api/abacus/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "log_session", childId,
        totalCorrect: Math.round((accuracyPct / 100) * def.challengeCount),
        totalAttempts: def.challengeCount,
        totalPoints: points,
      }),
    }).catch(() => {});
  }, [authFetch, childId, level, mode]);

  if (loading) {
    return <ActivityIndicator size="small" color={brand.violet600} style={{ padding: 12 }} />;
  }

  if (ageYears < 4 || ageYears > 10) {
    return (
      <Text style={{ color: c.muted, fontSize: 12 }}>
        {t("abacus.age_not_eligible", { name: childName })}
      </Text>
    );
  }

  const completed = progress?.completedLevels ?? [];
  const MODES: { id: Mode; label: string; emoji: string }[] = [
    { id: "learn", label: t("abacus.mode_learn"), emoji: "📚" },
    { id: "practice", label: t("abacus.mode_practice"), emoji: "✏️" },
    { id: "challenge", label: t("abacus.mode_challenge"), emoji: "⏱️" },
    { id: "mental", label: t("abacus.mode_mental"), emoji: "🧠" },
    { id: "tutor", label: t("abacus.mode_tutor"), emoji: "💜" },
  ];

  return (
    <View style={{ gap: 10 }}>
      {progress && (
        <View style={[styles.progressStrip, { backgroundColor: palette.amber50 }]}>
          <Text style={{ color: palette.amber800, fontSize: 12 }}>
            🏅 <Text style={{ fontWeight: "800" }}>{progress.totalPoints}</Text> {t("abacus.points")}
          </Text>
          <Text style={{ color: palette.amber800, fontSize: 12 }}>
            ✅ {completed.length} / {LEVELS.length} {t("abacus.levels")}
          </Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {LEVELS.map((l) => {
          const unlocked = isLevelUnlocked(l.id, completed);
          const active = l.id === level;
          return (
            <Pressable
              key={l.id}
              disabled={!unlocked}
              onPress={() => {
                setLevel(l.id);
                persistMode(mode, l.id);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: active
                    ? palette.amber500
                    : unlocked ? c.surface : c.surface,
                  borderColor: active ? palette.amber600 : palette.amber300,
                  opacity: unlocked ? 1 : 0.5,
                },
              ]}
            >
              {!unlocked && <Ionicons name="lock-closed" size={11} color={c.muted} />}
              <Text style={{
                color: active ? "#fff" : c.text,
                fontWeight: "800",
                fontSize: 11,
              }}>
                L{l.id} • {t(`abacus.level_${l.slug}` as `abacus.level_${typeof l.slug}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.modeTabs}>
        {MODES.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => {
              setMode(m.id);
              persistMode(m.id, level);
            }}
            style={[
              styles.modeTab,
              {
                backgroundColor: mode === m.id ? brand.violet600 : c.surface,
                borderColor: mode === m.id ? brand.violet700 : c.border,
              },
            ]}
          >
            <Text style={{ fontSize: 18, lineHeight: 20 }}>{m.emoji}</Text>
            <Text style={{
              color: mode === m.id ? "#fff" : c.text,
              fontSize: 9,
              fontWeight: "700",
              marginTop: 2,
            }}>
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.modeBody, { backgroundColor: c.surface, borderColor: c.border }]}>
        {mode === "learn" && <LearnMode level={level} />}
        {mode === "practice" && <PracticeMode level={level} />}
        {mode === "challenge" && <ChallengeMode level={level} onComplete={onChallengeComplete} />}
        {mode === "mental" && <MentalMode level={level} />}
        {mode === "tutor" && <TutorMode childId={childId} level={level} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  subTitle: { fontSize: 13, fontWeight: "700" },
  muted: { fontSize: 11 },

  // Board + beads
  board: { borderWidth: 2, borderRadius: 16, padding: 10 },
  boardRow: { flexDirection: "row", justifyContent: "center", gap: 8 },
  boardValue: { textAlign: "center", marginTop: 8, fontSize: 14, fontWeight: "800" },
  rodColumn: {
    paddingHorizontal: 8, paddingVertical: 10, borderRadius: 12,
    alignItems: "center", gap: 4, minWidth: 56,
  },
  upperSlot: { height: 44, width: 48, alignItems: "center", justifyContent: "flex-start" },
  upperBead: { height: 24, width: 44, borderRadius: 12 },
  crossbar: { height: 3, width: "100%", borderRadius: 2 },
  lowerStack: {
    height: 110, width: 48, justifyContent: "flex-end",
    alignItems: "center", gap: 4, paddingBottom: 4,
  },
  lowerSlot: { height: 22, width: 48 },
  lowerBead: { height: 22, width: 44, borderRadius: 11 },
  rodValue: { fontSize: 10, fontFamily: "monospace" },

  // Generic UI
  narration: { borderRadius: 12, padding: 12 },
  questionCard: { borderRadius: 14, padding: 14, alignItems: "center" },
  questionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  questionText: { fontSize: 30, fontWeight: "900", marginTop: 4 },
  feedbackBox: { borderRadius: 10, padding: 8 },
  hint: { fontSize: 11, fontStyle: "italic", padding: 8, borderRadius: 10 },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  btnFull: {
    borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center",
  },
  btnLabel: { color: "#fff", fontWeight: "700", fontSize: 12 },
  progressStrip: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 2,
  },
  modeTabs: { flexDirection: "row", gap: 4 },
  modeTab: {
    flex: 1, alignItems: "center", paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  modeBody: { borderWidth: 1, borderRadius: 14, padding: 12 },
});

export default AbacusZone;
