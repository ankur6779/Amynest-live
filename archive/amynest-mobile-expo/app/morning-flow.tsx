import React, { useEffect, useMemo, useState } from "react";
import { palette } from "@/constants/colors";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { router, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      <LinearGradient colors={[palette.orange500, palette.amber400]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.header}>
        <Pressable onPress={() => router.back()} style={S.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={S.title}>{t("screens.morning_flow.title")}</Text>
          <Text style={S.subtitle}>❤️ {AMY_ENCOURAGEMENT}</Text>
        </View>
        {state.startedAt && (
          <Pressable onPress={resetDay} style={S.resetBtn} hitSlop={10}>
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={S.resetText}>{t("screens.morning_flow.reset")}</Text>
          </Pressable>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
        {/* Amy delay nudge */}
        {delay.showAmyNudge && (
          <View style={S.nudgeCard}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={S.nudgeIcon}>
                <Ionicons name="flash" size={16} color={palette.amber700} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.nudgeTitle}>{AMY_NUDGE_TITLE}</Text>
                <Text style={S.nudgeBody}>
                  {AMY_NUDGE_BODY} <Text style={{ color: palette.amber700, fontWeight: "800" }}>{t("screens.morning_flow.minutes_behind", { n: delay.delayMinutes })}</Text>
                </Text>
                <Pressable onPress={acceptSimplify} style={S.nudgeBtn}>
                  <Ionicons name="sparkles" size={12} color="#fff" />
                  <Text style={S.nudgeBtnText}>{t("screens.morning_flow.simplify_rest")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Morning Flow card */}
        <View style={S.card}>
          <View style={S.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>{t("screens.morning_flow.morning_card_title")}</Text>
              <Text style={S.cardDesc}>{t("screens.morning_flow.steps_summary", { count: STEPS.length, minutes: planned })}</Text>
            </View>
            {!state.startedAt && (
              <Pressable onPress={startMorning} style={S.primaryBtn}>
                <Ionicons name="play" size={12} color="#fff" />
                <Text style={S.primaryBtnText}>{t("screens.morning_flow.start_morning")}</Text>
              </Pressable>
            )}
          </View>

          <View style={{ marginVertical: 8, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={S.metaText}>{t("screens.morning_flow.progress_meta", { done: summary.doneCount, total: summary.totalCount, skipped: summary.skippedCount })}</Text>
              {state.startedAt && (
                <Text style={S.metaText}>{t("screens.morning_flow.time_meta", { actual: delay.actualMinutes, planned })}</Text>
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
                <Text style={{ fontWeight: "800" }}>{t("screens.morning_flow.all_done")}  </Text>
                {summary.skippedCount > 0 ? t("screens.morning_flow.skipped_note", { n: summary.skippedCount }) : t("screens.morning_flow.smooth_morning")} {t("screens.morning_flow.have_great_day")}
              </Text>
            </View>
          )}
        </View>

        {/* Night Prep card */}
        <View style={S.card}>
          <View style={S.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>{t("screens.morning_flow.night_card_title")}</Text>
              <Text style={S.cardDesc}>{t("screens.morning_flow.night_summary", { done: night.done, total: night.total })}</Text>
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
                  <Text style={[S.nightLabel, checked && { color: palette.indigo800 }]}>{item.label}</Text>
                  {checked
                    ? <Ionicons name="checkmark-circle" size={22} color={palette.indigo500} />
                    : <View style={S.nightCircle} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={() => router.push("/routines" as never)} style={{ alignSelf: "center", marginTop: 4 }}>
          <Text style={{ color: palette.orange500, fontSize: 12, fontWeight: "700" }}>{t("screens.morning_flow.open_routines")}</Text>
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
  const { t } = useTranslation();
  const done = status === "done";
  const skipped = status === "skipped";
  const borderColor = done ? palette.emerald400 : skipped ? palette.slate300 : palette.gray200;
  const bg = done ? palette.emerald50 : skipped ? palette.slate50 : "#fff";
  return (
    <View style={[S.stepRow, { borderColor, backgroundColor: bg, opacity: skipped ? 0.7 : 1 }]}>
      <View style={S.stepIdx}><Text style={S.stepIdxText}>{index}</Text></View>
      <Text style={{ fontSize: 22 }}>{step.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[S.stepTitle, skipped && { textDecorationLine: "line-through", color: palette.slate400 }]}>{step.title}</Text>
        <Text style={S.stepMeta}>{t("screens.morning_flow.step_meta", { minutes: step.defaultMinutes })}{!step.essential ? t("screens.morning_flow.step_optional") : ""}</Text>
      </View>
      {status === "pending" ? (
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pressable onPress={onSkip} style={S.outlineBtn}>
            <Text style={S.outlineBtnText}>{t("screens.morning_flow.skip")}</Text>
          </Pressable>
          <Pressable onPress={onDone} style={S.doneBtn}>
            <Ionicons name="checkmark" size={14} color="#fff" />
            <Text style={S.doneBtnText}>{t("screens.morning_flow.done")}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={onUndo} style={S.undoBtn}>
          <Ionicons name="refresh" size={12} color={palette.slate500} />
          <Text style={S.undoBtnText}>{t("screens.morning_flow.undo")}</Text>
        </Pressable>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.orange50 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  title: { color: "#fff", fontSize: 19, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.92)", fontSize: 12, marginTop: 2 },
  resetBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)" },
  resetText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  card: { backgroundColor: "#fff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: palette.orange200 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: palette.slate900 },
  cardDesc: { fontSize: 12, color: palette.slate500, marginTop: 2 },
  metaText: { fontSize: 11, color: palette.slate500 },
  barTrack: { height: 7, backgroundColor: palette.orange200, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: palette.orange500 },

  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: palette.orange500, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  stepRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, borderWidth: 2 },
  stepIdx: { width: 26, height: 26, borderRadius: 13, backgroundColor: palette.orange100, alignItems: "center", justifyContent: "center" },
  stepIdxText: { color: palette.orange700, fontWeight: "800", fontSize: 12 },
  stepTitle: { fontSize: 14, fontWeight: "800", color: palette.slate900 },
  stepMeta: { fontSize: 11, color: palette.slate500, marginTop: 2 },

  outlineBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: palette.gray200, backgroundColor: "#fff" },
  outlineBtnText: { fontSize: 12, color: palette.slate600, fontWeight: "700" },
  doneBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: palette.green600 },
  doneBtnText: { fontSize: 12, color: "#fff", fontWeight: "800" },
  undoBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: palette.slate100 },
  undoBtnText: { fontSize: 11, color: palette.slate500, fontWeight: "700" },

  nightItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 2, borderColor: palette.gray200, backgroundColor: "#fff" },
  nightItemOn: { borderColor: palette.indigo500, backgroundColor: palette.indigo50 },
  nightLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: palette.slate900 },
  nightCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: palette.slate300 },

  doneBanner: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.green200, backgroundColor: palette.emerald50 },
  doneText: { color: palette.emerald800, fontSize: 13 },

  nudgeCard: { borderRadius: 16, borderWidth: 1, borderColor: palette.amber300, backgroundColor: palette.amber50, padding: 14 },
  nudgeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.amber100, alignItems: "center", justifyContent: "center" },
  nudgeTitle: { fontSize: 14, fontWeight: "800", color: palette.slate900 },
  nudgeBody: { fontSize: 12, color: palette.slate600, marginTop: 4, lineHeight: 17 },
  nudgeBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: palette.amber600 },
  nudgeBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
