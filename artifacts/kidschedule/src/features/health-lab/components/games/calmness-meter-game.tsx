import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { aggregateWellnessFromHistory } from "../../scoring";
import { canRewardCalmnessSnapshot, distinctGamesToday } from "../../anti-cheat";
import { getLevelForXp, getNextLevel } from "../../constants";
import type { HealthLabPersistedState } from "../../types";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import {
  HealthLabGameStage,
  HealthLabGameTopBar,
  HealthLabGameCta,
  HealthLabGamePanel,
} from "../health-lab-game-ui";
import { HealthLabGameOnboarding } from "../health-lab-onboarding";
import { HealthLabStarfield, HealthLabPhaseFlash } from "../health-lab-cinematic";
import { HealthLabParticles } from "../health-lab-particles";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { useReducedMotion } from "@/lib/reduced-motion";
import { cn } from "@/lib/utils";
import {
  getAvatarTier,
  WELLNESS_CATEGORIES,
  WELLNESS_JOURNEY_TITLE,
  type WellnessCategoryKey,
} from "./wellness-journey/wellness-journey-constants";
import {
  buildAdventureStory,
  getAmyInsights,
  getBreathingScore,
  getHallOfFame,
  getWeeklyHighlights,
} from "./wellness-journey/wellness-journey-utils";
import { WellnessJourneyIntro } from "./wellness-journey/wellness-journey-intro";
import { WellnessScoreOrb } from "./wellness-journey/wellness-score-orb";
import { WellnessIsland } from "./wellness-journey/wellness-island";
import { WellnessCategoryCard } from "./wellness-journey/wellness-category-card";
import {
  WellnessAchievementShowcase,
  WellnessAmyInsights,
  WellnessAvatarCard,
  WellnessBadgeGallery,
  WellnessHallOfFame,
  WellnessHighlights,
  WellnessStreakCard,
} from "./wellness-journey/wellness-journey-sections";

interface Props {
  state: HealthLabPersistedState;
  onComplete: (score: number, durationMs: number, options?: import("../../types").SessionCompleteOptions) => void;
  onExit: () => void;
}

