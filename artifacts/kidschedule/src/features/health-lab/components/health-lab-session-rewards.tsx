import { memo, useRef } from "react";
import { Star, Zap, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import {
  isHealthLabLivingV1Enabled,
  livingSessionCompleteTitle,
} from "@/lib/health-lab/living-room";
import { HEALTH_LAB_THEME } from "../theme";
import { useHealthLabDialogEscape } from "../hooks/use-health-lab-dialog-escape";
import { useHealthLabI18n } from "../hooks/use-health-lab-i18n";
import {
  buildRewardSummary,
  isSimulationResult,
  type SessionCelebration,
} from "../lib/session-rewards-utils";
import { getWorldEvolution } from "../world-evolution";
import { getWorldIdentity, pickWorldLine } from "../world-identity";
import type { GameSessionResult, HealthLabPersistedState } from "../types";
import { HealthLabAvatar } from "./health-lab-avatar";
import { HealthLabWorldMotif } from "./health-lab-world-motif";

type DelightTier = "sparkle" | "stars" | "best" | "magic";

function delightTier(result: GameSessionResult): DelightTier {
  if (result.xpTier === "perfect") return "magic";
  if (result.personalBest) return "best";
  if (result.xpTier === "platinum" || result.xpTier === "gold") return "stars";
  return "sparkle";
}

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
            <span className="text-lg" aria-hidden>
              {item.emoji}
            </span>
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
  const living = isHealthLabLivingV1Enabled();
  const { t } = useHealthLabI18n();
  const continueRef = useRef<HTMLButtonElement>(null);
  useHealthLabDialogEscape(true, onContinue, continueRef);
  const simulated = isSimulationResult(result);
  const summary = buildRewardSummary(result, celebrations, state);
  const world = getWorldIdentity(result.gameId);
  const tierLabel = result.xpTier.charAt(0).toUpperCase() + result.xpTier.slice(1);
  const hasExtras =
    summary.badges.length > 0 ||
    summary.quests.length > 0 ||
    summary.streaks.length > 0 ||
    summary.levelUp != null;

  const tier = delightTier(result);
  const starCount = living
    ? 0
    : tier === "magic"
      ? 16
      : tier === "best"
        ? 12
        : tier === "stars"
          ? 8
          : 5;
  const evolution = getWorldEvolution(state, result.gameId);
  const completeLine = pickWorldLine(world.completeLines, result.timestamp + result.score);
  const headline = living
    ? livingSessionCompleteTitle(!!result.personalBest)
    : evolution.stage >= 1
      ? evolution.milestoneLabel
      : result.personalBest
        ? t("celebration_world_best", "New best in {{world}}!", { world: world.worldName })
        : t("celebration_world_done", "{{world}} complete!", { world: world.worldName });

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-[clamp(0.75rem,4vw,1.25rem)] py-6 sm:py-8",
        living && "health-lab-living-rewards",
      )}
      data-hl-living={living ? "1" : undefined}
    >
      {!reduced && starCount > 0 && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 health-lab-soft-stars",
            tier === "magic" && "health-lab-soft-stars-magic",
          )}
          aria-hidden
        >
          {Array.from({ length: starCount }).map((_, i) => (
            <span
              key={i}
              className={cn("health-lab-soft-star", tier === "magic" && "health-lab-soft-star-bright")}
              style={{
                left: `${8 + (i * 9) % 84}%`,
                top: `${10 + (i * 13) % 70}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={cn(
          "relative w-full max-w-sm overflow-hidden rounded-[1.75rem] border p-6 text-center",
          living
            ? "border-[rgba(232,212,184,0.22)] bg-[rgba(8,6,12,0.88)]"
            : "border-white/15 bg-[#0c1238]/95",
          !reduced && "health-lab-reward-enter",
          !living && tier === "best" && "ring-2 ring-emerald-300/40",
          !living && tier === "magic" && "ring-2 ring-amber-300/50",
          !living && evolution.stage >= 4 && "ring-2 ring-emerald-300/45",
        )}
        role="dialog"
        aria-modal
        aria-labelledby="session-rewards-title"
      >
        {!living && (
          <>
            <div className={cn("pointer-events-none absolute inset-0 opacity-45 bg-gradient-to-br", world.sky)} aria-hidden />
            <HealthLabWorldMotif
              motif={world.motif}
              alive={!reduced}
              stage={evolution.stage}
              friendEmoji={evolution.friendEmoji}
              celebrating
              className="opacity-70"
            />
          </>
        )}

        <div className="relative">
          <p
            className={cn(
              living ? "text-4xl" : "text-5xl",
              !reduced && !living && "health-lab-celebrate-pop",
              !living && (tier === "best" || tier === "magic") && "text-6xl",
            )}
            aria-hidden
          >
            {living ? "✦" : world.celebrateEmoji}
          </p>

          {!living && (
            <div className="mx-auto mt-2 mb-3 flex justify-center">
              <HealthLabAvatar
                avatarId={state.avatarId}
                level={state.level}
                size="md"
                glowing={!reduced}
                equippedItems={state.equippedItems}
              />
            </div>
          )}

          <p
            className={
              living
                ? "mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(232,212,184,0.8)]"
                : "text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-200/85"
            }
          >
            {living
              ? t("living_practice_done", "Practice complete")
              : t("world_restored", "You helped {{world}}", { world: world.worldName })}
          </p>
          <h2
            id="session-rewards-title"
            className={
              living
                ? "mt-1 font-quicksand text-2xl font-bold text-[rgba(255,252,248,0.98)]"
                : "mt-1 font-quicksand text-2xl font-black text-white"
            }
          >
            {headline}
          </h2>
          <p
            className={
              living
                ? "mt-1 text-sm font-medium text-[rgba(232,212,184,0.88)]"
                : "mt-1 text-sm font-semibold text-violet-100/90"
            }
          >
            {living
              ? t("living_complete_line", "A calm step for the body — no rush.")
              : completeLine}
          </p>
          {!living && (
            <p className="mt-0.5 text-xs font-medium text-violet-200/70">
              {evolution.memoryLine || t("great_job", "You did an amazing job")}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            {simulated ? (
              <div
                className={
                  living
                    ? "col-span-2 rounded-xl border border-[rgba(232,212,184,0.2)] bg-[rgba(232,212,184,0.08)] p-4 text-left"
                    : "col-span-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-left"
                }
              >
                <div className={cn("flex items-center gap-2", living ? "text-[rgba(232,212,184,0.9)]" : "text-amber-200")}>
                  <Smartphone className="h-5 w-5 shrink-0" aria-hidden />
                  <p className="text-sm font-bold">
                    {living ? "Gentle practice mode" : "Simulation Mode"}
                  </p>
                </div>
                <p className={cn("mt-2 text-xs leading-relaxed", living ? "text-[rgba(232,212,184,0.78)]" : "text-amber-100/85")}>
                  {living
                    ? "Motion sensing is richer on supported devices. Your effort still counts."
                    : "Motion scoring available on supported devices. Your effort still counts — XP and rewards below!"}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-white/[0.08] p-3">
                  <p
                    className={
                      living
                        ? "text-[10px] font-semibold uppercase tracking-wide text-[rgba(232,212,184,0.65)]"
                        : "text-[10px] font-semibold uppercase tracking-wide text-violet-200/60"
                    }
                  >
                    {living ? t("living_effort", "Effort") : t("score", "Score")}
                  </p>
                  <p className="mt-0.5 font-quicksand text-3xl font-bold text-white">{result.score}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.08] p-3">
                  <p
                    className={
                      living
                        ? "text-[10px] font-semibold uppercase tracking-wide text-[rgba(232,212,184,0.65)]"
                        : "text-[10px] font-semibold uppercase tracking-wide text-violet-200/60"
                    }
                  >
                    {living ? t("living_together", "Together") : t("stat_xp", "XP")}
                  </p>
                  <p
                    className={
                      living
                        ? "mt-0.5 font-quicksand text-xl font-bold text-[rgba(232,212,184,0.92)]"
                        : "mt-0.5 font-quicksand text-3xl font-black text-amber-300"
                    }
                  >
                    {living ? "Noted" : `+${result.xpEarned}`}
                  </p>
                </div>
              </>
            )}
          </div>

          {!living && !simulated && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-violet-100">
              <Zap className="h-3.5 w-3.5 text-amber-300" aria-hidden />
              {tierLabel} · +{result.xpEarned} XP
            </div>
          )}

          {!living && simulated && result.xpEarned > 0 && (
            <div className="mt-3 flex items-center justify-center gap-2 text-amber-300">
              <Star className="h-4 w-4" aria-hidden />
              <span className="text-lg font-bold">+{result.xpEarned} XP earned</span>
            </div>
          )}

          {result.personalBest && !simulated && (
            <p
              className={
                living
                  ? "mt-3 text-sm font-semibold text-[rgba(232,212,184,0.9)]"
                  : "mt-3 text-sm font-bold text-emerald-300"
              }
            >
              {living
                ? t("living_personal_best", "A quiet best for today")
                : t("new_personal_best", "New personal best!")}
            </p>
          )}

          {!living && hasExtras && (
            <>
              {summary.levelUp && <RewardSection title="Level up" items={[summary.levelUp]} />}
              <RewardSection title="New badges" items={summary.badges} />
              <RewardSection title="Quest progress" items={summary.quests} />
              <RewardSection title="Streak" items={summary.streaks} />
            </>
          )}

          {!living && !hasExtras && !simulated && summary.starsEarned > 0 && (
            <p className="mt-4 text-sm text-violet-200/70">⭐ {summary.starsEarned} stars earned</p>
          )}

          <button
            ref={continueRef}
            type="button"
            onClick={onContinue}
            className={cn(
              "mt-6 w-full min-h-[56px] rounded-2xl py-3.5 text-base font-bold",
              "health-lab-pressable",
              living
                ? "border border-[rgba(232,212,184,0.28)] bg-[rgba(232,212,184,0.14)] text-[rgba(255,252,248,0.98)]"
                : cn("font-black text-white", world.ctaClass),
            )}
          >
            {living
              ? t("living_continue", "Back to Care")
              : t("celebration_continue", "Continue")}
          </button>
        </div>
      </div>
    </div>
  );
});
