import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import AiQuotaBanner from "@/components/AiQuotaBanner";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { brand } from "@/constants/colors";

type Message = { id: string; role: "user" | "amy"; text: string };

const SUGGESTED_QUESTION_KEYS = [
  "ai.suggested_q1",
  "ai.suggested_q2",
  "ai.suggested_q3",
  "ai.suggested_q4",
  "ai.suggested_q5",
  "ai.suggested_q6",
] as const;

export default function AmyAIScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const params = useLocalSearchParams<{ q?: string }>();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const welcomeMessage = useMemo<Message>(
    () => ({ id: "welcome", role: "amy", text: t("ai.welcome_msg") }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language],
  );
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Keep welcome message text in sync with current language
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) return [welcomeMessage];
      if (prev[0]?.id === "welcome") {
        const next = prev.slice();
        next[0] = welcomeMessage;
        return next;
      }
      return prev;
    });
  }, [welcomeMessage]);

  // Pull primary child for richer Amy context — best-effort
  const { data: childrenData } = useQuery<Array<{ name?: string; age?: number | null }>>({
    queryKey: ["children-for-amy-ai"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      return r.ok ? r.json() : [];
    },
    staleTime: 60_000,
  });
  const primaryChild = Array.isArray(childrenData) && childrenData.length > 0 ? childrenData[0] : null;

  // Auto-send if a prompt was passed via params
  useEffect(() => {
    if (params.q && typeof params.q === "string") {
      void send(params.q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: trimmed };
    // Snapshot history BEFORE appending the new question so we can send it as context
    const history = messages
      .filter(m => m.id !== "welcome")
      .slice(-6)
      .map(m => ({ role: m.role === "amy" ? "assistant" : "user", content: m.text }));
    setMessages(m => [...m, userMsg]);
    setLoading(true);
    try {
      const { default: i18nInstance } = await import("@/i18n");
      const res = await authFetch("/api/ai/assistant-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          language: i18nInstance.language || "en",
          history,
          childName: primaryChild?.name ?? undefined,
          childAge: typeof primaryChild?.age === "number" ? primaryChild.age : undefined,
        }),
      });
      if (res.status === 402) {
        // Quota exhausted — refresh entitlements and route to paywall
        await useSubscriptionStore.getState().refresh();
        setMessages(m => [...m, { id: `a-${Date.now()}`, role: "amy", text: t("ai.quota_exhausted_upgrade") }]);
        router.push({ pathname: "/paywall", params: { reason: "ai_quota" } });
        return;
      }
      const data = await res.json().catch(() => ({}));
      const answer: string = data?.answer ?? t("ai.error_response");
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: "amy", text: answer }]);
      // Refresh quota count after a successful AI call
      void useSubscriptionStore.getState().refresh();
    } catch {
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: "amy", text: t("ai.error_response") }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const showSuggestions = messages.length <= 1 && !loading;
  const canClear = messages.length > 1 && !loading;

  const clearChat = async () => {
    if (!canClear) return;
    setMessages([welcomeMessage]);
    setInput("");
    try {
      await authFetch("/api/ai/messages", { method: "DELETE" });
    } catch {
      // non-fatal — UI is already cleared
    }
  };

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <LinearGradient colors={[brand.primary, brand.accent]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.headerIcon}>
          <MaterialCommunityIcons name="chat-processing" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t("ai.page_title")}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>{t("ai.subtitle")}</Text>
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
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(m => (
            <View key={m.id} style={{ gap: 4 }}>
              <View style={[styles.bubbleRow, m.role === "user" ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
                {m.role === "amy" && (
                  <LinearGradient colors={[brand.primary, brand.accent]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.avatarSm}>
                    <MaterialCommunityIcons name="brain" size={14} color="#fff" />
                  </LinearGradient>
                )}
                <View style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAmy]}>
                  <Text style={[styles.bubbleText, m.role === "user" && { color: "#fff" }]}>{m.text}</Text>
                </View>
              </View>
              {m.role === "amy" && (
                <Text style={styles.disclaimer}>{t("ai.disclaimer")}</Text>
              )}
            </View>
          ))}
          {loading && (
            <View style={styles.bubbleRowLeft}>
              <LinearGradient colors={[brand.primary, brand.accent]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.avatarSm}>
                <MaterialCommunityIcons name="brain" size={14} color="#fff" />
              </LinearGradient>
              <View style={[styles.bubble, styles.bubbleAmy, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
                <ActivityIndicator size="small" color={brand.accent} />
                <Text style={styles.bubbleText}>{t("ai.thinking")}</Text>
              </View>
            </View>
          )}

          {showSuggestions && (
            <View style={styles.suggestionsWrap}>
              <Text style={styles.suggestionsLabel}>{t("ai.popular_questions")}</Text>
              <View style={{ gap: 8 }}>
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
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t("ai.input_placeholder")}
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.input}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
            style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]}
          >
            <LinearGradient colors={[brand.primary, brand.accent]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.sendBtnGrad}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
        <Text style={[styles.sendHint, { paddingBottom: Math.max(insets.bottom, 6) }]}>{t("ai.send_hint")}</Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  backBtn: { padding: 4 },
  headerIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  headerSubtitle: { color: "rgba(255,255,255,0.55)", fontSize: 11 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  clearBtnText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },

  bubbleRow: { flexDirection: "row", gap: 8, alignItems: "flex-end", maxWidth: "100%" },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  avatarSm: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, maxWidth: "82%" },
  bubbleAmy: { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderTopLeftRadius: 4 },
  bubbleUser: { backgroundColor: brand.primary, borderTopRightRadius: 4 },
  bubbleText: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20 },
  disclaimer: { color: "rgba(255,255,255,0.4)", fontSize: 10, marginLeft: 36 },

  suggestionsWrap: { marginTop: 8, gap: 8 },
  suggestionsLabel: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  suggestionBtn: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  suggestionText: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "500" },

  inputBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(11,11,26,0.7)" },
  input: { flex: 1, color: "#fff", fontSize: 15, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  sendBtn: { borderRadius: 22, overflow: "hidden" },
  sendBtnGrad: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sendHint: { color: "rgba(255,255,255,0.4)", fontSize: 10, textAlign: "center", paddingTop: 4, backgroundColor: "rgba(11,11,26,0.7)" },
});
