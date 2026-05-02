import React, { useEffect, useState, useCallback } from "react";
import { palette } from "@/constants/colors";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

const FEATURE_KEY = "kids_control_center";

type FeedbackKind = "interested" | "not_interested";

const HIGHLIGHT_KEYS = [
  { icon: "🛡️", key: "highlight_safe_ui" },
  { icon: "🔄", key: "highlight_sync" },
  { icon: "🎁", key: "highlight_reward" },
  { icon: "🚫", key: "highlight_no_distractions" },
] as const;

const FEATURE_KEYS = [
  { icon: "⏱", titleKey: "feature_screen_time_title", descKey: "feature_screen_time_desc", id: "screen-time" },
  { icon: "📋", titleKey: "feature_routine_title",     descKey: "feature_routine_desc", id: "routine" },
  { icon: "🎯", titleKey: "feature_focus_title",       descKey: "feature_focus_desc", id: "focus" },
  { icon: "📊", titleKey: "feature_activity_title",    descKey: "feature_activity_desc", id: "activity" },
  { icon: "🔒", titleKey: "feature_lock_title",        descKey: "feature_lock_desc", id: "lock" },
] as const;

export default function KidsControlCenterScreen() {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const c = useColors();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [pendingFeedback, setPendingFeedback] = useState<FeedbackKind | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<FeedbackKind | null>(null);

  const [comment, setComment] = useState("");
  const [savedComment, setSavedComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await authFetch(`/api/feature-feedback?feature=${FEATURE_KEY}`);
        if (!alive) return;
        if (res.ok) {
          const data = await res.json() as { feedback: FeedbackKind | null; comment: string | null };
          if (data.feedback) {
            setSavedFeedback(data.feedback);
            setPendingFeedback(data.feedback);
          }
          if (data.comment) {
            setComment(data.comment);
            setSavedComment(data.comment);
          }
        }
      } catch { /* non-fatal */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [authFetch]);

  const handleSubmit = useCallback(async () => {
    if (!pendingFeedback || submitting) return;
    setSubmitting(true);
    setSubmitted(false);
    try {
      const res = await authFetch("/api/feature-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: FEATURE_KEY,
          feedback: pendingFeedback,
          comment: comment.trim() || undefined,
        }),
      });
      if (res.ok) {
        setSavedFeedback(pendingFeedback);
        setSavedComment(comment.trim());
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3500);
      }
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  }, [authFetch, comment, pendingFeedback, submitting]);

  const canSubmit = pendingFeedback !== null && !submitting;
  const accent = c.primary;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 56 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16, alignSelf: "flex-start" }}
            testID="link-back"
          >
            <Ionicons name="chevron-back" size={18} color={c.textMuted} />
            <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>{t("screens.kids_control_center.back")}</Text>
          </Pressable>

          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            {/* AmyNest Kids Logo */}
            <Image
              source={require("../assets/images/amynest-kids-logo.png")}
              style={{ width: 160, height: 160, marginBottom: 12 }}
              resizeMode="contain"
            />
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
              backgroundColor: accent + "1F",
              borderWidth: 1, borderColor: accent + "40", marginBottom: 10,
            }}>
              <Ionicons name="sparkles" size={11} color={accent} />
              <Text style={{ color: accent, fontSize: 11, fontWeight: "800" }}>{t("screens.kids_control_center.coming_soon_badge")}</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: "800", color: c.foreground, textAlign: "center", lineHeight: 34 }}>
              {t("screens.kids_control_center.title")}
            </Text>
          </View>

          {/* Hero */}
          <View style={{
            padding: 18, borderRadius: 22, marginBottom: 14,
            backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.foreground, lineHeight: 24 }}>
              {t("screens.kids_control_center.hero_title")}
            </Text>
            <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8, lineHeight: 20 }}>
              {t("screens.kids_control_center.hero_sub")}
            </Text>
          </View>

          {/* AmyNest Kids */}
          <LinearGradient
            colors={[accent + "22", c.glass, c.accent + "22"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 22, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: accent + "33" }}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.foreground, marginBottom: 4 }}>
              {t("screens.kids_control_center.kids_section_title")}{" "}
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>{t("screens.kids_control_center.kids_section_subtitle")}</Text>
            </Text>
            <Text style={{ fontSize: 13.5, color: c.textBody, lineHeight: 20, marginBottom: 12 }}>
              {t("screens.kids_control_center.kids_section_body")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {HIGHLIGHT_KEYS.map((h) => (
                <View
                  key={h.key}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12,
                    backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
                    flexBasis: "47%", flexGrow: 1,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{h.icon}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: c.foreground, flex: 1 }} numberOfLines={2}>
                    {t(`screens.kids_control_center.${h.key}`)}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* Feature Preview */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: c.textMuted, letterSpacing: 1, marginBottom: 10, paddingHorizontal: 4 }}>
              {t("screens.kids_control_center.feature_preview_label")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {FEATURE_KEYS.map((f) => (
                <View
                  key={f.id}
                  style={{
                    flexBasis: "48%", flexGrow: 1, padding: 14, borderRadius: 18,
                    backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
                  }}
                  testID={`feature-${f.id}`}
                >
                  <Text style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: c.foreground, lineHeight: 18 }}>
                    {t(`screens.kids_control_center.${f.titleKey}`)}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: c.textMuted, marginTop: 3, lineHeight: 15 }}>
                    {t(`screens.kids_control_center.${f.descKey}`)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={{
            padding: 16, borderRadius: 22, marginBottom: 14,
            backgroundColor: c.statusWarningBg + "55",
            borderWidth: 1, borderColor: c.border,
          }}>
            <Text style={{ fontSize: 13.5, color: c.textBody, textAlign: "center", lineHeight: 20 }}>
              {t("screens.kids_control_center.description_part1")}
              <Text style={{ fontWeight: "800", color: accent }}>{t("screens.kids_control_center.description_emphasis")}</Text>
              {t("screens.kids_control_center.description_part2")}
            </Text>
          </View>

          {/* Feedback section */}
          <View style={{
            padding: 18, borderRadius: 22,
            backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.foreground, textAlign: "center" }}>
              {t("screens.kids_control_center.feedback_question")}
            </Text>
            <Text style={{ fontSize: 12, color: c.textMuted, textAlign: "center", marginTop: 4, marginBottom: 18 }}>
              {t("screens.kids_control_center.feedback_help")}
            </Text>

            {loading ? (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <ActivityIndicator size="small" color={accent} />
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {/* Option buttons */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <SelectionButton
                    c={c}
                    kind="interested"
                    label={t("screens.kids_control_center.interested")}
                    selected={pendingFeedback === "interested"}
                    onPress={() => setPendingFeedback("interested")}
                  />
                  <SelectionButton
                    c={c}
                    kind="not_interested"
                    label={t("screens.kids_control_center.not_interested")}
                    selected={pendingFeedback === "not_interested"}
                    onPress={() => setPendingFeedback("not_interested")}
                  />
                </View>

                {/* Comment box */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: c.textMuted, marginBottom: 6, paddingHorizontal: 4 }}>
                    {t("screens.kids_control_center.comment_label")}
                  </Text>
                  <TextInput
                    value={comment}
                    onChangeText={(v) => setComment(v.slice(0, 1000))}
                    placeholder={t("screens.kids_control_center.comment_placeholder")}
                    placeholderTextColor={c.textFaint}
                    multiline
                    numberOfLines={3}
                    style={{
                      minHeight: 80, padding: 12, borderRadius: 16,
                      backgroundColor: c.surfaceElevated,
                      borderWidth: 1, borderColor: c.border,
                      color: c.foreground, fontSize: 13.5, textAlignVertical: "top",
                    }}
                    testID="input-feedback-comment"
                  />
                  <Text style={{ fontSize: 10, color: c.textFaint, marginTop: 4, textAlign: "right" }}>
                    {comment.length}/1000
                  </Text>
                </View>

                {/* Submit button */}
                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  testID="button-submit-feedback"
                  style={{ borderRadius: 18, overflow: "hidden", opacity: canSubmit ? 1 : 0.45 }}
                >
                  <LinearGradient
                    colors={canSubmit ? [c.primary, c.accent, palette.amber500] : [c.border, c.border]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: 16, alignItems: "center", justifyContent: "center",
                      flexDirection: "row", gap: 8,
                    }}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={16} color={canSubmit ? "#fff" : c.textMuted} />
                        <Text style={{
                          color: canSubmit ? "#fff" : c.textMuted,
                          fontWeight: "800", fontSize: 15,
                        }}>
                          {t("screens.kids_control_center.submit")}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* Success */}
                {submitted && (
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    padding: 14, borderRadius: 16,
                    backgroundColor: accent + "1F",
                    borderWidth: 1, borderColor: accent + "40",
                  }}
                    testID="text-feedback-thanks"
                  >
                    <Ionicons name="checkmark-circle" size={18} color={accent} />
                    <Text style={{ color: accent, fontWeight: "700", fontSize: 13, flex: 1 }}>
                      {savedFeedback === "interested"
                        ? t("screens.kids_control_center.thanks_interested")
                        : t("screens.kids_control_center.thanks_not_interested")}
                    </Text>
                  </View>
                )}

                {/* Already saved */}
                {savedFeedback && !submitted && pendingFeedback === savedFeedback && comment.trim() === savedComment.trim() && (
                  <Text style={{ textAlign: "center", fontSize: 11, color: c.textMuted }}>
                    {t("screens.kids_control_center.saved")}
                  </Text>
                )}
              </View>
            )}
          </View>

          <Text style={{ textAlign: "center", fontSize: 11, color: c.textFaint, marginTop: 20 }}>
            {t("screens.kids_control_center.footer")}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SelectionButton({
  c, kind, label, selected, onPress,
}: {
  c: ReturnType<typeof useColors>;
  kind: FeedbackKind;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const isInterested = kind === "interested";
  const gradient: [string, string] = isInterested
    ? [c.primary, c.accent]
    : [palette.slate500, palette.slate600];

  if (selected) {
    return (
      <Pressable onPress={onPress} style={{ flex: 1, borderRadius: 16, overflow: "hidden" }} testID={`button-select-${kind}`}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
        >
          <Ionicons name="checkmark" size={14} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center",
        borderRadius: 16, borderWidth: 1, borderColor: c.border,
        backgroundColor: c.card,
      }}
      testID={`button-select-${kind}`}
    >
      <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({});
