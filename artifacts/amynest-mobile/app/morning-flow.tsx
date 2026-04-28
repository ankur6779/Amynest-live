import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { router, Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AMY_ENCOURAGEMENT, AMY_NUDGE_BODY, AMY_NUDGE_TITLE,
  DEFAULT_MORNING_STEPS, NIGHT_PREP_ITEMS,
  applyAutoAdjust, computeDelay, emptyDayState, nightPrepSummary,
  simplifyRemaining, summarize, todayKey, totalPlannedMinutes,
  type MorningFlowDayState, type MorningStep,
} from "@workspace/morning-flow";

const STEPS = DEFAULT_MORNING_STEPS;
const KEY = "amynest:morning-flow:v1";

async function load(): Promise<MorningFlowDayState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyDayState();
    const parsed = JSON.parse(raw) as MorningFlowDayState;
    if (parsed.date !== todayKey()) {
      // New day → fresh morning state but keep the prior night's checklist.
      return { ...emptyDayState(), nightPrep: parsed.nightPrep ?? {} };
    }
    return { ...emptyDayState(), ...parsed };
  } catch { return emptyDayState(); }
}
async function save(s: MorningFlowDayState) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export default function MorningFlowScreen() {
  const { theme } = useTheme();
  const [state, setState] = useState<MorningFlowDayState>(() => emptyDayState());
  const [tick, setTick] = useState(0);

  useEffect(() => { load().then(setState); }, []);

  useEffect(() => {
    if (!state.startedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [state.startedAt]);

  const persist = (mut: (prev: MorningFlowDayState) => MorningFlowDayState) => {
    setState((prev) => {
      const next = applyAutoAdjust(mut(prev), STEPS);
      save(next);
      return next;
    });
  };

  const delay = useMemo(() => computeDelay(state, STEPS), [state, tick]);
  const summary = summarize(state, STEPS);
  const night = nightPrepSummary(state);
  const planned = totalPlannedMinutes(STEPS);

  const startMorning = () => persist((s) => ({ ...s, startedAt: Date.now() }));
  const resetDay = () => persist(() => ({ ...emptyDayState(), nightPrep: state.nightPrep }));
  const toggleNight = (id: string) =>
    persist((s) => ({ ...s, nightPrep: { ...s.nightPrep, [id]: !s.nightPrep[id] } }));
  const setStep = (id: string, status: "done" | "skipped" | "pending") =>
    persist((s) => ({
      ...s,
      steps: { ...s.steps, [id]: { status, doneAt: Date.now() } },
      startedAt: s.startedAt ?? Date.now(),
    }));
  const acceptSimplify = () => persist((s) => simplifyRemaining(s, STEPS));

  return (
    <View style={S.root}>
      <LinearGradient
        colors={theme.gradient}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#F97316", "#FBBF24"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.header}>
        <Pressable onPress={() => router.back()} style={S.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={S.title}>🌅 School Morning Flow</Text>
          <Text style={S.subtitle}>❤️ {AMY_ENCOURAGEMENT}</Text>
        </View>
        {state.startedAt && (
          <Pressable onPress={resetDay} style={S.resetBtn} hitSlop={10}>
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={S.resetText}>Reset</Text>
          </Pressable>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
        {/* Amy delay nudge */}
        {delay.showAmyNudge && (
          <View style={S.nudgeCard}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={S.nudgeIcon}>
                <Ionicons name="flash" size={16} color="#b45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.nudgeTitle}>{AMY_NUDGE_TITLE}</Text>
                <Text style={S.nudgeBody}>
                  {AMY_NUDGE_BODY} <Text style={{ color: "#b45309", fontWeight: "800" }}>({delay.delayMinutes} min behind)</Text>
                </Text>
                <Pressable onPress={acceptSimplify} style={S.nudgeBtn}>
                  <Ionicons name="sparkles" size={12} color="#fff" />
                  <Text style={S.nudgeBtnText}>Simplify the rest</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Morning Flow card */}
        <View style={S.card}>
          <View style={S.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>🌅  Morning Flow</Text>
              <Text style={S.cardDesc}>{STEPS.length} steps · about {planned} min total</Text>
            </View>
            {!state.startedAt && (
              <Pressable onPress={startMorning} style={S.primaryBtn}>
                <Ionicons name="play" size={12} color="#fff" />
                <Text style={S.primaryBtnText}>Start morning</Text>
              </Pressable>
            )}
          </View>

          <View style={{ marginVertical: 8, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={S.metaText}>{summary.doneCount}/{summary.totalCount} done · {summary.skippedCount} skipped</Text>
              {state.startedAt && (
                <Text style={S.metaText}>⏱ {delay.actualMinutes} / {planned} min</Text>
              )}
            </View>
            <View style={S.barTrack}><View style={[S.barFill, { width: `${summary.percent}%` }]} /></View>
          </View>

          <View style={{ gap: 8 }}>
            {STEPS.map((step, i) => {
              const status = state.steps[step.id]?.status ?? "pending";
              return (
                <StepRow
                  key={step.id}
                  index={i + 1}
                  step={step}
                  status={status}
                  onDone={() => setStep(step.id, "done")}
                  onSkip={() => setStep(step.id, "skipped")}
                  onUndo={() => setStep(step.id, "pending")}
                />
              );
            })}
          </View>

          {summary.doneCount + summary.skippedCount === STEPS.length && (
            <View style={S.doneBanner}>
              <Text style={S.doneText}>
                <Text style={{ fontWeight: "800" }}>All done! 🎉  </Text>
                {summary.skippedCount > 0 ? `Skipped ${summary.skippedCount} — that's okay.` : "Smooth morning!"} Have a great day at school.
              </Text>
            </View>
          )}
        </View>

        {/* Night Prep card */}
        <View style={S.card}>
          <View style={S.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>🌙  Prepare for Tomorrow</Text>
              <Text style={S.cardDesc}>{night.done}/{night.total} ready · do this the previous evening</Text>
            </View>
          </View>
          <View style={{ gap: 8, marginTop: 4 }}>
            {NIGHT_PREP_ITEMS.map((item) => {
              const checked = !!state.nightPrep[item.id];
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleNight(item.id)}
                  style={[S.nightItem, checked && S.nightItemOn]}
                >
                  <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                  <Text style={[S.nightLabel, checked && { color: "#3730a3" }]}>{item.label}</Text>
                  {checked
                    ? <Ionicons name="checkmark-circle" size={22} color="#6366F1" />
                    : <View style={S.nightCircle} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={() => router.push("/routines" as never)} style={{ alignSelf: "center", marginTop: 4 }}>
          <Text style={{ color: "#F97316", fontSize: 12, fontWeight: "700" }}>Need a detailed routine? Open Routines →</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function StepRow({
  index, step, status, onDone, onSkip, onUndo,
}: {
  index: number;
  step: MorningStep;
  status: "pending" | "done" | "skipped";
  onDone: () => void;
  onSkip: () => void;
  onUndo: () => void;
}) {
  const done = status === "done";
  const skipped = status === "skipped";
  const borderColor = done ? "#34d399" : skipped ? "#cbd5e1" : "#e5e7eb";
  const bg = done ? "#ecfdf5" : skipped ? "#f8fafc" : "#fff";
  return (
    <View style={[S.stepRow, { borderColor, backgroundColor: bg, opacity: skipped ? 0.7 : 1 }]}>
      <View style={S.stepIdx}><Text style={S.stepIdxText}>{index}</Text></View>
      <Text style={{ fontSize: 22 }}>{step.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[S.stepTitle, skipped && { textDecorationLine: "line-through", color: "#94a3b8" }]}>{step.title}</Text>
        <Text style={S.stepMeta}>⏱ ~{step.defaultMinutes} min{!step.essential ? "  · optional" : ""}</Text>
      </View>
      {status === "pending" ? (
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pressable onPress={onSkip} style={S.outlineBtn}>
            <Text style={S.outlineBtnText}>Skip</Text>
          </Pressable>
          <Pressable onPress={onDone} style={S.doneBtn}>
            <Ionicons name="checkmark" size={14} color="#fff" />
            <Text style={S.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={onUndo} style={S.undoBtn}>
          <Ionicons name="refresh" size={12} color="#64748b" />
          <Text style={S.undoBtnText}>Undo</Text>
        </Pressable>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF7ED" },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  title: { color: "#fff", fontSize: 19, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.92)", fontSize: 12, marginTop: 2 },
  resetBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)" },
  resetText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  card: { backgroundColor: "#fff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#fed7aa" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  cardDesc: { fontSize: 12, color: "#64748b", marginTop: 2 },
  metaText: { fontSize: 11, color: "#64748b" },
  barTrack: { height: 7, backgroundColor: "#fed7aa", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#F97316" },

  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F97316", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  stepRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, borderWidth: 2 },
  stepIdx: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#ffedd5", alignItems: "center", justifyContent: "center" },
  stepIdxText: { color: "#c2410c", fontWeight: "800", fontSize: 12 },
  stepTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  stepMeta: { fontSize: 11, color: "#64748b", marginTop: 2 },

  outlineBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  outlineBtnText: { fontSize: 12, color: "#475569", fontWeight: "700" },
  doneBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#16a34a" },
  doneBtnText: { fontSize: 12, color: "#fff", fontWeight: "800" },
  undoBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#f1f5f9" },
  undoBtnText: { fontSize: 11, color: "#64748b", fontWeight: "700" },

  nightItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 2, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  nightItemOn: { borderColor: "#6366F1", backgroundColor: "#eef2ff" },
  nightLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#0f172a" },
  nightCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#cbd5e1" },

  doneBanner: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#bbf7d0", backgroundColor: "#ecfdf5" },
  doneText: { color: "#065f46", fontSize: 13 },

  nudgeCard: { borderRadius: 16, borderWidth: 1, borderColor: "#fcd34d", backgroundColor: "#fffbeb", padding: 14 },
  nudgeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center" },
  nudgeTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  nudgeBody: { fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 17 },
  nudgeBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#d97706" },
  nudgeBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
