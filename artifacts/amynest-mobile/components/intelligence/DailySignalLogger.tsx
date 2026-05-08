/**
 * DailySignalLogger (mobile) — Phase 1 of the Adaptive Family Intelligence Engine.
 *
 * Quick mood / focus / sleep buttons (1–5) for the active child. Each tap
 * POSTs /api/child-intelligence/:childId/signal so tomorrow's routine
 * generation can adapt.
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";

type ScaleField = "mood" | "focusScore" | "sleepQuality";
type Child = { id: number; name: string };
type SignalEntry = {
  date: string;
  mood: number | null;
  focusScore: number | null;
  sleepQuality: number | null;
};
type Snapshot = { recentSignals: SignalEntry[] };

function todayStr(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function DailySignalLogger({ childId: childIdProp }: { childId?: number }) {
  const { t } = useTranslation();
  const c = useColors();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ["children"],
    enabled: childIdProp == null,
    queryFn: () => authFetch("/api/children").then((r) => r.json() as Promise<Child[]>),
  });
  const [activeId, setActiveId] = useState<number | null>(null);
  const childId = childIdProp ?? activeId ?? children[0]?.id ?? null;

  const { data: snap } = useQuery<Snapshot>({
    queryKey: ["child-intelligence", childId],
    enabled: !!childId,
    queryFn: () =>
      authFetch(`/api/child-intelligence/${childId}`).then(
        (r) => r.json() as Promise<Snapshot>,
      ),
  });

  const mutation = useMutation({
    mutationFn: async (vars: { childId: number; body: Record<string, unknown> }) => {
      const r = await authFetch(`/api/child-intelligence/${vars.childId}/signal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: todayStr(), ...vars.body }),
      });
      if (!r.ok) throw new Error("save failed");
      return r.json();
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["child-intelligence", vars.childId] }),
  });

  if (!childId && childIdProp == null && children.length === 0) return null;

  const today = todayStr();
  const todays = (snap?.recentSignals ?? []).find((s) => s.date === today);

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.header}>
        <Ionicons name="pulse-outline" size={16} color={c.primary} />
        <Text style={[styles.title, { color: c.text }]}>{t("intelligence.signal.title")}</Text>
        {mutation.isPending && <ActivityIndicator size="small" color={c.primary} />}
      </View>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        {t("intelligence.signal.subtitle")}
      </Text>

      {childIdProp == null && children.length > 1 && (
        <View style={styles.row}>
          {children.map((cd) => {
            const on = (activeId ?? children[0]?.id) === cd.id;
            return (
              <TouchableOpacity
                key={cd.id}
                onPress={() => setActiveId(cd.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? c.primary : c.muted,
                    borderColor: on ? c.primary : c.border,
                  },
                ]}
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, { color: on ? c.primaryForeground : c.text }]}>
                  {cd.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {(["mood", "focusScore", "sleepQuality"] as const).map((field) => {
        const cur = todays?.[field] ?? null;
        return (
          <View key={field} style={styles.field}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>
              {t(`intelligence.signal.fields.${field}`)}
            </Text>
            <View style={styles.scaleRow}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = cur === n;
                return (
                  <TouchableOpacity
                    key={n}
                    onPress={() => childId && mutation.mutate({ childId, body: { [field]: n } })}
                    disabled={mutation.isPending}
                    activeOpacity={0.7}
                    accessibilityLabel={t(`intelligence.signal.scale.${n}`)}
                    style={[
                      styles.scaleBtn,
                      {
                        backgroundColor: on ? c.primary : c.muted,
                        borderColor: on ? c.primary : c.border,
                        opacity: mutation.isPending ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scaleText,
                        { color: on ? c.primaryForeground : c.text },
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", flex: 1 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "700" },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  scaleRow: { flexDirection: "row", gap: 6 },
  scaleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  scaleText: { fontSize: 14, fontWeight: "700" },
});
