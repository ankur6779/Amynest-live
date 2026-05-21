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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTodayRoutine } from "@/hooks/useTodayRoutine";
import { useTranslation } from "react-i18next";
import type { RoutineTask } from "@/contexts/ProgressContext";
import { categoryIcon } from "@/constants/categoryIcons";
import {
  routineCategoryToTileId,
  sectionCtaLabel,
  tileIdToSection,
} from "@/app/(tabs)/hub-sections";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, brandAlpha, palette } from "@/constants/colors";
import { BRAND } from "@/constants/brand";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { routineDateKey, routineItems } from "@/lib/routines";
import { ProfileLockScreen } from "@/components/ProfileLockScreen";
import RoutineCarousel from "@/components/RoutineCarousel";
import { ChildrenStrip, type ChildTodayProgress } from "@/components/ChildrenStrip";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
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
  const dateSet = new Set(routines.map((r) => routineDateKey(r)).filter(Boolean));
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

function buildTasksFromRoutine(routine: Routine): RoutineTask[] {
  return routineItems(routine).map((it, idx) => {
    const relatedTileId = routineCategoryToTileId(it.category) ?? undefined;
    const section = relatedTileId ? tileIdToSection(relatedTileId) : null;
    const continueLabel = section ? sectionCtaLabel(section) : undefined;
    return {
      id: `t-${routine.id}-${idx}`,
      title: it.activity,
      time: it.time,
      minutes: it.duration ?? 30,
      icon: categoryIcon(it.category),
      done: it.status === "completed",
      ageBand: it.ageBand,
      relatedTileId,
      continueLabel,
    };
  });
}

function computeChildProgressMap(
  children: Child[],
  routines: Routine[],
  todayKey: string,
): Record<number, ChildTodayProgress> {
  const map: Record<number, ChildTodayProgress> = {};
  for (const child of children) {
    const routine = routines.find(
      (r) => routineDateKey(r) === todayKey && r.childId === child.id,
    );
    if (!routine) {
      map[child.id] = { done: 0, total: 0 };
      continue;
    }
    const items = routineItems(routine);
    map[child.id] = {
      done: items.filter((i) => i.status === "completed").length,
      total: items.length,
    };
  }
  return map;
}

