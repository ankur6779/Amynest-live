/**
 * WeeklyReportCard (mobile) — Phase 2 of the Adaptive Family Intelligence Engine.
 *
 * 7-day rollup of behavioural signals + goal progress with deltas vs the
 * preceding 7 days. Mirrors the web component using raw useAuthFetch + react
 * query.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";

type Direction = "up" | "down" | "flat" | "unknown";
type WeeklyReport = {
  childId: number;
  rangeStart: string;
  rangeEnd: string;
  signalDays: number;
  streakDays: number;
  averages: {
    mood: number | null;
    focusScore: number | null;
    sleepQuality: number | null;
    completionPct: number | null;
    screenMinutes: number | null;
    tantrumsPerDay: number | null;
  };
  deltas: {
    mood: number | null;
    focusScore: number | null;
    sleepQuality: number | null;
    completionPct: number | null;
    tantrumsPerDay: number | null;
  };
  goalProgress: Array<{ goal: string; direction: Direction; note: string }>;
};

export function WeeklyReportCard({ childId }: { childId: number | null }) {
  const { t } = useTranslation();
  const c = useColors();
  const authFetch = useAuthFetch();

  const { data, isLoading } = useQuery<WeeklyReport>({
    queryKey: ["child-intelligence", childId, "weekly-report"],
    enabled: !!childId && childId > 0,
    queryFn: () =>
      authFetch(`/api/child-intelligence/${childId}/weekly-report`).then(
        (r) => r.json() as Promise<WeeklyReport>,
      ),
  });

  if (!childId || childId <= 0) return null;

  const renderRow = (
    label: string,
    value: number | null,
    delta: number | null,
    unit?: string,
  ) => (
    <View style={styles.row} key={label}>
      <Text style={[styles.label, { color: c.mutedForeground }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: c.text }]}>
          {value === null ? t("intelligence.weekly.no_data") : `${value}${unit ?? ""}`}
        </Text>
        {delta !== null && delta !== 0 && (
          <Text
            style={[
              styles.delta,
              { color: delta > 0 ? c.primary : c.destructive ?? c.text },
            ]}
          >
            {delta > 0 ? "+" : ""}
            {delta}
            {unit ?? ""}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.header}>
        <Ionicons name="bar-chart-outline" size={16} color={c.primary} />
        <Text style={[styles.title, { color: c.text }]}>
          {t("intelligence.weekly.title")}
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        {t("intelligence.weekly.subtitle")}
      </Text>

      {isLoading && (
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          {t("intelligence.weekly.loading")}
        </Text>
      )}

      {data && data.signalDays === 0 && (
        <View style={[styles.emptyBox, { backgroundColor: c.muted, borderColor: c.border }]}>
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
            {t("intelligence.weekly.empty")}
          </Text>
        </View>
      )}

      {data && data.signalDays > 0 && (
        <>
          {renderRow(t("intelligence.weekly.metrics.mood"), data.averages.mood, data.deltas.mood)}
          {renderRow(
            t("intelligence.weekly.metrics.focus"),
            data.averages.focusScore,
            data.deltas.focusScore,
          )}
          {renderRow(
            t("intelligence.weekly.metrics.sleep"),
            data.averages.sleepQuality,
            data.deltas.sleepQuality,
          )}
          {renderRow(
            t("intelligence.weekly.metrics.completion"),
            data.averages.completionPct,
            data.deltas.completionPct,
            "%",
          )}
          {renderRow(
            t("intelligence.weekly.metrics.tantrums"),
            data.averages.tantrumsPerDay,
            data.deltas.tantrumsPerDay,
          )}

          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: c.mutedForeground }]}>
              {t("intelligence.weekly.signal_days", { count: data.signalDays })}
            </Text>
            <Text style={[styles.metaText, { color: c.mutedForeground }]}>
              {t("intelligence.weekly.streak", { count: data.streakDays })}
            </Text>
          </View>

          {data.goalProgress.map((g) => (
            <View
              key={g.goal}
              style={[styles.goalRow, { backgroundColor: c.muted, borderColor: c.border }]}
            >
              <Text style={[styles.goalLabel, { color: c.text }]}>
                {t(`intelligence.goals.options.${g.goal}`)}
              </Text>
              <Text style={[styles.goalDir, { color: c.mutedForeground }]}>
                {t(`intelligence.weekly.direction.${g.direction}`)}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", flex: 1 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  label: { fontSize: 13 },
  valueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  value: { fontSize: 13, fontWeight: "600" },
  delta: { fontSize: 11, fontWeight: "700" },
  emptyBox: { padding: 10, borderRadius: 14, borderWidth: 1 },
  emptyText: { fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 4 },
  metaText: { fontSize: 11 },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  goalLabel: { fontSize: 13, fontWeight: "600" },
  goalDir: { fontSize: 11, fontWeight: "600" },
});
