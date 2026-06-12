import { useMemo } from "react";
import { aggregateWellnessFromHistory } from "../../scoring";
import { canRewardCalmnessSnapshot, distinctGamesToday } from "../../anti-cheat";
import { HEALTH_LAB_THEME } from "../../theme";
import { dateKeyLocal } from "../../storage";
import { progressStory, weeklySummary } from "../../dashboard-utils";
import type { HealthLabPersistedState } from "../../types";
import { HealthLabAvatar } from "../health-lab-avatar";
import { HealthLabLiveRegion } from "../health-lab-live-region";
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
    <div className="mx-auto max-w-lg px-4 py-8">
      <HealthLabLiveRegion message="Amy Wellness Report" />
      <button type="button" onClick={onExit} className="mb-4 min-h-[48px] text-sm text-white/70 underline">
        Exit
      </button>

      <div className="text-center">
        <span className="text-5xl">✨</span>
        <h2 className="mt-3 text-2xl font-bold text-white">Amy Wellness Report</h2>
        <p className="mt-2 text-sm text-violet-200/80">
          Your wellness signature — powered by all your Health Lab adventures
        </p>
      </div>

      <div className={cn(HEALTH_LAB_THEME.cardGlass, "mt-6 flex flex-col items-center p-6")}>
        <HealthLabAvatar avatarId={state.avatarId} level={state.level} size="lg" glowing equippedItems={state.equippedItems} />
        <p className="mt-3 text-4xl font-bold text-amber-300">{scores?.overall ?? "—"}</p>
        <p className="text-sm text-violet-200/70">Overall Wellness Score</p>
        <p className="mt-3 text-center text-sm text-violet-100/80">{narrative}</p>
      </div>

      {scores ? (
        <div className="mt-4 space-y-3">
          {METRICS.map((m) => (
            <div key={m.key} className={cn(HEALTH_LAB_THEME.cardGlass, "p-4")}>
              <div className="flex items-center justify-between">
                <span className="text-base text-white">
                  {m.emoji} {m.label}
                </span>
                <span className="text-lg font-bold text-white">{scores[m.key]}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r", m.gradient)}
                  style={{ width: `${scores[m.key]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-center text-amber-300/80">
          Play at least one challenge to unlock your wellness report!
        </p>
      )}

      <div className={cn(HEALTH_LAB_THEME.cardGlass, "mt-4 p-4")}>
        <p className="text-xs font-semibold uppercase text-violet-300/70">Weekly insight</p>
        <p className="mt-1 text-sm text-white/90">{weekInsight}</p>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-violet-200/80">
        {canReward ? (
          <p>✅ Daily snapshot available ({gamesPlayed}/3 games played). Earn XP once today!</p>
        ) : state.calmnessRewardedToday ? (
          <p>Snapshot saved today. You can view again anytime — no extra XP.</p>
        ) : (
          <p>Play {3 - gamesPlayed} more different challenge{3 - gamesPlayed !== 1 ? "s" : ""} today to earn snapshot XP.</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleReveal}
        className={cn("mt-6 w-full min-h-[48px] rounded-2xl py-3.5 text-lg font-bold", HEALTH_LAB_THEME.ctaPrimary)}
      >
        {canReward ? "Save Wellness Snapshot" : "View Wellness Snapshot"}
      </button>
    </div>
  );
}
