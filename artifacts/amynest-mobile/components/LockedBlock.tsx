import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import PremiumBadge from "@/components/PremiumBadge";

type Props = {
  /** True after the user has consumed their one free use of this feature. */
  locked: boolean;
  /** Reason passed to /paywall (used for analytics + paywall headline). */
  reason?: string;
  /**
   * Older props (kept for API compatibility — they used to drive the
   * blurred-overlay copy and are now unused). Safe to omit.
   */
  label?: string;
  cta?: string;
  radius?: number;
  style?: ViewStyle;
  children: React.ReactNode;
};

/**
 * Mobile twin of the web `<LockedBlock>`. Children are ALWAYS rendered
 * passthrough — the section is fully visible and interactive at all times.
 * When `locked=true`, a small "Premium" pill is floated in the top-right
 * corner; tapping it pushes to /paywall. Premium users (locked=false) see no
 * badge.
 *
 * Replaces the previous BlurView + dim overlay treatment per product
 * feedback — the user wants the surface visible after the free trial is
 * consumed and only a non-intrusive Premium hint shown.
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

  return (
    <View
      style={[styles.wrap, { borderRadius: radius }, style]}
      testID="locked-block"
    >
      {children}
      <View style={styles.badgeAnchor} pointerEvents="box-none">
        <PremiumBadge
          onPress={() =>
            router.push({ pathname: "/paywall", params: { reason } })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
  },
  badgeAnchor: {
    // Anchored just before the Section's right-side chevron control so the
    // two never overlap. The chevron sits ~right:14-42px; the badge starts
    // at right:50 and stays clear.
    position: "absolute",
    top: 12,
    right: 50,
    zIndex: 10,
  },
});
