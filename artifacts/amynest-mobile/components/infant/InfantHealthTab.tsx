import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  getUpcomingVaccinations,
  getCompletedVaccinations,
  getCommonIssuesForAge,
} from "@workspace/infant-hub";
import { brand, palette } from "@/constants/colors";

type Props = { ageMonths: number };

/** Mobile twin of the web Health sub-card: India NIS / IAP vaccinations
 *  (upcoming + completed) plus the common-issue references. */
export default function InfantHealthTab({ ageMonths }: Props) {
  const { t } = useTranslation();
  const upcoming = getUpcomingVaccinations(ageMonths);
  const completed = getCompletedVaccinations(ageMonths);
  const issues = getCommonIssuesForAge(ageMonths);

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.block}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="needle" size={14} color={palette.emerald400} />
          <Text style={styles.headerText}>{t("infant_hub.health.upcoming_title")}</Text>
        </View>
        {upcoming.length === 0 ? (
          <Text style={styles.empty}>{t("infant_hub.health.no_upcoming")}</Text>
        ) : (
          upcoming.map((v) => (
            <View key={v.ageLabel} style={styles.row}>
              <Text style={styles.rowAge}>{v.ageLabel}</Text>
              <Text style={styles.rowVax}>{v.vaccines.join(" · ")}</Text>
            </View>
          ))
        )}
      </View>

      {completed.length > 0 && (
        <View style={styles.completedBlock}>
          <View style={styles.header}>
            <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.65)" />
            <Text style={styles.completedHeader}>
              {t("infant_hub.health.completed", {
                count: completed.length,
              })}
            </Text>
          </View>
          <Text style={styles.completedHint}>
            {t("infant_hub.health.source_note")}
          </Text>
        </View>
      )}

      <View style={styles.block}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color={palette.amber400} />
          <Text style={styles.headerText}>
            {t("infant_hub.health.common_issues_title")}
          </Text>
        </View>
        {issues.length === 0 ? (
          <Text style={styles.empty}>{t("infant_hub.health.no_issues")}</Text>
        ) : (
          issues.map((i) => (
            <View key={i.id} style={styles.issueCard}>
              <View style={styles.issueHead}>
                <Text style={styles.issueEmoji}>{i.emoji}</Text>
                <Text style={styles.issueTitle}>{i.title}</Text>
              </View>
              <Text style={styles.issueBody}>{i.content}</Text>
            </View>
          ))
        )}
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
  completedBlock: {
    backgroundColor: "rgba(16,185,129,0.10)",
    borderColor: "rgba(16,185,129,0.30)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 4,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  completedHeader: { color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 12 },
  completedHint: { color: "rgba(255,255,255,0.55)", fontSize: 10.5, lineHeight: 14 },
  empty: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontStyle: "italic" },
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  rowAge: {
    color: brand.amber400,
    fontWeight: "800",
    fontSize: 11,
    width: 78,
  },
  rowVax: { color: "rgba(255,255,255,0.85)", fontSize: 12, flex: 1, lineHeight: 16 },
  issueCard: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  issueHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  issueEmoji: { fontSize: 16 },
  issueTitle: { color: "#fff", fontWeight: "800", fontSize: 12.5 },
  issueBody: { color: "rgba(255,255,255,0.80)", fontSize: 12, lineHeight: 17 },
});
