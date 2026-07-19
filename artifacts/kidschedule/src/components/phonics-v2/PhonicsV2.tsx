import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import type { PhonicsLevel } from "@/lib/phonics-content";
import { JourneyMapV2 } from "./JourneyMapV2";
import { DailyMissionPanel } from "./DailyMissionPanel";
import { WordFamilyExplorer } from "./WordFamilyExplorer";
import { KaraokeBlendRound } from "./KaraokeBlendRound";
import { PhonicsGamesHub } from "./games/PhonicsGamesHub";
import { DecodableStoryReader } from "./DecodableStoryReader";
import { ParentInsightsV3Card } from "./ParentInsightsV3Card";
import { DigraphPathwayPanel } from "./DigraphPathwayPanel";
import { BlendListenCheck } from "./BlendListenCheck";
import { ReadingParentDashboard } from "./lesson/ReadingParentDashboard";
import { ReadingAcademyHub } from "./academy/ReadingAcademyHub";
import { PhonicsLearningHub } from "./ux/PhonicsLearningHub";
import { DailySessionRunner } from "./session/DailySessionRunner";
import type { PhonicsDailyPlan } from "@workspace/phonics-curriculum";
import { getLetterGroup } from "@workspace/phonics-curriculum";
import type { MissionSummary } from "./DailyMissionPanel";
import {
  buildLessonTarget,
  pickNextLessonGrapheme,
} from "@/lib/phonics-v3/reading-lesson-engine";
import {
  buildLearningHubModel,
  resolveMasteredGraphemeSet,
} from "@/lib/phonics-v3/learning-hub";
import {
  clearLessonResume,
  loadLessonResume,
  type LessonResumeSnapshot,
} from "@/lib/phonics-v3/lesson-resume";
import {
  buildSessionPlan,
  isSessionCompleteToday,
  isSessionInProgress,
  primarySessionCta,
  resolveTodaySession,
  saveDailySession,
  startDailySession,
  type DailySessionState,
} from "@/lib/phonics-v3/daily-session";
import {
  feedReadingPet,
  loadReadingPetState,
  saveReadingPetState,
  READING_PETS,
} from "@/lib/phonics-v3/reading-pet";
import { resolvePrimaryCta, type PhonicsPrimaryCta } from "@/lib/phonics-journey-roadmap";
import {
  loadReadingSkillsState,
  recordLessonSkills,
  saveReadingSkillsState,
  type ReadingSkillsState,
} from "@/lib/phonics-v3/reading-skills";
import {
  loadCoachConfusions,
  recordCoachAttempt,
  saveCoachConfusions,
  focusGraphemesForPractice,
  type CoachConfusionState,
} from "@/lib/phonics-v3/coach-confusions";
import { generateDecodableStory } from "@/lib/phonics-v3/ai-decodable-stories";
import {
  normalizeScore01,
  type CoachEvaluation,
} from "@/lib/phonics-v3/ai-reading-coach";
import {
  loadFamilyProgress,
  recordFamilyWordPractice,
  saveFamilyProgress,
} from "@/lib/phonics-v2/family-progress";
import {
  loadV2JourneyProgress,
  markV2StageComplete,
  saveV2JourneyProgress,
} from "@/lib/phonics-v2/v2-journey-progress";
import {
  loadPronunciationScores,
  type PhonicsV2PronunciationScores,
} from "@/lib/phonics-v2/pronunciation-scores";
import { prefetchCvcWordList, warmPhonicsSessionTiles } from "@/lib/phonics-v2/audio-prefetch";
import type { PhonicsV2Stage } from "@/lib/phonics-v2/content/journey-stages";
import type { JourneyStageStatus } from "@/lib/phonics-v2/journey-progression";
import { trackJourneyStageSelect } from "@/lib/phonics-v2/journey-progression-telemetry";
import { getFamilyForWord } from "@/lib/phonics-v2/content/word-families";
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import {
  getUnlockedStoriesV3,
  getStoryCount,
} from "@/lib/phonics-v3/content/story-catalog";
import {
  loadMasteryState,
  type PhonicsMasteryState,
} from "@/lib/phonics-v3/mastery-engine";
import {
  INTEGRITY_LIMITS,
  applyGatedWordMastery,
  loadIntegrityState,
  saveIntegrityState,
  type MasteryIntegrityState,
} from "@/lib/phonics-v3/mastery-integrity";
import {
  loadFluencyState,
  recordStoryComplete,
  recordWordAttempt,
} from "@/lib/phonics-v3/fluency-tracker";
import {
  ensurePhonicsV3OnlineSync,
  hydratePhonicsV3Progress,
  persistPhonicsV3Fluency,
  persistPhonicsV3Mastery,
  persistPhonicsV3Retention,
  persistPhonicsV3Stories,
} from "@/lib/phonics-v3/sync";
import {
  introduceSkill,
  loadRetentionState,
  processRetentionReview,
  syncMasteredTracks,
  type PhonicsRetentionState,
} from "@/lib/phonics-v3/spaced-repetition";
import {
  loadStoryProgressLocal,
  recordStoryCompleteLocal,
} from "@/lib/phonics-v3/story-progress";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  auditOfflineCache,
  buildOfflinePrefetchPlan,
  prefetchOfflinePhonicsPack,
} from "@/lib/phonics-v3/offline-cache";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { sanitizeDisplayPhonicsItems } from "@/lib/phonics-item-guards";

