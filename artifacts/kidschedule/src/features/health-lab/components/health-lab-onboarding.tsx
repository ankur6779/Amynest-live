import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Gift, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import {
  isHealthLabLivingV1Enabled,
  livingPracticeBriefingEyebrow,
  livingPracticeStartCta,
} from "@/lib/health-lab/living-room";
import { GAME_ONBOARDING, getGameById } from "../constants";
import type { HealthGameId } from "../types";
import { HealthLabAmyCharacter } from "./health-lab-amy-character";
import { HealthLabGameStage, HealthLabGameTopBar } from "./health-lab-game-ui";
import { HEALTH_LAB_TOUCH_TARGET } from "../theme";

interface Props {
  gameId: HealthGameId;
  onStart: () => void;
  onExit: () => void;
  extraContent?: ReactNode;
  startLabel?: string;
  ctaVariant?: "primary" | "rose" | "emerald" | "violet" | "amber";
}

const CTA_VARIANTS = {
  primary: "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500",
  rose: "bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500",
  emerald: "bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500",
  violet: "bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-500",
  amber: "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500",
};

export function HealthLabGameOnboarding({
  gameId,
  onStart,
  onExit,
  extraContent,
  startLabel,
  ctaVariant = "primary",
}: Props) {
  const game = getGameById(gameId);
  const onboarding = GAME_ONBOARDING[gameId];
  const reduced = useReducedMotion();
  const living = isHealthLabLivingV1Enabled();
  const [ready, setReady] = useState(false);
  const resolvedStart =
    startLabel ?? (living ? livingPracticeStartCta() : "Start Adventure");

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), reduced ? 0 : 300);
    return () => clearTimeout(t);
  }, [reduced]);

  return (
    <HealthLabGameStage
      gameId={gameId}
      fullBleed
      className={cn(
        "health-lab-game-stage-scroll px-[clamp(0.75rem,4vw,1.25rem)]",
        living && "hl-living-deep",
      )}
    >
      <div className="relative z-20 shrink-0">
        <HealthLabGameTopBar onExit={onExit} title={living ? "Care" : game.title.split(" ")[0]} />
      </div>

      <motion.div
        className="relative z-[3] mx-auto flex w-full max-w-md flex-col items-center py-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: reduced || living ? 0.25 : 0.5, ease: "easeOut" }}
      >
        <p className={cn(living ? "hl-living-deep-eyebrow" : "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/60")}>
          {living ? livingPracticeBriefingEyebrow() : `${game.emoji} Mission Briefing`}
        </p>
        <h1
          className={cn(
            "mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl",
            living ? "hl-living-deep-title" : "health-lab-title-shine",
          )}
        >
          {game.title}
        </h1>

        <div className="relative mt-6">
          {!living && (
            <div
              className="pointer-events-none absolute -inset-8 rounded-full blur-3xl opacity-40"
              style={{ background: "radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)" }}
              aria-hidden
            />
          )}
          <HealthLabAmyCharacter
            action={onboarding.demoAction}
            size="lg"
            showDemo
          />
        </div>

        <div
          className={cn(
            "mt-6 w-full rounded-2xl p-5 text-center",
            living ? "hl-living-deep-panel" : "health-lab-timer-glass",
          )}
        >
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.16em]",
              living ? "text-[rgba(232,212,184,0.65)]" : "text-white/45",
            )}
          >
            {living ? "What we are doing" : "Mission"}
          </p>
          <p className="mt-2 text-base font-semibold leading-relaxed text-white">{onboarding.mission}</p>
        </div>

        <div
          className={cn(
            "mt-4 flex items-center gap-3 rounded-2xl px-5 py-3.5",
            living
              ? "hl-living-deep-panel"
              : "border border-white/15 bg-white/[0.06] backdrop-blur-md",
          )}
        >
          {!living && <Sparkles className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />}
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              living ? "text-[rgba(255,252,248,0.92)]" : "text-violet-100/90",
            )}
          >
            {onboarding.instruction}
          </p>
        </div>

        <div className="mt-4 flex w-full gap-3">
          <div
            className={cn(
              "flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5",
              living
                ? "border border-[rgba(232,212,184,0.16)] bg-[rgba(8,6,12,0.35)]"
                : "border border-white/10 bg-white/[0.04]",
            )}
          >
            <Clock
              className={cn("h-4 w-4", living ? "text-[rgba(232,212,184,0.8)]" : "text-cyan-300/80")}
              aria-hidden
            />
            <div>
              <p
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-wider",
                  living ? "text-[rgba(232,212,184,0.55)]" : "text-white/40",
                )}
              >
                {living ? "Time together" : "Duration"}
              </p>
              <p className="text-xs font-semibold text-white/85">{game.durationHint}</p>
            </div>
          </div>
          {!living ? (
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <Gift className="h-4 w-4 text-amber-300/80" aria-hidden />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Reward</p>
                <p className="text-xs font-semibold text-white/85">{onboarding.reward}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[rgba(232,212,184,0.16)] bg-[rgba(8,6,12,0.35)] px-3 py-2.5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[rgba(232,212,184,0.55)]">
                  What next
                </p>
                <p className="text-xs font-semibold text-white/85">A quiet practice note</p>
              </div>
            </div>
          )}
        </div>

        {extraContent}

        <motion.button
          type="button"
          onClick={onStart}
          className={cn(
            HEALTH_LAB_TOUCH_TARGET,
            "mt-8 w-full max-w-xs rounded-2xl px-8 py-4 text-base font-bold",
            living
              ? "hl-living-deep-primary-btn"
              : cn(
                  "health-lab-cta-premium text-white shadow-[0_8px_32px_-8px_rgba(251,146,60,0.6)]",
                  "active:scale-[0.97] transition-transform",
                  !reduced && "health-lab-glow-pulse",
                  CTA_VARIANTS[ctaVariant],
                ),
          )}
          whileTap={reduced || living ? undefined : { scale: 0.97 }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            {!living && <Zap className="h-5 w-5" aria-hidden />}
            {resolvedStart}
          </span>
        </motion.button>
      </motion.div>
    </HealthLabGameStage>
  );
}
