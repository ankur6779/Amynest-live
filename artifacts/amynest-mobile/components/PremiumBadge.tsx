import React from "react";
import { Pressable, Text, View, StyleSheet, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  /** Tap handler — when provided, the badge becomes pressable (paywall route). */
  onPress?: () => void;
  /** Override label text (defaults to "Premium"). */
  label?: string;
  /** Wrapper style override. */
  style?: ViewStyle;
};

/**
 * Small "Premium" pill shown on Parent Hub features the user has already
 * consumed their one free use of. Mobile twin of the web `<PremiumBadge />`,
 * mirroring the visual weight of `<TryFreeBadge />` but with the locked-feature
 * gradient (purple → pink → amber).
 */
export default function PremiumBadge({ onPress, label = "Premium", style }: Props) {
  const inner = (
    <LinearGradient
      colors={["#7B3FF2", "#EC4899", "#F59E0B"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.pill, style]}
    >
      <Ionicons name="sparkles" size={9} color="#fff" />
      <Text style={styles.text}>{label}</Text>
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label} feature, tap to upgrade`}
        testID="premium-badge"
        hitSlop={12}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View testID="premium-badge">
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    color: "#fff",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
