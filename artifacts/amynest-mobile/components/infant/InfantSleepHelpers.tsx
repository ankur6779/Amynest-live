import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  getWakeSpec,
  getSleepIssuePreviews,
  getRoutinePreview,
} from "@workspace/infant-hub";
import { brand, palette } from "@/constants/colors";

type Props = { ageMonths: number };

/** Mobile twin of the web Sleep helpers strip: wake-window guidance, common
 *  sleep-issue preview, and a routine preview seeded from the wake-window
 *  spec. */
export default function InfantSleepHelpers({ ageMonths }: Props) {
  const { t } = useTranslation();
  const spec = getWakeSpec(ageMonths);
  const issues = getSleepIssuePreviews(ageMonths);
  const routine = getRoutinePreview(ageMonths);

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.specBlock}>
        <View style={styles.head}>
          <Ionicons name="time-outline" size={14} color={brand.amber400} />
          <Text style={styles.headTitle}>
            {t("infant_hub.sleep_helpers.wake_window_title", { range: spec.range })}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Stat
            label={t("infant_hub.sleep_helpers.stat_wake_window")}
            value={t("infant_hub.sleep_helpers.stat_window_value", {
              min: spec.windowMin,
              max: spec.windowMax,
            })}
          />
          <Stat
            label={t("infant_hub.sleep_helpers.stat_naps_per_day")}
            value={String(spec.napCount)}
          />
        </View>
        <View style={styles.statRow}>
          <Stat
            label={t("infant_hub.sleep_helpers.stat_avg_nap")}
            value={t("infant_hub.sleep_helpers.stat_avg_value", { min: spec.napDurMin })}
          />
          <Stat
            label={t("infant_hub.sleep_helpers.stat_day_sleep")}
            value={t("infant_hub.sleep_helpers.stat_day_value", {
              hrs: Math.round(spec.totalDayMin / 60),
            })}
          />
        </View>
        <View style={styles.nightRow}>
          <Ionicons name="moon" size={12} color={brand.violet200} />
          <Text style={styles.nightText}>
            {t("infant_hub.sleep_helpers.night_target", { hrs: spec.nightSleepHrs })}
          </Text>
        </View>
      </View>

      <View style={styles.block}>
        <View style={styles.head}>
          <MaterialCommunityIcons name="alert-decagram-outline" size={14} color={palette.amber400} />
          <Text style={styles.headTitle}>{t("infant_hub.sleep_helpers.watch_for")}</Text>
        </View>
        {issues.length === 0 ? (
          <Text style={styles.empty}>{t("infant_hub.sleep_helpers.no_issues")}</Text>
        ) : (
          issues.map((i) => (
            <View key={i.id} style={styles.issueCard}>
              <View style={styles.issueHead}>
                <Text style={styles.issueEmoji}>{i.emoji}</Text>
                <Text style={styles.issueTitle}>{i.title}</Text>
              </View>
              <Text style={styles.issueDetail}>{i.detail}</Text>
              <View style={styles.tipRow}>
                <Ionicons name="bulb-outline" size={12} color={palette.emerald400} />
                <Text style={styles.tipText}>{i.tip}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.block}>
        <View style={styles.head}>
          <Ionicons name="list-outline" size={14} color={palette.emerald400} />
          <Text style={styles.headTitle}>{t("infant_hub.sleep_helpers.routine_title")}</Text>
        </View>
        <Text style={styles.empty}>{t("infant_hub.sleep_helpers.routine_intro")}</Text>
        <View style={{ gap: 4 }}>
          {routine.map((r) => (
            <View key={r.id} style={styles.routineRow}>
              <Text style={styles.routineEmoji}>{r.emoji}</Text>
              <Text style={styles.routineTime}>{r.time}</Text>
              <Text style={styles.routineActivity}>{r.activity}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  specBlock: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
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
  empty: { color: "rgba(255,255,255,0.6)", fontSize: 11.5, fontStyle: "italic" },

  statRow: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.20)",
    borderRadius: 10,
    padding: 8,
    gap: 2,
  },
  statLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statValue: { color: "#fff", fontWeight: "800", fontSize: 13 },
  nightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${brand.purple500}18`,
    borderColor: `${brand.purple500}40`,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  nightText: { color: brand.violet200, fontWeight: "700", fontSize: 11.5 },

  issueCard: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  issueHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  issueEmoji: { fontSize: 16 },
  issueTitle: { color: "#fff", fontWeight: "800", fontSize: 12 },
  issueDetail: { color: "rgba(255,255,255,0.75)", fontSize: 11.5, lineHeight: 15 },
  tipRow: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: `${palette.emerald500}1F`,
    borderRadius: 8,
    padding: 6,
  },
  tipText: { color: "#fff", fontSize: 11, lineHeight: 15, flex: 1 },

  routineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  routineEmoji: { fontSize: 14, width: 18, textAlign: "center" },
  routineTime: {
    color: brand.amber400,
    fontWeight: "800",
    fontSize: 11,
    width: 70,
  },
  routineActivity: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    flex: 1,
  },
});
