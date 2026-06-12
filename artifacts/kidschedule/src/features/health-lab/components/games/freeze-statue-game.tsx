import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { computeFreezeScore } from "../../scoring";
import { validateFreezeSession } from "../../anti-cheat";
import { useMotionSensor } from "../../hooks/use-motion-sensor";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { SessionCompleteOptions } from "../../types";

const ROUNDS = 5;

interface Props {
  onComplete: (score: number, durationMs: number, options?: SessionCompleteOptions) => void;
  onExit: () => void;
  childId?: number;
}

export function FreezeStatueGame({ onComplete, onExit, childId }: Props) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<"intro" | "dance" | "freeze" | "check" | "done">("intro");
  const [successes, setSuccesses] = useState(0);
  const [crystals, setCrystals] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState("Crystal Garden Challenge");
  const startRef = useRef(Date.now());
  const freezePeakVariance = useRef(0);
  const sensor = useMotionSensor(phase === "freeze" || phase === "check" || phase === "dance", childId);
  const { playTap, playSuccess, playMiss } = useHealthLabAudio();
  const reduced = useReducedMotion();

  const beginRound = useCallback(() => {
    setPhase("dance");
    setFeedback(null);
    setLiveMsg(`Round ${roundIndex + 1} of ${ROUNDS} — dance with Amy!`);
    const danceDuration = 2000 + Math.random() * 3000;
    setTimeout(() => {
      setPhase("freeze");
      freezePeakVariance.current = 0;
      sensor.resetSamples();
      setFeedback("FREEZE!");
      setLiveMsg("FREEZE! Hold completely still!");
      playTap();
    }, danceDuration);
  }, [roundIndex, playTap, sensor]);

  useEffect(() => {
    if (phase !== "freeze") return;

    const sampleId = window.setInterval(() => {
      freezePeakVariance.current = Math.max(freezePeakVariance.current, sensor.variance);
    }, 50);

    const id = window.setTimeout(() => {
      setPhase("check");
      const verdict = validateFreezeSession(sensor.simulated, freezePeakVariance.current);
      const stable = sensor.stabilityPercent >= 70 && verdict.valid;

      if (stable) {
        setSuccesses((s) => s + 1);
        setCrystals((c) => c + 1);
        setFeedback("Perfect statue! 🌸→💎");
        setLiveMsg("Crystal grown!");
        void playSuccess(true);
      } else {
        setFeedback(sensor.simulated ? "Simulation mode — try with motion sensors!" : "Nice try — stay still next time!");
        playMiss();
      }

      const nextRound = roundIndex + 1;
      setRoundIndex(nextRound);

      const finalSuccesses = stable ? successes + 1 : successes;
      if (nextRound >= ROUNDS) {
        const score = computeFreezeScore(finalSuccesses, ROUNDS);
        void playSuccess(score >= 95);
        onComplete(score, Date.now() - startRef.current, {
          simulated: sensor.simulated,
          eligibleForBadges: verdict.eligibleForBadges && !sensor.simulated,
          cheatFlags: verdict.flags,
        });
        setPhase("done");
      } else {
        setTimeout(beginRound, 1500);
      }
    }, 2500);

    return () => {
      clearTimeout(id);
      clearInterval(sampleId);
    };
  }, [phase, sensor, roundIndex, successes, beginRound, onComplete, playSuccess, playMiss]);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center bg-gradient-to-b from-emerald-500/30 to-teal-800 px-4">
      <HealthLabLiveRegion message={liveMsg} />
      <button type="button" onClick={onExit} className="absolute left-4 top-4 min-h-[48px] text-sm text-white/70 underline">
        Exit
      </button>

      {sensor.simulated && (
        <p className="mb-2 rounded-lg bg-amber-500/20 px-3 py-1 text-xs text-amber-200">
          ⚠️ Simulation mode — badges disabled
        </p>
      )}

      <motion.div
        animate={
          phase === "dance" && !reduced
            ? { rotate: [0, -8, 8, -8, 0], scale: [1, 1.05, 1] }
            : { rotate: 0, scale: 1 }
        }
        transition={{ duration: 0.6, repeat: phase === "dance" ? Infinity : 0 }}
        className="text-7xl"
        aria-hidden
      >
        🧑‍🔬
      </motion.div>

      <h2 className="mt-4 text-xl font-bold text-white">Crystal Garden Challenge</h2>

      {/* Flower / crystal grid */}
      <div className="mt-4 grid grid-cols-5 gap-2" aria-hidden>
        {Array.from({ length: ROUNDS }).map((_, i) => (
          <span key={i} className="text-2xl">
            {i < crystals ? "💎" : phase === "dance" && i === roundIndex ? "🌸" : "🌱"}
          </span>
        ))}
      </div>

      {phase === "intro" && (
        <>
          <p className="mt-3 max-w-sm text-center text-sm text-violet-100">
            Amy dances — when she shouts FREEZE, hold completely still! ({ROUNDS} rounds)
          </p>
          <button
            type="button"
            onClick={() => {
              playTap();
              startRef.current = Date.now();
              setRoundIndex(0);
              setSuccesses(0);
              setCrystals(0);
              beginRound();
            }}
            className="mt-6 min-h-[48px] rounded-2xl bg-emerald-500 px-8 py-3 font-bold text-white"
          >
            Start Dancing
          </button>
        </>
      )}

      {phase === "dance" && <p className="mt-4 text-lg text-white">🎵 Dance with Amy…</p>}
      {phase === "freeze" && (
        <p className={cn("mt-4 text-3xl font-black text-amber-300", !reduced && "animate-pulse")}>
          FREEZE!
        </p>
      )}
      {feedback && <p className="mt-4 text-center text-lg text-white">{feedback}</p>}

      {roundIndex > 0 && phase !== "intro" && (
        <p className="mt-6 text-sm text-white/70">
          Round {Math.min(roundIndex + 1, ROUNDS)}/{ROUNDS} · Crystals: {crystals}
        </p>
      )}
    </div>
  );
}
