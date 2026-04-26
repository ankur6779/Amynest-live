import React from "react";
import { View, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import PremiumBadge from "@/components/PremiumBadge";

type Props = {
  /** True after the user has consumed their one free use of this feature. */
  locked: boolean;
  /** Reason passed to /paywall (used for analytics + paywall headline). */
  reason?: string;
  label?: string;
  cta?: string;
  radius?: number;
  style?: ViewStyle;
  children: React.ReactNode;
};

/**
 * Mobile twin of the web <LockedBlock>.
 *
 * locked=false → children rendered fully interactive (free first-use OR premium)
 * locked=true  → children visible but an absolute Pressable overlay covers the
 *                 entire tile and intercepts every touch, routing to /paywall.
 *                 The "Premium" badge sits above the overlay so it stays tappable.
 *
 * This prevents free users from expanding (or interacting with) a section
 * after their one free use has been consumed.
 */
export default function LockedBlock({
  locked,
  reason = "section_locked",
  radius = 22,
  style,
  children,
}: Props) {
  const router = useRouter();

  if (!locked) return <>{children}</>;

  const goPaywall = () =>
    router.push({ pathname: "/paywall", params: { reason } });

  return (
    <View
      style={[styles.wrap, { borderRadius: radius }, style]}
      testID="locked-block"
    >
      {/* Section renders visually in its collapsed state */}
      <View pointerEvents="none">
        {children}
      </View>

      {/* Full-cover Pressable — intercepts every touch, opens paywall */}
      <Pressable
        onPress={goPaywall}
        style={styles.overlay}
        accessibilityLabel="Premium feature — tap to unlock"
        accessibilityRole="button"
      />

      {/* Premium badge — above the overlay so it stays tappable */}
      <View style={styles.badgeAnchor} pointerEvents="box-none">
        <PremiumBadge onPress={goPaywall} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    borderRadius: 22,
  },
  badgeAnchor: {
    position: "absolute",
    top: 12,
    right: 50,
    zIndex: 10,
  },
});
