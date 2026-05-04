import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, ACCENT_PINK, palette } from "@/constants/colors";

// ─── Types (mirror server contract on POST /api/smart-study/daily-plan) ──
//
// Inlined intentionally — the server returns a typed envelope but no React
// Query hook is generated for the POST endpoint. Keeping the shape local
// lets us stay strict without dragging the whole study-zone lib (which is
// a server-only dep) into the mobile bundle.

type StudyMode = "play" | "basic" | "advanced";
type Difficulty = "easy" | "medium" | "hard";

interface PlanItem {
  id: string;
  subject: string;
  subjectTitle: string;
  subjectEmoji: string;
  topicId: string;
  topicTitle: string;
  difficulty: Difficulty;
  source: "weak" | "fresh";
  mode: "basic" | "advanced";
}
interface DailyPlan {
  date: string;
  mode: "basic" | "advanced";
  items: PlanItem[];
}
interface DailyPlanResponse {
  child: { id: number; name: string; age: number | null; mode: StudyMode };
  plan: DailyPlan;
  completionPct: number;
  doneTopicIds: string[];
}

type Child = { id: number; name: string; age: number | null; childClass?: string | null };

// ─── Screen ──────────────────────────────────────────────────────────────

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  // 1. Children list (auto-pick if single child)
  const { data: childrenData, isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["children-for-study"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      return r.ok ? r.json() : [];
    },
    staleTime: 60_000,
  });
  const children = useMemo(() => (Array.isArray(childrenData) ? childrenData : []), [childrenData]);
  const activeChildId = selectedChildId ?? (children.length === 1 ? children[0]!.id : null);

  // 2. Daily plan (POST) — fetched as a query so refresh + cache work.
  const dailyKey = ["smart-study-daily-plan", activeChildId] as const;
  const {
    data: planData,
    isLoading: planLoading,
    isFetching: planFetching,
    isError: planErrored,
    refetch: refetchPlan,
  } = useQuery<DailyPlanResponse>({
    queryKey: dailyKey,
    enabled: activeChildId != null,
    queryFn: async () => {
      const res = await authFetch("/api/smart-study/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: activeChildId }),
      });
      if (!res.ok) {
        // Throw so React Query exposes this as an error state — otherwise
        // a failed fetch would be treated as "still loading" forever.
        throw new Error(`daily_plan_failed_${res.status}`);
      }
      return (await res.json()) as DailyPlanResponse;
    },
    staleTime: 30_000,
    retry: 1,
  });

  const doneSet = useMemo(
    () => new Set<string>(planData?.doneTopicIds ?? []),
    [planData?.doneTopicIds],
  );

  // 3. Mark a topic done (correct=true) — optimistic, then re-fetch.
  const markMutation = useMutation({
    mutationFn: async (item: PlanItem) => {
      // Defensive: a child must be active before any attempt is posted.
      if (activeChildId == null) throw new Error("no_active_child");
      const res = await authFetch("/api/smart-study/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: activeChildId,
          subject: item.subject,
          topicId: item.topicId,
          correct: true,
          ts: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("attempt_failed");
      return res.json();
    },
    onMutate: async (item: PlanItem) => {
      await qc.cancelQueries({ queryKey: dailyKey });
      const prev = qc.getQueryData<DailyPlanResponse | null>(dailyKey);
      if (prev) {
        const next = {
          ...prev,
          doneTopicIds: Array.from(new Set([...prev.doneTopicIds, item.topicId])),
        };
        // Recompute completion% locally so the bar moves immediately.
        const totalItems = prev.plan.items.length;
        const doneItems = prev.plan.items.filter((it) =>
          new Set(next.doneTopicIds).has(it.topicId),
        ).length;
        next.completionPct = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);
        qc.setQueryData(dailyKey, next);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { prev };
    },
    onError: (_err, _item, ctx) => {
      if (ctx?.prev) qc.setQueryData(dailyKey, ctx.prev);
    },
    onSettled: () => {
      void refetchPlan();
    },
  });

  const onRefresh = useCallback(() => {
    void refetchPlan();
  }, [refetchPlan]);

  // ─── Header (always rendered) ────────────────────────────────────────

  const renderHeader = (subtitle: string) => (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        style={styles.backBtn}
        accessibilityLabel={t("screens.study.back")}
      >
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </Pressable>
      <LinearGradient
        colors={[brand.primary, ACCENT_PINK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerIcon}
      >
        <Ionicons name="school" size={22} color="#fff" />
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t("screens.study.title")}
        </Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>
  );

  // ─── Branches ────────────────────────────────────────────────────────

  // Loading children
  if (childrenLoading) {
    return (
      <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
        <View style={[styles.safe, { paddingTop: insets.top + 12 }]}>
          {renderHeader(t("screens.study.pick_child_subtitle"))}
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
          </View>
        </View>
      </LinearGradient>
    );
  }

  // No children
  if (children.length === 0) {
    return (
      <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
        <View style={[styles.safe, { paddingTop: insets.top + 12 }]}>
          {renderHeader(t("screens.study.pick_child_subtitle"))}
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>{t("screens.study.no_children_title")}</Text>
            <Text style={styles.emptyDesc}>{t("screens.study.no_children_desc")}</Text>
            <Pressable
              onPress={() => router.push("/(tabs)/children" as never)}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>{t("screens.study.add_child_btn")}</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Multiple children & none selected — picker
  if (activeChildId == null) {
    return (
      <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
        <View style={[styles.safe, { paddingTop: insets.top + 12 }]}>
          {renderHeader(t("screens.study.pick_child_subtitle"))}
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {children.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setSelectedChildId(c.id)}
                style={({ pressed }) => [styles.childRow, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.childAvatar}>
                  <Text style={styles.childAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.childName}>{c.name}</Text>
                  <Text style={styles.childMeta}>
                    {c.childClass
                      ? t("screens.study.child_meta_class", {
                          age: c.age ?? "—",
                          cls: c.childClass,
                          title: "",
                        })
                      : t("screens.study.child_meta", { age: c.age ?? "—", title: "" })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>
    );
  }

  // Plan errored — show retry instead of an infinite spinner so the
  // parent can recover from a transient 500 / 401 / 404.
  if (planErrored) {
    return (
      <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
        <View style={[styles.safe, { paddingTop: insets.top + 12 }]}>
          {renderHeader(t("screens.study.todays_plan"))}
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>{t("screens.study.alert_title")}</Text>
            <Pressable onPress={() => refetchPlan()} style={styles.cta}>
              <Text style={styles.ctaText}>{t("screens.study.try_again")}</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Plan loading
  if (planLoading || !planData) {
    return (
      <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
        <View style={[styles.safe, { paddingTop: insets.top + 12 }]}>
          {renderHeader(t("screens.study.todays_plan"))}
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
          </View>
        </View>
      </LinearGradient>
    );
  }

  // ─── Main: plan view ────────────────────────────────────────────────

  const { child, plan, completionPct } = planData;
  const totalItems = plan.items.length;
  const doneItems = plan.items.filter((it) => doneSet.has(it.topicId)).length;
  const subtitle = `${child.name} · ${labelForMode(child.mode, t)}`;

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      <View style={[styles.safe, { paddingTop: insets.top + 12 }]}>
        {renderHeader(subtitle)}
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={planFetching}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
        >
          {/* Spelling Mastery quick-access banner */}
          <Pressable
            onPress={() => router.push("/spelling" as never)}
            style={({ pressed }) => [styles.spellingBanner, pressed && { opacity: 0.85 }]}
          >
            <Text style={{ fontSize: 22 }}>🔤</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.spellingBannerTitle}>Spelling Mastery</Text>
              <Text style={styles.spellingBannerSub}>Learn, practice & compete</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={brand.primary} />
          </Pressable>

          {/* Completion card */}
          <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionTitle}>{t("screens.study.todays_plan")}</Text>
              <Text style={styles.completionPct}>
                {t("screens.study.plan_completion", { pct: completionPct })}
              </Text>
            </View>
            <Text style={styles.completionSubtitle}>
              {t("screens.study.todays_plan_subtitle", { name: child.name })}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${completionPct}%` }]} />
            </View>
            {totalItems > 0 ? (
              <Text style={styles.progressMeta}>
                {t("screens.study.done_count", { done: doneItems, total: totalItems })}
              </Text>
            ) : null}
          </View>

          {/* Empty plan (e.g. play mode where adaptive engine returns no items) */}
          {totalItems === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t("screens.study.todays_plan_empty")}</Text>
            </View>
          ) : (
            plan.items.map((item) => {
              const done = doneSet.has(item.topicId);
              return (
                <PlanItemCard
                  key={item.id}
                  item={item}
                  done={done}
                  busy={markMutation.isPending}
                  onMarkDone={() => markMutation.mutate(item)}
                  t={t}
                />
              );
            })
          )}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

// ─── Plan item card ────────────────────────────────────────────────────

function PlanItemCard({
  item,
  done,
  busy,
  onMarkDone,
  t,
}: {
  item: PlanItem;
  done: boolean;
  busy: boolean;
  onMarkDone: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const diffKey =
    item.difficulty === "easy"
      ? "screens.study.plan_difficulty_easy"
      : item.difficulty === "medium"
        ? "screens.study.plan_difficulty_medium"
        : "screens.study.plan_difficulty_hard";
  const sourceKey =
    item.source === "weak"
      ? "screens.study.plan_source_weak"
      : "screens.study.plan_source_fresh";

  return (
    <View style={[styles.itemCard, done && styles.itemCardDone]}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemEmoji}>{item.subjectEmoji}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.itemSubject} numberOfLines={1}>
            {item.subjectTitle}
          </Text>
          <Text style={styles.itemTopic} numberOfLines={2}>
            {item.topicTitle}
          </Text>
        </View>
        {done ? (
          <Ionicons name="checkmark-circle" size={28} color={palette.green400} />
        ) : null}
      </View>
      <View style={styles.pillRow}>
        <View
          style={[
            styles.pill,
            item.difficulty === "easy"
              ? styles.pillEasy
              : item.difficulty === "medium"
                ? styles.pillMedium
                : styles.pillHard,
          ]}
        >
          <Text style={styles.pillText}>{t(diffKey)}</Text>
        </View>
        <View
          style={[styles.pill, item.source === "weak" ? styles.pillWeak : styles.pillFresh]}
        >
          <Text style={styles.pillText}>{t(sourceKey)}</Text>
        </View>
      </View>
      {!done ? (
        <Pressable
          onPress={onMarkDone}
          disabled={busy}
          style={({ pressed }) => [
            styles.itemAction,
            pressed && { opacity: 0.85 },
            busy && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
          <Text style={styles.itemActionText}>{t("screens.study.plan_open")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function labelForMode(
  mode: StudyMode,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  // Reuse the mode names already present in i18n if available, else fall back
  // to plain English — keeps the screen working even on locales where these
  // particular keys haven't been added yet.
  if (mode === "play") return t("screens.study.title");
  if (mode === "basic") return "Basic";
  return "Advanced";
}

// ─── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyDesc: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },
  cta: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 999,
  },
  ctaText: { color: brand.primary, fontWeight: "800" },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  childAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  childAvatarText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  childName: { color: "#fff", fontWeight: "700", fontSize: 15 },
  childMeta: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  completionCard: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 14,
  },
  completionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  completionTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  completionPct: { color: "#fff", fontWeight: "800", fontSize: 16 },
  completionSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4 },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: { height: "100%", backgroundColor: palette.green400 },
  progressMeta: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 6 },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
  },
  itemCard: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  itemCardDone: { opacity: 0.7 },
  itemHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemEmoji: { fontSize: 26 },
  itemSubject: { color: "#fff", fontWeight: "800", fontSize: 14 },
  itemTopic: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 2 },
  pillRow: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillEasy: { backgroundColor: "rgba(52,211,153,0.25)" },
  pillMedium: { backgroundColor: "rgba(251,191,36,0.25)" },
  pillHard: { backgroundColor: "rgba(248,113,113,0.25)" },
  pillWeak: { backgroundColor: "rgba(244,114,182,0.25)" },
  pillFresh: { backgroundColor: "rgba(96,165,250,0.25)" },
  pillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  itemAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: brand.primary,
  },
  itemActionText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  spellingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.35)",
  },
  spellingBannerTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  spellingBannerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
});
