import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";

const FEATURE_KEY = "kids_control_center";

type FeedbackKind = "interested" | "not_interested";

const HIGHLIGHTS = [
  { icon: "🛡️", text: "Safe child-friendly UI" },
  { icon: "🔄", text: "Sync with parent routines" },
  { icon: "🎁", text: "Reward-based engagement" },
  { icon: "🚫", text: "No distractions" },
];

const FEATURES = [
  { icon: "⏱", title: "Screen Time Guidance", desc: "Healthy limits, gentle nudges" },
  { icon: "📋", title: "Routine Control",      desc: "Daily flow, on autopilot" },
  { icon: "🎯", title: "Focus Mode",           desc: "Quiet time for study & sleep" },
  { icon: "📊", title: "Activity Tracking",    desc: "See what your child enjoys" },
  { icon: "🔒", title: "Parent Lock",          desc: "PIN-protected controls" },
];

export default function KidsControlCenterScreen() {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const c = useColors();

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
    <View style={{ flex: 1, backgroundColor: c.background }}>
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
            <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>Back</Text>
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
              <Text style={{ color: accent, fontSize: 11, fontWeight: "800" }}>Coming Soon 🚀</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: "800", color: c.foreground, textAlign: "center", lineHeight: 34 }}>
              👶 Kids Control Center
            </Text>
          </View>

          {/* Hero */}
          <View style={{
            padding: 18, borderRadius: 22, marginBottom: 14,
            backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.foreground, lineHeight: 24 }}>
              Smart Control for Parents, Safe Experience for Kids
            </Text>
            <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8, lineHeight: 20 }}>
              Guide your child's routine, learning, and screen time with ease.
            </Text>
          </View>

          {/* AmyNest Kids */}
          <LinearGradient
            colors={[accent + "22", c.glass, c.accent + "22"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 22, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: accent + "33" }}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.foreground, marginBottom: 4 }}>
              👶 AmyNest Kids{" "}
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>(Child Experience)</Text>
            </Text>
            <Text style={{ fontSize: 13.5, color: c.textBody, lineHeight: 20, marginBottom: 12 }}>
              AmyNest Kids is a safe and guided environment for children that syncs with the parent app.
              Kids see only their routines, activities, and rewards, while parents manage everything in the background.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {HIGHLIGHTS.map((h) => (
                <View
                  key={h.text}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12,
                    backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
                    flexBasis: "47%", flexGrow: 1,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{h.icon}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: c.foreground, flex: 1 }} numberOfLines={2}>
                    {h.text}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* Feature Preview */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: c.textMuted, letterSpacing: 1, marginBottom: 10, paddingHorizontal: 4 }}>
              FEATURE PREVIEW
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {FEATURES.map((f) => (
                <View
                  key={f.title}
                  style={{
                    flexBasis: "48%", flexGrow: 1, padding: 14, borderRadius: 18,
                    backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
                  }}
                  testID={`feature-${f.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Text style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: c.foreground, lineHeight: 18 }}>
                    {f.title}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: c.textMuted, marginTop: 3, lineHeight: 15 }}>
                    {f.desc}
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
              Kids Control Center helps parents guide children in a balanced way by focusing on{" "}
              <Text style={{ fontWeight: "800", color: accent }}>habits, routines, and learning</Text>
              {" "}instead of strict restrictions.
            </Text>
          </View>

          {/* Feedback section */}
          <View style={{
            padding: 18, borderRadius: 22,
            backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.foreground, textAlign: "center" }}>
              Would you like this feature?
            </Text>
            <Text style={{ fontSize: 12, color: c.textMuted, textAlign: "center", marginTop: 4, marginBottom: 18 }}>
              Select an option, add your thoughts, then hit Submit.
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
                    label="👍 Interested"
                    selected={pendingFeedback === "interested"}
                    onPress={() => setPendingFeedback("interested")}
                  />
                  <SelectionButton
                    c={c}
                    kind="not_interested"
                    label="👎 Not Interested"
                    selected={pendingFeedback === "not_interested"}
                    onPress={() => setPendingFeedback("not_interested")}
                  />
                </View>

                {/* Comment box */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: c.textMuted, marginBottom: 6, paddingHorizontal: 4 }}>
                    Tell us what you want (optional)
                  </Text>
                  <TextInput
                    value={comment}
                    onChangeText={(t) => setComment(t.slice(0, 1000))}
                    placeholder="e.g. daily reading streak, reward points, kid-friendly themes…"
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
                    colors={canSubmit ? [c.primary, c.accent, "#F59E0B"] : [c.border, c.border]}
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
                          Submit Feedback
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
                        ? "🎉 Thanks! We'll keep you posted when this launches."
                        : "💛 Got it — we appreciate the honest feedback!"}
                    </Text>
                  </View>
                )}

                {/* Already saved */}
                {savedFeedback && !submitted && pendingFeedback === savedFeedback && comment.trim() === savedComment.trim() && (
                  <Text style={{ textAlign: "center", fontSize: 11, color: c.textMuted }}>
                    ✓ Your feedback has been saved
                  </Text>
                )}
              </View>
            )}
          </View>

          <Text style={{ textAlign: "center", fontSize: 11, color: c.textFaint, marginTop: 20 }}>
            Built with care by the AmyNest team · Coming soon
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
    : ["#64748B", "#475569"];

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
