import { parseApiJson } from "@/lib/safe-json-response";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAbacusTranslation } from "@/hooks/use-abacus-translation";
import { abacusLevelLabelDefault, isAbacusLevelSlug } from "@workspace/abacus/i18n";
import { Volume2, VolumeX, Sparkles, Lock, RotateCw, Trophy, Zap, Medal, Home } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  abacusValue,
  applyMasteryAttempt,
  applyReviewResult,
  bossForLevel,
  buildLearningPath,
  buildLessonScript,
  buildLivingTutorCoachFragment,
  buildParentInsightsV4,
  currentWeeklyEvent,
  deriveAdaptiveProfile,
  detectEmotion,
  dnaEaseFactor,
  emptyAbacus,
  emotionCue,
  evaluateCollectionUnlocks,
  foldAttempt,
  generateAdaptivePractice,
  generateChallenge,
  generateProblem,
  getMicroGame,
  grantGems,
  grantStars,
  highestUnlockedLevel,
  isLevelUnlocked,
  isWildGuess,
  LEVELS,
  livingCoachLine,
  markMissionStep,
  masterySummary,
  microGamesForMode,
  minAgeForLevel,
  missionProgress,
  nextReviewSkill,
  recommendedLevelForAge,
  resolveAgeLevelAccess,
  rng,
  scoreAnswer,
  setLowerCount,
  skillForLevelMode,
  summarizeSession,
  toggleUpper,
  unlockedWorlds,
  type AbacusProblem,
  type AbacusSkillId,
  type AbacusState,
  type AchievementV2Id,
  type BossDef,
  type CollectionItemId,
  type LevelId,
  type MicroGameId,
} from "@workspace/abacus";
import { AbacusTutorKeyboardPanel } from "@/components/abacus/abacus-tutor-keyboard-panel";
import { MentalMode as MentalModeV2 } from "@/components/abacus/abacus-mental-mode";
import {
  AbacusLearnToProUpsell,
  AbacusPremiumValuePanel,
} from "@/components/abacus/abacus-premium-upsell";
import { AbacusReminderBanner } from "@/components/abacus/abacus-reminder-banner";
import { AbacusWarmupCard, AbacusWarmupSession } from "@/components/abacus/abacus-warmup";
import { AbacusDailyAdventureCard } from "@/components/abacus/abacus-daily-adventure";
import { AbacusCollectionShelf } from "@/components/abacus/abacus-collection-shelf";
import {
  AbacusMicroGameBanner,
  AbacusMicroGamePicker,
} from "@/components/abacus/abacus-micro-game-chrome";
import { AbacusCoachBubble } from "@/components/abacus/abacus-finger-hint";
import { AbacusJourneyMap } from "@/components/abacus/abacus-journey-map";
import { AbacusStoryWorldsStrip } from "@/components/abacus/abacus-story-worlds";
import { AbacusBossIntro, AbacusBossVictory } from "@/components/abacus/abacus-boss-chrome";
import { AbacusFamilyPanel } from "@/components/abacus/abacus-family-panel";
import { AbacusCertificateCard } from "@/components/abacus/abacus-certificate-card";
import { AbacusAchievementsV2 } from "@/components/abacus/abacus-achievements-v2";
import { AbacusCompetitionBanner } from "@/components/abacus/abacus-competition-banner";
import { AbacusVoicePractice } from "@/components/abacus/abacus-voice-practice";
import { abacusSfx as sfx } from "@/components/abacus/abacus-sfx";
import {
  bumpEmotionRotate,
  bumpReviewsCompleted,
  bumpStreak,
  DAILY_PRACTICE_GOAL,
  daysSinceLastActive,
  enqueueOffline,
  hasCompletedFirstLearn,
  markBossDefeated,
  markFamilyChallengeDone,
  markFirstLearnComplete,
  markLastActive,
  markWeekendMissionDone,
  readAchievementsV2,
  readAdaptiveStats,
  readAgeOverrides,
  readBossesDefeated,
  readCachedProgress,
  readCollection,
  readDailyPractice,
  readFamilyProgress,
  readLearningDna,
  readMastery,
  readMission,
  readOfflineQueue,
  readPreferredMicroGame,
  readPreviousLearningDna,
  readReviewSchedule,
  readReviewsCompleted,
  readStreak,
  readTutorAsksV4,
  readWarmup,
  readWeekendMissionDone,
  readWeeklySnap,
  refreshLearningDna,
  syncAchievementsV2,
  todayDateKey,
  weekKeyUtc,
  writeAdaptiveStats,
  writeAgeOverride,
  writeCachedProgress,
  writeCollection,
  writeDailyPractice,
  writeMastery,
  writeMission,
  writeOfflineQueue,
  writePreferredMicroGame,
  writeReviewSchedule,
  writeWarmup,
  writeWeeklySnap,
  type DailyPracticeShape,
} from "@/components/abacus/abacus-storage";
import {
  trackAbacusAchievementUnlocked,
  trackAbacusAgeOverride,
  trackAbacusBossCompleted,
  trackAbacusBossStarted,
  trackAbacusChallengeCompleted,
  trackAbacusCollectionUnlock,
  trackAbacusCompetitionView,
  trackAbacusDnaUpdated,
  trackAbacusEmotionCue,
  trackAbacusFamilyChallenge,
  trackAbacusGamePlayed,
  trackAbacusHomeOpen,
  trackAbacusLessonCompleted,
  trackAbacusLevelUnlocked,
  trackAbacusMentalCompleted,
  trackAbacusMissionCompleted,
  trackAbacusMissionStarted,
  trackAbacusModeCompleted,
  trackAbacusModeStarted,
  trackAbacusPracticeCompleted,
  trackAbacusPremiumBlocked,
  trackAbacusPremiumClicked,
  trackAbacusQuitMidSession,
  trackAbacusReviewScheduled,
  trackAbacusStoryWorldView,
  trackAbacusVoiceAnswer,
  trackAbacusWarmupCompleted,
  trackAbacusWarmupStarted,
  trackAbacusThinkingTime,
} from "@/lib/abacus-analytics";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  scheduleLearningZoneAudioPrewarm,
  buildLearningZoneAudioStateKey,
} from "@/lib/learning-zone-audio-prewarm";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { useToast } from "@/hooks/use-toast";
import { catalogPlaybackSpeakOptions } from "@/lib/unified-catalog-playback";
import {
  setAudioTraceModule,
  traceBrokenModulePreflight,
} from "@/lib/audio-root-cause-trace";
import { audioManager } from "@/lib/audio-manager";
import { primeStaticAudioInUserGesture } from "@/lib/static-audio";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import {
  AbacusHomeDashboard,
  AbacusParentPanel,
  AbacusViewToggle,
} from "@/components/abacus-dashboard";
import {
  PremiumActionGate,
  type HubModuleActionGateState,
} from "@/components/hub-module-page-shell";
import { openSubscriptionGate } from "@/lib/subscription-gate";

function useAbacusAmyVoice() {
  const amy = useAmyVoice();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const playbackRef = useRef(false);

  useEffect(() => {
    if (!amy.error) return;
    toast({
      title: "Voice unavailable",
      description:
        amy.error === "playback_blocked_tap_again"
          ? "Tap Amy's voice again to start."
          : amy.error.replace(/_/g, " "),
      variant: "destructive",
    });
  }, [amy.error, toast]);

  const prime = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      audioManager.unlockFromUserGesture();
      recordTtsUserGesture();
      primeStaticAudioInUserGesture(trimmed, "default");
      amy.primeSpeakGesture(trimmed, catalogPlaybackSpeakOptions(trimmed));
    },
    [amy],
  );

  const stop = useCallback(() => {
    amy.pause();
    playbackRef.current = false;
    setPending(false);
  }, [amy]);

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const activeKey = trimmed.toLowerCase();
      const isThisClip =
        playbackRef.current ||
        pending ||
        (amy.activePhrase?.toLowerCase() === activeKey && (amy.speaking || amy.loading));

      if (isThisClip || amy.speaking || amy.loading) {
        stop();
        return;
      }

      playbackRef.current = true;
      setPending(true);
      audioManager.unlockFromUserGesture();
      recordTtsUserGesture();

      const speakOpts = catalogPlaybackSpeakOptions(trimmed);
      setAudioTraceModule("Abacus");
      traceBrokenModulePreflight("Abacus", {
        resolvedText: trimmed,
        staticCatalogTexts: speakOpts.staticCatalogTexts,
        catalogPlayback: speakOpts.catalogPlayback,
      });

      try {
        const res = await amy.speak(trimmed, speakOpts);
        if (!res?.success) {
          toast({
            title: "Voice unavailable",
            description: res?.error?.replace(/_/g, " ") ?? "Could not play Amy's voice.",
            variant: "destructive",
          });
        }
      } finally {
        playbackRef.current = false;
        setPending(false);
        setAudioTraceModule(null);
      }
    },
    [amy, pending, stop, toast],
  );

  const isActiveFor = useCallback(
    (text: string) => {
      const key = text.trim().toLowerCase();
      if (!key) return pending || amy.speaking || amy.loading;
      return (
        pending ||
        (amy.activePhrase?.toLowerCase() === key && (amy.speaking || amy.loading))
      );
    },
    [amy.activePhrase, amy.loading, amy.speaking, pending],
  );

  return {
    ...amy,
    speak,
    prime,
    stop,
    pending,
    isActiveFor,
    isActive: pending || amy.speaking || amy.loading,
  };
}

type ZoneScreen = "home" | "play" | "warmup";
type ViewMode = "child" | "parent";

function microGamesForModeFallback(mode: "practice" | "mental" | "challenge"): MicroGameId {
  return microGamesForMode(mode)[0]?.id ?? "classic";
}

type BoardFeedback = "none" | "correct" | "wrong";

const BEAD_ACTIVE =
  "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-[0_0_14px_rgba(245,158,11,0.65)] ring-2 ring-amber-300/80";
