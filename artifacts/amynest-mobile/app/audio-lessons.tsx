import React, {
  useState, useRef, useEffect, useMemo, useCallback,
} from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
  Platform, ActivityIndicator, Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, brandExtended, palette } from "@/constants/colors";
import { BRAND } from "@/constants/brand";
import * as Haptics from "expo-haptics";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useSubscriptionStore,
  selectIsPremium,
} from "@/store/useSubscriptionStore";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import {
  lessonsForAge,
  getLessonText,
  type Lesson,
  type AgeBucket,
} from "@workspace/audio-lessons";
import { API_BASE_URL } from "@/constants/api";

const AMY_VOICE_ENGLISH = "QbQKfe9vgx5OsbZUvlFv"; // Ananya K — Indian English Female
const MODEL_EN = "eleven_turbo_v2_5";
const RESUME_KEY = "amynest_audio_lesson_resume_v2";
const SPEED_OPTIONS = [0.85, 1, 1.15, 1.3, 1.5] as const;
type SpeedOption = (typeof SPEED_OPTIONS)[number];

// ── Age bucket labels ──────────────────────────────────────────────────────
const AGE_ORDER: AgeBucket[] = ["0-2", "2-4", "5-7", "8-10", "10+"];
const AGE_LABELS: Record<AgeBucket, string> = {
  "0-2": "0–2 yrs",
  "2-4": "2–4 yrs",
  "5-7": "5–7 yrs",
  "8-10": "8–10 yrs",
  "10+": "10+ yrs",
};
const AGE_EMOJIS: Record<AgeBucket, string> = {
  "0-2": "👶", "2-4": "🧒", "5-7": "🎨", "8-10": "📚", "10+": "🎒",
};

// ── Resume persistence (AsyncStorage) ─────────────────────────────────────
type ResumeMap = Record<string, number>;

async function loadResume(): Promise<ResumeMap> {
  try {
    const raw = await AsyncStorage.getItem(RESUME_KEY);
    return raw ? (JSON.parse(raw) as ResumeMap) : {};
  } catch {
    return {};
  }
}

async function saveResume(lessonId: string, idx: number): Promise<void> {
  try {
    const map = await loadResume();
    map[lessonId] = idx;
    await AsyncStorage.setItem(RESUME_KEY, JSON.stringify(map));
  } catch {}
}

