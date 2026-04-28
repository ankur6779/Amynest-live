import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTheme } from "@/contexts/ThemeContext";
import colors, { brand, ACCENT_PINK } from "@/constants/colors";

type Routine = { id: number; childId: number; childName?: string; title?: string; createdAt: string; activities?: any[] };
type Behavior = { id: number; type: string; date: string };

export default function ProgressScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { theme } = useTheme();

  const { data: routines = [], isLoading: loadingR } = useQuery<Routine[]>({
    queryKey: ["routines"],
    queryFn: async () => { const r = await authFetch("/api/routines"); return r.ok ? r.json() : []; },
  });

  const { data: behaviors = [] } = useQuery<Behavior[]>({
    queryKey: ["behaviors"],
    queryFn: async () => { const r = await authFetch("/api/behaviors"); return r.ok ? r.json() : []; },
  });

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentRoutines = routines.filter(r => new Date(r.createdAt).getTime() > weekAgo);
    const recentBehaviors = behaviors.filter(b => new Date(b.date).getTime() > weekAgo);
    const positive = recentBehaviors.filter(b => b.type === "positive").length;
    const milestones = behaviors.filter(b => b.type === "milestone").length;
    return {
      routinesThisWeek: recentRoutines.length,
      totalRoutines: routines.length,
      behaviorsThisWeek: recentBehaviors.length,
      positiveRate: recentBehaviors.length ? Math.round((positive / recentBehaviors.length) * 100) : 0,
      milestones,
    };
  }, [routines, behaviors]);

  const insights = useMemo(() => {
    const out: { icon: any; color: string; title: string; text: string }[] = [];
    if (stats.routinesThisWeek >= 3) out.push({ icon: "trophy", color: "#FBBF24", title: "Routine champion", text: `${stats.routinesThisWeek} routines created this week — consistency builds calm.` });
    if (stats.positiveRate >= 70) out.push({ icon: "heart", color: ACCENT_PINK, title: "Positive momentum", text: `${stats.positiveRate}% of logged moments were wins. Keep noticing the good.` });
    if (stats.milestones > 0) out.push({ icon: "star", color: brand.violet400, title: "Milestones tracked", text: `${stats.milestones} milestone${stats.milestones>1?"s":""} captured. Memories your future self will thank you for.` });
    if (out.length === 0 && !loadingR) out.push({ icon: "compass", color: "#34D399", title: "Just getting started", text: "Add a few routines and behavior moments — Amy will surface insights from your data." });
    return out;
  }, [stats, loadingR]);

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <LinearGradient colors={["#34D399", "#10B981"]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.headerIcon}>
          <Ionicons name="trending-up" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t("progress.title")}</Text>
          <Text style={styles.headerSubtitle}>{t("progress.subtitle")}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}>
        {loadingR && <ActivityIndicator color={ACCENT_PINK} style={{ marginTop: 40 }} />}

        <View style={styles.statsGrid}>
          <StatCard icon="calendar" color={colors.light.primary} label="Routines this week" value={stats.routinesThisWeek} sub={`${stats.totalRoutines} total`} />
          <StatCard icon="happy" color="#FBBF24" label="Moments logged" value={stats.behaviorsThisWeek} sub="this week" />
          <StatCard icon="heart" color={ACCENT_PINK} label="Positive rate" value={`${stats.positiveRate}%`} sub="last 7 days" />
          <StatCard icon="trophy" color={brand.violet400} label="Milestones" value={stats.milestones} sub="all time" />
        </View>

        <Text style={styles.sectionTitle}>Insights</Text>
        {insights.map((i, idx) => (
          <View key={idx} style={styles.insightCard}>
            <View style={[styles.insightIconWrap, { backgroundColor: i.color + "30", borderColor: i.color }]}>
              <Ionicons name={i.icon} size={18} color={i.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightTitle}>{i.title}</Text>
              <Text style={styles.insightText}>{i.text}</Text>
            </View>
          </View>
        ))}

        <Pressable onPress={() => router.push("/insights" as never)} style={styles.askAmyCta}>
          <LinearGradient colors={[brand.purple500, brand.pink500]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.askAmyCtaGrad}>
            <Ionicons name="analytics" size={20} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>View full insights</Text>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 }}>Week-over-week trends, per-child breakdown & more</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => router.push("/amy-ai")} style={styles.askAmyCta}>
          <LinearGradient colors={[colors.light.primary, colors.light.accent]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.askAmyCtaGrad}>
            <MaterialCommunityIcons name="brain" size={20} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Ask Amy about your progress</Text>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 }}>Get a personalized weekly read-out</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

function StatCard({ icon, color, label, value, sub }: { icon: any; color: string; label: string; value: any; sub: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + "55" }]}>
      <View style={[styles.statIconBox, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  headerIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  headerSubtitle: { color: "rgba(255,255,255,0.55)", fontSize: 11 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { flexBasis: "47%", flexGrow: 1, padding: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, gap: 6 },
  statIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { color: "#fff", fontSize: 24, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  statSub: { color: "rgba(255,255,255,0.5)", fontSize: 10 },

  sectionTitle: { color: "#fff", fontSize: 14, fontWeight: "800", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.6 },
  insightCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  insightIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  insightTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  insightText: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 3, lineHeight: 17 },

  askAmyCta: { borderRadius: 18, overflow: "hidden", marginTop: 6 },
  askAmyCtaGrad: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
});
