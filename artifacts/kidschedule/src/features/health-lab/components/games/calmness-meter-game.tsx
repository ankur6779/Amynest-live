import { useMemo } from "react";
import { aggregateWellnessFromHistory } from "../../scoring";
import { canRewardCalmnessSnapshot, distinctGamesToday } from "../../anti-cheat";
import { HEALTH_LAB_THEME } from "../../theme";
import { dateKeyLocal } from "../../storage";
import { progressStory, weeklySummary } from "../../dashboard-utils";
import type { HealthLabPersistedState } from "../../types";
import { HealthLabAvatar } from "../health-lab-avatar";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import {
  HealthLabGameStage,
  HealthLabGameTopBar,
  HealthLabGameHero,
  HealthLabGameCta,
  HealthLabGamePanel,
} from "../health-lab-game-ui";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { cn } from "@/lib/utils";

interface Props {
  state: HealthLabPersistedState;
  onComplete: (score: number, durationMs: number, options?: import("../../types").SessionCompleteOptions) => void;
  onExit: () => void;
}

const METRICS = [
  { key: "focus" as const, label: "Focus Power", emoji: "🎯", gradient: HEALTH_LAB_THEME.metricFocus },
  { key: "calmness" as const, label: "Calmness", emoji: "🧘", gradient: HEALTH_LAB_THEME.metricCalm },
  { key: "balance" as const, label: "Balance", emoji: "⚖️", gradient: HEALTH_LAB_THEME.metricBalance },
  { key: "coordination" as const, label: "Coordination", emoji: "🤸", gradient: HEALTH_LAB_THEME.metricCoord },
  { key: "consistency" as const, label: "Consistency", emoji: "📈", gradient: HEALTH_LAB_THEME.metricConsistency },
];

export function CalmnessMeterGame({ state, onComplete, onExit }: Props) {
  const { playTap, playSuccess } = useHealthLabAudio();

  const scores = useMemo(() => {
    if (state.gameHistory.length === 0) {
      return null;
    }
    return aggregateWellnessFromHistory(state.gameHistory);
  }, [state.gameHistory]);

  const canReward = canRewardCalmnessSnapshot(
    state.gamesCompletedToday,
    state.calmnessRewardedToday,
  );
  const gamesPlayed = distinctGamesToday(state.gamesCompletedToday);
  const narrative = scores ? progressStory(state) : "Complete challenges to build your wellness profile.";
  const weekInsight = weeklySummary(state);

  const handleReveal = () => {
    playTap();
    const overall = scores?.overall ?? 0;
    void playSuccess(overall >= 85);
    onComplete(overall, 500, {
      eligibleForXp: canReward,
      achievementUnlocked: canReward ? undefined : "Snapshot saved (no XP — play 3 games first or already claimed today)",
    });
  };

  return (
    <HealthLabGameStage gameId="calmness-meter" className="pb-10">
      <HealthLabLiveRegion message="Amy Wellness Report" />
      <HealthLabGameTopBar onExit={onExit} title="Wellness Report" />

      <div className="mx-auto max-w-lg px-4">
        <HealthLabGameHero
          gameId="calmness-meter"
          emoji="✨"
          title="Amy Wellness Report"
          subtitle="Your wellness signature — powered by all your Health Lab adventures"
        />

        <div className={cn(HEALTH_LAB_THEME.cardGlass, "mt-6 flex flex-col items-center border-white/[0.12] bg-white/[0.05] p-6 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)]")}>
          <HealthLabAvatar avatarId={state.avatarId} level={state.level} size="lg" glowing equippedItems={state.equippedItems} />
          <p className="mt-3 text-5xl font-bold tabular-nums text-amber-300">{scores?.overall ?? "—"}</p>
          <p className="text-xs uppercase tracking-wider text-violet-200/60">Overall Wellness Score</p>
          <p className="mt-3 text-center text-sm leading-relaxed text-violet-100/80">{narrative}</p>
        </div>

        {scores ? (
          <div className="mt-4 space-y-3">
            {METRICS.map((m) => (
              <div key={m.key} className={cn(HEALTH_LAB_THEME.cardGlass, "border-white/[0.1] bg-white/[0.04] p-4")}>
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-white">
                    {m.emoji} {m.label}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-white">{scores[m.key]}</span>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_12px_-2px_rgba(255,255,255,0.3)]", m.gradient)}
                    style={{ width: `${scores[m.key]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <HealthLabGamePanel className="mt-4 text-center text-amber-300/90">
            Play at least one challenge to unlock your wellness report!
          </HealthLabGamePanel>
        )}

        <HealthLabGamePanel className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-300/70">Weekly insight</p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/90">{weekInsight}</p>
        </HealthLabGamePanel>

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
