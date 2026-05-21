import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { brand, brandAlpha } from "@/constants/colors";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";

export type Child = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number;
};

export type ChildTodayProgress = {
  done: number;
  total: number;
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

export function ChildrenStrip({
  children,
  selectedChildId,
  onSelectChild,
  onPressChild,
  progressByChildId,
  onManage,
  onAdd,
}: {
  children: Child[];
  selectedChildId?: number | null;
  onSelectChild?: (childId: number | null) => void;
  onPressChild?: (childId: number) => void;
  progressByChildId?: Record<number, ChildTodayProgress>;
  onManage: () => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  if (children.length === 0) return null;

  const showAllPill = children.length > 1 && onSelectChild;

  return (
    <View style={{ marginBottom: 20 }}>
      <DashboardSectionHeader
        label={t("dashboard.your_little_ones")}
        icon="people-outline"
        accentColor={brand.pink400}
        actionLabel={t("dashboard.manage")}
        onAction={onManage}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        nestedScrollEnabled
      >
        {showAllPill ? (
          <Pressable
            onPress={() => onSelectChild?.(null)}
            style={[
              childStripStyles.tile,
              selectedChildId == null && childStripStyles.tileSelected,
              {
                borderColor: selectedChildId == null ? brand.violet500 : brandAlpha.violet600_18,
                backgroundColor: selectedChildId == null ? brandAlpha.violet600_12 : brandAlpha.violet600_04,
              },
            ]}
          >
            <View style={childStripStyles.avatar}>
              <Text style={childStripStyles.avatarEmoji}>👨‍👩‍👧</Text>
            </View>
            <Text style={[childStripStyles.name, { color: c.foreground }]} numberOfLines={1}>
              {t("dashboard.all_children")}
            </Text>
          </Pressable>
        ) : null}
        {children.map((child) => {
          const selected = selectedChildId === child.id;
          const prog = progressByChildId?.[child.id];
          const progressLabel =
            prog && prog.total > 0
              ? t("dashboard.tasks_today_short", { done: prog.done, total: prog.total })
              : prog && prog.total === 0
                ? "—"
                : null;
          return (
            <Pressable
              key={child.id}
              onPress={() => {
                if (selected && onPressChild) onPressChild(child.id);
                else onSelectChild?.(child.id);
              }}
              onLongPress={() => onPressChild?.(child.id)}
              style={[
                childStripStyles.tile,
                selected && childStripStyles.tileSelected,
                {
                  borderColor: selected ? brand.violet500 : brandAlpha.violet600_18,
                  backgroundColor: selected ? brandAlpha.violet600_12 : brandAlpha.violet600_04,
                },
              ]}
            >
              <View style={childStripStyles.avatar}>
                <Text style={childStripStyles.avatarEmoji}>{getChildEmoji(child.age)}</Text>
                {prog && prog.total > 0 ? (
                  <View
                    style={[
                      childStripStyles.progressDot,
                      {
                        backgroundColor:
                          prog.done >= prog.total ? brand.purple500 : brandAlpha.violet600_18,
                      },
                    ]}
                  />
                ) : null}
              </View>
              <Text style={[childStripStyles.name, { color: c.foreground }]} numberOfLines={1}>
                {child.name}
              </Text>
              <Text style={[childStripStyles.age, { color: c.mutedForeground }]}>
                {formatAge(child.age, child.ageMonths)}
              </Text>
              {progressLabel ? (
                <Text style={[childStripStyles.progress, { color: brand.violet600 }]}>{progressLabel}</Text>
              ) : null}
            </Pressable>
          );
        })}
        <TouchableOpacity onPress={onAdd} style={[childStripStyles.addTile, { borderColor: brandAlpha.violet600_20 }]}>
          <Text style={{ fontSize: 20 }}>➕</Text>
          <Text style={[childStripStyles.addLabel, { color: c.mutedForeground }]}>{t("dashboard.add_child")}</Text>
        </TouchableOpacity>
      </ScrollView>
      {selectedChildId != null && children.length > 1 ? (
        <TouchableOpacity
          onPress={() => onSelectChild?.(null)}
          style={childStripStyles.clearFilter}
          activeOpacity={0.7}
        >
          <Text style={[childStripStyles.clearFilterText, { color: brand.violet600 }]}>
            {t("dashboard.clear_filter")}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const childStripStyles = StyleSheet.create({
  tile: {
    width: 110,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  tileSelected: {
    borderWidth: 1.5,
  },
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
  progressDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
  },
  name: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  age: { fontSize: 11, fontWeight: "500", textAlign: "center" },
  progress: { fontSize: 10, fontWeight: "800", textAlign: "center", marginTop: 2 },
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
  clearFilter: { alignSelf: "center", marginTop: 8, paddingVertical: 4 },
  clearFilterText: { fontSize: 11, fontWeight: "700" },
});
