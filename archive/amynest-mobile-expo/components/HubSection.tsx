import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { brand } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  delay?: number;
  children: React.ReactNode;
};

export default function HubSection({
  title,
  subtitle,
  actionLabel,
  onAction,
  delay = 0,
  children,
}: Props) {
  const c = useColors();
  return (
    <Animated.View entering={FadeInDown.duration(500).delay(delay)} style={styles.section}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.textStrong }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: c.textSubtle }]}>{subtitle}</Text>}
        </View>
        {actionLabel && onAction && (
          <TouchableOpacity
            onPress={onAction}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={styles.actionBtn}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={14} color={brand.violet600} />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 26,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionText: {
    color: brand.violet600,
    fontSize: 13,
    fontWeight: "700",
  },
});
