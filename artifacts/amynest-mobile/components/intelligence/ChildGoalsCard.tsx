/**
 * ChildGoalsCard (mobile) — Phase 1 of the Adaptive Family Intelligence Engine.
 *
 * Mirrors the web component. 5 chips → toggle parent-selected goals →
 * PUT /api/child-intelligence/:childId/goals.
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";

const GOAL_CODES = [
  "improve_sleep",
  "reduce_tantrums",
  "improve_focus",
  "reduce_screen_time",
  "increase_independence",
] as const;
type GoalCode = (typeof GOAL_CODES)[number];

type Snapshot = { parentGoals: string[] };

export function ChildGoalsCard({ childId }: { childId: number }) {
  const { t } = useTranslation();
  const c = useColors();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Snapshot>({
    queryKey: ["child-intelligence", childId],
    enabled: childId > 0,
    queryFn: () =>
      authFetch(`/api/child-intelligence/${childId}`).then((r) => r.json() as Promise<Snapshot>),
  });

  const mutation = useMutation({
    mutationFn: async (next: GoalCode[]) => {
      const r = await authFetch(`/api/child-intelligence/${childId}/goals`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parentGoals: next }),
      });
      if (!r.ok) throw new Error("save failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child-intelligence", childId] }),
  });

  const selected = new Set<GoalCode>(
    ((data?.parentGoals ?? []) as string[]).filter(
      (g): g is GoalCode => (GOAL_CODES as readonly string[]).includes(g),
    ),
  );

  function toggle(code: GoalCode) {
    if (childId <= 0 || mutation.isPending) return;
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    mutation.mutate(Array.from(next));
  }

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles-outline" size={16} color={c.primary} />
        <Text style={[styles.title, { color: c.text }]}>{t("intelligence.goals.title")}</Text>
        {(isLoading || mutation.isPending) && <ActivityIndicator size="small" color={c.primary} />}
      </View>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        {t("intelligence.goals.subtitle")}
      </Text>
      <View style={styles.chips}>
        {GOAL_CODES.map((code) => {
          const on = selected.has(code);
          return (
            <TouchableOpacity
              key={code}
              activeOpacity={0.7}
              onPress={() => toggle(code)}
              disabled={isLoading || mutation.isPending}
              style={[
                styles.chip,
                {
                  backgroundColor: on ? c.primary : c.muted,
                  borderColor: on ? c.primary : c.border,
                  opacity: isLoading || mutation.isPending ? 0.6 : 1,
                },
              ]}
              accessibilityState={{ selected: on }}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: on ? c.primaryForeground : c.text },
                ]}
              >
                {t(`intelligence.goals.options.${code}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", flex: 1 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600" },
});
