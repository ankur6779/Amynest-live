import React from "react";
import { View, Text, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { brand } from "@/constants/colors";

type Props = {
  /** When true, blur + lock the children. When false, render passthrough. */
  locked: boolean;
  /** Reason passed to /paywall (used for analytics + paywall headline). */
  reason?: string;
  /** Pill text shown above the CTA. */
  label?: string;
  /** Button text. */
  cta?: string;
  /** Override radius. */
  radius?: number;
  /** Wrapper style. */
  style?: ViewStyle;
  children: React.ReactNode;
};

/**
 * Mobile twin of the web `<LockedBlock>`. Wrap any block — when `locked`,
 * shows a blurred, dimmed copy with a Premium pill + Unlock CTA that pushes
 * to /paywall. Premium users (locked=false) get a transparent passthrough.
 */
export default function LockedBlock({
  locked,
  reason = "section_locked",
  label = "Unlock to continue",
  cta = "Unlock Premium",
  radius = 22,
  style,
  children,
}: Props) {
  const router = useRouter();

  if (!locked) return <>{children}</>;

  return (
    <View
      style={[styles.wrap, { borderRadius: radius }, style]}
      testID="locked-block"
    >
      <View style={styles.dim} pointerEvents="none">
        {children}
      </View>
      <BlurView intensity={26} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <Pressable
        onPress={() =>
          router.push({ pathname: "/paywall", params: { reason } })
        }
        style={styles.overlay}
        accessibilityRole="button"
        accessibilityLabel={cta}
        testID="locked-block-cta"
      >
        <View style={styles.pill}>
          <Ionicons name="lock-closed" size={11} color={brand.violet600} />
          <Text style={styles.pillText}>{label}</Text>
        </View>
        <LinearGradient
          colors={["#7B3FF2", "#EC4899", "#F59E0B"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.cta}
        >
          <Ionicons name="sparkles" size={14} color="#fff" />
          <Text style={styles.ctaText}>{cta}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "hidden",
  },
  dim: {
    opacity: 0.45,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${brand.violet600}30`,
  },
  pillText: {
    color: brand.violet600,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  ctaText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
});
