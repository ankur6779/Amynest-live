import React, { useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Platform, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { useUser } from "@/lib/firebase-auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { ProfileLockScreen } from "@/components/ProfileLockScreen";
import RoutineCarousel from "@/components/RoutineCarousel";
import type { RoutineTask } from "@/contexts/ProgressContext";
import { brand } from "@/constants/colors";

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
};

const CATEGORY_ICONS: Record<string, string> = {
  morning: "sunny", morning_routine: "sunny",
  meal: "restaurant", tiffin: "fast-food",
  school: "school", travel: "car",
  homework: "book", study: "book",
  play: "football", exercise: "fitness",
  family: "heart", bonding: "people",
  creative: "color-palette", outdoor: "leaf",
  self_care: "sparkles", hygiene: "water",
  rest: "pause-circle", "wind-down": "moon",
  sleep: "moon", screen: "tv",
  default: "ellipse-outline",
};

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

export default function DashboardScreen() {
  const { user } = useUser();
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

  const {
    data: routines = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Routine[]>({
    queryKey: ["routines"],
    queryFn: () =>
      authFetch("/api/routines").then((r) =>
        r.ok ? (r.json() as Promise<Routine[]>) : ([] as Routine[]),
      ),
    enabled: !!profileComplete,
  });

  const todaysRoutine = useMemo<Routine | null>(() => {
    return (
      routines.find((r) => (r.date ?? "").slice(0, 10) === todayStr) ?? null
    );
  }, [routines, todayStr]);

  const tasks = useMemo<RoutineTask[]>(() => {
    if (!todaysRoutine) return [];
    return todaysRoutine.items.map((it, idx) => ({
      id: `t-${todaysRoutine.id}-${idx}`,
      title: it.activity,
      time: it.time,
      minutes: it.duration ?? 30,
      icon:
        CATEGORY_ICONS[(it.category ?? "").toLowerCase()] ??
        CATEGORY_ICONS.default,
      done: it.status === "completed",
      ageBand: it.ageBand,
    }));
  }, [todaysRoutine]);

  const saveMut = useMutation({
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

  const onToggle = useCallback(
    (taskId: string) => {
      if (!todaysRoutine) return;
      const idx = parseInt(taskId.split("-")[2] ?? "-1", 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= todaysRoutine.items.length) return;
      const cur = todaysRoutine.items[idx];
      const nextStatus: ItemStatus =
        cur.status === "completed" ? "pending" : "completed";
      const nextItems = todaysRoutine.items.map((it, i) =>
        i === idx ? { ...it, status: nextStatus } : it,
      );
      const prevSnapshot = qc.getQueryData<Routine[]>(["routines"]);
      qc.setQueryData<Routine[]>(["routines"], (prev) => {
        if (!prev) return prev;
        return prev.map((r) =>
          r.id === todaysRoutine.id ? { ...r, items: nextItems } : r,
        );
      });
      saveMut.mutate(
        { routineId: todaysRoutine.id, items: nextItems },
        {
          onError: () => {
            // Roll back the optimistic update so the UI reflects server state
            if (prevSnapshot) {
              qc.setQueryData<Routine[]>(["routines"], prevSnapshot);
            } else {
              qc.invalidateQueries({ queryKey: ["routines"] });
            }
          },
        },
      );
    },
    [todaysRoutine, qc, saveMut],
  );

  if (profileLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!profileComplete) {
    return <ProfileLockScreen sectionName="Dashboard" />;
  }

  const displayName = user?.firstName ?? "";
  const topPad = insets.top + (Platform.OS === "web" ? 16 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 16 : 0);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: botPad + 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={c.primary}
          />
        }
      >
        <View style={styles.headerWrap}>
          <Text style={[styles.eyebrow, { color: c.mutedForeground }]}>
            {t(getGreetingKey()).toUpperCase()}
          </Text>
          <Text style={[styles.title, { color: c.foreground }]}>
            👋{" "}
            {displayName
              ? t("dashboard.greeting_with_name", { name: displayName })
              : t("dashboard.greeting_no_name")}
          </Text>
          <Text style={[styles.sub, { color: c.mutedForeground }]}>
            {todaysRoutine
              ? `${t("dashboard.planned_for_you")} ❤️`
              : `${t("dashboard.setup_first")} 🌟`}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={16} color={c.foreground} />
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>
            {t("dashboard.todays_timeline")}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : tasks.length > 0 ? (
          <RoutineCarousel tasks={tasks} onToggle={onToggle} />
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: c.foreground }]}>
              {t("dashboard.no_plan_today")}
            </Text>
            <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
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
                colors={[brand.violet600, "#EC4899"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyCta}
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={styles.emptyCtaText}>
                  {t("dashboard.generate_today")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerWrap: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13.5,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  loaderRow: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyWrap: {
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(127,127,127,0.2)",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    fontWeight: "500",
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyCtaText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});
