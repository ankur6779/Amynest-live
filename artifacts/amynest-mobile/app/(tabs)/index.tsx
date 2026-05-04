import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useUser } from "@/lib/firebase-auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTodayRoutine } from "@/hooks/useTodayRoutine";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, brandAlpha } from "@/constants/colors";
import { BRAND } from "@/constants/brand";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { ProfileLockScreen } from "@/components/ProfileLockScreen";
import RoutineCarousel from "@/components/RoutineCarousel";
import { ChildrenStrip } from "@/components/ChildrenStrip";
import {
  getTotalPoints,
  getBadges,
  getRewards,
  redeemReward,
  type Badge,
  type Reward,
} from "@/utils/rewardsStorage";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemStatus = "pending" | "completed" | "skipped" | "delayed";

type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  status?: ItemStatus;
  notes?: string;
  ageBand?: "2-5" | "6-10" | "10+";
};

type Routine = {
  id: number;
  childId: number;
  childName: string;
  date: string;
  title: string;
  items: RoutineItem[];
  createdAt?: string;
};

type Child = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number;
};

type DashboardSummary = {
  totalChildren: number;
  totalRoutines: number;
  positiveBehaviorsToday: number;
  negativeBehaviorsToday: number;
  routinesGeneratedThisWeek: number;
};

type BehaviorStat = {
  childId: number;
  childName: string;
  positive: number;
  negative: number;
  neutral: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "dashboard.good_morning";
  if (h >= 12 && h < 17) return "dashboard.good_afternoon";
  return "dashboard.good_evening";
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function computeStreak(routines: Routine[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateSet = new Set(routines.map((r) => r.date.slice(0, 10)));
  let streak = 0;
  while (true) {
    const d = new Date(today);
    d.setDate(d.getDate() - streak);
    const key = d.toISOString().slice(0, 10);
    if (dateSet.has(key)) streak++;
    else break;
  }
  return streak;
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  label,
  actionLabel,
  onAction,
}: {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const c = useColors();
  return (
    <View style={sectionHdrStyles.row}>
      <Text style={[sectionHdrStyles.label, { color: c.mutedForeground }]}>{label.toUpperCase()}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={sectionHdrStyles.action}>{actionLabel} →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const sectionHdrStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 10 },
  label: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1.6 },
  action: { fontSize: 11, fontWeight: "700", color: brand.violet600 },
});

// ─── Streak Card ──────────────────────────────────────────────────────────────

function StreakCard({ streak, onPress }: { streak: number; onPress: () => void }) {
  const { t } = useTranslation();
  const c = useColors();
  const label = streak >= 7 ? "🏆 Epic" : streak >= 3 ? "🔥 Hot" : "✨ Active";
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[streakStyles.card, { borderColor: brandAlpha.violet600_18, backgroundColor: c.surface ?? "rgba(255,255,255,0.06)" }]}
    >
      <Text style={[streakStyles.fire, { opacity: streak === 0 ? 0.35 : 1 }]}>🔥</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
          <Text style={[streakStyles.num, { color: c.foreground }]}>{streak}</Text>
          <Text style={[streakStyles.unit, { color: c.mutedForeground }]}>{t("screens.tabs_index.day_streak")}</Text>
        </View>
        <Text style={[streakStyles.sub, { color: c.mutedForeground }]}>
          {streak === 0 ? "Start today!" : streak >= 3 ? "You're on a roll!" : "Keep going!"}
        </Text>
      </View>
      {streak > 0 && (
        <View style={streakStyles.badge}>
          <Text style={streakStyles.badgeText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
const streakStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  fire: { fontSize: 28 },
  num: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  unit: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  sub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  badge: {
    backgroundColor: brandAlpha.violet600_12,
    borderWidth: 1,
    borderColor: brandAlpha.violet600_18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: brand.violet600 },
});

// ─── Stats Grid (2×2) ─────────────────────────────────────────────────────────

function StatTile({ label, value, sub, icon }: { label: string; value: number | string; sub: string; icon: string }) {
  const c = useColors();
  return (
    <View style={[statStyles.tile, { borderColor: brandAlpha.violet600_15, backgroundColor: c.surface ?? "rgba(255,255,255,0.05)" }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={[statStyles.label, { color: c.mutedForeground }]}>{label.toUpperCase()}</Text>
        <Ionicons name={icon as any} size={14} color={brand.violet500} />
      </View>
      <Text style={[statStyles.value, { color: c.foreground }]}>{value}</Text>
      <Text style={[statStyles.sub, { color: c.mutedForeground }]}>{sub.toUpperCase()}</Text>
    </View>
  );
}

function StatsGrid({ summary, loading }: { summary: DashboardSummary | null; loading: boolean }) {
  const c = useColors();
  if (loading) {
    return (
      <View style={statStyles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[statStyles.tile, { borderColor: brandAlpha.violet600_10, opacity: 0.4 }]}>
            <ActivityIndicator size="small" color={brand.violet400} />
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={statStyles.grid}>
      <StatTile label="Routines" value={summary?.routinesGeneratedThisWeek ?? 0} sub="this week" icon="calendar-outline" />
      <StatTile label="Great Job" value={summary?.positiveBehaviorsToday ?? 0} sub="today" icon="trending-up-outline" />
      <StatTile label="Challenging" value={summary?.negativeBehaviorsToday ?? 0} sub="today" icon="trending-down-outline" />
      <StatTile label="Children" value={summary?.totalChildren ?? 0} sub="total" icon="people-outline" />
    </View>
  );
}
const statStyles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  tile: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    minHeight: 80,
    justifyContent: "center",
  },
  label: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.8 },
  value: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5, lineHeight: 30 },
  sub: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 },
});

