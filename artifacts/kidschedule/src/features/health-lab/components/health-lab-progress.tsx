import { BADGES, DAILY_QUESTS, GAMES, HEALTH_LEVELS, getLevelForXp, getPrestigeTier } from "../constants";
import { HEALTH_LAB_THEME } from "../theme";
import type { HealthLabPersistedState } from "../types";
import { HealthLabAvatar } from "./health-lab-avatar";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export function HealthLabProgress({
  state,
  onBack,
}: {
  state: HealthLabPersistedState;
  onBack: () => void;
}) {
  const level = getLevelForXp(state.totalXp, state.prestige);
  const prestigeLabel = getPrestigeTier(state.prestige);

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 pb-28 pt-4">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-2 text-violet-200 hover:bg-white/10"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-white">Your Progress</h1>
      </header>

      <div className={cn(HEALTH_LAB_THEME.cardGlass, "flex items-center gap-4 p-5")}>
        <HealthLabAvatar avatarId={state.avatarId} level={state.level} size="lg" glowing equippedItems={state.equippedItems} />
        <div>
          <p className="text-sm text-violet-200/70">Health Level {state.level}</p>
          <p className="text-xl font-bold text-white">{level.name}</p>
          <p className="mt-1 text-sm text-amber-300">{state.totalXp} XP · {state.coins} coins</p>
          {prestigeLabel && <p className="text-xs text-cyan-300/80">Prestige: {prestigeLabel}</p>}
          {state.questStreakDays > 0 && (
            <p className="text-xs text-violet-300/70">Quest streak: {state.questStreakDays} days</p>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-white">Level Journey</h2>
        <div className="space-y-2">
          {HEALTH_LEVELS.map((l) => {
            const unlocked = state.totalXp >= l.xpRequired;
            return (
              <div
                key={l.id}
                className={cn(
                  HEALTH_LAB_THEME.cardGlass,
                  "flex items-center gap-3 p-3",
                  !unlocked && "opacity-50",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold">
                  {l.id}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-white">{l.name}</p>
                  <p className="text-xs text-violet-300/60">{l.xpRequired} XP</p>
                </div>
                {unlocked && <span className="text-emerald-400 text-sm">Unlocked</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-white">Badges ({state.badges.length}/{BADGES.length})</h2>
        <div className="grid grid-cols-2 gap-2">
          {BADGES.map((b) => {
            const earned = state.badges.some((x) => x.id === b.id);
            return (
              <div
                key={b.id}
                className={cn(
                  HEALTH_LAB_THEME.cardGlass,
                  "p-3 text-center",
                  !earned && "opacity-40 grayscale",
                )}
              >
                <span className="text-2xl" aria-hidden>{b.emoji}</span>
                <p className="mt-1 text-xs font-medium text-white">{b.name}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-white">Personal Bests</h2>
        <div className="space-y-2">
          {GAMES.map((g) => (
            <div key={g.id} className={cn(HEALTH_LAB_THEME.cardGlass, "flex items-center gap-3 p-3")}>
              <span className="text-xl">{g.emoji}</span>
              <span className="flex-1 text-sm text-white">{g.title}</span>
              <span className="font-bold text-amber-300">
                {state.personalBests[g.id] ?? "—"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-white">Daily Quests</h2>
        <div className="space-y-2">
          {DAILY_QUESTS.map((q) => {
            const p = state.dailyQuests?.quests.find((x) => x.id === q.id);
            return (
              <div key={q.id} className={cn(HEALTH_LAB_THEME.cardGlass, "p-3")}>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-white">{q.title}</span>
                  {p?.completedAt ? (
                    <span className="text-xs text-emerald-400">Done</span>
                  ) : (
                    <span className="text-xs text-violet-300/60">
                      {p?.progress ?? 0}/{q.target}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