const BEAD_IDLE =
  "bg-gradient-to-br from-stone-300 via-stone-200 to-stone-400 ring-2 ring-stone-500/50 shadow-md " +
  "dark:from-amber-50 dark:via-amber-200 dark:to-amber-400 dark:ring-amber-300/70 " +
  "dark:shadow-[0_0_10px_rgba(251,191,36,0.45)]";

// ─── Confetti burst (lightweight, no extra deps) ───────────────────────
function ConfettiBurst({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 16 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((_, i) => {
        const x = (Math.random() - 0.5) * 280;
        const y = -120 - Math.random() * 80;
        const rot = (Math.random() - 0.5) * 720;
        const colors = ["hsl(var(--brand-amber-500))", "hsl(var(--brand-pink-500))", "hsl(var(--brand-violet-500))", "hsl(var(--brand-emerald-500))", "hsl(var(--brand-rose-500))"];
        const color = colors[i % colors.length];
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
            animate={{ opacity: [0, 1, 1, 0], x, y, rotate: rot }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 8,
              height: 14,
              background: color,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}

type Mode = "learn" | "practice" | "challenge" | "mental" | "tutor";

interface Props {
  childId: number;
  childName: string;
  ageYears: number;
  gate?: HubModuleActionGateState;
}

interface ProgressShape {
  currentLevel: LevelId;
  lastMode: Mode;
  completedLevels: LevelId[];
  highestUnlocked: LevelId;
  bestScores: Record<string, { points: number; accuracyPct: number; completedAt: string }>;
  totalCorrect: number;
  totalAttempts: number;
  totalPoints: number;
}

interface LeaderboardEntry {
  rank: number;
  childId: number;
  name: string;
  points: number;
  isMe: boolean;
}
interface LeaderboardShape {
  weekStart: string;
  top: LeaderboardEntry[];
  me: { rank: number; points: number; total: number };
}

// ─── Bead UI ────────────────────────────────────────────────────────────

function BeadColumn({
  rod,
  rodIndex,
  onToggleUpper,
  onSetLower,
  highlight,
  disabled,
  learnMode,
}: {
  rod: { upper: 0 | 1; lower: 0 | 1 | 2 | 3 | 4 };
  rodIndex: number;
  onToggleUpper: (i: number) => void;
  onSetLower: (i: number, n: 0 | 1 | 2 | 3 | 4) => void;
  highlight?: boolean;
  disabled?: boolean;
  learnMode?: boolean;
}) {
  const spring = learnMode
    ? { type: "spring" as const, stiffness: 180, damping: 20 }
    : { type: "spring" as const, stiffness: 380, damping: 24 };
  const lowerTrackRef = useRef<HTMLDivElement>(null);
  const upperStartY = useRef(0);

  const setLowerFromPointer = (clientY: number) => {
    const track = lowerTrackRef.current;
    if (!track || disabled) return;
    const rect = track.getBoundingClientRect();
    const rel = 1 - (clientY - rect.top) / rect.height;
    const count = Math.min(4, Math.max(0, Math.round(rel * 4))) as 0 | 1 | 2 | 3 | 4;
    if (count !== rod.lower) {
      onSetLower(rodIndex, count);
      sfx.bead();
    }
  };

  const handleLowerPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    const track = lowerTrackRef.current;
    if (!track) return;
    track.setPointerCapture(e.pointerId);
    setLowerFromPointer(e.clientY);
    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      setLowerFromPointer(ev.clientY);
    };
    const onUp = () => {
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", onUp);
      track.removeEventListener("pointercancel", onUp);
    };
    const passiveOpts = { passive: false } as const;
    track.addEventListener("pointermove", onMove, passiveOpts);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
  };

  const handleUpperPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    upperStartY.current = e.clientY;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const delta = ev.clientY - upperStartY.current;
      if (delta > 18 && rod.upper === 0) {
        onToggleUpper(rodIndex);
        sfx.bead();
        upperStartY.current = ev.clientY;
      } else if (delta < -18 && rod.upper === 1) {
        onToggleUpper(rodIndex);
        sfx.bead();
        upperStartY.current = ev.clientY;
      }
    };
    const onUp = () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };
    const passiveOpts = { passive: false } as const;
    target.addEventListener("pointermove", onMove, passiveOpts);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1 px-1.5 sm:px-2 py-3 rounded-xl touch-none select-none",
        "bg-gradient-to-b from-amber-100/80 to-amber-200/40 border border-amber-800/20",
        "dark:from-stone-800 dark:to-amber-950/80 dark:border-amber-500/35",
        highlight && "border-teal-400/70 shadow-[0_0_0_3px_rgba(45,212,191,0.25)] animate-pulse",
      )}
      data-testid={`abacus-rod-${rodIndex}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onToggleUpper(rodIndex);
          sfx.bead();
        }}
        onPointerDown={handleUpperPointerDown}
        aria-label={`rod ${rodIndex + 1} upper bead`}
        data-testid={`abacus-upper-${rodIndex}`}
        className="relative h-14 w-full flex items-start justify-center touch-none select-none"
      >
        <motion.span
          animate={{ y: rod.upper === 1 ? 22 : 0 }}
          transition={spring}
          className={cn(
            "block h-8 w-14 rounded-full",
            rod.upper === 1 ? BEAD_ACTIVE : BEAD_IDLE,
          )}
        />
      </button>

      <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-amber-900 via-stone-700 to-amber-900 dark:from-amber-700 dark:via-amber-900 dark:to-amber-700 shadow-inner" />

      <div
        ref={lowerTrackRef}
        onPointerDown={handleLowerPointerDown}
        className="relative h-32 w-full flex flex-col items-center justify-end gap-0.5 pb-1 touch-none select-none"
      >
        {[0, 1, 2, 3].map((i) => {
          const beadIndexFromBottom = 3 - i;
          const isUp = rod.lower > beadIndexFromBottom;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                const target = (isUp ? beadIndexFromBottom : beadIndexFromBottom + 1) as 0 | 1 | 2 | 3 | 4;
                onSetLower(rodIndex, target);
                sfx.bead();
              }}
              aria-label={`rod ${rodIndex + 1} lower bead ${i + 1}`}
              data-testid={`abacus-lower-${rodIndex}-${i}`}
              className="block h-7 w-14 touch-none select-none"
            >
              <motion.span
                animate={{ y: isUp ? -10 : 0 }}
                transition={spring}
                className={cn(
                  "block h-7 w-14 rounded-full",
                  isUp ? BEAD_ACTIVE : BEAD_IDLE,
                )}
              />
            </button>
          );
        })}
      </div>

      <span className="text-[10px] font-mono font-bold text-amber-900/70 dark:text-amber-200/80">
        {rod.upper * 5 + rod.lower}
      </span>
    </div>
  );
}

function AbacusBoard({
  state,
  onChange,
  highlightRod,
  disabled,
  feedback = "none",
  learnMode,
  valueSize = "md",
}: {
  state: AbacusState;
  onChange: (next: AbacusState) => void;
  highlightRod?: number;
  disabled?: boolean;
  feedback?: BoardFeedback;
  learnMode?: boolean;
  valueSize?: "md" | "lg";
}) {
  const value = abacusValue(state);
  return (
    <motion.div
      animate={
        feedback === "wrong"
          ? { x: [0, -6, 6, -4, 4, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.45 }}
      className={cn(
        "rounded-3xl p-3 sm:p-4 border-2 shadow-inner touch-none select-none overscroll-none",
        "bg-gradient-to-b from-amber-100/80 via-amber-50/50 to-amber-200/40",
        "dark:from-stone-800 dark:via-stone-900 dark:to-amber-950/70",
        feedback === "correct" && "border-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)]",
        feedback === "wrong" && "border-rose-400 shadow-[0_0_0_3px_rgba(251,113,133,0.25)]",
        feedback === "none" && "border-amber-800/25 dark:border-amber-500/45",
      )}
    >
      <div className="flex justify-center gap-1.5 sm:gap-2">
        {state.map((rod, i) => (
          <BeadColumn
            key={i}
            rod={rod}
            rodIndex={i}
            highlight={highlightRod === i}
            disabled={disabled}
            learnMode={learnMode}
            onToggleUpper={(idx) => onChange(toggleUpper(state, idx))}
            onSetLower={(idx, n) => onChange(setLowerCount(state, idx, n))}
          />
        ))}
      </div>
      <p
        className={cn(
          "mt-3 text-center font-black text-foreground font-quicksand",
          valueSize === "lg" ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
        )}
        data-testid="abacus-value"
      >
        = {value}
      </p>
    </motion.div>
  );
}

function ProgressHeader({
  childName,
  progress,
  completedCount,
  totalLevels,
  dailyCorrect,
  streakDays,
  t,
}: {
  childName: string;
  progress: ProgressShape;
  completedCount: number;
  totalLevels: number;
  dailyCorrect: number;
  streakDays: number;
  t: ReturnType<typeof useAbacusTranslation>["t"];
}) {
  const pct = totalLevels === 0 ? 0 : Math.round((completedCount / totalLevels) * 100);
  return (
    <div
      className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-background px-3 py-3 space-y-2"
      data-testid="abacus-progress-header"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            🧮 {childName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {t("abacus.practice_today", { correct: dailyCorrect, goal: DAILY_PRACTICE_GOAL })}
            {streakDays > 0 && (
              <span className="ml-1.5 text-orange-600 dark:text-orange-400">🔥 {streakDays}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-foreground">
            <Medal className="h-3.5 w-3.5 text-amber-600" />
            {progress.totalPoints} {t("abacus.points")}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
          <span>{t("abacus.level_progress")}</span>
          <span>
            {completedCount} / {totalLevels} {t("abacus.levels")}
          </span>
        </div>
        <Progress value={pct} className="h-2 bg-muted/80" />
      </div>
    </div>
  );
}

function ChallengeQuestionDots({
  total,
  currentIdx,
  results,
}: {
  total: number;
  currentIdx: number;
  results: { correct: boolean }[];
}) {
  return (
    <div className="flex items-center justify-center gap-1.5" data-testid="abacus-challenge-dots">
      {Array.from({ length: total }).map((_, i) => {
        const done = results[i];
        const isCurrent = i === currentIdx && done === undefined;
        return (
          <span key={i} className="text-base leading-none" aria-hidden>
            {done?.correct ? "⭐" : done ? "💔" : isCurrent ? "👉" : "○"}
          </span>
        );
      })}
    </div>
  );
}

// ─── Sub-modes ──────────────────────────────────────────────────────────

function LearnMode({
  level,
  onSpeak,
  onStop,
  onPrime,
  speaking,
  onLessonComplete,
}: {
  level: LevelId;
  onSpeak: (text: string) => void;
  onStop: () => void;
  onPrime: (text: string) => void;
  speaking: boolean;
  onLessonComplete?: () => void;
}) {
  const { t } = useAbacusTranslation();
  const authFetch = useAuthFetch();
  const script = useMemo(() => buildLessonScript(level), [level]);
  const [step, setStep] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    setStep(0);
    completedRef.current = false;
  }, [level]);

  const cur = script.steps[step];
  const stepValue = abacusValue(cur.state);
  const stepPct = script.steps.length <= 1 ? 100 : Math.round(((step + 1) / script.steps.length) * 100);
  const [boardState, setBoardState] = useState(cur.state);
  const isLastStep = step >= script.steps.length - 1;

  useEffect(() => {
    const texts = script.steps.map((s) => s.text);
    scheduleLearningZoneAudioPrewarm(authFetch, {
      module: "abacus",
      texts,
      sequenceTexts: texts,
      ageGroup: level,
      currentIndex: step,
      stateKey: buildLearningZoneAudioStateKey({
        module: "abacus",
        ageGroup: level,
        revision: script.title,
      }),
    });
  }, [authFetch, level, script, step]);

  useEffect(() => {
    setBoardState(script.steps[step]?.state ?? emptyAbacus(1));
  }, [step, level, script.steps]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold text-sm">{script.title}</h4>
        <span className="text-xs text-muted-foreground shrink-0">
          {t("abacus.step")} {step + 1} / {script.steps.length}
        </span>
      </div>
      <Progress value={stepPct} className="h-1.5" />
      <p className="text-[11px] text-center text-teal-700 dark:text-teal-300 font-medium">
        {t("abacus.learn_try_beads")}
      </p>
      <div className="sm:hidden flex justify-center">
        <div className="rounded-2xl bg-gradient-to-br from-teal-500/15 to-cyan-500/10 border border-teal-500/25 px-8 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold text-center">Value</p>
          <p className="text-5xl font-black text-foreground font-quicksand text-center leading-none">{stepValue}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 items-center">
        <div className="hidden sm:flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 px-6 py-4 min-w-[5.5rem]">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Value</span>
          <motion.span
            key={`learn-val-${step}-${stepValue}`}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="text-5xl font-black text-foreground font-quicksand leading-none"
          >
            {stepValue}
          </motion.span>
        </div>
        <AbacusBoard
          state={boardState}
          onChange={(s) => { sfx.bead(); setBoardState(s); }}
          highlightRod={cur.highlightRod}
          learnMode
          valueSize="md"
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="text-sm leading-relaxed text-foreground bg-gradient-to-br from-muted to-muted/60 rounded-xl p-3 border border-border/60"
        >
          {cur.text}
        </motion.p>
      </AnimatePresence>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onPointerDown={() => onPrime(cur.text)}
          onClick={() => (speaking ? onStop() : onSpeak(cur.text))}
          className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 text-white text-xs font-semibold px-3 py-2"
          data-testid="abacus-learn-tts"
        >
          {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          {speaking ? t("abacus.stop_voice") : t("abacus.amy_voice")}
        </button>
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded-lg bg-muted text-foreground text-xs font-semibold px-3 py-2 disabled:opacity-40"
        >
          ← {t("abacus.back")}
        </button>
        <button
          type="button"
          disabled={isLastStep && completedRef.current}
          onClick={() => {
            if (isLastStep) {
              if (!completedRef.current) {
                completedRef.current = true;
                onLessonComplete?.();
              }
              return;
            }
            setStep((s) => Math.min(script.steps.length - 1, s + 1));
          }}
          className="rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 disabled:opacity-40 text-white text-xs font-semibold px-3 py-2"
          data-testid="abacus-learn-next"
        >
          {isLastStep ? t("abacus.finish_lesson", "Finish lesson") : `${t("abacus.next")} →`}
        </button>
      </div>
    </div>
  );
}

function PracticeMode({
  level,
  onAttempt,
  childView,
  easeFactor,
  reviewSkill,
  enableVoice,
  onVoiceResult,
}: {
  level: LevelId;
  onAttempt: (correct: boolean, meta?: { elapsedMs?: number; answer?: number; expected?: number; prompt?: string }) => void;
  childView?: boolean;
  easeFactor?: number;
  reviewSkill?: AbacusSkillId | null;
  enableVoice?: boolean;
  onVoiceResult?: (meta: {
    heard: string;
    correct: boolean;
    confidence: "high" | "medium" | "low";
    responseMs: number;
  }) => void;
}) {
  const { t, i18n } = useAbacusTranslation();
  const sessionSalt = useRef(Date.now());
  const startedAt = useRef(Date.now());
  const [problem, setProblem] = useState<AbacusProblem>(() =>
    generateAdaptivePractice({
      level,
      sessionSalt: Date.now(),
      reviewSkill: reviewSkill ?? null,
      generateProblem,
      rng,
    }),
  );
  const [board, setBoard] = useState<AbacusState>(() => problem.initialState ?? emptyAbacus(problem.rods));
  const [feedback, setFeedback] = useState<BoardFeedback>("none");
  const [showHint, setShowHint] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionAttempts, setSessionAttempts] = useState(0);

  const next = useCallback(() => {
    sessionSalt.current += 997;
    startedAt.current = Date.now();
    const p = generateAdaptivePractice({
      level,
      sessionSalt: sessionSalt.current,
      reviewSkill: reviewSkill ?? null,
      generateProblem: (lvl, rand, opts) =>
        generateProblem(lvl, rand, { easeFactor: easeFactor ?? opts?.easeFactor }),
      rng,
    });
    setProblem(p);
    setBoard(p.initialState ?? emptyAbacus(p.rods));
    setFeedback("none");
    setShowHint(false);
  }, [easeFactor, level, reviewSkill]);

  useEffect(() => {
    next();
    setSessionCorrect(0);
    setSessionAttempts(0);
  }, [level, next]);

  const check = () => {
    const v = abacusValue(board);
    const ok = v === problem.answer;
    setFeedback(ok ? "correct" : "wrong");
    setSessionAttempts((n) => n + 1);
    if (ok) {
      setSessionCorrect((n) => n + 1);
      sfx.correct();
    } else {
      sfx.wrong();
    }
    onAttempt(ok, {
      elapsedMs: Date.now() - startedAt.current,
      answer: v,
      expected: problem.answer,
      prompt: problem.prompt,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="leading-none">
            {i < sessionCorrect ? "⭐" : i < sessionAttempts ? "💔" : "○"}
          </span>
        ))}
        <span className="ml-1 font-semibold">
          {sessionCorrect}/{sessionAttempts || "—"}
        </span>
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/15 p-4 text-center">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">{t("abacus.show_on_abacus")}</p>
        <p className="text-4xl sm:text-5xl font-black text-foreground font-quicksand" data-testid="abacus-problem">
          {problem.prompt}
        </p>
      </div>
      <div className="relative">
        <AbacusBoard
          state={board}
          onChange={(s) => { sfx.bead(); setBoard(s); setFeedback("none"); }}
          feedback={feedback}
        />
        <ConfettiBurst show={feedback === "correct"} />
      </div>
      <p className="text-[10px] text-center text-muted-foreground">{t("abacus.drag_hint")}</p>
      <AnimatePresence>
        {feedback !== "none" && (
          <motion.p
            key={feedback}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "text-center font-bold text-sm rounded-xl p-2.5 border",
              feedback === "correct"
                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-400/40"
                : "bg-rose-500/10 text-rose-800 dark:text-rose-200 border-rose-400/40",
            )}
            data-testid={`abacus-practice-feedback-${feedback}`}
          >
            {feedback === "correct" ? `🎉 ${t("abacus.correct")}` : `❌ ${t("abacus.try_again")} — ${t("abacus.answer_was", { n: problem.answer })}`}
          </motion.p>
        )}
      </AnimatePresence>
      {enableVoice && (
        <AbacusVoicePractice
          expectedAnswer={problem.answer}
          language={i18n.language}
          disabled={feedback === "correct"}
          onResult={(meta) => {
            onVoiceResult?.(meta);
            setFeedback(meta.correct ? "correct" : "wrong");
            setSessionAttempts((n) => n + 1);
            if (meta.correct) {
              setSessionCorrect((n) => n + 1);
              sfx.correct();
            } else {
              sfx.wrong();
            }
            onAttempt(meta.correct, {
              elapsedMs: meta.responseMs,
              answer: meta.correct ? problem.answer : NaN,
              expected: problem.answer,
              prompt: problem.prompt,
            });
          }}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={check}
          className={cn(
            "rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 text-white font-semibold",
            childView ? "text-sm py-3 px-4 min-h-[44px]" : "text-xs py-2 px-3",
          )}
          data-testid="abacus-practice-check"
        >
          ✓ {t("abacus.check")}
        </button>
        <button
          type="button"
          onClick={next}
          className="rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 text-white text-xs font-semibold px-3 py-2 inline-flex items-center gap-1"
          data-testid="abacus-practice-next"
        >
          <RotateCw className="h-3.5 w-3.5" /> {t("abacus.new_problem")}
        </button>
        <button
          type="button"
          onClick={() => setShowHint(true)}
          className="rounded-lg bg-muted text-foreground text-xs font-semibold px-3 py-2"
        >
          💡 {t("abacus.hint")}
        </button>
        <button
          type="button"
          onClick={() => {
            setBoard(problem.initialState ?? emptyAbacus(problem.rods));
            setFeedback("none");
          }}
          className="rounded-lg bg-muted text-xs font-semibold px-3 py-2"
        >
          ↺ {t("abacus.reset")}
        </button>
      </div>
      {showHint && (
        <p className="text-xs italic text-muted-foreground bg-muted rounded-lg p-2">
          💡 {problem.hint}
        </p>
      )}
    </div>
  );
}

function ChallengeMode({
  level,
  childId,
  onComplete,
}: {
  level: LevelId;
  childId: number;
  onComplete: (
    accuracyPct: number,
    points: number,
    meta?: {
      sessionToken?: string;
      seed?: number;
      answers?: number[];
      elapsedMs?: number[];
    },
  ) => void;
}) {
  const { t } = useAbacusTranslation();
  const authFetch = useAuthFetch();
  const lvlDef = useMemo(() => LEVELS.find((l) => l.id === level)!, [level]);
  const [seed, setSeed] = useState(() => Date.now());
  const [sessionToken, setSessionToken] = useState<string | undefined>();
  const problems = useMemo(() => generateChallenge(level, seed), [level, seed]);
  const [idx, setIdx] = useState(0);
  const [board, setBoard] = useState<AbacusState>(() => problems[0].initialState ?? emptyAbacus(problems[0].rods));
  const [results, setResults] = useState<{ correct: boolean; points: number; answer: number; elapsedMs: number }[]>([]);
  const [tLeft, setTLeft] = useState(lvlDef.challengeSecondsPerQ);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    void authFetch("/api/abacus/challenge/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, level }),
    })
      .then(async (r) => {
        if (!r.ok) return null;
        return parseApiJson<{ sessionToken?: string; seed?: number }>(r);
      })
      .then((data) => {
        if (cancelled || !data?.sessionToken || typeof data.seed !== "number") return;
        setSessionToken(data.sessionToken);
        setSeed(data.seed);
        setIdx(0);
        setResults([]);
        setTLeft(lvlDef.challengeSecondsPerQ);
        startedAt.current = Date.now();
      })
      .catch(() => {
        /* offline / free preview — local seed still works */
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch, childId, level, lvlDef.challengeSecondsPerQ]);

  useEffect(() => {
    const p = problems[0];
    if (!p) return;
    setBoard(p.initialState ?? emptyAbacus(p.rods));
  }, [problems]);

  const advance = useCallback(
    (correct: boolean, elapsedMs: number, submittedAnswer: number) => {
      const score = scoreAnswer({
        correct,
        elapsedMs,
        limitMs: lvlDef.challengeSecondsPerQ * 1000,
        fastBonusFraction: lvlDef.fastBonusFraction,
      });
      setResults((rs) => {
        const next = [...rs, { correct, points: score.points, answer: submittedAnswer, elapsedMs }];
        if (next.length >= problems.length) {
          const summary = summarizeSession(level, next);
          onComplete(summary.accuracyPct, summary.totalPoints, {
            sessionToken,
            seed,
            answers: next.map((r) => r.answer),
            elapsedMs: next.map((r) => r.elapsedMs),
          });
        }
        return next;
      });
      const nextIdx = idx + 1;
      if (nextIdx < problems.length) {
        setIdx(nextIdx);
        const p = problems[nextIdx];
        setBoard(p.initialState ?? emptyAbacus(p.rods));
        setTLeft(lvlDef.challengeSecondsPerQ);
        startedAt.current = Date.now();
      }
    },
    [idx, level, lvlDef, onComplete, problems, seed, sessionToken],
  );

  useEffect(() => {
    if (results.length >= problems.length) return;
    const id = setInterval(() => {
      setTLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          advance(false, lvlDef.challengeSecondsPerQ * 1000, -1);
          return lvlDef.challengeSecondsPerQ;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [idx, advance, lvlDef.challengeSecondsPerQ, problems.length, results.length]);

  if (results.length >= problems.length) {
    const summary = summarizeSession(level, results);
    return (
      <div className="text-center space-y-3 py-4 relative" data-testid="abacus-challenge-complete">
        <ConfettiBurst show={summary.passed} />
        <Trophy className="h-12 w-12 mx-auto text-foreground" />
        <h4 className="text-lg font-black">
          {summary.label === "perfect"
            ? t("abacus.label_perfect")
            : summary.label === "great"
              ? t("abacus.label_great")
              : summary.label === "good"
                ? t("abacus.label_good")
                : t("abacus.label_keep_going")}
        </h4>
        <p className="text-sm">
          {summary.correct} / {summary.totalQuestions} {t("abacus.correct_lower")} •{""}
          <strong>{summary.totalPoints}</strong> {t("abacus.points")}
        </p>
        <p className={`text-xs font-semibold ${summary.passed ? "text-foreground" : "text-foreground"}`}>
          {summary.passed ? `🔓 ${t("abacus.level_unlocked")}` : `${t("abacus.need_pct", { pct: lvlDef.unlockAccuracyPct })}`}
        </p>
      </div>
    );
  }

  const cur = problems[idx];
  const challengePct = Math.round((idx / problems.length) * 100);
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-semibold">
            Q {idx + 1} / {problems.length}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 font-extrabold rounded-full px-2 py-0.5 border",
              tLeft <= 5
                ? "border-rose-500 text-rose-600 animate-pulse"
                : "border-amber-500/60 text-amber-700 dark:text-amber-300",
            )}
            data-testid="abacus-challenge-timer"
          >
            <Zap className="h-3 w-3" /> {tLeft}s
          </span>
        </div>
        <Progress value={challengePct} className="h-1.5" />
        <ChallengeQuestionDots total={problems.length} currentIdx={idx} results={results} />
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/15 p-4 text-center">
        <p className="text-4xl sm:text-5xl font-black text-foreground font-quicksand">{cur.prompt}</p>
      </div>
      <AbacusBoard state={board} onChange={(s) => { sfx.bead(); setBoard(s); }} />
      <button
        type="button"
        onClick={() => {
          const submitted = abacusValue(board);
          advance(submitted === cur.answer, Date.now() - startedAt.current, submitted);
        }}
        className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 text-white text-sm font-bold py-3 shadow-md active:scale-[0.99] transition-transform min-h-[44px]"
        data-testid="abacus-challenge-submit"
      >
        ✓ {t("abacus.submit")}
      </button>
    </div>
  );
}

// MentalMode → @/components/abacus/abacus-mental-mode (V2: logs progress)
// TutorMode → AbacusTutorKeyboardPanel (KeyboardSafeShell + visual board)

// ─── Top-level component ────────────────────────────────────────────────

export function AbacusZone({ childId, childName, ageYears, gate }: Props) {
  const { t, i18n } = useAbacusTranslation();
  const authFetch = useAuthFetch();
  const voice = useAbacusAmyVoice();
  const [progress, setProgress] = useState<ProgressShape | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardShape | null>(null);
  const [mode, setMode] = useState<Mode>("learn");
  const [level, setLevel] = useState<LevelId>(1);
  const [loading, setLoading] = useState(true);
  const [dailyPractice, setDailyPractice] = useState(() => readDailyPractice(childId));
  const [streak, setStreak] = useState(() => readStreak(childId));
  const [zoneScreen, setZoneScreen] = useState<ZoneScreen>("home");
  const [viewMode, setViewMode] = useState<ViewMode>("child");
  const [showProUpsell, setShowProUpsell] = useState(false);
  const [previewPractice, setPreviewPractice] = useState(false);
  const [ageOverrides, setAgeOverrides] = useState<number[]>(() => readAgeOverrides(childId));
  const [warmup, setWarmup] = useState(() => readWarmup(childId));
  const [ageConfirmLevel, setAgeConfirmLevel] = useState<LevelId | null>(null);
  const [mastery, setMastery] = useState(() => readMastery(childId));
  const [collection, setCollection] = useState(() => readCollection(childId));
  const [mission, setMission] = useState(() => readMission(childId, 1));
  const [adaptiveStats, setAdaptiveStats] = useState(() => readAdaptiveStats(childId));
  const [coachLine, setCoachLine] = useState("");
  const [newUnlocks, setNewUnlocks] = useState<CollectionItemId[]>([]);
  const [microCorrect, setMicroCorrect] = useState(0);
  const [microGameId, setMicroGameId] = useState<MicroGameId>(() =>
    readPreferredMicroGame(childId, "practice") ?? "magic_beads",
  );
  const [prevWeekAccuracy] = useState(() => readWeeklySnap(childId)?.accuracy ?? null);
  const [learningDna, setLearningDna] = useState(() => readLearningDna(childId));
  const [achievementsV2, setAchievementsV2] = useState(() => readAchievementsV2(childId));
  const [achievementToast, setAchievementToast] = useState<AchievementV2Id | null>(null);
  const [familyProgress, setFamilyProgress] = useState(() => readFamilyProgress(childId));
  const [bossIntro, setBossIntro] = useState<BossDef | null>(null);
  const [bossVictory, setBossVictory] = useState<BossDef | null>(null);
  const [bossFightActive, setBossFightActive] = useState(false);
  const lastMistakePrompt = useRef<string | undefined>(undefined);
  const sessionStartedAt = useRef<number>(Date.now());
  const homeTracked = useRef(false);
  const competitionTracked = useRef(false);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const adaptiveProfile = useMemo(
    () => deriveAdaptiveProfile(adaptiveStats),
    [adaptiveStats],
  );
  const practiceEase = useMemo(
    () => (learningDna ? dnaEaseFactor(learningDna) : adaptiveProfile.easeFactor),
    [adaptiveProfile.easeFactor, learningDna],
  );
  const reviewSkill = useMemo(
    () => nextReviewSkill(readReviewSchedule(childId), mastery),
    [childId, mastery],
  );
  const learningPath = useMemo(
    () =>
      buildLearningPath({
        currentLevel: level,
        completedLevels: (progress?.completedLevels ?? []) as LevelId[],
        mastery,
      }),
    [level, mastery, progress?.completedLevels],
  );
  const weeklyEvent = useMemo(
    () => currentWeeklyEvent(weekKeyUtc(), ageYears),
    [ageYears],
  );
  const parentInsightsV4 = useMemo(() => {
    if (!learningDna) return null;
    return buildParentInsightsV4({
      dna: learningDna,
      previousDna: readPreviousLearningDna(childId),
      mastery,
      review: readReviewSchedule(childId),
      currentLevel: level,
    });
  }, [childId, learningDna, level, mastery]);
  const coachFragment = useMemo(
    () =>
      buildLivingTutorCoachFragment({
        stats: adaptiveStats,
        profile: adaptiveProfile,
        mastery,
        lastMistakePrompt: lastMistakePrompt.current,
        language: i18n.language?.startsWith("hi") ? "hi" : "en",
      }),
    [adaptiveProfile, adaptiveStats, i18n.language, mastery],
  );
  const activeMicroGame = useMemo(() => {
    try {
      return getMicroGame(microGameId);
    } catch {
      return getMicroGame("classic");
    }
  }, [microGameId]);
  const actionGate = gate ?? {
    locked: false,
    previewMode: false,
    onEngage: () => undefined,
    module: "hub_abacus",
    entitlementState: "premium" as const,
  };

  const analyticsCtx = useMemo(
    () => ({
      childId,
      age: ageYears,
      language: i18n.language,
      subscription: actionGate.entitlementState,
      level,
    }),
    [actionGate.entitlementState, ageYears, childId, i18n.language, level],
  );

  const recordActivity = useCallback(() => {
    const next = bumpStreak(childId);
    setStreak(next);
    markLastActive(childId);
  }, [childId]);

  useEffect(() => {
    if (homeTracked.current) return;
    if (loading || zoneScreen !== "home") return;
    homeTracked.current = true;
    trackAbacusHomeOpen(analyticsCtx);
    if (!competitionTracked.current) {
      competitionTracked.current = true;
      trackAbacusCompetitionView(analyticsCtx, weeklyEvent.id, weeklyEvent.bracket);
      trackAbacusStoryWorldView(analyticsCtx, learningPath.currentChapter.worldId);
    }
  }, [analyticsCtx, learningPath.currentChapter.worldId, loading, weeklyEvent.bracket, weeklyEvent.id, zoneScreen]);

  // Flush offline progress queue when back online.
  useEffect(() => {
    const flush = async () => {
      const queue = readOfflineQueue(childId);
      if (queue.length === 0) return;
      const remaining = [];
      for (const item of queue) {
        try {
          const res = await authFetch(item.path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.body),
          });
          if (!res.ok) remaining.push(item);
        } catch {
          remaining.push(item);
        }
      }
      writeOfflineQueue(childId, remaining);
    };
    void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [authFetch, childId]);

  // Pull the friends/family leaderboard. Lightweight — re-fetched on
  // mount and after every challenge completion so the strip reflects
  // the child's latest weekly points without a manual refresh.
  const refreshLeaderboard = useCallback(() => {
    authFetch(`/api/abacus/leaderboard?childId=${childId}`)
      .then(async (r) => {
        if (!r.ok) return null;
        return parseApiJson<LeaderboardShape>(r);
      })
      .then((data) => {
        if (data?.top) setLeaderboard(data);
      })
      .catch(() => { /* leaderboard is non-essential — silent on failure */ });
  }, [authFetch, childId]);

  // Fetch progress + initial mode/level on mount and whenever the child changes.
  // Hydrate from localStorage immediately so the UI is responsive offline,
  // then refresh from the server in the background.
  useEffect(() => {
    let cancelled = false;
    const cached = readCachedProgress<ProgressShape>(childId);
    if (cached) {
      setProgress(cached);
      setMode((cached.lastMode as Mode) || "learn");
      setLevel((cached.currentLevel as LevelId) || 1);
      setLoading(false);
    } else {
      setLoading(true);
    }
    authFetch(`/api/abacus/progress?childId=${childId}`)
      .then(async (r) => parseApiJson<{ eligible?: boolean; progress?: ProgressShape }>(r))
      .then((data) => {
        if (cancelled) return;
        if (data?.eligible && data.progress) {
          const p = data.progress;
          setProgress(p);
          writeCachedProgress(childId, p);
          if (!cached) {
            setMode((p.lastMode as Mode) || "learn");
            setLevel((p.currentLevel as LevelId) || 1);
          }
        } else if (!cached) {
          setProgress(null);
        }
      })
      .catch(() => { /* keep cached state on network failure */ })
      .finally(() => !cancelled && setLoading(false));
    refreshLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [authFetch, childId, refreshLeaderboard]);

  useEffect(() => {
    setDailyPractice(readDailyPractice(childId));
    setStreak(readStreak(childId));
    setAgeOverrides(readAgeOverrides(childId));
    setWarmup(readWarmup(childId));
    setMastery(readMastery(childId));
    setCollection(readCollection(childId));
    setMission(readMission(childId, level));
    setAdaptiveStats(readAdaptiveStats(childId));
    setLearningDna(readLearningDna(childId));
    setAchievementsV2(readAchievementsV2(childId));
    setFamilyProgress(readFamilyProgress(childId));
    setBossIntro(null);
    setBossVictory(null);
    setBossFightActive(false);
    setAchievementToast(null);
    setMicroGameId(readPreferredMicroGame(childId, "practice") ?? "magic_beads");
    setZoneScreen("home");
    setShowProUpsell(false);
    setPreviewPractice(false);
    setMicroCorrect(0);
    homeTracked.current = false;
    competitionTracked.current = false;
  }, [childId]); // eslint-disable-line react-hooks/exhaustive-deps -- reset on child change only

  useEffect(() => {
    setMission(readMission(childId, level));
  }, [childId, level]);

  useEffect(() => {
    if (mode !== "practice" && mode !== "mental" && mode !== "challenge") return;
    const pref = readPreferredMicroGame(childId, mode);
    setMicroGameId(pref ?? microGamesForModeFallback(mode));
    setMicroCorrect(0);
  }, [childId, mode]);

  const refreshCollectionFromSignals = useCallback(
    (extra?: Partial<Parameters<typeof evaluateCollectionUnlocks>[1]>) => {
      const nextMastery = readMastery(childId);
      const mental = nextMastery.mental_speed;
      const addition = nextMastery.addition;
      const ctx = {
        totalCorrect: progress?.totalCorrect ?? 0,
        streakDays: streak.days,
        perfectChallenge: false,
        warmupDone: readWarmup(childId).completed,
        missionComplete: missionProgress(readMission(childId, level)).allCoreDone,
        tutorAsks: readCollection(childId).tutorAsks,
        levelUnlocked: false,
        learnComplete: hasCompletedFirstLearn(childId),
        playedLightning: microGameId === "lightning",
        playedMagicBeads: microGameId === "magic_beads",
        mentalTierAtLeastDeveloping:
          mental.tier === "developing" ||
          mental.tier === "strong" ||
          mental.tier === "master" ||
          mental.tier === "legend",
        additionMaster: addition.tier === "master" || addition.tier === "legend",
        anyMaster: Object.values(nextMastery).some(
          (s) => s.tier === "master" || s.tier === "legend",
        ),
        mentalLegend: mental.tier === "legend",
        missionsCompleted: readCollection(childId).missionsCompleted,
        ...extra,
      };
      const { state, newlyUnlocked } = evaluateCollectionUnlocks(readCollection(childId), ctx);
      writeCollection(childId, state);
      setCollection(state);
      if (newlyUnlocked.length) {
        setNewUnlocks(newlyUnlocked);
        for (const item of newlyUnlocked) {
          trackAbacusCollectionUnlock(analyticsCtx, item);
        }
        sfx.celebrate();
      }
    },
    [analyticsCtx, childId, level, microGameId, progress?.totalCorrect, streak.days],
  );

  const logPracticeAttempt = useCallback(
    async (
      correct: boolean,
      source: "practice" | "mental" | "warmup" = "practice",
      meta?: { elapsedMs?: number; answer?: number; expected?: number; prompt?: string },
    ) => {
      recordActivity();
      const elapsedMs = meta?.elapsedMs ?? 0;
      setDailyPractice((prev) => {
        const nextDaily: DailyPracticeShape = {
          date: todayDateKey(),
          correct: prev.correct + (correct ? 1 : 0),
          attempts: prev.attempts + 1,
        };
        writeDailyPractice(childId, nextDaily);
        return nextDaily;
      });

      setProgress((prev) => {
        if (!prev) return prev;
        const updated: ProgressShape = {
          ...prev,
          totalCorrect: prev.totalCorrect + (correct ? 1 : 0),
          totalAttempts: prev.totalAttempts + 1,
          totalPoints: prev.totalPoints + (correct ? 10 : 0),
        };
        writeCachedProgress(childId, updated);
        return updated;
      });

      // V3 adaptive + mastery + coach
      const repeated =
        !correct &&
        Boolean(meta?.prompt) &&
        meta?.prompt === lastMistakePrompt.current;
      if (!correct && meta?.prompt) lastMistakePrompt.current = meta.prompt;
      const nextAdaptive = foldAttempt(adaptiveStats, {
        correct,
        elapsedMs,
        repeatedMistake: repeated,
        wildGuess:
          typeof meta?.answer === "number" && typeof meta?.expected === "number"
            ? isWildGuess(meta.answer, meta.expected)
            : false,
      });
      writeAdaptiveStats(childId, nextAdaptive);
      setAdaptiveStats(nextAdaptive);
      const profile = deriveAdaptiveProfile(nextAdaptive);
      setCoachLine(
        livingCoachLine({
          stats: nextAdaptive,
          profile,
          mastery,
          lastMistakePrompt: lastMistakePrompt.current,
          language: i18n.language?.startsWith("hi") ? "hi" : "en",
        }),
      );

      const skill = skillForLevelMode(
        level,
        source === "warmup" ? "warmup" : source,
      );
      const nextMastery = applyMasteryAttempt(mastery, skill, {
        correct,
        elapsedMs,
      });
      writeMastery(childId, nextMastery);
      setMastery(nextMastery);

      // V4: Learning DNA + emotion + spaced repetition + achievements
      const dna = refreshLearningDna(childId, {
        stats: nextAdaptive,
        mastery: nextMastery,
        preferredGameMode: microGameId,
        activeDaysLastTwoWeeks: Math.min(14, streak.days),
      });
      setLearningDna(dna);
      trackAbacusDnaUpdated(analyticsCtx, {
        accuracy: dna.accuracy,
        confidence: dna.confidence,
        tutor_style: dna.preferredTutorStyle,
      });

      const emotionState = detectEmotion({
        stats: nextAdaptive,
        profile,
        dna,
      });
      const cue = emotionCue({
        state: emotionState,
        language: i18n.language?.startsWith("hi") ? "hi" : "en",
        rotate: bumpEmotionRotate(childId),
      });
      setCoachLine(cue.line);
      trackAbacusEmotionCue(analyticsCtx, emotionState);

      const quality = (correct
        ? elapsedMs > 0 && elapsedMs < 4000
          ? 5
          : 4
        : 1) as 0 | 1 | 2 | 3 | 4 | 5;
      const nextReview = applyReviewResult(readReviewSchedule(childId), skill, quality);
      writeReviewSchedule(childId, nextReview);
      if (correct) {
        bumpReviewsCompleted(childId);
        trackAbacusReviewScheduled(analyticsCtx, skill);
      }

      const { earned, newlyUnlocked } = syncAchievementsV2(childId, {
        streakDays: streak.days,
        totalCorrect: (progress?.totalCorrect ?? 0) + (correct ? 1 : 0),
        dnaSpeed: dna.speed,
        dnaConsistency: dna.consistency,
        mastery: nextMastery,
        collection: readCollection(childId),
        tutorAsks: readTutorAsksV4(childId),
        weekendMissionDone: readWeekendMissionDone(childId),
        bossesDefeated: readBossesDefeated(childId).length,
        worldsUnlocked: unlockedWorlds(
          highestUnlockedLevel((progress?.completedLevels ?? []) as LevelId[]),
        ).length,
        reviewsCompleted: readReviewsCompleted(childId),
      });
      setAchievementsV2(earned);
      if (newlyUnlocked[0]) {
        setAchievementToast(newlyUnlocked[0]);
        for (const id of newlyUnlocked) trackAbacusAchievementUnlocked(analyticsCtx, id);
        sfx.celebrate();
      }

      if (correct) {
        setMicroCorrect((n) => n + 1);
      }
      if (elapsedMs > 0) trackAbacusThinkingTime(analyticsCtx, elapsedMs, correct);

      if (source === "mental") trackAbacusMentalCompleted(analyticsCtx, correct, elapsedMs);
      else if (source === "practice") trackAbacusPracticeCompleted(analyticsCtx, correct, elapsedMs);

      const body = {
        action: "log_session" as const,
        childId,
        totalCorrect: correct ? 1 : 0,
        totalAttempts: 1,
        totalPoints: correct ? 10 : 0,
      };

      try {
        const res = await authFetch("/api/abacus/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) enqueueOffline(childId, "/api/abacus/progress", body);
      } catch {
        enqueueOffline(childId, "/api/abacus/progress", body);
      }

      if (correct) refreshLeaderboard();
      refreshCollectionFromSignals();

      // Persist weekly snap for parent week-over-week.
      const wk = weekKeyUtc();
      const snap = readWeeklySnap(childId);
      const acc =
        (progress?.totalAttempts ?? 0) + 1 > 0
          ? Math.round(
              (((progress?.totalCorrect ?? 0) + (correct ? 1 : 0)) /
                ((progress?.totalAttempts ?? 0) + 1)) *
                100,
            )
          : 0;
      if (!snap || snap.weekKey !== wk) {
        writeWeeklySnap(childId, {
          weekKey: wk,
          accuracy: acc,
          totalPoints: (progress?.totalPoints ?? 0) + (correct ? 10 : 0),
          learningMinutes: Math.max(1, Math.round(elapsedMs / 60_000)),
          averageScore: masterySummary(nextMastery).averageScore,
        });
      }
    },
    [
      adaptiveStats,
      analyticsCtx,
      authFetch,
      childId,
      i18n.language,
      level,
      mastery,
      microGameId,
      progress,
      refreshCollectionFromSignals,
      refreshLeaderboard,
      recordActivity,
      streak.days,
    ],
  );

  const completeMissionStep = useCallback(
    (stepId: string) => {
      const next = markMissionStep(mission, stepId);
      writeMission(childId, next);
      setMission(next);
      refreshCollectionFromSignals({
        missionComplete: missionProgress(next).allCoreDone,
      });
    },
    [childId, mission, refreshCollectionFromSignals],
  );

  const claimMissionTreasure = useCallback(() => {
    if (mission.treasureClaimed) return;
    let nextCol = grantGems(collection, mission.rewardGems);
    nextCol = grantStars(nextCol, mission.rewardStars);
    nextCol = {
      ...nextCol,
      missionsCompleted: nextCol.missionsCompleted + 1,
    };
    let nextMission = markMissionStep(mission, "treasure");
    nextMission = { ...nextMission, treasureClaimed: true };
    writeCollection(childId, nextCol);
    writeMission(childId, nextMission);
    setCollection(nextCol);
    setMission(nextMission);
    trackAbacusMissionCompleted(analyticsCtx, mission.rewardGems, mission.rewardStars);
    sfx.celebrate();
    refreshCollectionFromSignals({
      missionComplete: true,
      missionsCompleted: nextCol.missionsCompleted,
    });
  }, [analyticsCtx, childId, collection, mission, refreshCollectionFromSignals]);

  const persistMode = useCallback(
    (next: Mode, lvl: LevelId) => {
      void authFetch("/api/abacus/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_mode", childId, mode: next, level: lvl }),
      }).catch(() => {});
    },
    [authFetch, childId],
  );

  const onChallengeComplete = useCallback(
    async (
      accuracyPct: number,
      points: number,
      meta?: {
        sessionToken?: string;
        seed?: number;
        answers?: number[];
        elapsedMs?: number[];
      },
    ) => {
      recordActivity();
      const def = LEVELS.find((l) => l.id === level)!;
      const passed = accuracyPct >= def.unlockAccuracyPct;
      trackAbacusChallengeCompleted(analyticsCtx, {
        accuracy: accuracyPct,
        points,
        passed,
        duration_ms: Date.now() - sessionStartedAt.current,
      });
      trackAbacusModeCompleted(analyticsCtx, "challenge", {
        accuracy: accuracyPct,
        duration_ms: Date.now() - sessionStartedAt.current,
      });
      if (passed) {
        const res = await authFetch("/api/abacus/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete_level",
            childId,
            level,
            accuracyPct,
            points,
            ...(meta?.sessionToken
              ? {
                  sessionToken: meta.sessionToken,
                  seed: meta.seed,
                  answers: meta.answers,
                  elapsedMs: meta.elapsedMs,
                }
              : {}),
          }),
        });
        const data = await parseApiJson<{ progress?: ProgressShape; unlocked?: number | null }>(res).catch(() => null);
        if (data?.progress) {
          const np: ProgressShape = {
            ...(progress ?? {
              currentLevel: level,
              lastMode: mode,
              completedLevels: [],
              highestUnlocked: level,
              bestScores: {},
              totalCorrect: 0,
              totalAttempts: 0,
              totalPoints: 0,
            }),
            currentLevel: data.progress.currentLevel,
            completedLevels: data.progress.completedLevels ?? [],
            highestUnlocked: highestUnlockedLevel(data.progress.completedLevels ?? []),
            bestScores: data.progress.bestScores ?? {},
          };
          setProgress(np);
          writeCachedProgress(childId, np);
          sfx.unlock();
          if (data.unlocked) {
            trackAbacusLevelUnlocked(analyticsCtx, data.unlocked);
          }
        }
      }
      // Always log the session totals so the lifetime counters move.
      const sessionBody = {
        action: "log_session" as const,
        childId,
        totalCorrect: Math.round((accuracyPct / 100) * def.challengeCount),
        totalAttempts: def.challengeCount,
        totalPoints: points,
      };
      try {
        const res = await authFetch("/api/abacus/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sessionBody),
        });
        if (!res.ok) enqueueOffline(childId, "/api/abacus/progress", sessionBody);
      } catch {
        enqueueOffline(childId, "/api/abacus/progress", sessionBody);
      }
      refreshLeaderboard();

      if (bossFightActive) {
        const boss = bossForLevel(level);
        const won = accuracyPct >= def.unlockAccuracyPct;
        trackAbacusBossCompleted(analyticsCtx, boss.id, { level, won });
        if (won) {
          markBossDefeated(childId, level);
          setBossVictory(boss);
          sfx.celebrate();
        }
        setBossFightActive(false);
      }
    },
    [
      analyticsCtx,
      authFetch,
      bossFightActive,
      childId,
      level,
      mode,
      progress,
      refreshLeaderboard,
      recordActivity,
    ],
  );

  const startPlay = useCallback(
    (nextMode?: Mode) => {
      const m = nextMode ?? mode;
      if (nextMode) {
        setMode(nextMode);
        persistMode(nextMode, level);
      }
      sessionStartedAt.current = Date.now();
      trackAbacusModeStarted(analyticsCtx, m);
      setZoneScreen("play");
      setShowProUpsell(false);
      setPreviewPractice(false);
    },
    [analyticsCtx, level, mode, persistMode],
  );

  const onLessonComplete = useCallback(() => {
    trackAbacusLessonCompleted(analyticsCtx);
    trackAbacusModeCompleted(analyticsCtx, "learn");
    if (!hasCompletedFirstLearn(childId)) {
      markFirstLearnComplete(childId);
      if (actionGate.previewMode && actionGate.locked) {
        setShowProUpsell(true);
      }
    }
  }, [actionGate.locked, actionGate.previewMode, analyticsCtx, childId]);

  const selectLevel = useCallback(
    (next: LevelId, unlocked: boolean) => {
      if (!unlocked) return;
      const access = resolveAgeLevelAccess({
        level: next,
        ageYears,
        minAgeForLevel: minAgeForLevel(next),
        progressionUnlocked: unlocked,
        parentOverride: ageOverrides.includes(next),
      });
      if (access.softLocked) {
        setAgeConfirmLevel(next);
        return;
      }
      setLevel(next);
      persistMode(mode, next);
    },
    [ageOverrides, ageYears, mode, persistMode],
  );

  const confirmAgeOverride = useCallback(
    (by: "parent" | "child_confirmed") => {
      if (!ageConfirmLevel) return;
      writeAgeOverride(childId, ageConfirmLevel);
      setAgeOverrides(readAgeOverrides(childId));
      trackAbacusAgeOverride(analyticsCtx, ageConfirmLevel, by);
      setLevel(ageConfirmLevel);
      persistMode(mode, ageConfirmLevel);
      setAgeConfirmLevel(null);
    },
    [ageConfirmLevel, analyticsCtx, childId, mode, persistMode],
  );

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse" data-testid="abacus-zone-loading">
        <div className="h-20 rounded-2xl bg-muted" />
        <div className="h-10 rounded-xl bg-muted" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 flex-1 rounded-full bg-muted" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-muted" />
      </div>
    );
  }

  if (ageYears < 2 || ageYears > 10) {
    return (
      <p className="text-xs text-muted-foreground">{t("abacus.age_not_eligible", { name: childName })}</p>
    );
  }

  const completed = progress?.completedLevels ?? [];
  const MODES: { id: Mode; label: string; emoji: string }[] = [
    { id: "learn", label: t("abacus.mode_learn"), emoji: "📚" },
    { id: "practice", label: t("abacus.mode_practice"), emoji: "✏️" },
    { id: "challenge", label: t("abacus.mode_challenge"), emoji: "⏱️" },
    { id: "mental", label: t("abacus.mode_mental"), emoji: "🧠" },
    { id: "tutor", label: t("abacus.mode_tutor"), emoji: "💜" },
  ];

  return (
    <div className="space-y-3" data-testid="abacus-zone">
      <AbacusViewToggle viewMode={viewMode} onChange={setViewMode} t={t} />

      {progress && (
        <ProgressHeader
          childName={childName}
          progress={progress}
          completedCount={completed.length}
          totalLevels={LEVELS.length}
          dailyCorrect={dailyPractice.correct}
          streakDays={streak.days}
          t={t}
        />
      )}

      {viewMode === "parent" && progress && (
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm space-y-3">
          <AbacusParentPanel
            progress={progress}
            streakDays={streak.days}
            dailyCorrect={dailyPractice.correct}
            dailyGoal={DAILY_PRACTICE_GOAL}
            mastery={mastery}
            previousWeekAccuracy={prevWeekAccuracy}
            insightsV4={parentInsightsV4}
            t={t}
          />
          <AbacusCertificateCard
            childId={childId}
            childName={childName}
            mastery={mastery}
            chapterTitle={learningPath.currentChapter.title}
            ageYears={ageYears}
          />
          <AbacusFamilyPanel
            completedIds={familyProgress.completedIds}
            onStart={(c) => {
              trackAbacusFamilyChallenge(analyticsCtx, c.id, "start");
              if (c.id === "weekend_quest") markWeekendMissionDone(childId);
              if (c.childMode === "warmup") {
                setZoneScreen("warmup");
                return;
              }
              startPlay(c.childMode);
            }}
            onMarkDone={(id) => {
              setFamilyProgress(markFamilyChallengeDone(childId, id));
              trackAbacusFamilyChallenge(analyticsCtx, id, "complete");
              if (id === "weekend_quest") markWeekendMissionDone(childId);
            }}
          />
        </div>
      )}

      <AbacusBossIntro
        boss={bossIntro ?? bossForLevel(level)}
        open={Boolean(bossIntro)}
        onDismiss={() => setBossIntro(null)}
        onFight={() => {
          if (!bossIntro) return;
          trackAbacusBossStarted(analyticsCtx, bossIntro.id, bossIntro.level);
          setLevel(bossIntro.level);
          setBossFightActive(true);
          setBossIntro(null);
          startPlay("challenge");
        }}
      />
      <AbacusBossVictory
        boss={bossVictory ?? bossForLevel(level)}
        open={Boolean(bossVictory)}
        onClose={() => setBossVictory(null)}
      />
      <AbacusAchievementsV2
        earned={achievementsV2}
        showGrid={viewMode === "child" && zoneScreen === "home"}
        toastId={achievementToast}
        onDismissToast={() => setAchievementToast(null)}
      />

      {viewMode === "child" && zoneScreen === "home" && progress && (
        <div className="space-y-3">
          <AbacusReminderBanner
            daysAway={daysSinceLastActive(childId)}
            easier={daysSinceLastActive(childId) >= 7}
            onResume={() => {
              const easy = daysSinceLastActive(childId) >= 7;
              if (easy) setLevel(recommendedLevelForAge(Math.max(2, ageYears - 1)) as LevelId);
              startPlay("learn");
            }}
          />
          {actionGate.previewMode && <AbacusPremiumValuePanel />}
          <AbacusJourneyMap
            path={learningPath}
            reducedMotion={reducedMotion}
            onOpenBoss={(lvl) => setBossIntro(bossForLevel(lvl as LevelId))}
          />
          <AbacusStoryWorldsStrip
            highestUnlocked={highestUnlockedLevel(progress.completedLevels as LevelId[])}
            reducedMotion={reducedMotion}
          />
          <AbacusCompetitionBanner event={weeklyEvent} />
          <AbacusDailyAdventureCard
            mission={mission}
            onStart={(stepId) => {
              trackAbacusMissionStarted(analyticsCtx, stepId);
              if (stepId === "warmup") {
                trackAbacusWarmupStarted(analyticsCtx);
                setZoneScreen("warmup");
                return;
              }
              const step = mission.steps.find((s) => s.id === stepId);
              if (step?.microGameId) {
                setMicroGameId(step.microGameId);
                writePreferredMicroGame(
                  childId,
                  step.kind === "practice" || step.kind === "mental" || step.kind === "challenge"
                    ? step.kind
                    : "practice",
                  step.microGameId,
                );
              }
              if (step?.kind === "practice" || step?.kind === "mental" || step?.kind === "challenge") {
                setMicroCorrect(0);
                startPlay(step.kind);
              }
            }}
            onClaimTreasure={claimMissionTreasure}
          />
          <AbacusWarmupCard
            completedToday={warmup.completed}
            onStart={() => {
              trackAbacusWarmupStarted(analyticsCtx);
              sessionStartedAt.current = Date.now();
              setZoneScreen("warmup");
            }}
          />
          <AbacusCollectionShelf collection={collection} highlight={newUnlocks} />
          <PremiumActionGate gate={actionGate} label="Unlock Abacus practice">
            <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm">
              <AbacusHomeDashboard
                childName={childName}
                progress={progress}
                level={level}
                mode={mode}
                streakDays={streak.days}
                dailyCorrect={dailyPractice.correct}
                dailyGoal={DAILY_PRACTICE_GOAL}
                leaderboard={leaderboard}
                onContinue={() => startPlay()}
                onQuickStart={(m) => startPlay(m)}
                t={t}
              />
            </div>
          </PremiumActionGate>
        </div>
      )}

      {viewMode === "child" && zoneScreen === "warmup" && (
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm">
          <AbacusWarmupSession
            level={level}
            onAttempt={(ok) => void logPracticeAttempt(ok, "warmup")}
            onComplete={(bonus) => {
              const nextWarmup = { date: todayDateKey(), completed: true, bonusAwarded: true };
              writeWarmup(childId, nextWarmup);
              setWarmup(nextWarmup);
              trackAbacusWarmupCompleted(analyticsCtx, bonus);
              completeMissionStep("warmup");
              setProgress((prev) => {
                if (!prev) return prev;
                const updated = { ...prev, totalPoints: prev.totalPoints + bonus };
                writeCachedProgress(childId, updated);
                return updated;
              });
              // Bonus XP only — attempts already logged via onAttempt during the warm-up.
              const body = {
                action: "log_session" as const,
                childId,
                totalCorrect: 0,
                totalAttempts: 0,
                totalPoints: bonus,
              };
              void authFetch("/api/abacus/progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }).catch(() => enqueueOffline(childId, "/api/abacus/progress", body));
              refreshCollectionFromSignals({ warmupDone: true });
            }}
            onExit={() => setZoneScreen("home")}
          />
        </div>
      )}

      {viewMode === "child" && zoneScreen === "play" && (
        <>
          <button
            type="button"
            onClick={() => {
              trackAbacusQuitMidSession(
                analyticsCtx,
                mode,
                Date.now() - sessionStartedAt.current,
              );
              setZoneScreen("home");
              setShowProUpsell(false);
              setPreviewPractice(false);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-300 min-h-[40px]"
            data-testid="abacus-back-home"
          >
            <Home className="h-3.5 w-3.5" />
            {t("abacus.back_home")}
          </button>

          {leaderboard && (
            <div
              className="rounded-xl border border-border bg-card px-3 py-2 space-y-1"
              data-testid="abacus-leaderboard"
            >
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" />
                  {t("abacus.weekly_leaderboard")}
                </span>
                <span data-testid="abacus-leaderboard-rank">
                  {t("abacus.your_rank", {
                    rank: leaderboard.me.rank,
                    total: leaderboard.me.total,
                  })}
                </span>
              </div>
              {leaderboard.top.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">
                  {t("abacus.no_scores_yet")}
                </p>
              ) : (
                <ol className="space-y-0.5">
                  {leaderboard.top.map((row) => (
                    <li
                      key={row.childId}
                      className={cn(
                        "flex items-center justify-between text-xs rounded px-2 py-1",
                        row.isMe ? "bg-primary/10 font-bold text-foreground" : "text-foreground",
                      )}
                      data-testid={`abacus-leaderboard-row-${row.rank}`}
                    >
                      <span>
                        <span className="inline-block w-5 text-muted-foreground">#{row.rank}</span>
                        {row.isMe ? `${row.name} (${t("abacus.you")})` : row.name}
                      </span>
                      <span>{row.points} {t("abacus.pts")}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground font-semibold">
            ⭐ {t("abacus.recommended_for_age", "Recommended for age {{age}}", { age: ageYears })}:{" "}
            Level {recommendedLevelForAge(ageYears)}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((l) => {
              const unlocked = isLevelUnlocked(l.id, completed);
              const active = l.id === level;
              const access = resolveAgeLevelAccess({
                level: l.id,
                ageYears,
                minAgeForLevel: minAgeForLevel(l.id),
                progressionUnlocked: unlocked,
                parentOverride: ageOverrides.includes(l.id),
              });
              const softLocked = access.softLocked;
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={!unlocked}
                  title={softLocked ? access.message : undefined}
                  onClick={() => selectLevel(l.id, unlocked)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold border-2 transition-colors min-h-[36px]",
                    active
                      ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-transparent shadow-sm"
                      : softLocked
                        ? "bg-muted/80 text-muted-foreground border-dashed border-amber-400/50"
                        : unlocked
                          ? "bg-background text-foreground border-border hover:bg-muted"
                          : "bg-muted text-muted-foreground border-muted opacity-60",
                  )}
                  data-testid={`abacus-level-${l.id}`}
                  data-age-soft-locked={softLocked ? "true" : "false"}
                >
                  {!unlocked && <Lock className="h-3 w-3" />}
                  {softLocked && unlocked && <span aria-hidden>🔒</span>}
                  {access.recommended && unlocked && !softLocked && <span aria-hidden>⭐</span>}
                  L{l.id} •{" "}
                  {isAbacusLevelSlug(l.slug)
                    ? t(`abacus.level_${l.slug}`, abacusLevelLabelDefault(l.slug))
                    : l.slug}
                </button>
              );
            })}
          </div>

          {ageConfirmLevel != null && (
            <div
              className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 space-y-2"
              data-testid="abacus-age-confirm"
              role="dialog"
              aria-labelledby="abacus-age-confirm-title"
            >
              <p id="abacus-age-confirm-title" className="text-sm font-bold">
                {resolveAgeLevelAccess({
                  level: ageConfirmLevel,
                  ageYears,
                  minAgeForLevel: minAgeForLevel(ageConfirmLevel),
                  progressionUnlocked: true,
                  parentOverride: false,
                }).message}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("abacus.age_confirm_child", "Ask a parent to unlock this level.")}{" "}
                {t("abacus.age_confirm_parent", "Parents can override this recommendation.")}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAgeConfirmLevel(null)}
                  className="rounded-xl bg-muted text-foreground text-xs font-bold px-3 py-2 min-h-[40px]"
                >
                  {t("abacus.back")}
                </button>
                <button
                  type="button"
                  onClick={() => confirmAgeOverride("parent")}
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-bold px-3 py-2 min-h-[40px]"
                  data-testid="abacus-age-override"
                >
                  {t("abacus.age_override", "Open anyway")}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-none">
            {MODES.map((m) => {
              const button = (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (m.id !== "learn" && actionGate.previewMode && actionGate.locked) {
                      trackAbacusPremiumBlocked(analyticsCtx, "mode_chip", m.id);
                    }
                    setMode(m.id);
                    persistMode(m.id, level);
                    sessionStartedAt.current = Date.now();
                    trackAbacusModeStarted(analyticsCtx, m.id);
                    setShowProUpsell(false);
                    if (m.id === "practice") setPreviewPractice(false);
                  }}
                  className={cn(
                    "shrink-0 min-w-[4.5rem] rounded-xl text-xs font-semibold py-2 px-2 border transition-all min-h-[44px]",
                    mode === m.id
                      ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white border-transparent shadow-md scale-[1.02]"
                      : "bg-background text-foreground border-border hover:bg-muted",
                  )}
                  data-testid={`abacus-mode-${m.id}`}
                >
                  <span className="block text-base leading-none">{m.emoji}</span>
                  <span className="block mt-0.5 text-[10px] leading-tight">{m.label}</span>
                </button>
              );
              return m.id === "learn" ? button : (
                <PremiumActionGate key={m.id} gate={actionGate} label={`Unlock Abacus ${m.label}`}>
                  {button}
                </PremiumActionGate>
              );
            })}
          </div>

          {coachLine && mode !== "learn" && (
            <AbacusCoachBubble text={coachLine} celebrate={adaptiveProfile.signal === "fast_learner"} />
          )}

          {(mode === "practice" || mode === "mental" || mode === "challenge") && (
            <div className="space-y-2">
              <AbacusMicroGamePicker
                mode={mode}
                selected={
                  activeMicroGame.baseMode === mode ? microGameId : microGamesForModeFallback(mode)
                }
                onSelect={(id) => {
                  setMicroGameId(id);
                  writePreferredMicroGame(childId, mode, id);
                  setMicroCorrect(0);
                  trackAbacusGamePlayed(analyticsCtx, id, mode);
                }}
              />
              <AbacusMicroGameBanner
                game={
                  activeMicroGame.baseMode === mode
                    ? activeMicroGame
                    : getMicroGame(microGamesForModeFallback(mode))
                }
                correct={microCorrect}
                target={
                  activeMicroGame.baseMode === mode
                    ? activeMicroGame.targetCorrect
                    : getMicroGame(microGamesForModeFallback(mode)).targetCorrect
                }
                coins={
                  microGameId === "coin_collection" || microGameId === "treasure_hunt"
                    ? microCorrect
                    : undefined
                }
                amyScore={microGameId === "beat_amy" ? 3 : undefined}
              />
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm">
            {mode === "learn" && (
              <div className="space-y-3">
                <LearnMode
                  level={level}
                  speaking={voice.isActive}
                  onSpeak={(text) => void voice.speak(text)}
                  onStop={voice.stop}
                  onPrime={voice.prime}
                  onLessonComplete={onLessonComplete}
                />
                {showProUpsell && (
                  <AbacusLearnToProUpsell
                    onContinueFree={() => setShowProUpsell(false)}
                    onTryPro={() => {
                      trackAbacusPremiumClicked(analyticsCtx, "learn_upsell");
                      openSubscriptionGate({
                        reason: "hub_locked",
                        source: "abacus_learn_upsell",
                        module: "hub_abacus",
                        action: "practice",
                        entitlementState: actionGate.entitlementState,
                      });
                    }}
                    onPreviewPractice={() => {
                      setPreviewPractice(true);
                      setMode("practice");
                    }}
                  />
                )}
              </div>
            )}
            {mode === "practice" && (
              previewPractice && actionGate.locked ? (
                <div className="space-y-3" data-testid="abacus-practice-preview">
                  <p className="text-xs text-muted-foreground text-center font-semibold">
                    Preview — try one question, then unlock Practice Mode
                  </p>
                  <PracticeMode
                    level={level}
                    onAttempt={() => {
                      setPreviewPractice(false);
                      setShowProUpsell(true);
                      setMode("learn");
                      trackAbacusPremiumBlocked(analyticsCtx, "practice_preview", "practice");
                    }}
                    childView
                  />
                  <AbacusLearnToProUpsell
                    onContinueFree={() => {
                      setPreviewPractice(false);
                      setMode("learn");
                    }}
                    onTryPro={() => {
                      trackAbacusPremiumClicked(analyticsCtx, "practice_preview");
                      openSubscriptionGate({
                        reason: "hub_locked",
                        source: "abacus_practice_preview",
                        module: "hub_abacus",
                        action: "practice",
                        entitlementState: actionGate.entitlementState,
                      });
                    }}
                    onPreviewPractice={() => undefined}
                  />
                </div>
              ) : (
                <PremiumActionGate gate={actionGate} label="Unlock Abacus practice">
                  <PracticeMode
                    level={level}
                    easeFactor={practiceEase}
                    reviewSkill={reviewSkill}
                    enableVoice
                    onVoiceResult={(meta) =>
                      trackAbacusVoiceAnswer(analyticsCtx, {
                        correct: meta.correct,
                        confidence: meta.confidence,
                        response_ms: meta.responseMs,
                      })
                    }
                    onAttempt={(ok, meta) => {
                      void logPracticeAttempt(ok, "practice", meta);
                      if (ok && microCorrect + 1 >= activeMicroGame.targetCorrect) {
                        completeMissionStep("practice");
                      }
                    }}
                    childView
                  />
                </PremiumActionGate>
              )
            )}
            {mode === "challenge" && (
              <PremiumActionGate gate={actionGate} label="Unlock Abacus challenge mode">
                <ChallengeMode
                  level={level}
                  childId={childId}
                  onComplete={(accuracyPct, points, meta) => {
                    void onChallengeComplete(accuracyPct, points, meta);
                    completeMissionStep("challenge");
                    if (accuracyPct >= 100) {
                      refreshCollectionFromSignals({ perfectChallenge: true });
                    }
                  }}
                />
              </PremiumActionGate>
            )}
            {mode === "mental" && (
              <PremiumActionGate gate={actionGate} label="Unlock mental math mode">
                <MentalModeV2
                  level={level}
                  easeFactor={adaptiveProfile.easeFactor}
                  onAttempt={(meta) => {
                    void logPracticeAttempt(meta.correct, "mental", meta);
                    if (meta.correct && microCorrect + 1 >= activeMicroGame.targetCorrect) {
                      completeMissionStep("mental");
                    }
                  }}
                />
              </PremiumActionGate>
            )}
            {mode === "tutor" && (
              <PremiumActionGate gate={actionGate} label="Unlock Abacus AI tutor">
                <AbacusTutorKeyboardPanel
                  childId={childId}
                  level={level}
                  ageYears={ageYears}
                  voice={voice}
                  coachLine={coachLine}
                  coachFragment={coachFragment}
                />
              </PremiumActionGate>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AbacusZone;
