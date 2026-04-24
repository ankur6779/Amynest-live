import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Small "Try Free" pill shown on Parent Hub features the user hasn't used
 * yet (and isn't premium). Mirror of the web TryFreeBadge.
 */
export default function TryFreeBadge({ style }: { style?: any }) {
  return (
    <View style={[styles.pill, style]} testID="try-free-badge">
      <Ionicons name="sparkles" size={9} color="#047857" />
      <Text style={styles.text}>Try Free</Text>
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
    color: "#047857",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
