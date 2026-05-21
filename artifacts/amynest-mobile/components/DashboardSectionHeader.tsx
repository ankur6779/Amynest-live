import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { brand } from "@/constants/colors";

type Props = {
  label: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  actionLabel?: string;
  onAction?: () => void;
  rightSlot?: React.ReactNode;
};

export function DashboardSectionHeader({
  label,
  subtitle,
  icon,
  accentColor = brand.violet500,
  actionLabel,
  onAction,
  rightSlot,
}: Props) {
  const c = useColors();
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <View style={styles.titleRow}>
          <View style={[styles.accent, { backgroundColor: accentColor }]} />
          {icon ? <Ionicons name={icon} size={16} color={accentColor} /> : null}
          <Text style={[styles.label, { color: c.foreground }]}>{label}</Text>
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {rightSlot}
        {actionLabel && onAction ? (
          <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.action}>{actionLabel} →</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 12,
  },
  left: { flex: 1, minWidth: 0 },
  right: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  accent: { width: 3, height: 14, borderRadius: 2 },
  label: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  subtitle: { fontSize: 11.5, fontWeight: "500", marginTop: 4, marginLeft: 27 },
  action: { fontSize: 11, fontWeight: "700", color: brand.violet600 },
});
