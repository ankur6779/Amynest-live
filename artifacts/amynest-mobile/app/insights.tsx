import React, { useState } from "react";
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
import { useRouter, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, ACCENT_PINK } from "@/constants/colors";

type Range = "week" | "month";

type InsightsResponse = {
  range: Range;
  generatedAt: string;
  hasChildren: boolean;
  hasActivity: boolean;
  emptyReason: "no_children" | "no_activity" | null;
  summary: {
    routinesThisPeriod: number;
    routinesPreviousPeriod: number;
    routinesChangePct: number;
    behaviorsThisPeriod: number;
    behaviorsPreviousPeriod: number;
    positiveRateThisPeriod: number;
    positiveRatePreviousPeriod: number;
    positiveRateChangePts: number;
  };
  perChild: Array<{
    childId: number;
    childName: string;
    routinesCount: number;
    behaviorsCount: number;
    positiveCount: number;
    positiveRate: number;
    routineCompletionRate: number;
    topCategory: string | null;
    milestoneCount: number;
    activeDays: number;
    morningCount: number;
    eveningCount: number;
    categoryVariety: number;
  }>;
  siblingHighlights: Array<{
    childId: number;
    childName: string;
    headline: string;
    detail: string;
    icon:
      | "calendar"
      | "happy"
      | "heart"
      | "trophy"
      | "color-palette"
      | "flame"
      | "sunny"
      | "moon"
      | "sparkles";
    accent: string;
  }>;
  activityMix: Array<{ category: string; count: number }>;
  dayOfWeek: Array<{ day: string; count: number }>;
  timeOfDay: { morning: number; afternoon: number; evening: number };
  behaviorTypes: { positive: number; negative: number; neutral: number; milestone: number };
};

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { theme } = useTheme();
  const [range, setRange] = useState<Range>("week");

  const { data, isLoading, refetch, isRefetching } = useQuery<InsightsResponse>({
    queryKey: ["dashboard-insights", range],
    queryFn: async () => {
      const r = await authFetch(`/api/dashboard/insights?range=${range}`);
      if (!r.ok) throw new Error(`insights ${r.status}`);
      return r.json();
    },
  });

  const periodLabel = range === "week" ? "this week" : "this month";
  const previousLabel = range === "week" ? "last week" : "last month";

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <LinearGradient
          colors={[brand.purple500, brand.pink500]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerIcon}
        >
          <Ionicons name="analytics" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Parent Insights</Text>
          <Text style={styles.headerSubtitle}>How your family is doing</Text>
        </View>
      </View>

      <View style={styles.toggleRow}>
        {(["week", "month"] as Range[]).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            style={[styles.togglePill, range === r && styles.togglePillActive]}
          >
            <Text
              style={[styles.toggleText, range === r && styles.toggleTextActive]}
            >
              {r === "week" ? "Last 7 days" : "Last 30 days"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={ACCENT_PINK}
          />
        }
      >
        {isLoading && !data && (
          <ActivityIndicator color={ACCENT_PINK} style={{ marginTop: 40 }} />
        )}

        {data && !data.hasChildren && (
          <EmptyState
            title="Insights are warming up"
            text="Add your first child and log a few routines or moments — Amy needs a little data before she can spot patterns."
            ctaLabel="Add a child"
            onCta={() => router.push("/(tabs)/children")}
          />
        )}

        {data && data.hasChildren && !data.hasActivity && (
          <EmptyState
            title="Nothing to show yet for this period"
            text="Try the longer range, or log a routine or behaviour moment so Amy has fresh data to work with."
            ctaLabel="Plan a routine"
            onCta={() => router.push("/(tabs)/routines")}
          />
        )}

        {data && data.hasActivity && (
          <>
            <DeltaCard
              icon="calendar-outline"
              color="#34D399"
              label={`Routines ${periodLabel}`}
              value={data.summary.routinesThisPeriod}
              previousValue={data.summary.routinesPreviousPeriod}
              previousLabel={previousLabel}
              changePct={data.summary.routinesChangePct}
            />
            <DeltaCard
              icon="happy-outline"
              color="#FBBF24"
              label={`Moments logged ${periodLabel}`}
              value={data.summary.behaviorsThisPeriod}
              previousValue={data.summary.behaviorsPreviousPeriod}
              previousLabel={previousLabel}
              changePct={null}
            />
            <DeltaCard
              icon="heart-outline"
              color={ACCENT_PINK}
              label="Positive moments rate"
              value={`${data.summary.positiveRateThisPeriod}%`}
              previousValue={`${data.summary.positiveRatePreviousPeriod}%`}
              previousLabel={previousLabel}
              changePct={null}
              changePts={data.summary.positiveRateChangePts}
            />

            {data.siblingHighlights.length >= 2 && (
              <Section title="Family strengths">
                <Text style={styles.familyIntro}>
                  Each child shines somewhere different. Here's what stood out
                  this period.
                </Text>
                {data.siblingHighlights.map((h) => (
                  <View
                    key={h.childId}
                    style={[styles.highlightCard, { borderColor: h.accent + "55" }]}
                  >
                    <View
                      style={[
                        styles.highlightIcon,
                        { backgroundColor: h.accent + "22" },
                      ]}
                    >
                      <Ionicons
                        name={`${h.icon}-outline` as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={h.accent}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.highlightName}>{h.childName}</Text>
                      <Text style={[styles.highlightHeadline, { color: h.accent }]}>
                        {h.headline}
                      </Text>
                      <Text style={styles.highlightDetail}>{h.detail}</Text>
                    </View>
                  </View>
                ))}
              </Section>
            )}

            {data.perChild.length > 0 && (
              <Section title="Per child">
                {data.perChild.map((c) => {
                  const subline: string[] = [];
                  if (c.routineCompletionRate > 0) {
                    subline.push(`${c.routineCompletionRate}% routine done`);
                  }
                  if (c.topCategory) {
                    subline.push(`Top: ${c.topCategory}`);
                  }
                  if (c.milestoneCount > 0) {
                    subline.push(
                      `${c.milestoneCount} milestone${c.milestoneCount === 1 ? "" : "s"}`,
                    );
                  }
                  return (
                    <View key={c.childId} style={styles.childRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.childName}>{c.childName}</Text>
                        <Text style={styles.childMeta}>
                          {c.routinesCount} routine{c.routinesCount === 1 ? "" : "s"} ·{" "}
                          {c.behaviorsCount} moment{c.behaviorsCount === 1 ? "" : "s"}
                        </Text>
                        {subline.length > 0 && (
                          <Text style={styles.childSubline}>{subline.join(" · ")}</Text>
                        )}
                      </View>
                      <View style={styles.childBadge}>
                        <Text style={styles.childBadgeValue}>{c.positiveRate}%</Text>
                        <Text style={styles.childBadgeLabel}>positive</Text>
                      </View>
                    </View>
                  );
                })}
              </Section>
            )}

            <Section title="When activities happen">
              <BarRow
                label="Morning"
                value={data.timeOfDay.morning}
                max={timeOfDayMax(data.timeOfDay)}
                color="#FBBF24"
              />
              <BarRow
                label="Afternoon"
                value={data.timeOfDay.afternoon}
                max={timeOfDayMax(data.timeOfDay)}
                color="#34D399"
              />
              <BarRow
                label="Evening"
                value={data.timeOfDay.evening}
                max={timeOfDayMax(data.timeOfDay)}
                color="#8B5CF6"
              />
            </Section>

            {data.activityMix.length > 0 && (
              <Section title="Most-planned activities">
                {data.activityMix.map((a) => (
                  <BarRow
                    key={a.category}
                    label={a.category}
                    value={a.count}
                    max={data.activityMix[0]!.count}
                    color={brand.purple500}
                  />
                ))}
              </Section>
            )}

            {data.dayOfWeek.some((d) => d.count > 0) && (
              <Section title="Day-of-week activity">
                <View style={styles.dayRow}>
                  {data.dayOfWeek.map((d) => {
                    const max = Math.max(...data.dayOfWeek.map((x) => x.count), 1);
                    const h = Math.max(8, Math.round((d.count / max) * 64));
                    return (
                      <View key={d.day} style={styles.dayCol}>
                        <View style={[styles.dayBar, { height: h }]} />
                        <Text style={styles.dayLabel}>{d.day}</Text>
                      </View>
                    );
                  })}
                </View>
              </Section>
            )}

            <Pressable onPress={() => router.push("/amy-ai")} style={styles.askAmyCta}>
              <LinearGradient
                colors={[brand.purple500, brand.pink500]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.askAmyCtaGrad}
              >
                <Ionicons name="sparkles" size={18} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
                    Ask Amy what to focus on
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 }}>
                    Get a personalised read-out from your data
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function timeOfDayMax(t: { morning: number; afternoon: number; evening: number }): number {
  return Math.max(t.morning, t.afternoon, t.evening, 1);
}

function DeltaCard({
  icon,
  color,
  label,
  value,
  previousValue,
  previousLabel,
  changePct,
  changePts,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: number | string;
  previousValue: number | string;
  previousLabel: string;
  changePct: number | null;
  changePts?: number;
}) {
  const change = changePct ?? changePts ?? 0;
  const isUp = change > 0;
  const isDown = change < 0;
  const arrow = isUp ? "arrow-up" : isDown ? "arrow-down" : "remove";
  const arrowColor = isUp ? "#34D399" : isDown ? "#F87171" : "rgba(255,255,255,0.5)";
  const formatted =
    changePts !== undefined
      ? `${change >= 0 ? "+" : ""}${change} pts`
      : `${change >= 0 ? "+" : ""}${change}%`;
  return (
    <View style={[styles.deltaCard, { borderColor: color + "55" }]}>
      <View style={[styles.deltaIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.deltaLabel}>{label}</Text>
        <Text style={styles.deltaValue}>{value}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <Ionicons name={arrow} size={12} color={arrowColor} />
          <Text style={[styles.deltaChange, { color: arrowColor }]}>{formatted}</Text>
          <Text style={styles.deltaSub}>vs {previousLabel} ({previousValue})</Text>
        </View>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

function EmptyState({
  title,
  text,
  ctaLabel,
  onCta,
}: {
  title: string;
  text: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="bulb-outline" size={32} color={brand.purple500} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      <Pressable onPress={onCta} style={styles.emptyCta}>
        <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  headerSubtitle: { color: "rgba(255,255,255,0.55)", fontSize: 11 },

  toggleRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  togglePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  togglePillActive: {
    backgroundColor: brand.purple500,
    borderColor: brand.purple500,
  },
  toggleText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "700" },
  toggleTextActive: { color: "#fff" },

  deltaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
  },
  deltaIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deltaLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },
  deltaValue: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 2 },
  deltaChange: { fontSize: 11, fontWeight: "700" },
  deltaSub: { color: "rgba(255,255,255,0.45)", fontSize: 11 },

  section: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  childRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  childName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  childMeta: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 },
  childBadge: {
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    minWidth: 64,
  },
  childBadgeValue: { color: "#34D399", fontSize: 16, fontWeight: "800" },
  childBadgeLabel: { color: "rgba(52, 211, 153, 0.7)", fontSize: 9, fontWeight: "600" },
  childSubline: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 3 },

  familyIntro: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    lineHeight: 17,
    marginTop: -4,
    marginBottom: 2,
  },
  highlightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  highlightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightName: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  highlightHeadline: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  highlightDetail: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4, lineHeight: 17 },

  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  barLabel: {
    width: 90,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "600",
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },
  barValue: {
    width: 28,
    textAlign: "right",
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  dayRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 80,
    paddingTop: 8,
  },
  dayCol: { alignItems: "center", flex: 1, gap: 6 },
  dayBar: {
    width: 16,
    borderRadius: 6,
    backgroundColor: brand.purple500,
  },
  dayLabel: { color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: "600" },

  empty: {
    alignItems: "center",
    padding: 28,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginTop: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 6 },
  emptyText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  emptyCta: {
    backgroundColor: brand.purple500,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyCtaText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  askAmyCta: { borderRadius: 18, overflow: "hidden", marginTop: 6 },
  askAmyCtaGrad: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
});
