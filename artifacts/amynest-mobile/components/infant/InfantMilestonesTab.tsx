import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  getMilestonesForAge,
  type MilestoneCategory,
} from "@workspace/infant-hub";
import { brand, palette } from "@/constants/colors";

type Props = { ageMonths: number };

const CAT_EMOJI: Record<MilestoneCategory, string> = {
  motor:     "💪",
  cognitive: "🧠",
  social:    "💖",
  language:  "🗣️",
};

/** Mobile twin of the web Milestones sub-card. Filters by age window, shows
 *  category pills + a card per milestone with explanation, why-it-matters,
 *  and a parent-driven activity. */
export default function InfantMilestonesTab({ ageMonths }: Props) {
  const { t } = useTranslation();
  const all = useMemo(() => getMilestonesForAge(ageMonths), [ageMonths]);
  const [filter, setFilter] = useState<MilestoneCategory | "all">("all");
  const visible = filter === "all" ? all : all.filter((m) => m.category === filter);

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.pillRow}>
        <CategoryPill
          active={filter === "all"}
          label={t("infant_hub.common.all")}
          emoji="✨"
          onPress={() => setFilter("all")}
        />
        {(Object.keys(CAT_EMOJI) as MilestoneCategory[]).map((c) => (
          <CategoryPill
            key={c}
            active={filter === c}
            label={t(`infant_hub.milestones.categories.${c}`)}
            emoji={CAT_EMOJI[c]}
            onPress={() => setFilter(c)}
          />
        ))}
      </View>

      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="flower-outline" size={18} color="rgba(255,255,255,0.5)" />
          <Text style={styles.emptyTxt}>{t("infant_hub.milestones.empty")}</Text>
        </View>
      ) : (
        visible.map((m) => (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardEmoji}>{m.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{m.title}</Text>
                <Text style={styles.cardMeta}>
                  {CAT_EMOJI[m.category]} {t(`infant_hub.milestones.categories.${m.category}`)}
                  {" · "}
                  {m.fromMonths}–{m.toMonths} {t("infant_hub.common.months_short")}
                </Text>
              </View>
            </View>
            <Text style={styles.cardBody}>{m.explanation}</Text>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {t("infant_hub.milestones.why_label")}
              </Text>
              <Text style={styles.sectionBody}>{m.whyItMatters}</Text>
            </View>
            <View style={styles.activityBlock}>
              <Text style={styles.activityLabel}>
                {t("infant_hub.milestones.try_label")}
              </Text>
              <Text style={styles.activityBody}>{m.activity}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function CategoryPill({
  active,
  label,
  emoji,
  onPress,
}: {
  active: boolean;
  label: string;
  emoji: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={{ fontSize: 13 }}>{emoji}</Text>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  pillActive: {
    backgroundColor: `${brand.purple500}26`,
    borderColor: `${brand.purple500}66`,
  },
  pillText: { color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: 11.5 },
  pillTextActive: { color: "#fff" },

  empty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
  },
  emptyTxt: { color: "rgba(255,255,255,0.6)", fontSize: 12, flex: 1 },

  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardEmoji: { fontSize: 26 },
  cardTitle: { color: "#fff", fontWeight: "800", fontSize: 13.5 },
  cardMeta: {
    color: brand.violet200,
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginTop: 2,
  },
  cardBody: { color: "rgba(255,255,255,0.80)", fontSize: 12.5, lineHeight: 17 },
  section: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  sectionLabel: {
    color: brand.amber400,
    fontWeight: "800",
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  sectionBody: { color: "rgba(255,255,255,0.75)", fontSize: 11.5, lineHeight: 16 },
  activityBlock: {
    backgroundColor: `${palette.emerald500}24`,
    borderColor: `${palette.emerald500}55`,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  activityLabel: {
    color: palette.emerald400,
    fontWeight: "800",
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  activityBody: { color: "#fff", fontSize: 11.5, lineHeight: 16 },
});
