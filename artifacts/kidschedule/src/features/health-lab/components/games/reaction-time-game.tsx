import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { REACTION_TIERS } from "../../constants";
import { computeReactionScoreWithPenalties } from "../../scoring";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import { HealthLabGameStage, HealthLabGameTopBar } from "../health-lab-game-ui";
import {
  HealthLabFilmGrain,
  HealthLabLaunchPad,
  HealthLabMissionBanner,
  HealthLabPhaseFlash,
  HealthLabRoundRail,
  HealthLabStarfield,
} from "../health-lab-cinematic";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { SessionCompleteOptions } from "../../types";

const ROUNDS = 5;

interface Props {
  onComplete: (score: number, durationMs: number, options?: SessionCompleteOptions) => void;
  onExit: () => void;
  ghostBestMs?: number;
}

type Phase = "intro" | "wait" | "go" | "too-early" | "result";

export function ReactionTimeGame({ onComplete, onExit, ghostBestMs }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [times, setTimes] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState(0);
  const [showTier, setShowTier] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState("Rocket Launch Academy — wait for the rocket signal");
  const goTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startRef = useRef(Date.now());
  const { playTap, playSuccess, playMiss } = useHealthLabAudio();
  const reduced = useReducedMotion();

  const clearTimer = () => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startRound = useCallback(() => {
    clearTimer();
    setPhase("wait");
    setShowTier(null);
    goTimeRef.current = null;
    setLiveMsg(`Round ${round || 1}: Wait for launch signal`);
    const delay = 2000 + Math.random() * 6000;
    timeoutRef.current = window.setTimeout(() => {
      goTimeRef.current = Date.now();
      setPhase("go");
      setLiveMsg("Launch! Tap now!");
      playTap();
    }, delay);
  }, [playTap, round]);

  useEffect(() => () => clearTimer(), []);

  const finishGame = useCallback(
    (allTimes: number[], fs: number) => {
      const avg = allTimes.reduce((a, b) => a + b, 0) / ROUNDS;
      const score = computeReactionScoreWithPenalties(avg, fs);
      setPhase("result");
      setLiveMsg(`Mission complete! Average ${Math.round(avg)} milliseconds`);
      setTimeout(() => onComplete(score, Date.now() - startRef.current), 1500);
    },
    [onComplete],
  );

  const handleTap = () => {
    if (phase === "intro") {
      playTap();
      startRef.current = Date.now();
      setRound(1);
      startRound();
      return;
    }
    if (phase === "wait") {
      clearTimer();
      playMiss();
      setFalseStarts((f) => f + 1);
      setPhase("too-early");
      setLiveMsg("Too early! Wait for the rocket signal");
      return;
    }
    if (phase === "go" && goTimeRef.current) {
      const ms = Date.now() - goTimeRef.current;
      const tier = REACTION_TIERS.find((t) => ms < t.maxMs)!;
      setShowTier(`${tier.emoji} ${tier.label}!`);
      const nextTimes = [...times, ms];
      setTimes(nextTimes);
      void playSuccess(ms < 300);
      if (round >= ROUNDS) {
        finishGame(nextTimes, falseStarts);
      } else {
        setRound((r) => r + 1);
        setTimeout(startRound, 1200);
      }
      setLiveMsg(`Reaction ${ms} milliseconds — ${tier.label}`);
    }
    if (phase === "too-early") {
      startRound();
    }
  };

  const phaseStyles =
    phase === "wait" || phase === "intro" || phase === "too-early"
      ? "from-red-950/95 via-rose-950/90 to-slate-950/95"
      : phase === "go"
        ? "from-emerald-950/95 via-teal-900/90 to-cyan-950/95"
        : "from-indigo-950/95 via-violet-950/90 to-slate-950/95";

  return (
    <HealthLabGameStage className={cn("transition-colors duration-500", `bg-gradient-to-b ${phaseStyles}`)}>
      <HealthLabLiveRegion message={liveMsg} />
      <HealthLabGameTopBar onExit={onExit} title="Rocket Launch" />
      <HealthLabStarfield count={32} />
      <HealthLabFilmGrain />
      <HealthLabPhaseFlash
        active={phase === "go"}
        color="rgba(16,185,129,0.45)"
      />
      <HealthLabPhaseFlash
        active={phase === "too-early"}
        color="rgba(244,63,94,0.35)"
      />

      {round > 0 && phase !== "intro" && (
        <HealthLabRoundRail
          current={Math.min(round - 1, ROUNDS - 1)}
          total={ROUNDS}
          label="Mission progress"
          className="relative z-[3] pt-2"
        />
      )}

      <button
        type="button"
        className="relative z-[3] flex flex-1 w-full flex-col items-center justify-center touch-manipulation select-none px-6 pb-10"
        onClick={handleTap}
        aria-label={phase === "go" ? "Tap now — rocket launch" : "Reaction tap zone"}
      >
        <HealthLabLaunchPad phase={phase} reduced={reduced} />

        <h2 className="mt-8 text-2xl font-bold tracking-tight health-lab-title-shine sm:text-3xl">
          Rocket Launch Academy
        </h2>

        <div className="mt-5 w-full max-w-sm">
          <AnimatePresence mode="wait">
            {phase === "intro" && (
              <HealthLabMissionBanner
                key="intro"
                eyebrow="Mission briefing"
                title="Await the launch signal"
                subtitle={`Tap to start — then tap fast when 🚀 appears (${ROUNDS} rounds)`}
              />
            )}
            {phase === "wait" && (
              <HealthLabMissionBanner
                key="wait"
                eyebrow="T-minus hold"
                title="🛑 Stand by…"
                subtitle="Do not tap until the rocket turns green"
                tone="danger"
              />
            )}
            {phase === "go" && (
              <HealthLabMissionBanner
                key="go"
                eyebrow="Launch authorized"
                title="🚀 LAUNCH — TAP NOW!"
                subtitle="Reaction window open"
                tone="go"
              />
            )}
            {phase === "too-early" && (
              <HealthLabMissionBanner
                key="early"
                eyebrow="Abort sequence"
                title="Too early!"
                subtitle="Wait for the rocket — tap to retry"
                tone="danger"
              />
            )}
            {phase === "result" && (
              <HealthLabMissionBanner
                key="result"
                eyebrow="Mission complete"
                title="✅ All launches successful"
                subtitle="Calculating pilot score…"
                tone="success"
              />
            )}
          </AnimatePresence>
        </div>

        {showTier && (
          <motion.p
            className="mt-5 text-2xl font-bold text-amber-200 health-lab-score-reveal"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {showTier}
          </motion.p>
        )}

        {ghostBestMs != null && ghostBestMs > 0 && (
          <p className="mt-3 text-xs text-white/50">Ghost best: {ghostBestMs}ms — beat it!</p>
        )}

        {round > 0 && phase !== "intro" && (
          <p className="mt-auto pt-8 text-sm text-white/50">
            Round {Math.min(round, ROUNDS)}/{ROUNDS}
            {times.length > 0 && ` · Last: ${times[times.length - 1]}ms`}
            {falseStarts > 0 && ` · False starts: ${falseStarts}`}
          </p>
        )}
      </button>
    </HealthLabGameStage>
  );
}
