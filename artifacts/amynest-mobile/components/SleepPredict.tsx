/**
 * Infant Sleep Prediction (Beta) — mobile UI.
 *
 * Mirror of the web component — surfaces the engine output from
 * /api/sleep-predict/predict/:childId and lets the parent log naps with
 * one tap. Wind-down panel appears at >=80% sleep pressure.
 *
 * Engine + auth come from the API server; this file is presentational.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/i18n";
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
  Platform, ToastAndroid, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { brand, brandAlpha } from "@/constants/colors";

type Props = {
  childId: number;
  childName: string;
  ageMonths: number;
};

type PressureBand = "restful" | "ideal" | "tired" | "overtired";

type NapSession = {
  id: number;
  childId: number;
  kind: "nap" | "night";
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  createdAt: string;
};

type PredictionDTO = {
  predictedAt: string;
  windowStart: string;
  windowEnd: string;
  idealWakeWindowMin: number;
  baseWakeWindowMin: number;
  sleepPressure: number;
  pressureBand: PressureBand;
  shouldWindDown: boolean;
  reasons: string[];
  suggestedNapsPerDay: { min: number; max: number };
  flexible: boolean;
};

type PredictResponse = {
  ok: true;
  ageMonths: number;
  prediction: PredictionDTO;
  lastSession: NapSession | null;
  disclaimer: string;
};

const BAND_COLOR: Record<PressureBand, string> = {
  restful: "#10b981", // audit-ok: emerald-500 — restful pressure indicator
  ideal: "#10b981", // audit-ok: emerald-500 — ideal pressure indicator
  tired: "#f59e0b", // audit-ok: amber-500 — getting-tired warning
  overtired: "#ef4444", // audit-ok: red-500 — overtired warning
};

const BAND_LABEL: Record<PressureBand, string> = {
  restful: "Restful",
  ideal: "Ideal",
  tired: "Getting tired",
  overtired: "Overtired",
};

const WINDDOWN_TIPS = [
  "Dim the room — soft warm light only",
  "Reduce stimulation — quiet voices, slow movement",
  "Try a calming story or lullaby",
  "Offer a comfort object or gentle rock",
];

function flashToast(msg: string) {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert(i18nInstance.t("alerts.sleep.title"), msg);
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0m";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatRelative(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  const abs = Math.abs(ms);
  const min = Math.round(abs / 60_000);
  if (min < 1) return "now";
  if (min < 60) return ms > 0 ? `in ${min}m` : `${min}m ago`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  const label = rem === 0 ? `${h}h` : `${h}h ${rem}m`;
  return ms > 0 ? `in ${label}` : `${label} ago`;
}

export default function SleepPredict({ childId, childName, ageMonths }: Props) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();

  const [data, setData] = useState<PredictResponse | null>(null);
  const [history, setHistory] = useState<NapSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [activeStartIso, setActiveStartIso] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Tick once a minute so relative times + pressure ring stay fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const tzOffsetMin = new Date().getTimezoneOffset();
      const [pRes, hRes] = await Promise.all([
        authFetch(
          `/api/sleep-predict/predict/${childId}?tzOffsetMin=${tzOffsetMin}`,
        ),
        authFetch(`/api/sleep-predict/history/${childId}?limit=10`),
      ]);
      if (pRes.ok) {
        const json = (await pRes.json()) as PredictResponse;
        setData(json);
      }
      if (hRes.ok) {
        const json = (await hRes.json()) as { sessions: NapSession[] };
        setHistory(json.sessions ?? []);
        const latestOpen = json.sessions?.find((s) => s.endedAt === null);
        setActiveStartIso(latestOpen ? latestOpen.startedAt : null);
      }
    } catch {
      flashToast("Couldn't load sleep prediction");
    } finally {
      setLoading(false);
    }
  }, [authFetch, childId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logSleep = useCallback(
    async (kind: "nap" | "night") => {
      if (logging) return;
      setLogging(true);
      try {
        const startedAt = new Date().toISOString();
        const r = await authFetch("/api/sleep-predict/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, kind, startedAt }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setActiveStartIso(startedAt);
        flashToast(kind === "night" ? "Bedtime logged" : "Nap started");
        await refresh();
      } catch {
        flashToast("Couldn't log sleep — please try again");
      } finally {
        setLogging(false);
      }
    },
    [authFetch, childId, logging, refresh],
  );

  const logWake = useCallback(async () => {
    if (logging || !activeStartIso) return;
    setLogging(true);
    try {
      const r = await authFetch("/api/sleep-predict/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          kind: "nap",
          startedAt: activeStartIso,
          endedAt: new Date().toISOString(),
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setActiveStartIso(null);
      flashToast("Wake-up logged");
      await refresh();
    } catch {
      flashToast("Couldn't log wake-up — please try again");
    } finally {
      setLogging(false);
    }
  }, [activeStartIso, authFetch, childId, logging, refresh]);

  const prediction = data?.prediction;
  const ringPct = useMemo(
    () => (prediction ? Math.min(100, prediction.sleepPressure) : 0),
    [prediction],
  );
  const ringColor = prediction ? BAND_COLOR[prediction.pressureBand] : BAND_COLOR.restful;
  const dimmed = prediction?.shouldWindDown ?? false;
  const outOfBand = ageMonths < 0 || ageMonths > 24;

  return (
    <View style={[styles.root, dimmed && styles.dimmed]} testID="sleep-predict-root">
      {/* Disclaimer banner */}
      <View style={styles.disclaimer}>
        <Ionicons name="shield-half" size={14} color={brand.purple400} />
        <Text style={styles.disclaimerText}>
          <Text style={styles.disclaimerStrong}>Beta · Guidance only.</Text>{" "}
          {data?.disclaimer ??
            "This is a guidance system based on sleep patterns, not medical advice."}
        </Text>
      </View>

      {outOfBand ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Sleep prediction is tuned for ages 0–24 months. Showing a flexible
            estimate for {childName}.
          </Text>
        </View>
      ) : null}

      {loading && !data ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={brand.purple400} />
          <Text style={styles.loadingText}>Loading prediction…</Text>
        </View>
      ) : prediction ? (
        <>
          {/* Pressure ring + next-window card */}
          <LinearGradient
            colors={[brandAlpha.purple500_10, "rgba(56,189,248,0.08)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.predictCard}
          >
            <View style={styles.predictRow}>
              {/* Ring (segmented bar fallback — RN has no <conic-gradient>). */}
              <View style={styles.ringWrap} testID="pressure-ring">
                <View style={styles.ringTrack}>
                  <View
                    style={[
                      styles.ringFill,
                      { width: `${ringPct}%`, backgroundColor: ringColor },
                    ]}
                  />
                </View>
                <View style={styles.ringBubble}>
                  <Text style={[styles.ringValue, { color: ringColor }]}>
                    {prediction.sleepPressure}
                  </Text>
                  <Text style={styles.ringSuffix}>pressure</Text>
                </View>
              </View>

              <View style={styles.predictCol}>
                <Text style={styles.kicker}>
                  <Ionicons name="alarm-outline" size={11} color={brand.purple400} />
                  {"  "}NEXT SLEEP WINDOW
                </Text>
                <Text style={[styles.windowText, { color: ringColor }]} testID="next-window">
                  {formatTime(prediction.windowStart)} – {formatTime(prediction.windowEnd)}
                </Text>
                <Text style={styles.windowSub}>
                  {formatRelative(prediction.predictedAt, now)} ·{" "}
                  <Text style={{ color: ringColor, fontWeight: "700" }}>
                    {BAND_LABEL[prediction.pressureBand]}
                  </Text>
                </Text>
              </View>
            </View>

            {prediction.reasons.length > 0 ? (
              <View style={styles.reasonList} testID="reason-chain">
                {prediction.reasons.map((r, i) => (
                  <View key={i} style={styles.reasonRow}>
                    <Ionicons name="sparkles" size={11} color={brand.purple400} />
                    <Text style={styles.reasonText}>{r}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </LinearGradient>

          {/* Wind-down panel */}
          {prediction.shouldWindDown ? (
            <LinearGradient
              colors={["rgba(99,102,241,0.18)", "rgba(168,85,247,0.18)"]} // audit-ok: indigo→purple wind-down accent
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.winddownCard}
              testID="winddown-panel"
            >
              <View style={styles.winddownHead}>
                <MaterialCommunityIcons name="weather-night" size={14} color={brand.purple400} />
                <Text style={styles.winddownTitle}>Start wind-down now</Text>
              </View>
              {WINDDOWN_TIPS.map((t) => (
                <View key={t} style={styles.tipRow}>
                  <Ionicons name="bulb-outline" size={11} color="#f59e0b" />{/* audit-ok: amber-500 tip bullet */}
                  <Text style={styles.tipText}>{t}</Text>
                </View>
              ))}
            </LinearGradient>
          ) : null}

          {/* Suggested naps */}
          <View style={styles.factCard}>
            <Text style={styles.factText}>
              <Text style={styles.factStrong}>{childName}</Text> is in the{" "}
              <Text style={styles.factStrong}>
                {prediction.idealWakeWindowMin}-min wake window
              </Text>{" "}
              band. Aim for{" "}
              <Text style={styles.factStrong}>
                {prediction.suggestedNapsPerDay.min}
                {prediction.suggestedNapsPerDay.max !==
                prediction.suggestedNapsPerDay.min
                  ? `–${prediction.suggestedNapsPerDay.max}`
                  : ""}
              </Text>{" "}
              nap{prediction.suggestedNapsPerDay.max === 1 ? "" : "s"} today.
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.factCard}>
          <Text style={styles.factText}>
            No prediction available. Log a sleep below to get started.
          </Text>
        </View>
      )}

      {/* Log buttons */}
      <View style={styles.logBlock}>
        <Text style={styles.kicker}>LOG SLEEP</Text>
        {activeStartIso ? (
          <Pressable
            onPress={logWake}
            disabled={logging}
            style={[styles.btnFull, styles.btnAmber, logging && styles.btnDisabled]}
            testID="log-wake-btn"
          >
            {logging ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="sunny" size={16} color="#fff" />
            )}
            <Text style={styles.btnText}>
              Baby's awake (started {formatTime(activeStartIso)})
            </Text>
          </Pressable>
        ) : (
          <View style={styles.btnRow}>
            <Pressable
              onPress={() => logSleep("nap")}
              disabled={logging}
              style={[styles.btnHalf, styles.btnPrimary, logging && styles.btnDisabled]}
              testID="log-nap-btn"
            >
              {logging ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="bed" size={16} color="#fff" />
              )}
              <Text style={styles.btnText}>Nap started</Text>
            </Pressable>
            <Pressable
              onPress={() => logSleep("night")}
              disabled={logging}
              style={[styles.btnHalf, styles.btnNight, logging && styles.btnDisabled]}
              testID="log-night-btn"
            >
              {logging ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="moon" size={16} color="#fff" />
              )}
              <Text style={styles.btnText}>Bedtime</Text>
            </Pressable>
          </View>
        )}
        <Pressable
          onPress={() => void refresh()}
          disabled={loading}
          style={styles.refreshBtn}
          testID="refresh-btn"
        >
          <Ionicons name="refresh" size={12} color={brand.purple400} />
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {/* History */}
      {history.length > 0 ? (
        <View style={styles.historyCard}>
          <Text style={styles.kicker}>
            <Ionicons name="time-outline" size={11} color={brand.purple400} />
            {"  "}RECENT SLEEP ({history.length})
          </Text>
          <ScrollView
            horizontal={false}
            style={{ marginTop: 8 }}
            testID="sleep-history"
          >
            {history.map((s) => (
              <View key={s.id} style={styles.histRow}>
                <View style={styles.histLeft}>
                  {s.kind === "night" ? (
                    <Ionicons name="moon" size={12} color={brand.purple400} />
                  ) : (
                    <MaterialCommunityIcons name="bed" size={12} color={brand.purple400} />
                  )}
                  <Text style={styles.histKind}>
                    {s.kind === "night" ? "Night" : "Nap"}
                  </Text>
                  <Text style={styles.histTime}>
                    {formatTime(s.startedAt)}
                    {s.endedAt ? ` → ${formatTime(s.endedAt)}` : " · in progress"}
                  </Text>
                </View>
                <Text style={styles.histDur}>
                  {s.endedAt ? formatDuration(s.durationMs) : ""}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { gap: 10 },
  dimmed: { opacity: 0.96 },

  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: brandAlpha.purple500_10,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.25)", // audit-ok: brand purple alpha border
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: "#e5e7eb", // audit-ok: gray-200 dark-mode banner text
  },
  disclaimerStrong: { fontWeight: "800" },

  warn: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(245,158,11,0.12)", // audit-ok: amber-500 alpha info background
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.35)", // audit-ok: amber-500 alpha border
  },
  warnText: { color: "#fbbf24", fontSize: 11 }, // audit-ok: amber-400 warning text

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
  loadingText: { color: "#9ca3af", fontSize: 12 }, // audit-ok: gray-400 muted text

  predictCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)", // audit-ok: subtle glass border
  },
  predictRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  ringWrap: {
    width: 96,
    alignItems: "center",
    gap: 6,
  },
  ringTrack: {
    width: 96,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)", // audit-ok: glass track
    overflow: "hidden",
  },
  ringFill: { height: 6, borderRadius: 999 },
  ringBubble: { alignItems: "center" },
  ringValue: { fontSize: 22, fontWeight: "800", lineHeight: 24 },
  ringSuffix: {
    fontSize: 9,
    letterSpacing: 1,
    color: "#9ca3af", // audit-ok: gray-400 caption
    textTransform: "uppercase",
  },
  predictCol: { flex: 1, minWidth: 0 },
  kicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: brand.purple400,
  },
  windowText: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  windowSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 }, // audit-ok: gray-400 secondary text

  reasonList: { marginTop: 10, gap: 4 },
  reasonRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  reasonText: { flex: 1, fontSize: 11, color: "#e5e7eb" }, // audit-ok: gray-200 reason text

  winddownCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.30)", // audit-ok: indigo wind-down accent
    gap: 4,
  },
  winddownHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  winddownTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: brand.purple400,
    textTransform: "uppercase",
  },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingVertical: 2 },
  tipText: { flex: 1, fontSize: 12, color: "#e5e7eb" }, // audit-ok: gray-200 tip text

  factCard: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)", // audit-ok: glass surface
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)", // audit-ok: glass border
  },
  factText: { fontSize: 11, color: "#e5e7eb", lineHeight: 16 }, // audit-ok: gray-200 body text
  factStrong: { fontWeight: "800", color: "#fff" }, // audit-ok: high-contrast emphasis on dark glass

  logBlock: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)", // audit-ok: glass surface
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)", // audit-ok: glass border
    gap: 8,
  },
  btnRow: { flexDirection: "row", gap: 8 },
  btnHalf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
  },
  btnFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
  },
  btnPrimary: { backgroundColor: brand.purple500 },
  btnNight: { backgroundColor: "#7c3aed" }, // audit-ok: violet-600 night-sleep accent
  btnAmber: { backgroundColor: "#f59e0b" }, // audit-ok: amber-500 wake-up accent
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 13 }, // audit-ok: white-on-color button label

  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  refreshText: { color: brand.purple400, fontSize: 11, fontWeight: "700" },

  historyCard: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)", // audit-ok: glass surface
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)", // audit-ok: glass border
  },
  histRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)", // audit-ok: nested glass surface
    marginBottom: 4,
  },
  histLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  histKind: { fontWeight: "800", color: "#fff", fontSize: 11 }, // audit-ok: high-contrast label on dark glass
  histTime: { color: "#9ca3af", fontSize: 11 }, // audit-ok: gray-400 secondary time
  histDur: { color: "#9ca3af", fontSize: 11 }, // audit-ok: gray-400 duration
});
