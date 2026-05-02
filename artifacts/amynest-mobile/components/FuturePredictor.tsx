import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, ACCENT_PINK, palette } from "@/constants/colors";

type Severity = "good" | "caution" | "risk";
type Indicator = { label: string; emoji: string; severity: Severity };

type Prediction = {
  generatedAt: string;
  forDate: string;
  childId: number | null;
  childName: string | null;
  mood: Indicator;
  energy: Indicator;
  sleep: Indicator;
  risk: Indicator;
  confidence: "Low" | "Medium" | "High";
  suggestions: string[];
  message: string;
  dataPoints: {
    behaviorsConsidered: number;
    routinesConsidered: number;
    avgRoutineCompletion: number;
    daysOfData: number;
  };
};

const SEV_COLOR: Record<Severity, { bg: string; border: string; text: string; dot: string }> = {
  good:    { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.45)", text: palette.emerald400, dot: palette.emerald500 },
  caution: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.45)", text: palette.amber400,   dot: palette.amber500  },
  risk:    { bg: "rgba(244,63,94,0.18)",  border: "rgba(244,63,94,0.50)",  text: brand.rose400,       dot: palette.rose500   },
};

const CONF_COLOR: Record<Prediction["confidence"], { bg: string; text: string }> = {
  Low:    { bg: "rgba(148,163,184,0.18)", text: palette.slate400 }, // audit-ok: sky-100 confidence chip
  Medium: { bg: "rgba(14,165,233,0.18)",  text: "#7dd3fc"        }, // audit-ok: sky-300 medium conf text
  High:   { bg: "rgba(16,185,129,0.18)",  text: "#6ee7b7"        }, // audit-ok: emerald-300 high conf text
};

const CONF_KEY: Record<Prediction["confidence"], "low" | "medium" | "high"> = {
  Low: "low",
  Medium: "medium",
  High: "high",
};

interface Props {
  childId?: number | null;
  variant?: "full" | "compact";
}