function TimelineProgressChip({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation();
  if (total <= 0) return null;
  const pct = Math.min(100, Math.round((done / total) * 100));
  return (
    <View style={timelineChipStyles.wrap}>
      <Text style={timelineChipStyles.label}>
        {t("dashboard.timeline_progress", { done, total })}
      </Text>
      <View style={timelineChipStyles.track}>
        <View style={[timelineChipStyles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}
const timelineChipStyles = StyleSheet.create({
  wrap: { alignItems: "flex-end", minWidth: 80 },
  label: { fontSize: 11, fontWeight: "800", color: brand.violet600, letterSpacing: -0.2 },
  track: {
    width: 72,
    height: 4,
    borderRadius: 999,
    backgroundColor: brandAlpha.violet600_12,
    marginTop: 4,
    overflow: "hidden",
  },
  fill: { height: 4, borderRadius: 999, backgroundColor: palette.emerald400 },
});

// ─── Streak Card ──────────────────────────────────────────────────────────────

function StreakCard({
  streak,
  routines,
  onPress,
}: {
  streak: number;
  routines: Routine[];
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const badgeLabel =
    streak >= 7
      ? `🏆 ${t("dashboard.streak_epic")}`
      : streak >= 3
        ? `🔥 ${t("dashboard.streak_hot")}`
        : `✨ ${t("dashboard.streak_active")}`;
  const isActive = streak > 0;
  const dateSet = new Set(routines.map((r) => routineDateKey(r)).filter(Boolean));
  const last7Keys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const sub =
    streak === 0
      ? t("dashboard.streak_start_today")
      : streak >= 3
        ? t("dashboard.streak_on_roll")
        : t("dashboard.streak_keep_going");
  const daysToEpic = Math.max(0, 7 - streak);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        streakStyles.card,
        isActive
          ? { borderColor: brandAlpha.amber400_18, backgroundColor: brandAlpha.amber400_12 }
          : { borderColor: brandAlpha.violet600_18, backgroundColor: c.surface ?? "rgba(255,255,255,0.06)" },
      ]}
    >
      <Ionicons name="flame" size={28} color={isActive ? brand.amber400 : c.mutedForeground} style={{ opacity: streak === 0 ? 0.35 : 1 }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
          <Text style={[streakStyles.num, { color: isActive ? brand.amber400 : c.foreground }]}>{streak}</Text>
          <Text style={[streakStyles.unit, { color: c.mutedForeground }]}>{t("dashboard.day_streak")}</Text>
        </View>
        <Text style={[streakStyles.sub, { color: c.mutedForeground }]}>{sub}</Text>
        <View style={streakStyles.weekRow}>
          {last7Keys.map((key) => (
            <View
              key={key}
              style={[
                streakStyles.weekDot,
                {
                  backgroundColor: dateSet.has(key) ? brand.amber400 : brandAlpha.violet600_12,
                },
              ]}
            />
          ))}
        </View>
        {streak > 0 && streak < 7 ? (
          <Text style={[streakStyles.goal, { color: c.mutedForeground }]}>
            {t("dashboard.streak_goal", { days: daysToEpic })}
          </Text>
        ) : null}
      </View>
      {isActive ? (
        <View style={[streakStyles.badge, { backgroundColor: brandAlpha.amber400_14, borderColor: brandAlpha.amber400_22 }]}>
          <Text style={[streakStyles.badgeText, { color: brand.amber400 }]}>{badgeLabel}</Text>
        </View>
      ) : null}
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
  num: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  unit: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  sub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  weekRow: { flexDirection: "row", gap: 4, marginTop: 8 },
  weekDot: { width: 8, height: 8, borderRadius: 4 },
  goal: { fontSize: 10, fontWeight: "600", marginTop: 6 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
});

// ─── Stats Grid (2×2) ─────────────────────────────────────────────────────────

type TileAccent = { bg: string; border: string; iconColor: string; valueColor: string };

const TILE_ACCENTS: Record<string, TileAccent> = {
  routines:    { bg: brandAlpha.indigo500_14,         border: brandAlpha.indigo500_20,         iconColor: brand.indigo500,  valueColor: brand.indigo500 },
  great:       { bg: "rgba(52,211,153,0.12)",          border: "rgba(52,211,153,0.22)",          iconColor: palette.emerald400, valueColor: palette.emerald400 },
  challenging: { bg: brandAlpha.rose400_12,            border: brandAlpha.rose400_18,            iconColor: brand.rose400,    valueColor: brand.rose400 },
  children:    { bg: "rgba(244,114,182,0.12)",         border: "rgba(244,114,182,0.22)",         iconColor: brand.pink400,    valueColor: brand.pink400 },
};

function StatTile({
  label,
  value,
  sub,
  icon,
  accent,
  onPress,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: string;
  accent: TileAccent;
  onPress?: () => void;
}) {
  const c = useColors();
  const inner = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={[statStyles.label, { color: c.mutedForeground }]}>{label.toUpperCase()}</Text>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={14} color={accent.iconColor} />
      </View>
      <Text style={[statStyles.value, { color: accent.valueColor }]}>{value}</Text>
      <Text style={[statStyles.sub, { color: c.mutedForeground }]}>{sub}</Text>
    </>
  );
  if (!onPress) {
    return (
      <View style={[statStyles.tile, { borderColor: accent.border, backgroundColor: accent.bg }]}>
        {inner}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        statStyles.tile,
        { borderColor: accent.border, backgroundColor: accent.bg, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      {inner}
    </Pressable>
  );
}

function StatsGrid({
  summary,
  loading,
  onPressPlans,
  onPressWins,
  onPressSupport,
  onPressChildren,
}: {
  summary: DashboardSummary | null;
  loading: boolean;
  onPressPlans: () => void;
  onPressWins: () => void;
  onPressSupport: () => void;
  onPressChildren: () => void;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <View style={statStyles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[statStyles.tile, statStyles.tileSkeleton, { borderColor: brandAlpha.violet600_10 }]} />
        ))}
      </View>
    );
  }
  return (
    <View style={statStyles.grid}>
      <StatTile
        label={t("dashboard.stat_plans_week")}
        value={summary?.routinesGeneratedThisWeek ?? 0}
        sub={t("dashboard.stat_plans_week_sub")}
        icon="calendar-outline"
        accent={TILE_ACCENTS.routines}
        onPress={onPressPlans}
      />
      <StatTile
        label={t("dashboard.stat_great_today")}
        value={summary?.positiveBehaviorsToday ?? 0}
        sub={t("dashboard.stat_great_today_sub")}
        icon="trending-up-outline"
        accent={TILE_ACCENTS.great}
        onPress={onPressWins}
      />
      <StatTile
        label={t("dashboard.stat_support_today")}
        value={summary?.negativeBehaviorsToday ?? 0}
        sub={t("dashboard.stat_support_today_sub")}
        icon="heart-outline"
        accent={TILE_ACCENTS.challenging}
        onPress={onPressSupport}
      />
      <StatTile
        label={t("dashboard.stat_total_routines")}
        value={summary?.totalRoutines ?? 0}
        sub={t("dashboard.stat_total_routines_sub")}
        icon="albums-outline"
        accent={TILE_ACCENTS.children}
        onPress={onPressChildren}
      />
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
  sub: { fontSize: 10, fontWeight: "600", marginTop: 2, lineHeight: 13 },
  tileSkeleton: { minHeight: 80, opacity: 0.35 },
});

// ─── Amy AI Suggestion Card ───────────────────────────────────────────────────

type AmyTip = {
  emoji: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

function AmySuggestionCard({
  routines,
  streak,
  onGenerate,
  onOpenHub,
  onViewRewards,
  onViewProgress,
}: {
  routines: Routine[];
  streak: number;
  onGenerate: () => void;
  onOpenHub: () => void;
  onViewRewards: () => void;
  onViewProgress: () => void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoutines = routines.filter((r) => routineDateKey(r) === todayStr);
  const allItems = todayRoutines.flatMap((r) => routineItems(r));
  const total = allItems.length;
  const completed = allItems.filter((i) => i.status === "completed").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hour = new Date().getHours();

  const suggestions: AmyTip[] = [];

  if (total === 0) {
    suggestions.push({
      emoji: "📅",
      text: "No routine for today yet. Generate one to get started!",
      actionLabel: t("dashboard.amy_generate_routine"),
      onAction: onGenerate,
    });
  } else if (pct < 30 && hour >= 14) {
    suggestions.push({
      emoji: "⚡",
      text: "Your child seems behind today — try shorter, easier tasks to build momentum.",
      actionLabel: t("dashboard.amy_generate_routine"),
      onAction: onGenerate,
    });
  } else if (pct >= 80) {
    suggestions.push({
      emoji: "🌟",
      text: "Amazing progress today! Consider a small reward to celebrate.",
      actionLabel: t("dashboard.amy_view_rewards"),
      onAction: onViewRewards,
    });
  }

  if (hour >= 15 && hour <= 17) {
    suggestions.push({
      emoji: "❤️",
      text: "Good time for a 15-min bonding activity — a quick walk or board game goes a long way.",
      actionLabel: t("dashboard.amy_open_hub"),
      onAction: onOpenHub,
    });
  }

  if (streak >= 3) {
    suggestions.push({
      emoji: "🔥",
      text: `You're on a ${streak}-day streak! Consistency builds habits.`,
      actionLabel: t("dashboard.amy_view_progress"),
      onAction: onViewProgress,
    });
  } else if (streak === 0 && hour < 10) {
    suggestions.push({
      emoji: "☀️",
      text: "Fresh start today! Generate a routine to set a positive tone for the day.",
      actionLabel: t("dashboard.amy_generate_routine"),
      onAction: onGenerate,
    });
  }

  if (hour >= 19) {
    suggestions.push({
      emoji: "🌙",
      text: "Wind-down time! End screen time 30 min before sleep for better rest.",
      actionLabel: t("dashboard.amy_open_hub"),
      onAction: onOpenHub,
    });
  }

  const display = suggestions.slice(0, 2);

  return (
    <View style={[amyStyles.wrap, { borderColor: brandAlpha.indigo500_20 }]}>
      <LinearGradient
        colors={["rgba(99,102,241,0.22)", "rgba(139,92,246,0.18)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[amyStyles.header, { borderBottomColor: brandAlpha.indigo500_20 }]}
      >
        <Text style={amyStyles.amyEmoji}>✨</Text>
        <Text style={[amyStyles.headerText, { color: c.foreground }]}>{t("screens.tabs_index.amy_ai_suggests")}</Text>
      </LinearGradient>
      <View style={amyStyles.body}>
        {display.length === 0 ? (
          <Text style={[amyStyles.allGood, { color: c.mutedForeground }]}>{t("screens.tabs_index.all_looking_good_today")}</Text>
        ) : (
          display.map((s, i) => (
            <View key={i} style={[amyStyles.tip, { borderColor: brandAlpha.violet600_12, backgroundColor: brandAlpha.violet600_04 }]}>
              <Text style={amyStyles.tipEmoji}>{s.emoji}</Text>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={[amyStyles.tipText, { color: c.foreground }]}>{s.text}</Text>
                {s.actionLabel && s.onAction ? (
                  <TouchableOpacity onPress={s.onAction} style={amyStyles.tipCta} activeOpacity={0.85}>
                    <Text style={amyStyles.tipCtaText}>{s.actionLabel}</Text>
                    <Ionicons name="arrow-forward" size={12} color="#fff" />
                  </TouchableOpacity>
                ) : null}
              </View>
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
  tipText: { fontSize: 13, lineHeight: 19, fontWeight: "500" },
  tipCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: brand.violet600,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  tipCtaText: { fontSize: 11.5, fontWeight: "800", color: "#fff" },
  allGood: { textAlign: "center", fontSize: 12, paddingVertical: 8, fontWeight: "500" },
});

// ─── Parent Score Card ────────────────────────────────────────────────────────

function ParentScoreCard({ routines, streak }: { routines: Routine[]; streak: number }) {
  const { t } = useTranslation();
  const c = useColors();
  const last7 = routines.slice(0, 7);
  const totalItems = last7.flatMap((r) => routineItems(r)).length;
  const completedItems = last7.flatMap((r) => routineItems(r)).filter((i) => i.status === "completed").length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const daysActive = last7.length;
  const streakBonus = Math.min(streak * 5, 30);
  const score = Math.min(Math.round(completionRate * 0.5 + daysActive * 5 + streakBonus), 100);
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
  const tasksNeeded = score < 60 ? Math.max(1, Math.ceil((60 - score) / 12)) : 0;

  return (
    <View style={[scoreStyles.card, { borderColor: brandAlpha.violet600_15, backgroundColor: c.surface ?? "rgba(255,255,255,0.04)" }]}>
      <View style={scoreStyles.header}>
        <Ionicons name="ribbon-outline" size={16} color={brand.violet500} />
        <View>
          <Text style={[scoreStyles.headerText, { color: c.foreground }]}>{t("dashboard.parent_score")}</Text>
          <Text style={[scoreStyles.headerSub, { color: c.mutedForeground }]}>{t("dashboard.parent_score_sub")}</Text>
        </View>
      </View>
      <View style={scoreStyles.body}>
        <LinearGradient
          colors={[brand.amber400, brand.rose400]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={scoreStyles.gradeBadge}
        >
          <Text style={[scoreStyles.grade, { color: "#fff" }]}>{grade}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text style={[scoreStyles.scoreNum, { color: c.foreground }]}>{score}</Text>
            <Text style={[scoreStyles.scoreOf, { color: c.mutedForeground }]}>/100</Text>
          </View>
          <Text style={[scoreStyles.percentile, { color: c.mutedForeground }]}>
            {t("screens.tabs_index.completion")} {completionRate}% · {t("screens.tabs_index.days_active")} {daysActive}/7
          </Text>
        </View>
      </View>
      <View style={scoreStyles.bars}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={[scoreStyles.barLabel, { color: c.mutedForeground }]}>{t("screens.tabs_index.completion")}</Text>
          <Text style={[scoreStyles.barValue, { color: c.foreground }]}>{completionRate}%</Text>
        </View>
        <View style={[scoreStyles.track, { backgroundColor: brandAlpha.violet600_12 }]}>
          <View style={[scoreStyles.fill, { width: `${completionRate}%` as any, backgroundColor: palette.emerald400 }]} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4, marginTop: 10 }}>
          <Text style={[scoreStyles.barLabel, { color: c.mutedForeground }]}>{t("screens.tabs_index.days_active")}</Text>
          <Text style={[scoreStyles.barValue, { color: c.foreground }]}>{daysActive}/7</Text>
        </View>
        <View style={[scoreStyles.track, { backgroundColor: brandAlpha.indigo500_14 }]}>
          <View style={[scoreStyles.fill, { width: `${(daysActive / 7) * 100}%` as any, backgroundColor: brand.indigo500 }]} />
        </View>
      </View>
      {score < 60 && tasksNeeded > 0 ? (
        <View style={[scoreStyles.hint, { borderColor: brandAlpha.violet600_12, backgroundColor: brandAlpha.violet600_04 }]}>
          <Text style={[{ fontSize: 12, color: c.mutedForeground }]}>
            {t("dashboard.score_boost_hint", { count: tasksNeeded })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
const scoreStyles = StyleSheet.create({
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: brandAlpha.violet600_10 },
  headerText: { fontSize: 13.5, fontWeight: "800", letterSpacing: -0.2 },
  headerSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
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
            <View style={{ alignItems: "flex-end", gap: 4, minWidth: 56 }}>
              {items.length > 0 ? (
                <>
                  <Text style={[recentStyles.pct, { color: c.foreground }]}>{pct}%</Text>
                  <View style={recentStyles.barTrack}>
                    <View style={[recentStyles.barFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={[recentStyles.pctSub, { color: c.mutedForeground }]}>{done}/{items.length}</Text>
                </>
              ) : null}
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
  barTrack: {
    width: 52,
    height: 4,
    borderRadius: 999,
    backgroundColor: brandAlpha.violet600_12,
    overflow: "hidden",
  },
  barFill: { height: 4, borderRadius: 999, backgroundColor: palette.emerald400 },
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
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <View style={[behaviorStyles.statBadge, { backgroundColor: brandAlpha.violet600_08, borderColor: brandAlpha.violet600_18 }]}>
              <Ionicons name="trending-up-outline" size={12} color={brand.violet600} />
              <Text style={[behaviorStyles.statLabel, { color: c.mutedForeground }]}>{t("dashboard.positive_label")}</Text>
              <Text style={[behaviorStyles.statNum, { color: brand.violet700 ?? brand.violet600 }]}>{stat.positive}</Text>
            </View>
            <View style={[behaviorStyles.statBadge, { backgroundColor: brandAlpha.rose400_12, borderColor: brandAlpha.rose400_18 }]}>
              <Ionicons name="heart-outline" size={12} color={c.destructive} />
              <Text style={[behaviorStyles.statLabel, { color: c.mutedForeground }]}>{t("dashboard.negative_label")}</Text>
              <Text style={[behaviorStyles.statNum, { color: c.destructive }]}>{stat.negative}</Text>
            </View>
            <View style={[behaviorStyles.statBadge, { backgroundColor: "rgba(120,120,120,0.08)", borderColor: "rgba(120,120,120,0.2)" }]}>
              <Ionicons name="remove-outline" size={12} color={c.mutedForeground} />
              <Text style={[behaviorStyles.statLabel, { color: c.mutedForeground }]}>{t("dashboard.neutral_label")}</Text>
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
  statLabel: { fontSize: 10, fontWeight: "600" },
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
    <View style={[rewardsStyles.card, { borderColor: brandAlpha.amber400_18, backgroundColor: brandAlpha.amber400_08 }]}>
      <View style={rewardsStyles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="medal-outline" size={16} color={brand.amber400} />
          <Text style={[rewardsStyles.headerText, { color: c.foreground }]}>{t("dashboard.rewards_points")}</Text>
        </View>
        <View style={[rewardsStyles.pointsBadge, { backgroundColor: brandAlpha.amber400_14, borderColor: brandAlpha.amber400_22 }]}>
          <Ionicons name="star" size={12} color={brand.amber400} />
          <Text style={[rewardsStyles.pointsNum, { color: brand.amber400 }]}>{points}</Text>
          <Text style={[rewardsStyles.pointsPts, { color: brand.amber400 }]}>{t("screens.tabs_index.pts")}</Text>
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
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  const effectiveRoutine = useMemo(() => {
    const todayList = routines.filter((r) => routineDateKey(r) === todayStr);
    if (selectedChildId != null) {
      return todayList.find((r) => r.childId === selectedChildId) ?? null;
    }
    return todaysRoutine ?? todayList[0] ?? null;
  }, [routines, todayStr, selectedChildId, todaysRoutine]);

  const displayTasks = useMemo((): RoutineTask[] => {
    if (selectedChildId == null) return tasks;
    if (!effectiveRoutine) return [];
    return buildTasksFromRoutine(effectiveRoutine);
  }, [selectedChildId, tasks, effectiveRoutine]);

  const progressByChildId = useMemo(
    () => computeChildProgressMap(children, routines, todayStr),
    [children, routines, todayStr],
  );

  const filteredBehaviorStats = useMemo(() => {
    if (selectedChildId == null) return behaviorStats;
    return behaviorStats.filter((s) => s.childId === selectedChildId);
  }, [behaviorStats, selectedChildId]);

  const filteredRecentRoutines = useMemo(() => {
    if (selectedChildId == null) return recentRoutines;
    return recentRoutines.filter((r) => r.childId === selectedChildId);
  }, [recentRoutines, selectedChildId]);

  const selectedChild = useMemo(
    () => children.find((ch) => ch.id === selectedChildId) ?? null,
    [children, selectedChildId],
  );

  const timelineProgress = useMemo(() => {
    const done = displayTasks.filter((t) => t.done).length;
    return { done, total: displayTasks.length };
  }, [displayTasks]);

  const nextPendingTask = useMemo(
    () => displayTasks.find((t) => !t.done) ?? null,
    [displayTasks],
  );

  const saveRoutineItemsMut = useMutation({
    mutationFn: ({ routineId, items }: { routineId: number; items: RoutineItem[] }) =>
      authFetch(`/api/routines/${routineId}/items`, {
        method: "PATCH",
        body: JSON.stringify({ items }),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["routine", String(variables.routineId)] });
      qc.invalidateQueries({ queryKey: ["routines"] });
    },
  });

  const handleToggle = useCallback(
    (taskId: string) => {
      const routine = effectiveRoutine;
      if (!routine) return;
      if (todaysRoutine && routine.id === todaysRoutine.id) {
        onToggle(taskId);
        return;
      }
      const idx = parseInt(taskId.split("-")[2] ?? "-1", 10);
      if (Number.isNaN(idx) || idx < 0) return;
      const items = routineItems(routine);
      if (idx >= items.length) return;
      const cur = items[idx];
      const nextStatus: ItemStatus = cur.status === "completed" ? "pending" : "completed";
      const nextItems = items.map((it, i) =>
        i === idx ? { ...it, status: nextStatus } : it,
      );
      const prevSnapshot = qc.getQueryData<Routine[]>(["routines"]);
      qc.setQueryData<Routine[]>(["routines"], (prev) => {
        if (!prev) return prev;
        return prev.map((r) => (r.id === routine.id ? { ...r, items: nextItems } : r));
      });
      saveRoutineItemsMut.mutate(
        { routineId: routine.id, items: nextItems },
        {
          onError: () => {
            if (prevSnapshot) qc.setQueryData<Routine[]>(["routines"], prevSnapshot);
            else void qc.invalidateQueries({ queryKey: ["routines"] });
          },
        },
      );
    },
    [effectiveRoutine, todaysRoutine, onToggle, qc, saveRoutineItemsMut],
  );

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
      const routine = effectiveRoutine ?? todaysRoutine;
      if (!routine) return;
      const idx = parseInt(taskId.split("-")[2] ?? "-1", 10);
      const params: Record<string, string> = {};
      if (!Number.isNaN(idx) && idx >= 0) params.highlight = String(idx);
      router.push({ pathname: "/routines/[id]", params: { id: String(routine.id), ...params } });
    },
    [effectiveRoutine, todaysRoutine, router],
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
        <LinearGradient
          colors={["rgba(139,92,246,0.28)", "rgba(99,102,241,0.18)", "rgba(236,72,153,0.12)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={mainStyles.heroCard}
        >
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
        </LinearGradient>

        {/* ── Children Strip ────────────────────────────────────────── */}
        {!loadingChildren && children.length > 0 && (
          <ChildrenStrip
            children={children}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
            onPressChild={(id) => router.push({ pathname: "/children/[id]", params: { id: String(id) } } as never)}
            progressByChildId={progressByChildId}
            onManage={() => router.push("/children" as never)}
            onAdd={() => router.push("/children/new" as never)}
          />
        )}

        {/* ── Today's Timeline ──────────────────────────────────────── */}
        <DashboardSectionHeader
          label={t("dashboard.todays_timeline")}
          subtitle={
            nextPendingTask
              ? t("dashboard.timeline_next_up", { task: nextPendingTask.title })
              : timelineProgress.total > 0 && timelineProgress.done >= timelineProgress.total
                ? t("dashboard.day_complete")
                : undefined
          }
          icon="calendar-outline"
          accentColor={brand.violet500}
          rightSlot={
            <TimelineProgressChip done={timelineProgress.done} total={timelineProgress.total} />
          }
        />

        {loadingRoutines || manualRefreshing ? (
          <View style={mainStyles.loaderRow}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : displayTasks.length > 0 ? (
          <RoutineCarousel tasks={displayTasks} onToggle={handleToggle} onPressCard={onPressCard} />
        ) : (
          <View style={mainStyles.emptyWrap}>
            <Text style={[mainStyles.emptyTitle, { color: c.foreground }]}>
              {selectedChild
                ? t("dashboard.no_plan_for_child", { name: selectedChild.name })
                : t("dashboard.no_plan_today")}
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
        <View style={{ marginTop: 24 }}>
          <DashboardSectionHeader label={t("dashboard.at_a_glance")} icon="stats-chart-outline" accentColor={brand.amber400} />
        </View>
        <StreakCard streak={streak} routines={routines} onPress={() => router.push("/progress" as never)} />
        <StatsGrid
          summary={summary}
          loading={loadingSummary || manualRefreshing}
          onPressPlans={() => router.push("/(tabs)/routines" as never)}
          onPressWins={() => router.push("/behavior" as never)}
          onPressSupport={() => router.push("/behavior" as never)}
          onPressChildren={() => router.push("/children" as never)}
        />

        {/* ── Coaching ──────────────────────────────────────────────── */}
        <View style={{ marginTop: 16 }}>
          <DashboardSectionHeader label={t("dashboard.coaching")} icon="sparkles-outline" accentColor={brand.indigo500} />
        </View>
        <AmySuggestionCard
          routines={routines}
          streak={streak}
          onGenerate={goToGenerate}
          onOpenHub={() => router.push("/(tabs)/hub" as never)}
          onViewRewards={() => router.push("/rewards" as never)}
          onViewProgress={() => router.push("/progress" as never)}
        />
        <ParentScoreCard routines={routines} streak={streak} />

        {/* ── Recent Routines ───────────────────────────────────────── */}
        <View style={{ marginTop: 16 }}>
          <DashboardSectionHeader
            label={t("dashboard.recent_routines")}
            actionLabel={t("dashboard.view_all")}
            onAction={() => router.push("/(tabs)/routines" as never)}
            icon="time-outline"
            accentColor={palette.emerald400}
          />
        </View>
        <RecentRoutinesList
          routines={filteredRecentRoutines}
          loading={loadingRecent || manualRefreshing}
          onPress={(id) => router.push({ pathname: "/routines/[id]", params: { id: String(id) } })}
        />

        {/* ── Behavior Highlights ───────────────────────────────────── */}
        <View style={{ marginTop: 16 }}>
          <DashboardSectionHeader
            label={t("dashboard.behavior_highlights")}
            subtitle={t("dashboard.behavior_today_subtitle")}
            actionLabel={t("dashboard.log_behavior")}
            onAction={() => router.push("/behavior" as never)}
            icon="heart-outline"
            accentColor={brand.rose400}
          />
        </View>
        <BehaviorHighlights stats={filteredBehaviorStats} loading={loadingBehavior || manualRefreshing} />

        {/* ── Rewards ───────────────────────────────────────────────── */}
        <View style={{ marginTop: 16 }}>
          <DashboardSectionHeader label={t("dashboard.rewards_points")} icon="medal-outline" accentColor={brand.pink400} />
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
    borderColor: "rgba(168,85,247,0.28)",
    overflow: "hidden",
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
  timelineAccent: { width: 3, height: 13, borderRadius: 2 },
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
