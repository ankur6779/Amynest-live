import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import ActionButtons, { type ActionResult } from "./ActionButtons";
import { brand, brandAlpha } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAmyVoice } from "@/hooks/useAmyVoice";

// ─── ElevenLabs voice IDs (mirror server elevenLabsService.ts) ──────────────
// Audio is content-addressed cached in GCS server-side, so the first parent
// to listen to a given win pays the synth cost and EVERY other parent reads
// from the shared cache forever — no per-user duplication.
const COACH_VOICE_EN_FEMALE = "QbQKfe9vgx5OsbZUvlFv"; // Ananya K (Indian English)
const COACH_VOICE_HI_FEMALE = "TllHtNijgXBd45uTSCS7"; // Anjura (Calm Hindi)
const COACH_MODEL_EN = "eleven_turbo_v2_5";
const COACH_MODEL_HI = "eleven_multilingual_v2";

type CoachLang = "en" | "hi";

const { height: SCREEN_H } = Dimensions.get("window");
export const CARD_HEIGHT = SCREEN_H;

export type CoachWin = {
  id: string;
  index: number;
  title: string;
  objective: string;
  explanation: string;
  actions: string[];
  example: string;
  mistake: string;
  microTask: string;
  science: string;
  accent: readonly [string, string];
};

type Props = {
  win: CoachWin;
  total: number;
  topInset: number;
  bottomInset: number;
  onAction: (result: ActionResult) => void;
};

function SectionHeader({ icon, label, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={[styles.sectionLabel, { color }]}>{label}</Text>
    </View>
  );
}

