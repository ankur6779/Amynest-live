import { memo } from "react";
import { Star, Zap, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import { HEALTH_LAB_THEME } from "../theme";
import { useHealthLabI18n } from "../hooks/use-health-lab-i18n";
import {
  buildRewardSummary,
  isSimulationResult,
  type SessionCelebration,
} from "../lib/session-rewards-utils";
import type { GameSessionResult, HealthLabPersistedState } from "../types";
import { HealthLabAvatar } from "./health-lab-avatar";

interface Props {
  result: GameSessionResult;
  celebrations: SessionCelebration[];
  state: HealthLabPersistedState;
  onContinue: () => void;
}

function RewardSection({
  title,
  items,
}: {
  title: string;
  items: { emoji: string; label: string; detail?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300/60">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li
            key={`${title}-${item.label}`}
            className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2"
          >
            <span className="text-lg" aria-hidden>{item.emoji}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{item.label}</p>
              {item.detail && <p className="text-xs text-violet-200/65">{item.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const HealthLabSessionRewards = memo(function HealthLabSessionRewards({
  result,
  celebrations,
  state,
  onContinue,
}: Props) {
  const reduced = useReducedMotion();
  const { t } = useHealthLabI18n();
  const simulated = isSimulationResult(result);
  const summary = buildRewardSummary(result, celebrations, state);
  const tierLabel = result.xpTier.charAt(0).toUpperCase() + result.xpTier.slice(1);
  const hasExtras =
    summary.badges.length > 0 ||
    summary.quests.length > 0 ||
    summary.streaks.length > 0 ||
    summary.levelUp != null;

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 py-8">
      <div
        className={cn(
          HEALTH_LAB_THEME.cardGlass,
          "w-full max-w-sm p-6 text-center",
          !reduced && "health-lab-reward-enter",
        )}
        role="dialog"
        aria-modal
        aria-labelledby="session-rewards-title"
      >
        <div className="mx-auto mb-3 flex justify-center">
          <HealthLabAvatar
            avatarId={state.avatarId}
            level={state.level}
            size="md"
            glowing={!reduced}
            equippedItems={state.equippedItems}
          />
        </div>

        <h2 id="session-rewards-title" className="text-2xl font-bold text-white">
          {t("challenge_complete", "Challenge Complete!")}
        </h2>
        <p className="mt-1 text-sm text-violet-200/80">{t("great_job", "You did an amazing job")}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {simulated ? (
            <div className="col-span-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-left">
              <div className="flex items-center gap-2 text-amber-200">
                <Smartphone className="h-5 w-5 shrink-0" aria-hidden />
                <p className="text-sm font-bold">Simulation Mode</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-amber-100/85">
                Motion scoring available on supported devices. Your effort still counts — XP and rewards below!
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-white/[0.06] p-3">
                <p className="text-[10px] uppercase text-violet-300/60">{t("score", "Score")}</p>
                <p className="text-2xl font-bold text-white">{result.score}</p>
              </div>
              <div className="rounded-xl bg-white/[0.06] p-3">
                <p className="text-[10px] uppercase text-violet-300/60">{t("stat_xp", "XP")}</p>
                <p className="text-2xl font-bold text-amber-300">+{result.xpEarned}</p>
              </div>
            </>
          )}
        </div>

        {!simulated && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-4 py-1.5 text-xs text-violet-200">
            <Zap className="h-3.5 w-3.5 text-amber-300" aria-hidden />
            {tierLabel} · +{result.xpEarned} XP
          </div>
        )}

        {simulated && result.xpEarned > 0 && (
          <div className="mt-3 flex items-center justify-center gap-2 text-amber-300">
            <Star className="h-4 w-4" aria-hidden />
            <span className="text-lg font-bold">+{result.xpEarned} XP earned</span>
          </div>
        )}

        {result.personalBest && !simulated && (
          <p className="mt-3 text-sm font-semibold text-emerald-400">
            🎉 {t("new_personal_best", "New personal best!")}
          </p>
        )}

        {hasExtras && (
          <>
            {summary.levelUp && (
              <RewardSection title="Level up" items={[summary.levelUp]} />
            )}
            <RewardSection title="New badges" items={summary.badges} />
            <RewardSection title="Quest progress" items={summary.quests} />
            <RewardSection title="Streak" items={summary.streaks} />
          </>
        )}

        {!hasExtras && !simulated && summary.starsEarned > 0 && (
          <p className="mt-4 text-sm text-violet-200/70">
            ⭐ {summary.starsEarned} stars earned
          </p>
        )}

        <button
          type="button"
          onClick={onContinue}
          className={cn(
            "mt-6 w-full min-h-[48px] rounded-2xl py-3.5 text-base font-bold text-white",
            HEALTH_LAB_THEME.ctaPrimary,
          )}
        >
          {t("celebration_continue", "Continue")}
        </button>
      </div>
    </div>
  );
});