export function CalmnessMeterGame({ state, onComplete, onExit }: Props) {
  const { playTap, playCompletion } = useHealthLabAudio();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"onboarding" | "dashboard">("onboarding");
  const [introDone, setIntroDone] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const scores = useMemo(() => {
    if (state.gameHistory.length === 0) return null;
    const base = aggregateWellnessFromHistory(state.gameHistory);
    return { ...base, breathing: getBreathingScore(state.gameHistory) };
  }, [state.gameHistory]);

  const islandScores = useMemo((): Record<WellnessCategoryKey, number> => {
    if (!scores) {
      return { balance: 0, focus: 0, coordination: 0, calmness: 0, breathing: 0 };
    }
    return {
      balance: scores.balance,
      focus: scores.focus,
      coordination: scores.coordination,
      calmness: scores.calmness,
      breathing: scores.breathing,
    };
  }, [scores]);

  const canReward = canRewardCalmnessSnapshot(state.gamesCompletedToday, state.calmnessRewardedToday);
  const gamesPlayed = distinctGamesToday(state.gamesCompletedToday);
  const adventureStory = buildAdventureStory(state);
  const insights = getAmyInsights(state);
  const highlights = getWeeklyHighlights(state);
  const hallOfFame = getHallOfFame(state, scores?.overall ?? 0);
  const avatarTier = getAvatarTier(state.level);
  const earnedBadgeIds = new Set(state.badges.map((b) => b.id));

  const level = getLevelForXp(state.totalXp, state.prestige);
  const nextLevel = getNextLevel(level.id);
  const levelPct = nextLevel
    ? Math.min(100, Math.round(((state.totalXp - level.xpRequired) / (nextLevel.xpRequired - level.xpRequired)) * 100))
    : 100;

  const getCategoryValue = (key: WellnessCategoryKey): number => {
    if (!scores) return 0;
    if (key === "breathing") return scores.breathing;
    return scores[key] ?? 0;
  };

  const handleReveal = () => {
    playTap();
    setRevealed(true);
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 1200);
    const overall = scores?.overall ?? 0;
    void playCompletion();
    onComplete(overall, 500, {
      eligibleForXp: canReward,
      achievementUnlocked: canReward ? undefined : "Snapshot saved (no XP — play 3 games first or already claimed today)",
    });
  };

  const handleIntroComplete = useCallback(() => setIntroDone(true), []);

  if (phase === "onboarding" && !scores) {
    return (
      <HealthLabGameOnboarding
        gameId="calmness-meter"
        onExit={onExit}
        onStart={() => setPhase("dashboard")}
        startLabel="View Report"
        ctaVariant="amber"
        extraContent={
          <HealthLabGamePanel className="mt-4 w-full text-center text-sm text-amber-200/90">
            Play at least one challenge to unlock your wellness adventure passport!
          </HealthLabGamePanel>
        }
      />
    );
  }

  if (phase === "onboarding" && scores) {
    return (
      <HealthLabGameOnboarding
        gameId="calmness-meter"
        onExit={onExit}
        onStart={() => setPhase("dashboard")}
        startLabel="Open Adventure Passport"
        ctaVariant="amber"
      />
    );
  }

  return (
    <HealthLabGameStage gameId="calmness-meter" fullBleed className="relative min-h-[100dvh] overflow-x-hidden pb-28">
      <HealthLabLiveRegion message={WELLNESS_JOURNEY_TITLE} />
      <HealthLabParticles className="opacity-40" />
      <HealthLabStarfield count={14} />
      <HealthLabPhaseFlash active={celebrate} color="rgba(251,191,36,0.35)" />

      <AnimatePresence>
        {!introDone && scores && (
          <WellnessJourneyIntro score={scores.overall} onComplete={handleIntroComplete} />
        )}
      </AnimatePresence>

      <div className="relative z-20 shrink-0">
        <HealthLabGameTopBar onExit={onExit} title="Wellness Journey" />
      </div>

      <div className="relative z-[3] mx-auto max-w-lg px-4">
        {introDone && (
          <motion.div initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            {/* Hero */}
            <div
              className={cn(
                "mt-2 flex flex-col items-center rounded-[1.75rem] border border-white/[0.14] p-6",
                "bg-gradient-to-br from-violet-950/50 via-indigo-950/40 to-cyan-950/30 backdrop-blur-md",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/70">
                Wellness Adventure Passport
              </p>
              {scores && <WellnessScoreOrb score={scores.overall} totalXp={state.totalXp} />}
              <p className="mt-4 text-center text-sm leading-relaxed text-violet-100/85">{adventureStory}</p>
            </div>

            {/* Avatar + streak */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <WellnessAvatarCard
                avatarId={state.avatarId}
                level={state.level}
                tierLabel={avatarTier.label}
                tierEmoji={avatarTier.emoji}
                levelPct={levelPct}
              />
              <WellnessStreakCard days={state.streakDays} />
            </div>

            {/* Wellness island */}
            <motion.div className="mt-4" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <WellnessIsland scores={islandScores} />
            </motion.div>

            {/* Category cards */}
            {scores ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {WELLNESS_CATEGORIES.map((cat, i) => (
                  <WellnessCategoryCard
                    key={cat.key}
                    label={cat.label}
                    emoji={cat.emoji}
                    value={getCategoryValue(cat.key)}
                    island={cat.island}
                    categoryKey={cat.key}
                    delay={0.2 + i * 0.08}
                  />
                ))}
              </div>
            ) : (
              <HealthLabGamePanel className="mt-4 text-center text-amber-300/90">
                Play at least one challenge to unlock your wellness world!
              </HealthLabGamePanel>
            )}

            <div className="mt-4 space-y-4">
              <WellnessAchievementShowcase
                earnedBadgeIds={earnedBadgeIds}
                totalSessions={state.totalSessions}
                delay={0.35}
              />
              <WellnessBadgeGallery earned={state.badges} delay={0.4} />
              <WellnessHighlights highlights={highlights} delay={0.45} />
              <WellnessHallOfFame entries={hallOfFame} delay={0.5} />
              <WellnessAmyInsights insights={insights} delay={0.55} />
            </div>

            {revealed && (
              <motion.div
                className="mt-4 rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-200/70">Adventure Story</p>
                <p className="mt-2 text-sm leading-relaxed text-white/90">{adventureStory}</p>
              </motion.div>
            )}

            <HealthLabGamePanel className="mt-4 text-sm leading-relaxed text-violet-200/80">
              {canReward ? (
                <p>✅ Daily snapshot available ({gamesPlayed}/3 games played). Earn XP once today!</p>
              ) : state.calmnessRewardedToday ? (
                <p>Passport updated today. View anytime — no extra XP until tomorrow.</p>
              ) : (
                <p>
                  Play {3 - gamesPlayed} more different challenge{3 - gamesPlayed !== 1 ? "s" : ""} today to earn snapshot XP.
                </p>
              )}
            </HealthLabGamePanel>

            <HealthLabGameCta variant="amber" className="mt-6 w-full min-w-0" onClick={handleReveal}>
              {canReward ? "Generate My Adventure Story" : "Refresh Adventure Passport"}
            </HealthLabGameCta>
          </motion.div>
        )}
      </div>
    </HealthLabGameStage>
  );
}
