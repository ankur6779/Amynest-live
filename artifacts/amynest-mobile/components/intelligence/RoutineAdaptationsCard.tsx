/**
 * RoutineAdaptationsCard (mobile) — "Why this routine?" surface.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { formatParentRoutineExplanation } from "@workspace/explainability";

export function RoutineAdaptationsCard({
  adaptations,
  hasSchool,
  isWeekendDay,
  mood,
}: {
  adaptations: readonly string[] | null | undefined;
  hasSchool?: boolean;
  isWeekendDay?: boolean;
  mood?: string;
}) {
  const { t } = useTranslation();
  const c = useColors();

  const explanation = useMemo(() => {
    const raw = (adaptations ?? []).filter((s) => typeof s === "string" && s.trim().length > 0);
    if (raw.length === 0) return null;
    return formatParentRoutineExplanation(raw, { hasSchool, isWeekendDay, mood });
  }, [adaptations, hasSchool, isWeekendDay, mood]);

  if (!explanation || explanation.bullets.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={16} color={c.primary} />
        <Text style={[styles.title, { color: c.text }]}>
          {t("intelligence.adaptations.title")}
        </Text>
      </View>
      <Text style={[styles.summary, { color: c.text }]}>{explanation.summary}</Text>
      <View style={styles.list}>
        {explanation.bullets.map((s, i) => (
          <View
            key={i}
            style={[styles.item, { backgroundColor: c.muted, borderColor: c.border }]}
          >
            <Text style={[styles.itemText, { color: c.text }]}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700" },
  summary: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  list: { gap: 8, marginTop: 4 },
  item: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  itemText: { fontSize: 13, lineHeight: 18 },
});
