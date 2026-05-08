import React, {  useCallback, useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, ViewStyle, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useSubscriptionStore, selectIsPremium } from "@/store/useSubscriptionStore";
import LockedBlock from "@/components/LockedBlock";
import * as Haptics from "expo-haptics";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { ProfileLockScreen } from "@/components/ProfileLockScreen";
import FuturePredictor from "@/components/FuturePredictor";
import AiMealGenerator from "@/components/AiMealGenerator";
import { DailySignalLogger } from "@/components/intelligence/DailySignalLogger";
import colors, { brand, palette } from "@/constants/colors";
import { useTranslation } from "react-i18next";


type RoutineItem = {
  time: string; activity: string; duration: number;
  category: string; status?: string;
};
type Routine = {
  id: number; childId: number; childName: string;
  date: string; title: string; items: RoutineItem[];
  createdAt: string;
};
type Child = { id: number; name: string };

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d;
}
function formatYMD(date: Date): string {
  // Use LOCAL date components (YYYY-MM-DD) so calendar cells map to the user's
  // calendar day, not UTC. Using toISOString() shifts dates by ±1 for users
  // east/west of UTC and was the source of "click date X opens day X-1" bug.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function formatRelative(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function completionPct(items: RoutineItem[]): number {
  if (!items.length) return 0;
  return Math.round(items.filter(i => i.status === "completed").length / items.length * 100);
}

