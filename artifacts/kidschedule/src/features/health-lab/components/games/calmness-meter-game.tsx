import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { aggregateWellnessFromHistory } from "../../scoring";
import { canRewardCalmnessSnapshot, distinctGamesToday } from "../../anti-cheat";
import { HEALTH_LAB_THEME } from "../../theme";
import { progressStory, weeklySummary } from "../../dashboard-utils";
import type { HealthLabPersistedState } from "../../types";
import { HealthLabAvatar } from "../health-lab-avatar";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import {
  HealthLabGameStage,
  HealthLabGameTopBar,
  HealthLabGameCta,
  HealthLabGamePanel,
} from "../health-lab-game-ui";
import { HealthLabGameOnboarding } from "../health-lab-onboarding";
import { HealthLabAmyCharacter, HealthLabGuidance } from "../health-lab-amy-character";
import { HealthLabRadialMetric } from "../health-lab-radial-metric";
import { HealthLabStarfield } from "../health-lab-cinematic";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { useReducedMotion } from "@/lib/reduced-motion";
import { cn } from "@/lib/utils";

interface Props {
  state: HealthLabPersistedState;
  onComplete: (score: number, durationMs: number, options?: import("../../types").SessionCompleteOptions) => void;
  onExit: () => void;
}

const METRICS = [
  { key: "balance" as const, label: "Balance", emoji: "⚖️", gradient: HEALTH_LAB_THEME.metricBalance },
  { key: "focus" as const, label: "Focus", emoji: "🎯", gradient: HEALTH_LAB_THEME.metricFocus },
  { key: "coordination" as const, label: "Reaction", emoji: "🚀", gradient: HEALTH_LAB_THEME.metricCoord },
  { key: "calmness" as const, label: "Movement", emoji: "🧘", gradient: HEALTH_LAB_THEME.metricCalm },
];

export function CalmnessMeterGame({ state, onComplete, onExit }: Props) {
  const { playTap, playSuccess, playCompletion } = useHealthLabAudio();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"onboarding" | "dashboard">("onboarding");
  const [revealed, setRevealed] = useState(false);

  const scores = useMemo(() => {
    if (state.gameHistory.length === 0) return null;
    return aggregateWellnessFromHistory(state.gameHistory);
  }, [state.gameHistory]);

  const canReward = canRewardCalmnessSnapshot(
    state.gamesCompletedToday,
    state.calmnessRewardedToday,
  );
  const gamesPlayed = distinctGamesToday(state.gamesCompletedToday);
  const narrative = scores
    ? progressStory(state).split(".")[0] + "."
    : "Complete challenges to build your wellness profile.";
  const weekInsight = weeklySummary(state);

  const handleReveal = () => {
    playTap();
    setRevealed(true);
    const overall = scores?.overall ?? 0;
    void playCompletion();
    onComplete(overall, 500, {
      eligibleForXp: canReward,
      achievementUnlocked: canReward ? undefined : "Snapshot saved (no XP — play 3 games first or already claimed today)",
    });
  };

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
            Play at least one challenge to unlock your wellness report!
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
        startLabel="Open Dashboard"
        ctaVariant="amber"
      />
    );
  }

  return (
    <HealthLabGameStage gameId="calmness-meter" className="pb-10">
      <HealthLabLiveRegion message="Amy Wellness Report" />
      <HealthLabGameTopBar onExit={onExit} title="Wellness Report" />
      <HealthLabStarfield count={12} />

      <div className="relative z-[3] mx-auto max-w-lg px-4">
        {/* Hero dashboard header */}
        <div className={cn(HEALTH_LAB_THEME.cardGlass, "mt-2 flex flex-col items-center border-white/[0.14] p-6")}>
          <HealthLabAmyCharacter action="report" size="md" mood="happy" />
          <motion.p
            className="mt-4 text-5xl font-bold tabular-nums text-amber-300"
            initial={reduced ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {scores?.overall ?? "—"}
          </motion.p>
          <p className="text-xs uppercase tracking-wider text-violet-200/60">Overall Wellness Score</p>
          <p className="mt-3 text-center text-sm leading-relaxed text-violet-100/80">{narrative}</p>
          {revealed && (
            <HealthLabGuidance
              messages={[
                "Great job, scientist!",
                "Keep exploring the lab!",
                "You're doing amazing!",
              ]}
              className="mt-3"
            />
          )}
        </div>

        {scores ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {METRICS.map((m, i) => (
              <HealthLabRadialMetric
                key={m.key}
                value={scores[m.key]}
                label={m.label}
                emoji={m.emoji}
                gradient={m.gradient}
                delay={i * 0.1}
              />
            ))}
          </div>
        ) : (
          <HealthLabGamePanel className="mt-4 text-center text-amber-300/90">
            Play at least one challenge to unlock your wellness report!
          </HealthLabGamePanel>
        )}

        {/* Badges & streak */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className={cn(HEALTH_LAB_THEME.cardGlass, "border-white/[0.1] p-4 text-center")}>
            <p className="text-2xl" aria-hidden>🔥</p>
            <p className="mt-1 font-mono text-xl font-bold text-orange-300">{state.streakDays}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Day Streak</p>
          </div>
          <div className={cn(HEALTH_LAB_THEME.cardGlass, "border-white/[0.1] p-4 text-center")}>
            <p className="text-2xl" aria-hidden>🏅</p>
            <p className="mt-1 font-mono text-xl font-bold text-amber-300">{state.badges.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Badges</p>
          </div>
        </div>

        {revealed && (
          <HealthLabGamePanel className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-300/70">Weekly insight</p>
            <p className="mt-1.5 text-sm leading-relaxed text-white/90">{weekInsight}</p>
          </HealthLabGamePanel>
        )}

        <HealthLabGamePanel className="mt-4 text-sm leading-relaxed text-violet-200/80">
          {canReward ? (
            <p>✅ Daily snapshot available ({gamesPlayed}/3 games played). Earn XP once today!</p>
          ) : state.calmnessRewardedToday ? (
            <p>Snapshot saved today. You can view again anytime — no extra XP.</p>
          ) : (
            <p>Play {3 - gamesPlayed} more different challenge{3 - gamesPlayed !== 1 ? "s" : ""} today to earn snapshot XP.</p>
          )}
        </HealthLabGamePanel>

        <HealthLabGameCta variant="amber" className="mt-6 w-full min-w-0" onClick={handleReveal}>
          {canReward ? "Save Wellness Snapshot" : "View Wellness Snapshot"}
        </HealthLabGameCta>
      </div>
    </HealthLabGameStage>
  );
}
