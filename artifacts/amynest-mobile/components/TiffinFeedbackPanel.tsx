import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  STATUS_EMOJI, STATUS_LABEL,
  buildAmyTiffinHint, hasFeedbackForDate, recordFeedback, removeFeedback,
  summarizeFeedback, todayKey,
  type TiffinHistory, type TiffinStatus,
} from "@workspace/tiffin-feedback";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/colors";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "amynest.tiffin_feedback.v1";

export async function loadHistoryAsync(): Promise<TiffinHistory> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TiffinHistory) : [];
  } catch { return []; }
}
async function saveHistoryAsync(h: TiffinHistory) {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(h)); } catch {}
}

interface PickableMeal { id: string; title: string; emoji?: string; tag?: string; }

interface Props {
  pickableMeals: PickableMeal[];
  onChange: (history: TiffinHistory) => void;
}

export default function TiffinFeedbackPanel({ pickableMeals, onChange }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [history, setHistory] = useState<TiffinHistory>([]);
  const [pickedMealId, setPickedMealId] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => { loadHistoryAsync().then(setHistory); }, []);

  useEffect(() => {
    if (pickableMeals.length === 0) return;
    if (!pickableMeals.some(m => m.id === pickedMealId)) {
      setPickedMealId(pickableMeals[0]!.id);
    }
  }, [pickableMeals, pickedMealId]);

  const summary = useMemo(() => summarizeFeedback(history), [history]);
  const amyHint = useMemo(() => buildAmyTiffinHint(history), [history]);
  const today = todayKey();
  const todayDone = hasFeedbackForDate(history, today);
  const todayEntry = history.find(e => e.date === today);
  const pickedMeal = pickableMeals.find(m => m.id === pickedMealId);

  const submit = async (status: TiffinStatus) => {
    if (!pickedMeal) return;
    const next = recordFeedback(history, {
      mealId: pickedMeal.id, mealTitle: pickedMeal.title,
      emoji: pickedMeal.emoji, tag: pickedMeal.tag, status,
    });
    setHistory(next);
    await saveHistoryAsync(next);
    onChange(next);
  };

  const undoToday = async () => {
    if (!todayEntry) return;
    const next = removeFeedback(history, todayEntry.id);
    setHistory(next);
    await saveHistoryAsync(next);
    onChange(next);
  };

  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconBadge}><Text style={{ fontSize: 16 }}>🍱</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t("components.tiffin_feedback_panel.today_s_tiffin_feedback")}</Text>
          <Text style={styles.subtitle}>{t("components.tiffin_feedback_panel.helps_amy_learn_what_your_child_loves")}</Text>
        </View>
        {summary.totalRated > 0 ? (
          <View style={styles.eatenPill}>
            <Text style={styles.eatenPillText}>{summary.eatenPct}% eaten</Text>
          </View>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        {todayDone && todayEntry ? (
          <View style={styles.loggedRow}>
            <Ionicons name="checkmark-circle" size={16} color={palette.emerald600} />
            <Text style={styles.loggedText} numberOfLines={2}>
              Logged today: <Text style={{ fontWeight: "800" }}>{todayEntry.mealTitle}</Text> — {STATUS_EMOJI[todayEntry.status]} {STATUS_LABEL[todayEntry.status]}
            </Text>
            <TouchableOpacity onPress={undoToday} hitSlop={8} style={styles.undoBtn}>
              <Ionicons name="trash-outline" size={11} color={palette.slate400} />
              <Text style={styles.undoText}>{t("components.tiffin_feedback_panel.undo")}</Text>
            </TouchableOpacity>
          </View>
        ) : pickableMeals.length === 0 ? (
          <Text style={styles.italicMuted}>{t("components.tiffin_feedback_panel.suggestions_are_loading_pick_what_you_pa")}</Text>
        ) : (
          <>
            <Text style={styles.promptText}>{t("components.tiffin_feedback_panel.how_was_today_s_tiffin")}</Text>
            <TouchableOpacity onPress={() => setPickerOpen(true)} style={styles.picker} activeOpacity={0.85}>
              <Text style={styles.pickerText} numberOfLines={1}>
                {pickedMeal ? `${pickedMeal.emoji ?? ""} ${pickedMeal.title}` : "Choose a meal"}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.statusRow}>
              {(["eaten", "half", "not_eaten"] as TiffinStatus[]).map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => submit(s)}
                  style={[
                    styles.statusBtn,
                    s === "eaten" && { borderColor: "#86EFAC" }, // audit-ok: emerald-300 status border
                    s === "half" && { borderColor: "#FCD34D" }, // audit-ok: amber-300 status border
                    s === "not_eaten" && { borderColor: "#FDA4AF" }, // audit-ok: rose-300 status border
                  ]}
                >
                  <Text style={styles.statusEmoji}>{STATUS_EMOJI[s]}</Text>
                  <Text style={[
                    styles.statusLabel,
                    s === "eaten" && { color: palette.emerald700 },
                    s === "half" && { color: palette.amber700 },
                    s === "not_eaten" && { color: palette.rose700 },
                  ]} numberOfLines={1}>{STATUS_LABEL[s]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {amyHint ? (
          <View style={styles.hintBox}>
            <Text style={{ fontSize: 14 }}>🤖</Text>
            <Text style={styles.hintText}>{amyHint}</Text>
          </View>
        ) : null}

        {summary.topLiked.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.sectionLabel}>{t("components.tiffin_feedback_panel.top_liked_foods")}</Text>
            <View style={styles.chipRow}>
              {summary.topLiked.map(m => (
                <View key={m.mealId} style={styles.likedChip}>
                  <Text style={styles.likedChipText}>{m.emoji ?? "🍱"} {m.mealTitle}</Text>
                  <Text style={styles.likedCount}>×{m.eaten}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {/* Meal picker modal */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBack} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t("components.tiffin_feedback_panel.which_meal")}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {pickableMeals.map(m => {
                const active = m.id === pickedMealId;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => { setPickedMealId(m.id); setPickerOpen(false); }}
                    style={[styles.modalRow, active && { backgroundColor: palette.red200 }]}
                  >
                    <Text style={{ fontSize: 18 }}>{m.emoji ?? "🍱"}</Text>
                    <Text style={[styles.modalRowText, active && { fontWeight: "800" }]}>{m.title}</Text>
                    {active ? <Ionicons name="checkmark" size={16} color={palette.rose700} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    wrap: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(244,63,94,0.18)",
      backgroundColor: colors.card,
      overflow: "hidden",
      marginHorizontal: 14,
      marginTop: 12,
    },
    header: {
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingHorizontal: 14, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: "rgba(244,63,94,0.12)",
    },
    iconBadge: {
      width: 32, height: 32, borderRadius: 12,
      backgroundColor: "rgba(244,63,94,0.15)",
      alignItems: "center", justifyContent: "center",
    },
    title: { fontWeight: "800", fontSize: 13.5, color: colors.text },
    subtitle: { fontSize: 10.5, color: colors.textMuted, marginTop: 1 },
    eatenPill: { backgroundColor: "rgba(16,185,129,0.18)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    eatenPillText: { fontSize: 10.5, fontWeight: "800", color: palette.emerald700 },

    loggedRow: {
      flexDirection: "row", alignItems: "center", gap: 8,
      borderRadius: 12, borderWidth: 1, borderColor: "rgba(16,185,129,0.3)",
      backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 8,
    },
    loggedText: { flex: 1, fontSize: 12, color: colors.text },
    undoBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
    undoText: { fontSize: 11, color: colors.textMuted },

    italicMuted: { fontSize: 12, color: colors.textMuted, fontStyle: "italic" },
    promptText: { fontSize: 12.5, color: colors.text, marginBottom: 8 },

    picker: {
      flexDirection: "row", alignItems: "center", gap: 8,
      height: 36, paddingHorizontal: 10,
      borderRadius: 10, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    pickerText: { flex: 1, fontSize: 12.5, color: colors.text },

    statusRow: { flexDirection: "row", gap: 6, marginTop: 8 },
    statusBtn: {
      flex: 1, alignItems: "center", paddingVertical: 8, paddingHorizontal: 4,
      borderRadius: 10, borderWidth: 1.5, backgroundColor: colors.card,
    },
    statusEmoji: { fontSize: 16 },
    statusLabel: { fontSize: 10.5, fontWeight: "800", marginTop: 2 },

    hintBox: {
      flexDirection: "row", gap: 8, alignItems: "flex-start",
      marginTop: 12, padding: 8, borderRadius: 10,
      backgroundColor: "rgba(139,92,246,0.10)",
      borderWidth: 1, borderColor: "rgba(139,92,246,0.20)",
    },
    hintText: { flex: 1, fontSize: 11.5, lineHeight: 16, color: colors.text },

    sectionLabel: {
      fontSize: 10.5, fontWeight: "800", letterSpacing: 0.4,
      textTransform: "uppercase", color: colors.textMuted, marginBottom: 6,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    likedChip: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
      backgroundColor: "rgba(244,63,94,0.15)",
      borderWidth: 1, borderColor: "rgba(244,63,94,0.30)",
    },
    likedChipText: { fontSize: 11, fontWeight: "800", color: palette.rose700 },
    likedCount: { fontSize: 10.5, color: "rgba(190,18,60,0.7)", fontWeight: "600" },

    modalBack: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
    modalSheet: {
      backgroundColor: colors.card, borderRadius: 18, padding: 14,
      borderWidth: 1, borderColor: colors.border,
    },
    modalTitle: { fontWeight: "800", fontSize: 14, color: colors.text, marginBottom: 8 },
    modalRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10,
    },
    modalRowText: { flex: 1, fontSize: 13, color: colors.text },
  });
}