export default function RoutinesScreen() {
  const { t } = useTranslation();
  const { profileComplete, isLoading: profileLoading } = useProfileComplete();
  const { theme } = useTheme();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const isPremium = useSubscriptionStore(selectIsPremium);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: () => authFetch("/api/children").then(r => r.json() as Promise<Child[]>),
  });

  const { data: routines = [], isLoading, isError, refetch } = useQuery<Routine[]>({
    queryKey: ["routines", selectedChild],
    queryFn: () => {
      const q = selectedChild ? `?childId=${selectedChild}` : "";
      return authFetch(`/api/routines${q}`).then(r => r.json() as Promise<Routine[]>);
    },
  });

  const effectiveChildId = selectedChild ?? children[0]?.id ?? null;

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  const topPad = insets.top + (Platform.OS === "web" ? 16 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 16 : 0);

  const todayStr = formatYMD(new Date());
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const routinesByDate = useMemo(() => {
    const m = new Map<string, Routine[]>();
    routines.forEach((r) => {
      const key = r.date.slice(0, 10);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    });
    return m;
  }, [routines]);

  const weekRoutines = useMemo(
    () => days.flatMap((d) => routinesByDate.get(formatYMD(d)) ?? []),
    [days, routinesByDate],
  );
  const weekItems = weekRoutines.flatMap((r) => r.items);
  const weekCompleted = weekItems.filter((i) => i.status === "completed").length;
  const weekTotal = weekItems.length;
  const weekPct = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

  const weekLabel = (() => {
    const start = days[0]; const end = days[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString(undefined, { month: "long" })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  })();

  type FilterItem = { id: number | null; name: string };
  const filterData: FilterItem[] = [{ id: null, name: "All Children" }, ...children.map(c => ({ id: c.id, name: c.name }))];

  const routinesMax = useSubscriptionStore((s) => s.entitlements?.limits.routinesMax ?? 1);
  const lockedRoutineIds = useMemo<Set<number>>(
    () => isPremium ? new Set() : new Set(routines.slice(routinesMax).map((r) => r.id)),
    [isPremium, routines, routinesMax],
  );
  const isRoutineLocked = useCallback(
    (routineId: number) => !isPremium && lockedRoutineIds.has(routineId),
    [isPremium, lockedRoutineIds],
  );

  const goToGenerate = () => {
    if (!isPremium && routines.length >= routinesMax) {
      router.push({ pathname: "/paywall", params: { reason: "routines_limit" } });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const qs = selectedChild ? `?childId=${selectedChild}` : "";
    router.push(`/routines/generate${qs}` as never);
  };

  if (profileLoading) {
    return (
      <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </LinearGradient>
    );
  }

  if (!profileComplete) {
    return <ProfileLockScreen sectionName="Routines" />;
  }

  return (
    <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.eyebrowRow}>
              <Ionicons name="sparkles" size={11} color={brand.purple500} />
              <Text style={styles.eyebrow}>{t("screens.tabs_routines.your_day_planned")}</Text>
            </View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t("screens.tabs_routines.routines")}</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{t("screens.tabs_routines.daily_schedules_generated_by_ai")}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push("/routines/premium" as never)}
              activeOpacity={0.85}
              style={styles.premiumBtn}
              testID="open-premium-routines"
              accessibilityRole="button"
              accessibilityLabel={t("screens.tabs_routines.open_premium_routines_view")}
            >
              <Ionicons name="star" size={14} color={palette.yellow400} />
              <Text style={styles.premiumBtnText}>{t("screens.tabs_routines.premium")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToGenerate} activeOpacity={0.85}>
              <LinearGradient
                colors={[brand.violet600, brand.pink500]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.genBtn}
              >
                <Ionicons name="sparkles" size={14} color="#fff" />
                <Text style={styles.genBtnText}>{t("screens.tabs_routines.generate")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* View Toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.muted }]}>
          {(["calendar", "list"] as const).map((v) => {
            const active = view === v;
            return (
              <TouchableOpacity
                key={v} onPress={() => setView(v)}
                style={[styles.toggleBtn, active && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }]}
              >
                <Ionicons name={v === "calendar" ? "calendar" : "list"} size={14} color={active ? colors.foreground : colors.mutedForeground} />
                <Text style={[styles.toggleText, { color: active ? colors.foreground : colors.mutedForeground }]}>
                  {v === "calendar" ? "Calendar" : "All Routines"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Child filter */}
        {children.length > 0 && (
          <FlatList
            horizontal
            data={filterData}
            keyExtractor={c => String(c.id ?? "all")}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginBottom: 12 }}
            style={{ marginHorizontal: -20 }}
            renderItem={({ item: c }) => {
              const active = c.id === null ? selectedChild === null : selectedChild === c.id;
              return (
                <TouchableOpacity
                  style={[styles.filterChip, {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  }]}
                  onPress={() => setSelectedChild(c.id ?? null)}
                >
                  <Text style={[styles.filterChipText, { color: active ? "#fff" : colors.foreground }]}>{c.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* 🔮 Future Predictor — before tasks */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <FuturePredictor childId={effectiveChildId} variant="compact" />
        </View>

        {/* 🍱 Meal Suggestions — surfaced here so meal planning flows naturally
            with the daily routine. Previously this lived in Parent Hub. */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <AiMealGenerator />
        </View>

        {effectiveChildId != null && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <DailySignalLogger childId={effectiveChildId} />
          </View>
        )}

        {/* Loading / Error / Empty */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t("screens.tabs_routines.failed_to_load_routines")}</Text>
            <TouchableOpacity onPress={() => refetch()} style={[styles.retryBtn, { borderColor: colors.primary }]}>
              <Text style={[styles.retryText, { color: colors.primary }]}>{t("screens.tabs_routines.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : view === "calendar" ? (
          <View style={[styles.calCard, { backgroundColor: colors.card }]}>
            {/* Week navigator */}
            <View style={styles.weekNav}>
              <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, -7))} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={[styles.weekLabel, { color: colors.foreground }]}>{weekLabel}</Text>
                {weekTotal > 0 && (
                  <Text style={[styles.weekStats, { color: colors.mutedForeground }]}>
                    {weekCompleted}/{weekTotal} tasks done · {weekPct}%
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, 7))} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Day grid */}
            <View style={styles.dayGrid}>
              {days.map((day, i) => {
                const dateStr = formatYMD(day);
                const dayRoutines = routinesByDate.get(dateStr) ?? [];
                const isToday = dateStr === todayStr;
                const isWeekend = i >= 5;
                const dayItems = dayRoutines.flatMap((r) => r.items);
                const dayTotal = dayItems.length;
                const dayDone = dayItems.filter((ii) => ii.status === "completed").length;
                const dayPct = dayTotal > 0 ? Math.round((dayDone / dayTotal) * 100) : 0;

                let dayBg = colors.card;
                let dayBorder = colors.border;
                let dayText = colors.foreground;
                if (isToday) {
                  dayBg = colors.primary; dayBorder = colors.primary; dayText = "#fff";
                } else if (dayRoutines.length > 0) {
                  dayBg = "rgba(34,197,94,0.18)"; dayBorder = "rgba(34,197,94,0.45)"; dayText = palette.green200;
                } else if (isWeekend) {
                  dayBg = colors.muted; dayBorder = colors.border; dayText = colors.mutedForeground;
                }

                return (
                  <TouchableOpacity
                    key={dateStr}
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (dayRoutines.length === 0) {
                        // Empty day → jump to generator with this date pre-selected
                        if (!isPremium && routines.length >= routinesMax) {
                          router.push({ pathname: "/paywall", params: { reason: "routines_limit" } });
                          return;
                        }
                        const params: Record<string, string> = { date: dateStr };
                        if (selectedChild) params.childId = String(selectedChild);
                        router.push({ pathname: "/routines/generate", params } as never);
                      } else if (dayRoutines.length === 1) {
                        if (isRoutineLocked(dayRoutines[0].id)) {
                          router.push({ pathname: "/paywall", params: { reason: "routines_limit" } });
                        } else {
                          router.push(`/routines/${dayRoutines[0].id}` as never);
                        }
                      } else {
                        // Multi-routine day → open the first unlocked one
                        const firstOpen = dayRoutines.find((r) => !isRoutineLocked(r.id)) ?? dayRoutines[0];
                        if (isRoutineLocked(firstOpen.id)) {
                          router.push({ pathname: "/paywall", params: { reason: "routines_limit" } });
                        } else {
                          router.push(`/routines/${firstOpen.id}` as never);
                        }
                      }
                    }}
                    style={[styles.dayCell, { backgroundColor: dayBg, borderColor: dayBorder }]}
                  >
                    <Text style={[styles.dayName, { color: isToday ? "rgba(255,255,255,0.85)" : colors.mutedForeground }]}>
                      {DAY_NAMES[i]}
                    </Text>
                    <Text style={[styles.dayNum, { color: dayText }]}>{day.getDate()}</Text>
                    {dayRoutines.length > 0 ? (
                      <View style={{ width: "100%", alignItems: "center", gap: 2 }}>
                        <View style={[styles.dayBar, { backgroundColor: isToday ? "rgba(255,255,255,0.25)" : "rgba(34,197,94,0.2)" }]}>
                          <View style={{ height: "100%", width: `${dayPct}%`, backgroundColor: isToday ? "rgba(255,255,255,0.7)" : palette.green500, borderRadius: 2 }} />
                        </View>
                        <Text style={[styles.dayPctText, { color: isToday ? "rgba(255,255,255,0.85)" : palette.green600 }]}>
                          {dayRoutines.length > 1 ? `${dayRoutines.length}×` : `${dayPct}%`}
                        </Text>
                      </View>
                    ) : isWeekend ? (
                      <Text style={{ fontSize: 11 }}>🏖️</Text>
                    ) : (
                      <Text style={[styles.dayPctText, { color: colors.mutedForeground, opacity: 0.5 }]}>{t("screens.tabs_routines.add")}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* This week's routines */}
            {weekRoutines.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.weekRoutinesHdr, { color: colors.mutedForeground }]}>{t("screens.tabs_routines.this_week_s_routines")}</Text>
                <View style={{ gap: 8 }}>
                  {weekRoutines.map((r) => {
                    const items = r.items;
                    const done = items.filter((i) => i.status === "completed").length;
                    const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
                    const locked = isRoutineLocked(r.id);
                    return (
                      <LockedBlock key={r.id} locked={locked} reason="routines_limit">
                        <TouchableOpacity
                          onPress={() => {
                            if (!locked) router.push(`/routines/${r.id}` as never);
                          }}
                          style={[styles.weekRoutineCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.weekRoutineTitle, { color: colors.foreground }]} numberOfLines={1}>{r.title}</Text>
                            <Text style={[styles.weekRoutineSub, { color: colors.mutedForeground }]}>
                              {r.childName} · {formatRelative(r.date.slice(0, 10))}
                            </Text>
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={[styles.weekRoutinePct, { color: colors.foreground }]}>{pct}%</Text>
                            <Text style={[styles.weekRoutineDone, { color: colors.mutedForeground }]}>{done}/{items.length}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      </LockedBlock>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ) : routines.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("screens.tabs_routines.no_routines_yet")}</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Let AI build a perfect day for your child based on their goals and school times.
            </Text>
            <TouchableOpacity onPress={goToGenerate} activeOpacity={0.85} style={{ marginTop: 16 }}>
              <LinearGradient
                colors={[brand.violet600, brand.pink500]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.bigCta}
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={styles.bigCtaText}>{t("screens.tabs_routines.generate_first_routine")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12, paddingHorizontal: 20 }}>
            {routines.map((r) => {
              const pct = completionPct(r.items);
              const isToday = r.date.slice(0, 10) === todayStr;
              const isLocked = isRoutineLocked(r.id);
              const progressFill: ViewStyle = {
                height: "100%", borderRadius: 2,
                width: `${pct}%`, backgroundColor: palette.emerald500,
              };
              return (
                <LockedBlock
                  key={r.id}
                  locked={isLocked}
                  reason="routines_limit"
                  radius={18}
                >
                  <TouchableOpacity
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push(`/routines/${r.id}` as never)}
                  >
                    <View style={styles.cardTop}>
                      <View style={[styles.dateBadge, { backgroundColor: isToday ? colors.primary : colors.secondary }]}>
                        <Text style={[styles.dateBadgeText, { color: isToday ? "#fff" : colors.primary }]}>
                          {formatRelative(r.date.slice(0, 10))}
                        </Text>
                      </View>
                      <Text style={[styles.childTag, { color: colors.mutedForeground }]}>{r.childName}</Text>
                    </View>
                    <Text style={[styles.routineTitle, { color: colors.foreground }]} numberOfLines={2}>{r.title}</Text>
                    <View style={styles.cardBottom}>
                      <View style={styles.metaRow}>
                        <Ionicons name="list-outline" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{r.items.length} activities</Text>
                      </View>
                      {pct > 0 && (
                        <View style={styles.progressRow}>
                          <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                            <View style={progressFill} />
                          </View>
                          <Text style={[styles.pctText, { color: palette.emerald500 }]}>{pct}%</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </LockedBlock>
              );
            })}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 14, gap: 12 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  eyebrow: {
    fontSize: 10.5,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: 1.4,
    color: brand.purple500,
  },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", fontWeight: "800", letterSpacing: -0.4 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  genBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  genBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  premiumBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: "rgba(250,204,21,0.12)", borderWidth: 1, borderColor: "rgba(250,204,21,0.35)" },
  premiumBtnText: { color: palette.yellow400, fontSize: 13, fontFamily: "Inter_700Bold" },

  toggleRow: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, padding: 4, borderRadius: 16, gap: 4 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 12 },
  toggleText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60, paddingHorizontal: 32 },
  emptyBox: { marginHorizontal: 20, padding: 32, borderRadius: 24, borderWidth: 2, borderStyle: "dashed", alignItems: "center" },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  bigCta: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999 },
  bigCtaText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },

  // Calendar
  calCard: { marginHorizontal: 20, padding: 16, borderRadius: 24 },
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  navBtn: { width: 36, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  weekLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  weekStats: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  dayGrid: { flexDirection: "row", gap: 4 },
  dayCell: {
    flex: 1, alignItems: "center", justifyContent: "space-between",
    padding: 6, borderRadius: 14, borderWidth: 2,
    minHeight: 76, gap: 2,
  },
  dayName: { fontSize: 9, fontFamily: "Inter_700Bold" },
  dayNum: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 18 },
  dayBar: { width: "100%", height: 3, borderRadius: 2, overflow: "hidden" },
  dayPctText: { fontSize: 9, fontFamily: "Inter_700Bold" },

  weekRoutinesHdr: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.6, marginBottom: 8 },
  weekRoutineCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  weekRoutineTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  weekRoutineSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  weekRoutinePct: { fontSize: 13, fontFamily: "Inter_700Bold" },
  weekRoutineDone: { fontSize: 10, fontFamily: "Inter_400Regular" },

  // List card
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  dateBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  childTag: { fontSize: 12, fontFamily: "Inter_500Medium" },
  routineTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  cardBottom: { gap: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  pctText: { fontSize: 12, fontFamily: "Inter_700Bold", width: 32 },
});
