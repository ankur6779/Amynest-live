import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ToastAndroid, Platform, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  INFANT_CATEGORIES,
  type InfantCategory,
  type Lang,
  getTipsForAge,
  getAmyInsight,
  pickLang,
} from "@workspace/infant-hub";
import { brand, brandAlpha, palette } from "@/constants/colors";

type Props = {
  childName: string;
  ageMonths: number;
};

function langOf(i18nLang: string | undefined): Lang {
  if (i18nLang?.startsWith("hi") && !i18nLang.includes("ng")) return "hi";
  if (i18nLang === "hinglish" || i18nLang?.startsWith("hin")) return "hin";
  return "en";
}

function flashToast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert("", msg);
  }
}

function formatAgeLabel(ageMonths: number): string {
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (years === 0 && months === 0) return "Newborn";
  if (years === 0) return `${months}m`;
  if (months === 0) return `${years}y`;
  return `${years}y ${months}m`;
}

export default function InfantHub({ childName, ageMonths }: Props) {
  const { t, i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const [active, setActive] = useState<InfantCategory>("sleep");
  const [tipIndex, setTipIndex] = useState(0);

  const tips = useMemo(() => getTipsForAge(ageMonths, active), [ageMonths, active]);
  const insight = useMemo(() => getAmyInsight(ageMonths, active), [ageMonths, active]);
  const currentTip = tips.length > 0 ? tips[tipIndex % tips.length] : null;

  const handleNext = () => {
    if (tips.length === 0) return;
    setTipIndex((i) => (i + 1) % tips.length);
  };

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={["rgba(236,72,153,0.12)", brandAlpha.purple500_10, "rgba(56,189,248,0.10)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGrad}
      >
        {/* Header */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.kicker}>👶 {t("infant_hub.title")}</Text>
          <Text style={styles.subtitle}>
            {t("infant_hub.subtitle", { name: childName, age: formatAgeLabel(ageMonths) })}
          </Text>
        </View>

        {/* Glass tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {INFANT_CATEGORIES.map((cat) => {
            const isActive = active === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => {
                  setActive(cat.key);
                  setTipIndex(0);
                }}
                style={[styles.tab, isActive && styles.tabActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {t(`infant_hub.tabs.${cat.key}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Amy AI insight */}
        <View style={styles.insightCard}>
          <View style={styles.insightHead}>
            <MaterialCommunityIcons name="brain" size={16} color={brand.purple400} />
            <Text style={styles.insightTitle}>{t("infant_hub.amy_suggests")}</Text>
          </View>
          <Text style={styles.insightBody}>
            <Text>{insight.emoji}  </Text>
            {pickLang(insight, lang)}
          </Text>
        </View>

        {/* Tip */}
        {currentTip ? (
          <View style={styles.tipCard}>
            <View style={styles.tipHead}>
              <Text style={{ fontSize: 28 }}>{currentTip.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>{pickLang(currentTip.title, lang)}</Text>
                <Text style={styles.tipMeta}>{t("infant_hub.based_on")}</Text>
              </View>
            </View>
            <Text style={styles.tipBody}>{pickLang(currentTip.body, lang)}</Text>

            <View style={styles.btnRow}>
              <Pressable
                onPress={() => flashToast(t("infant_hub.thanks"))}
                style={[styles.actionBtn, { backgroundColor: "rgba(16,185,129,0.18)", borderColor: "rgba(16,185,129,0.45)" }]}
              >
                <Ionicons name="thumbs-up" size={13} color={palette.emerald400} />
                <Text style={[styles.actionTxt, { color: palette.emerald400 }]}>{t("infant_hub.helpful")}</Text>
              </Pressable>
              <Pressable
                onPress={handleNext}
                style={[styles.actionBtn, { backgroundColor: `${brand.purple500}18`, borderColor: `${brand.purple500}45` }]}
              >
                <Ionicons name="refresh" size={13} color={brand.purple400} />
                <Text style={[styles.actionTxt, { color: brand.purple400 }]}>{t("infant_hub.next_tip")}</Text>
              </Pressable>
              <Pressable
                onPress={() => flashToast(t("infant_hub.tried_logged"))}
                style={[styles.actionBtn, { backgroundColor: "rgba(245,158,11,0.18)", borderColor: "rgba(245,158,11,0.45)" }]}
              >
                <Ionicons name="checkmark-circle" size={13} color={palette.amber500} />
                <Text style={[styles.actionTxt, { color: palette.amber500 }]}>{t("infant_hub.tried_this")}</Text>
              </Pressable>
            </View>

            {tips.length > 1 && (
              <Text style={styles.counter}>
                {tipIndex + 1} / {tips.length}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyTip}>
            <Text style={styles.tipBody}>{t("infant_hub.no_tips")}</Text>
          </View>
        )}

        {/* Safety footer */}
        <View style={styles.disclaimer}>
          <Ionicons name="shield-checkmark-outline" size={12} color="rgba(255,255,255,0.5)" />
          <Text style={styles.disclaimerTxt}>{t("infant_hub.safe_disclaimer")}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: brand.purple500,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardGrad: { padding: 14 },
  kicker: { color: "#F9A8D4", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }, // audit-ok: rose-200 kicker for infant card
  subtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 3 },

  tabRow: { gap: 8, paddingVertical: 4, marginBottom: 10 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  tabActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(192,132,252,0.7)",
    shadowColor: brand.purple500,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  tabLabel: { color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: 12 },
  tabLabelActive: { color: "#fff" },

  insightCard: {
    backgroundColor: `${brand.purple500}18`,
    borderColor: `${brand.purple500}40`,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  insightHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  insightTitle: { color: brand.violet200, fontWeight: "800", fontSize: 12 },
  insightBody: { color: "#fff", fontSize: 13, lineHeight: 18 },

  tipCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  emptyTip: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  tipHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  tipTitle: { color: "#fff", fontWeight: "800", fontSize: 14, lineHeight: 18 },
  tipMeta: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginTop: 2, letterSpacing: 0.5 },
  tipBody: { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 19, marginTop: 4 },

  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionTxt: { fontSize: 11, fontWeight: "800" },
  counter: { color: "rgba(255,255,255,0.45)", fontSize: 11, textAlign: "center", marginTop: 8 },

  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  disclaimerTxt: { color: "rgba(255,255,255,0.5)", fontSize: 10.5, lineHeight: 14, flex: 1 },
});