function avgMasteryScore(state: PhonicsMasteryState): number {
  const all = [
    ...Object.values(state.words),
    ...Object.values(state.letters),
    ...Object.values(state.families),
  ];
  if (all.length === 0) return 0;
  return Math.round(all.reduce((s, r) => s + r.score, 0) / all.length);
}

export type PhonicsV2Props = {
  childId: number;
  childName: string;
  totalAgeMonths: number;
  level: PhonicsLevel;
  items: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  recordPlay: (id: string, contentId?: number) => void;
  curriculumLevel?: number | null;
  letterGroupIndex?: number | null;
  curriculumPlan?: PhonicsDailyPlan | null;
  curriculumMasteryScore?: number;
  curriculumLastTestAt?: string | null;
  curriculumStreak?: number;
  onCompleteCurriculumActivity?: (activityId: string) => Promise<void>;
  onMissionSummaryChange?: (summary: MissionSummary) => void;
  onPrimaryCtaChange?: (cta: PhonicsPrimaryCta) => void;
  lessonLaunchToken?: number;
  onLessonSessionChange?: (open: boolean) => void;
};

export function PhonicsV2({
  childId,
  childName,
  totalAgeMonths,
  level,
  items,
  progress,
  recordPlay,
  curriculumLevel,
  letterGroupIndex,
  curriculumPlan,
  curriculumMasteryScore = 0,
  curriculumLastTestAt,
  curriculumStreak = 0,
  onCompleteCurriculumActivity,
  onMissionSummaryChange,
  onPrimaryCtaChange,
  lessonLaunchToken = 0,
  onLessonSessionChange,
}: PhonicsV2Props) {
  const authFetch = useAuthFetch();
  const [familyProgress, setFamilyProgress] = useState(() =>
    loadFamilyProgress(childId),
  );
  const [journeyProgress, setJourneyProgress] = useState(() =>
    loadV2JourneyProgress(childId),
  );
  const [pronunciation, setPronunciation] = useState<PhonicsV2PronunciationScores>(
    () => loadPronunciationScores(childId),
  );
  const [karaokeWord, setKaraokeWord] = useState("");
  const [storyId, setStoryId] = useState<string | null>(null);
  const [showAllStories, setShowAllStories] = useState(false);
  const [mastery, setMastery] = useState(() => loadMasteryState(childId));
  const [fluency, setFluency] = useState(() => loadFluencyState(childId));
  const [retention, setRetention] = useState<PhonicsRetentionState>(() =>
    syncMasteredTracks(loadRetentionState(childId), loadMasteryState(childId)),
  );
  const [integrity, setIntegrity] = useState<MasteryIntegrityState>(() =>
    loadIntegrityState(childId),
  );
  const [readingSkills, setReadingSkills] = useState<ReadingSkillsState>(() =>
    loadReadingSkillsState(childId),
  );
  const [sessionActive, setSessionActive] = useState(false);
  const [journeyMapOpen, setJourneyMapOpen] = useState(false);
  const [lessonGraphemeOverride, setLessonGraphemeOverride] = useState<string | null>(
    null,
  );
  const [coachConfusions, setCoachConfusions] = useState<CoachConfusionState>(() =>
    loadCoachConfusions(childId),
  );
  const [lessonResume, setLessonResume] = useState<LessonResumeSnapshot | null>(() =>
    loadLessonResume(childId),
  );
  const [readingPet, setReadingPet] = useState(() => loadReadingPetState(childId));
  const [dailySession, setDailySession] = useState<DailySessionState | null>(null);
  const karaokeAttemptsRef = useRef<Record<string, number>>({});
  const voiceAttemptsRef = useRef<Record<string, number>>({});
  const lastLaunchTokenRef = useRef(0);

  const safeItems = useMemo(() => sanitizeDisplayPhonicsItems(items), [items]);
  const practiceWords = useMemo(
    () =>
      safeItems
        .filter((it) => it.type === "word" || /^[a-z]{3}$/.test(it.symbol))
        .map((it) => it.symbol.toLowerCase())
        .slice(0, 6),
    [safeItems],
  );

  // Karaoke blending only supports CVC words in the blend library. Filter out
  // digraph/non-CVC words (e.g. "ship", "chip") so the round never shows
  // "not in the blend library"; fall back to a starter CVC set when needed.
  const blendableWords = useMemo(() => {
    const cvc = practiceWords.filter((w) => getCvcWordEntry(w));
    return cvc.length > 0 ? cvc : ["cat", "dog", "pin", "sun", "hat", "pan"];
  }, [practiceWords]);

  useEffect(() => {
    setKaraokeWord((prev) =>
      prev && blendableWords.includes(prev) ? prev : blendableWords[0]!,
    );
  }, [blendableWords]);

  useEffect(() => {
    ensurePhonicsV3OnlineSync(authFetch);
    void hydratePhonicsV3Progress(childId, authFetch)
      .then(() => {
        const nextMastery = loadMasteryState(childId);
        setMastery(nextMastery);
        setFluency(loadFluencyState(childId));
        const nextRetention = syncMasteredTracks(loadRetentionState(childId), nextMastery);
        setRetention(nextRetention);
      })
      .catch((err) => {
        console.warn("[phonics-v2] progress hydrate failed", err);
      });
  }, [childId, authFetch]);

  useEffect(() => {
    const wordTiles = practiceWords.map((w) => ({
      symbol: w,
      type: "word" as const,
    }));
    void warmPhonicsSessionTiles(wordTiles, { limit: 16 });

    const runPrefetch = () => {
      prefetchCvcWordList(practiceWords);
      const plan = buildOfflinePrefetchPlan({
        missionWords: practiceWords,
        includeDigraphs: avgMasteryScore(mastery) >= 60,
      });
      prefetchOfflinePhonicsPack(plan);
      auditOfflineCache(plan);
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(runPrefetch, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(runPrefetch, 400);
    return () => clearTimeout(timer);
  }, [practiceWords, mastery]);

  useEffect(() => {
    setFamilyProgress(loadFamilyProgress(childId));
    setJourneyProgress(loadV2JourneyProgress(childId));
    setPronunciation(loadPronunciationScores(childId));
    const nextMastery = loadMasteryState(childId);
    setMastery(nextMastery);
    setFluency(loadFluencyState(childId));
    const nextRetention = syncMasteredTracks(loadRetentionState(childId), nextMastery);
    setRetention(nextRetention);
    setIntegrity(loadIntegrityState(childId));
    setReadingSkills(loadReadingSkillsState(childId));
    setCoachConfusions(loadCoachConfusions(childId));
    setSessionActive(false);
    setLessonGraphemeOverride(null);
    setJourneyMapOpen(false);
    setLessonResume(loadLessonResume(childId));
    setReadingPet(loadReadingPetState(childId));
    setDailySession(null);
    lastLaunchTokenRef.current = 0;
  }, [childId]);

  useEffect(() => {
    onLessonSessionChange?.(sessionActive);
  }, [sessionActive, onLessonSessionChange]);

  const applyGatedMastery = useCallback(
    (
      opts: Omit<Parameters<typeof applyGatedWordMastery>[0], "mastery" | "integrity">,
    ) => {
      setMastery((prevMastery) => {
        const prevIntegrity = loadIntegrityState(childId);
        const result = applyGatedWordMastery({
          ...opts,
          mastery: prevMastery,
          integrity: prevIntegrity,
        });
        saveIntegrityState(childId, result.integrity);
        setIntegrity(result.integrity);
        persistPhonicsV3Mastery(childId, result.mastery);
        const synced = syncMasteredTracks(loadRetentionState(childId), result.mastery);
        setRetention(synced);
        persistPhonicsV3Retention(childId, synced);
        return result.mastery;
      });
    },
    [childId],
  );

  const handleRetentionReview = useCallback(
    (word: string, passed: boolean) => {
      setMastery((prevMastery) => {
        const prevRetention = loadRetentionState(childId);
        const synced = syncMasteredTracks(prevRetention, prevMastery);
        const result = processRetentionReview({
          retention: synced,
          mastery: prevMastery,
          type: "word",
          id: word,
          passed,
        });
        setRetention(result.retention);
        persistPhonicsV3Mastery(childId, result.mastery);
        persistPhonicsV3Retention(childId, result.retention);
        return result.mastery;
      });
    },
    [childId],
  );

  const trackSkillIntroduction = useCallback(
    (word: string) => {
      const w = word.trim().toLowerCase();
      const next = introduceSkill(loadRetentionState(childId), "word", w);
      setRetention(next);
      persistPhonicsV3Retention(childId, next);
    },
    [childId],
  );

  const applyFluency = useCallback(
    (fn: (prev: ReturnType<typeof loadFluencyState>) => ReturnType<typeof loadFluencyState>) => {
      setFluency((prev) => {
        const next = fn(prev);
        persistPhonicsV3Fluency(childId, next);
        return next;
      });
    },
    [childId],
  );

  const handleFamilyPractice = useCallback(
    (familyId: Parameters<typeof recordFamilyWordPractice>[1], word: string, mastered?: boolean) => {
      const next = recordFamilyWordPractice(familyProgress, familyId, word, mastered);
      setFamilyProgress(next);
      saveFamilyProgress(childId, next);
      recordPlay(`v2-family-${word}`);
      if (mastered) {
        const jp = markV2StageComplete(journeyProgress, "word_families");
        setJourneyProgress(jp);
        saveV2JourneyProgress(childId, jp);
      }
    },
    [familyProgress, childId, recordPlay, journeyProgress],
  );

  const practicedItemCount = useMemo(
    () => Object.keys(progress.practiced ?? {}).length,
    [progress.practiced],
  );

  const masteryAvg = avgMasteryScore(mastery);
  const storyCatalogLevel = curriculumLevel ?? 1;
  const groupIndex = letterGroupIndex ?? 1;
  const nextLessonGrapheme = useMemo(() => {
    const masteredLetters = Object.entries(progress.mastered ?? {})
      .filter(([, v]) => v)
      .map(([id]) => {
        const item = safeItems.find((i) => i.id === id);
        return item?.symbol?.toLowerCase() ?? "";
      })
      .filter(Boolean);
    return pickNextLessonGrapheme(groupIndex, masteredLetters);
  }, [groupIndex, progress.mastered, safeItems]);

  const hubFocusGrapheme = lessonGraphemeOverride ?? nextLessonGrapheme;

  const sessionFocusWord = useMemo(() => {
    const target = buildLessonTarget(hubFocusGrapheme, groupIndex);
    return target.focusWord;
  }, [hubFocusGrapheme, groupIndex]);

  const sessionPracticeWords = useMemo(() => {
    const target = buildLessonTarget(hubFocusGrapheme, groupIndex);
    const fromBlend = blendableWords.slice(0, 3);
    const merged = [
      target.focusWord,
      ...target.practiceWords,
      ...fromBlend,
    ].filter(Boolean);
    return [...new Set(merged.map((w) => w.toLowerCase()))].slice(0, 3);
  }, [hubFocusGrapheme, groupIndex, blendableWords]);

  useEffect(() => {
    if (sessionActive) return;
    const resolved = resolveTodaySession(childId, {
      grapheme: hubFocusGrapheme,
      letterGroupIndex: groupIndex,
      focusWord: sessionFocusWord,
      practiceWords: sessionPracticeWords,
    });
    setDailySession(resolved);
  }, [
    childId,
    hubFocusGrapheme,
    groupIndex,
    sessionFocusWord,
    sessionPracticeWords,
    sessionActive,
  ]);

  const startAdventure = useCallback(
    (grapheme?: string) => {
      // Resume unfinished session exactly where Amy left off — no activity picker.
      if (!grapheme && dailySession && isSessionInProgress(dailySession)) {
        const started = startDailySession(dailySession);
        setDailySession(started);
        saveDailySession(childId, started);
        setSessionActive(true);
        requestAnimationFrame(() => {
          document
            .getElementById("phonics-daily-session")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return;
      }

      const g = (grapheme ?? hubFocusGrapheme).toLowerCase();
      if (grapheme) setLessonGraphemeOverride(grapheme);
      const target = buildLessonTarget(g, groupIndex);
      const words = [
        target.focusWord,
        ...target.practiceWords,
        ...blendableWords,
      ]
        .map((w) => w.toLowerCase())
        .filter(Boolean);
      const unique = [...new Set(words)].slice(0, 3);
      const base = resolveTodaySession(childId, {
        grapheme: g,
        letterGroupIndex: groupIndex,
        focusWord: target.focusWord,
        practiceWords: unique,
      });
      // Fresh start only when not mid-session (or explicit lesson pick).
      const seed =
        grapheme || !isSessionInProgress(base)
          ? {
              ...base,
              grapheme: g,
              letterGroupIndex: groupIndex,
              focusWord: target.focusWord,
              practiceWords: unique,
              phase: "idle" as const,
              stepIndex: 0,
              lessonCompleted: false,
              wordsCompleted: [],
              coachCompleted: false,
              storyCompleted: false,
              active: false,
              completedAt: null,
            }
          : base;
      const started = startDailySession(seed);
      setDailySession(started);
      saveDailySession(childId, started);
      setSessionActive(true);
      requestAnimationFrame(() => {
        document
          .getElementById("phonics-daily-session")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [hubFocusGrapheme, groupIndex, blendableWords, dailySession, childId],
  );

  const handleStageSelect = useCallback(
    (stage: PhonicsV2Stage, status: JourneyStageStatus) => {
      trackJourneyStageSelect(stage.id, status, childId);
      if (status === "locked") return;
      if (stage.id === "letter_sounds") {
        startAdventure();
        return;
      }
      const el = document.getElementById(stage.scrollTarget);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [childId, startAdventure],
  );

  const masteredGraphemes = useMemo(() => {
    const symbolById = new Map(
      safeItems.map((i) => [i.id, i.symbol?.toLowerCase() ?? ""] as const),
    );
    return resolveMasteredGraphemeSet(progress.mastered ?? {}, symbolById);
  }, [progress.mastered, safeItems]);

  const unlockedStories = useMemo(() => {
    const masteredFamilies = Object.values(mastery.families)
      .filter((f) => f.isMastered)
      .map((f) => f.id);
    return getUnlockedStoriesV3({
      masteredFamilies,
      masteryScoreAvg: masteryAvg,
      currentLevel: storyCatalogLevel,
    });
  }, [mastery, masteryAvg, storyCatalogLevel]);
  const storiesCompletedCount = useMemo(
    () => Object.keys(loadStoryProgressLocal(childId).completed ?? {}).length,
    [childId, fluency, readingSkills.wordsRead.length],
  );

  const sessionCompleteToday = isSessionCompleteToday(dailySession);
  const sessionInProgress = isSessionInProgress(dailySession);

  const hubModel = useMemo(() => {
    const base = buildLearningHubModel({
      childName,
      letterGroupIndex: groupIndex,
      focusGrapheme: hubFocusGrapheme,
      masteredGraphemes,
      wordsLearned: readingSkills.wordsRead.length,
      starsEarned: readingSkills.readingStars,
      resume: sessionInProgress ? lessonResume : null,
      pet: readingPet,
      estimatedMinutes: 8,
      storiesUnlocked: unlockedStories.length > 0 || storiesCompletedCount > 0,
      dailyGoalMet: sessionCompleteToday || readingSkills.wordsRead.length > 0,
    });
    const cta = primarySessionCta(dailySession);
    return {
      ...base,
      hasResume: cta.kind === "continue",
      primaryAction: cta.kind === "continue" ? ("continue" as const) : ("start" as const),
      primaryLabel: cta.label,
    };
  }, [
    childName,
    groupIndex,
    hubFocusGrapheme,
    masteredGraphemes,
    readingSkills.wordsRead.length,
    readingSkills.readingStars,
    sessionInProgress,
    lessonResume,
    readingPet,
    unlockedStories.length,
    storiesCompletedCount,
    sessionCompleteToday,
    dailySession,
  ]);

  const planItems = useMemo(
    () =>
      buildSessionPlan(
        dailySession ??
          resolveTodaySession(childId, {
            grapheme: hubFocusGrapheme,
            letterGroupIndex: groupIndex,
            focusWord: sessionFocusWord,
            practiceWords: sessionPracticeWords,
          }),
      ),
    [dailySession, childId, hubFocusGrapheme, groupIndex, sessionFocusWord, sessionPracticeWords],
  );

  useEffect(() => {
    if (sessionCompleteToday) {
      onPrimaryCtaChange?.({
        state: "view_progress",
        label: "Done for today",
        scrollTarget: "phonics-learning-hub",
        action: "scroll",
      });
      return;
    }
    onPrimaryCtaChange?.(
      resolvePrimaryCta({
        missionStarted: sessionInProgress,
        missionComplete: false,
        dailyQuizComplete: false,
        hasLessonResume: sessionInProgress,
      }),
    );
  }, [sessionInProgress, sessionCompleteToday, onPrimaryCtaChange]);

  useEffect(() => {
    if (!lessonLaunchToken || lessonLaunchToken === lastLaunchTokenRef.current) {
      return;
    }
    lastLaunchTokenRef.current = lessonLaunchToken;
    if (sessionCompleteToday) return;
    startAdventure();
  }, [lessonLaunchToken, startAdventure, sessionCompleteToday]);

  const aiStory = useMemo(
    () => generateDecodableStory(groupIndex, childId + groupIndex),
    [groupIndex, childId],
  );

  const petLabel = useMemo(() => {
    const meta = READING_PETS[readingPet.kind] ?? READING_PETS.owl;
    return `${meta.emoji} ${meta.name}`;
  }, [readingPet.kind]);

  const tomorrowPreview = useMemo(() => {
    const nextGroup = getLetterGroup(Math.min(8, groupIndex + (hubModel.lessonsCompletedInGroup >= hubModel.lessonTotal - 1 ? 1 : 0)));
    return `Group ${nextGroup.id} · keep blending ${nextGroup.name}`;
  }, [groupIndex, hubModel.lessonsCompletedInGroup, hubModel.lessonTotal]);
  const coachFocus = useMemo(
    () => focusGraphemesForPractice(coachConfusions, 2),
    [coachConfusions],
  );

  const handleCoachEvaluation = useCallback(
    (evaluation: CoachEvaluation) => {
      const next = recordCoachAttempt(coachConfusions, {
        pronunciationScore: evaluation.pronunciationScore,
        confusion: evaluation.confusion,
      });
      setCoachConfusions(next);
      saveCoachConfusions(childId, next);
      setPronunciation(loadPronunciationScores(childId));
    },
    [coachConfusions, childId],
  );

  const handleLessonComplete = useCallback(
    (payload: {
      grapheme: string;
      focusWord: string;
      starsEarned: number;
      results: { stepId: string; correct: boolean; skipped?: boolean }[];
      coachEvaluations?: CoachEvaluation[];
    }) => {
      const nextSkills = recordLessonSkills(
        readingSkills,
        payload.results,
        payload.starsEarned,
        payload.focusWord,
      );
      // Skips advance the lesson for accessibility but must not inflate mastery/fluency.
      const readOk = payload.results.some(
        (r) => r.stepId === "read_independent" && r.correct && !r.skipped,
      );
      const blendOk = payload.results.some(
        (r) => r.stepId === "build_word" && r.correct && !r.skipped,
      );
      const withFluency = readOk
        ? {
            ...nextSkills,
            skills: {
              ...nextSkills.skills,
              fluency: {
                skill: "fluency" as const,
                score: Math.min(
                  100,
                  Math.round((nextSkills.skills.fluency?.score ?? 40) * 0.8 + 20),
                ),
                attempts: (nextSkills.skills.fluency?.attempts ?? 0) + 1,
                correct: (nextSkills.skills.fluency?.correct ?? 0) + 1,
                lastAt: Date.now(),
              },
            },
          }
        : nextSkills;
      setReadingSkills(withFluency);
      saveReadingSkillsState(childId, withFluency);
      trackSkillIntroduction(payload.focusWord);
      if (blendOk) {
        applyGatedMastery({
          word: payload.focusWord,
          dimension: "blended",
          activity: "karaoke",
          passed: true,
          accuracy: 0.9,
          attemptNumber: 1,
        });
      }
      const voicePass = (payload.coachEvaluations ?? []).some(
        (e) => e.correct && (e.targetKind === "word" || e.targetKind === "phoneme"),
      );
      const voiceConfidence =
        (payload.coachEvaluations ?? [])
          .filter((e) => e.correct)
          .map((e) => normalizeScore01(e.confidencePct))
          .pop() ?? 0.8;

      if (readOk) {
        applyGatedMastery({
          word: payload.focusWord,
          dimension: "identified",
          activity: "identify",
          passed: true,
          accuracy: 0.9,
          attemptNumber: 1,
        });
        applyFluency((f) => recordWordAttempt(f, true));
        handleRetentionReview(payload.focusWord, true);
      } else {
        applyFluency((f) => recordWordAttempt(f, false));
      }
      if (voicePass) {
        applyGatedMastery({
          word: payload.focusWord,
          dimension: "spoken",
          activity: "voice",
          passed: true,
          confidence: voiceConfidence,
          attemptNumber: 1,
        });
      }
      const jp = markV2StageComplete(journeyProgress, "letter_sounds");
      setJourneyProgress(jp);
      saveV2JourneyProgress(childId, jp);
      clearLessonResume(childId);
      setLessonResume(null);
      const fed = feedReadingPet(loadReadingPetState(childId), {
        lesson: true,
        words: 1,
        pronunciation: (payload.coachEvaluations ?? []).some((e) => e.correct),
      });
      saveReadingPetState(childId, fed);
      setReadingPet(fed);
    },
    [
      readingSkills,
      childId,
      applyFluency,
      applyGatedMastery,
      trackSkillIntroduction,
      handleRetentionReview,
      journeyProgress,
    ],
  );

  const persistSession = useCallback(
    (next: DailySessionState) => {
      setDailySession(next);
      saveDailySession(childId, next);
    },
    [childId],
  );

  return (
    <div id="phonics-v2" data-testid="phonics-v2" className="space-y-4">
      {!sessionActive && (
        <PhonicsLearningHub
          model={hubModel}
          planItems={planItems}
          estimatedMinutes={8}
          sessionCompleteToday={sessionCompleteToday}
          onPrimaryAction={() => startAdventure()}
          onSelectLesson={(grapheme) => startAdventure(grapheme)}
          onOpenJourney={() => setJourneyMapOpen((v) => !v)}
          journeyOpen={journeyMapOpen}
        />
      )}

      {sessionActive && dailySession && (
        <DailySessionRunner
          session={dailySession}
          childId={childId}
          childName={childName}
          totalAgeMonths={totalAgeMonths}
          story={aiStory}
          petLabel={petLabel}
          streak={curriculumStreak}
          tomorrowPreview={tomorrowPreview}
          onSessionChange={persistSession}
          onLessonComplete={handleLessonComplete}
          onCoachEvaluation={handleCoachEvaluation}
          onExit={(paused) => {
            persistSession(paused);
            setSessionActive(false);
            setLessonResume(loadLessonResume(childId));
          }}
          onFinished={(completed) => {
            const fed = feedReadingPet(loadReadingPetState(childId), {
              lesson: true,
              words: completed.wordsCompleted.length,
              story: true,
              pronunciation: completed.coachCompleted,
            });
            saveReadingPetState(childId, fed);
            setReadingPet(fed);
            persistSession(completed);
            setSessionActive(false);
            requestAnimationFrame(() => {
              document
                .getElementById("phonics-learning-hub")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }}
        />
      )}

      {journeyMapOpen && !sessionActive && (
        <section aria-label="My Reading Journey" className="space-y-2">
          <h3 className="px-1 font-quicksand text-sm font-bold">My Reading Journey</h3>
          <JourneyMapV2
            curriculumLevel={curriculumLevel}
            masteryScore={curriculumMasteryScore}
            lastTestAt={curriculumLastTestAt}
            streak={curriculumStreak}
            practicedItemCount={practicedItemCount}
            totalAgeMonths={totalAgeMonths}
            journeyProgress={journeyProgress}
            onStageSelect={handleStageSelect}
          />
        </section>
      )}

      {/* Anchor kept for legacy scroll targets */}
      <div id="phonics-reading-lesson" className="sr-only" aria-hidden />

      {/* Keep mission summary wired for parent sync, but off the primary path */}
      <div className="hidden" aria-hidden>
        <DailyMissionPanel
          childId={childId}
          items={safeItems}
          progress={progress}
          mastery={mastery}
          retention={retention}
          curriculumLevel={curriculumLevel}
          letterGroupIndex={letterGroupIndex}
          plan={curriculumPlan}
          missionStoryId={unlockedStories[0]?.id}
          onCompleteCurriculumActivity={onCompleteCurriculumActivity}
          onMissionSummaryChange={onMissionSummaryChange}
          onTaskComplete={() => setPronunciation(loadPronunciationScores(childId))}
          onStartReadingLesson={() => startAdventure()}
        />
      </div>

      {/* Keep scroll anchors available offline without competing for attention */}
      <div id="phonics-v2-karaoke" className="sr-only" aria-hidden />
      <div id="phonics-v2-stories" className="sr-only" aria-hidden />
      <div id="phonics-v2-digraphs" className="sr-only" aria-hidden />

      {!sessionActive && (
        <details className="rounded-2xl border border-border bg-muted/10 px-3 py-2">
          <summary className="min-h-12 cursor-pointer list-none py-2 text-sm font-semibold text-muted-foreground">
            Practice library
          </summary>
          <div className="mt-2 space-y-4 pb-2">
            <ReadingAcademyHub
              childId={childId}
              childName={childName}
              totalAgeMonths={totalAgeMonths}
              letterGroupIndex={groupIndex}
              curriculumLevel={curriculumLevel ?? 1}
              blendingScore={readingSkills.skills.blending?.score ?? 0}
              pronunciationAvg={pronunciation.confidenceAvg}
            />
            <ReadingParentDashboard
              letterGroupIndex={groupIndex}
              skills={readingSkills}
              coachConfusions={coachConfusions}
              storiesCompleted={storiesCompletedCount}
              pronunciationAvg={pronunciation.confidenceAvg}
              className="rounded-3xl border border-white/[0.08] bg-card/90"
            />
      <Card
        data-testid="ai-decodable-story-card"
        className="rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/[0.05] to-transparent"
      >
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-600" />
            <h3 className="font-quicksand text-sm font-bold">
              My level story: {aiStory.title}
            </h3>
            <Badge variant="outline" className="ml-auto text-[9px]">
              Group {groupIndex} only
            </Badge>
          </div>
          <div className="space-y-1">
            {aiStory.lines.map((line) => (
              <p
                key={line.text}
                className="font-quicksand text-lg font-bold tracking-wide text-foreground"
              >
                {line.text}
              </p>
            ))}
          </div>
          {coachFocus.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Extra coach focus today: {coachFocus.map((g) => `/${g}/`).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      {blendableWords.length > 0 && karaokeWord && (
      <div className="scroll-mt-24">
        <Card className="rounded-3xl border border-white/[0.08] bg-card/90">
          <CardContent className="p-5">
            <h3 className="font-quicksand text-base font-bold mb-3">Karaoke Blending</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {blendableWords.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setKaraokeWord(w)}
                  className={`rounded-full px-3 py-1 text-xs font-bold border ${
                    karaokeWord === w
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            <KaraokeBlendRound
              word={karaokeWord}
              onComplete={(result) => {
                recordPlay(`v2-karaoke-${karaokeWord}`);
                trackSkillIntroduction(karaokeWord);
                const attempt = (karaokeAttemptsRef.current[karaokeWord] ?? 0) + 1;
                karaokeAttemptsRef.current[karaokeWord] = attempt;
                applyGatedMastery({
                  word: karaokeWord,
                  dimension: "blended",
                  activity: "karaoke",
                  passed: result.completedFullBlend,
                  accuracy: result.accuracy,
                  attemptNumber: attempt,
                });
                if (
                  result.completedFullBlend &&
                  result.accuracy >= INTEGRITY_LIMITS.KARAOKE_MIN_ACCURACY
                ) {
                  applyFluency((prev) => recordWordAttempt(prev, true));
                  handleRetentionReview(karaokeWord, true);
                }
                const jp = markV2StageComplete(journeyProgress, "cvc_decoding");
                setJourneyProgress(jp);
                saveV2JourneyProgress(childId, jp);
              }}
            />
            <div className="mt-4 border-t border-border pt-4">
              <BlendListenCheck
                key={karaokeWord}
                word={karaokeWord}
                options={blendableWords}
                onOutcome={({ passed, confidence }) => {
                  const attempt = (voiceAttemptsRef.current[karaokeWord] ?? 0) + 1;
                  voiceAttemptsRef.current[karaokeWord] = attempt;
                  handleRetentionReview(karaokeWord, passed);
                  applyGatedMastery({
                    word: karaokeWord,
                    dimension: "identified",
                    activity: "identify",
                    passed,
                    confidence,
                    attemptNumber: attempt,
                  });
                  if (passed) trackSkillIntroduction(karaokeWord);
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      <WordFamilyExplorer
        curriculumLevel={curriculumLevel ?? 1}
        familyProgress={familyProgress}
        onWordPractice={(familyId, word, mastered) => {
          handleFamilyPractice(familyId, word, mastered);
          trackSkillIntroduction(word);
          applyGatedMastery({
            word,
            dimension: mastered ? "identified" : "heard",
            activity: "family_practice",
            passed: !!mastered,
          });
          applyFluency((prev) => recordWordAttempt(prev, !!mastered));
          handleRetentionReview(word, !!mastered);
        }}
      />

      <PhonicsGamesHub
        practiceWords={practiceWords}
        onGameComplete={() => recordPlay(`v2-game-${karaokeWord || practiceWords[0]}`)}
      />

      <div className="scroll-mt-24">
        <Card className="rounded-3xl border border-white/[0.08] bg-card/90">
          <CardContent className="p-5">
            <h3 className="font-quicksand text-base font-bold mb-1">Decodable Stories</h3>
            <p className="text-[10px] text-muted-foreground mb-3">
              {unlockedStories.length} unlocked · {getStoryCount()} total
            </p>
            <div
              className={`flex flex-wrap gap-2 mb-3 ${
                showAllStories ? "max-h-60 overflow-y-auto pr-1" : ""
              }`}
            >
              {(showAllStories ? unlockedStories : unlockedStories.slice(0, 8)).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStoryId(s.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold border flex items-center gap-1 ${
                    storyId === s.id
                      ? "bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {s.emoji} {s.title}
                </button>
              ))}
            </div>
            {unlockedStories.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllStories((v) => !v)}
                className="mb-4 rounded-full border border-border px-3 py-1 text-[10px] font-bold text-muted-foreground hover:bg-muted"
              >
                {showAllStories
                  ? "Show less"
                  : `Show all ${unlockedStories.length} stories`}
              </button>
            )}
            {storyId && (
              <DecodableStoryReader
                storyId={storyId}
                onComplete={() => {
                  recordPlay(`v2-story-${storyId}`);
                  applyFluency((prev) => recordStoryComplete(prev));
                  if (storyId) {
                    const stories = recordStoryCompleteLocal(loadStoryProgressLocal(childId), storyId);
                    persistPhonicsV3Stories(childId, stories);
                  }
                  const jp = markV2StageComplete(journeyProgress, "fluency_stories");
                  setJourneyProgress(jp);
                  saveV2JourneyProgress(childId, jp);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="scroll-mt-24">
        <DigraphPathwayPanel
          avgMasteryScore={masteryAvg}
          curriculumLevel={curriculumLevel ?? 1}
          childId={childId}
          childName={childName}
          totalAgeMonths={totalAgeMonths}
          onWordPractice={(word, digraphId) => {
          setKaraokeWord(word);
          trackSkillIntroduction(word);
          const ret = introduceSkill(loadRetentionState(childId), "phoneme", digraphId);
          const nextRet = introduceSkill(ret, "word", word);
          setRetention(nextRet);
          persistPhonicsV3Retention(childId, nextRet);
          applyGatedMastery({
            word,
            dimension: "heard",
            activity: "digraph",
            passed: true,
            accuracy: 1,
          });
          recordPlay(`v3-digraph-${word}`);
        }}
        onAssessmentOutcome={(word, passed, confidence) => {
          handleRetentionReview(word, passed);
          applyGatedMastery({
            word,
            dimension: "spoken",
            activity: "voice",
            passed,
            confidence,
          });
        }}
          onStoryComplete={(id) => {
            recordPlay(`v3-digraph-story-${id}`);
            applyFluency((prev) => recordStoryComplete(prev));
            const stories = recordStoryCompleteLocal(loadStoryProgressLocal(childId), id);
            persistPhonicsV3Stories(childId, stories);
          }}
        />
      </div>

      <ParentInsightsV3Card
        items={safeItems}
        progress={progress}
        familyProgress={familyProgress}
        pronunciation={pronunciation}
        mastery={mastery}
        fluency={fluency}
        retention={retention}
        curriculumLevel={curriculumLevel ?? 1}
      />
          </div>
        </details>
      )}
    </div>
  );
}
