// ─────────────────────────────────────────────────────────────────────────
// Mobile Forecast screen — Predictive Caregiver Load Forecasting Engine.
// Mirrors the web /forecast page: household score, hour-bucket heatmap,
// anticipated bottlenecks, and rebalance suggestions.
// ─────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, useCallback } from "react";
import {
  ScrollView, StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetHouseholdForecast } from "@workspace/api-client-react";
import type {
  HouseholdForecastResponse,
  HouseholdCaregiverLoadForecast,
  HouseholdBottleneckPrediction,
} from "@workspace/api-zod";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function severityHex(s: HouseholdBottleneckPrediction["severity"]): string {
  if (s === "high")   return "#dc2626"; // audit-ok: severity-high semantic state
  if (s === "medium") return "#f59e0b"; // audit-ok: severity-medium semantic state
  return "#64748b"; // audit-ok: severity-low semantic state
}

function heatHex(load: number, cap: number): string {
  if (cap <= 0 || load === 0) return "#f1f5f9"; // audit-ok: empty heatmap cell
  const r = load / cap;
  if (r <= 0.5) return "#d1fae5"; // audit-ok: heatmap green (low load)
  if (r <= 1.0) return "#fef3c7"; // audit-ok: heatmap amber (near capacity)
  if (r <= 1.5) return "#fed7aa"; // audit-ok: heatmap orange (overloaded)
  return "#fecaca"; // audit-ok: heatmap red (severe overload)
}

function aggregateHourly(forecast: HouseholdCaregiverLoadForecast): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  const { bucketMinutes, load } = forecast.series;
  const bucketsPerHour = Math.max(1, Math.round(60 / bucketMinutes));
  for (const cg of Object.keys(load)) {
    const arr = load[cg];
    const hours: number[] = new Array(24).fill(0);
    for (let h = 0; h < 24; h++) {
      let peak = 0;
      const start = h * bucketsPerHour;
      const end = Math.min(arr.length, start + bucketsPerHour);
      for (let b = start; b < end; b++) if (arr[b] > peak) peak = arr[b];
      hours[h] = peak;
    }
    out[cg] = hours;
  }
  return out;
}

