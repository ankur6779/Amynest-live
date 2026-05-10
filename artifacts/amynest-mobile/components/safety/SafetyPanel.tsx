// ─────────────────────────────────────────────────────────────────────────────
// Module 4 — AI Safety Layer — SafetyPanel (Mobile)
//
// Mirrors the web SafetyPanel. Calls /api/safety/validate against the latest
// routine for the active child. Renders score, violations, and suggested
// adjustments.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { brand, palette } from "@/constants/colors";

type AgeBand = "infant" | "toddler" | "preschool" | "school" | "tween";

type RoutineItem = { time?: string; activity?: string; duration?: number; category?: string };
type Routine = { id: number; childId: number; date: string; items: RoutineItem[] };
type Child = { id: number; name: string; dob?: string | null };

type Severity = "info" | "warning" | "critical";
type Violation = { ruleId: string; severity: Severity; message: string };
type Adjustment = { suggestion: string; reason: string };
type SafetyResult = {
  isValid: boolean;
  safetyScore: number;
  violations: Violation[];
  adjustments: Adjustment[];
};

function classifyBand(months: number): AgeBand {
  if (months < 18) return "infant";
  if (months < 36) return "toddler";
  if (months < 60) return "preschool";
  if (months < 132) return "school";
  return "tween";
}

