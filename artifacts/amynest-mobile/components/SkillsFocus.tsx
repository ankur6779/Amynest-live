import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { ageMonthsToGroup, SKILL_FOCUS_BY_GROUP } from "@workspace/age-content";
import { useTranslation } from "react-i18next";

export function SkillsFocus({ ageMonths = 60 }: { ageMonths?: number }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const group = ageMonthsToGroup(ageMonths);
  const skills = SKILL_FOCUS_BY_GROUP[group];

  const { t } = useTranslation();
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.lead}>{t("components.skills_focus.4_high_impact_areas_to_focus_on_this_wee")}</Text>
      {skills.map((sk) => (
        <View key={sk.skill} style={s.card}>
          <Text style={s.emoji}>{sk.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{sk.skill}</Text>
            <Text style={s.activity}>{sk.activity}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    lead: { color: c.textMuted, fontSize: 12.5, marginBottom: 2 },
    card: {
      flexDirection: "row",
      gap: 12,
      backgroundColor: c.calloutBg,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: c.glassBorder,
      alignItems: "flex-start",
    },
    emoji: { fontSize: 28 },
    title: { color: c.foreground, fontSize: 14, fontWeight: "800", marginBottom: 3 },
    activity: { color: c.textBody, fontSize: 12.5, lineHeight: 18 },
  });
}
