// i18n-ignore-start
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, palette } from "@/constants/colors";
import {
  useSpellingTTS, useSpellingWords, useSpellingProgress,
  useSpellingSession, useSpellingTournament, useSpellingLeaderboard,
  spellingAgeGroupFor, BADGE_LABELS, AI_OPPONENT_LABELS,
  type SpellingAgeGroup, type SpellingDifficulty, type SpellingAiOpponent,
  type SpellingProgress, type LeaderboardRow, type SessionAttemptResult,
  type SessionFinalizeSummary, type TournamentSummary,
} from "@/hooks/useSpelling";

const SPELL_PINK = "#e879f9"; // audit-ok: spelling screen brand gradient secondary accent
type Mode = "learn" | "practice" | "dictation" | "competition" | "tournament" | "battle" | "parent";
type Child = { id: number; name: string; age: number | null };

const AGE_GROUPS: SpellingAgeGroup[] = ["2-4", "4-6", "6-8", "8-10+"];
const DIFFICULTIES: SpellingDifficulty[] = ["easy", "medium", "hard"];
const MODES: { id: Mode; emoji: string; labelKey: string }[] = [
  { id: "learn",       emoji: "📖", labelKey: "mode_learn" },
  { id: "practice",    emoji: "✏️", labelKey: "mode_practice" },
  { id: "dictation",   emoji: "🎧", labelKey: "mode_dictation" },
  { id: "competition", emoji: "🏆", labelKey: "mode_competition" },
  { id: "tournament",  emoji: "🏅", labelKey: "mode_tournament" },
  { id: "battle",      emoji: "⚔️",  labelKey: "mode_battle" },
  { id: "parent",      emoji: "👨‍👩‍👧", labelKey: "mode_parent" },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SpellingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [ageGroup, setAgeGroup] = useState<SpellingAgeGroup>("4-6");
  const [difficulty, setDifficulty] = useState<SpellingDifficulty>("easy");
  const [mode, setMode] = useState<Mode>("learn");

  const { data: childrenData, isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["children-for-spelling"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      return r.ok ? r.json() : [];
    },
    staleTime: 60_000,
  });
  const children = useMemo(() => (Array.isArray(childrenData) ? childrenData : []), [childrenData]);
  const activeChildId = selectedChildId ?? (children.length === 1 ? children[0]!.id : null);
  const activeChild = children.find(c => c.id === activeChildId) ?? null;

  // Auto-pick age group from child age
  useEffect(() => {
    if (!activeChild?.age) return;
    setAgeGroup(spellingAgeGroupFor(activeChild.age * 12));
  }, [activeChild?.age]);

  const sp = useSpellingProgress(activeChildId, ageGroup);
  const tts = useSpellingTTS();

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[s.safe, { paddingTop: insets.top + 8 }]}>
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </Pressable>
            <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.headerIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={{ fontSize: 20 }}>🔤</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>{t("screens.spelling.title")}</Text>
              {activeChild && <Text style={s.headerSub}>{activeChild.name}</Text>}
            </View>
            {sp.progress && (
              <View style={s.statsBadge}>
                <Text style={s.statsBadgeText}>
                  {t("screens.spelling.level", { n: sp.progress.currentLevel })} ·{" "}
                  {t("screens.spelling.stars", { n: sp.progress.totalStars })}
                </Text>
              </View>
            )}
          </View>

          {childrenLoading ? (
            <View style={s.center}><ActivityIndicator color="#fff" /></View>
          ) : children.length === 0 ? (
            <View style={s.center}><Text style={s.emptyTitle}>{t("screens.spelling.no_children")}</Text></View>
          ) : !activeChildId ? (
            <ChildPicker children={children} onPick={setSelectedChildId} t={t} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
              {/* Progress hero */}
              {sp.progress && <ProgressHero progress={sp.progress} t={t} />}

              {/* Child selector row (multiple children) */}
              {children.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: 14, marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {children.map(c => (
                      <TouchableOpacity key={c.id} onPress={() => setSelectedChildId(c.id)}
                        style={[s.pill, c.id === activeChildId && s.pillActive]}>
                        <Text style={[s.pillText, c.id === activeChildId && s.pillTextActive]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Age Group */}
              <SelectorRow
                label={t("screens.spelling.age_group")}
                options={AGE_GROUPS}
                value={ageGroup}
                onChange={v => setAgeGroup(v as SpellingAgeGroup)}
              />

              {/* Difficulty */}
              <SelectorRow
                label={t("screens.spelling.difficulty")}
                options={DIFFICULTIES}
                value={difficulty}
                onChange={v => setDifficulty(v as SpellingDifficulty)}
              />

              {/* Mode Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: 14, marginVertical: 10 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {MODES.map(m => (
                    <TouchableOpacity key={m.id} onPress={() => setMode(m.id)}
                      style={[s.modeTab, mode === m.id && s.modeTabActive]}>
                      <Text style={{ fontSize: 14 }}>{m.emoji}</Text>
                      <Text style={[s.modeTabText, mode === m.id && s.modeTabTextActive]}>
                        {t(`screens.spelling.${m.labelKey}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Mode Content */}
              {mode === "learn" && (
                <LearnPanel ageGroup={ageGroup} difficulty={difficulty} tts={tts} t={t} />
              )}
              {mode === "practice" && (
                <PracticePanel ageGroup={ageGroup} difficulty={difficulty} tts={tts} t={t} />
              )}
              {(mode === "dictation" || mode === "competition" || mode === "battle") && (
                <SessionPanel
                  key={mode}
                  mode={mode as "dictation" | "competition" | "battle"}
                  childId={activeChildId}
                  ageGroup={ageGroup}
                  difficulty={difficulty}
                  tts={tts}
                  onProgress={sp.setProgress}
                  t={t}
                />
              )}
              {mode === "tournament" && (
                <TournamentPanel
                  childId={activeChildId}
                  ageGroup={ageGroup}
                  tts={tts}
                  onProgress={sp.setProgress}
                  t={t}
                />
              )}
              {mode === "parent" && (
                <ParentPanel ageGroup={ageGroup} difficulty={difficulty} childId={activeChildId} tts={tts} t={t} />
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ─── Child Picker ─────────────────────────────────────────────────────────────

function ChildPicker({ children, onPick, t }: { children: Child[]; onPick: (id: number) => void; t: ReturnType<typeof useTranslation>["t"] }) {
  return (
    <View style={{ padding: 16, gap: 10 }}>
      <Text style={s.sectionLabel}>{t("screens.spelling.subtitle_pick")}</Text>
      {children.map(c => (
        <Pressable key={c.id} onPress={() => onPick(c.id)} style={({ pressed }) => [s.childRow, pressed && { opacity: 0.8 }]}>
          <View style={s.avatar}><Text style={s.avatarText}>{c.name.charAt(0).toUpperCase()}</Text></View>
          <Text style={s.childName}>{c.name}</Text>
          <Ionicons name="chevron-forward" size={18} color={brand.violet300} />
        </Pressable>
      ))}
    </View>
  );
}

// ─── Progress Hero ────────────────────────────────────────────────────────────

function ProgressHero({ progress, t }: { progress: SpellingProgress; t: ReturnType<typeof useTranslation>["t"] }) {
  return (
    <View style={s.heroCard}>
      <View style={{ flexDirection: "row", gap: 18, justifyContent: "center" }}>
        {[
          { label: t("screens.spelling.level", { n: progress.currentLevel }), val: "" },
          { label: t("screens.spelling.stars", { n: progress.totalStars }), val: "" },
          { label: t("screens.spelling.streak", { n: progress.currentStreak }), val: "" },
        ].map((item, i) => (
          <View key={i} style={s.heroStat}>
            <Text style={s.heroStatVal}>{item.label}</Text>
          </View>
        ))}
      </View>
      {progress.badges.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 10 }}>
          {progress.badges.map(b => {
            const info = BADGE_LABELS[b];
            if (!info) return null;
            return (
              <View key={b} style={s.badgePill}>
                <Text style={s.badgeText}>{info.emoji} {info.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Selector Row ─────────────────────────────────────────────────────────────

function SelectorRow({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={{ paddingHorizontal: 14, marginBottom: 6 }}>
      <Text style={s.sectionLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {options.map(opt => (
            <TouchableOpacity key={opt} onPress={() => onChange(opt)}
              style={[s.pill, value === opt && s.pillActive]}>
              <Text style={[s.pillText, value === opt && s.pillTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Learn Panel ──────────────────────────────────────────────────────────────

function LearnPanel({ ageGroup, difficulty, tts, t }: {
  ageGroup: SpellingAgeGroup; difficulty: SpellingDifficulty;
  tts: ReturnType<typeof useSpellingTTS>; t: ReturnType<typeof useTranslation>["t"];
}) {
  const ws = useSpellingWords(ageGroup, difficulty);
  const [idx, setIdx] = useState(0);
  const total = ws.words.length;
  const word = ws.words[idx];

  useEffect(() => { setIdx(0); }, [ageGroup, difficulty]);

  if (ws.loading) return <View style={s.center}><ActivityIndicator color="#fff" /></View>;
  if (!word) return <View style={s.card}><Text style={s.emptyTitle}>No words found</Text></View>;

  return (
    <View style={s.card}>
      <Text style={s.wordCounter}>{t("screens.spelling.word_of", { n: idx + 1, total })}</Text>
      <Text style={s.bigWord}>{word.word}</Text>
      {word.syllables.length > 0 && (
        <Text style={s.subInfo}>{t("screens.spelling.syllables", { v: word.syllables.join(" · ") })}</Text>
      )}
      {word.hint && <Text style={s.hintText}>{t("screens.spelling.hint", { v: word.hint })}</Text>}
      <TouchableOpacity onPress={() => tts.speak(word.word)} disabled={tts.speaking || tts.loading}
        style={[s.audioBtn, (tts.speaking || tts.loading) && { opacity: 0.6 }]}>
        <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.audioBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {tts.loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name={tts.speaking ? "stop" : "volume-high"} size={20} color="#fff" />}
          <Text style={s.audioBtnText}>{t("screens.spelling.hear_word")}</Text>
        </LinearGradient>
      </TouchableOpacity>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
        <TouchableOpacity onPress={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          style={[s.navBtn, idx === 0 && { opacity: 0.4 }]}>
          <Ionicons name="chevron-back" size={16} color={brand.violet300} />
          <Text style={s.navBtnText}>{t("screens.spelling.prev")}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIdx(i => Math.min(total - 1, i + 1))} disabled={idx >= total - 1}
          style={[s.navBtn, idx >= total - 1 && { opacity: 0.4 }]}>
          <Text style={s.navBtnText}>{t("screens.spelling.next")}</Text>
          <Ionicons name="chevron-forward" size={16} color={brand.violet300} />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <TouchableOpacity onPress={() => ws.refresh()} style={s.smallBtn}>
          <Text style={s.smallBtnText}>{t("screens.spelling.refresh_words")}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => ws.generateWithAI()} disabled={ws.loading} style={s.smallBtn}>
          <Text style={s.smallBtnText}>{t("screens.spelling.ai_words")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Practice Panel ───────────────────────────────────────────────────────────

function PracticePanel({ ageGroup, difficulty, tts, t }: {
  ageGroup: SpellingAgeGroup; difficulty: SpellingDifficulty;
  tts: ReturnType<typeof useSpellingTTS>; t: ReturnType<typeof useTranslation>["t"];
}) {
  const ws = useSpellingWords(ageGroup, difficulty);
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const word = ws.words[idx];

  const check = () => {
    if (!word) return;
    const ok = guess.trim().toLowerCase() === word.word.toLowerCase();
    setResult(ok ? "correct" : "wrong");
    if (Platform.OS !== "web") {
      ok ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.impactAsync();
    }
  };

  const nextWord = () => {
    setGuess(""); setResult(null);
    setIdx(i => (i + 1) % ws.words.length);
  };

  if (ws.loading || !word) return <View style={s.center}><ActivityIndicator color="#fff" /></View>;

  return (
    <View style={s.card}>
      <Text style={s.wordCounter}>{t("screens.spelling.word_of", { n: idx + 1, total: ws.words.length })}</Text>
      <TouchableOpacity onPress={() => tts.speak(word.word)} style={[s.audioBtn, (tts.speaking || tts.loading) && { opacity: 0.6 }]}>
        <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.audioBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {tts.loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="volume-high" size={20} color="#fff" />}
          <Text style={s.audioBtnText}>{t("screens.spelling.hear_word")}</Text>
        </LinearGradient>
      </TouchableOpacity>
      {word.hint && <Text style={s.hintText}>{t("screens.spelling.hint", { v: word.hint })}</Text>}
      <TextInput
        style={s.input} value={guess} onChangeText={setGuess}
        placeholder={t("screens.spelling.type_spelling")} placeholderTextColor="rgba(255,255,255,0.4)"
        autoCapitalize="none" autoCorrect={false} editable={result === null}
        onSubmitEditing={result === null ? check : undefined}
      />
      {result && (
        <View style={[s.resultBanner, result === "correct" ? s.resultCorrect : s.resultWrong]}>
          <Text style={s.resultText}>
            {result === "correct" ? t("screens.spelling.correct") : `${t("screens.spelling.wrong")} — ${word.word}`}
          </Text>
        </View>
      )}
      {result === null ? (
        <TouchableOpacity onPress={check} style={s.primaryBtn}>
          <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={s.primaryBtnText}>{t("screens.spelling.check")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={nextWord} style={s.primaryBtn}>
          <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={s.primaryBtnText}>{t("screens.spelling.next")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Session Panel (Dictation / Competition / Battle) ────────────────────────

function SessionPanel({ mode, childId, ageGroup, difficulty, tts, onProgress, t }: {
  mode: "dictation" | "competition" | "battle";
  childId: number; ageGroup: SpellingAgeGroup; difficulty: SpellingDifficulty;
  tts: ReturnType<typeof useSpellingTTS>;
  onProgress: (p: SpellingProgress) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const sess = useSpellingSession(childId, ageGroup, onProgress);
  const [opponent, setOpponent] = useState<SpellingAiOpponent>("ai_medium");
  const [wordIdx, setWordIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [lastResult, setLastResult] = useState<SessionAttemptResult | null>(null);
  const [summary, setSummary] = useState<SessionFinalizeSummary | null>(null);

  const currentWord = sess.words[wordIdx];
  const allGraded = sess.words.length > 0 && sess.gradedIndices.size >= sess.words.length;

  const startSession = async () => {
    sess.reset();
    setWordIdx(0); setGuess(""); setLastResult(null); setSummary(null);
    await sess.start({ mode, difficulty, opponent: mode === "battle" ? opponent : undefined });
  };

  const playAudio = () => {
    if (!currentWord) return;
    tts.playUrl(currentWord.audioUrl);
  };

  const submitGuess = async () => {
    if (!currentWord || sess.gradedIndices.has(wordIdx)) return;
    const result = await sess.attempt(wordIdx, guess.trim());
    if (result) {
      setLastResult(result);
      if (Platform.OS !== "web") {
        result.correct ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.impactAsync();
      }
    }
  };

  const nextWord = () => {
    setGuess(""); setLastResult(null);
    if (wordIdx + 1 < sess.words.length) setWordIdx(i => i + 1);
  };

  const finalize = async () => {
    const sum = await sess.finalize();
    if (sum) setSummary(sum);
  };

  if (summary) return <SessionSummary summary={summary} onRestart={() => { setSummary(null); sess.reset(); }} t={t} />;

  if (!sess.sessionToken) {
    return (
      <View style={s.card}>
        <Text style={s.bigEmoji}>{mode === "competition" ? "🏆" : mode === "battle" ? "⚔️" : "🎧"}</Text>
        <Text style={s.cardTitle}>
          {mode === "dictation" ? t("screens.spelling.mode_dictation")
            : mode === "competition" ? t("screens.spelling.mode_competition")
            : t("screens.spelling.mode_battle")}
        </Text>
        {mode === "battle" && (
          <View style={{ gap: 8, marginVertical: 10, width: "100%" }}>
            <Text style={s.sectionLabel}>{t("screens.spelling.choose_opponent")}</Text>
            {(["ai_easy", "ai_medium", "ai_hard"] as SpellingAiOpponent[]).map(op => (
              <TouchableOpacity key={op} onPress={() => setOpponent(op)}
                style={[s.pill, { width: "100%" }, opponent === op && s.pillActive]}>
                <Text style={[s.pillText, opponent === op && s.pillTextActive]}>
                  {AI_OPPONENT_LABELS[op]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {sess.error && <Text style={s.errorText}>{sess.error}</Text>}
        <TouchableOpacity onPress={startSession} disabled={sess.loading} style={s.primaryBtn}>
          <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {sess.loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>{t("screens.spelling.start")}</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <Text style={s.wordCounter}>{t("screens.spelling.word_n", { n: wordIdx + 1, total: sess.words.length })}</Text>
      <Text style={s.subInfo}>
        {t("screens.spelling.word_n", { n: wordIdx + 1, total: sess.words.length })} ·{" "}
        {Array.from({ length: currentWord?.letterCount ?? 0 }, () => "_ ").join("")}
      </Text>
      <TouchableOpacity onPress={playAudio} disabled={tts.speaking || tts.loading}
        style={[s.audioBtn, (tts.speaking || tts.loading) && { opacity: 0.6 }]}>
        <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.audioBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {tts.loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="volume-high" size={20} color="#fff" />}
          <Text style={s.audioBtnText}>{t("screens.spelling.play_audio")}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {!sess.gradedIndices.has(wordIdx) ? (
        <>
          <TextInput
            style={s.input} value={guess} onChangeText={setGuess}
            placeholder={t("screens.spelling.type_spelling")} placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="none" autoCorrect={false} onSubmitEditing={submitGuess}
          />
          <TouchableOpacity onPress={submitGuess} style={s.primaryBtn}>
            <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.primaryBtnText}>{t("screens.spelling.submit")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {lastResult && (
            <View style={[s.resultBanner, lastResult.correct ? s.resultCorrect : s.resultWrong]}>
              <Text style={s.resultText}>
                {lastResult.correct ? t("screens.spelling.correct")
                  : `${t("screens.spelling.wrong")} — ${t("screens.spelling.correct_was", { word: lastResult.correctAnswer })}`}
              </Text>
            </View>
          )}
          {mode === "battle" && lastResult?.aiResult && (
            <Text style={s.subInfo}>
              {`AI: ${lastResult.aiResult.correct ? "✅" : "❌"}  (${lastResult.aiResult.ms}ms)`}
            </Text>
          )}
          {wordIdx + 1 < sess.words.length ? (
            <TouchableOpacity onPress={nextWord} style={s.primaryBtn}>
              <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={s.primaryBtnText}>{t("screens.spelling.next")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : allGraded ? (
            <TouchableOpacity onPress={finalize} disabled={sess.loading} style={s.primaryBtn}>
              <LinearGradient colors={[palette.amber500, palette.amber400]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {sess.loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>🏁 {t("screens.spelling.session_done")}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </>
      )}
      {sess.error && <Text style={s.errorText}>{sess.error}</Text>}
    </View>
  );
}

// ─── Session Summary ──────────────────────────────────────────────────────────

function SessionSummary({ summary, onRestart, t }: {
  summary: SessionFinalizeSummary; onRestart: () => void; t: ReturnType<typeof useTranslation>["t"];
}) {
  const winnerEmoji = summary.winner === "you" ? "🏆" : summary.winner === "ai" ? "🤖" : summary.winner === "tie" ? "🤝" : "🎉";
  return (
    <View style={s.card}>
      <Text style={{ fontSize: 56, textAlign: "center" }}>{winnerEmoji}</Text>
      {summary.winner ? (
        <Text style={s.bigWord}>
          {summary.winner === "you" ? t("screens.spelling.winner_you")
            : summary.winner === "ai" ? t("screens.spelling.winner_ai")
            : t("screens.spelling.winner_tie")}
        </Text>
      ) : (
        <Text style={s.bigWord}>{t("screens.spelling.session_done")}</Text>
      )}
      <View style={{ gap: 6, marginVertical: 10 }}>
        <Text style={s.subInfo}>{t("screens.spelling.words_correct", { n: summary.wordsCorrect, total: summary.wordsAttempted })}</Text>
        <Text style={s.subInfo}>{t("screens.spelling.accuracy", { pct: Math.round(summary.accuracyPct) })}</Text>
        {summary.score !== null && <Text style={s.subInfo}>{t("screens.spelling.competition_score", { score: summary.score })}</Text>}
        {summary.aiScore !== null && <Text style={s.subInfo}>{t("screens.spelling.ai_score", { score: summary.aiScore })}</Text>}
      </View>
      <TouchableOpacity onPress={onRestart} style={s.primaryBtn}>
        <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={s.primaryBtnText}>{t("screens.spelling.restart")}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ─── Tournament Panel ─────────────────────────────────────────────────────────

function TournamentPanel({ childId, ageGroup, tts, onProgress, t }: {
  childId: number; ageGroup: SpellingAgeGroup;
  tts: ReturnType<typeof useSpellingTTS>;
  onProgress: (p: SpellingProgress) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const tourn = useSpellingTournament(childId, ageGroup, onProgress);
  const [wordIdx, setWordIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [lastResult, setLastResult] = useState<SessionAttemptResult | null>(null);

  const sess = tourn.activeSession;
  const currentWord = sess?.words[wordIdx];
  const allGraded = sess && sess.words.length > 0 && tourn.gradedIndices.size >= sess.words.length;

  const start = async () => {
    setWordIdx(0); setGuess(""); setLastResult(null);
    await tourn.start();
  };

  const submit = async () => {
    if (!currentWord) return;
    const r = await tourn.attempt(wordIdx, guess.trim());
    if (r) {
      setLastResult(r);
      if (Platform.OS !== "web") {
        r.correct ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.impactAsync();
      }
    }
  };

  const advance = async () => {
    const tour = await tourn.advance();
    if (tour) { setWordIdx(0); setGuess(""); setLastResult(null); }
  };

  const isDone = tourn.tournament && tourn.tournament.status !== "active";

  if (isDone && tourn.tournament) {
    return (
      <View style={s.card}>
        <Text style={{ fontSize: 52, textAlign: "center" }}>🏅</Text>
        <Text style={s.bigWord}>{t("screens.spelling.tournament_done")}</Text>
        <Text style={s.subInfo}>{t("screens.spelling.total_score", { score: tourn.tournament.totalScore })}</Text>
        {tourn.tournament.rounds.map(r => (
          <View key={r.round} style={[s.roundRow, r.passed ? s.roundPassed : s.roundFailed]}>
            <Text style={s.roundText}>
              Round {r.round}: {r.passed ? "✅" : "❌"} · {r.wordsCorrect}/{r.wordsAttempted}
            </Text>
          </View>
        ))}
        <TouchableOpacity onPress={() => tourn.reset()} style={s.primaryBtn}>
          <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={s.primaryBtnText}>{t("screens.spelling.restart")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  if (!tourn.tournament || !sess) {
    return (
      <View style={s.card}>
        <Text style={s.bigEmoji}>🏅</Text>
        <Text style={s.cardTitle}>{t("screens.spelling.mode_tournament")}</Text>
        {tourn.error && <Text style={s.errorText}>{tourn.error}</Text>}
        <TouchableOpacity onPress={start} disabled={tourn.loading} style={s.primaryBtn}>
          <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {tourn.loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>{t("screens.spelling.start")}</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  if (tourn.lastRound && !allGraded && tourn.gradedIndices.size === 0) {
    return (
      <View style={s.card}>
        <Text style={{ fontSize: 48, textAlign: "center" }}>{tourn.lastRound.passed ? "✅" : "❌"}</Text>
        <Text style={s.bigWord}>{tourn.lastRound.passed ? t("screens.spelling.round_passed") : t("screens.spelling.round_failed")}</Text>
        {tourn.tournament.status === "active" && (
          <TouchableOpacity onPress={advance} disabled={tourn.loading} style={s.primaryBtn}>
            <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {tourn.loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>{t("screens.spelling.advance")}</Text>}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={s.card}>
      <Text style={s.wordCounter}>{t("screens.spelling.tournament_round", { n: sess.round })}</Text>
      <Text style={s.subInfo}>{t("screens.spelling.word_n", { n: wordIdx + 1, total: sess.words.length })}</Text>
      <Text style={s.subInfo}>{Array.from({ length: currentWord?.letterCount ?? 0 }, () => "_ ").join("")}</Text>
      <TouchableOpacity onPress={() => currentWord && tts.playUrl(currentWord.audioUrl)}
        disabled={tts.speaking || tts.loading} style={[s.audioBtn, (tts.speaking || tts.loading) && { opacity: 0.6 }]}>
        <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.audioBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="volume-high" size={20} color="#fff" />
          <Text style={s.audioBtnText}>{t("screens.spelling.play_audio")}</Text>
        </LinearGradient>
      </TouchableOpacity>
      {!tourn.gradedIndices.has(wordIdx) ? (
        <>
          <TextInput style={s.input} value={guess} onChangeText={setGuess}
            placeholder={t("screens.spelling.type_spelling")} placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="none" autoCorrect={false} onSubmitEditing={submit} />
          <TouchableOpacity onPress={submit} style={s.primaryBtn}>
            <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.primaryBtnText}>{t("screens.spelling.submit")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {lastResult && (
            <View style={[s.resultBanner, lastResult.correct ? s.resultCorrect : s.resultWrong]}>
              <Text style={s.resultText}>
                {lastResult.correct ? t("screens.spelling.correct")
                  : `${t("screens.spelling.wrong")} — ${lastResult.correctAnswer}`}
              </Text>
            </View>
          )}
          {wordIdx + 1 < sess.words.length ? (
            <TouchableOpacity onPress={() => { setGuess(""); setLastResult(null); setWordIdx(i => i + 1); }} style={s.primaryBtn}>
              <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={s.primaryBtnText}>{t("screens.spelling.next")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : allGraded ? (
            <TouchableOpacity onPress={advance} disabled={tourn.loading} style={s.primaryBtn}>
              <LinearGradient colors={[palette.amber500, palette.amber400]} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {tourn.loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>{t("screens.spelling.advance")}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );
}

// ─── Parent Panel ─────────────────────────────────────────────────────────────

function ParentPanel({ ageGroup, difficulty, childId, tts, t }: {
  ageGroup: SpellingAgeGroup; difficulty: SpellingDifficulty;
  childId: number;
  tts: ReturnType<typeof useSpellingTTS>;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const ws = useSpellingWords(ageGroup, difficulty);
  const sp = useSpellingProgress(childId, ageGroup);
  const [idx, setIdx] = useState(0);
  const [showWord, setShowWord] = useState(false);
  const word = ws.words[idx];

  const record = async (correct: boolean) => {
    await sp.recordAttempt(correct, "parent");
    if (Platform.OS !== "web") {
      correct ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.impactAsync();
    }
    setShowWord(false);
    setIdx(i => (i + 1) % ws.words.length);
  };

  if (ws.loading || !word) return <View style={s.center}><ActivityIndicator color="#fff" /></View>;

  return (
    <View style={s.card}>
      <Text style={s.wordCounter}>{t("screens.spelling.word_of", { n: idx + 1, total: ws.words.length })}</Text>
      <TouchableOpacity onPress={() => tts.speak(word.word)} style={[s.audioBtn, (tts.speaking || tts.loading) && { opacity: 0.6 }]}>
        <LinearGradient colors={[brand.primary, SPELL_PINK]} style={s.audioBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="volume-high" size={20} color="#fff" />
          <Text style={s.audioBtnText}>{t("screens.spelling.hear_word")}</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setShowWord(v => !v)} style={{ marginVertical: 10 }}>
        <Text style={[s.bigWord, !showWord && { opacity: 0 }]}>{word.word}</Text>
        {!showWord && <Text style={s.subInfo}>(tap to reveal)</Text>}
      </TouchableOpacity>
      <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
        <TouchableOpacity onPress={() => record(true)} style={[s.judgeBtn, { backgroundColor: "rgba(34,197,94,0.25)", borderColor: palette.green500 }]}>
          <Text style={[s.judgeBtnText, { color: palette.green500 }]}>{t("screens.spelling.parent_correct")}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => record(false)} style={[s.judgeBtn, { backgroundColor: "rgba(239,68,68,0.2)", borderColor: palette.red500 }]}>
          <Text style={[s.judgeBtnText, { color: palette.red500 }]}>{t("screens.spelling.parent_wrong")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 12, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  statsBadge: { backgroundColor: "rgba(167,139,250,0.2)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statsBadgeText: { color: brand.violet300, fontSize: 11, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center" },
  heroCard: { margin: 14, padding: 14, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(139,92,246,0.25)" },
  heroStat: { alignItems: "center" },
  heroStatVal: { color: "#fff", fontWeight: "800", fontSize: 13 },
  badgePill: { backgroundColor: "rgba(167,139,250,0.18)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: brand.violet300, fontSize: 11 },
  sectionLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "rgba(139,92,246,0.4)", backgroundColor: "rgba(255,255,255,0.06)" },
  pillActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  pillText: { color: "rgba(255,255,255,0.7)", fontWeight: "600", fontSize: 13 },
  pillTextActive: { color: "#fff" },
  modeTab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(139,92,246,0.35)", backgroundColor: "rgba(255,255,255,0.05)", flexDirection: "row", alignItems: "center", gap: 5 },
  modeTabActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  modeTabText: { color: "rgba(255,255,255,0.7)", fontWeight: "600", fontSize: 12 },
  modeTabTextActive: { color: "#fff" },
  card: { margin: 14, padding: 18, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(139,92,246,0.25)", alignItems: "center", gap: 10 },
  bigWord: { color: "#fff", fontSize: 34, fontWeight: "900", textAlign: "center", letterSpacing: -0.5 },
  bigEmoji: { fontSize: 52, textAlign: "center" },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "800", textAlign: "center" },
  wordCounter: { color: "rgba(167,139,250,0.8)", fontSize: 12, fontWeight: "700" },
  subInfo: { color: "rgba(255,255,255,0.65)", fontSize: 14, textAlign: "center" },
  hintText: { color: "rgba(167,139,250,0.9)", fontSize: 13, textAlign: "center", fontStyle: "italic" },
  audioBtn: { width: "100%", borderRadius: 999, overflow: "hidden" },
  audioBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  audioBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  navBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(167,139,250,0.15)" },
  navBtnText: { color: brand.violet300, fontWeight: "600", fontSize: 13 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "rgba(139,92,246,0.4)", backgroundColor: "rgba(255,255,255,0.05)" },
  smallBtnText: { color: brand.violet300, fontWeight: "600", fontSize: 12 },
  input: { width: "100%", backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(139,92,246,0.4)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 16, fontWeight: "600" },
  primaryBtn: { width: "100%", borderRadius: 999, overflow: "hidden" },
  primaryBtnGrad: { alignItems: "center", justifyContent: "center", paddingVertical: 13, flexDirection: "row", gap: 8 },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  resultBanner: { width: "100%", borderRadius: 12, padding: 12, alignItems: "center" },
  resultCorrect: { backgroundColor: "rgba(34,197,94,0.22)", borderWidth: 1, borderColor: palette.green500 },
  resultWrong: { backgroundColor: "rgba(239,68,68,0.18)", borderWidth: 1, borderColor: palette.red500 },
  resultText: { color: "#fff", fontWeight: "700", fontSize: 14, textAlign: "center" },
  errorText: { color: palette.rose200, fontSize: 12, textAlign: "center" },
  childRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(139,92,246,0.25)", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: brand.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  childName: { flex: 1, color: "#fff", fontWeight: "700", fontSize: 15 },
  judgeBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1.5 },
  judgeBtnText: { fontWeight: "800", fontSize: 15 },
  roundRow: { width: "100%", borderRadius: 10, padding: 10, marginTop: 6 },
  roundPassed: { backgroundColor: "rgba(34,197,94,0.18)", borderWidth: 1, borderColor: palette.green500 },
  roundFailed: { backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 1, borderColor: palette.red500 },
  roundText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
// i18n-ignore-end