export default function ForecastScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const [date] = useState<string>(todayIso());
  const [horizonDays, setHorizonDays] = useState<number>(3);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useGetHouseholdForecast({ date, horizonDays });
  const forecast = data as HouseholdForecastResponse | undefined;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const hourly = useMemo(
    () => (forecast?.forecasts ?? []).map((f) => ({ date: f.date, hourly: aggregateHourly(f) })),
    [forecast?.forecasts],
  );

  const styles = makeStyles(colors);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: t("forecast.title"), headerBackTitle: t("common.back") }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerCard}>
          <Ionicons name="trending-up-outline" size={16} color={colors.text} />
          <Text style={[styles.headerDate, { color: colors.text }]}>{date}</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>· {t("forecast.subtitle")}</Text>
        </View>

        <View style={styles.horizonRow}>
          <Text style={[styles.muted, { color: colors.muted }]}>{t("forecast.horizon")}:</Text>
          {[1, 2, 3, 5, 7].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setHorizonDays(n)}
              style={[styles.chip, horizonDays === n && { backgroundColor: colors.primary }]}
              accessibilityRole="button"
            >
              <Text style={[styles.chipText, horizonDays === n && { color: "#ffffff" }]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && <ActivityIndicator size="large" style={{ marginTop: 24 }} color={colors.primary} />}
        {error && <Text style={[styles.error, { color: colors.destructive }]}>{t("common.error_generic")}</Text>}

        {forecast && (
          <>
            <View style={styles.summaryRow}>
              <SummaryBox label={t("forecast.household_score")} value={forecast.householdLoadScore}        styles={styles} />
              <SummaryBox label={t("forecast.history_days")}    value={forecast.forecasts[0]?.historyDays ?? 0} styles={styles} />
              <SummaryBox label={t("forecast.horizon")}         value={forecast.horizonDays}              styles={styles} />
            </View>

            {(forecast.forecasts[0]?.historyDays ?? 0) === 0 ? (
              <Text style={[styles.muted, { color: colors.muted }]}>{t("forecast.no_history")}</Text>
            ) : (
              <>
                <Text style={styles.sectionTitle}>{t("forecast.heatmap_heading")}</Text>
                {hourly.map(({ date: d, hourly: hrs }) => (
                  <View key={d} style={styles.heatCard}>
                    <Text style={[styles.heatDate, { color: colors.text }]}>{d}</Text>
                    {Object.entries(hrs).map(([cg, arr]) => (
                      <View key={cg} style={styles.heatRow}>
                        <Text style={[styles.heatCg, { color: colors.muted }]}>{cg}</Text>
                        <View style={styles.heatCells}>
                          {arr.map((v, h) => (
                            <View key={h} style={[styles.heatCell, { backgroundColor: heatHex(v, 1) }]} />
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}

                <Text style={styles.sectionTitle}>{t("forecast.hotspots_heading")}</Text>
                {forecast.bottlenecks.length === 0 ? (
                  <Text style={[styles.muted, { color: colors.muted }]}>{t("forecast.no_hotspots")}</Text>
                ) : (
                  forecast.bottlenecks.map((b, i) => (
                    <View key={i} style={[styles.bottleCard, { borderLeftColor: severityHex(b.severity) }]}>
                      <View style={styles.bottleHeader}>
                        <Text style={[styles.bottleTitle, { color: colors.text }]}>
                          {b.date} · {b.caregiver} · {b.windowLabel}
                        </Text>
                        <View style={[styles.sevBadge, { backgroundColor: severityHex(b.severity) }]}>
                          <Text style={styles.sevText}>{t(`forecast.severity.${b.severity}`)}</Text>
                        </View>
                      </View>
                      <Text style={[styles.bottleReason, { color: colors.text }]}>{b.reason}</Text>
                    </View>
                  ))
                )}

                <Text style={styles.sectionTitle}>{t("forecast.rebalance_heading")}</Text>
                {(forecast.rebalanceProposals?.length ?? 0) === 0 ? (
                  <Text style={[styles.muted, { color: colors.muted }]}>{t("forecast.no_rebalance")}</Text>
                ) : (
                  forecast.rebalanceProposals.map((p) => (
                    <View key={p.id} style={styles.rebalCard}>
                      <View style={styles.rebalHeader}>
                        <Text style={[styles.rebalCg, { color: colors.text }]}>{p.fromCaregiver}</Text>
                        <Ionicons name="arrow-forward-outline" size={16} color={colors.muted} />
                        <Text style={[styles.rebalCg, { color: colors.text }]}>{p.toCaregiver}</Text>
                        <Text style={[styles.rebalTime, { color: colors.muted }]}>{p.startTime}</Text>
                      </View>
                      <Text style={[styles.rebalDetail, { color: colors.text }]}>
                        {t("forecast.for_child")}: {p.childName} · {t("forecast.for_activity")}: {p.activity}
                      </Text>
                      <Text style={[styles.rebalRationale, { color: colors.muted }]}>{p.rationale}</Text>
                    </View>
                  ))
                )}
              </>
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

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root:        { flex: 1, backgroundColor: colors.background },
    scroll:      { padding: 16, paddingBottom: 48 },
    headerCard:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
    headerDate:  { fontSize: 14, fontWeight: "600" },
    headerSub:   { fontSize: 13 },
    horizonRow:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" },
    chip: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    chipText:    { fontSize: 12, color: colors.text, fontWeight: "600" },
    muted:       { fontSize: 13 },
    error:       { textAlign: "center", marginTop: 24, fontSize: 14 },
    summaryRow:  { flexDirection: "row", gap: 8, marginBottom: 16 },
    summaryBox:  {
      flex: 1, padding: 10, borderRadius: 10,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    summaryLabel:{ fontSize: 11, color: colors.muted, marginBottom: 2 },
    summaryValue:{ fontSize: 20, fontWeight: "700", color: colors.text },
    sectionTitle:{ fontSize: 16, fontWeight: "700", marginTop: 12, marginBottom: 8, color: colors.text },
    heatCard:    {
      backgroundColor: colors.surface, borderRadius: 10, padding: 10, marginBottom: 8,
      borderWidth: 1, borderColor: colors.border,
    },
    heatDate:    { fontSize: 12, fontWeight: "600", marginBottom: 6 },
    heatRow:     { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    heatCg:      { width: 56, fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
    heatCells:   { flex: 1, flexDirection: "row" },
    heatCell:    { flex: 1, height: 18, marginHorizontal: 1, borderRadius: 2 },
    bottleCard:  {
      backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 8,
      borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border,
    },
    bottleHeader:{ flexDirection: "row", alignItems: "center", marginBottom: 6 },
    bottleTitle: { flex: 1, fontSize: 13, fontWeight: "700" },
    sevBadge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    sevText:     { color: "#ffffff", fontSize: 10, fontWeight: "700" },
    bottleReason:{ fontSize: 12, lineHeight: 18 },
    rebalCard:   {
      backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 8,
      borderWidth: 1, borderColor: colors.border,
    },
    rebalHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    rebalCg:     { fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
    rebalTime:   { marginLeft: "auto", fontSize: 11 },
    rebalDetail: { fontSize: 12, marginBottom: 4 },
    rebalRationale:{ fontSize: 11, lineHeight: 16 },
  });
}
