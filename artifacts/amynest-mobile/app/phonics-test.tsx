import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { palette } from "@/constants/colors";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { API_BASE_URL } from "@/constants/api";
import { PhonicsTestRunner, type TestType } from "@/components/PhonicsTestRunner";
import { useTranslation } from "react-i18next";

// ─── Types ───────────────────────────────────────────────────────────────────

type Child = { id: number; name: string; age: number; ageMonths?: number };

interface AvailabilityState {
  ageGroup: string | null;
  eligible: boolean;
  child?: { id: number; name: string };
  daily: { available: boolean; lastCompletedAt: string | null; nextAvailableAt: string | null; lastScore: { accuracyPct: number; label: string } | null };
  weekly: { available: boolean; lastCompletedAt: string | null; nextAvailableAt: string | null; lastScore: { accuracyPct: number; label: string } | null };
}

function formatCountdown(target: string | null): string | null {
  if (!target) return null;
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return null;
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  return `${totalMin}m`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PhonicsTestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId?: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const authFetch = useAuthFetch();
  const { t } = useTranslation();

  const [children, setChildren] = useState<Child[] | null>(null);
  const [activeChildId, setActiveChildId] = useState<number | null>(null);
  const [availability, setAvailability] = useState<AvailabilityState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<TestType | null>(null);

  // Step 1: load children, pick active.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await authFetch(`${API_BASE_URL}/api/children`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list: Child[] = Array.isArray(json?.children) ? json.children : (Array.isArray(json) ? json : []);
        if (cancelled) return;
        setChildren(list);
        if (list.length === 0) {
          setError(t("screens.phonics_test.no_children"));
          setLoading(false);
          return;
        }
        const initial =
          (params.childId ? Number(params.childId) : NaN) ||
          list[0].id;
        setActiveChildId(Number.isFinite(initial) ? initial : list[0].id);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("screens.phonics_test.load_failed"));
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [authFetch, params.childId]);

  // Step 2: when active child changes, refresh availability.
  const refreshAvailability = useCallback(async () => {
    if (!activeChildId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`${API_BASE_URL}/api/phonics/tests/availability/${activeChildId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AvailabilityState;
      setAvailability(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("screens.phonics_test.avail_failed"));
    } finally {
      setLoading(false);
    }
  }, [authFetch, activeChildId]);

  useEffect(() => {
    void refreshAvailability();
  }, [refreshAvailability]);

  const activeChild = children?.find((c) => c.id === activeChildId) ?? null;

  // ─── Render: in-test runner takes over the whole screen ──────────────────

  if (activeTest && activeChild) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <LinearGradient
          colors={theme.gradient}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <Stack.Screen options={{ headerShown: false }} />
        <PhonicsTestRunner
          childId={activeChild.id}
          childName={activeChild.name}
          testType={activeTest}
          onCompleted={() => { void refreshAvailability(); }}
          onCancel={() => setActiveTest(null)}
        />
      </View>
    );
  }

  // ─── Render: picker/landing screen ───────────────────────────────────────

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <LinearGradient
        colors={theme.gradient}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>{t("screens.phonics_test.title")}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          {t("screens.phonics_test.subtitle")}
        </Text>

        {/* Child switcher */}
        {children && children.length > 1 && (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.sectionLabel, { color: theme.text.muted }]}>{t("screens.phonics_test.child_label")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {children.map((c) => {
                const sel = c.id === activeChildId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setActiveChildId(c.id)}
                    style={[
                      styles.childChip,
                      {
                        backgroundColor: sel ? theme.brand.primary : theme.card.bg,
                        borderColor: sel ? theme.brand.primary : theme.card.border,
                      },
                    ]}
                  >
                    <Text style={{ color: sel ? "#fff" : theme.text.primary, fontWeight: "700" }}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {loading && (
          <View style={{ paddingVertical: 30, alignItems: "center" }}>
            <ActivityIndicator size="large" color={theme.brand.primary} />
          </View>
        )}

        {error && !loading && (
          <View style={[styles.errorBox, { backgroundColor: theme.card.bg, borderColor: theme.card.border }]}>
            <Ionicons name="alert-circle-outline" size={22} color={theme.status.danger} />
            <Text style={[styles.errorText, { color: theme.text.primary }]}>{error}</Text>
          </View>
        )}

        {!loading && availability && !availability.eligible && (
          <View style={[styles.infoBox, { backgroundColor: theme.card.bg, borderColor: theme.card.border }]}>
            <Ionicons name="information-circle-outline" size={22} color={theme.brand.primary} />
            <Text style={[styles.infoText, { color: theme.text.primary }]}>
              {t("screens.phonics_test.out_of_range", { name: activeChild?.name ?? t("screens.phonics_test.this_child") })}
            </Text>
          </View>
        )}

        {!loading && availability?.eligible && (
          <View style={{ marginTop: 18, gap: 12 }}>
            {(["daily", "weekly"] as const).map((tt) => {
              const info = availability[tt];
              const cd = formatCountdown(info.nextAvailableAt);
              const label = tt === "daily" ? t("screens.phonics_test.daily_test") : t("screens.phonics_test.weekly_test");
              const sub = tt === "daily" ? t("screens.phonics_test.daily_sub") : t("screens.phonics_test.weekly_sub");
              const disabled = !info.available;
              return (
                <TouchableOpacity
                  key={tt}
                  disabled={disabled}
                  onPress={() => setActiveTest(tt)}
                  activeOpacity={0.85}
                  testID={`phonics-test-start-${tt}`}
                >
                  <LinearGradient
                    colors={
                      disabled
                        ? [palette.slate400, palette.slate500]
                        : [theme.brand.gradientStart, theme.brand.gradientEnd]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.startBtn, disabled && { opacity: 0.7 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.startBtnTitle}>{label}</Text>
                      <Text style={styles.startBtnSub}>{sub}</Text>
                      {disabled && cd && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                          <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.95)" />
                          <Text style={styles.startBtnMeta}>{t("screens.phonics_test.available_in", { cd })}</Text>
                        </View>
                      )}
                      {info.lastScore && (
                        <Text style={styles.startBtnMeta}>
                          {t("screens.phonics_test.last_score", { pct: info.lastScore.accuracyPct, label: info.lastScore.label })}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name={disabled ? "lock-closed" : "chevron-forward"}
                      size={22}
                      color="#fff"
                    />
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle:   { fontSize: 18, fontWeight: "800" },
  subtitle:      { fontSize: 14, lineHeight: 20 },

  sectionLabel:  { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  childChip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },

  errorBox:      { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 18 },
  errorText:     { flex: 1, fontSize: 13 },
  infoBox:       { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 18 },
  infoText:      { flex: 1, fontSize: 13 },

  startBtn:      { flexDirection: "row", alignItems: "center", padding: 18, borderRadius: 20, gap: 12 },
  startBtnTitle: { color: "#fff", fontSize: 17, fontWeight: "900" },
  startBtnSub:   { color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "600", marginTop: 2 },
  startBtnMeta:  { color: "rgba(255,255,255,0.95)", fontSize: 11, fontWeight: "700", marginTop: 4 },
});
