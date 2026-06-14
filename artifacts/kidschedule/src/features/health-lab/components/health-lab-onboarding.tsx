import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Gift, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
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
  startLabel = "Start Adventure",
  ctaVariant = "primary",
}: Props) {
  const game = getGameById(gameId);
  const onboarding = GAME_ONBOARDING[gameId];
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), reduced ? 0 : 300);
    return () => clearTimeout(t);
  }, [reduced]);

  return (
    <HealthLabGameStage gameId={gameId} className="items-center justify-center px-4 pb-10">
      <HealthLabGameTopBar onExit={onExit} title={game.title.split(" ")[0]} />

      <motion.div
        className="relative z-[3] flex w-full max-w-md flex-col items-center"
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Title */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/60">
          {game.emoji} Mission Briefing
        </p>
        <h1 className="mt-2 text-center text-2xl font-bold tracking-tight health-lab-title-shine sm:text-3xl">
          {game.title}
        </h1>

        {/* Amy demo */}
        <div className="relative mt-6">
          <div
            className="pointer-events-none absolute -inset-8 rounded-full blur-3xl opacity-40"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)" }}
            aria-hidden
          />
          <HealthLabAmyCharacter
            action={onboarding.demoAction}
            size="lg"
            showDemo
          />
        </div>

        {/* Mission card */}
        <div className="health-lab-timer-glass mt-6 w-full rounded-2xl p-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Mission</p>
          <p className="mt-2 text-base font-semibold leading-relaxed text-white">{onboarding.mission}</p>
        </div>

        {/* One-line instruction */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3.5 backdrop-blur-md">
          <Sparkles className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
          <p className="text-sm font-medium leading-snug text-violet-100/90">{onboarding.instruction}</p>
        </div>

        {/* Duration + Reward */}
        <div className="mt-4 flex w-full gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <Clock className="h-4 w-4 text-cyan-300/80" aria-hidden />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Duration</p>
              <p className="text-xs font-semibold text-white/85">{game.durationHint}</p>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <Gift className="h-4 w-4 text-amber-300/80" aria-hidden />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Reward</p>
              <p className="text-xs font-semibold text-white/85">{onboarding.reward}</p>
            </div>
          </div>
        </div>

        {extraContent}

        {/* Start button */}
        <motion.button
          type="button"
          onClick={onStart}
          className={cn(
            HEALTH_LAB_TOUCH_TARGET,
            "health-lab-cta-premium mt-8 w-full max-w-xs rounded-2xl px-8 py-4 text-base font-bold text-white",
            "shadow-[0_8px_32px_-8px_rgba(251,146,60,0.6)]",
            "active:scale-[0.97] transition-transform",
            !reduced && "health-lab-glow-pulse",
            CTA_VARIANTS[ctaVariant],
          )}
          whileTap={reduced ? undefined : { scale: 0.97 }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Zap className="h-5 w-5" aria-hidden />
            {startLabel}
          </span>
        </motion.button>
      </motion.div>
    </HealthLabGameStage>
  );
}
