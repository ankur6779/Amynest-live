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
import type { PhonicsDailyPlan } from "@workspace/phonics-curriculum";
import type { MissionSummary } from "./DailyMissionPanel";
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
  const karaokeAttemptsRef = useRef<Record<string, number>>({});
  const voiceAttemptsRef = useRef<Record<string, number>>({});

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
  }, [childId]);

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

  const handleStageSelect = useCallback(
    (stage: PhonicsV2Stage, status: JourneyStageStatus) => {
      trackJourneyStageSelect(stage.id, status, childId);
      const el = document.getElementById(stage.scrollTarget);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [childId],
  );

  const masteryAvg = avgMasteryScore(mastery);
  const storyCatalogLevel = curriculumLevel ?? 1;
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
  const storyCount = useMemo(() => getStoryCount(), []);

  return (
    <div id="phonics-v2" data-testid="phonics-v2" className="space-y-4">
      <Card className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-quicksand text-base font-bold">Early Reading Journey</h2>
            <p className="text-[11px] text-muted-foreground">
              True mastery tracking · {storyCount}+ stories · adaptive missions.
            </p>
            <Badge variant="secondary" className="mt-1 text-[9px]">
              Mastery avg {masteryAvg}%
            </Badge>
          </div>
        </CardContent>
      </Card>

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
      />

      {blendableWords.length > 0 && karaokeWord && (
      <div id="phonics-v2-karaoke" className="scroll-mt-24">
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

      <div id="phonics-v2-stories" className="scroll-mt-24">
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

      <div id="phonics-v2-digraphs" className="scroll-mt-24">
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
  );
}
