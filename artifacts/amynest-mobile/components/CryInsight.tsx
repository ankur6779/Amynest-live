/**
 * Cry Insight (Beta) — mobile UI.
 *
 * Mirror of the web component but adapted to React Native + expo-audio.
 *
 * Audio handling:
 *   - We use `useAudioRecorder` from expo-audio with metering enabled.
 *   - During recording we sample the per-update `metering` value (dB) and
 *     convert it into a 0..1 amplitude. We compute avg/peak from those
 *     samples client-side.
 *   - The actual recorded file is NEVER read or uploaded — only the
 *     amplitude stats and the parent context are sent to the server.
 *
 * Privacy note: the recording is written to a temp URI by expo-audio (we
 * can't avoid that), but we never read it, never upload it, and the OS
 * cleans the cache directory.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/i18n";
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
  Platform, ToastAndroid, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { brand, brandAlpha } from "@/constants/colors";

type Props = {
  childId: number;
  childName: string;
  ageMonths: number;
};

type CryCause = "hunger" | "sleepy" | "discomfort" | "pain";

type CrySession = {
  id: number;
  childId: number;
  durationMs: number;
  primary: { cause: CryCause; confidence: number };
  secondary: { cause: CryCause; confidence: number };
  suggestion: string;
  medicalFlag: boolean;
  createdAt: string;
};

const CAUSE_META: Record<CryCause, { emoji: string; label: string; color: string }> = {
  hunger: { emoji: "🍼", label: "Hunger", color: "#f97316" }, // audit-ok: orange-500 hunger accent
  sleepy: { emoji: "😴", label: "Sleepy", color: "#6366f1" }, // audit-ok: indigo-500 sleep accent
  discomfort: { emoji: "😣", label: "Discomfort", color: "#f43f5e" }, // audit-ok: rose-500 discomfort accent
  pain: { emoji: "🤕", label: "Pain", color: "#dc2626" }, // audit-ok: red-600 pain accent
};

const RECORD_LIMIT_MS = 15_000;
const RECORD_MIN_MS = 1_500;

function flashToast(msg: string) {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert(i18nInstance.t("alerts.cry.title"), msg);
}

/**
 * Convert an iOS/Android metering value (dB, typically -160..0) into a
 * 0..1 amplitude. -60 dB ≈ silent room, -10 dB ≈ loud baby.
 */
function dbToAmp(db: number | undefined): number {
  if (db === undefined || !Number.isFinite(db)) return 0;
  // Clamp to a sane window before normalising.
  const clamped = Math.max(-60, Math.min(0, db));
  return (clamped + 60) / 60;
}

/** Tiny -/+ stepper used in place of a slider (no slider lib in this app). */
function Stepper({
  label, valueLabel, suffix, onDecrement, onIncrement, accent, testIDPrefix,
}: {
  label: string;
  valueLabel: string;
  suffix?: string;
  onDecrement: () => void;
  onIncrement: () => void;
  accent: string;
  testIDPrefix: string;
}) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={stepperStyles.label}>{label}</Text>
      <View style={stepperStyles.row}>
        <Pressable
          onPress={onDecrement}
          style={[stepperStyles.btn, { borderColor: accent }]}
          hitSlop={8}
          testID={`${testIDPrefix}-dec`}
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
        >
          <Ionicons name="remove" size={18} color={accent} />
        </Pressable>
        <View style={stepperStyles.valueWrap}>
          <Text style={[stepperStyles.value, { color: accent }]} testID={`${testIDPrefix}-readout`}>
            {valueLabel}
          </Text>
          {suffix ? <Text style={stepperStyles.suffix}>{suffix}</Text> : null}
        </View>
        <Pressable
          onPress={onIncrement}
          style={[stepperStyles.btn, { borderColor: accent }]}
          hitSlop={8}
          testID={`${testIDPrefix}-inc`}
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
        >
          <Ionicons name="add" size={18} color={accent} />
        </Pressable>
      </View>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  label: { color: "#e5e7eb", fontSize: 12, fontWeight: "700", marginBottom: 6 }, // audit-ok: gray-200 neutral text
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  btn: {
    height: 32, width: 32, borderRadius: 999,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  valueWrap: { flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 },
  value: { fontSize: 14, fontWeight: "800" },
  suffix: { color: "#9ca3af", fontSize: 11 }, // audit-ok: gray-400 secondary text
});

function relTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.round(diffMs / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function CryInsight({ childId, childName, ageMonths }: Props) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();

  // Context form state
  const [feedHrs, setFeedHrs] = useState(2);
  const [sleepHrs, setSleepHrs] = useState(1);
  const [diaperRecent, setDiaperRecent] = useState<boolean | null>(null);
  const [fever, setFever] = useState(false);

  // Recording state
  const [recording, setRecording] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const meteringSamplesRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // expo-audio recorder. We rely on `useAudioRecorderState` (polled every
  // 50ms) for the live `metering` value (dB) which we sample into
  // amplitude in 0..1 for our client-side audioStats. 50ms ≈ 20Hz which
  // is the practical floor for catching cry peaks without re-render thrash.
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 50);

  useEffect(() => {
    if (!recorderState.isRecording) return;
    const m = recorderState.metering;
    if (typeof m === "number") {
      const amp = dbToAmp(m);
      if (amp > 0) meteringSamplesRef.current.push(amp);
    }
  }, [recorderState.isRecording, recorderState.metering]);

  // Result state
  const [result, setResult] = useState<CrySession | null>(null);
  const [history, setHistory] = useState<CrySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ─── History ────────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const r = await authFetch(`/api/cry-insight/history/${childId}?limit=10`);
      if (!r.ok) return;
      const j = (await r.json()) as { ok: boolean; sessions: CrySession[] };
      if (j.ok) setHistory(j.sessions);
    } finally {
      setHistoryLoading(false);
    }
  }, [authFetch, childId]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  // ─── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
    };
  }, []);

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const submit = useCallback(
    async (audioStats: Record<string, number>, durationMs: number) => {
      const { default: i18nInstance } = await import("@/i18n");
      const body = {
        childId,
        durationMs,
        audioStats,
        context: {
          minutesSinceFeed: Math.round(feedHrs * 60),
          minutesSinceSleep: Math.round(sleepHrs * 60),
          diaperChangedRecently: diaperRecent ?? undefined,
          fever,
          ageMonths,
        },
        language: i18nInstance.language || "en",
      };
      const r = await authFetch("/api/cry-insight/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        flashToast("Couldn't analyse — please try again");
        return;
      }
      const j = (await r.json()) as { ok: true; session: CrySession };
      setResult(j.session);
      void fetchHistory();
    },
    [ageMonths, authFetch, childId, diaperRecent, feedHrs, fever, fetchHistory, sleepHrs],
  );

  // ─── Start recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (recording || analysing) return;
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        flashToast("Mic permission denied — try analyse without audio");
        return;
      }
      meteringSamplesRef.current = [];
      // prepareToRecordAsync ensures we can pass record options like metering.
      await recorder.prepareToRecordAsync({
        ...RecordingPresets.LOW_QUALITY,
        isMeteringEnabled: true,
      });
      recorder.record();
      setRecording(true);
      setElapsedMs(0);
      startedAtRef.current = Date.now();
      tickRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 100);
      autoStopRef.current = setTimeout(() => {
        void stopRecording();
      }, RECORD_LIMIT_MS);
    } catch {
      flashToast("Couldn't start recording");
      setRecording(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysing, recording, recorder]);

  // ─── Stop recording ─────────────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (!recording) return;
    setRecording(false);
    setAnalysing(true);
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }

    const elapsed = Date.now() - startedAtRef.current;
    try {
      try { await recorder.stop(); } catch { /* already stopped */ }

      // Compute audio stats from collected metering samples.
      const samples = meteringSamplesRef.current;
      let stats: Record<string, number> = {};
      if (elapsed >= RECORD_MIN_MS && samples.length > 0) {
        let sumSq = 0;
        let peak = 0;
        for (const a of samples) {
          if (a > peak) peak = a;
          sumSq += a * a;
        }
        const rms = Math.sqrt(sumSq / samples.length);
        stats = {
          avgAmplitude: rms,
          peakAmplitude: peak,
          // Without raw PCM we can't measure ZCR — let the engine fall back
          // to its other heuristics.
          durationMs: elapsed,
        };
      }
      await submit(stats, elapsed);
    } finally {
      setAnalysing(false);
      setElapsedMs(0);
    }
  }, [recorder, recording, submit]);

  const analyseWithoutAudio = useCallback(async () => {
    if (recording || analysing) return;
    setAnalysing(true);
    try {
      await submit({}, 0);
    } finally {
      setAnalysing(false);
    }
  }, [analysing, recording, submit]);

  const reset = useCallback(() => setResult(null), []);

  const elapsedSec = (elapsedMs / 1000).toFixed(1);
  const recordPctFull = Math.min(100, (elapsedMs / RECORD_LIMIT_MS) * 100);

  return (
    <View style={styles.root} testID="cry-insight-root">
      {/* Beta banner */}
      <View style={styles.banner}>
        <MaterialCommunityIcons name="shield-alert" size={14} color="#fbbf24" /> {/* audit-ok: amber-400 beta-banner icon */}
        <Text style={styles.bannerText}>
          <Text style={{ fontWeight: "800" }}>Beta · Estimate only.</Text>{"  "}
          Not a medical tool — call your pediatrician if you're worried.
        </Text>
      </View>

      {/* Context form */}
      <LinearGradient
        colors={["rgba(167,139,250,0.10)", "rgba(236,72,153,0.10)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.section}
      >
        <Text style={styles.sectionKicker}>QUICK CONTEXT FOR {childName.toUpperCase()}</Text>

        {/* Feed stepper */}
        <Stepper
          label="Last feed"
          valueLabel={
            feedHrs < 1 ? `${Math.round(feedHrs * 60)} min` : `${feedHrs.toFixed(1)} hr`
          }
          suffix="ago"
          onDecrement={() => setFeedHrs((v) => Math.max(0.25, +(v - 0.25).toFixed(2)))}
          onIncrement={() => setFeedHrs((v) => Math.min(6, +(v + 0.25).toFixed(2)))}
          accent="#f97316" // audit-ok: orange-500 hunger accent
          testIDPrefix="feed"
        />

        {/* Sleep stepper */}
        <Stepper
          label="Last sleep ended"
          valueLabel={
            sleepHrs < 1 ? `${Math.round(sleepHrs * 60)} min` : `${sleepHrs.toFixed(1)} hr`
          }
          suffix="ago"
          onDecrement={() => setSleepHrs((v) => Math.max(0, +(v - 0.25).toFixed(2)))}
          onIncrement={() => setSleepHrs((v) => Math.min(6, +(v + 0.25).toFixed(2)))}
          accent="#6366f1" // audit-ok: indigo-500 sleep accent
          testIDPrefix="sleep"
        />

        {/* Diaper toggle (3-state) */}
        <View style={{ marginTop: 12 }}>
          <Text style={[styles.label, { marginBottom: 6 }]}>Diaper checked recently?</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[
              { v: true, label: "Yes — clean", color: "#22c55e" }, // audit-ok: green-500 diaper-clean state
              { v: false, label: "No / dirty", color: "#f43f5e" }, // audit-ok: rose-500 diaper-dirty state
              { v: null, label: "Not sure", color: "#94a3b8" }, // audit-ok: slate-400 unknown state
            ].map((opt) => {
              const active = diaperRecent === opt.v;
              return (
                <Pressable
                  key={String(opt.v)}
                  onPress={() => setDiaperRecent(opt.v as boolean | null)}
                  style={[
                    styles.toggleChip,
                    active && { backgroundColor: opt.color, borderColor: opt.color },
                  ]}
                  testID={`diaper-${String(opt.v)}`}
                >
                  <Text style={[styles.toggleChipLabel, active && { color: "#fff" }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Fever */}
        <View style={[styles.rowBetween, { marginTop: 14 }]}>
          <Text style={styles.label}>Feels warm / has temperature?</Text>
          <Pressable
            onPress={() => setFever((v) => !v)}
            style={[
              styles.feverChip,
              fever && { backgroundColor: "#f43f5e", borderColor: "#f43f5e" }, // audit-ok: rose-500 fever-active state
            ]}
            testID="fever-toggle"
            accessibilityState={{ selected: fever }}
          >
            <Text style={[styles.feverChipLabel, fever && { color: "#fff" }]}>
              {fever ? "Yes" : "No"}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Recorder */}
      <View style={styles.recorderCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={recording ? stopRecording : startRecording}
            disabled={analysing}
            style={[
              styles.micBtn,
              recording && styles.micBtnRec,
              analysing && { opacity: 0.5 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={recording ? "Stop recording" : "Start recording"}
            testID={recording ? "stop-recording" : "start-recording"}
          >
            {analysing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons
                name={recording ? "square" : "mic"}
                size={recording ? 22 : 26}
                color="#fff"
              />
            )}
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.recTitle}>
              {recording ? "Recording…" : analysing ? "Analysing…" : "Tap mic to record"}
            </Text>
            <Text style={styles.recHelp}>
              {recording
                ? `Up to 15 s · ${elapsedSec}s recorded`
                : "Hold near baby for 5–15 s. Audio stays on this device."}
            </Text>
            {recording && (
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${recordPctFull}%` },
                  ]}
                />
              </View>
            )}
          </View>
        </View>

        {!recording && (
          <Pressable
            onPress={analyseWithoutAudio}
            disabled={analysing}
            style={styles.skipAudioBtn}
            testID="analyse-no-audio"
          >
            <MaterialCommunityIcons name="creation" size={14} color={brand.purple400} />
            <Text style={styles.skipAudioLabel}>Analyse using context only (no audio)</Text>
          </Pressable>
        )}
      </View>

      {/* Result */}
      {result && (
        <View style={styles.resultCard} testID="cry-result">
          <View style={[styles.rowBetween, { marginBottom: 10 }]}>
            <Text style={styles.sectionKicker}>LIKELY CAUSE</Text>
            <Pressable onPress={reset} hitSlop={8} testID="cry-reset">
              <Text style={{ color: brand.purple400, fontSize: 11, fontWeight: "700" }}>
                Reset
              </Text>
            </Pressable>
          </View>
          {[result.primary, result.secondary].map((c, i) => {
            const meta = CAUSE_META[c.cause];
            return (
              <View key={`${c.cause}-${i}`} style={{ marginBottom: 8 }} testID={`cause-row-${i}`}>
                <View style={styles.rowBetween}>
                  <Text style={styles.causeLabel}>
                    {meta.emoji}  {meta.label}
                  </Text>
                  <Text style={styles.causeLabel}>{c.confidence}%</Text>
                </View>
                <View style={styles.causeBarTrack}>
                  <View
                    style={[
                      styles.causeBarFill,
                      { width: `${Math.max(4, c.confidence)}%`, backgroundColor: meta.color },
                    ]}
                  />
                </View>
              </View>
            );
          })}

          <View style={styles.suggestionBox}>
            <Text style={styles.sectionKicker}>TRY THIS</Text>
            <Text style={styles.suggestionText}>{result.suggestion}</Text>
          </View>

          {result.medicalFlag && (
            <View style={styles.medicalBox}>
              <MaterialCommunityIcons name="alert" size={14} color="#fecaca" />{/* audit-ok: red-200 medical-flag icon */}
              <Text style={styles.medicalText}>
                <Text style={{ fontWeight: "800" }}>Worth a check.</Text>{"  "}
                If baby seems unwell or doesn't settle, call your pediatrician.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* History */}
      <View style={styles.historyCard}>
        <View style={[styles.rowBetween, { marginBottom: 8 }]}>
          <Text style={styles.sectionKicker}>RECENT SESSIONS</Text>
          {historyLoading && <ActivityIndicator size="small" color={brand.purple400} />}
        </View>
        {history.length === 0 ? (
          <Text style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>{/* audit-ok: gray-400 empty-state */}
            No sessions yet. Your first analysis will appear here.
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: 220 }} testID="cry-history">
            {history.map((h) => {
              const meta = CAUSE_META[h.primary.cause];
              return (
                <View key={h.id} style={styles.historyRow}>
                  <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
                  <Text style={styles.historyLabel}>{meta.label}</Text>
                  <Text style={styles.historyConf}>{h.primary.confidence}%</Text>
                  <Text style={styles.historyTime}>{relTime(h.createdAt)}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  banner: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "rgba(251,191,36,0.10)",
    borderColor: "rgba(251,191,36,0.30)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
  },
  bannerText: { flex: 1, color: "#fde68a", fontSize: 11, lineHeight: 15 }, // audit-ok: amber-200 banner text
  section: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: brandAlpha.purple500_10,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: brand.purple400,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { color: "#e5e7eb", fontSize: 12, fontWeight: "700" }, // audit-ok: gray-200 neutral label
  value: { color: "#9ca3af", fontSize: 11 }, // audit-ok: gray-400 neutral value
  toggleChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
  },
  toggleChipLabel: { fontSize: 11, fontWeight: "700", color: "#cbd5e1" }, // audit-ok: slate-300 chip text
  feverChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  feverChipLabel: { fontSize: 11, fontWeight: "800", color: "#cbd5e1" }, // audit-ok: slate-300 chip text
  recorderCard: {
    backgroundColor: "rgba(167,139,250,0.08)",
    borderColor: "rgba(167,139,250,0.25)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  micBtn: {
    height: 56, width: 56, borderRadius: 999,
    backgroundColor: brand.purple400,
    alignItems: "center", justifyContent: "center",
  },
  micBtnRec: { backgroundColor: "#f43f5e" }, // audit-ok: rose-500 active-recording state
  recTitle: { color: "#fff", fontSize: 13, fontWeight: "800" },
  recHelp: { color: "#9ca3af", fontSize: 11, lineHeight: 14 }, // audit-ok: gray-400 helper text
  progressTrack: {
    marginTop: 6, height: 4, borderRadius: 999,
    backgroundColor: "rgba(167,139,250,0.20)", overflow: "hidden",
  },
  progressFill: { height: 4, backgroundColor: brand.purple400 },
  skipAudioBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.30)",
  },
  skipAudioLabel: { color: brand.purple400, fontSize: 11, fontWeight: "800" },
  resultCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(167,139,250,0.20)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  causeLabel: { color: "#fff", fontSize: 12, fontWeight: "700" },
  causeBarTrack: {
    marginTop: 4, height: 8, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden",
  },
  causeBarFill: { height: 8, borderRadius: 999 },
  suggestionBox: {
    marginTop: 8,
    backgroundColor: "rgba(167,139,250,0.10)",
    borderRadius: 12, padding: 10,
  },
  suggestionText: { marginTop: 4, color: "#ede9fe", fontSize: 13, lineHeight: 17 }, // audit-ok: violet-100 suggestion text
  medicalBox: {
    marginTop: 8, flexDirection: "row", gap: 8,
    backgroundColor: "rgba(244,63,94,0.15)",
    borderColor: "rgba(244,63,94,0.40)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  medicalText: { flex: 1, color: "#fecaca", fontSize: 11, lineHeight: 15 }, // audit-ok: red-200 medical-flag text
  historyCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    marginBottom: 4,
  },
  historyLabel: { color: "#fff", fontSize: 12, fontWeight: "700" },
  historyConf: { color: "#9ca3af", fontSize: 11 }, // audit-ok: gray-400 secondary text
  historyTime: { marginLeft: "auto", color: "#9ca3af", fontSize: 11 }, // audit-ok: gray-400 timestamp text
});
