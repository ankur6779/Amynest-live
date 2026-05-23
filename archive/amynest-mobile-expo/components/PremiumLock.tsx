import React from "react";
import { View, Text, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSubscriptionStore, selectIsPremium } from "@/store/useSubscriptionStore";
import colors, { brand } from "@/constants/colors";

type Props = {
  children: React.ReactNode;
  reason?: string;
  label?: string;
  cta?: string;
  style?: ViewStyle;
  forceLocked?: boolean;
};

export default function PremiumLock({
  children,
  reason = "premium_feature",
  label = "Premium Insight",
  cta = "Unlock Personalized Coaching",
  style,
  forceLocked = false,
}: Props) {
  const router = useRouter();
  const isPremium = useSubscriptionStore(selectIsPremium);

  if (isPremium && !forceLocked) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.dimmed} pointerEvents="none">
        {children}
      </View>
      <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.pill}>
          <Ionicons name="lock-closed" size={11} color={brand.violet600} />
          <Text style={styles.pillText}>{label}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cta}
          onPress={() => router.push({ pathname: "/paywall", params: { reason } })}
          style={({ pressed }) => [styles.ctaWrap, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={[colors.light.primary, colors.light.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Ionicons name="sparkles" size={14} color="#fff" />
            <Text style={styles.ctaText}>{cta}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
  },
  dimmed: {
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
    borderColor: `${brand.violet600}25`,
  },
  pillText: {
    color: brand.violet600,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  ctaWrap: {
    borderRadius: 999,
    shadowColor: colors.light.accent,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
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
