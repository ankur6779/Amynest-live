import { BADGES, DAILY_QUESTS, GAMES, HEALTH_LEVELS, getLevelForXp, getPrestigeTier } from "../constants";
import { HEALTH_LAB_THEME, HEALTH_LAB_TOUCH_TARGET } from "../theme";
import type { HealthLabPersistedState } from "../types";
import { HealthLabAvatar } from "./health-lab-avatar";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import {
  isHealthLabLivingV1Enabled,
  livingProgressEffortLabel,
  livingProgressPageTitle,
} from "@/lib/health-lab/living-room";

export function HealthLabProgress({
  state,
  onBack,
}: {
  state: HealthLabPersistedState;
  onBack: () => void;
}) {
  const living = isHealthLabLivingV1Enabled();
  const level = getLevelForXp(state.totalXp, state.prestige);
  const prestigeLabel = getPrestigeTier(state.prestige);

  return (
    <div
      className={cn(
        "mx-auto max-w-lg space-y-5 px-4 pb-28 pt-4",
        living && "hl-living-deep rounded-none",
      )}
      data-hl-living={living ? "1" : undefined}
    >
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            HEALTH_LAB_TOUCH_TARGET,
            "rounded-full p-2",
            living
              ? "text-[rgba(232,212,184,0.9)] hover:bg-[rgba(232,212,184,0.1)]"
              : "text-violet-200 hover:bg-white/10",
          )}
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className={cn("text-lg font-bold", living ? "hl-living-deep-title" : "text-white")}>
          {living ? livingProgressPageTitle() : "Your Progress"}
        </h1>
      </header>

      <div
        className={cn(
          living ? "hl-living-deep-panel flex items-center gap-4 p-5" : cn(HEALTH_LAB_THEME.cardGlass, "flex items-center gap-4 p-5"),
        )}
      >
        {!living && (
          <HealthLabAvatar avatarId={state.avatarId} level={state.level} size="lg" glowing equippedItems={state.equippedItems} />
        )}
        <div>
          <p className={cn("text-sm", living ? "text-[rgba(232,212,184,0.72)]" : "text-violet-200/70")}>
            {living ? livingProgressEffortLabel() : `Health Level ${state.level}`}
          </p>
          <p className={cn("text-xl font-bold", living ? "text-[rgba(255,252,248,0.96)]" : "text-white")}>
            {living ? "Continuing gently" : level.name}
          </p>
          <p className={cn("mt-1 text-sm", living ? "text-[rgba(232,212,184,0.78)]" : "text-amber-300")}>
            {living
              ? `${state.personalBests ? Object.keys(state.personalBests).length : 0} practices noted`
              : `${state.totalXp} XP · ${state.coins} coins`}
          </p>
          {!living && prestigeLabel && <p className="text-xs text-cyan-300/80">Prestige: {prestigeLabel}</p>}
          {!living && state.questStreakDays > 0 && (
            <p className="text-xs text-violet-300/70">Quest streak: {state.questStreakDays} days</p>
          )}
          {living && state.questStreakDays > 0 && (
            <p className="text-xs text-[rgba(232,212,184,0.65)]">Showing up · {state.questStreakDays} days</p>
          )}
        </div>
      </div>

      {!living && (
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
      )}

      <section>
        <h2 className={cn("mb-2 text-sm font-semibold", living ? "text-[rgba(232,212,184,0.88)]" : "text-white")}>
          {living ? `Moments noted (${state.badges.length})` : `Badges (${state.badges.length}/${BADGES.length})`}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {BADGES.map((b) => {
            const earned = state.badges.some((x) => x.id === b.id);
            if (living && !earned) return null;
            return (
              <div
                key={b.id}
                className={cn(
                  living ? "hl-living-deep-panel p-3 text-center" : cn(HEALTH_LAB_THEME.cardGlass, "p-3 text-center"),
                  !living && !earned && "opacity-40 grayscale",
                )}
              >
                <span className="text-2xl" aria-hidden>{living ? "✦" : b.emoji}</span>
                <p className="mt-1 text-xs font-medium text-white">{b.name}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className={cn("mb-2 text-sm font-semibold", living ? "text-[rgba(232,212,184,0.88)]" : "text-white")}>
          {living ? "Quiet bests" : "Personal Bests"}
        </h2>
        <div className="space-y-2">
          {GAMES.map((g) => (
            <div
              key={g.id}
              className={cn(
                living ? "hl-living-deep-panel flex items-center gap-3 p-3" : cn(HEALTH_LAB_THEME.cardGlass, "flex items-center gap-3 p-3"),
              )}
            >
              <span className="text-xl">{g.emoji}</span>
              <span className="flex-1 text-sm text-white">{g.title}</span>
              <span className={cn("font-bold", living ? "text-[rgba(232,212,184,0.9)]" : "text-amber-300")}>
                {state.personalBests[g.id] ?? "—"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {!living && (
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
      )}
    </div>
  );
}
