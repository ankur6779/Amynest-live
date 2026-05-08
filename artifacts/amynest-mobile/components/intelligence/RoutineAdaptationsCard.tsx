/**
 * RoutineAdaptationsCard (mobile) — "Why this routine?" surface.
 * Hidden when the routine has no adaptations.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";

export function RoutineAdaptationsCard({
  adaptations,
}: {
  adaptations: readonly string[] | null | undefined;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const list = (adaptations ?? []).filter((s) => typeof s === "string" && s.trim().length > 0);
  if (list.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={16} color={c.primary} />
        <Text style={[styles.title, { color: c.text }]}>
          {t("intelligence.adaptations.title")}
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        {t("intelligence.adaptations.subtitle")}
      </Text>
      <View style={styles.list}>
        {list.map((s, i) => (
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
  subtitle: { fontSize: 13, lineHeight: 18 },
  list: { gap: 8, marginTop: 4 },
  item: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  itemText: { fontSize: 13, lineHeight: 18 },
});
