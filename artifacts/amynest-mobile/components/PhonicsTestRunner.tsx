import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Pressable, Platform, Animated, Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { API_BASE_URL } from "@/constants/api";
import { brand, palette } from "@/constants/colors";
import { useTranslation } from "react-i18next";

// ─── Shared types (mirror server payloads) ───────────────────────────────────

export type TestType = "daily" | "weekly";
export type GameMode = "hear_tap" | "missing_letter" | "build_word" | "speed_challenge";

export type QuestionType =
  | "letter_to_sound" | "sound_to_letter" | "word_pic"
  | "animal_sound" | "blending" | "listening"
  | "missing_letter" | "build_word";

export interface ClientQuestion {
  id: string;
  type: QuestionType;
  prompt: {
    instruction: string;
    text?: string;
    emoji?: string;
    ttsText?: string;
    meta?: { targetWord?: string; letterPool?: string[]; timeLimitSec?: number };
  };
  options: { label: string; emoji?: string }[];
  /** Local-only correctness signal for instant tap feedback (UX-only; server is authoritative). */
  _localCheck: number;
}

export interface StartResponse {
  sessionToken: string;
  testType: TestType;
  gameMode?: GameMode;
  ageGroup: string;
  ageGroupLabel: string;
  questions: ClientQuestion[];
  expiresAt: string;
}

export interface SubmitResponse {
  result: { id: number; score: number; total: number; accuracyPct: number; performanceLabel: string };
  breakdown: { correct: number; total: number; accuracyPct: number; perType: Record<string, { correct: number; total: number }>; weakConceptIds: number[] };
  weakConcepts: { id: number; symbol: string; emoji: string | null; example: string | null }[];
  insight: { performanceLabel: string; text: string; suggestion: string };
}

const TYPE_LABEL: Record<QuestionType, string> = {
  letter_to_sound: "Letter → Sound",
  sound_to_letter: "Sound → Letter",
  word_pic: "Word + Picture",
  animal_sound: "Animal Sound",
  blending: "Blend the Sounds",
  listening: "Listen & Choose",
  missing_letter: "Missing Letter",
  build_word: "Build the Word",
};

// ─── Runner ──────────────────────────────────────────────────────────────────

export interface PhonicsTestRunnerProps {
  childId: number;
  childName: string;
  testType: TestType;
  /** Defaults to "hear_tap" for backwards compat. */
  gameMode?: GameMode;
  onCompleted?: () => void;
  onCancel: () => void;
}

type Phase =
  | { kind: "loading" }
  | {
      kind: "running";
      data: StartResponse;
      index: number;
      answers: { questionId: string; selectedIndex: number }[];
      selectedIndex: number | null;
      feedback: "correct" | "wrong" | null;
    }
  | { kind: "submitting" }
  | { kind: "result"; data: SubmitResponse }
  | { kind: "error"; message: string };

