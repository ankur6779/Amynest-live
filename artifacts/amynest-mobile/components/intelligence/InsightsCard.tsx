/**
 * InsightsCard (mobile) — Phase 2 of the Adaptive Family Intelligence Engine.
 *
 * Mirrors the web card: surfaces risk windows + activity↔behaviour
 * correlations. Hidden when both lists are empty.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";

type RiskWindow = {
  startHour: number;
  endHour: number;
  negativeCount: number;
  daysObserved: number;
  suggestion: string;
};
type Correlation = {
  category: string;
  positive: number;
  negative: number;
  net: number;
};
type InsightsResponse = {
  childId: number;
  riskWindows: RiskWindow[];
  correlations: Correlation[];
};

function fmtHour(h: number): string {
  const hh = ((h + 11) % 12) + 1;
  const ap = h < 12 ? "AM" : "PM";
  return `${hh} ${ap}`;
}

export function InsightsCard({ childId }: { childId: number | null }) {
  const { t } = useTranslation();
  const c = useColors();
  const authFetch = useAuthFetch();

  const { data, isLoading } = useQuery<InsightsResponse>({
    queryKey: ["child-intelligence", childId, "insights"],
    enabled: !!childId && childId > 0,
    queryFn: () =>
      authFetch(`/api/child-intelligence/${childId}/insights`).then(
        (r) => r.json() as Promise<InsightsResponse>,
      ),
  });

  if (!childId || childId <= 0) return null;
  if (isLoading) return null;

  const risk = data?.riskWindows ?? [];
  const corr = data?.correlations ?? [];
  if (risk.length === 0 && corr.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      {risk.length > 0 && (
        <View style={styles.section}>
          <View style={styles.header}>
            <Ionicons name="warning-outline" size={16} color={c.primary} />
            <Text style={[styles.title, { color: c.text }]}>
              {t("intelligence.insights.risk.title")}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            {t("intelligence.insights.risk.subtitle")}
          </Text>
          {risk.map((w, i) => (
            <View
              key={`${w.startHour}-${i}`}
              style={[styles.item, { backgroundColor: c.muted, borderColor: c.border }]}
            >
              <Text style={[styles.itemTitle, { color: c.text }]}>
                {fmtHour(w.startHour)} – {fmtHour(w.endHour)} ·{" "}
                {t("intelligence.insights.risk.events", { count: w.negativeCount })}
              </Text>
              <Text style={[styles.itemBody, { color: c.mutedForeground }]}>
                {t(`intelligence.insights.risk.suggestions.${w.suggestion}`, {
                  defaultValue: w.suggestion,
                })}
              </Text>
            </View>
          ))}
        </View>
      )}

      {corr.length > 0 && (
        <View style={styles.section}>
          <View style={styles.header}>
            <Ionicons name="link-outline" size={16} color={c.primary} />
            <Text style={[styles.title, { color: c.text }]}>
              {t("intelligence.insights.correlations.title")}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            {t("intelligence.insights.correlations.subtitle")}
          </Text>
          {corr.map((cr) => (
            <View
              key={cr.category}
              style={[styles.row, { backgroundColor: c.muted, borderColor: c.border }]}
            >
              <Text style={[styles.itemTitle, { color: c.text, textTransform: "capitalize" }]}>
                {cr.category}
              </Text>
              <View style={styles.scoreRow}>
                <Text style={[styles.score, { color: c.primary }]}>+{cr.positive}</Text>
                <Text style={[styles.score, { color: c.destructive ?? c.text }]}>
                  -{cr.negative}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 12 },
  section: { gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", flex: 1 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  item: { padding: 10, borderRadius: 14, borderWidth: 1, gap: 4 },
  itemTitle: { fontSize: 13, fontWeight: "600" },
  itemBody: { fontSize: 12, lineHeight: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  scoreRow: { flexDirection: "row", gap: 10 },
  score: { fontSize: 13, fontWeight: "700" },
});
