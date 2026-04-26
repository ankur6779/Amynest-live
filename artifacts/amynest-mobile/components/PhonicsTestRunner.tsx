import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Pressable, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { API_BASE_URL } from "@/constants/api";

// ─── Shared types (mirror server payloads) ───────────────────────────────────

export type TestType = "daily" | "weekly";

export type QuestionType =
  | "letter_to_sound" | "sound_to_letter" | "word_pic"
  | "animal_sound" | "blending" | "listening";

export interface ClientQuestion {
  id: string;
  type: QuestionType;
  prompt: { instruction: string; symbol?: string; emoji?: string; ttsText?: string };
  options: { label: string; emoji?: string }[];
}

export interface StartResponse {
  sessionToken: string;
  testType: TestType;
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
};

// ─── Runner ──────────────────────────────────────────────────────────────────

export interface PhonicsTestRunnerProps {
  childId: number;
  childName: string;
  testType: TestType;
  onCompleted?: () => void;
  onCancel: () => void;
}

type Phase =
  | { kind: "loading" }
  | { kind: "running"; data: StartResponse; index: number; answers: { questionId: string; selectedIndex: number }[]; selectedIndex: number | null }
  | { kind: "submitting" }
  | { kind: "result"; data: SubmitResponse }
  | { kind: "error"; message: string };

export function PhonicsTestRunner({ childId, childName, testType, onCompleted, onCancel }: PhonicsTestRunnerProps) {
  const { theme } = useTheme();
  const authFetch = useAuthFetch();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  // Start the test once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/phonics/tests/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, testType }),
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
          setPhase({ kind: "running", data, index: 0, answers: [], selectedIndex: null });
        }
      } catch (err) {
        if (!cancelled) {
          setPhase({ kind: "error", message: err instanceof Error ? err.message : "Failed to start" });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [authFetch, childId, testType]);

  const handleAnswer = useCallback((selectedIndex: number) => {
    if (phase.kind !== "running" || phase.selectedIndex != null) return;
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    const q = phase.data.questions[phase.index];
    const newAnswers = [...phase.answers, { questionId: q.id, selectedIndex }];
    setPhase({ ...phase, answers: newAnswers, selectedIndex });
    setTimeout(async () => {
      const isLast = phase.index + 1 >= phase.data.questions.length;
      if (!isLast) {
        setPhase({ ...phase, answers: newAnswers, index: phase.index + 1, selectedIndex: null });
        return;
      }
      // Final submit.
      setPhase({ kind: "submitting" });
      try {
        const res = await authFetch(`${API_BASE_URL}/api/phonics/tests/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: phase.data.sessionToken, answers: newAnswers }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error ?? `HTTP ${res.status}`);
        }
        const submitData = (await res.json()) as SubmitResponse;
        setPhase({ kind: "result", data: submitData });
        onCompleted?.();
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (err) {
        setPhase({ kind: "error", message: err instanceof Error ? err.message : "Failed to submit" });
      }
    }, 350);
  }, [phase, authFetch, onCompleted]);

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
          <Text style={styles.primaryBtnText}>Go back</Text>
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
      onAnswer={handleAnswer}
      onCancel={onCancel}
    />
  );
}

// ─── Question view ───────────────────────────────────────────────────────────

interface QuestionViewProps {
  question: ClientQuestion;
  index: number;
  total: number;
  selectedIndex: number | null;
  onAnswer: (i: number) => void;
  onCancel: () => void;
}

function QuestionView({ question, index, total, selectedIndex, onAnswer, onCancel }: QuestionViewProps) {
  const { theme } = useTheme();
  const { speaking, loading, speak, stop } = useAmyVoice();
  const ttsText = question.prompt.ttsText ?? question.prompt.text ?? "";

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

  const progressPct = ((index + 1) / total) * 100;

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
        <Text style={[styles.headerType, { color: theme.text.muted }]} numberOfLines={1}>
          {TYPE_LABEL[question.type]}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: theme.card.border }]}>
        <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: theme.brand.primary }]} />
      </View>

      {/* Prompt card */}
      <LinearGradient
        colors={[theme.brand.gradientStart, theme.brand.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.promptCard}
      >
        <Text style={styles.promptInstruction}>{question.prompt.instruction}</Text>
        {(question.prompt.text || question.prompt.emoji) && (
          <Text style={styles.promptSymbol}>
            {question.prompt.text ?? question.prompt.emoji}
          </Text>
        )}
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
          </TouchableOpacity>
        ) : null}
      </LinearGradient>

      {/* Options */}
      <View style={styles.optionsGrid}>
        {question.options.map((opt, i) => {
          const isSelected = selectedIndex === i;
          return (
            <TouchableOpacity
              key={`${question.id}-opt-${i}`}
              disabled={selectedIndex != null}
              onPress={() => onAnswer(i)}
              activeOpacity={0.85}
              style={[
                styles.optionBtn,
                {
                  backgroundColor: theme.card.bg,
                  borderColor: isSelected ? theme.brand.primary : theme.card.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              testID={`phonics-test-option-${i}`}
            >
              {opt.emoji ? <Text style={styles.optionEmoji}>{opt.emoji}</Text> : null}
              <Text style={[styles.optionLabel, { color: theme.text.primary }]}>{opt.label}</Text>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={theme.brand.primary}
                  style={{ position: "absolute", top: 6, right: 6 }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Result view ─────────────────────────────────────────────────────────────

function ResultView({ data, childName, onDone }: { data: SubmitResponse; childName: string; onDone: () => void }) {
  const { theme } = useTheme();
  const { breakdown, weakConcepts, insight } = data;
  const accuracy = breakdown.accuracyPct;
  const ringColors: readonly [string, string] =
    accuracy >= 80 ? ["#10b981", "#14b8a6"] :
    accuracy >= 50 ? ["#f59e0b", "#f97316"] :
                     ["#f43f5e", "#ec4899"];

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
          <Ionicons name="trophy" size={18} color="#f59e0b" />
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
          <Text style={[styles.weakHeader, { color: theme.text.secondary }]}>Sounds to revisit</Text>
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
        <Text style={styles.primaryBtnText}>Back to Phonics Tests</Text>
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
  headerType:    { fontSize: 11, fontWeight: "600", maxWidth: 120, textAlign: "right" },

  progressTrack: { height: 5, borderRadius: 999, overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: 999 },

  promptCard:    { borderRadius: 24, padding: 24, alignItems: "center", marginTop: 18, marginBottom: 18 },
  promptInstruction: { color: "rgba(255,255,255,0.95)", fontSize: 14, fontWeight: "600", textAlign: "center", marginBottom: 10 },
  promptSymbol:  { color: "#fff", fontSize: 72, fontWeight: "900", textAlign: "center", lineHeight: 84 },
  playBtn:       { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginTop: 12 },
  playBtnText:   { color: "#fff", fontSize: 13, fontWeight: "700" },

  optionsGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  optionBtn:     { width: "48%", minHeight: 76, borderRadius: 18, padding: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  optionEmoji:   { fontSize: 28 },
  optionLabel:   { fontSize: 18, fontWeight: "700" },

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