function ageMonthsFromDob(dob?: string | null): number {
  if (!dob) return 84;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 84;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

// audit-ok: brand semantic colours for safety score tier
function scoreColor(score: number): string {
  if (score >= 85) return palette.green500;
  if (score >= 60) return palette.yellow400;
  return palette.red500;
}

// audit-ok: pure white text on coloured run button
const WHITE = "#FFFFFF";

// audit-ok: semantic severity badge colour mapping
function severityBg(sev: Severity): string {
  if (sev === "critical") return palette.red500 + "22";
  if (sev === "warning") return palette.yellow400 + "33";
  return brand.sky300 + "33";
}
function severityFg(sev: Severity): string {
  if (sev === "critical") return palette.red500;
  if (sev === "warning") return palette.yellow400;
  return brand.purple500;
}
function severityIcon(sev: Severity): keyof typeof Ionicons.glyphMap {
  if (sev === "critical") return "shield";
  if (sev === "warning") return "warning";
  return "information-circle";
}

export function SafetyPanel() {
  const { t } = useTranslation();
  const c = useColors();
  const authFetch = useAuthFetch();
  const [result, setResult] = useState<SafetyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: () => authFetch("/api/children").then((r) => r.json() as Promise<Child[]>),
  });
  const { data: routines = [] } = useQuery<Routine[]>({
    queryKey: ["routines", null],
    queryFn: () => authFetch("/api/routines").then((r) => r.json() as Promise<Routine[]>),
  });

  const latestRoutine = useMemo<Routine | null>(() => {
    if (!routines.length) return null;
    return [...routines].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
  }, [routines]);

  async function runValidation() {
    if (!latestRoutine) {
      setError(t("safety.no_routine"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const child = children.find((ch) => ch.id === latestRoutine.childId);
      const ageMonths = ageMonthsFromDob(child?.dob);
      const ageBand = classifyBand(ageMonths);

      let totalSleep = 0;
      let totalScreen = 0;
      let totalOutdoor = 0;
      const activities = (latestRoutine.items ?? []).map((it, i) => {
        const cat = (it.category ?? "general").toLowerCase();
        const title = it.activity ?? "Activity";
        const dur = it.duration ?? 30;
        if (/sleep|nap|bed/.test(cat) || /sleep|nap|bed/i.test(title)) totalSleep += dur;
        if (/screen|tv|tablet|video/.test(cat) || /screen|tv|tablet|video/i.test(title)) totalScreen += dur;
        if (/outdoor|park|play|sport/.test(cat) || /outdoor|park/i.test(title)) totalOutdoor += dur;
        const intensity = /sport|run|active|gym/i.test(title)
          ? "high"
          : /play|walk|chore/i.test(title)
            ? "moderate"
            : "low";
        const m = /(\d{1,2}):(\d{2})/.exec(it.time ?? "");
        const startMinutes = m ? Number(m[1]) * 60 + Number(m[2]) : i * 30;
        return {
          id: `slot-${i}`,
          title,
          startMinutes,
          durationMinutes: dur,
          category: cat,
          intensity,
        };
      });

      const res = await authFetch("/api/safety/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageBand,
          ageMonths,
          activities,
          totalScreenMinutes: totalScreen,
          totalSleepMinutes: totalSleep,
          totalOutdoorMinutes: totalOutdoor,
          caregiverPresent: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult((await res.json()) as SafetyResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("safety.error_generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.titleRow}>
          <Ionicons name="shield-checkmark" size={20} color={brand.purple500} />
          <Text style={[styles.title, { color: c.foreground }]}>{t("safety.title")}</Text>
        </View>
        <Text style={[styles.intro, { color: c.mutedForeground }]}>{t("safety.intro")}</Text>
        <TouchableOpacity
          onPress={runValidation}
          disabled={loading || !latestRoutine}
          activeOpacity={0.85}
          style={[
            styles.runBtn,
            { backgroundColor: brand.purple500, opacity: loading || !latestRoutine ? 0.6 : 1 },
          ]}
          testID="safety-run-check"
        >
          {loading ? (
            <ActivityIndicator color={WHITE} size="small" />
          ) : (
            <Ionicons name="shield-checkmark" size={16} color={WHITE} />
          )}
          <Text style={styles.runBtnText}>
            {loading ? t("safety.checking") : t("safety.run_check")}
          </Text>
        </TouchableOpacity>
        {!latestRoutine && (
          <Text style={[styles.hint, { color: c.mutedForeground }]}>{t("safety.no_routine")}</Text>
        )}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: palette.red500 + "22", borderColor: palette.red500 }]}>
            <Text style={{ color: palette.red500, fontSize: 13 }}>{error}</Text>
          </View>
        )}
      </View>

      {result && (
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: c.foreground }]}>{t("safety.result")}</Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: result.isValid ? palette.green500 + "22" : palette.red500 + "22",
                },
              ]}
            >
              <Ionicons
                name={result.isValid ? "checkmark-circle" : "shield"}
                size={12}
                color={result.isValid ? palette.green500 : palette.red500}
              />
              <Text
                style={{
                  color: result.isValid ? palette.green500 : palette.red500,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {result.isValid ? t("safety.passed") : t("safety.needs_attention")}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNum, { color: scoreColor(result.safetyScore) }]}>
              {result.safetyScore}
            </Text>
            <Text style={[styles.scoreLabel, { color: c.mutedForeground }]}>/ 100</Text>
          </View>

          {result.violations.length === 0 ? (
            <View style={[styles.allClear, { backgroundColor: palette.green500 + "22" }]}>
              <Text style={{ color: palette.green500, fontSize: 13 }}>{t("safety.all_clear")}</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionLabel, { color: c.foreground }]}>
                {t("safety.violations")} ({result.violations.length})
              </Text>
              {result.violations.map((v) => (
                <View
                  key={v.ruleId}
                  style={[styles.vRow, { backgroundColor: severityBg(v.severity) }]}
                >
                  <Ionicons name={severityIcon(v.severity)} size={16} color={severityFg(v.severity)} />
                  <Text style={[styles.vText, { color: severityFg(v.severity) }]}>{v.message}</Text>
                </View>
              ))}
            </View>
          )}

          {result.adjustments.length > 0 && (
            <View style={{ gap: 8, marginTop: 12 }}>
              <Text style={[styles.sectionLabel, { color: c.foreground }]}>
                {t("safety.adjustments")}
              </Text>
              {result.adjustments.map((a, i) => (
                <View
                  key={i}
                  style={[styles.adjBox, { backgroundColor: c.muted, borderColor: c.border }]}
                >
                  <Text style={[styles.adjTitle, { color: c.foreground }]}>{a.suggestion}</Text>
                  <Text style={[styles.adjReason, { color: c.mutedForeground }]}>{a.reason}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  card: { borderRadius: 20, padding: 16, borderWidth: 1, gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", flex: 1 },
  intro: { fontSize: 13, lineHeight: 18 },
  runBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  runBtnText: { color: WHITE, fontWeight: "700", fontSize: 14 },
  hint: { fontSize: 12, marginTop: 4 },
  errorBox: { padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  badge: { flexDirection: "row", gap: 4, alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  scoreNum: { fontSize: 44, fontWeight: "800" },
  scoreLabel: { fontSize: 13 },
  allClear: { padding: 10, borderRadius: 10 },
  sectionLabel: { fontSize: 13, fontWeight: "700" },
  vRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 10, borderRadius: 10 },
  vText: { flex: 1, fontSize: 13, lineHeight: 18 },
  adjBox: { padding: 10, borderRadius: 10, borderWidth: 1 },
  adjTitle: { fontSize: 13, fontWeight: "600" },
  adjReason: { fontSize: 12, marginTop: 2 },
});

export default SafetyPanel;
