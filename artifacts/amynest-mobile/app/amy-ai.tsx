import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import AiQuotaBanner from "@/components/AiQuotaBanner";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { brand, ACCENT_PINK } from "@/constants/colors";
import { AiTutorChatResponse } from "@workspace/api-zod";
import type { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────

type Mode = "teach" | "practice" | "quiz" | "doubt";
type Subject = "general" | "math" | "english" | "gk" | "logic";

type TutorReply = z.infer<typeof AiTutorChatResponse>["reply"];

type Turn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "tutor"; reply: TutorReply; pickedIndex?: number }
  | { id: string; role: "tutor-error"; text: string };

const MODES: Mode[] = ["teach", "practice", "quiz", "doubt"];
const SUBJECTS: Subject[] = ["general", "math", "english", "gk", "logic"];
const SUBJECT_EMOJI: Record<Subject, string> = {
  general: "✨", math: "🔢", english: "📖", gk: "🌍", logic: "🧩",
};
const MODE_ICON: Record<Mode, React.ComponentProps<typeof MaterialCommunityIcons>["name"]> = {
  teach: "school",
  practice: "checkbox-multiple-marked-outline",
  quiz: "lightbulb-on-outline",
  doubt: "help-circle-outline",
};

const SUGGESTED_QUESTION_KEYS = [
  "ai.suggested_q1",
  "ai.suggested_q2",
  "ai.suggested_q3",
  "ai.suggested_q4",
  "ai.suggested_q5",
  "ai.suggested_q6",
] as const;

const PREFS_KEY = (childId: number | string | null | undefined) =>
  `amynest:amy-tutor-prefs:${childId ?? "default"}`;

const CHAT_KEY = (childId: number | string | null | undefined) =>
  `amynest:amy-tutor-chat:${childId ?? "default"}`;

// ─── Screen ───────────────────────────────────────────────────────────────

