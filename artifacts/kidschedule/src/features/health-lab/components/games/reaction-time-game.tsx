import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { REACTION_TIERS } from "../../constants";
import { computeReactionScoreWithPenalties } from "../../scoring";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
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
  const [rocketLaunch, setRocketLaunch] = useState(false);
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
    setRocketLaunch(false);
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
      setRocketLaunch(true);
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
      setRocketLaunch(true);
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

  const phaseIcon =
    phase === "wait" || phase === "intro" || phase === "too-early"
      ? "🛑"
      : phase === "go"
        ? "🚀"
        : "✅";

  const bg =
    phase === "wait" || phase === "intro" || phase === "too-early"
      ? "bg-red-700"
      : phase === "go"
        ? "bg-emerald-600"
        : "bg-indigo-900";

  return (
    <div className={cn("relative flex min-h-[70dvh] w-full flex-col items-center justify-center transition-colors duration-150", bg)}>
      <HealthLabLiveRegion message={liveMsg} />
      <button
        type="button"
        onClick={onExit}
        className="absolute left-4 top-4 z-20 min-h-[48px] rounded-lg px-2 text-sm text-white/80 underline"
      >
        Exit
      </button>

      <button
        type="button"
        className="flex min-h-[70dvh] w-full flex-col items-center justify-center touch-manipulation select-none"
        onClick={handleTap}
        aria-label={phase === "go" ? "Tap now — rocket launch" : "Reaction tap zone"}
      >
        <motion.span
          className="text-6xl"
          animate={rocketLaunch && !reduced ? { y: [0, -80, -200], opacity: [1, 1, 0] } : {}}
          transition={{ duration: 0.8 }}
          aria-hidden
        >
          {phaseIcon}
        </motion.span>
        <h2 className="mt-4 text-xl font-bold text-white">Rocket Launch Academy</h2>

        {phase === "intro" && (
          <p className="mt-4 px-6 text-center text-lg text-white/90">
            Tap to start — wait for 🚀, then tap fast! ({ROUNDS} rounds)
          </p>
        )}
        {phase === "wait" && (
          <p className="mt-4 flex items-center gap-2 text-2xl font-bold text-white">
            <span aria-hidden>🛑</span> Hold… wait for rocket
          </p>
        )}
        {phase === "go" && (
          <p className="mt-4 flex items-center gap-2 text-3xl font-bold text-white">
            <span aria-hidden>🚀</span> LAUNCH — TAP!
          </p>
        )}
        {phase === "too-early" && (
          <p className="mt-4 text-xl text-white">Too early! Wait for 🚀</p>
        )}
        {showTier && <p className="mt-4 text-2xl font-bold text-amber-200 health-lab-score-reveal">{showTier}</p>}

        {ghostBestMs != null && ghostBestMs > 0 && (
          <p className="mt-2 text-xs text-white/60">Ghost best: {ghostBestMs}ms — beat it!</p>
        )}

        {round > 0 && phase !== "intro" && (
          <p className="absolute bottom-8 text-sm text-white/70">
            Round {Math.min(round, ROUNDS)}/{ROUNDS}
            {times.length > 0 && ` · Last: ${times[times.length - 1]}ms`}
            {falseStarts > 0 && ` · False starts: ${falseStarts}`}
          </p>
        )}
      </button>
    </div>
  );
}
