// ─────────────────────────────────────────────────────────────────────────
// Mobile Household screen — Multi-Child Conflict Resolution Engine.
// Mirrors the web page: detected conflicts + resolution suggestions for a
// chosen date, plus the merged timeline, with one-tap "Apply".
// ─────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  useGetHouseholdConflicts,
  useOrchestrateHousehold,
} from "@workspace/api-client-react";
import type {
  HouseholdConflict,
  HouseholdResolution,
  HouseholdRoutineState,
  HouseholdTimelineSlot,
} from "@workspace/api-zod";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function iconFor(kind: HouseholdConflict["kind"]): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case "caregiver_overlap":
    case "caregiver_overload":  return "people-outline";
    case "meal_misalignment":   return "restaurant-outline";
    case "sleep_window_violation": return "moon-outline";
    case "school_collision":    return "school-outline";
    case "shared_activity_opportunity": return "sparkles-outline";
    default:                    return "alert-circle-outline";
  }
}

function severityHex(sev: number): string {
  if (sev >= 8) return "#dc2626"; // audit-ok: severity-high semantic state
  if (sev >= 5) return "#f59e0b"; // audit-ok: severity-medium semantic state
  return "#64748b"; // audit-ok: severity-low semantic state
}

export default function HouseholdScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const [date] = useState<string>(todayIso());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useGetHouseholdConflicts({ date });
  const orchestrate = useOrchestrateHousehold();
  const state = data as HouseholdRoutineState | undefined;

  const resolutionsByConflict = useMemo(() => {
    const map = new Map<string, HouseholdResolution>();
    state?.resolutions?.forEach((r) => map.set(r.conflictId, r));
    return map;
  }, [state?.resolutions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleApply = async (conflictId: string) => {
    if (!state) return;
    try {
      await orchestrate.mutateAsync({
        data: {
          date,
          dryRun: false,
          routines: state.originalRoutines,
          caregivers: [
            { caregiver: "mom", capacity: 1, windows: [{ start: "06:00", end: "22:00" }] },
            { caregiver: "dad", capacity: 1, windows: [{ start: "06:00", end: "22:00" }] },
          ],
        },
      });
      setAppliedIds((prev) => new Set(prev).add(conflictId));
      await refetch();
    } catch {
      // Caller-level toast (DebugPanel ring buffer captures this).
    }
  };

  const styles = makeStyles(colors);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: t("household.title"), headerBackTitle: t("common.back") }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerCard}>
          <Ionicons name="calendar-outline" size={16} color={colors.text} />
          <Text style={[styles.headerDate, { color: colors.text }]}>{date}</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>· {t("household.subtitle")}</Text>
        </View>

        {isLoading && <ActivityIndicator size="large" style={{ marginTop: 24 }} color={colors.primary} />}
        {error && <Text style={[styles.error, { color: colors.destructive }]}>{t("common.error_generic")}</Text>}

        {state && (
          <>
            {/* Summary scoreboard */}
            <View style={styles.summaryRow}>
              <SummaryBox label={t("household.summary.score")}     value={state.summary.overallScore}        styles={styles} />
              <SummaryBox label={t("household.summary.conflicts")} value={state.summary.totalConflicts}      styles={styles} />
              <SummaryBox label={t("household.summary.sleep")}     value={state.summary.sleepIntegrityScore} styles={styles} />
              <SummaryBox label={t("household.summary.shared")}    value={state.summary.sharedActivityWindows} styles={styles} />
            </View>

            <Text style={styles.sectionTitle}>{t("household.conflicts_heading")}</Text>
            {state.conflicts.length === 0 ? (
              <Text style={[styles.muted, { color: colors.muted }]}>{t("household.no_conflicts")}</Text>
            ) : (
              state.conflicts.map((c) => {
                const r = resolutionsByConflict.get(c.id);
                const applied = appliedIds.has(c.id);
                return (
                  <View key={c.id} style={[styles.conflictCard, { borderLeftColor: severityHex(c.severity) }]}>
                    <View style={styles.conflictHeader}>
                      <Ionicons name={iconFor(c.kind)} size={18} color={colors.text} />
                      <Text style={[styles.conflictKind, { color: colors.text }]}>
                        {t(`household.kind.${c.kind}`, { defaultValue: c.kind })}
                      </Text>
                      <Text style={[styles.conflictTime, { color: colors.muted }]}>{c.startTime}–{c.endTime}</Text>
                    </View>
                    <Text style={[styles.conflictText, { color: colors.text }]}>{c.explanation}</Text>
                    {r && r.strategy !== "no_action" && (
                      <View style={styles.resolution}>
                        <Text style={styles.resStrategy}>
                          {t(`household.strategy.${r.strategy}`, { defaultValue: r.strategy })}
                        </Text>
                        <Text style={styles.resRationale}>{r.rationale}</Text>
                        {r.changes.map((ch, i) => (
                          <Text key={i} style={styles.resChange}>
                            • {ch.activity}: {ch.fromTime} → {ch.toTime}
                          </Text>
                        ))}
                        <TouchableOpacity
                          accessibilityRole="button"
                          disabled={orchestrate.isPending || applied}
                          onPress={() => handleApply(c.id)}
                          style={[styles.applyBtn, applied && { opacity: 0.6 }]}
                        >
                          <Text style={styles.applyText}>
                            {applied ? t("household.applied") : t("household.apply_resolution")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <Text style={styles.sectionTitle}>{t("household.timeline_heading")}</Text>
            {state.timeline.length === 0 ? (
              <Text style={[styles.muted, { color: colors.muted }]}>{t("household.no_timeline")}</Text>
            ) : (
              state.timeline.map((slot, i) => <TimelineSlot key={i} slot={slot} t={t} colors={colors} />)
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryBox({ label, value, styles }: { label: string; value: number; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function TimelineSlot({
  slot, t, colors,
}: {
  slot: HouseholdTimelineSlot;
  t: (k: string, opts?: Record<string, unknown>) => string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[
      timelineStyles.slot,
      slot.hasConflict
        // audit-ok: amber conflict-warning surface (semantic state)
        ? { backgroundColor: "#fffbeb", borderColor: "#fbbf24" }
        : { backgroundColor: colors.surface, borderColor: colors.border },
    ]}>
      <View style={timelineStyles.row}>
        <Text style={[timelineStyles.time, { color: colors.text }]}>
          {slot.startTime}–{slot.endTime}
        </Text>
        {slot.hasConflict && (
          <View style={timelineStyles.badge}>
            <Text style={timelineStyles.badgeText}>{t("household.conflict")}</Text>
          </View>
        )}
      </View>
      {slot.entries.map((e, i) => (
        <Text key={i} style={[timelineStyles.entry, { color: colors.text }]}>
          {e.childName} — {e.item.activity} ({e.item.duration}m)
        </Text>
      ))}
    </View>
  );
}

const timelineStyles = StyleSheet.create({
  slot:    { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 8 },
  row:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  time:    { fontWeight: "600" },
  badge:   { backgroundColor: "#fef3c7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }, // audit-ok: amber conflict badge
  badgeText:{ color: "#92400e", fontSize: 11, fontWeight: "600" }, // audit-ok: amber conflict badge text
  entry:   { fontSize: 13, marginTop: 2 },
});

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root:        { flex: 1, backgroundColor: colors.background },
    scroll:      { padding: 16, paddingBottom: 48 },
    headerCard:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
    headerDate:  { fontSize: 14, fontWeight: "600" },
    headerSub:   { fontSize: 13 },
    error:       { textAlign: "center", marginTop: 24, fontSize: 14 },
    summaryRow:  { flexDirection: "row", gap: 8, marginBottom: 16 },
    summaryBox:  {
      flex: 1, padding: 10, borderRadius: 10,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    summaryLabel:{ fontSize: 11, color: colors.muted, marginBottom: 2 },
    summaryValue:{ fontSize: 20, fontWeight: "700", color: colors.text },
    sectionTitle:{ fontSize: 16, fontWeight: "700", marginTop: 8, marginBottom: 8, color: colors.text },
    muted:       { fontSize: 13 },
    conflictCard:{
      backgroundColor: colors.surface,
      borderRadius: 10, padding: 12, marginBottom: 10,
      borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border,
    },
    conflictHeader:{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
    conflictKind:{ fontSize: 14, fontWeight: "700", flex: 1 },
    conflictTime:{ fontSize: 11 },
    conflictText:{ fontSize: 13, lineHeight: 18 },
    resolution:  { marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: "#f5f3ff" }, // audit-ok: violet resolution surface
    resStrategy: { fontSize: 13, fontWeight: "700", color: "#5b21b6" }, // audit-ok: violet resolution accent
    resRationale:{ fontSize: 12, color: "#6d28d9", marginTop: 2 }, // audit-ok: violet resolution accent
    resChange:   { fontSize: 11, color: "#5b21b6", marginTop: 2 }, // audit-ok: violet resolution accent
    applyBtn:    { marginTop: 10, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
    applyText:   { color: "#ffffff", fontWeight: "600", fontSize: 14 },
  });
}