export default function FuturePredictor({ childId, variant = "full" }: Props) {
  const authFetch = useAuthFetch();
  const c = useColors();
  const { mode } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c, mode), [c, mode]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<Prediction>({
    queryKey: ["future-predictor", childId ?? null],
    queryFn: async () => {
      const url = childId ? `/api/future-predictor?childId=${childId}` : `/api/future-predictor`;
      const r = await authFetch(url);
      if (!r.ok) throw new Error(`Failed: ${r.status}`);
      return r.json();
    },
    // Predictions are slow to compute server-side; keep the result fresh
    // for an hour and retain it in the cache for a day so swipes back to
    // the Zones page are network-free.
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <View style={styles.cardLoading}>
        <ActivityIndicator color={brand.purple500} />
        <Text style={styles.loadingText}>{t("parent_hub.predictor.loading")}</Text>
      </View>
    );
  }

  if (isError || !data) return null;

  const indicators: Array<{ key: string; title: string; ind: Indicator }> = [
    { key: "mood",   title: t("parent_hub.predictor.indicators.mood").toUpperCase(),   ind: data.mood },
    { key: "energy", title: t("parent_hub.predictor.indicators.energy").toUpperCase(), ind: data.energy },
    { key: "sleep",  title: t("parent_hub.predictor.indicators.sleep").toUpperCase(),  ind: data.sleep },
    { key: "risk",   title: t("parent_hub.predictor.indicators.risk").toUpperCase(),   ind: data.risk },
  ];

  return (
    <LinearGradient
      colors={["rgba(168,85,247,0.18)", "rgba(236,72,153,0.16)", "rgba(245,158,11,0.14)"]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <LinearGradient
          colors={[brand.amber400, ACCENT_PINK, brand.purple500]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.iconRing}
        >
          <Text style={{ fontSize: 18 }}>🔮</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="sparkles" size={13} color={brand.purple400} />
            <Text style={styles.title}>{t("parent_hub.predictor.title")}</Text>
          </View>
          <Text style={styles.subtitle}>
            {data.childName
              ? t("parent_hub.predictor.for_child", { name: data.childName })
              : t("parent_hub.predictor.family_forecast")} · {data.forDate}
          </Text>
        </View>
        <Pressable
          onPress={() => refetch()}
          disabled={isFetching}
          style={styles.refreshBtn}
          accessibilityLabel={t("parent_hub.predictor.refresh_aria")}
        >
          <Ionicons
            name="refresh"
            size={14}
            color="#fff"
            style={isFetching ? { opacity: 0.5 } : undefined}
          />
        </Pressable>
      </View>

      {/* Amy message — message text comes from the AI backend (out of scope) */}
      <Text style={styles.message}>"{data.message}"</Text>

      {/* Indicators grid */}
      <View style={styles.grid}>
        {indicators.map((it) => {
          const sc = SEV_COLOR[it.ind.severity];
          return (
            <View
              key={it.key}
              style={[
                styles.indCell,
                { backgroundColor: sc.bg, borderColor: sc.border },
              ]}
            >
              <View style={styles.indHeader}>
                <Text style={styles.indLabel}>{it.title}</Text>
                <View style={[styles.dot, { backgroundColor: sc.dot }]} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 18 }}>{it.ind.emoji}</Text>
                <Text style={[styles.indValue, { color: sc.text }]} numberOfLines={2}>
                  {it.ind.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Suggestions */}
      {variant === "full" && data.suggestions.length > 0 && (
        <View style={styles.sugBox}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 }}>
            <Ionicons name="alert-circle" size={11} color="rgba(255,255,255,0.65)" />
            <Text style={styles.sugTitle}>
              {t("parent_hub.predictor.suggestions_title").toUpperCase()}
            </Text>
          </View>
          {data.suggestions.map((s, i) => (
            <View key={i} style={styles.sugRow}>
              <Text style={styles.sugBullet}>·</Text>
              <Text style={styles.sugText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View
          style={[
            styles.confPill,
            { backgroundColor: CONF_COLOR[data.confidence].bg },
          ]}
        >
          <Text style={[styles.confText, { color: CONF_COLOR[data.confidence].text }]}>
            {t(`parent_hub.predictor.confidence.${CONF_KEY[data.confidence]}`)}
            {t("parent_hub.predictor.confidence.suffix")}
          </Text>
        </View>
        <Text style={styles.footerNote}>
          {t("parent_hub.predictor.footer_short", {
            days: data.dataPoints.daysOfData,
            logs: data.dataPoints.behaviorsConsidered,
            routines: data.dataPoints.routinesConsidered,
          })}
        </Text>
      </View>
    </LinearGradient>
  );
}

function makeStyles(c: any, mode: "light" | "dark") {
  const onDarkText = "#fff";
  const lightText = mode === "light" ? palette.gray800 : onDarkText;
  const lightSubtle = mode === "light" ? "rgba(31,41,55,0.7)" : "rgba(255,255,255,0.7)";

  return StyleSheet.create({
    card: {
      borderRadius: 22,
      padding: 16,
      gap: 14,
      borderWidth: 1.5,
      borderColor: "rgba(168,85,247,0.4)",
    },
    cardLoading: {
      borderRadius: 22,
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: "rgba(168,85,247,0.10)",
      borderWidth: 1,
      borderColor: "rgba(168,85,247,0.25)",
    },
    loadingText: { color: lightSubtle, fontSize: 13, fontWeight: "600" },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    iconRing: {
      width: 42, height: 42, borderRadius: 21,
      alignItems: "center", justifyContent: "center",
    },
    title: { color: lightText, fontWeight: "800", fontSize: 14 },
    subtitle: { color: lightSubtle, fontSize: 11, marginTop: 1 },
    refreshBtn: {
      width: 30, height: 30, borderRadius: 15,
      alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    message: {
      color: lightText, fontSize: 14, fontStyle: "italic",
      fontWeight: "600", lineHeight: 20,
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    indCell: {
      flexBasis: "48%",
      flexGrow: 1,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    indHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 3,
    },
    indLabel: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: lightSubtle,
    },
    dot: { width: 7, height: 7, borderRadius: 4 },
    indValue: { fontSize: 13, fontWeight: "700", flex: 1 },
    sugBox: {
      backgroundColor: "rgba(255,255,255,0.06)",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      padding: 11,
    },
    sugTitle: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.7,
      color: lightSubtle,
    },
    sugRow: { flexDirection: "row", gap: 6, marginTop: 4 },
    sugBullet: { color: brand.purple400, fontWeight: "800", fontSize: 14, lineHeight: 18 },
    sugText: { flex: 1, color: lightText, fontSize: 13, lineHeight: 18 },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 6,
    },
    confPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    confText: { fontSize: 11, fontWeight: "800" },
    footerNote: { color: lightSubtle, fontSize: 10.5 },
  });
}
