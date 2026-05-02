import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { getCuesForAge, pickLang, type CueCategory } from "@workspace/infant-hub";
import { brand, palette } from "@/constants/colors";
import { langOf } from "@/utils/lang";

type Props = { ageMonths: number };

const CAT_TINT: Record<CueCategory, { emoji: string; tint: string; border: string }> = {
  hunger:     { emoji: "🍼", tint: "rgba(245,158,11,0.18)", border: "rgba(245,158,11,0.45)" },
  sleep:      { emoji: "😴", tint: "rgba(99,102,241,0.18)", border: "rgba(99,102,241,0.45)" },
  overstim:   { emoji: "🌀", tint: "rgba(244,63,94,0.18)",  border: "rgba(244,63,94,0.45)" },
  discomfort: { emoji: "🤕", tint: "rgba(249,115,22,0.18)", border: "rgba(249,115,22,0.45)" },
};

/** Mobile twin of the web Baby Cues sub-card: read-the-cue insights filterable
 *  by category, each with an action recommendation. */
export default function InfantCuesTab({ ageMonths }: Props) {
  const { t, i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const all = useMemo(() => getCuesForAge(ageMonths), [ageMonths]);
  const [filter, setFilter] = useState<CueCategory | "all">("all");
  const visible = filter === "all" ? all : all.filter((c) => c.category === filter);

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.pillRow}>
        <Pressable
          onPress={() => setFilter("all")}
          style={[styles.pill, filter === "all" && styles.pillActive]}
        >
          <Text style={{ fontSize: 13 }}>✨</Text>
          <Text style={[styles.pillText, filter === "all" && styles.pillTextActive]}>
            {t("infant_hub.common.all")}
          </Text>
        </Pressable>
        {(Object.keys(CAT_TINT) as CueCategory[]).map((c) => (
          <Pressable
            key={c}
            onPress={() => setFilter(c)}
            style={[styles.pill, filter === c && styles.pillActive]}
          >
            <Text style={{ fontSize: 13 }}>{CAT_TINT[c].emoji}</Text>
            <Text style={[styles.pillText, filter === c && styles.pillTextActive]}>
              {t(`infant_hub.cues.categories.${c}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="eye-outline" size={16} color="rgba(255,255,255,0.5)" />
          <Text style={styles.emptyTxt}>{t("infant_hub.cues.empty")}</Text>
        </View>
      ) : (
        visible.map((cue) => {
          const meta = CAT_TINT[cue.category];
          return (
            <View
              key={cue.id}
              style={[styles.card, { backgroundColor: meta.tint, borderColor: meta.border }]}
            >
              <View style={styles.head}>
                <Text style={styles.emoji}>{cue.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{cue.label}</Text>
                  <Text style={styles.cat}>
                    {meta.emoji} {t(`infant_hub.cues.categories.${cue.category}`)}
                  </Text>
                </View>
              </View>
              <Text style={styles.insight}>{pickLang(cue.insight, lang)}</Text>
              <View style={styles.actionRow}>
                <Ionicons name="arrow-forward-circle" size={14} color={palette.emerald400} />
                <Text style={styles.action}>{pickLang(cue.action, lang)}</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
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
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  emoji: { fontSize: 22 },
  label: { color: "#fff", fontWeight: "800", fontSize: 13 },
  cat: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: 0.4,
  },
  insight: { color: "rgba(255,255,255,0.85)", fontSize: 12, lineHeight: 16 },
  actionRow: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 8,
    padding: 8,
  },
  action: { color: "#fff", fontSize: 11.5, lineHeight: 15, flex: 1 },
});