export function PhonicsTestRunner({
  childId, childName, testType, gameMode = "hear_tap", onCompleted, onCancel,
}: PhonicsTestRunnerProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const authFetch = useAuthFetch();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start the test once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/phonics/tests/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, testType, gameMode }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as StartResponse;
        if (!data.questions || data.questions.length === 0) {
          throw new Error("No questions returned");
        }
        if (!cancelled) {
          setPhase({ kind: "running", data, index: 0, answers: [], selectedIndex: null, feedback: null });
        }
      } catch (err) {
        if (!cancelled) {
          setPhase({ kind: "error", message: err instanceof Error ? err.message : "Failed to start" });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [authFetch, childId, testType, gameMode]);

  const submitOne = useCallback((selectedIndex: number, current: Extract<Phase, { kind: "running" }>) => {
    if (current.selectedIndex != null) return;
    const q = current.data.questions[current.index];
    const correctish = isCorrectClientSide(q, selectedIndex);
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(
        correctish
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    }
    const newAnswers = [...current.answers, { questionId: q.id, selectedIndex }];
    setPhase({ ...current, answers: newAnswers, selectedIndex, feedback: correctish ? "correct" : "wrong" });
    setTimeout(async () => {
      const isLast = current.index + 1 >= current.data.questions.length;
      if (!isLast) {
        setPhase({
          ...current, answers: newAnswers,
          index: current.index + 1, selectedIndex: null, feedback: null,
        });
        return;
      }
      setPhase({ kind: "submitting" });
      try {
        const res = await authFetch(`${API_BASE_URL}/api/phonics/tests/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: current.data.sessionToken, answers: newAnswers }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error ?? `HTTP ${res.status}`);
        }
        const submitData = (await res.json()) as SubmitResponse;
        setPhase({ kind: "result", data: submitData });
        onCompleted?.();
      } catch (err) {
        setPhase({ kind: "error", message: err instanceof Error ? err.message : "Failed to submit" });
      }
    }, 900);
  }, [authFetch, onCompleted]);

  const handleAnswer = useCallback((selectedIndex: number) => {
    if (phase.kind !== "running") return;
    submitOne(selectedIndex, phase);
  }, [phase, submitOne]);

  // Speed-challenge per-question countdown.
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (phase.kind !== "running" || gameMode !== "speed_challenge") {
      setSecondsLeft(null);
      return;
    }
    if (phase.selectedIndex != null) return;
    const q = phase.data.questions[phase.index];
    const limit = q?.prompt.meta?.timeLimitSec ?? 7;
    setSecondsLeft(limit);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s == null) return s;
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          const lastIdx = (q?.options.length ?? 1) - 1;
          submitOne(lastIdx === 0 ? 0 : lastIdx, phase);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind === "running" ? `${phase.index}-${phase.selectedIndex}` : phase.kind, gameMode]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (phase.kind === "loading" || phase.kind === "submitting") {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg.primary }]}>
        <ActivityIndicator size="large" color={theme.brand.primary} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
          {phase.kind === "loading" ? "Preparing test…" : "Scoring your answers…"}
        </Text>
      </View>
    );
  }

  if (phase.kind === "error") {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg.primary, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.status.danger} />
        <Text style={[styles.errorTitle, { color: theme.text.primary }]}>
          Couldn't start the test
        </Text>
        <Text style={[styles.errorMsg, { color: theme.text.secondary }]}>{phase.message}</Text>
        <TouchableOpacity onPress={onCancel} style={[styles.primaryBtn, { backgroundColor: theme.brand.primary }]}>
          <Text style={styles.primaryBtnText}>{t("components.phonics_test_runner.go_back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase.kind === "result") {
    return <ResultView data={phase.data} childName={childName} onDone={onCancel} />;
  }

  const q = phase.data.questions[phase.index];
  return (
    <QuestionView
      question={q}
      index={phase.index}
      total={phase.data.questions.length}
      selectedIndex={phase.selectedIndex}
      feedback={phase.feedback}
      onAnswer={handleAnswer}
      onCancel={onCancel}
      secondsLeft={gameMode === "speed_challenge" ? secondsLeft : null}
    />
  );
}

/** Heuristic correctness check — see web component for rationale. */
function isCorrectClientSide(q: ClientQuestion, selectedIndex: number): boolean {
  // build_word self-validates inside its panel (0 = correct, 1 = wrong).
  if (q.type === "build_word") return selectedIndex === 0;
  // Authoritative for all other types — server still re-checks at submit.
  return selectedIndex === q._localCheck;
}


// ─── Question view ───────────────────────────────────────────────────────────

interface QuestionViewProps {
  question: ClientQuestion;
  index: number;
  total: number;
  selectedIndex: number | null;
  feedback: "correct" | "wrong" | null;
  onAnswer: (i: number) => void;
  onCancel: () => void;
  secondsLeft: number | null;
}

function QuestionView({
  question, index, total, selectedIndex, feedback, onAnswer, onCancel, secondsLeft,
}: QuestionViewProps) {
  const { theme } = useTheme();
  const { speaking, loading, speak, stop } = useAmyVoice();
  const ttsText = question.prompt.ttsText ?? question.prompt.text ?? "";

  // Shake the prompt card on wrong; pulse it on correct.
  const promptAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (feedback === "wrong") {
      promptAnim.setValue(0);
      Animated.sequence([
        Animated.timing(promptAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(promptAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
        Animated.timing(promptAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(promptAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
        Animated.timing(promptAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
      ]).start();
    } else if (feedback === "correct") {
      promptAnim.setValue(0);
      Animated.sequence([
        Animated.timing(promptAnim, { toValue: 1,    duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(promptAnim, { toValue: 0,    duration: 200, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
      ]).start();
    }
  }, [feedback, promptAnim]);

  // Auto-play prompt for sound-based questions.
  useEffect(() => {
    if (!ttsText) return;
    if (
      question.type === "sound_to_letter" ||
      question.type === "animal_sound" ||
      question.type === "listening"
    ) {
      void speak(ttsText);
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const playPrompt = useCallback(() => {
    if (speaking || loading) {
      stop();
      return;
    }
    if (ttsText) void speak(ttsText);
  }, [speaking, loading, stop, speak, ttsText]);

  // Audio reactions for tap feedback:
  //   correct → cheer ("Yay!"); wrong → replay the prompt audio.
  useEffect(() => {
    if (feedback === "correct") {
      stop();
      void speak("Yay!");
    } else if (feedback === "wrong" && ttsText) {
      stop();
      void speak(ttsText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  const progressPct = ((index + 1) / total) * 100;
  const isMissingLetter = question.type === "missing_letter";
  // Server already masks the word in prompt.text (e.g. "C _ T"), so just use it.
  const promptDisplay = question.prompt.text ?? question.prompt.emoji;

  // Translate -8..8px shake; 1 → scale 1.08 pulse on correct.
  const promptTransform =
    feedback === "wrong"
      ? [{ translateX: promptAnim }]
      : feedback === "correct"
        ? [{
            scale: promptAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
          }]
        : [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg.primary }}
      contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={onCancel} hitSlop={12}>
          <Ionicons name="close" size={26} color={theme.text.primary} />
        </Pressable>
        <Text style={[styles.headerCount, { color: theme.text.primary }]}>
          Q {index + 1} / {total}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {secondsLeft != null && (
            <View
              testID="phonics-test-timer"
              style={[
                styles.timerPill,
                { borderColor: secondsLeft <= 3 ? palette.rose500 : palette.amber500 },
              ]}
            >
              <Ionicons
                name="flash"
                size={12}
                color={secondsLeft <= 3 ? palette.rose500 : palette.amber500}
              />
              <Text style={{
                color: secondsLeft <= 3 ? palette.rose500 : palette.amber500,
                fontWeight: "800",
                fontSize: 12,
              }}>{secondsLeft}s</Text>
            </View>
          )}
          <Text style={[styles.headerType, { color: theme.text.muted }]} numberOfLines={1}>
            {TYPE_LABEL[question.type]}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: theme.card.border }]}>
        <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: theme.brand.primary }]} />
      </View>

      {/* Prompt card */}
      <Animated.View style={{ transform: promptTransform, marginTop: 18, marginBottom: 18 }}>
        <LinearGradient
          colors={
            feedback === "correct"
              ? [palette.emerald500, palette.teal500]
              : feedback === "wrong"
                ? [palette.rose500, brand.pink500]
                : [theme.brand.gradientStart, theme.brand.gradientEnd]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.promptCard}
        >
          <Text style={styles.promptInstruction}>{question.prompt.instruction}</Text>
          {promptDisplay ? (
            <Text style={[styles.promptSymbol, isMissingLetter && { letterSpacing: 6 }]}>
              {promptDisplay}
            </Text>
          ) : null}
          {ttsText ? (
            <TouchableOpacity onPress={playPrompt} style={styles.playBtn} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name={speaking ? "pause" : "volume-high"} size={18} color="#fff" />
              )}
              <Text style={styles.playBtnText}>
                {speaking ? "Stop" : loading ? "Loading…" : "Play sound"}
              </Text>
              {speaking ? <SoundwaveBars /> : null}
            </TouchableOpacity>
          ) : null}
        </LinearGradient>
      </Animated.View>

      {/* Options or Build-Word panel */}
      {question.type === "build_word" ? (
        <BuildWordPanel
          key={question.id}
          question={question}
          disabled={selectedIndex != null}
          feedback={feedback}
          onResult={(ok) => onAnswer(ok ? 0 : 1)}
        />
      ) : (
        <View style={styles.optionsGrid}>
          {question.options.map((opt, i) => (
            <OptionButton
              key={`${question.id}-opt-${i}`}
              opt={opt}
              index={i}
              questionId={question.id}
              selectedIndex={selectedIndex}
              feedback={feedback}
              onPress={() => onAnswer(i)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Animated option button ──────────────────────────────────────────────────

function OptionButton({
  opt, index, questionId, selectedIndex, feedback, onPress,
}: {
  opt: { label: string; emoji?: string };
  index: number;
  questionId: string;
  selectedIndex: number | null;
  feedback: "correct" | "wrong" | null;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const isSelected = selectedIndex === index;
  const showCorrect = feedback === "correct" && isSelected;
  const showWrong = feedback === "wrong" && isSelected;

  // Pulse the selected tile on correct/wrong.
  useEffect(() => {
    if (!isSelected || !feedback) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [feedback, isSelected, scale]);

  const handlePress = () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    setTimeout(onPress, 80);
  };

  return (
    <Animated.View style={{ width: "48%", transform: [{ scale }] }}>
      <TouchableOpacity
        disabled={selectedIndex != null}
        onPress={handlePress}
        activeOpacity={0.85}
        style={[
          styles.optionBtn,
          {
            backgroundColor: showCorrect
              ? "rgba(34,197,94,0.12)"
              : showWrong
                ? "rgba(244,63,94,0.12)"
                : theme.card.bg,
            borderColor: showCorrect
              ? palette.emerald500
              : showWrong
                ? palette.rose500
                : isSelected
                  ? theme.brand.primary
                  : theme.card.border,
            borderWidth: isSelected || showCorrect || showWrong ? 2 : 1,
          },
        ]}
        testID={`phonics-test-option-${index}`}
      >
        {opt.emoji ? <Text style={styles.optionEmoji}>{opt.emoji}</Text> : null}
        <Text style={[styles.optionLabel, { color: theme.text.primary }]}>{opt.label}</Text>
        {showCorrect && (
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={palette.emerald500}
            style={{ position: "absolute", top: 6, right: 6 }}
          />
        )}
        {showWrong && (
          <Ionicons
            name="close-circle"
            size={22}
            color={palette.rose500}
            style={{ position: "absolute", top: 6, right: 6 }}
          />
        )}
        {isSelected && !feedback && (
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={theme.brand.primary}
            style={{ position: "absolute", top: 6, right: 6 }}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Soundwave bars (RN) ─────────────────────────────────────────────────────

function SoundwaveBars() {
  const bars = [0, 1, 2, 3].map(() => useRef(new Animated.Value(0.3)).current); // eslint-disable-line react-hooks/rules-of-hooks
  useEffect(() => {
    const loops = bars.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(b, { toValue: 1,   duration: 350, delay: i * 100, useNativeDriver: true }),
          Animated.timing(b, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => { loops.forEach((l) => l.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 14, marginLeft: 4 }}>
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3, height: 14, marginHorizontal: 1, borderRadius: 2,
            backgroundColor: "#fff",
            transform: [{ scaleY: b }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Build Word panel (RN) ───────────────────────────────────────────────────

function BuildWordPanel({
  question, disabled, feedback, onResult,
}: {
  question: ClientQuestion;
  disabled: boolean;
  feedback: "correct" | "wrong" | null;
  onResult: (ok: boolean) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const target = (question.prompt.meta?.targetWord ?? "").toLowerCase();
  const pool = question.prompt.meta?.letterPool ?? [];
  const [picked, setPicked] = useState<number[]>([]);
  const shake = useRef(new Animated.Value(0)).current;
  const built = picked.map((i) => pool[i] ?? "").join("");

  useEffect(() => {
    if (disabled || built.length < target.length) return;
    const ok = built.toLowerCase() === target;
    if (!ok) {
      shake.setValue(0);
      Animated.sequence([
        Animated.timing(shake, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 6,  duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0,  duration: 60, useNativeDriver: true }),
      ]).start(() => {
        setPicked([]);
        onResult(false);
      });
    } else {
      onResult(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built]);

  return (
    <View style={{ gap: 12 }}>
      <Animated.View style={{ flexDirection: "row", justifyContent: "center", gap: 8, transform: [{ translateX: shake }] }}>
        {Array.from({ length: target.length }).map((_, i) => {
          const ch = built[i] ?? "";
          return (
            <View
              key={i}
              testID={`phonics-build-slot-${i}`}
              style={[
                styles.buildSlot,
                {
                  borderColor: feedback === "correct"
                    ? palette.emerald500
                    : feedback === "wrong"
                      ? palette.rose500
                      : ch ? theme.brand.primary : theme.card.border,
                  backgroundColor: ch ? "rgba(168,85,247,0.10)" : "transparent",
                },
              ]}
            >
              <Text style={{ fontSize: 24, fontWeight: "900", color: theme.text.primary, textTransform: "uppercase" }}>
                {ch}
              </Text>
            </View>
          );
        })}
      </Animated.View>

      <View style={styles.buildPool}>
        {pool.map((letter, i) => {
          const used = picked.includes(i);
          return (
            <TouchableOpacity
              key={`${question.id}-pool-${i}`}
              disabled={used || disabled || picked.length >= target.length}
              onPress={() => {
                if (Platform.OS !== "web") void Haptics.selectionAsync();
                setPicked((p) => [...p, i]);
              }}
              testID={`phonics-build-letter-${i}`}
              style={[
                styles.buildLetter,
                {
                  backgroundColor: theme.card.bg,
                  borderColor: theme.card.border,
                  opacity: used ? 0.3 : 1,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 20, fontWeight: "900", color: theme.text.primary, textTransform: "uppercase" }}>
                {letter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {picked.length > 0 && !disabled && (
        <TouchableOpacity
          onPress={() => setPicked((p) => p.slice(0, -1))}
          testID="phonics-build-undo"
          style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Ionicons name="chevron-back" size={14} color={theme.text.secondary} />
          <Text style={{ color: theme.text.secondary, fontSize: 12, fontWeight: "700" }}>{t("components.phonics_test_runner.undo")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Result view ─────────────────────────────────────────────────────────────

function ResultView({ data, childName, onDone }: { data: SubmitResponse; childName: string; onDone: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { breakdown, weakConcepts, insight } = data;
  const accuracy = breakdown.accuracyPct;
  const ringColors: readonly [string, string] =
    accuracy >= 80 ? [palette.emerald500, palette.teal500] :
    accuracy >= 50 ? [palette.amber500, palette.orange500] :
                     [palette.rose500, brand.pink500];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg.primary }}
      contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
    >
      <View style={{ alignItems: "center", marginBottom: 18 }}>
        <LinearGradient
          colors={ringColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.scoreRing}
        >
          <Text style={styles.scoreNum}>{accuracy}%</Text>
          <Text style={styles.scoreFrac}>{breakdown.correct}/{breakdown.total}</Text>
        </LinearGradient>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
          <Ionicons name="trophy" size={18} color={palette.amber500} />
          <Text style={[styles.perfLabel, { color: theme.text.primary }]}>
            {insight.performanceLabel}
          </Text>
        </View>
      </View>

      <View style={[styles.insightCard, { backgroundColor: theme.card.bg, borderColor: theme.card.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <Ionicons name="sparkles" size={14} color={theme.brand.primary} />
          <Text style={[styles.insightTitle, { color: theme.brand.primary }]}>
            {childName}'s phonics insight
          </Text>
        </View>
        <Text style={[styles.insightText, { color: theme.text.primary }]}>{insight.text}</Text>
        {insight.suggestion ? (
          <Text style={[styles.insightSuggestion, { color: theme.text.secondary }]}>
            💡 {insight.suggestion}
          </Text>
        ) : null}
      </View>

      {weakConcepts.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text style={[styles.weakHeader, { color: theme.text.secondary }]}>{t("components.phonics_test_runner.sounds_to_revisit")}</Text>
          <View style={styles.weakRow}>
            {weakConcepts.map((wc) => (
              <View key={wc.id} style={[styles.weakChip, { backgroundColor: theme.card.bgElevated, borderColor: theme.card.border }]}>
                <Text style={[styles.weakChipText, { color: theme.text.primary }]}>
                  {wc.emoji ?? ""} {wc.symbol}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={onDone}
        style={[styles.primaryBtn, { backgroundColor: theme.brand.primary }]}
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-back" size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>{t("components.phonics_test_runner.back_to_phonics_tests")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center:        { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText:   { fontSize: 14, marginTop: 8 },
  errorTitle:    { fontSize: 18, fontWeight: "800", marginTop: 14, textAlign: "center" },
  errorMsg:      { fontSize: 13, marginTop: 6, textAlign: "center", marginBottom: 20 },

  headerRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  headerCount:   { fontSize: 13, fontWeight: "800" },
  headerType:    { fontSize: 11, fontWeight: "600", maxWidth: 110, textAlign: "right" },
  timerPill:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1.5 },

  progressTrack: { height: 5, borderRadius: 999, overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: 999 },

  promptCard:    { borderRadius: 24, padding: 24, alignItems: "center" },
  promptInstruction: { color: "rgba(255,255,255,0.95)", fontSize: 14, fontWeight: "600", textAlign: "center", marginBottom: 10 },
  promptSymbol:  { color: "#fff", fontSize: 64, fontWeight: "900", textAlign: "center", lineHeight: 76 },
  playBtn:       { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginTop: 12 },
  playBtnText:   { color: "#fff", fontSize: 13, fontWeight: "700" },

  optionsGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  optionBtn:     { width: "100%", minHeight: 76, borderRadius: 18, padding: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  optionEmoji:   { fontSize: 28 },
  optionLabel:   { fontSize: 18, fontWeight: "700" },

  buildSlot:     { width: 48, height: 56, borderRadius: 12, borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  buildPool:     { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  buildLetter:   { width: "22%", aspectRatio: 1, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },

  scoreRing:     { width: 130, height: 130, borderRadius: 65, alignItems: "center", justifyContent: "center" },
  scoreNum:      { color: "#fff", fontSize: 32, fontWeight: "900" },
  scoreFrac:     { color: "rgba(255,255,255,0.95)", fontSize: 12, fontWeight: "600", marginTop: 2 },
  perfLabel:     { fontSize: 16, fontWeight: "800" },

  insightCard:   { borderRadius: 18, padding: 14, borderWidth: 1, marginBottom: 18 },
  insightTitle:  { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  insightText:   { fontSize: 14, fontWeight: "500", lineHeight: 20 },
  insightSuggestion: { fontSize: 13, fontWeight: "500", lineHeight: 20, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.1)" },

  weakHeader:    { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  weakRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  weakChip:      { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  weakChipText:  { fontSize: 14, fontWeight: "700" },

  primaryBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16, marginTop: 6 },
  primaryBtnText:{ color: "#fff", fontSize: 15, fontWeight: "800" },
});

export default PhonicsTestRunner;
