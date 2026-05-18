import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import * as FileSystem from "expo-file-system";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useFeatureUsage } from "@/hooks/useFeatureUsage";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import LockedBlock from "@/components/LockedBlock";
import { brand, palette } from "@/constants/colors";
import {
  PARENT_GUIDANCE_CARDS,
  SPEECH_AFFIRMATIONS,
  SPEECH_GAMES,
  SPEECH_MILESTONES,
  monthsToBand,
  compareTranscript,
  getPromptsPool,
  type PronouncePrompt,
  type PronouncePromptDifficulty,
  type PronouncePromptKind,
  type SpeechAgeBand,
  type TranscriptFeedback,
} from "@workspace/speech-coach";

type Child = { id: number; name: string; age: number; ageMonths?: number };

const PRONOUNCE_TABS: readonly PronouncePromptKind[] = [
  "letter",
  "phonic",
  "word",
  "sentence",
] as const;

const MILESTONE_TABS: readonly SpeechAgeBand[] = [
  "1y",
  "2y",
  "3y",
  "4y_plus",
] as const;

function ageMonthsOf(child: Child | null): number {
  if (!child) return 0;
  const months = child.ageMonths ?? child.age * 12;
  return Math.max(0, Math.floor(months));
}

export default function SpeechCoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const c = useColors();
  const authFetch = useAuthFetch();
  const usage = useFeatureUsage();
  const voice = useAmyVoice();

  const { data: childrenData } = useQuery<Child[]>({
    queryKey: ["children-for-speech-coach"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      return r.ok ? r.json() : [];
    },
    staleTime: 60_000,
  });
  const children = useMemo(
    () => (Array.isArray(childrenData) ? childrenData : []),
    [childrenData],
  );
  const child = children[0] ?? null;
  const childAgeMonths = ageMonthsOf(child);
  const childBand = monthsToBand(childAgeMonths) ?? "1y";

  const [milestoneTab, setMilestoneTab] = useState<SpeechAgeBand>(childBand);
  const [pronounceDifficulty, setPronounceDifficulty] = useState<PronouncePromptDifficulty>("easy");
  const [pronounceKind, setPronounceKind] = useState<PronouncePromptKind>("word");
  const [sttRecording, setSttRecording] = useState(false);
  const [sttTranscribing, setSttTranscribing] = useState(false);
  // ── Session state ──────────────────────────────────────────────────────────
  const [sessionPhase, setSessionPhase] = useState<"setup" | "practice" | "done">("setup");
  const [promptPhase, setPromptPhase] = useState<"idle" | "heard" | "recording" | "analyzing" | "result">("idle");
  const [sessionItems, setSessionItems] = useState<PronouncePrompt[]>([]);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [sessionResults, setSessionResults] = useState<Array<{ id: string; feedback: TranscriptFeedback; score: number }>>([]);
  const [promptResult, setPromptResult] = useState<{ feedback: TranscriptFeedback; score: number; transcript: string } | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const waveAnim = useRef(new Animated.Value(0)).current;
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const joinWaitlist = useMutation({
    mutationFn: async () => {
      const r = await authFetch("/api/speech/expert-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: child?.id ?? null }),
      });
      if (!r.ok && r.status !== 409) throw new Error("waitlist_error");
    },
  });
  const waitlistJoined = joinWaitlist.isSuccess;

  // Per-mount dedupe so a section's first interaction (any touch within it)
  // marks the matching premium feature exactly once. Mounting the screen
  // alone must NOT mark anything used — only an actual user touch does.
  const markedRef = useRef<Set<string>>(new Set());
  const markOnce = useCallback(
    (key: string) => {
      if (markedRef.current.has(key)) return;
      markedRef.current.add(key);
      usage.markFeatureUsed(key);
    },
    [usage],
  );

  const MOBILE_SESSION_SIZE = 10;
  const MOBILE_DIFFICULTY_TABS: readonly PronouncePromptDifficulty[] = ["easy", "medium", "advanced"] as const;
  const MOBILE_ENCOURAGEMENT: Record<TranscriptFeedback, string[]> = {
    great: ["Amazing job! 🌟", "You said it perfectly! ⭐", "Amy is so proud of you! 🎉", "Wonderful — so clear! ✨"],
    close: ["So close! Try a little slower. 👍", "Almost there! One more try. 💪", "Great effort! Sounds one at a time."],
    try_again: ["Let's try again together! 🤝", "Keep going — you're getting better! 💪", "Every try makes you stronger!"],
  };
  const mobilePickEncouragement = (feedback: TranscriptFeedback, score: number): string => {
    const list = MOBILE_ENCOURAGEMENT[feedback];
    return list[Math.floor((score / 101) * list.length)] ?? list[0];
  };
  const mobileSeededShuffle = <T,>(arr: T[], seed: number): T[] => {
    const out = [...arr];
    let s = seed;
    for (let i = out.length - 1; i > 0; i--) {
      s = ((s * 1664525) + 1013904223) & 0xffffffff;
      const j = Math.abs(s) % (i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const currentSessionItem = sessionItems[sessionIdx] ?? null;
  const isLastSessionItem = sessionIdx === sessionItems.length - 1;

  const milestones = useMemo(
    () => SPEECH_MILESTONES.filter((m) => m.ageBand === milestoneTab),
    [milestoneTab],
  );

  const handleSpeak = useCallback(
    (text: string, mode?: "phonics") => {
      if (voice.speaking || voice.loading) {
        voice.stop();
        return;
      }
      void voice.speak(text, mode ? { mode } : undefined);
    },
    [voice],
  );

  // ── waveform animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (sttRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      waveAnim.setValue(0);
    }
  }, [sttRecording, waveAnim]);

  const startSttRecording = useCallback(async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) return;
      setPromptResult(null);
      setPromptError(null);
      setSttRecording(true);
      setPromptPhase("recording");
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch {
      setSttRecording(false);
      setPromptPhase("idle");
      setPromptError(t("error_generic"));
    }
  }, [audioRecorder, t]);

  const stopSttRecording = useCallback(async () => {
    if (!sttRecording) return;
    setSttRecording(false);
    setSttTranscribing(true);
    setPromptError(null);
    setPromptPhase("analyzing");
    const currentText = currentSessionItem?.text ?? null;
    // Safety net: if analysis takes more than 20 s, bail out with an error.
    const bailTimer = setTimeout(() => {
      setSttTranscribing(false);
      setPromptPhase("idle");
      setPromptError(t("error_generic"));
    }, 20_000);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) {
        clearTimeout(bailTimer);
        setSttTranscribing(false);
        setPromptPhase("idle");
        setPromptError(t("error_generic"));
        return;
      }
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });
      const res = await authFetch("/api/speech/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64 }),
      });
      if (!res.ok) {
        clearTimeout(bailTimer);
        setSttTranscribing(false);
        setPromptPhase("idle");
        setPromptError(t("error_generic"));
        return;
      }
      clearTimeout(bailTimer);
      const { readResolvedApiJson } = await import("@/lib/poll-result");
      const body = await readResolvedApiJson<{ transcript?: string }>(res, authFetch);
      const trimmed = body?.transcript?.trim() ?? "";
      if (currentText) {
        const r = compareTranscript(currentText, trimmed || "");
        setPromptResult({
          transcript: trimmed,
          feedback: trimmed ? r.feedback : "try_again",
          score: trimmed ? r.score : 0,
        });
      }
      setPromptPhase("result");
    } catch {
      clearTimeout(bailTimer);
      setPromptPhase("idle");
      setPromptError(t("error_generic"));
    } finally {
      setSttTranscribing(false);
    }
  }, [sttRecording, audioRecorder, authFetch, currentSessionItem, t]);

  const storyTitle = t("screens.speech_coach.read_aloud.story_default_title");
  const storyBody = t("screens.speech_coach.read_aloud.story_default_body");

  return (
    <View style={[s.root, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[brand.violet600, brand.pink500]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={s.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={s.backBtn}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />{/* audit-ok: header chevron on gradient */}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{t("screens.speech_coach.title")}</Text>
            <Text style={s.headerSub}>{t("screens.speech_coach.subtitle")}</Text>
          </View>
          <View style={s.headerEmoji}>
            <Text style={{ fontSize: 26 }}>🗣️</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Dashboard ───────────────────────────────────────────── */}
        <DashboardCard
          c={c}
          childAgeMonths={childAgeMonths}
          band={childBand}
          t={t}
        />

        {/* ── 2. Milestone Checker ──────────────────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_milestones")}
          reason="hub_speech_milestones"
          onInteract={() => markOnce("hub_speech_milestones")}
          title={t("screens.speech_coach.milestones.section_title")}
          icon="checkmark-done-circle"
        >
          <View style={s.tabsRow}>
            {MILESTONE_TABS.map((band) => {
              const active = band === milestoneTab;
              return (
                <Pressable
                  key={band}
                  onPress={() => setMilestoneTab(band)}
                  style={[
                    s.tabPill,
                    {
                      backgroundColor: active ? brand.violet500 : c.muted,
                      borderColor: active ? brand.violet500 : c.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? "#FFFFFF" /* audit-ok: pill foreground on filled brand */ : c.foreground,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {t(`screens.speech_coach.milestones.tab.${band}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ gap: 10 }}>
            {milestones.map((m) => (
              <View
                key={m.id}
                style={[s.row, { backgroundColor: c.card, borderColor: c.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: c.foreground }]}>
                    {t(m.i18nKeyLabel)}
                  </Text>
                  <Text style={[s.rowHint, { color: c.mutedForeground }]}>
                    {t(m.i18nKeyHint)}
                  </Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: `${palette.emerald500}22` }]}>
                  <Text style={{ color: palette.emerald700, fontWeight: "700", fontSize: 11 }}>
                    {t("screens.speech_coach.milestones.status.on_track")}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </SectionShell>

        {/* ── 3. AI Pronunciation Practice ─────────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_pronounce")}
          reason="hub_speech_pronounce"
          onInteract={() => markOnce("hub_speech_pronounce")}
          title={t("screens.speech_coach.pronounce.section_title")}
          icon="mic-circle"
        >
          {/* ── Difficulty + Kind selectors (always visible) ─────────── */}
          <View style={{ gap: 8 }}>
            <Text style={[s.sttPanelTitle, { color: c.mutedForeground }]}>
              {t("screens.speech_coach.pronounce.difficulty.label")}
            </Text>
            <View style={s.tabsRow}>
              {MOBILE_DIFFICULTY_TABS.map((d) => {
                const active = d === pronounceDifficulty;
                return (
                  <Pressable
                    key={d}
                    onPress={() => { if (sessionPhase !== "practice") setPronounceDifficulty(d); }}
                    disabled={sessionPhase === "practice"}
                    style={[
                      s.tabPill,
                      {
                        backgroundColor: active ? brand.violet500 : c.muted,
                        borderColor: active ? brand.violet500 : c.border,
                        opacity: sessionPhase === "practice" ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? "#FFFFFF" /* audit-ok: pill foreground on filled brand */ : c.foreground, fontWeight: "700", fontSize: 12 }}>
                      {t(`screens.speech_coach.pronounce.difficulty.${d}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={s.tabsRow}>
              {PRONOUNCE_TABS.map((k) => {
                const active = k === pronounceKind;
                return (
                  <Pressable
                    key={k}
                    onPress={() => { if (sessionPhase !== "practice") setPronounceKind(k); }}
                    disabled={sessionPhase === "practice"}
                    style={[
                      s.tabPill,
                      {
                        backgroundColor: active ? brand.violet500 : c.muted,
                        borderColor: active ? brand.violet500 : c.border,
                        opacity: sessionPhase === "practice" ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? "#FFFFFF" /* audit-ok: pill foreground on filled brand */ : c.foreground, fontWeight: "700", fontSize: 12 }}>
                      {t(`screens.speech_coach.pronounce.tab.${k}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── SETUP phase ──────────────────────────────────────────── */}
          {sessionPhase === "setup" && (() => {
            const pool = getPromptsPool(childAgeMonths, pronounceKind, pronounceDifficulty);
            const sessionSize = Math.min(MOBILE_SESSION_SIZE, pool.length);
            return (
              <View style={[s.setupCard, { backgroundColor: c.muted, borderColor: c.border }]}>
                <Text style={{ fontSize: 32, textAlign: "center" }}>🎙️</Text>
                <Text style={[s.sectionTitle, { color: c.foreground, textAlign: "center", fontSize: 15 }]}>
                  {t(`screens.speech_coach.pronounce.difficulty.${pronounceDifficulty}`)}{" "}
                  {t(`screens.speech_coach.pronounce.tab.${pronounceKind}`)}
                </Text>
                <Text style={[s.note, { color: c.mutedForeground, textAlign: "center" }]}>
                  {t("screens.speech_coach.pronounce.session.session_size", { count: sessionSize })}
                </Text>
                {pool.length === 0 ? (
                  <Text style={[s.intro, { color: c.mutedForeground, textAlign: "center" }]}>
                    {t("screens.speech_coach.pronounce.session.no_prompts")}
                  </Text>
                ) : (
                  <Pressable
                    onPress={() => {
                      const shuffled = mobileSeededShuffle([...pool], Date.now());
                      setSessionItems(shuffled.slice(0, Math.min(MOBILE_SESSION_SIZE, shuffled.length)));
                      setSessionIdx(0);
                      setSessionResults([]);
                      setPromptResult(null);
                      setPromptPhase("idle");
                      setSessionPhase("practice");
                    }}
                    style={[s.fullBtn, { backgroundColor: brand.violet500 }]}
                    accessibilityRole="button"
                  >
                    <Ionicons name="mic" size={16} color="#FFFFFF" /* audit-ok: icon on filled brand */ />
                    <Text style={s.fullBtnText}>
                      {t("screens.speech_coach.pronounce.session.start_cta")}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })()}

          {/* ── PRACTICE phase ───────────────────────────────────────── */}
          {sessionPhase === "practice" && currentSessionItem && (
            <View style={{ gap: 10 }}>
              {/* Progress bar */}
              <View style={{ gap: 4 }}>
                <View style={s.progressRow}>
                  <Text style={[s.note, { color: c.mutedForeground }]}>
                    {t("screens.speech_coach.pronounce.session.progress", { done: sessionIdx + 1, total: sessionItems.length })}
                  </Text>
                  <Pressable onPress={() => { setSessionPhase("setup"); setSessionItems([]); setSttRecording(false); }} hitSlop={10}>
                    <Text style={{ color: brand.violet500, fontSize: 13, fontWeight: "700" }}>✕</Text>
                  </Pressable>
                </View>
                <View style={[s.progressTrack, { backgroundColor: c.muted }]}>
                  <View
                    style={[
                      s.progressFill,
                      { backgroundColor: brand.violet500, width: `${(sessionIdx / sessionItems.length) * 100}%` as unknown as number },
                    ]}
                  />
                </View>
              </View>

              {/* Main prompt card */}
              <View
                style={[
                  s.promptCard,
                  {
                    backgroundColor: promptPhase === "recording"
                      ? `${brand.violet500}10`
                      : promptPhase === "result" && promptResult?.feedback === "great"
                        ? "rgba(16,185,129,0.08)" /* audit-ok: success session card bg */
                        : c.card,
                    borderColor: promptPhase === "recording"
                      ? brand.violet500
                      : c.border,
                  },
                ]}
              >
                <Text style={[s.kindBadge, { color: c.mutedForeground }]}>
                  {t(`screens.speech_coach.pronounce.tab.${currentSessionItem.kind}`).toUpperCase()}
                </Text>
                <Text style={[s.promptText, { color: c.foreground }]}>
                  {currentSessionItem.text}
                </Text>

                {/* Waveform */}
                {sttRecording && (
                  <View style={s.waveRow} accessibilityElementsHidden>
                    {[35, 65, 90, 55, 80, 45, 85, 60, 75, 40].map((baseH, i) => (
                      <Animated.View
                        key={i}
                        style={[
                          s.waveBar,
                          {
                            backgroundColor: brand.violet500,
                            transform: [{
                              scaleY: waveAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3 + (baseH / 200), 1],
                              }),
                            }],
                            opacity: 0.5 + (baseH / 200),
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}

                {/* Listening label */}
                {sttRecording && (
                  <View style={s.listeningRow}>
                    <View style={[s.listeningDot, { backgroundColor: brand.violet500 }]} />
                    <Text style={[s.listeningText, { color: brand.violet500 }]}>
                      {t("screens.speech_coach.stt.listening")}
                    </Text>
                  </View>
                )}

                {/* Analyzing */}
                {(sttTranscribing || promptPhase === "analyzing") && (
                  <Text style={[s.analyzingText, { color: brand.violet500 }]} accessibilityLiveRegion="polite">
                    {t("screens.speech_coach.stt.analyzing")}
                  </Text>
                )}
              </View>

              {/* Transcription error */}
              {promptError && !sttRecording && !sttTranscribing && promptPhase !== "analyzing" && (
                <View
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: "rgba(239,68,68,0.10)", /* audit-ok: semantic error tint */
                    borderWidth: 1,
                    borderColor: "rgba(239,68,68,0.30)", /* audit-ok: semantic error border */
                  }}
                  accessibilityLiveRegion="assertive"
                >
                  <Text style={{ color: "#fca5a5", fontSize: 13, fontWeight: "600", textAlign: "center" /* audit-ok: error text on error tint bg */ }}>
                    {promptError}
                  </Text>
                </View>
              )}

              {/* Feedback card */}
              {promptPhase === "result" && promptResult && (
                <View
                  style={[
                    s.sttResultCard,
                    {
                      backgroundColor:
                        promptResult.feedback === "great"
                          ? "rgba(16,185,129,0.12)" /* audit-ok: semantic success feedback tint */
                          : promptResult.feedback === "close"
                            ? "rgba(245,158,11,0.12)" /* audit-ok: semantic warning feedback tint */
                            : "rgba(239,68,68,0.12)", /* audit-ok: semantic error feedback tint */
                      borderColor:
                        promptResult.feedback === "great"
                          ? "rgba(16,185,129,0.35)" /* audit-ok: semantic success border */
                          : promptResult.feedback === "close"
                            ? "rgba(245,158,11,0.35)" /* audit-ok: semantic warning border */
                            : "rgba(239,68,68,0.35)", /* audit-ok: semantic error border */
                    },
                  ]}
                  accessibilityLiveRegion="polite"
                >
                  <View style={s.listeningRow}>
                    <Text style={{ fontSize: 22 }}>
                      {promptResult.feedback === "great" ? "⭐" : promptResult.feedback === "close" ? "👍" : "💪"}
                    </Text>
                    <Text style={[s.sttResultLabel, { color: c.foreground }]}>
                      {t(`screens.speech_coach.stt.feedback.${promptResult.feedback}`)}
                    </Text>
                  </View>
                  <Text style={[s.rowHint, { color: c.mutedForeground }]}>
                    {mobilePickEncouragement(promptResult.feedback, promptResult.score)}
                  </Text>
                  {/* Score bar */}
                  <View style={{ gap: 4 }}>
                    <View style={s.progressRow}>
                      <Text style={[s.sttPanelTitle, { color: c.mutedForeground }]}>
                        {t("screens.speech_coach.pronounce.session.score_label")}
                      </Text>
                      <Text style={[s.sttPanelTitle, { color: c.foreground }]}>
                        {promptResult.score}%
                      </Text>
                    </View>
                    <View style={[s.progressTrack, { backgroundColor: c.muted }]}>
                      <View
                        style={[
                          s.progressFill,
                          {
                            width: `${promptResult.score}%` as unknown as number,
                            backgroundColor:
                              promptResult.feedback === "great"
                                ? palette.emerald500 /* audit-ok: score bar on success */
                                : promptResult.feedback === "close"
                                  ? palette.amber500 /* audit-ok: score bar on warning */
                                  : palette.red500, /* audit-ok: score bar on error */
                          },
                        ]}
                      />
                    </View>
                  </View>
                  {promptResult.transcript ? (
                    <Text style={[s.sttResultSaid, { color: c.mutedForeground }]}>
                      {t("screens.speech_coach.stt.you_said")} &ldquo;{promptResult.transcript}&rdquo;
                    </Text>
                  ) : null}
                </View>
              )}

              {/* Action buttons */}
              <View style={s.tabsRow}>
                {/* Hear Amy */}
                <Pressable
                  onPress={() => {
                    const isPhonic = currentSessionItem.kind === "phonic" || currentSessionItem.kind === "letter";
                    handleSpeak(currentSessionItem.text, isPhonic ? "phonics" : undefined);
                    if (promptPhase === "idle") setPromptPhase("heard");
                  }}
                  disabled={sttRecording || sttTranscribing}
                  style={[
                    s.halfBtn,
                    {
                      backgroundColor: c.muted,
                      borderColor: c.border,
                      opacity: (sttRecording || sttTranscribing) ? 0.5 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons name="volume-high" size={14} color={c.foreground} />
                  <Text style={[s.halfBtnText, { color: c.foreground }]}>
                    {voice.speaking || voice.loading
                      ? t("screens.speech_coach.pronounce.listening")
                      : promptPhase === "heard" || promptPhase === "result"
                        ? t("screens.speech_coach.pronounce.hear_again")
                        : t("screens.speech_coach.pronounce.session.hear_amy")}
                  </Text>
                </Pressable>

                {/* Record / Stop */}
                {promptPhase !== "result" && (
                  sttRecording ? (
                    <Pressable
                      onPress={() => void stopSttRecording()}
                      style={[s.halfBtn, { backgroundColor: palette.red500 }]}
                      accessibilityRole="button"
                    >
                      <Ionicons name="stop-circle" size={14} color="#FFFFFF" /* audit-ok: icon on filled red */ />
                      <Text style={[s.halfBtnText, { color: "#FFFFFF" /* audit-ok: text on filled red */ }]}>
                        {t("screens.speech_coach.stt.stop_recording")}
                      </Text>
                    </Pressable>
                  ) : sttTranscribing || promptPhase === "analyzing" ? (
                    <View style={[s.halfBtn, { backgroundColor: c.muted }]}>
                      <Ionicons name="hourglass" size={14} color={c.mutedForeground} />
                      <Text style={[s.halfBtnText, { color: c.mutedForeground }]}>
                        {t("screens.speech_coach.stt.transcribing")}
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => void startSttRecording()}
                      style={[s.halfBtn, { backgroundColor: brand.violet500 }]}
                      accessibilityRole="button"
                    >
                      <Ionicons name="mic" size={14} color="#FFFFFF" /* audit-ok: icon on filled brand */ />
                      <Text style={[s.halfBtnText, { color: "#FFFFFF" /* audit-ok: text on filled brand */ }]}>
                        {t("screens.speech_coach.stt.tap_to_record")}
                      </Text>
                    </Pressable>
                  )
                )}

                {/* After result */}
                {promptPhase === "result" && promptResult && (
                  <>
                    {promptResult.feedback !== "great" && (
                      <Pressable
                        onPress={() => { setPromptResult(null); setPromptPhase("idle"); }}
                        style={[s.halfBtn, { backgroundColor: c.muted, borderColor: c.border }]}
                        accessibilityRole="button"
                      >
                        <Ionicons name="refresh" size={14} color={c.foreground} />
                        <Text style={[s.halfBtnText, { color: c.foreground }]}>
                          {t("screens.speech_coach.pronounce.session.try_again")}
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => {
                        const updated = [...sessionResults, { id: currentSessionItem.id, feedback: promptResult.feedback, score: promptResult.score }];
                        setSessionResults(updated);
                        if (isLastSessionItem) {
                          setSessionPhase("done");
                        } else {
                          setSessionIdx((i) => i + 1);
                          setPromptPhase("idle");
                          setPromptResult(null);
                        }
                      }}
                      style={[s.halfBtn, { backgroundColor: brand.violet500 }]}
                      accessibilityRole="button"
                    >
                      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" /* audit-ok: icon on filled brand */ />
                      <Text style={[s.halfBtnText, { color: "#FFFFFF" /* audit-ok: text on filled brand */ }]}>
                        {isLastSessionItem
                          ? t("screens.speech_coach.pronounce.session.complete_title")
                          : t("screens.speech_coach.pronounce.session.next_word")}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          )}

          {/* ── DONE phase ───────────────────────────────────────────── */}
          {sessionPhase === "done" && (
            <View style={[s.setupCard, { backgroundColor: c.muted, borderColor: c.border }]}>
              <Text style={{ fontSize: 36, textAlign: "center" }}>🎉</Text>
              <Text style={[s.sectionTitle, { color: c.foreground, textAlign: "center" }]}>
                {t("screens.speech_coach.pronounce.session.complete_title")}
              </Text>
              <Text style={[s.note, { color: c.mutedForeground, textAlign: "center" }]}>
                {t("screens.speech_coach.pronounce.session.complete_subtitle", { count: sessionResults.length })}
              </Text>

              {/* Summary */}
              {(() => {
                const strong = sessionResults
                  .filter((r) => r.feedback === "great")
                  .map((r) => sessionItems.find((p) => p.id === r.id)?.text ?? "")
                  .filter(Boolean);
                const practice = sessionResults
                  .filter((r) => r.feedback === "try_again")
                  .map((r) => sessionItems.find((p) => p.id === r.id)?.text ?? "")
                  .filter(Boolean);
                return (
                  <View style={{ gap: 8, width: "100%" }}>
                    {strong.length > 0 && (
                      <View style={[s.summaryBox, { backgroundColor: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.3)" /* audit-ok: session summary success tint */ }]}>
                        <Text style={[s.sttPanelTitle, { color: palette.emerald700 /* audit-ok: label on success tint */ }]}>
                          {t("screens.speech_coach.pronounce.session.strong_label")} ✓
                        </Text>
                        <Text style={[s.rowTitle, { color: c.foreground }]}>{strong.join(" · ")}</Text>
                      </View>
                    )}
                    {practice.length > 0 && (
                      <View style={[s.summaryBox, { backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)" /* audit-ok: session summary warning tint */ }]}>
                        <Text style={[s.sttPanelTitle, { color: palette.amber700 /* audit-ok: label on warning tint */ }]}>
                          {t("screens.speech_coach.pronounce.session.needs_practice_label")}
                        </Text>
                        <Text style={[s.rowTitle, { color: c.foreground }]}>{practice.join(" · ")}</Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              <Pressable
                onPress={() => { setSessionPhase("setup"); setSessionItems([]); setSessionResults([]); setPromptResult(null); setPromptPhase("idle"); }}
                style={[s.fullBtn, { backgroundColor: brand.violet500 }]}
                accessibilityRole="button"
              >
                <Ionicons name="refresh" size={16} color="#FFFFFF" /* audit-ok: icon on filled brand */ />
                <Text style={s.fullBtnText}>
                  {t("screens.speech_coach.pronounce.session.new_session")}
                </Text>
              </Pressable>
            </View>
          )}
        </SectionShell>

        {/* ── 4. Read Aloud & Repeat ────────────────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_read_aloud")}
          reason="hub_speech_read_aloud"
          onInteract={() => markOnce("hub_speech_read_aloud")}
          title={t("screens.speech_coach.read_aloud.section_title")}
          icon="book"
        >
          <Text style={[s.intro, { color: c.mutedForeground }]}>
            {t("screens.speech_coach.read_aloud.intro")}
          </Text>
          <View style={[s.storyCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.storyTitle, { color: c.foreground }]}>{storyTitle}</Text>
            <Text style={[s.storyBody, { color: c.foreground }]}>{storyBody}</Text>
          </View>
          <Pressable
            onPress={() => handleSpeak(`${storyTitle}. ${storyBody}`)}
            style={[s.fullBtn, { backgroundColor: brand.violet500 }]}
          >
            <Ionicons
              name={voice.speaking || voice.loading ? "stop" : "play"}
              size={16}
              color="#FFFFFF"/* audit-ok: button glyph on filled brand */
            />
            <Text style={s.fullBtnText}>
              {voice.speaking || voice.loading
                ? t("screens.speech_coach.pronounce.stop_recording")
                : t("screens.speech_coach.read_aloud.play_story")}
            </Text>
          </Pressable>
        </SectionShell>

        {/* ── 5. Daily Speech Games ─────────────────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_games")}
          reason="hub_speech_games"
          onInteract={() => markOnce("hub_speech_games")}
          title={t("screens.speech_coach.games.section_title")}
          icon="game-controller"
        >
          <View style={{ gap: 10 }}>
            {SPEECH_GAMES.map((g) => (
              <View
                key={g.id}
                style={[s.row, { backgroundColor: c.card, borderColor: c.border, alignItems: "flex-start" }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: c.foreground }]}>
                    {t(g.i18nKeyTitle)}
                  </Text>
                  <Text style={[s.rowHint, { color: c.mutedForeground }]}>
                    {t(g.i18nKeyDescription)}
                  </Text>
                </View>
                <View style={[s.starsPill, { backgroundColor: `${palette.amber500}22` }]}>
                  <Text style={{ color: palette.amber700, fontWeight: "800", fontSize: 11 }}>
                    {t("screens.speech_coach.games.stars_other", { count: g.rewardStars })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </SectionShell>

        {/* ── 6. Parent Guidance ────────────────────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_guidance")}
          reason="hub_speech_guidance"
          onInteract={() => markOnce("hub_speech_guidance")}
          title={t("screens.speech_coach.guidance.section_title")}
          icon="bulb"
        >
          <View style={{ gap: 12 }}>
            {PARENT_GUIDANCE_CARDS.map((g) => (
              <View
                key={g.id}
                style={[s.guidanceCard, { backgroundColor: c.card, borderColor: c.border }]}
              >
                <Text style={[s.rowTitle, { color: c.foreground, fontSize: 15 }]}>
                  {t(g.i18nKeyTitle)}
                </Text>
                <Text style={[s.rowHint, { color: c.mutedForeground, marginTop: 4 }]}>
                  {t(g.i18nKeyBody)}
                </Text>
                <View style={[s.tipBox, { backgroundColor: `${brand.violet500}12` }]}>
                  <Text style={{ color: brand.violet700, fontWeight: "700", fontSize: 11 }}>
                    {t("screens.speech_coach.guidance.amy_tip_label")}
                  </Text>
                  <Text style={{ color: c.foreground, fontSize: 13, marginTop: 2 }}>
                    {t(g.i18nKeyTip)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </SectionShell>

        {/* ── 7. Emotion & Confidence Builder ─────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_affirmations")}
          reason="hub_speech_affirmations"
          onInteract={() => markOnce("hub_speech_affirmations")}
          title={t("screens.speech_coach.affirmations.section_title")}
          icon="heart"
        >
          <Text style={[s.intro, { color: c.mutedForeground }]}>
            {t("screens.speech_coach.affirmations.intro")}
          </Text>
          <View style={s.affirmationsGrid}>
            {SPEECH_AFFIRMATIONS.map((a) => (
              <View
                key={a.id}
                style={[s.affirmation, { backgroundColor: `${brand.pink500}12`, borderColor: c.border }]}
              >
                <Text style={{ color: c.foreground, fontSize: 13, fontWeight: "600" }}>
                  {t(a.i18nKeyText)}
                </Text>
              </View>
            ))}
          </View>
        </SectionShell>

        {/* ── 8. Progress Reports ───────────────────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_reports")}
          reason="hub_speech_reports"
          onInteract={() => markOnce("hub_speech_reports")}
          title={t("screens.speech_coach.reports.section_title")}
          icon="bar-chart"
        >
          <Text style={[s.intro, { color: c.mutedForeground }]}>
            {t("screens.speech_coach.reports.intro")}
          </Text>
          <View style={{ gap: 8 }}>
            <ReportRow
              c={c}
              label={t("screens.speech_coach.reports.improved_sounds")}
              value="m, p, b"
            />
            <ReportRow
              c={c}
              label={t("screens.speech_coach.reports.difficult_sounds")}
              value="r, th"
            />
            <ReportRow
              c={c}
              label={t("screens.speech_coach.reports.vocabulary_growth")}
              value="+12"
            />
            <ReportRow
              c={c}
              label={t("screens.speech_coach.reports.confidence_trend")}
              value="↗︎"
            />
          </View>
          <Pressable
            disabled
            style={[s.fullBtn, { backgroundColor: c.muted, opacity: 0.6 }]}
            accessibilityState={{ disabled: true }}
          >
            <Ionicons name="document-outline" size={16} color={c.mutedForeground} />
            <Text style={[s.fullBtnText, { color: c.mutedForeground }]}>
              {t("screens.speech_coach.reports.download_pdf")}
            </Text>
          </Pressable>
          <Text style={[s.note, { color: c.mutedForeground }]}>
            {t("screens.speech_coach.reports.pdf_coming_soon")}
          </Text>
        </SectionShell>

        {/* ── 9. Expert Support placeholder ────────────────────────── */}
        {/* Free action — waitlist join is intentionally NOT premium-gated. */}
        <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: `${brand.violet500}18` }]}>
              <Ionicons name="people" size={18} color={brand.violet600} />
            </View>
            <Text style={[s.sectionTitle, { color: c.foreground }]}>
              {t("screens.speech_coach.expert.section_title")}
            </Text>
          </View>
          <View style={[s.comingSoonBadge, { backgroundColor: `${palette.amber500}22` }]}>
            <Text style={{ color: palette.amber700, fontWeight: "800", fontSize: 11 }}>
              {t("screens.speech_coach.expert.coming_soon_badge")}
            </Text>
          </View>
          <Text style={[s.intro, { color: c.mutedForeground }]}>
            {t("screens.speech_coach.expert.intro")}
          </Text>
          <Pressable
            onPress={() => { if (!waitlistJoined) joinWaitlist.mutate(); }}
            disabled={waitlistJoined || joinWaitlist.isPending}
            style={[
              s.fullBtn,
              { backgroundColor: waitlistJoined ? c.muted : brand.violet500 },
            ]}
          >
            <Ionicons
              name={waitlistJoined ? "checkmark" : "mail"}
              size={16}
              color={waitlistJoined ? c.mutedForeground : "#FFFFFF" /* audit-ok: button glyph on filled brand */}
            />
            <Text
              style={[
                s.fullBtnText,
                { color: waitlistJoined ? c.mutedForeground : "#FFFFFF" /* audit-ok: button text on filled brand */ },
              ]}
            >
              {joinWaitlist.isPending
                ? t("screens.speech_coach.expert.joining")
                : waitlistJoined
                ? t("screens.speech_coach.expert.joined")
                : t("screens.speech_coach.expert.join_waitlist")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

type Colors = ReturnType<typeof useColors>;

function SectionShell({
  c,
  locked,
  reason,
  onInteract,
  title,
  icon,
  testID,
  children,
}: {
  c: Colors;
  locked: boolean;
  reason: string;
  /** Fired on the FIRST touch within the section content (any tap or scroll
   *  start). The screen wraps this in `markOnce` so a given premium feature
   *  is only consumed by an explicit interaction, never by initial render. */
  onInteract: () => void;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  testID?: string;
  children: React.ReactNode;
}) {
  return (
    <LockedBlock locked={locked} reason={reason} radius={18}>
      <View
        testID={testID}
        onTouchStart={() => {
          if (!locked) onInteract();
        }}
        style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}
      >
        <View style={s.sectionHeader}>
          <View style={[s.sectionIcon, { backgroundColor: `${brand.violet500}18` }]}>
            <Ionicons name={icon} size={18} color={brand.violet600} />
          </View>
          <Text style={[s.sectionTitle, { color: c.foreground }]}>{title}</Text>
        </View>
        <View style={{ gap: 10 }}>{children}</View>
      </View>
    </LockedBlock>
  );
}

function DashboardCard({
  c,
  childAgeMonths,
  band,
  t,
}: {
  c: Colors;
  childAgeMonths: number;
  band: SpeechAgeBand;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const speechAgeLabel = childAgeMonths > 0
    ? t(`screens.speech_coach.milestones.tab.${band}`)
    : t("screens.speech_coach.milestones.tab.1y");
  return (
    <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionIcon, { backgroundColor: `${brand.pink500}18` }]}>
          <Ionicons name="stats-chart" size={18} color={brand.pink500} />
        </View>
        <Text style={[s.sectionTitle, { color: c.foreground }]}>
          {t("screens.speech_coach.dashboard.title")}
        </Text>
      </View>
      <View style={s.statsGrid}>
        <DashStat
          c={c}
          label={t("screens.speech_coach.dashboard.speech_age")}
          value={speechAgeLabel}
        />
        <DashStat
          c={c}
          label={t("screens.speech_coach.dashboard.weekly_score")}
          value="0%"
        />
        <DashStat
          c={c}
          label={t("screens.speech_coach.dashboard.daily_streak")}
          value={t("screens.speech_coach.dashboard.streak_days_other", { count: 0 })}
        />
        <DashStat
          c={c}
          label={t("screens.speech_coach.dashboard.confidence")}
          value={t("screens.speech_coach.dashboard.confidence_low")}
        />
      </View>
      <Text style={[s.note, { color: c.mutedForeground }]}>
        {t("screens.speech_coach.dashboard.milestones_completed", { done: 0, total: 4 })}
      </Text>
    </View>
  );
}

function DashStat({ c, label, value }: { c: Colors; label: string; value: string }) {
  return (
    <View style={[s.dashStat, { backgroundColor: c.muted }]}>
      <Text style={{ color: c.mutedForeground, fontSize: 11, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: c.foreground, fontSize: 16, fontWeight: "800", marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

function ReportRow({ c, label, value }: { c: Colors; label: string; value: string }) {
  return (
    <View style={[s.row, { backgroundColor: c.muted, borderColor: c.border }]}>
      <Text style={[s.rowTitle, { color: c.foreground, fontSize: 13 }]}>{label}</Text>
      <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 13 }}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)", // audit-ok: translucent on gradient
  },
  headerTitle: {
    color: "#FFFFFF", // audit-ok: header title on gradient
    fontSize: 20,
    fontWeight: "800",
  },
  headerSub: {
    color: "rgba(255,255,255,0.86)", // audit-ok: header subtitle on gradient
    fontSize: 12,
    marginTop: 2,
  },
  headerEmoji: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)", // audit-ok: chip on gradient
  },
  section: {
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000", // audit-ok: shadow color
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", flex: 1 },
  intro: { fontSize: 13, lineHeight: 18 },
  tabsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 14, fontWeight: "700" },
  rowHint: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  starsPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  miniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  miniBtnText: {
    color: "#FFFFFF", // audit-ok: button text on filled brand
    fontWeight: "700",
    fontSize: 12,
  },
  fullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  fullBtnText: {
    color: "#FFFFFF", // audit-ok: button text on filled brand
    fontWeight: "800",
    fontSize: 14,
  },
  note: { fontSize: 12, lineHeight: 16, fontStyle: "italic" },
  storyCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  storyTitle: { fontSize: 15, fontWeight: "800" },
  storyBody: { fontSize: 13, lineHeight: 18 },
  guidanceCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tipBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
  },
  affirmationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  affirmation: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: "47%",
    flexGrow: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dashStat: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: 10,
    borderRadius: 12,
  },
  comingSoonBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sttPanel: {
    borderRadius: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  sttPanelTitle: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sttSayPrompt: {
    fontSize: 13,
    fontWeight: "700",
  },
  sttHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  listeningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listeningText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sttResultCard: {
    borderRadius: 12,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  sttResultLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  sttResultSaid: {
    fontSize: 11,
    lineHeight: 16,
  },
  // ── Session styles ─────────────────────────────────────────────────────────
  setupCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 12,
  },
  promptCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 10,
  },
  kindBadge: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  promptText: {
    fontSize: 42,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -1,
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
    height: 28,
    marginTop: 4,
  },
  waveBar: {
    width: 5,
    height: 24,
    borderRadius: 3,
  },
  halfBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 0,
  },
  halfBtnText: {
    fontWeight: "700",
    fontSize: 12,
    flexShrink: 1,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    borderRadius: 999,
  },
  analyzingText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  summaryBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    width: "100%",
  },
});
