import React from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { brand } from "@/constants/colors";

interface Session {
  sessionId: string;
  goalId: string;
  goalLabel: string;
  planTitle: string;
  totalWins: number;
  completed: number;
  lastFeedback: string;
  lastUpdated: string;
  feedbacks: { win: number; feedback: string; at: string }[];
}

const FEEDBACK_EMOJI: Record<string, string> = { yes: "🎉", somewhat: "👍", no: "💪" };
const FEEDBACK_LABEL: Record<string, string> = {
  yes: "Worked", somewhat: "Some progress", no: "Keep trying",
};

export default function CoachProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const c = useColors();
  const { theme } = useTheme();

  const { data, isLoading } = useQuery<{ sessions: Session[] }>({
    queryKey: ["ai-coach-progress"],
    queryFn: async () => {
      const r = await authFetch("/api/ai-coach/progress");
      if (!r.ok) return { sessions: [] };
      return r.json();
    },
  });
  const sessions = data?.sessions ?? [];

  const handleResume = (sessionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/(tabs)/coach", params: { resume: sessionId } });
  };

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <LinearGradient colors={[brand.primary, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerIcon}>
          <Ionicons name="bar-chart" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>My Progress</Text>
          <Text style={[styles.headerSubtitle, { color: c.textMuted }]}>Track your coaching wins</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }}>
        {isLoading && (
          <View style={{ paddingVertical: 60, alignItems: "center", gap: 10 }}>
            <ActivityIndicator color={brand.primary} />
            <Text style={{ color: c.textMuted, fontSize: 13 }}>Loading your progress…</Text>
          </View>
        )}

        {!isLoading && sessions.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="sparkles" size={48} color={brand.primary} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No plans yet</Text>
            <Text style={[styles.emptyDesc, { color: c.textMuted }]}>
              Pick a goal and complete your first plan — your wins will show up here.
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/(tabs)/coach");
              }}
              style={styles.primaryBtn}
            >
              <LinearGradient colors={[brand.primary, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
                <Text style={styles.primaryBtnText}>Start a plan</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {!isLoading && sessions.map((s) => {
          const pct = s.totalWins > 0 ? Math.round((s.completed / s.totalWins) * 100) : 0;
          const completed = s.completed === s.totalWins;
          return (
            <View key={s.sessionId} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalLabel, { color: brand.primary }]}>{s.goalLabel.toUpperCase()}</Text>
                  <Text style={[styles.planTitle, { color: c.text }]}>{s.planTitle}</Text>
                </View>
                {completed && (
                  <View style={styles.trophyBadge}>
                    <Ionicons name="trophy" size={18} color="#F59E0B" />
                  </View>
                )}
              </View>

              <View style={{ marginTop: 10 }}>
                <View style={styles.progressRow}>
                  <Text style={[styles.progressText, { color: c.textMuted }]}>
                    {s.completed} of {s.totalWins} wins
                  </Text>
                  <Text style={[styles.progressPct, { color: brand.primary }]}>{pct}%</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: c.border }]}>
                  <LinearGradient
                    colors={[brand.primary, brand.pink500]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${pct}%` }]}
                  />
                </View>
              </View>

              <View style={styles.dotsRow}>
                {Array.from({ length: s.totalWins }).map((_, i) => {
                  const wn = i + 1;
                  const fb = s.feedbacks.find((f) => f.win === wn);
                  return (
                    <View
                      key={wn}
                      style={[
                        styles.winDot,
                        {
                          backgroundColor: fb ? "rgba(168,85,247,0.18)" : c.border,
                        },
                      ]}
                      accessibilityLabel={fb ? `Win ${wn}: ${FEEDBACK_LABEL[fb.feedback]}` : `Win ${wn}: not done`}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: fb ? brand.primary : c.textMuted }}>
                        {fb ? FEEDBACK_EMOJI[fb.feedback] : wn}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.cardBottom}>
                <Text style={[styles.dateText, { color: c.textDim }]}>
                  Last updated {new Date(s.lastUpdated).toLocaleDateString()}
                </Text>
                <Pressable onPress={() => handleResume(s.sessionId)} hitSlop={8} style={styles.continueBtn}>
                  <Text style={[styles.continueText, { color: brand.primary }]}>Continue plan</Text>
                  <Ionicons name="arrow-forward" size={13} color={brand.primary} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontWeight: "800", fontSize: 16 },
  headerSubtitle: { fontSize: 11 },

  emptyCard: {
    padding: 28, borderRadius: 22, alignItems: "center", gap: 10,
    borderWidth: 1, borderStyle: "dashed", marginTop: 24,
  },
  emptyTitle: { fontWeight: "800", fontSize: 17 },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  primaryBtn: { marginTop: 8, borderRadius: 999, overflow: "hidden" },
  primaryBtnGrad: { paddingHorizontal: 22, paddingVertical: 12 },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  card: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  goalLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  planTitle: { fontSize: 15, fontWeight: "800", marginTop: 3, lineHeight: 20 },
  trophyBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(245,158,11,0.18)", alignItems: "center", justifyContent: "center",
  },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressText: { fontSize: 12, fontWeight: "600" },
  progressPct: { fontSize: 12, fontWeight: "800" },
  progressBarBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 4 },
  dotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  winDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  cardBottom: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 6, paddingTop: 4,
  },
  dateText: { fontSize: 11 },
  continueBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  continueText: { fontSize: 12, fontWeight: "800" },
});
