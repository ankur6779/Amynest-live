import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { brand, brandAlpha } from "@/constants/colors";

export type Child = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number;
};

function getChildEmoji(age: number): string {
  if (age <= 1) return "👶";
  if (age <= 3) return "🐣";
  if (age <= 6) return "🌱";
  if (age <= 10) return "🌟";
  return "🎒";
}

function formatAge(age: number, ageMonths?: number): string {
  if (age === 0 && ageMonths) return `${ageMonths}m`;
  if (ageMonths && ageMonths > 0) return `${age}y ${ageMonths}m`;
  return `${age} yrs`;
}

function SectionHeader({
  label,
  actionLabel,
  onAction,
}: {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const c = useColors();
  return (
    <View style={sectionHdrStyles.row}>
      <Text style={[sectionHdrStyles.label, { color: c.mutedForeground }]}>{label.toUpperCase()}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={sectionHdrStyles.action}>{actionLabel} →</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const sectionHdrStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 10 },
  label: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1.6 },
  action: { fontSize: 11, fontWeight: "700", color: brand.violet600 },
});

export function ChildrenStrip({
  children,
  onManage,
  onAdd,
}: {
  children: Child[];
  onManage: () => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  if (children.length === 0) return null;
  return (
    <View style={{ marginBottom: 20 }}>
      <SectionHeader label="Your Little Ones" actionLabel="Manage" onAction={onManage} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        style={{ flexDirection: "row" }}
      >
        {children.map((child) => (
          <View
            key={child.id}
            style={[childStripStyles.tile, { borderColor: brandAlpha.violet600_18, backgroundColor: brandAlpha.violet600_04 }]}
          >
            <View style={childStripStyles.avatar}>
              <Text style={childStripStyles.avatarEmoji}>{getChildEmoji(child.age)}</Text>
            </View>
            <Text style={[childStripStyles.name, { color: c.foreground }]} numberOfLines={1}>{child.name}</Text>
            <Text style={[childStripStyles.age, { color: c.mutedForeground }]}>{formatAge(child.age, child.ageMonths)}</Text>
          </View>
        ))}
        <TouchableOpacity onPress={onAdd} style={[childStripStyles.addTile, { borderColor: brandAlpha.violet600_20 }]}>
          <Text style={{ fontSize: 20 }}>➕</Text>
          <Text style={[childStripStyles.addLabel, { color: c.mutedForeground }]}>{t("screens.tabs_index.add_child")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const childStripStyles = StyleSheet.create({
  tile: { width: 110, borderRadius: 16, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brandAlpha.violet600_12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarEmoji: { fontSize: 20 },
  name: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  age: { fontSize: 11, fontWeight: "500", textAlign: "center" },
  addTile: {
    width: 90,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addLabel: { fontSize: 11, fontWeight: "700", textAlign: "center" },
});