export default function AmyAIScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const params = useLocalSearchParams<{ q?: string; childId?: string }>();
  // childId can be passed as a route param to scope the session to a specific child.
  // Falls back to the primary child from the API.
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();

  const [mode, setMode] = useState<Mode>("teach");
  const [subject, setSubject] = useState<Subject>("general");
  const [topic, setTopic] = useState("");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const tts = useAmyVoice();
  const [activeTtsTurnId, setActiveTtsTurnId] = useState<string | null>(null);

  const { data: childrenData } = useQuery<Array<{ id?: number; name?: string; age?: number | null }>>({
    queryKey: ["children-for-amy-tutor"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      return r.ok ? r.json() : [];
    },
    staleTime: 60_000,
  });
  // If a childId param is provided (e.g. navigating from a child-specific context),
  // use that child; otherwise fall back to the first (primary) child.
  const paramChildId = params.childId ? Number(params.childId) : null;
  const primaryChild = Array.isArray(childrenData) && childrenData.length > 0
    ? (paramChildId != null
        ? (childrenData.find((c) => c.id === paramChildId) ?? childrenData[0])
        : childrenData[0])
    : null;
  const childKey = primaryChild?.id ?? null;

  // Load persisted mode/subject and chat history for this child
  useEffect(() => {
    let cancelled = false;
    setChatLoaded(false);
    setTurns([]);
    setActiveTtsTurnId(null);
    tts.stop();
    (async () => {
      try {
        const [rawPrefs, rawChat] = await Promise.all([
          AsyncStorage.getItem(PREFS_KEY(childKey)),
          AsyncStorage.getItem(CHAT_KEY(childKey)),
        ]);
        if (cancelled) return;
        if (rawPrefs) {
          const parsed = JSON.parse(rawPrefs) as { mode?: Mode; subject?: Subject; topic?: string };
          if (parsed.mode && MODES.includes(parsed.mode)) setMode(parsed.mode);
          if (parsed.subject && SUBJECTS.includes(parsed.subject)) setSubject(parsed.subject);
          if (typeof parsed.topic === "string") setTopic(parsed.topic);
        }
        if (rawChat) {
          const parsedChat = JSON.parse(rawChat) as Turn[];
          if (Array.isArray(parsedChat)) setTurns(parsedChat);
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setChatLoaded(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childKey]);

  // Persist prefs on change (debounced via timeout)
  useEffect(() => {
    const id = setTimeout(() => {
      AsyncStorage.setItem(
        PREFS_KEY(childKey),
        JSON.stringify({ mode, subject, topic }),
      ).catch(() => {});
    }, 300);
    return () => clearTimeout(id);
  }, [childKey, mode, subject, topic]);

  // Persist chat turns per child (debounced, max 50 turns)
  useEffect(() => {
    if (!chatLoaded) return; // don't overwrite stored history before it's loaded
    const id = setTimeout(() => {
      const toSave = turns.slice(-50);
      AsyncStorage.setItem(CHAT_KEY(childKey), JSON.stringify(toSave)).catch(() => {});
    }, 500);
    return () => clearTimeout(id);
  }, [childKey, turns, chatLoaded]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    const userTurn: Turn = { id: `u-${Date.now()}`, role: "user", text: trimmed };
    setTurns((all) => [...all, userTurn]);
    setLoading(true);
    try {
      // Build a compact history of the last 6 turns to give the model context.
      const history = turns.slice(-6).flatMap<{ role: "user" | "tutor"; text: string }>((tr) => {
        if (tr.role === "user") return [{ role: "user", text: tr.text }];
        if (tr.role === "tutor") {
          const t = tr.reply;
          const parts = [t.content, t.question ?? ""].filter(Boolean).join(" ").trim();
          return parts ? [{ role: "tutor", text: parts.slice(0, 1500) }] : [];
        }
        return [];
      });
      const childAge =
        typeof primaryChild?.age === "number" && primaryChild.age > 0 ? primaryChild.age : undefined;
      const res = await authFetch("/api/ai-tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: typeof primaryChild?.id === "number" ? primaryChild.id : undefined,
          childAge,
          mode,
          subject,
          topic: topic.trim() || undefined,
          message: trimmed,
          history,
        }),
      });
      if (res.status === 402) {
        await useSubscriptionStore.getState().refresh();
        router.push({ pathname: "/paywall", params: { reason: "ai_quota" } });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => null);
      // Validate the wire shape against the generated zod schema so any
      // server drift surfaces here as a graceful error bubble instead of
      // a half-rendered tutor turn.
      const parsed = AiTutorChatResponse.safeParse(json);
      if (!parsed.success) {
        throw new Error("invalid_reply_shape");
      }
      const reply = parsed.data.reply as TutorReply;
      const safe: TutorReply = {
        type: reply.type ?? mode,
        content: String(reply.content ?? ""),
        examples: Array.isArray(reply.examples) ? reply.examples.filter(Boolean) : [],
        question: reply.question ?? null,
        options: Array.isArray(reply.options) ? reply.options.filter(Boolean) : [],
        answer: reply.answer ?? null,
      };
      setTurns((all) => [...all, { id: `t-${Date.now()}`, role: "tutor", reply: safe }]);
      void useSubscriptionStore.getState().refresh();
    } catch {
      setTurns((all) => [
        ...all,
        { id: `e-${Date.now()}`, role: "tutor-error", text: t("ai.tutor_lost_reply") },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        try { scrollRef.current?.scrollToEnd?.({ animated: true }); } catch { /* noop */ }
      }, 50);
    }
  }, [authFetch, loading, mode, primaryChild?.id, router, subject, t, topic]);

  // Auto-send if a prompt was passed via params
  useEffect(() => {
    if (params.q && typeof params.q === "string") {
      void send(params.q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q]);

  const pickOption = (turnId: string, optIdx: number) => {
    setTurns((all) =>
      all.map((tr) => (tr.id === turnId && tr.role === "tutor" ? { ...tr, pickedIndex: optIdx } : tr)),
    );
  };

  const isEmpty = turns.length === 0 && !loading && chatLoaded;
  const canClear = turns.length > 0 && !loading;

  const clearChat = () => {
    if (!canClear) return;
    const childName = primaryChild?.name ?? t("ai.tutor_badge");
    Alert.alert(
      t("ai.clear_confirm_title"),
      t("ai.clear_confirm_body", { name: childName }),
      [
        { text: t("ai.clear_confirm_cancel"), style: "cancel" },
        {
          text: t("ai.clear_confirm_yes"),
          style: "destructive",
          onPress: () => {
            tts.stop();
            setActiveTtsTurnId(null);
            setTurns([]);
            setInput("");
            AsyncStorage.removeItem(CHAT_KEY(childKey)).catch(() => {});
          },
        },
      ],
    );
  };

  const handleTtsListen = useCallback((turnId: string, text: string) => {
    if (activeTtsTurnId === turnId && (tts.speaking || tts.loading)) {
      tts.stop();
      setActiveTtsTurnId(null);
    } else {
      setActiveTtsTurnId(turnId);
      void tts.speak(text);
    }
  }, [activeTtsTurnId, tts]);

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <LinearGradient colors={[brand.primary, ACCENT_PINK]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.headerIcon}>
          <MaterialCommunityIcons name="brain" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.headerTitle}>{t("ai.page_title")}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t("ai.tutor_badge")}</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={2}>{t("ai.tutor_subtitle")}</Text>
        </View>
        {canClear && (
          <Pressable
            onPress={clearChat}
            hitSlop={10}
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.6 }]}
            accessibilityLabel={t("ai.clear_chat")}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.clearBtnText}>{t("ai.clear_chat")}</Text>
          </Pressable>
        )}
      </View>

      <AiQuotaBanner />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={20}
      >
        {/* Mode strip + subject chips + topic input */}
        <View style={styles.controls}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {MODES.map((m) => {
              const active = m === mode;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(`ai.mode_${m}`) + " · " + t(`ai.mode_${m}_hint`)}
                  style={[styles.modeChip, active && styles.modeChipActive]}
                >
                  <MaterialCommunityIcons
                    name={MODE_ICON[m]}
                    size={14}
                    color={active ? "#fff" : "rgba(255,255,255,0.75)"}
                  />
                  <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                    {t(`ai.mode_${m}`)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {SUBJECTS.map((s) => {
              const active = s === subject;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSubject(s)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.subjectChip, active && styles.subjectChipActive]}
                >
                  <Text style={styles.subjectEmoji}>{SUBJECT_EMOJI[s]}</Text>
                  <Text style={[styles.subjectChipText, active && styles.subjectChipTextActive]}>
                    {t(`ai.subject_${s}`)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <TextInput
            value={topic}
            onChangeText={(v) => setTopic(v.slice(0, 120))}
            placeholder={t("ai.topic_placeholder")}
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.topicInput}
          />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {isEmpty && (
            <View style={styles.emptyWrap}>
              <LinearGradient colors={[brand.primary, ACCENT_PINK]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.emptyAvatar}>
                <MaterialCommunityIcons name="brain" size={32} color="#fff" />
              </LinearGradient>
              <Text style={styles.emptyHeading}>{t("ai.tutor_empty_heading")}</Text>
              <Text style={styles.emptyBody}>{t("ai.tutor_empty_body")}</Text>
              <View style={styles.suggestionsWrap}>
                <Text style={styles.suggestionsLabel}>{t("ai.popular_questions")}</Text>
                {SUGGESTED_QUESTION_KEYS.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => send(t(key))}
                    style={({ pressed }) => [styles.suggestionBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.suggestionText}>{t(key)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {turns.map((turn) => (
            <TurnView
              key={turn.id}
              turn={turn}
              onPickOption={pickOption}
              onListen={handleTtsListen}
              ttsActiveId={activeTtsTurnId}
              ttsLoading={tts.loading}
              ttsSpeaking={tts.speaking}
            />
          ))}

          {loading && <TypingBubble label={t("ai.thinking")} />}
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t("ai.tutor_input_placeholder")}
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.input}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            multiline
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
            style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]}
          >
            <LinearGradient colors={[brand.primary, ACCENT_PINK]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.sendBtnGrad}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="arrow-up" size={20} color="#fff" />}
            </LinearGradient>
          </Pressable>
        </View>
        <Text style={[styles.sendHint, { paddingBottom: Math.max(insets.bottom, 6) }]}>{t("ai.disclaimer")}</Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

export function TurnView({
  turn,
  onPickOption,
  onListen,
  ttsActiveId,
  ttsLoading,
  ttsSpeaking,
}: {
  turn: Turn;
  onPickOption: (turnId: string, optIdx: number) => void;
  onListen: (turnId: string, text: string) => void;
  ttsActiveId: string | null;
  ttsLoading: boolean;
  ttsSpeaking: boolean;
}) {
  const { t } = useTranslation();

  if (turn.role === "user") {
    return (
      <View style={[styles.bubbleRow, styles.bubbleRowRight]}>
        <View style={[styles.bubble, styles.bubbleUser]}>
          <Text style={[styles.bubbleText, { color: "#fff" }]}>{turn.text}</Text>
        </View>
      </View>
    );
  }

  if (turn.role === "tutor-error") {
    return (
      <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
        <LinearGradient colors={[brand.primary, ACCENT_PINK]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.avatarSm}>
          <MaterialCommunityIcons name="brain" size={14} color="#fff" />
        </LinearGradient>
        <View style={[styles.bubble, styles.bubbleAmy, { borderColor: "rgba(248,113,113,0.4)" }]}>
          <Text style={[styles.bubbleText, { color: "rgba(255,200,200,0.95)" }]}>{turn.text}</Text>
        </View>
      </View>
    );
  }

  const reply = turn.reply;
  const correctIdx =
    typeof reply.answer === "number" && reply.options[reply.answer] !== undefined
      ? reply.answer
      : null;
  const picked = turn.pickedIndex;

  const isThisTtsActive = ttsActiveId === turn.id;
  const ttsText = [reply.content, reply.question].filter(Boolean).join(" ").trim();

  return (
    <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
      <LinearGradient colors={[brand.primary, ACCENT_PINK]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.avatarSm}>
        <MaterialCommunityIcons name="brain" size={14} color="#fff" />
      </LinearGradient>
      <View style={[styles.bubble, styles.bubbleAmy, { gap: 10 }]}>
        {/* Listen button row */}
        {ttsText.length > 0 && (
          <Pressable
            onPress={() => onListen(turn.id, ttsText)}
            style={({ pressed }) => [styles.listenBtn, pressed && { opacity: 0.6 }]}
            accessibilityLabel={isThisTtsActive && (ttsSpeaking || ttsLoading) ? t("ai.stop") : t("ai.listen")}
            accessibilityRole="button"
          >
            {isThisTtsActive && ttsLoading ? (
              <ActivityIndicator size="small" color="rgba(167,139,250,0.9)" />
            ) : (
              <Ionicons
                name={isThisTtsActive && ttsSpeaking ? "stop-circle-outline" : "volume-medium-outline"}
                size={14}
                color="rgba(167,139,250,0.9)"
              />
            )}
            <Text style={styles.listenBtnText}>
              {isThisTtsActive && (ttsSpeaking || ttsLoading) ? t("ai.stop") : t("ai.listen")}
            </Text>
          </Pressable>
        )}
        {reply.content ? <MarkdownText text={reply.content} /> : null}

        {reply.examples.length > 0 && (
          <View style={styles.examplesWrap}>
            {reply.examples.map((ex, i) => (
              <View key={i} style={styles.exampleChip}>
                <Text style={styles.exampleChipText}>{ex}</Text>
              </View>
            ))}
          </View>
        )}

        {reply.question && (
          <View style={styles.questionBox}>
            <Text style={styles.questionText}>{reply.question}</Text>
            <View style={{ gap: 6, marginTop: 6 }}>
              {reply.options.map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = correctIdx === i;
                const showVerdict = picked !== undefined;
                let bg = "rgba(255,255,255,0.05)";
                let border = "rgba(255,255,255,0.12)";
                let color = "rgba(255,255,255,0.92)";
                if (showVerdict) {
                  if (isPicked && isCorrect) {
                    bg = "rgba(16,185,129,0.18)"; border = "rgba(16,185,129,0.6)"; color = "rgba(187,247,208,1)";
                  } else if (isPicked && !isCorrect) {
                    bg = "rgba(244,63,94,0.18)"; border = "rgba(244,63,94,0.6)"; color = "rgba(254,205,211,1)";
                  } else if (isCorrect) {
                    bg = "rgba(16,185,129,0.10)"; border = "rgba(16,185,129,0.45)"; color = "rgba(167,243,208,1)";
                  } else {
                    bg = "rgba(255,255,255,0.04)"; border = "rgba(255,255,255,0.08)"; color = "rgba(255,255,255,0.55)";
                  }
                }
                return (
                  <Pressable
                    key={i}
                    onPress={() => picked === undefined && onPickOption(turn.id, i)}
                    disabled={picked !== undefined}
                    style={[styles.optionBtn, { backgroundColor: bg, borderColor: border }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isPicked, disabled: picked !== undefined }}
                  >
                    <Text style={[styles.optionText, { color }]}>{opt}</Text>
                    {showVerdict && isPicked && isCorrect && (
                      <Ionicons name="checkmark-circle" size={16} color="rgba(167,243,208,1)" />
                    )}
                    {showVerdict && isPicked && !isCorrect && (
                      <Ionicons name="close-circle" size={16} color="rgba(254,205,211,1)" />
                    )}
                  </Pressable>
                );
              })}
            </View>
            {picked !== undefined && correctIdx !== null && (
              <Text style={styles.verdictText}>
                {picked === correctIdx
                  ? `🎉 ${t("ai.tutor_right_on")}`
                  : t("ai.tutor_answer_is", { answer: reply.options[correctIdx] })}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Lightweight markdown renderer for tutor `content`. We deliberately avoid a
 * heavyweight RN-markdown package — the server-side prompt only ever returns
 * short paragraphs with **bold**, *italic*, `code`, and line breaks, so a
 * tiny inline parser is enough and keeps the bundle small.
 */
function MarkdownText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  return (
    <View>
      {lines.map((line, li) => {
        const trimmed = line.replace(/^\s*[-*]\s+/, "");
        const isBullet = trimmed !== line;
        return (
          <View
            key={li}
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: li === 0 ? 0 : 2 }}
          >
            {isBullet && <Text style={[styles.bubbleText, { color: "rgba(255,255,255,0.55)" }]}>•</Text>}
            <Text style={[styles.bubbleText, { flex: 1 }]}>{renderInlineMarkdown(trimmed)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function renderInlineMarkdown(input: string): React.ReactNode[] {
  // Split on **bold**, *italic*, and `code`. Order matters: bold before italic
  // so `**foo**` doesn't get eaten by the single-* italic rule.
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = input.split(re).filter((p) => p !== "");
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <Text key={i} style={{ fontWeight: "800" }}>
          {p.slice(2, -2)}
        </Text>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <Text key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </Text>
      );
    }
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <Text key={i} style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", backgroundColor: "rgba(255,255,255,0.06)" }}>
          {p.slice(1, -1)}
        </Text>
      );
    }
    return p;
  });
}

function TypingBubble({ label }: { label: string }) {
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(d, { toValue: 1, duration: 350, delay: i * 150, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);
  return (
    <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
      <LinearGradient colors={[brand.primary, ACCENT_PINK]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.avatarSm}>
        <MaterialCommunityIcons name="brain" size={14} color="#fff" />
      </LinearGradient>
      <View style={[styles.bubble, styles.bubbleAmy, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
        <Text style={styles.bubbleText}>{label}</Text>
        <View style={{ flexDirection: "row", gap: 3 }}>
          {dots.map((d, i) => (
            <Animated.View
              key={i}
              style={[
                styles.typingDot,
                {
                  opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                  transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  backBtn: { padding: 4 },
  headerIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  headerSubtitle: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: "rgba(124,58,237,0.35)", borderWidth: 1, borderColor: "rgba(167,139,250,0.6)" },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  clearBtnText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },

  controls: { paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  chipRow: { gap: 8, paddingRight: 8 },
  modeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  modeChipActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  modeChipText: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700" },
  modeChipTextActive: { color: "#fff" },
  subjectChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  subjectChipActive: { backgroundColor: "rgba(124,58,237,0.45)", borderColor: "rgba(167,139,250,0.7)" },
  subjectEmoji: { fontSize: 13 },
  subjectChipText: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600" },
  subjectChipTextActive: { color: "#fff", fontWeight: "700" },
  topicInput: { color: "#fff", fontSize: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },

  bubbleRow: { flexDirection: "row", gap: 8, alignItems: "flex-end", maxWidth: "100%" },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  avatarSm: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, maxWidth: "82%" },
  bubbleAmy: { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderTopLeftRadius: 4 },
  bubbleUser: { backgroundColor: brand.primary, borderTopRightRadius: 4 },
  bubbleText: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20 },

  examplesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  exampleChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: "rgba(167,139,250,0.20)", borderWidth: 1, borderColor: "rgba(167,139,250,0.45)" },
  exampleChipText: { color: "rgba(237,233,254,1)", fontSize: 11, fontWeight: "700" },

  questionBox: { padding: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(124,58,237,0.45)", backgroundColor: "rgba(124,58,237,0.10)" },
  questionText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  optionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  optionText: { fontSize: 13, fontWeight: "600", flex: 1 },
  verdictText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700", marginTop: 6 },

  emptyWrap: { alignItems: "center", paddingTop: 24, gap: 10 },
  emptyAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyHeading: { color: "#fff", fontWeight: "800", fontSize: 18, textAlign: "center" },
  emptyBody: { color: "rgba(255,255,255,0.65)", fontSize: 13, textAlign: "center", paddingHorizontal: 24, lineHeight: 18 },

  suggestionsWrap: { marginTop: 14, gap: 8, alignSelf: "stretch" },
  suggestionsLabel: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  suggestionBtn: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  suggestionText: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "500" },

  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.85)" },

  listenBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: "rgba(167,139,250,0.10)", borderWidth: 1, borderColor: "rgba(167,139,250,0.30)" },
  listenBtnText: { color: "rgba(167,139,250,0.9)", fontSize: 11, fontWeight: "700" },

  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(11,11,26,0.7)" },
  input: { flex: 1, color: "#fff", fontSize: 15, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", maxHeight: 120 },
  sendBtn: { borderRadius: 22, overflow: "hidden" },
  sendBtnGrad: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sendHint: { color: "rgba(255,255,255,0.4)", fontSize: 10, textAlign: "center", paddingTop: 4, backgroundColor: "rgba(11,11,26,0.7)" },
});