// ─── Amy AI Suggestion Card ───────────────────────────────────────────────────

function AmySuggestionCard({ routines, streak }: { routines: Routine[]; streak: number }) {
  const { t } = useTranslation();
  const c = useColors();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoutines = routines.filter((r) => r.date.slice(0, 10) === todayStr);
  const allItems = todayRoutines.flatMap((r) => r.items);
  const total = allItems.length;
  const completed = allItems.filter((i) => i.status === "completed").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hour = new Date().getHours();

  const suggestions: { emoji: string; text: string }[] = [];

  if (total === 0) {
    suggestions.push({ emoji: "📅", text: "No routine for today yet. Generate one to get started!" });
  } else if (pct < 30 && hour >= 14) {
    suggestions.push({ emoji: "⚡", text: "Your child seems behind today — try shorter, easier tasks to build momentum." });
  } else if (pct >= 80) {
    suggestions.push({ emoji: "🌟", text: "Amazing progress today! Consider a small reward to celebrate." });
  }

  if (hour >= 15 && hour <= 17) {
    suggestions.push({ emoji: "❤️", text: "Good time for a 15-min bonding activity — a quick walk or board game goes a long way." });
  }

  if (streak >= 3) {
    suggestions.push({ emoji: "🔥", text: `You're on a ${streak}-day streak! Consistency builds habits.` });
  } else if (streak === 0 && hour < 10) {
    suggestions.push({ emoji: "☀️", text: "Fresh start today! Generate a routine to set a positive tone for the day." });
  }

  if (hour >= 19) {
    suggestions.push({ emoji: "🌙", text: "Wind-down time! End screen time 30 min before sleep for better rest." });
  }

  const display = suggestions.slice(0, 2);

  return (
    <View style={[amyStyles.wrap, { borderColor: brandAlpha.violet600_18 }]}>
      <View style={[amyStyles.header, { borderBottomColor: brandAlpha.violet600_15 }]}>
        <Text style={amyStyles.amyEmoji}>🤖</Text>
        <Text style={[amyStyles.headerText, { color: c.foreground }]}>{t("screens.tabs_index.amy_ai_suggests")}</Text>
      </View>
      <View style={amyStyles.body}>
        {display.length === 0 ? (
          <Text style={[amyStyles.allGood, { color: c.mutedForeground }]}>{t("screens.tabs_index.all_looking_good_today")}</Text>
        ) : (
          display.map((s, i) => (
            <View key={i} style={[amyStyles.tip, { borderColor: brandAlpha.violet600_12, backgroundColor: "rgba(255,255,255,0.04)" }]}>
              <Text style={amyStyles.tipEmoji}>{s.emoji}</Text>
              <Text style={[amyStyles.tipText, { color: c.foreground }]}>{s.text}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
const amyStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "rgba(139,92,246,0.06)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  amyEmoji: { fontSize: 16 },
  headerText: { fontSize: 13.5, fontWeight: "800", letterSpacing: -0.2 },
  body: { padding: 10, gap: 8 },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipEmoji: { fontSize: 16, marginTop: 1 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "500" },
  allGood: { textAlign: "center", fontSize: 12, paddingVertical: 8, fontWeight: "500" },
});

// ─── Parent Score Card ────────────────────────────────────────────────────────

function ParentScoreCard({ routines, streak }: { routines: Routine[]; streak: number }) {
  const { t } = useTranslation();
  const c = useColors();
  const last7 = routines.slice(0, 7);
  const totalItems = last7.flatMap((r) => r.items).length;
  const completedItems = last7.flatMap((r) => r.items).filter((i) => i.status === "completed").length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const daysActive = last7.length;
  const streakBonus = Math.min(streak * 5, 30);
  const score = Math.min(Math.round(completionRate * 0.5 + daysActive * 5 + streakBonus), 100);
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
  const percentile = score >= 80 ? 90 : score >= 60 ? 70 : score >= 40 ? 50 : score >= 20 ? 30 : 15;

  return (
    <View style={[scoreStyles.card, { borderColor: brandAlpha.violet600_15, backgroundColor: c.surface ?? "rgba(255,255,255,0.04)" }]}>
      <View style={scoreStyles.header}>
        <Ionicons name="trophy-outline" size={16} color={brand.violet500} />
        <Text style={[scoreStyles.headerText, { color: c.foreground }]}>{t("screens.tabs_index.parent_score")}</Text>
      </View>
      <View style={scoreStyles.body}>
        <View style={[scoreStyles.gradeBadge, { backgroundColor: brandAlpha.violet600_12, borderColor: brandAlpha.violet600_18 }]}>
          <Text style={[scoreStyles.grade, { color: brand.violet600 }]}>{grade}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text style={[scoreStyles.scoreNum, { color: c.foreground }]}>{score}</Text>
            <Text style={[scoreStyles.scoreOf, { color: c.mutedForeground }]}>/100</Text>
          </View>
          <Text style={[scoreStyles.percentile, { color: c.mutedForeground }]}>Top {100 - percentile}% of parents</Text>
        </View>
      </View>
      <View style={scoreStyles.bars}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={[scoreStyles.barLabel, { color: c.mutedForeground }]}>{t("screens.tabs_index.completion")}</Text>
          <Text style={[scoreStyles.barValue, { color: c.foreground }]}>{completionRate}%</Text>
        </View>
        <View style={[scoreStyles.track, { backgroundColor: brandAlpha.violet600_12 }]}>
          <View style={[scoreStyles.fill, { width: `${completionRate}%` as any, backgroundColor: brand.violet500 }]} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4, marginTop: 10 }}>
          <Text style={[scoreStyles.barLabel, { color: c.mutedForeground }]}>{t("screens.tabs_index.days_active")}</Text>
          <Text style={[scoreStyles.barValue, { color: c.foreground }]}>{daysActive}/7</Text>
        </View>
        <View style={[scoreStyles.track, { backgroundColor: brandAlpha.violet600_12 }]}>
          <View style={[scoreStyles.fill, { width: `${(daysActive / 7) * 100}%` as any, backgroundColor: brand.violet400 }]} />
        </View>
      </View>
      {score < 60 && (
        <View style={[scoreStyles.hint, { borderColor: brandAlpha.violet600_12, backgroundColor: brandAlpha.violet600_04 }]}>
          <Text style={[{ fontSize: 12, color: c.mutedForeground }]}>{t("screens.tabs_index.complete_5_tasks_per_day_to_boost_your_s")}</Text>
        </View>
      )}
    </View>
  );
}
const scoreStyles = StyleSheet.create({
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(124,58,237,0.1)" },
  headerText: { fontSize: 13.5, fontWeight: "800", letterSpacing: -0.2 },
  body: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  gradeBadge: { width: 54, height: 54, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  grade: { fontSize: 26, fontWeight: "900" },
  scoreNum: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  scoreOf: { fontSize: 12, fontWeight: "700" },
  percentile: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  bars: { paddingHorizontal: 14, paddingBottom: 14 },
  barLabel: { fontSize: 11, fontWeight: "500" },
  barValue: { fontSize: 11, fontWeight: "700" },
  track: { height: 5, borderRadius: 999, overflow: "hidden" },
  fill: { height: 5, borderRadius: 999 },
  hint: { marginHorizontal: 14, marginBottom: 14, borderRadius: 12, borderWidth: 1, padding: 10 },
});

// ─── Recent Routines List ─────────────────────────────────────────────────────

function RecentRoutinesList({
  routines,
  loading,
  onPress,
}: {
  routines: Routine[];
  loading: boolean;
  onPress: (id: number) => void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  if (loading) {
    return (
      <View style={[recentStyles.card, { borderColor: brandAlpha.violet600_15 }]}>
        <ActivityIndicator size="small" color={brand.violet400} style={{ padding: 20 }} />
      </View>
    );
  }
  if (routines.length === 0) {
    return (
      <View style={[recentStyles.card, recentStyles.empty, { borderColor: brandAlpha.violet600_15, borderStyle: "dashed" }]}>
        <Ionicons name="calendar-outline" size={28} color={brand.violet300} />
        <Text style={[recentStyles.emptyText, { color: c.mutedForeground }]}>{t("screens.tabs_index.no_routines_yet")}</Text>
      </View>
    );
  }
  return (
    <View style={[recentStyles.card, { borderColor: brandAlpha.violet600_15, backgroundColor: c.surface ?? "rgba(255,255,255,0.04)" }]}>
      {routines.map((routine, idx) => {
        const items = routine.items ?? [];
        const done = items.filter((i) => i.status === "completed").length;
        const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
        return (
          <TouchableOpacity
            key={routine.id}
            onPress={() => onPress(routine.id)}
            activeOpacity={0.75}
            style={[
              recentStyles.row,
              idx < routines.length - 1 && { borderBottomWidth: 1, borderBottomColor: brandAlpha.violet600_10 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[recentStyles.title, { color: c.foreground }]} numberOfLines={1}>{routine.title}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                <View style={recentStyles.childPill}>
                  <Text style={recentStyles.childPillText}>{routine.childName}</Text>
                </View>
                <Text style={[recentStyles.date, { color: c.mutedForeground }]}>
                  {new Date(routine.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              {items.length > 0 && (
                <>
                  <Text style={[recentStyles.pct, { color: c.foreground }]}>{pct}%</Text>
                  <Text style={[recentStyles.pctSub, { color: c.mutedForeground }]}>{done}/{items.length}</Text>
                </>
              )}
            </View>
            <Ionicons name="chevron-forward" size={14} color={brand.violet400} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const recentStyles = StyleSheet.create({
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 10 },
  empty: { padding: 28, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13, fontWeight: "500" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  title: { fontSize: 13.5, fontWeight: "700" },
  childPill: { backgroundColor: brandAlpha.violet600_12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  childPillText: { fontSize: 10, fontWeight: "700", color: brand.violet600 },
  date: { fontSize: 11, fontWeight: "500" },
  pct: { fontSize: 13, fontWeight: "800" },
  pctSub: { fontSize: 10, fontWeight: "500" },
});

// ─── Behavior Highlights ──────────────────────────────────────────────────────

function BehaviorHighlights({ stats, loading }: { stats: BehaviorStat[]; loading: boolean }) {
  const { t } = useTranslation();
  const c = useColors();
  if (loading) {
    return (
      <View style={[behaviorStyles.card, { borderColor: brandAlpha.violet600_15 }]}>
        <ActivityIndicator size="small" color={brand.violet400} style={{ padding: 20 }} />
      </View>
    );
  }
  if (stats.length === 0) {
    return (
      <View style={[behaviorStyles.card, behaviorStyles.empty, { borderColor: brandAlpha.violet600_15, borderStyle: "dashed" }]}>
        <Text style={[{ fontSize: 13, fontWeight: "500" }, { color: c.mutedForeground }]}>{t("screens.tabs_index.no_behavior_logged_yet")}</Text>
      </View>
    );
  }
  return (
    <View style={[behaviorStyles.card, { borderColor: brandAlpha.violet600_15, backgroundColor: c.surface ?? "rgba(255,255,255,0.04)" }]}>
      {stats.map((stat, idx) => (
        <View
          key={stat.childId}
          style={[behaviorStyles.row, idx < stats.length - 1 && { borderBottomWidth: 1, borderBottomColor: brandAlpha.violet600_10 }]}
        >
          <Text style={[behaviorStyles.childName, { color: c.foreground }]}>{stat.childName}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <View style={[behaviorStyles.statBadge, { backgroundColor: "rgba(139,92,246,0.08)", borderColor: brandAlpha.violet600_18 }]}>
              <Ionicons name="trending-up-outline" size={12} color={brand.violet600} />
              <Text style={[behaviorStyles.statNum, { color: brand.violet700 ?? brand.violet600 }]}>{stat.positive}</Text>
            </View>
            <View style={[behaviorStyles.statBadge, { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }]}>
              <Ionicons name="trending-down-outline" size={12} color={c.destructive} />
              <Text style={[behaviorStyles.statNum, { color: c.destructive }]}>{stat.negative}</Text>
            </View>
            <View style={[behaviorStyles.statBadge, { backgroundColor: "rgba(120,120,120,0.08)", borderColor: "rgba(120,120,120,0.2)" }]}>
              <Ionicons name="remove-outline" size={12} color={c.mutedForeground} />
              <Text style={[behaviorStyles.statNum, { color: c.mutedForeground }]}>{stat.neutral}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
const behaviorStyles = StyleSheet.create({
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 10 },
  empty: { padding: 24, alignItems: "center" },
  row: { padding: 14 },
  childName: { fontSize: 14, fontWeight: "700" },
  statBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  statNum: { fontSize: 13, fontWeight: "800" },
});

// ─── Rewards Card ─────────────────────────────────────────────────────────────

function RewardsCard({ onViewAll }: { onViewAll: () => void }) {
  const { t } = useTranslation();
  const c = useColors();
  const [points, setPoints] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [p, b, r] = await Promise.all([getTotalPoints(), getBadges(), getRewards()]);
      setPoints(p);
      setBadges(b);
      setRewards(r);
    })();
  }, []);

  const handleRedeem = useCallback(async (reward: Reward) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await redeemReward(reward, "Child");
    if (result.ok) {
      setPoints(result.pointsAfter);
      setRedeemMsg(`🎉 Redeemed: ${reward.emoji} ${reward.label}!`);
      setTimeout(() => setRedeemMsg(null), 3000);
    } else {
      setRedeemMsg(`❌ Not enough points (need ${reward.cost})`);
      setTimeout(() => setRedeemMsg(null), 2000);
    }
  }, []);

  return (
    <View style={[rewardsStyles.card, { borderColor: brandAlpha.violet600_15, backgroundColor: c.surface ?? "rgba(255,255,255,0.04)" }]}>
      <View style={rewardsStyles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="trophy-outline" size={16} color={brand.violet600} />
          <Text style={[rewardsStyles.headerText, { color: c.foreground }]}>{t("screens.tabs_index.rewards_points")}</Text>
        </View>
        <View style={rewardsStyles.pointsBadge}>
          <Ionicons name="star" size={12} color={brand.violet500} />
          <Text style={rewardsStyles.pointsNum}>{points}</Text>
          <Text style={rewardsStyles.pointsPts}>{t("screens.tabs_index.pts")}</Text>
        </View>
      </View>

      <View style={rewardsStyles.body}>
        {redeemMsg && (
          <View style={rewardsStyles.redeemMsg}>
            <Text style={rewardsStyles.redeemMsgText}>{redeemMsg}</Text>
          </View>
        )}

        {badges.length > 0 ? (
          <View style={{ marginBottom: 14 }}>
            <Text style={[rewardsStyles.subLabel, { color: c.mutedForeground }]}>{t("screens.tabs_index.badges_earned")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {badges.map((b) => (
                <View key={b.id} style={rewardsStyles.badgePill}>
                  <Text style={rewardsStyles.badgePillText}>{b.emoji} {b.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={[rewardsStyles.noBadges, { color: c.mutedForeground }]}>
            Complete tasks to earn badges! 🌟
          </Text>
        )}

        <Text style={[rewardsStyles.subLabel, { color: c.mutedForeground }]}>{t("screens.tabs_index.reward_store")}</Text>
        <View style={{ gap: 8, marginTop: 6 }}>
          {rewards.slice(0, 3).map((r) => (
            <View key={r.id} style={[rewardsStyles.rewardRow, { borderColor: brandAlpha.violet600_12, backgroundColor: brandAlpha.violet600_04 }]}>
              <Text style={rewardsStyles.rewardEmoji}>{r.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[rewardsStyles.rewardLabel, { color: c.foreground }]}>{r.label}</Text>
                <Text style={[rewardsStyles.rewardCost, { color: c.mutedForeground }]}>{r.cost} pts</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRedeem(r)}
                style={[rewardsStyles.redeemBtn, points >= r.cost ? rewardsStyles.redeemBtnActive : rewardsStyles.redeemBtnDisabled]}
                activeOpacity={0.8}
              >
                <Text style={[rewardsStyles.redeemBtnText, points < r.cost && { color: c.mutedForeground }]}>{t("screens.tabs_index.redeem")}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={onViewAll} style={rewardsStyles.viewAll} activeOpacity={0.7}>
          <Text style={rewardsStyles.viewAllText}>{t("screens.tabs_index.view_all_rewards")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const rewardsStyles = StyleSheet.create({
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(124,58,237,0.1)" },
  headerText: { fontSize: 13.5, fontWeight: "800", letterSpacing: -0.2 },
  pointsBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: brandAlpha.violet600_12, borderWidth: 1, borderColor: brandAlpha.violet600_18, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pointsNum: { fontSize: 14, fontWeight: "900", color: brand.violet600 },
  pointsPts: { fontSize: 11, fontWeight: "500", color: brand.violet600 },
  body: { padding: 14 },
  redeemMsg: { backgroundColor: "rgba(34,197,94,0.12)", borderWidth: 1, borderColor: "rgba(34,197,94,0.3)", borderRadius: 10, padding: 10, marginBottom: 10, alignItems: "center" },
  redeemMsgText: { fontSize: 13, fontWeight: "600", color: "#16a34a" }, // audit-ok: semantic success green for redemption confirmation; no brand token
  subLabel: { fontSize: 9.5, fontWeight: "800", letterSpacing: 1 },
  badgePill: { backgroundColor: brandAlpha.violet600_12, borderWidth: 1, borderColor: brandAlpha.violet600_18, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgePillText: { fontSize: 11, fontWeight: "700", color: brand.violet600 },
  noBadges: { fontSize: 12, fontWeight: "500", marginBottom: 14 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, borderWidth: 1 },
  rewardEmoji: { fontSize: 22 },
  rewardLabel: { fontSize: 13, fontWeight: "600" },
  rewardCost: { fontSize: 11, fontWeight: "500", marginTop: 1 },
  redeemBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  redeemBtnActive: { backgroundColor: brand.violet600 },
  redeemBtnDisabled: { backgroundColor: "rgba(120,120,120,0.15)" },
  redeemBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  viewAll: { marginTop: 14, alignItems: "center", paddingVertical: 4 },
  viewAllText: { fontSize: 12, fontWeight: "700", color: brand.violet600 },
});

// ─── Onboarding Screen ────────────────────────────────────────────────────────

function OnboardingScreen({ displayName, onGetStarted, onExploreHub }: {
  displayName: string;
  onGetStarted: () => void;
  onExploreHub: () => void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const { theme } = useTheme();
  const features = [
    { emoji: "🧠", label: `${BRAND.aiName} AI Routine Generator`, desc: "Smart daily schedules tailored to your child's age and needs." },
    { emoji: "📊", label: "Progress Tracking", desc: "Monitor growth, streaks, and milestones in one beautiful view." },
    { emoji: "🎯", label: "Daily Activities", desc: "Age-based activities that build skills while keeping kids engaged." },
    { emoji: "🧩", label: "Learning & Phonics", desc: "Adaptive daily tests that grow harder as your child levels up." },
    { emoji: "❤️", label: "Parenting Tips", desc: "Expert-curated tips, sleep guides, and milestone insights." },
  ];
  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[brand.violet600, brand.indigo500, brand.violet700 ?? brand.violet600]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={onboardStyles.hero}
      >
        <Text style={onboardStyles.heroEyebrow}>{t("screens.tabs_index.meet_amy_ai")}</Text>
        <Text style={onboardStyles.heroTitle}>
          👋 Hi{displayName ? `, ${displayName}` : ""} 😊
        </Text>
        <Text style={onboardStyles.heroSub}>{t("screens.tabs_index.i_m_amy_your_smart_parenting_partner")}</Text>
        <Text style={onboardStyles.heroDesc}>
          Create personalised routines, track progress, and make parenting easier — one day at a time.
        </Text>
      </LinearGradient>

      <Text style={[onboardStyles.tagline, { color: c.mutedForeground }]}>
        Start your child's smart routine today 🚀
      </Text>

      <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 28 }}>
        {features.map((f) => (
          <View key={f.label} style={[onboardStyles.featureRow, { borderColor: brandAlpha.violet600_18, backgroundColor: brandAlpha.violet600_04 }]}>
            <View style={onboardStyles.featureIcon}>
              <Text style={{ fontSize: 22 }}>{f.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[onboardStyles.featureLabel, { color: c.foreground }]}>{f.label}</Text>
              <Text style={[onboardStyles.featureDesc, { color: c.mutedForeground }]}>{f.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={brand.violet300} />
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <TouchableOpacity onPress={onGetStarted} activeOpacity={0.85}>
          <LinearGradient colors={[brand.violet600, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={onboardStyles.primaryCta}>
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={onboardStyles.primaryCtaText}>{t("screens.tabs_index.experience_now")}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onExploreHub}
          activeOpacity={0.85}
          style={[onboardStyles.secondaryCta, { borderColor: brandAlpha.violet600_25 }]}
        >
          <Text style={[onboardStyles.secondaryCtaText, { color: c.foreground }]}>{t("screens.tabs_index.explore_parenting_hub")}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[onboardStyles.footer, { color: c.mutedForeground }]}>
        Works for ages 0–15 years · Science-backed parenting plans
      </Text>
    </ScrollView>
  );
}
const onboardStyles = StyleSheet.create({
  hero: { margin: 20, borderRadius: 24, padding: 28, alignItems: "center" },
  heroEyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 2, color: "rgba(221,214,254,0.9)", textTransform: "uppercase", marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: "900", color: "#fff", textAlign: "center", marginBottom: 6 },
  heroSub: { fontSize: 16, fontWeight: "600", color: "rgba(221,214,254,0.9)", textAlign: "center", marginBottom: 8 },
  heroDesc: { fontSize: 13, color: "rgba(237,233,254,0.85)", textAlign: "center", lineHeight: 20 },
  tagline: { textAlign: "center", fontSize: 13, fontWeight: "600", marginBottom: 16 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 16, padding: 14 },
  featureIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: brandAlpha.violet600_12, alignItems: "center", justifyContent: "center" },
  featureLabel: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  featureDesc: { fontSize: 11.5, lineHeight: 17 },
  primaryCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16 },
  primaryCtaText: { fontSize: 15, fontWeight: "900", color: "#fff" },
  secondaryCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 16, borderWidth: 1.5 },
  secondaryCtaText: { fontSize: 14, fontWeight: "700" },
  footer: { textAlign: "center", fontSize: 11, marginTop: 20, marginBottom: 8 },
});

// ─── Main Dashboard Screen ────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { user } = useUser();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation();
  const { profileComplete, isLoading: profileLoading } = useProfileComplete();

  const goToGenerate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/routines/generate" as never);
  }, [router]);

  const todayStr = formatYMD(new Date());

  // ── Today's routines (shared cache with Parent Hub) ───────────────────────
  // Both surfaces use the same `["routines"]` queryKey via this hook so a
  // Done/Undo toggle on either one updates the other instantly.
  const {
    routines,
    todaysRoutine,
    tasks,
    isLoading: loadingRoutines,
    dataUpdatedAt: routinesUpdatedAt,
    refetch: refetchRoutines,
    onToggle,
    taskIdToItemIndex,
  } = useTodayRoutine({ enabled: !!profileComplete });

  // ── Children ──────────────────────────────────────────────────────────────
  const { data: children = [], isLoading: loadingChildren } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: () => authFetch("/api/children").then((r) => r.ok ? r.json() : []),
    enabled: !!profileComplete,
  });

  // ── Dashboard summary ─────────────────────────────────────────────────────
  const {
    data: summary = null,
    isLoading: loadingSummary,
    dataUpdatedAt: summaryUpdatedAt,
  } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => authFetch("/api/dashboard/summary").then((r) => r.ok ? r.json() : null),
    enabled: !!profileComplete,
    refetchInterval: 30_000,
  });

  // ── Recent routines ───────────────────────────────────────────────────────
  const {
    data: recentRoutines = [],
    isLoading: loadingRecent,
  } = useQuery<Routine[]>({
    queryKey: ["dashboard-recent-routines"],
    queryFn: () => authFetch("/api/dashboard/recent-routines").then((r) => r.ok ? r.json() : []),
    enabled: !!profileComplete,
    refetchInterval: 30_000,
  });

  // ── Behavior stats ────────────────────────────────────────────────────────
  const {
    data: behaviorStats = [],
    isLoading: loadingBehavior,
    dataUpdatedAt: behaviorUpdatedAt,
  } = useQuery<BehaviorStat[]>({
    queryKey: ["dashboard-behavior-stats"],
    queryFn: () => authFetch("/api/dashboard/behavior-stats").then((r) => r.ok ? r.json() : []),
    enabled: !!profileComplete,
    refetchInterval: 30_000,
  });

  // ── Last successful sync timestamp (matches web: max across all queries) ──
  const lastUpdated = Math.max(summaryUpdatedAt ?? 0, routinesUpdatedAt ?? 0, behaviorUpdatedAt ?? 0);

  // ── Dedicated manual-refresh state (isolated from 30s background polling) ─
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // ── Refetch all on pull-to-refresh ────────────────────────────────────────
  const refetch = useCallback(async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([
        refetchRoutines(),
        qc.invalidateQueries({ queryKey: ["children"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-recent-routines"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-behavior-stats"] }),
      ]);
    } finally {
      setManualRefreshing(false);
    }
  }, [refetchRoutines, qc]);

  const streak = useMemo(() => computeStreak(routines), [routines]);

  const onPressCard = useCallback(
    (taskId: string) => {
      if (!todaysRoutine) return;
      const idx = taskIdToItemIndex(taskId);
      const params: Record<string, string> = {};
      if (idx != null) params.highlight = String(idx);
      router.push({ pathname: "/routines/[id]", params: { id: String(todaysRoutine.id), ...params } });
    },
    [todaysRoutine, router, taskIdToItemIndex],
  );

  // ── Guards ────────────────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={mainStyles.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </LinearGradient>
    );
  }

  if (!profileComplete) {
    return <ProfileLockScreen sectionName="Dashboard" />;
  }

  const displayName = user?.firstName ?? "";
  const topPad = insets.top + (Platform.OS === "web" ? 16 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 16 : 0);
  const todayLabel = formatDate(new Date());

  // ── Onboarding (no children yet) ─────────────────────────────────────────
  const noChildren = !loadingChildren && !loadingSummary && children.length === 0 && (summary?.totalChildren ?? 0) === 0;
  if (noChildren && !loadingChildren) {
    return (
      <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={mainStyles.container}>
        <View style={{ paddingTop: topPad + 8, flex: 1 }}>
          <OnboardingScreen
            displayName={displayName}
            onGetStarted={() => router.push("/(tabs)/coach" as never)}
            onExploreHub={() => router.push("/(tabs)/hub" as never)}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={mainStyles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={manualRefreshing} onRefresh={refetch} tintColor={c.primary} />
        }
      >
        {/* ── Hero Greeting ─────────────────────────────────────────── */}
        <View style={mainStyles.heroCard}>
          <View style={mainStyles.eyebrowRow}>
            <Text style={mainStyles.eyebrow}>{t(getGreetingKey()).toUpperCase()}</Text>
            <View style={mainStyles.datePill}>
              <View style={mainStyles.liveDot} />
              <Text style={mainStyles.dateLabel}>{todayLabel}</Text>
            </View>
          </View>
          <Text style={[mainStyles.title, { color: c.foreground }]}>
            👋{" "}
            {displayName
              ? t("dashboard.greeting_with_name", { name: displayName })
              : t("dashboard.greeting_no_name")}
          </Text>
          <Text style={[mainStyles.sub, { color: c.mutedForeground }]}>
            {todaysRoutine ? `${t("dashboard.planned_for_you")} ❤️` : `${t("dashboard.setup_first")} 🌟`}
          </Text>
          {lastUpdated > 0 && (
            <View style={mainStyles.syncRow}>
              <View style={mainStyles.syncDot} />
              <Text style={mainStyles.syncLabel}>
                {t("dashboard.live")}{" "}
                {new Date(lastUpdated).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          )}
        </View>

        {/* ── Children Strip ────────────────────────────────────────── */}
        {!loadingChildren && children.length > 0 && (
          <ChildrenStrip
            children={children}
            onManage={() => router.push("/children" as never)}
            onAdd={() => router.push("/children/new" as never)}
          />
        )}

        {/* ── Today's Timeline ──────────────────────────────────────── */}
        <View style={mainStyles.sectionHeaderRow}>
          <Ionicons name="calendar-outline" size={16} color={c.foreground} />
          <Text style={[mainStyles.sectionTitle, { color: c.foreground }]}>
            {t("dashboard.todays_timeline")}
          </Text>
        </View>

        {loadingRoutines || manualRefreshing ? (
          <View style={mainStyles.loaderRow}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : tasks.length > 0 ? (
          <RoutineCarousel tasks={tasks} onToggle={onToggle} onPressCard={onPressCard} />
        ) : (
          <View style={mainStyles.emptyWrap}>
            <Text style={[mainStyles.emptyTitle, { color: c.foreground }]}>
              {t("dashboard.no_plan_today")}
            </Text>
            <Text style={[mainStyles.emptyText, { color: c.mutedForeground }]}>
              {t("dashboard.no_plan_subtitle")}
            </Text>
            <TouchableOpacity
              onPress={goToGenerate}
              activeOpacity={0.85}
              style={{ marginTop: 16 }}
              testID="dashboard-generate-today-cta"
              accessibilityRole="button"
              accessibilityLabel={t("dashboard.generate_today")}
            >
              <LinearGradient
                colors={[brand.violet600, brand.pink500]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={mainStyles.emptyCta}
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={mainStyles.emptyCtaText}>{t("dashboard.generate_today")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── At a Glance ───────────────────────────────────────────── */}
        <View style={{ marginTop: 24, marginBottom: 14 }}>
          <SectionHeader label="At a Glance" />
        </View>
        <StreakCard streak={streak} onPress={() => router.push("/progress" as never)} />
        <StatsGrid summary={summary} loading={loadingSummary || manualRefreshing} />

        {/* ── Coaching ──────────────────────────────────────────────── */}
        <View style={{ marginBottom: 14 }}>
          <SectionHeader label="Coaching" />
        </View>
        <AmySuggestionCard routines={routines} streak={streak} />
        <ParentScoreCard routines={routines} streak={streak} />

        {/* ── Recent Routines ───────────────────────────────────────── */}
        <View style={{ marginTop: 16, marginBottom: 14 }}>
          <SectionHeader
            label="Recent Routines"
            actionLabel="View all"
            onAction={() => router.push("/(tabs)/routines" as never)}
          />
        </View>
        <RecentRoutinesList
          routines={recentRoutines}
          loading={loadingRecent || manualRefreshing}
          onPress={(id) => router.push({ pathname: "/routines/[id]", params: { id: String(id) } })}
        />

        {/* ── Behavior Highlights ───────────────────────────────────── */}
        <View style={{ marginTop: 16, marginBottom: 14 }}>
          <SectionHeader
            label="Behavior Highlights"
            actionLabel="Log"
            onAction={() => router.push("/behavior" as never)}
          />
        </View>
        <BehaviorHighlights stats={behaviorStats} loading={loadingBehavior || manualRefreshing} />

        {/* ── Rewards ───────────────────────────────────────────────── */}
        <View style={{ marginTop: 16, marginBottom: 14 }}>
          <SectionHeader label="Rewards & Points" />
        </View>
        <RewardsCard onViewAll={() => router.push("/rewards" as never)} />

      </ScrollView>
    </LinearGradient>
  );
}

const mainStyles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.18)",
    backgroundColor: "rgba(168,85,247,0.07)",
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, color: brand.purple500 },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(168,85,247,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: brand.purple500 },
  dateLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.2, color: brand.purple500 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, marginBottom: 4 },
  sub: { fontSize: 13.5, fontWeight: "500" },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: brand.purple500 },
  syncLabel: { fontSize: 10, fontWeight: "600", color: brand.purple500, letterSpacing: 0.3 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  loaderRow: { paddingHorizontal: 20, paddingVertical: 24, alignItems: "center" },
  emptyWrap: {
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.20)",
    backgroundColor: "rgba(168,85,247,0.04)",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2, marginBottom: 6, textAlign: "center" },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: "center", fontWeight: "500" },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyCtaText: { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },
});
