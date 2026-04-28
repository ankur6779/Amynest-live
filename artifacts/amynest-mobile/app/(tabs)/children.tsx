import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";

type Child = {
  id: number; name: string; age: number; ageMonths?: number;
  isSchoolGoing?: boolean; wakeUpTime: string; sleepTime: string;
  foodType?: string; goals: string;
};

function childEmoji(age: number) {
  if (age < 1) return "👶";
  if (age < 4) return "🧒";
  if (age < 10) return "🧑";
  return "👦";
}

function ageLabel(age: number, months = 0) {
  if (age === 0) return `${months} months`;
  return `${age} yr${age !== 1 ? "s" : ""}${months > 0 ? `, ${months}mo` : ""}`;
}

export default function ChildrenScreen() {
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const { data: children = [], isLoading, isError, refetch } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: () => authFetch("/api/children").then(r => r.json()),
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleAddChild = useCallback(() => {
    const ent = useSubscriptionStore.getState().entitlements;
    const cap = ent?.limits.childrenMax ?? 1;
    const isPremium = !!ent?.isPremium;
    const atCap = !isPremium && cap > 0 && children.length >= cap;
    if (atCap) {
      router.push({ pathname: "/paywall", params: { reason: "child_limit" } });
      return;
    }
    router.push("/children/new");
  }, [children.length, router]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Children</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={handleAddChild}
          testID="add-child-fab"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Failed to load children</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.retryBtn, { borderColor: colors.primary }]}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : children.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No children yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add your child's profile to get started</Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            onPress={handleAddChild}
            testID="empty-add-child-btn"
          >
            <Ionicons name="person-add" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Add First Child</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={children}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: botPad + 90, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          scrollEnabled={children.length > 0}
          renderItem={({ item: c }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/children/${c.id}`)}
              testID={`child-item-${c.id}`}
            >
              <View style={[styles.emojiBox, { backgroundColor: colors.secondary }]}>
                <Text style={styles.emoji}>{childEmoji(c.age)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.childName, { color: colors.foreground }]}>{c.name}</Text>
                <Text style={[styles.childMeta, { color: colors.mutedForeground }]}>
                  {ageLabel(c.age, c.ageMonths)} · {c.isSchoolGoing ? "School going" : "Not in school"}
                </Text>
                <View style={styles.tagRow}>
                  <View style={[styles.tag, { backgroundColor: colors.muted }]}>
                    <Ionicons name="sunny-outline" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{c.wakeUpTime}</Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: colors.muted }]}>
                    <Ionicons name="moon-outline" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{c.sleepTime}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 12,
  },
  emojiBox: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 26 },
  childName: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 3 },
  childMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8 },
  tagRow: { flexDirection: "row", gap: 8 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