// ── Paragraph-by-paragraph player (bottom sheet) ──────────────────────────
function PlayerSheet({
  lesson,
  onClose,
}: {
  lesson: Lesson;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const lang = "en";
  const text = useMemo(() => getLessonText(lesson, lang), [lesson]);
  const paragraphs = text.paragraphs;

  const [playing, setPlaying] = useState(false);
  const [paragraphIdx, setParagraphIdx] = useState(0);
  const [rate, setRate] = useState<SpeedOption>(1);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  // When current paragraph finishes naturally, auto-advance to next.
  const handleFinished = useCallback(() => {
    setParagraphIdx((i) => {
      if (i + 1 >= paragraphs.length) {
        setPlaying(false);
        return i;
      }
      return i + 1;
    });
  }, [paragraphs.length]);

  const { speaking, loading, error, speak, stop } = useAmyVoice({
    voiceId: AMY_VOICE_ENGLISH,
    modelId: MODEL_EN,
    playbackRate: rate,
    onFinished: handleFinished,
  });

  // Resume from saved index on mount.
  useEffect(() => {
    loadResume().then((map) => {
      const saved = map[lesson.id] ?? 0;
      if (saved > 0 && saved < paragraphs.length) {
        setParagraphIdx(saved);
      } else if (saved >= paragraphs.length) {
        setParagraphIdx(0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  // Persist position when it changes.
  useEffect(() => {
    void saveResume(lesson.id, paragraphIdx);
  }, [lesson.id, paragraphIdx]);

  // Drive playback: when `playing` flips on (or paragraph changes while
  // playing) start a fresh synth; when it flips off, stop.
  useEffect(() => {
    if (!playing) {
      stop();
      return;
    }
    const txt = paragraphs[paragraphIdx];
    if (!txt) {
      setPlaying(false);
      return;
    }
    void speak(txt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, paragraphIdx]);

  // Stop when speed changes mid-play (will restart with new rate next cycle).
  useEffect(() => {
    if (playing) {
      stop();
      // brief settle so `stop()` fires before next speak()
      const tid = setTimeout(() => {
        void speak(paragraphs[paragraphIdx]);
      }, 80);
      return () => clearTimeout(tid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);

  const prev = () => {
    if (paragraphIdx > 0) setParagraphIdx((i) => i - 1);
  };
  const next = () => {
    if (paragraphIdx + 1 < paragraphs.length) setParagraphIdx((i) => i + 1);
  };
  const jumpTo = (i: number) => {
    setParagraphIdx(i);
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  };

  const progress = paragraphs.length > 0
    ? (paragraphIdx + 1) / paragraphs.length
    : 0;

  return (
    // Full-screen overlay
    <View style={ps.overlay} pointerEvents="box-none">
      <Pressable style={ps.backdrop} onPress={onClose} />

      {/* Sheet panel */}
      <View style={ps.sheet}>
        {/* Handle */}
        <View style={ps.handle} />

        {/* Header */}
        <View style={ps.sheetHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <Text style={{ fontSize: 28 }}>{lesson.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={ps.sheetTitle} numberOfLines={2}>{text.title}</Text>
              <Text style={ps.sheetMeta}>{lesson.expert} · {lesson.durationMin} min</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={ps.closeBtn}
            activeOpacity={0.7}
            accessibilityLabel={t("screens.audio_lessons.close", { defaultValue: "Close" })}
          >
            <Ionicons name="close" size={16} color={brand.violet300} />
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={ps.errorBox}>
            <Text style={ps.errorText}>{t("screens.audio_lessons.voice_error")}</Text>
          </View>
        )}

        {/* Progress bar (segmented) */}
        <View style={ps.progressRow}>
          {paragraphs.map((_, i) => (
            <View
              key={i}
              style={[
                ps.progressSeg,
                { flex: 1, backgroundColor: i <= paragraphIdx ? brand.primary : "rgba(139,92,246,0.2)" },
              ]}
            />
          ))}
        </View>
        <Text style={ps.paragraphCounter}>
          {/* audit-ok: static number labels, not hardcoded English */}
          {paragraphIdx + 1} / {paragraphs.length}
        </Text>

        {/* Current paragraph highlight box */}
        <View style={ps.currentBox}>
          <Text style={ps.currentText}>{paragraphs[paragraphIdx]}</Text>
        </View>

        {/* Transcript toggle */}
        <TouchableOpacity
          onPress={() => setTranscriptOpen((o) => !o)}
          style={ps.transcriptToggle}
          activeOpacity={0.8}
        >
          <Ionicons
            name={transcriptOpen ? "chevron-up" : "chevron-down"}
            size={12}
            color={brand.violet300}
          />
          <Text style={ps.transcriptToggleText}>{t("screens.audio_lessons.show_transcript")}</Text>
        </TouchableOpacity>

        {transcriptOpen && (
          <ScrollView style={ps.transcriptScroll} nestedScrollEnabled>
            {paragraphs.map((p, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => jumpTo(i)}
                activeOpacity={0.75}
                style={[ps.transcriptItem, i === paragraphIdx && ps.transcriptItemActive]}
              >
                <Text style={[ps.transcriptNum, i === paragraphIdx && { color: brand.violet300 }]}>
                  {i + 1}.
                </Text>
                <Text style={[ps.transcriptPara, i === paragraphIdx && { color: "#fff" }]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Controls */}
        <View style={ps.controls}>
          <TouchableOpacity
            onPress={prev}
            disabled={paragraphIdx === 0}
            style={[ps.skipBtn, paragraphIdx === 0 && { opacity: 0.4 }]}
            activeOpacity={0.7}
            accessibilityLabel={t("screens.audio_lessons.previous")}
          >
            <Ionicons name="play-skip-back" size={20} color="#fff" /* audit-ok: static white on dark bg */ />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setPlaying((p) => !p);
            }}
            style={ps.playBtnWrap}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[brand.primary, brand.pink500]} style={ps.playBtnGrad}>
              {loading && playing ? (
                <ActivityIndicator color="#fff" /* audit-ok: static white on gradient button */ size="small" />
              ) : (
                <Ionicons
                  name={playing && speaking ? "pause" : "play"}
                  size={26}
                  // audit-ok: static white on violet-pink gradient play button
                  color="#fff"
                  style={!playing || speaking ? { marginLeft: 3 } : undefined}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={next}
            disabled={paragraphIdx === paragraphs.length - 1}
            style={[ps.skipBtn, paragraphIdx === paragraphs.length - 1 && { opacity: 0.4 }]}
            activeOpacity={0.7}
            accessibilityLabel={t("screens.audio_lessons.next")}
          >
            <Ionicons name="play-skip-forward" size={20} color="#fff" /* audit-ok: static white on dark bg */ />
          </TouchableOpacity>
        </View>

        {/* Speed selector */}
        <View style={ps.speedRow}>
          <Ionicons name="speedometer-outline" size={13} color="#a99fd9" /* audit-ok: muted violet for icon */ />
          <Text style={ps.speedLabel}>{t("screens.audio_lessons.speed")}</Text>
          {SPEED_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRate(r)}
              activeOpacity={0.8}
              style={[ps.speedBtn, rate === r && ps.speedBtnActive]}
            >
              <Text style={[ps.speedBtnText, rate === r && ps.speedBtnTextActive]}>
                {r}×
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={ps.footer}>{t("screens.audio_lessons.narrated_by_amy")}</Text>
      </View>
    </View>
  );
}

const ps = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,5,25,0.85)",
  },
  sheet: {
    // audit-ok: dark brand gradient for player sheet background
    backgroundColor: "#1a1040",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 32,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    // audit-ok: neutral handle indicator on dark sheet
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  sheetTitle: {
    // audit-ok: static white title on dark sheet
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  sheetMeta: { color: "#a99fd9", fontSize: 11, marginTop: 2 /* audit-ok: muted violet meta text */ },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(167,139,250,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    marginBottom: 10,
  },
  errorText: { color: palette.rose200, fontSize: 12.5 },
  progressRow: { flexDirection: "row", gap: 3, marginBottom: 4 },
  progressSeg: { height: 3, borderRadius: 2 },
  paragraphCounter: {
    color: "#a99fd9", /* audit-ok: muted violet counter */
    fontSize: 11,
    textAlign: "right",
    marginBottom: 10,
  },
  currentBox: {
    backgroundColor: "rgba(139,92,246,0.10)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.30)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  currentText: {
    // audit-ok: static white body text on dark callout box
    color: "#fff",
    fontSize: 14.5,
    lineHeight: 22,
  },
  transcriptToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  transcriptToggleText: { color: brand.violet300, fontSize: 12, fontWeight: "700" },
  transcriptScroll: { maxHeight: 180, marginBottom: 10 },
  transcriptItem: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  transcriptItemActive: { backgroundColor: "rgba(139,92,246,0.12)" },
  transcriptNum: { color: "#a99fd9", fontSize: 12, fontWeight: "700", minWidth: 22 /* audit-ok: muted violet */ },
  transcriptPara: { color: "#c7c0e8", fontSize: 12.5, lineHeight: 18, flex: 1 /* audit-ok: soft violet transcript text */ },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 14,
  },
  skipBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  playBtnWrap: { width: 64, height: 64, borderRadius: 32, overflow: "hidden" },
  playBtnGrad: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  speedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 12,
  },
  speedLabel: { color: "#a99fd9", fontSize: 12, marginRight: 2 /* audit-ok: muted violet label */ },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.30)",
  },
  speedBtnActive: {
    // audit-ok: brand gradient applied via inline style below; borderColor overridden
    borderColor: "transparent",
    backgroundColor: brand.primary,
  },
  speedBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" /* audit-ok: static white on dark pill */ },
  speedBtnTextActive: { color: "#fff" /* audit-ok: static white on active pill */ },
  footer: {
    color: "#7a749b", /* audit-ok: muted brand grey footer */
    fontSize: 11,
    textAlign: "center",
  },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function AudioLessonsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  void theme; // kept for consistency with other screens

  const isPremium = useSubscriptionStore(selectIsPremium);
  const authFetch = useAuthFetch();

  const [selectedAge, setSelectedAge] = useState<AgeBucket>("2-4");
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const lessons = useMemo(() => lessonsForAge(selectedAge), [selectedAge]);

  // Pre-warm TTS cache for current age group (premium only, fire-and-forget).
  useEffect(() => {
    if (!isPremium) return;
    const texts = lessonsForAge(selectedAge).flatMap(
      (l) => getLessonText(l, "en").paragraphs,
    );
    if (texts.length === 0) return;
    void authFetch(`${API_BASE_URL}/api/audio-lessons/pregenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
    }).catch(() => {});
  }, [selectedAge, isPremium, authFetch]);

  // Per-age-group access: index 0 is always free, rest are premium-only.
  const getLessonAccess = (idx: number): "free-sample" | "locked" | "open" => {
    if (isPremium) return "open";
    return idx === 0 ? "free-sample" : "locked";
  };

  const handlePickLesson = async (lesson: Lesson, idx: number) => {
    if (unlocking) return;

    // Toggle collapse.
    if (openLesson?.id === lesson.id) {
      setOpenLesson(null);
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      return;
    }

    // Free users: first lesson per age is always free.
    if (!isPremium && idx === 0) {
      setOpenLesson(lesson);
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      return;
    }

    // Free users: any other lesson → paywall.
    if (!isPremium && idx !== 0) {
      router.push({ pathname: "/paywall", params: { reason: "audio_lessons" } });
      return;
    }

    // Premium users: consume endpoint tracks analytics (fire-and-forget, never blocks).
    setUnlocking(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    try {
      await authFetch("/api/features/audio_lesson/consume", {
        method: "POST",
      }).catch(() => {});
      setOpenLesson(lesson);
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    } catch {
      setOpenLesson(lesson);
    } finally {
      setUnlocking(false);
    }
  };

  const introText = `Hands full? Let ${BRAND.aiName} talk you through the most important parenting topics for your child's age. Each lesson is 3–5 minutes.`;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        // audit-ok: intentional dark brand gradient background for audio lessons screen
        colors={["#0f0c29", "#1a1040", "#0c1220"]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.agePills}
            style={{ marginBottom: 20 }}
          >
            {AGE_ORDER.map((key) => {
              const active = key === selectedAge;
              const label = `${AGE_EMOJIS[key]} ${AGE_LABELS[key]}`;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    setSelectedAge(key);
                    setOpenLesson(null);
                    if (Platform.OS !== "web") void Haptics.selectionAsync();
                  }}
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

          {/* Lesson cards */}
          {lessons.map((lesson, idx) => {
            const access = getLessonAccess(idx);
            const isLocked = access === "locked";
            const isFree = access === "free-sample";

            return (
              <Animated.View
                key={lesson.id}
                style={[
                  styles.lessonCard,
                  { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <TouchableOpacity
                  onPress={() => void handlePickLesson(lesson, idx)}
                  disabled={unlocking}
                  activeOpacity={0.85}
                  style={[styles.lessonHeader, unlocking && { opacity: 0.7 }]}
                >
                  <View style={styles.lessonEmoji}>
                    <Text style={{ fontSize: 26 }}>{lesson.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lessonTitle}>{getLessonText(lesson, "en").title}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <Ionicons name="time-outline" size={11} color={brandExtended.violetMuted} />
                      <Text style={styles.lessonMeta}>{lesson.durationMin} min</Text>
                      {isFree && (
                        <View style={styles.freeBadge}>
                          <Text style={styles.freeBadgeText}>{t("screens.audio_lessons.free_sample")}</Text>
                        </View>
                      )}
                      {isLocked && (
                        <View style={styles.lockBadge}>
                          <Ionicons name="lock-closed" size={9} color={brand.violet300} />
                          <Text style={styles.lockBadgeText}>{t("screens.audio_lessons.locked")}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons
                    name={isLocked ? "lock-closed" : "chevron-forward"}
                    size={16}
                    color={brandExtended.violetMuted}
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* Paragraph-by-paragraph player (absolute overlay) */}
        {openLesson && (
          <PlayerSheet
            lesson={openLesson}
            onClose={() => setOpenLesson(null)}
          />
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139,92,246,0.2)",
    gap: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(167,139,250,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  headerTitle: {
    // audit-ok: static white title on dark gradient header
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  intro: { color: brandExtended.violetSoft, fontSize: 13, lineHeight: 20, marginVertical: 16 },
  agePills: { gap: 8, paddingVertical: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  pillInactive: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.35)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  pillText: { color: brand.violet300, fontSize: 13, fontWeight: "600" },
  pillTextActive: {
    // audit-ok: static white on violet-pink gradient pill
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  lessonCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.25)",
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
  },
  lessonHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  lessonEmoji: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(139,92,246,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  lessonTitle: {
    // audit-ok: static white lesson title on dark card
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  lessonMeta: { color: brandExtended.violetMuted, fontSize: 11 },
  freeBadge: {
    // audit-ok: emerald free sample badge
    backgroundColor: "rgba(16,185,129,0.18)",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  freeBadgeText: {
    // audit-ok: emerald text on emerald badge
    color: palette.emerald400 ?? "#34d399",
    fontSize: 9,
    fontWeight: "800",
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(139,92,246,0.15)",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  lockBadgeText: { color: brand.violet300, fontSize: 9, fontWeight: "800" },
});
