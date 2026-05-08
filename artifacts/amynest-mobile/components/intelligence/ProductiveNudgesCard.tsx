/**
 * ProductiveNudgesCard (mobile) — Phase 4 of the Adaptive Family Intelligence
 * Engine. Mirrors the web component using raw useAuthFetch + react query.
 *
 * Hidden when the API returns no nudges to keep the routines page calm.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";

const MAX_VISIBLE = 3;

type NudgeKind =
  | "risk_window"
  | "goal_slipping"
  | "demote"
  | "weak_slot"
  | "boost"
  | "streak"
  | "goal_up";

type Nudge = {
  id: string;
  kind: NudgeKind;
  priority: number;
  suggestionCode: string;
  category?: string | null;
  hour?: number | null;
  goal?: string | null;
  value?: number | null;
};

type NudgesResponse = {
  childId: number;
  nudges: Nudge[];
  computedAt: string;
};

const KIND_ICON: Record<NudgeKind, keyof typeof Ionicons.glyphMap> = {
  risk_window: "alert-circle-outline",
  goal_slipping: "trending-down-outline",
  demote: "trending-down-outline",
  weak_slot: "time-outline",
  boost: "trending-up-outline",
  streak: "flame-outline",
  goal_up: "trophy-outline",
};

type Tone = "danger" | "warn" | "primary";
const KIND_TONE: Record<NudgeKind, Tone> = {
  risk_window: "danger",
  goal_slipping: "danger",
  demote: "warn",
  weak_slot: "warn",
  boost: "primary",
  streak: "primary",
  goal_up: "primary",
};

export function ProductiveNudgesCard({ childId }: { childId: number | null }) {
  const { t } = useTranslation();
  const c = useColors();
  const authFetch = useAuthFetch();

  const { data, isLoading } = useQuery<NudgesResponse>({
    queryKey: ["child-intelligence", childId, "nudges"],
    enabled: !!childId && childId > 0,
    queryFn: () =>
      authFetch(`/api/child-intelligence/${childId}/nudges`).then(
        (r) => r.json() as Promise<NudgesResponse>,
      ),
  });

  if (!childId || childId <= 0) return null;
  const nudges = (data?.nudges ?? []).slice(0, MAX_VISIBLE);
  if (!isLoading && nudges.length === 0) return null;

  const toneColor = (tone: Tone): string => {
    if (tone === "danger") return c.destructive ?? c.text;
    if (tone === "warn") return c.secondaryForeground ?? c.text;
    return c.primary;
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles-outline" size={16} color={c.primary} />
        <Text style={[styles.title, { color: c.text }]}>
          {t("intelligence.nudges.title")}
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        {t("intelligence.nudges.subtitle")}
      </Text>

      <View style={{ gap: 10 }}>
        {nudges.map((n) => {
          const tone = toneColor(KIND_TONE[n.kind]);
          const params = {
            hour: n.hour != null ? String(n.hour).padStart(2, "0") : "",
            category: n.category ?? "",
            goal: n.goal ?? "",
            value: n.value ?? 0,
          };
          const body = t(
            [
              `intelligence.nudges.suggestion.${n.suggestionCode}`,
              `intelligence.nudges.fallback.${n.kind}`,
            ],
            params,
          );
          return (
            <View
              key={n.id}
              style={[
                styles.row,
                { backgroundColor: c.background, borderColor: c.border },
              ]}
            >
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: tone + "1A", borderColor: tone + "33" },
                ]}
              >
                <Ionicons name={KIND_ICON[n.kind]} size={16} color={tone} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View
                  style={[
                    styles.kindChip,
                    { backgroundColor: tone + "1A", borderColor: tone + "33" },
                  ]}
                >
                  <Text style={[styles.kindChipText, { color: tone }]}>
                    {t(`intelligence.nudges.kind.${n.kind}`)}
                  </Text>
                </View>
                <Text style={[styles.body, { color: c.text }]}>{body}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", flex: 1 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  row: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  kindChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  kindChipText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  body: { fontSize: 13, lineHeight: 18 },
});
