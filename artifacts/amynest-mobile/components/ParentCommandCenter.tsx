import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { brand, ACCENT_PINK, palette } from "@/constants/colors";
import {
  computeCommandCenter,
  type AdaptiveItem,
  type AdaptiveMood,
  type AdaptiveSleepQuality,
  type CommandActionId,
} from "@workspace/family-routine";

type Child = { id: number; name: string };

type Routine = { id: number; date: string; items: AdaptiveItem[] };
type Summary = {
  positiveBehaviorsToday: number;
  negativeBehaviorsToday: number;
  routinesGeneratedThisWeek: number;
};

const MOOD_LABEL: Record<AdaptiveMood, string> = { low: "😔 Low", neutral: "🙂 Neutral", active: "🤸 Active" };
const SLEEP_LABEL: Record<AdaptiveSleepQuality, string> = { poor: "😴 Poor", ok: "🌙 OK", good: "✨ Good" };

const TONE: Record<"good" | "warn" | "info", { bg: string; border: string }> = {
  good: { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.35)" },
  warn: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.35)" },
  info: { bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.35)" },
};

export default function ParentCommandCenter({ child }: { child: Child }) {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const c = useColors();
  const todayStr = new Date().toISOString().slice(0, 10);

  // ── Mood / sleep — shared with the routine adaptive engine via AsyncStorage ──
  const moodKey = `amynest:adaptive:mood:${child.id}:${todayStr}`;
  const sleepKey = `amynest:adaptive:sleep:${child.id}:${todayStr}`;
  const [mood, setMood] = useState<AdaptiveMood>("neutral");
  const [sleep, setSleep] = useState<AdaptiveSleepQuality>("good");
  useEffect(() => {
    (async () => {
      try {
        const m = (await AsyncStorage.getItem(moodKey)) as AdaptiveMood | null;
        const s = (await AsyncStorage.getItem(sleepKey)) as AdaptiveSleepQuality | null;
        if (m === "low" || m === "neutral" || m === "active") setMood(m);
        if (s === "poor" || s === "ok" || s === "good") setSleep(s);
      } catch {}
    })();
  }, [moodKey, sleepKey]);
  const persistMood = (m: AdaptiveMood) => {
    setMood(m);
    AsyncStorage.setItem(moodKey, m).catch(() => {});
  };
  const persistSleep = (s: AdaptiveSleepQuality) => {
    setSleep(s);
    AsyncStorage.setItem(sleepKey, s).catch(() => {});
  };

  // ── Data ──
  // Hub tile queries: 5-min freshness window + 30-min retention so
  // swiping between hub sections (or tab-switching to/from the
  // dashboard) doesn't re-hit the network on every visit.
  const { data: routines = [] } = useQuery<Routine[]>({
    queryKey: ["routines", child.id],
    queryFn: async () => {
      const r = await authFetch(`/api/routines?childId=${child.id}`);
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const { data: summary } = useQuery<Summary>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const r = await authFetch("/api/dashboard/summary");
      if (!r.ok) return { positiveBehaviorsToday: 0, negativeBehaviorsToday: 0, routinesGeneratedThisWeek: 0 };
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const todayRoutine = useMemo(
    () => routines.find((r) => (r.date ?? "").slice(0, 10) === todayStr),
    [routines, todayStr],
  );
  const items: AdaptiveItem[] = todayRoutine?.items ?? [];

  const result = useMemo(
    () =>
      computeCommandCenter({
        childName: child.name,
        items,
        positiveBehaviorsToday: summary?.positiveBehaviorsToday ?? 0,
        negativeBehaviorsToday: summary?.negativeBehaviorsToday ?? 0,
        mood,
        sleepQuality: sleep,
        weeklyPositive: summary?.positiveBehaviorsToday ?? 0,
        weeklyNegative: summary?.negativeBehaviorsToday ?? 0,
        weeklyRoutinesGenerated: summary?.routinesGeneratedThisWeek ?? 0,
      }),
    [items, summary, mood, sleep, child.name],
  );
  const { overview, insights, actions, week, parentStatus } = result;

  const onAction = async (id: CommandActionId) => {
    const rid = todayRoutine?.id;
    switch (id) {
      case "simplify-today": {
        // Don't overwrite a parent-set mood; only nudge to "low" when unset.
        const existing = await AsyncStorage.getItem(moodKey).catch(() => null);
        if (existing === null) persistMood("low");
        if (rid) router.push(`/routines/${rid}`);
        else router.push("/(tabs)/routines" as any);
        return;
      }
      case "fix-routine":
      case "add-activity":
        if (rid) router.push(`/routines/${rid}`);
        else router.push("/(tabs)/routines" as any);
        return;
      case "calm-child":
        router.push({ pathname: "/amy-ai", params: { q: "My child needs calming. Give me 3 quick things I can try right now in under 5 minutes." } });
        return;
      case "improve-sleep":
        router.push({ pathname: "/amy-ai", params: { q: "My child slept poorly last night. Suggest a 30-min wind-down routine and 3 fixes for tonight." } });
        return;
    }
  };

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["rgba(168,85,247,0.18)", "rgba(236,72,153,0.10)", "rgba(16,185,129,0.18)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <BlurView intensity={Platform.OS === "android" ? 60 : 30} tint="dark" style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View style={styles.headerIcon}>
            <LinearGradient colors={[brand.primary, ACCENT_PINK]} style={StyleSheet.absoluteFillObject} />
            <Ionicons name="sparkles" size={14} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.foreground }]} numberOfLines={1}>
              {child.name}'s Command Center
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              What's happening · why · what to do
            </Text>
          </View>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusEmoji}>{overview.statusEmoji}</Text>
          <Text style={styles.statusText} numberOfLines={1}>
            {overview.routineCompletionPct}% · {overview.statusLabel}
          </Text>
        </View>
      </View>

      {/* (A) Today Overview — horizontal metric strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricRow}>
        <Metric label="Routine"  value={`${overview.routineCompletionPct}%`} sub={`${overview.routineCompletedTasks}/${overview.routineTotalTasks} done`} accent={brand.violet400} />
        <Metric label="Behavior" value={`${overview.behaviorScore}`}        sub={overview.behaviorLabel}                                                  accent={palette.emerald400} />
        <Metric label="Mood"     value={MOOD_LABEL[overview.mood].split(" ")[0]} sub={MOOD_LABEL[overview.mood].split(" ").slice(1).join(" ")}            accent={palette.amber400} />
        <Metric label="Sleep"    value={SLEEP_LABEL[overview.sleepQuality].split(" ")[0]} sub={SLEEP_LABEL[overview.sleepQuality].split(" ").slice(1).join(" ")} accent={palette.blue400} />
        <Metric label="Screen"   value={`${overview.screenMinutes}m`}        sub={overview.screenMinutes >= 90 ? "High" : "OK"}                            accent={brand.rose400} />
        <Metric label="Quality"  value={`${overview.qualityMinutes}m`}       sub={overview.qualityMinutes >= 30 ? "Connected" : "Add 15m"}                accent={brand.pink400} />
      </ScrollView>

      {/* Mood + Sleep selectors */}
      <View style={styles.selectorRow}>
        <Text style={styles.selectorTag}>TODAY:</Text>
        <View style={styles.chipGroup}>
          {(["low", "neutral", "active"] as AdaptiveMood[]).map((m) => {
            const active = mood === m;
            return (
              <Pressable key={m} onPress={() => persistMood(m)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && { color: "#fff" }]}>{MOOD_LABEL[m]}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.chipGroup}>
          {(["poor", "ok", "good"] as AdaptiveSleepQuality[]).map((s) => {
            const active = sleep === s;
            return (
              <Pressable key={s} onPress={() => persistSleep(s)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && { color: "#fff" }]}>{SLEEP_LABEL[s]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* (B) Insights */}
      <View style={{ gap: 8 }}>
        {insights.map((ins, i) => (
          <View key={i} style={[styles.insightCard, { backgroundColor: TONE[ins.tone].bg, borderColor: TONE[ins.tone].border }]}>
            <Text style={styles.insightTag}>✨ AMY AI INSIGHT</Text>
            <Text style={[styles.insightWhat, { color: c.foreground }]}>{ins.what}</Text>
            <Text style={styles.insightWhy}>{ins.why}</Text>
            <Text style={[styles.insightAction, { color: c.foreground }]}>
              <Text style={{ fontWeight: "900" }}>→ </Text>
              {ins.action}
            </Text>
          </View>
        ))}
      </View>

      {/* (C) Quick actions */}
      <View style={styles.actionGrid}>
        {actions.map((a) => {
          const isPrimary = a.severity === "primary";
          return (
            <Pressable key={a.id} onPress={() => onAction(a.id)} style={({ pressed }) => [
              styles.actionBtn,
              isPrimary ? styles.actionPrimary : styles.actionDefault,
              pressed && { opacity: 0.85 },
            ]}>
              {isPrimary ? (
                <LinearGradient colors={[brand.primary, ACCENT_PINK]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              ) : null}
              <Text style={styles.actionEmoji}>{a.emoji}</Text>
              <Text style={[styles.actionLabel, isPrimary ? { color: "#fff" } : { color: c.foreground }]}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Weekly snapshot + parent status */}
      <View style={styles.bottomRow}>
        <View style={styles.bottomCard}>
          <Text style={styles.bottomTag}>📊 WEEKLY SNAPSHOT</Text>
          <Text style={[styles.bottomTitle, { color: c.foreground }]} numberOfLines={2}>{week.behaviorTrendLabel}</Text>
          <View style={styles.barWrap}>
            <View style={styles.barBg}>
              <LinearGradient colors={[brand.primary, palette.emerald400]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.barFill, { width: `${week.routineConsistencyPct}%` }]} />
            </View>
            <Text style={styles.barLabel}>{week.routineConsistencyPct}%</Text>
          </View>
        </View>
        <View style={[styles.bottomCard, { borderColor: "rgba(244,114,182,0.3)" }]}>
          <Text style={styles.bottomTag}>❤️ PARENT STATUS</Text>
          <Text style={[styles.bottomTitle, { color: c.foreground }]} numberOfLines={1}>{parentStatus.stressLabel}</Text>
          <Text style={styles.bottomSub} numberOfLines={2}>{parentStatus.effortSummary}</Text>
        </View>
      </View>

      {/* Open today's routine */}
      {todayRoutine?.id && (
        <Pressable onPress={() => router.push(`/routines/${todayRoutine.id}`)} style={styles.footerBtn}>
          <Text style={[styles.footerBtnText, { color: c.foreground }]}>Open today's routine</Text>
          <Ionicons name="arrow-forward" size={16} color={brand.primary} />
        </Pressable>
      )}
    </View>
  );
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  const c = useColors();
  return (
    <View style={[styles.metric, { borderColor: accent + "55" }]}>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.metricValue, { color: c.foreground }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricSub} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.35)",
    padding: 14,
    gap: 12,
    // glow
    shadowColor: brand.purple500,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIcon: {
    width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  title: { fontSize: 14, fontWeight: "900" },
  subtitle: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 1 },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  statusEmoji: { fontSize: 13 },
  statusText: { fontSize: 11, fontWeight: "800", color: "#fff" },

  metricRow: { gap: 8, paddingVertical: 2 },
  metric: {
    minWidth: 100, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1,
  },
  metricLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5, color: "rgba(255,255,255,0.6)" },
  metricValue: { fontSize: 16, fontWeight: "900", marginTop: 2 },
  metricSub: { fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 1 },

  selectorRow: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },
  selectorTag: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5, color: "rgba(255,255,255,0.6)" },
  chipGroup: { flexDirection: "row", gap: 4, alignItems: "center" },
  chip: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  chipActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  chipText: { fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.85)" },

  insightCard: { padding: 11, borderRadius: 16, borderWidth: 1 },
  insightTag: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5, color: "rgba(255,255,255,0.6)" },
  insightWhat: { fontSize: 13, fontWeight: "900", marginTop: 4, lineHeight: 17 },
  insightWhy: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 3, lineHeight: 15 },
  insightAction: { fontSize: 11, marginTop: 5, lineHeight: 16, fontWeight: "600" },

  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  actionBtn: {
    flexBasis: "31.5%", flexGrow: 1, flexDirection: "column", alignItems: "center",
    justifyContent: "center", paddingVertical: 10, borderRadius: 14, gap: 3,
    overflow: "hidden", borderWidth: 1,
  },
  actionDefault: { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" },
  actionPrimary: { borderColor: "transparent" },
  actionEmoji: { fontSize: 18 },
  actionLabel: { fontSize: 11, fontWeight: "800", textAlign: "center" },

  bottomRow: { flexDirection: "row", gap: 8 },
  bottomCard: {
    flex: 1, padding: 11, borderRadius: 16, gap: 4,
    backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },
  bottomTag: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5, color: "rgba(255,255,255,0.6)" },
  bottomTitle: { fontSize: 13, fontWeight: "900", lineHeight: 17 },
  bottomSub: { fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 15 },
  barWrap: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  barBg: { flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  barFill: { height: "100%" },
  barLabel: { fontSize: 9, fontWeight: "900", color: "rgba(255,255,255,0.7)" },

  footerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  footerBtnText: { fontSize: 13, fontWeight: "800" },
});
