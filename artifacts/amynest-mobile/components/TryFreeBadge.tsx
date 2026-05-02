import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { palette } from "@/constants/colors";

/**
 * Small "Try Free" pill shown on Parent Hub features the user hasn't used
 * yet (and isn't premium). Mirror of the web TryFreeBadge.
 */
export default function TryFreeBadge({ style }: { style?: any }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.pill, style]} testID="try-free-badge">
      <Ionicons name="sparkles" size={9} color={palette.emerald700} />
      <Text style={styles.text}>{t("parent_hub.badges.try_free")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16,185,129,0.18)",
    borderColor: "rgba(16,185,129,0.45)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    color: palette.emerald700,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
