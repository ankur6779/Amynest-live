import React, {  useState } from "react";
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
import { brand, ACCENT_PINK, palette } from "@/constants/colors";
import { useTranslation } from "react-i18next";

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

type AbacusWeeklyChild = {
  childId: number;
  childName: string;
  childAge: number | null;
  hasProgress: boolean;
  currentLevel: number;
  currentLevelLabel: string;
  highestUnlocked: number;
  levelsCompletedTotal: number;
  levelsCompletedThisWeek: number;
  pointsThisWeek: number;
  accuracyPct: number;
  accuracyIsWeekly: boolean;
  totalCorrect: number;
  totalAttempts: number;
  totalPoints: number;
  lastActiveAt: string | null;
  nextRecommendedAction: string;
};

type AbacusWeeklySummary = {
  generatedAt: string;
  children: AbacusWeeklyChild[];
  eligibleWithoutProgress: Array<{ childId: number; childName: string; childAge: number | null }>;
};

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>("week");

  const { data, isLoading, refetch, isRefetching } = useQuery<InsightsResponse>({
    queryKey: ["dashboard-insights", range],
    queryFn: async () => {
      const r = await authFetch(`/api/dashboard/insights?range=${range}`);
      if (!r.ok) throw new Error(`insights ${r.status}`);
      return r.json();
    },
  });

  // Abacus weekly progress is fixed to a trailing 7-day window (the abacus
  // schema only stores per-level best scores, not a true session history),
  // so it doesn't follow the week/month toggle.
  const { data: abacus } = useQuery<AbacusWeeklySummary>({
    queryKey: ["abacus-weekly-summary"],
    queryFn: async () => {
      const r = await authFetch(`/api/abacus/weekly-summary`);
      if (!r.ok) throw new Error(`abacus weekly ${r.status}`);
      return r.json();
    },
  });

  const periodLabel = range === "week" ? t("screens.insights.this_week") : t("screens.insights.this_month");
  const previousLabel = range === "week" ? t("screens.insights.last_week") : t("screens.insights.last_month");

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
          <Text style={styles.headerTitle}>{t("screens.insights.title")}</Text>
          <Text style={styles.headerSubtitle}>{t("screens.insights.subtitle")}</Text>
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
              {r === "week" ? t("screens.insights.range_week") : t("screens.insights.range_month")}
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
            title={t("screens.insights.no_children_title")}
            text={t("screens.insights.no_children_text")}
            ctaLabel={t("screens.insights.no_children_cta")}
            onCta={() => router.push("/(tabs)/children")}
          />
        )}

        {data && data.hasChildren && !data.hasActivity && (
          <EmptyState
            title={t("screens.insights.no_activity_title")}
            text={t("screens.insights.no_activity_text")}
            ctaLabel={t("screens.insights.no_activity_cta")}
            onCta={() => router.push("/(tabs)/routines")}
          />
        )}

        {data && data.hasActivity && (
          <>
            <DeltaCard
              icon="calendar-outline"
              color={palette.emerald400}
              label={t("screens.insights.routines_label", { period: periodLabel })}
              value={data.summary.routinesThisPeriod}
              previousValue={data.summary.routinesPreviousPeriod}
              previousLabel={previousLabel}
              changePct={data.summary.routinesChangePct}
              vsTemplate={(prev, val) => t("screens.insights.vs_previous", { previous: prev, value: val })}
            />
            <DeltaCard
              icon="happy-outline"
              color={palette.amber400}
              label={t("screens.insights.moments_label", { period: periodLabel })}
              value={data.summary.behaviorsThisPeriod}
              previousValue={data.summary.behaviorsPreviousPeriod}
              previousLabel={previousLabel}
              changePct={null}
              vsTemplate={(prev, val) => t("screens.insights.vs_previous", { previous: prev, value: val })}
            />
            <DeltaCard
              icon="heart-outline"
              color={ACCENT_PINK}
              label={t("screens.insights.positive_rate_label")}
              value={`${data.summary.positiveRateThisPeriod}%`}
              previousValue={`${data.summary.positiveRatePreviousPeriod}%`}
              previousLabel={previousLabel}
              changePct={null}
              changePts={data.summary.positiveRateChangePts}
              vsTemplate={(prev, val) => t("screens.insights.vs_previous", { previous: prev, value: val })}
            />

            {data.siblingHighlights.length >= 2 && (
              <Section title={t("screens.insights.section_family_strengths")}>
                <Text style={styles.familyIntro}>
                  {t("screens.insights.family_intro")}
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
              <Section title={t("screens.insights.section_per_child")}>
                {data.perChild.map((c) => {
                  const subline: string[] = [];
                  if (c.routineCompletionRate > 0) {
                    subline.push(t("screens.insights.completion_rate", { n: c.routineCompletionRate }));
                  }
                  if (c.topCategory) {
                    subline.push(t("screens.insights.top_category", { category: c.topCategory }));
                  }
                  if (c.milestoneCount > 0) {
                    subline.push(
                      t(
                        c.milestoneCount === 1
                          ? "screens.insights.milestone_count_one"
                          : "screens.insights.milestone_count_other",
                        { count: c.milestoneCount },
                      ),
                    );
                  }
                  return (
                    <View key={c.childId} style={styles.childRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.childName}>{c.childName}</Text>
                        <Text style={styles.childMeta}>
                          {t(
                            c.routinesCount === 1
                              ? "screens.insights.routines_count_one"
                              : "screens.insights.routines_count_other",
                            { count: c.routinesCount },
                          )}{" · "}
                          {t(
                            c.behaviorsCount === 1
                              ? "screens.insights.moments_count_one"
                              : "screens.insights.moments_count_other",
                            { count: c.behaviorsCount },
                          )}
                        </Text>
                        {subline.length > 0 && (
                          <Text style={styles.childSubline}>{subline.join(" · ")}</Text>
                        )}
                      </View>
                      <View style={styles.childBadge}>
                        <Text style={styles.childBadgeValue}>{c.positiveRate}%</Text>
                        <Text style={styles.childBadgeLabel}>{t("screens.insights.positive_badge")}</Text>
                      </View>
                    </View>
                  );
                })}
              </Section>
            )}

            <Section title={t("screens.insights.section_when")}>
              <BarRow
                label={t("screens.insights.morning")}
                value={data.timeOfDay.morning}
                max={timeOfDayMax(data.timeOfDay)}
                color={palette.amber400}
              />
              <BarRow
                label={t("screens.insights.afternoon")}
                value={data.timeOfDay.afternoon}
                max={timeOfDayMax(data.timeOfDay)}
                color={palette.emerald400}
              />
              <BarRow
                label={t("screens.insights.evening")}
                value={data.timeOfDay.evening}
                max={timeOfDayMax(data.timeOfDay)}
                color={brand.violet500}
              />
            </Section>

            {data.activityMix.length > 0 && (
              <Section title={t("screens.insights.section_most_planned")}>
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
              <Section title={t("screens.insights.section_day_of_week")}>
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
                    {t("screens.insights.ask_amy_title")}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 }}>
                    {t("screens.insights.ask_amy_sub")}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
          </>
        )}

        {/* Abacus weekly progress — rendered independently of the
            routines/behaviour activity gate so parents whose child only
            uses the Abacus PRO Zone still see weekly trends. */}
        {data?.hasChildren && abacus && abacus.children.length > 0 && (
          <Section title="Abacus this week">
            {abacus.children.map((c) => (
              <View key={c.childId} style={styles.abacusCard}>
                <View style={styles.abacusHeaderRow}>
                  <Text style={styles.abacusName}>{c.childName}</Text>
                  <Text style={styles.abacusLevel}>
                    Level {c.currentLevel} · {c.currentLevelLabel}
                  </Text>
                </View>
                {!c.hasProgress ? (
                  <>
                    <Text style={styles.abacusEmpty}>
                      No abacus sessions yet — open the Abacus PRO Zone to get started.
                    </Text>
                    <View style={styles.abacusNextRow}>
                      <Ionicons name="sparkles" size={14} color={brand.purple500} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.abacusNextLabel}>Next up</Text>
                        <Text style={styles.abacusNextText}>{c.nextRecommendedAction}</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.abacusStatsRow}>
                      <View style={styles.abacusStatBox}>
                        <Text style={styles.abacusStatLabel}>
                          {c.accuracyIsWeekly ? "Accuracy" : "Lifetime acc."}
                        </Text>
                        <Text style={styles.abacusStatValue}>{c.accuracyPct}%</Text>
                      </View>
                      <View style={styles.abacusStatBox}>
                        <Text style={styles.abacusStatLabel}>Points</Text>
                        <Text style={styles.abacusStatValue}>{c.pointsThisWeek}</Text>
                        <Text style={styles.abacusStatSub}>this week</Text>
                      </View>
                      <View style={styles.abacusStatBox}>
                        <Text style={styles.abacusStatLabel}>Levels</Text>
                        <Text style={styles.abacusStatValue}>
                          {c.levelsCompletedTotal}/5
                        </Text>
                        <Text style={styles.abacusStatSub}>
                          {c.levelsCompletedThisWeek > 0
                            ? `+${c.levelsCompletedThisWeek} this week`
                            : "no new this week"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.abacusNextRow}>
                      <Ionicons name="sparkles" size={14} color={brand.purple500} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.abacusNextLabel}>Next up</Text>
                        <Text style={styles.abacusNextText}>{c.nextRecommendedAction}</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            ))}
          </Section>
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
  vsTemplate,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: number | string;
  previousValue: number | string;
  previousLabel: string;
  changePct: number | null;
  changePts?: number;
  vsTemplate: (previous: string, value: string | number) => string;
}) {
  const change = changePct ?? changePts ?? 0;
  const isUp = change > 0;
  const isDown = change < 0;
  const arrow = isUp ? "arrow-up" : isDown ? "arrow-down" : "remove";
  const arrowColor = isUp ? palette.emerald400 : isDown ? palette.red400 : "rgba(255,255,255,0.5)";
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
          <Text style={styles.deltaSub}>{vsTemplate(previousLabel, previousValue)}</Text>
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
  childBadgeValue: { color: palette.emerald400, fontSize: 16, fontWeight: "800" },
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

  abacusCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
    gap: 10,
  },
  abacusHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  abacusName: { color: "#fff", fontSize: 14, fontWeight: "800" },
  abacusLevel: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "600" },
  abacusEmpty: { color: "rgba(255,255,255,0.7)", fontSize: 12, lineHeight: 17 },
  abacusStatsRow: { flexDirection: "row", gap: 8 },
  abacusStatBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  abacusStatLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  abacusStatValue: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 2 },
  abacusStatSub: { color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 1 },
  abacusNextRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(124, 58, 237, 0.15)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  abacusNextLabel: {
    color: brand.purple500,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  abacusNextText: { color: "#fff", fontSize: 12, fontWeight: "700", marginTop: 2 },
});
