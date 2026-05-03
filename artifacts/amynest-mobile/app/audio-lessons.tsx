import React, {  useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
  Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, brandExtended, palette } from "@/constants/colors";
import * as Haptics from "expo-haptics";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import {
  LESSONS as _SHARED_LESSONS,
  getLessonText,
  type Lesson as SharedLesson,
  type AgeBucket,
  type LangCode,
} from "@workspace/audio-lessons";

// Hindi Amy voice — Anjura (Calm & Warm Hindi Female) via eleven_multilingual_v2.
const AMY_VOICE_HINDI    = "TllHtNijgXBd45uTSCS7"; // Anjura — Indian Hindi Female
const MODEL_MULTILINGUAL = "eleven_multilingual_v2";

function formatTime(secs: number): string {
  const s = Math.round(secs);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

// ── Lesson data — from shared lib ─────────────────────────────────────────
interface MobileLesson extends SharedLesson {
  age: AgeBucket;
  duration: string;
}
type Lesson = MobileLesson;

const LESSONS: MobileLesson[] = _SHARED_LESSONS.map((l) => ({
  ...l,
  age: l.ageBucket,
  duration: `${l.durationMin} min`,
}));

function getScript(l: Lesson, lang: string): string {
  return getLessonText(l, lang).paragraphs.join("\n\n");
}
function getTitle(l: Lesson, lang: string): string {
  return getLessonText(l, lang).title;
}


// ── Age bucket labels ──────────────────────────────────────────────────────
const AGE_LABELS: Record<AgeBucket, Record<LangCode, string>> = {
  "0-2":  { en: "0–2 yrs", hi: "0–2 साल", hinglish: "0–2 saal" },
  "2-4":  { en: "2–4 yrs", hi: "2–4 साल", hinglish: "2–4 saal" },
  "5-7":  { en: "5–7 yrs", hi: "5–7 साल", hinglish: "5–7 saal" },
  "8-10": { en: "8–10 yrs", hi: "8–10 साल", hinglish: "8–10 saal" },
  "10+":  { en: "10+ yrs", hi: "10+ साल", hinglish: "10+ saal" },
};
const AGE_EMOJIS: Record<AgeBucket, string> = {
  "0-2": "👶", "2-4": "🧒", "5-7": "🎨", "8-10": "📚", "10+": "🎒",
};
const AGE_ORDER: AgeBucket[] = ["0-2", "2-4", "5-7", "8-10", "10+"];

export default function AudioLessonsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const [selectedAge, setSelectedAge] = useState<AgeBucket>("2-4");
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const lessons = useMemo(() => LESSONS.filter(l => l.age === selectedAge), [selectedAge]);
  const amy = useAmyVoice({ voiceId: AMY_VOICE_HINDI, modelId: MODEL_MULTILINGUAL });
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const authFetch = useAuthFetch();
  const refreshSub = useSubscriptionStore((s) => s.refresh);

  // Stop audio whenever the open lesson changes (collapse or switch lesson).
  useEffect(() => {
    amy.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openLesson?.id]);

  // Global Paywall: free users get 1 audio lesson per UTC day. Premium users
  // bypass server-side. The /consume endpoint returns 200 (no-op for premium)
  // or 402 feature_locked when the cap is exhausted, in which case we route
  // to the paywall instead of opening the lesson.
  const handlePickLesson = async (lesson: Lesson) => {
    if (unlocking) return;
    if (openLesson?.id === lesson.id) {
      // Collapsing the same lesson — no need to consume again.
      setOpenLesson(null);
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      return;
    }
    setUnlocking(true);
    try {
      const res = await authFetch("/api/features/audio_lesson/consume", {
        method: "POST",
      });
      if (res.status === 402) {
        router.push({ pathname: "/paywall", params: { reason: "audio_lessons" } });
        return;
      }
      // Any other non-2xx (network/server) — fail open so infra issues
      // don't block the user. Counter wasn't burned (featureGate refunds).
      void refreshSub();
      setOpenLesson(lesson);
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    } catch {
      setOpenLesson(lesson);
    } finally {
      setUnlocking(false);
    }
  };

  const pulsePlay = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const introText = lang === "hi"
    ? "हाथ भरे हैं? Amy आपको बच्चे की उम्र के हिसाब से जरूरी parenting topics समझाएगी। हर lesson 3–5 मिनट का है।"
    : lang === "hinglish"
    ? "Haath bhare hain? Amy aapko bacche ki umra ke hisaab se important topics samjhayegi. Har lesson 3–5 minute ka hai."
    : "Hands full? Let Amy talk you through the most important parenting topics for your child's age. Each lesson is 3–5 minutes.";

  return (
    <LinearGradient colors={["#0f0c29", "#1a1040", "#0c1220"]} style={{ flex: 1 }}> // audit-ok: intentional dark bg / custom color
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={brand.violet300} />
        </TouchableOpacity>
        <Ionicons name="headset" size={20} color={brand.violet300} style={{ marginRight: 6 }} />
        <Text style={styles.headerTitle}>{t("screens.audio_lessons.amy_audio_lessons")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <Text style={styles.intro}>{introText}</Text>

        {/* Age selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agePills} style={{ marginBottom: 20 }}>
          {AGE_ORDER.map(key => {
            const active = key === selectedAge;
            const label = `${AGE_EMOJIS[key]} ${AGE_LABELS[key][lang as LangCode] ?? AGE_LABELS[key].en}`;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => { setSelectedAge(key); setOpenLesson(null); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
                activeOpacity={0.8}
              >
                {active ? (
                  <LinearGradient colors={[brand.primary, brand.pink500]} style={styles.pill}>
                    <Text style={styles.pillTextActive}>{label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.pillInactive}>
                    <Text style={styles.pillText}>{label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lesson list */}
        {lessons.map(lesson => {
          const isOpen = openLesson?.id === lesson.id;
          const title = getTitle(lesson, lang);
          const script = getScript(lesson, lang);
          return (
            <View key={lesson.id} style={[styles.lessonCard, isOpen && styles.lessonCardOpen]}>
              <TouchableOpacity
                onPress={() => void handlePickLesson(lesson)}
                disabled={unlocking}
                activeOpacity={0.85}
                style={[styles.lessonHeader, unlocking && { opacity: 0.7 }]}
              >
                <View style={styles.lessonEmoji}><Text style={{ fontSize: 26 }}>{lesson.emoji}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lessonTitle}>{title}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <Ionicons name="time-outline" size={11} color={brandExtended.violetMuted} />
                    <Text style={styles.lessonMeta}>{lesson.duration}</Text>
                  </View>
                </View>
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={brandExtended.violetMuted} />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.playerWrap}>
                  {/* TTS error */}
                  {amy.error && (
                    <Text style={styles.errorText}>
                      {lang === "hi"
                        ? "Amy की आवाज़ अभी नहीं चल पा रही। थोड़ी देर बाद try करें।"
                        : lang === "hinglish"
                        ? "Amy ki awaaz load nahi ho payi. Thodi der baad try karein."
                        : "Couldn't load Amy's voice. Please try again shortly."}
                    </Text>
                  )}

                  {/* Progress bar — real position from expo-audio */}
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, {
                      width: `${amy.duration > 0 ? Math.min(amy.currentTime / amy.duration, 1) * 100 : 0}%` as any,
                    }]} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                    <Text style={styles.timeText}>{formatTime(amy.currentTime)}</Text>
                    <Text style={styles.timeText}>{lesson.duration}</Text>
                  </View>

                  {/* Controls */}
                  <View style={styles.controls}>
                    <TouchableOpacity
                      onPress={() => amy.seekTo(amy.currentTime - 15)}
                      style={[styles.skipBtn, { opacity: amy.speaking ? 1 : 0.4 }]}
                      activeOpacity={0.7}
                      disabled={!amy.speaking}
                    >
                      <Ionicons name="play-back" size={22} color={brand.violet300} />
                    </TouchableOpacity>

                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                      <TouchableOpacity
                        onPress={() => {
                          pulsePlay();
                          if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          if (amy.speaking || amy.loading) {
                            amy.stop();
                          } else {
                            void amy.speak(getScript(lesson, "hi"));
                          }
                        }}
                        style={styles.playBtn}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={[brand.primary, brand.pink500]} style={styles.playBtnGrad}>
                          {amy.loading
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Ionicons name={(amy.speaking || amy.loading) ? "pause" : "play"} size={26} color="#fff" />
                          }
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>

                    <TouchableOpacity
                      onPress={() => amy.seekTo(amy.currentTime + 15)}
                      style={[styles.skipBtn, { opacity: amy.speaking ? 1 : 0.4 }]}
                      activeOpacity={0.7}
                      disabled={!amy.speaking}
                    >
                      <Ionicons name="play-forward" size={22} color={brand.violet300} />
                    </TouchableOpacity>
                  </View>

                  {/* Script preview — shown in app language for reading */}
                  <Text style={styles.script} numberOfLines={5}>{script}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(139,92,246,0.2)",
    gap: 6,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(167,139,250,0.15)",
    alignItems: "center", justifyContent: "center", marginRight: 4,
  },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  intro: { color: brandExtended.violetSoft, fontSize: 13, lineHeight: 20, marginVertical: 16 },
  agePills: { gap: 8, paddingVertical: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  pillInactive: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.35)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  pillText: { color: brand.violet300, fontSize: 13, fontWeight: "600" },
  pillTextActive: { color: "#fff", fontSize: 13, fontWeight: "700" },
  lessonCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.25)",
    borderRadius: 16, marginBottom: 10, overflow: "hidden",
  },
  lessonCardOpen: { borderColor: brand.primary + "60" },
  lessonHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  lessonEmoji: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "rgba(139,92,246,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  lessonTitle: { color: "#fff", fontSize: 14, fontWeight: "800", lineHeight: 19 },
  lessonMeta: { color: brandExtended.violetMuted, fontSize: 11 },
  playerWrap: { paddingHorizontal: 16, paddingBottom: 16 },
  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: brand.primary },
  timeText: { color: brandExtended.violetMuted, fontSize: 11 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginVertical: 16 },
  skipBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  playBtn: { width: 60, height: 60, borderRadius: 30, overflow: "hidden" },
  playBtnGrad: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  script: {
    color: brandExtended.violetSoft, fontSize: 12.5, lineHeight: 18.5,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10, padding: 12,
  },
  errorText: {
    color: palette.rose200, fontSize: 12.5, lineHeight: 18,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 10, padding: 10, marginBottom: 10,
  },
});
