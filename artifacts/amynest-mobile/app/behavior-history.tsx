import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  Alert, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, palette } from "@/constants/colors";

type Child = { id: number; name: string };
type Behavior = {
  id: number;
  childId: number;
  childName?: string;
  date: string;
  type: string;
  behavior: string;
  notes?: string | null;
  createdAt?: string;
};

type Filter = "all" | "positive" | "negative" | "neutral";

const TYPE_META: Record<string, { color: string; emoji: string; label: string }> = {
  positive:   { color: palette.emerald500, emoji: "✨", label: "Positive" },
  negative:   { color: palette.red500,     emoji: "⚡", label: "Challenging" },
  neutral:    { color: palette.gray500,    emoji: "•",  label: "Neutral" },
};

function formatDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  const ymd = (x: Date) => x.toISOString().slice(0, 10);
  if (ymd(d) === ymd(today)) return "Today";
  if (ymd(d) === ymd(yest)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function BehaviorHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const authFetch = useAuthFetch();
  const params = useLocalSearchParams<{ childId?: string }>();
  const initialChildId = params.childId ? Number(params.childId) : null;
  const [selectedChild, setSelectedChild] = useState<number | null>(initialChildId);
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: () => authFetch("/api/children").then(r => r.json()),
  });

  const { data: allBehaviors = [], isLoading } = useQuery<Behavior[]>({
    queryKey: ["behaviors"],
    queryFn: () => authFetch("/api/behaviors").then(r => r.json()),
  });

  const filtered = useMemo(() => {
    const cutoffMs = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return allBehaviors
      .filter(b => !selectedChild || b.childId === selectedChild)
      .filter(b => filter === "all" || b.type === filter)
      .filter(b => {
        const t = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
        return t >= cutoffMs;
      })
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
        return tb - ta;
      });
  }, [allBehaviors, selectedChild, filter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Behavior[]>();
    for (const b of filtered) {
      const key = (b.createdAt ? b.createdAt.slice(0, 10) : b.date.slice(0, 10));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(b);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  async function onRefresh() {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["behaviors"] });
    setRefreshing(false);
  }

  function confirmDelete(b: Behavior) {
    Haptics.selectionAsync();
    Alert.alert("Delete entry?", `Remove this ${b.type} log?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const r = await authFetch(`/api/behaviors/${b.id}`, { method: "DELETE" });
            if (!r.ok) throw new Error();
            await qc.invalidateQueries({ queryKey: ["behaviors"] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Could not delete entry.");
          }
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={theme.gradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={22} color={c.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: c.text }]}>Behavior History</Text>
            <Text style={[styles.headerSub, { color: c.textMuted }]}>Last 90 days</Text>
          </View>
        </View>

        {/* Child filter */}
        {children.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <Chip
              label="All children"
              active={selectedChild === null}
              onPress={() => { setSelectedChild(null); Haptics.selectionAsync(); }}
              colors={c}
            />
            {children.map(child => (
              <Chip
                key={child.id}
                label={child.name}
                active={selectedChild === child.id}
                onPress={() => { setSelectedChild(child.id); Haptics.selectionAsync(); }}
                colors={c}
              />
            ))}
          </ScrollView>
        )}

        {/* Type filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {(["all", "positive", "negative", "neutral"] as Filter[]).map(f => (
            <Chip
              key={f}
              label={f === "all" ? "All types" : TYPE_META[f].label}
              active={filter === f}
              onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
              colors={c}
              accent={f !== "all" ? TYPE_META[f].color : undefined}
            />
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={brand.violet500} />
          </View>
        ) : grouped.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="document-text-outline" size={42} color={c.textSubtle} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No history yet</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>
              Log behaviors from the Behavior tab — they'll show up here.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.violet500} />}
          >
            {grouped.map(([dateKey, items]) => (
              <View key={dateKey} style={{ marginBottom: 18 }}>
                <Text style={[styles.dateHeader, { color: c.textMuted }]}>
                  {formatDateGroup(dateKey)} · {items.length}
                </Text>
                {items.map((b) => {
                  const meta = TYPE_META[b.type] ?? TYPE_META.neutral;
                  return (
                    <Pressable
                      key={b.id}
                      onLongPress={() => confirmDelete(b)}
                      style={({ pressed }) => [
                        styles.card,
                        { backgroundColor: c.card, borderColor: c.border },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <View style={[styles.typeDot, { backgroundColor: meta.color + "22", borderColor: meta.color }]}>
                        <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.cardTopRow}>
                          <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                            {b.behavior}
                          </Text>
                          <Text style={[styles.cardTime, { color: c.textSubtle }]}>{formatTime(b.createdAt)}</Text>
                        </View>
                        <View style={styles.cardMetaRow}>
                          <Text style={[styles.cardChild, { color: meta.color }]}>{meta.label}</Text>
                          {b.childName && (
                            <>
                              <Text style={[styles.dot, { color: c.textSubtle }]}>·</Text>
                              <Text style={[styles.cardChild, { color: c.textMuted }]} numberOfLines={1}>
                                {b.childName}
                              </Text>
                            </>
                          )}
                        </View>
                        {b.notes && (
                          <Text style={[styles.cardNotes, { color: c.textMuted }]} numberOfLines={2}>
                            {b.notes}
                          </Text>
                        )}
                      </View>
                      <Pressable onPress={() => confirmDelete(b)} hitSlop={10} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={16} color={c.textSubtle} />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <Text style={[styles.footer, { color: c.textSubtle }]}>
              Long-press or tap the trash icon to delete an entry.
            </Text>
          </ScrollView>
        )}
      </LinearGradient>
    </>
  );
}

function Chip({ label, active, onPress, colors, accent }: {
  label: string; active: boolean; onPress: () => void;
  colors: ReturnType<typeof useColors>; accent?: string;
}) {
  const a = accent ?? brand.violet500;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? a : colors.card, borderColor: active ? a : colors.border },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? "#fff" : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  headerSub: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  chipRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 12.5, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginTop: 6 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  dateHeader: {
    fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6,
    textTransform: "uppercase", marginBottom: 8, paddingLeft: 4,
  },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  typeDot: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
  cardTime: { fontSize: 11, fontWeight: "600" },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  cardChild: { fontSize: 11.5, fontWeight: "700" },
  dot: { fontSize: 12 },
  cardNotes: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  footer: { fontSize: 11, textAlign: "center", marginTop: 8, fontStyle: "italic" },
});
