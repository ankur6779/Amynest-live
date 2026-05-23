/**
 * LearningWeightsCard (mobile) — Phase 3 of the Adaptive Family Intelligence
 * Engine. Mirrors the web component using raw useAuthFetch + react query.
 *
 * Hidden when sample < 5 to avoid showing low-confidence noise.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";

const MIN_SAMPLE = 5;
const STRONG = 0.3;

type LearningWeights = {
  childId: number;
  categoryWeights: Array<{
    category: string;
    weight: number;
    positive: number;
    negative: number;
  }>;
  slotSuccess: Array<{ hour: number; completionRate: number; sample: number }>;
  lastComputedAt: string;
  sample: number;
};

export function LearningWeightsCard({ childId }: { childId: number | null }) {
  const { t } = useTranslation();
  const c = useColors();
  const authFetch = useAuthFetch();

  const { data, isLoading } = useQuery<LearningWeights>({
    queryKey: ["child-intelligence", childId, "learning-weights"],
    enabled: !!childId && childId > 0,
    queryFn: () =>
      authFetch(`/api/child-intelligence/${childId}/learning-weights`).then(
        (r) => r.json() as Promise<LearningWeights>,
      ),
  });

  if (!childId || childId <= 0) return null;
  if (!isLoading && (!data || data.sample < MIN_SAMPLE)) return null;

  const boosts = (data?.categoryWeights ?? []).filter((x) => x.weight >= STRONG).slice(0, 3);
  const demotes = (data?.categoryWeights ?? []).filter((x) => x.weight <= -STRONG).slice(0, 3);
  const slots = (data?.slotSuccess ?? []).filter((s) => s.hour >= 6 && s.hour <= 22);
  const maxRate = Math.max(100, ...slots.map((s) => s.completionRate));

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles-outline" size={16} color={c.primary} />
        <Text style={[styles.title, { color: c.text }]}>
          {t("intelligence.learning.title")}
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        {t("intelligence.learning.subtitle")}
      </Text>

      {isLoading && (
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          {t("intelligence.learning.loading")}
        </Text>
      )}

      {data && data.sample >= MIN_SAMPLE && (
        <>
          {boosts.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
                {t("intelligence.learning.boost_title")}
              </Text>
              <View style={styles.chipRow}>
                {boosts.map((cat) => (
                  <View
                    key={cat.category}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: c.primary + "1A",
                        borderColor: c.primary + "33",
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: c.primary }]}>
                      {cat.category} · +{cat.positive}/−{cat.negative}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {demotes.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
                {t("intelligence.learning.demote_title")}
              </Text>
              <View style={styles.chipRow}>
                {demotes.map((cat) => (
                  <View
                    key={cat.category}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: (c.destructive ?? c.text) + "1A",
                        borderColor: (c.destructive ?? c.text) + "33",
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: c.destructive ?? c.text }]}>
                      {cat.category} · +{cat.positive}/−{cat.negative}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {slots.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
                {t("intelligence.learning.slot_title")}
              </Text>
              <View style={{ gap: 4 }}>
                {slots.map((s) => {
                  const widthPct = Math.round((s.completionRate / maxRate) * 100);
                  const low = s.completionRate <= 40 && s.sample >= 3;
                  const fillColor = low ? c.destructive ?? c.text : c.primary;
                  return (
                    <View key={s.hour} style={styles.slotRow}>
                      <Text
                        style={[styles.slotHour, { color: c.mutedForeground }]}
                      >
                        {t("intelligence.learning.slot_axis_hour", {
                          hour: String(s.hour).padStart(2, "0"),
                        })}
                      </Text>
                      <View
                        style={[
                          styles.slotTrack,
                          { backgroundColor: c.muted, borderColor: c.border },
                        ]}
                      >
                        <View
                          style={{
                            height: "100%",
                            width: `${widthPct}%`,
                            backgroundColor: fillColor,
                            borderRadius: 999,
                          }}
                        />
                      </View>
                      <Text style={[styles.slotPct, { color: c.text }]}>
                        {s.completionRate}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
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
  section: { gap: 6, paddingTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" },
  slotRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  slotHour: { width: 44, fontSize: 11 },
  slotTrack: { flex: 1, height: 8, borderRadius: 999, borderWidth: 1, overflow: "hidden" },
  slotPct: { width: 40, fontSize: 11, fontWeight: "600", textAlign: "right" },
});
