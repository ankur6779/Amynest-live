import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { getFeedingGuide } from "@workspace/infant-hub";
import { brand, palette } from "@/constants/colors";

type Props = { ageMonths: number };

/** Mobile twin of the Feeding reference card: age-appropriate feeding type,
 *  frequency, and a tip ported from the web `getFeedingGuide`. */
export default function InfantFeedingReference({ ageMonths }: Props) {
  const { t } = useTranslation();
  const guide = getFeedingGuide(ageMonths);
  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <MaterialCommunityIcons name="silverware-fork-knife" size={14} color={brand.amber400} />
        <Text style={styles.headTitle}>{t("infant_hub.feeding_ref.title")}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("infant_hub.feeding_ref.type")}</Text>
        <Text style={styles.value}>{guide.type}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t("infant_hub.feeding_ref.frequency")}</Text>
        <Text style={styles.value}>{guide.freq}</Text>
      </View>

      <View style={styles.tipBlock}>
        <Text style={styles.tipLabel}>{t("infant_hub.feeding_ref.tip_label")}</Text>
        <Text style={styles.tipBody}>{guide.tip}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  headTitle: { color: "#fff", fontWeight: "800", fontSize: 13 },
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  label: {
    color: brand.violet200,
    fontWeight: "800",
    fontSize: 10.5,
    letterSpacing: 0.5,
    width: 78,
    textTransform: "uppercase",
  },
  value: { color: "#fff", fontSize: 12.5, flex: 1, lineHeight: 16 },
  tipBlock: {
    backgroundColor: `${palette.emerald500}24`,
    borderColor: `${palette.emerald500}55`,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  tipLabel: {
    color: palette.emerald400,
    fontWeight: "800",
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  tipBody: { color: "#fff", fontSize: 11.5, lineHeight: 16 },
});