export default function CoachCard({ win, total, topInset, bottomInset, onAction }: Props) {
  const c = useColors();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const { t, i18n } = useTranslation();

  // ─── Read-aloud (ElevenLabs, Hindi + English, GCS-cached) ─────────────────
  // Default the listen language to the parent's UI language; they can flip
  // EN ↔ HI per win via the chips next to the Listen button. Audio bytes are
  // shared across ALL parents via the server's content-addressed cache, so
  // a freshly tapped win plays instantly once any one parent has listened.
  const initialLang: CoachLang = i18n.language?.toLowerCase().startsWith("hi") ? "hi" : "en";
  const [lang, setLang] = useState<CoachLang>(initialLang);
  const voiceOpts = useMemo(
    () =>
      lang === "hi"
        ? { voiceId: COACH_VOICE_HI_FEMALE, modelId: COACH_MODEL_HI }
        : { voiceId: COACH_VOICE_EN_FEMALE, modelId: COACH_MODEL_EN },
    [lang],
  );
  const { speak, stop, speaking, loading } = useAmyVoice(voiceOpts);

  const buildSpeechText = useCallback(() => {
    return [
      `${win.index}. ${win.title}.`,
      win.objective,
      win.explanation,
      win.actions?.length ? win.actions.join(". ") : "",
      win.example,
      win.mistake ? `${win.mistake}.` : "",
      win.microTask ? `${win.microTask}.` : "",
    ].filter(Boolean).join(" ");
  }, [win]);

  const handleListen = useCallback(() => {
    if (speaking || loading) { stop(); return; }
    void speak(buildSpeechText());
  }, [speaking, loading, stop, speak, buildSpeechText]);

  const handleLangChange = useCallback((next: CoachLang) => {
    if (next === lang) return;
    // Don't auto-restart in the new voice — a silent voice swap mid-sentence
    // is jarring. Stop and let the parent tap Listen again to start fresh.
    if (speaking || loading) stop();
    setLang(next);
  }, [lang, speaking, loading, stop]);

  const isPlaying = speaking || loading;
  return (
    <View style={[styles.page, { height: CARD_HEIGHT }]}>
      <Animated.View
        entering={FadeIn.duration(450)}
        style={[styles.cardWrap, { paddingTop: topInset + 88, paddingBottom: bottomInset + 16 }]}
      >
        <BlurView intensity={40} tint={isDark ? "dark" : "light"} style={[styles.card, { borderColor: c.glassBorder }]}>
          <LinearGradient
            colors={isDark
              ? ["rgba(20,20,43,0.80)", "rgba(20,20,43,0.65)"]
              : ["rgba(255,255,255,0.92)", "rgba(255,255,255,0.78)"]}
            style={StyleSheet.absoluteFill}
          />

          {/* Accent bar */}
          <LinearGradient
            colors={win.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentBar}
          />

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Win header */}
            <View style={styles.winRow}>
              <LinearGradient
                colors={win.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.winNumber}
              >
                <Text style={styles.winNumberText}>{win.index}</Text>
              </LinearGradient>
              <Text style={[styles.winLabel, { color: c.textSubtle }]}>WIN {win.index} OF {total}</Text>
            </View>

            <Text style={[styles.title, { color: c.textStrong }]}>{win.title}</Text>

            {/* Listen + Lang toggle */}
            <View style={styles.listenRow} testID="coach-listen-row">
              <View style={[styles.langChips, { borderColor: brandAlpha.violet600_18, backgroundColor: brandAlpha.violet600_08 }]}>
                <Pressable
                  testID="coach-listen-lang-en"
                  accessibilityRole="button"
                  accessibilityLabel={t("components.coach_card.listen_in_english")}
                  accessibilityState={{ selected: lang === "en" }}
                  onPress={() => handleLangChange("en")}
                  style={[styles.langChip, lang === "en" && { backgroundColor: brand.violet600 }]}
                >
                  <Text style={[styles.langChipText, { color: lang === "en" ? c.primaryForeground : brand.violet700 }]}>EN</Text>
                </Pressable>
                <Pressable
                  testID="coach-listen-lang-hi"
                  accessibilityRole="button"
                  accessibilityLabel={t("components.coach_card.listen_in_hindi")}
                  accessibilityState={{ selected: lang === "hi" }}
                  onPress={() => handleLangChange("hi")}
                  style={[styles.langChip, lang === "hi" && { backgroundColor: brand.violet600 }]}
                >
                  <Text style={[styles.langChipText, { color: lang === "hi" ? c.primaryForeground : brand.violet700 }]}>HI</Text>
                </Pressable>
              </View>
              <Pressable
                testID="coach-listen-btn"
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? "Stop reading" : `Read this win aloud in ${lang === "hi" ? "Hindi" : "English"}`}
                onPress={handleListen}
                style={[
                  styles.listenBtn,
                  isPlaying
                    ? { backgroundColor: c.statusErrorBg, borderColor: c.statusErrorBorder }
                    : { backgroundColor: c.statusSuccessBg, borderColor: c.statusSuccessBorder },
                ]}
              >
                <Ionicons
                  name={isPlaying ? "stop-circle" : "volume-high"}
                  size={14}
                  color={isPlaying ? c.statusErrorText : c.statusSuccessText}
                />
                <Text
                  style={[
                    styles.listenBtnText,
                    { color: isPlaying ? c.statusErrorText : c.statusSuccessText },
                  ]}
                >
                  {speaking ? "Stop" : loading ? "…" : "Listen"}
                </Text>
              </Pressable>
            </View>

            {/* Objective */}
            <View style={styles.objectiveBox}>
              <Ionicons name="flag" size={14} color={brand.violet600} />
              <Text style={styles.objectiveText}>{win.objective}</Text>
            </View>

            {/* Deep explanation */}
            <SectionHeader icon="book-outline" label="WHY THIS WORKS" color={brand.indigo500} />
            <Text style={[styles.bodyText, { color: c.textBody }]}>{win.explanation}</Text>

            {/* Actions */}
            <SectionHeader icon="checkbox-outline" label="DO THIS" color={c.statusSuccessText} />
            <View style={{ gap: 10, marginTop: 4 }}>
              {win.actions.map((a, i) => (
                <View key={i} style={styles.actionRow}>
                  <View style={[styles.actionDot, { backgroundColor: c.statusSuccessBg, borderColor: c.statusSuccessBorder }]}>
                    <Text style={[styles.actionDotText, { color: c.statusSuccessText }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.actionText, { color: c.textBody }]}>{a}</Text>
                </View>
              ))}
            </View>

            {/* Example */}
            <SectionHeader icon="chatbubble-ellipses-outline" label="REAL EXAMPLE" color={c.highlight} />
            <View style={[styles.calloutBox, { backgroundColor: c.statusInfoBg, borderColor: c.statusInfoBorder }]}>
              <Text style={[styles.calloutText, { color: c.statusInfoText }]}>{win.example}</Text>
            </View>

            {/* Mistake */}
            <SectionHeader icon="alert-circle-outline" label="AVOID THIS" color={c.statusErrorText} />
            <View style={[styles.calloutBox, { backgroundColor: c.statusErrorBg, borderColor: c.statusErrorBorder }]}>
              <Text style={[styles.calloutText, { color: c.statusErrorText }]}>{win.mistake}</Text>
            </View>

            {/* Micro task */}
            <SectionHeader icon="flash-outline" label="MICRO TASK FOR TODAY" color={c.statusWarningText} />
            <View style={[styles.calloutBox, { backgroundColor: c.statusWarningBg, borderColor: c.statusWarningBorder }]}>
              <Text style={[styles.calloutText, { color: c.statusWarningText, fontWeight: "600" }]}>
                {win.microTask}
              </Text>
            </View>

            {/* Science */}
            <View style={[styles.science, { borderTopColor: c.border }]}>
              <Ionicons name="flask-outline" size={11} color={c.textSubtle} />
              <Text style={[styles.scienceText, { color: c.textSubtle }]}>{win.science}</Text>
            </View>
          </ScrollView>

          {/* Action buttons (sticky bottom) */}
          <View style={[styles.actionsWrap, { backgroundColor: c.glass, borderColor: c.glassBorder }]}>
            <ActionButtons onAction={onAction} />
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
    paddingHorizontal: 16,
  },
  cardWrap: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: brand.violet600,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 16,
  },
  accentBar: {
    height: 5,
    width: "100%",
  },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 110,
  },
  winRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  winNumber: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  winNumberText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  winLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  listenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  langChips: {
    flexDirection: "row",
    gap: 2,
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  langChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  langChipText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  listenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  listenBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  objectiveBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: brandAlpha.violet600_08,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: brandAlpha.violet600_18,
  },
  objectiveText: {
    flex: 1,
    color: brand.violet800,
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 19,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  bodyText: {
    fontSize: 14.5,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  actionDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  actionDotText: {
    fontSize: 11,
    fontWeight: "800",
  },
  actionText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 21,
  },
  calloutBox: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  calloutText: {
    fontSize: 14,
    lineHeight: 20.5,
  },
  science: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  scienceText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },
  actionsWrap: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
    paddingTop: 10,
    paddingHorizontal: 6,
    paddingBottom: 6,
    borderRadius: 22,
    borderWidth: 1,
  },
});
