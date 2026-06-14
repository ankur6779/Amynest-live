import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { computeFreezeScore } from "../../scoring";
import { validateFreezeSession } from "../../anti-cheat";
import { useMotionSensor } from "../../hooks/use-motion-sensor";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import {
  HealthLabGameStage,
  HealthLabGameTopBar,
  HealthLabGameCta,
  HealthLabGamePanel,
} from "../health-lab-game-ui";
import {
  HealthLabFilmGrain,
  HealthLabFreezeOverlay,
  HealthLabGardenStage,
  HealthLabMissionBanner,
  HealthLabPhaseFlash,
  HealthLabRoundRail,
  HealthLabStarfield,
} from "../health-lab-cinematic";
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
    <HealthLabGameStage gameId="freeze-statue" className="items-center justify-center px-4 pb-10">
      <HealthLabLiveRegion message={liveMsg} />
      <HealthLabGameTopBar onExit={onExit} title="Crystal Garden" />
      <HealthLabStarfield count={24} />
      <HealthLabFilmGrain />
      <HealthLabFreezeOverlay active={phase === "freeze"} />
      <HealthLabPhaseFlash active={phase === "freeze"} color="rgba(34,211,238,0.3)" />
      <HealthLabPhaseFlash active={!!feedback?.includes("Perfect")} color="rgba(52,211,153,0.35)" />

      {sensor.simulated && (
        <HealthLabGamePanel className="relative z-[3] mb-4 text-xs text-amber-200">
          ⚠️ Simulation mode — badges disabled
        </HealthLabGamePanel>
      )}

      {phase !== "intro" && (
        <HealthLabRoundRail
          current={Math.min(roundIndex, ROUNDS - 1)}
          total={ROUNDS}
          label="Crystal rounds"
          className="relative z-[3] mb-4 w-full"
        />
      )}

      <motion.div
        animate={
          phase === "dance" && !reduced
            ? { rotate: [0, -8, 8, -8, 0], scale: [1, 1.05, 1] }
            : { rotate: 0, scale: 1 }
        }
        transition={{ duration: 0.6, repeat: phase === "dance" ? Infinity : 0 }}
        className="relative z-[3] flex h-28 w-28 items-center justify-center rounded-[1.75rem] border border-white/20 bg-gradient-to-br from-emerald-500/20 to-teal-900/30 text-6xl shadow-[0_16px_48px_-12px_rgba(45,212,191,0.45)] backdrop-blur-md"
        aria-hidden
      >
        🧑‍🔬
        {phase === "dance" && !reduced && (
          <motion.div
            className="absolute -inset-3 rounded-[2rem] border border-emerald-300/20"
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.08, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>

      <h2 className="relative z-[3] mt-5 text-2xl font-bold tracking-tight health-lab-title-shine sm:text-3xl">
        Crystal Garden Challenge
      </h2>

      <div className="relative z-[3] mt-5 w-full max-w-sm">
        <HealthLabGardenStage
          phase={phase}
          crystals={crystals}
          roundIndex={roundIndex}
          total={ROUNDS}
          reduced={reduced}
        />
      </div>

      {phase === "intro" && (
        <>
          <p className="relative z-[3] mt-4 max-w-sm text-center text-sm leading-relaxed text-violet-100/80">
            Amy dances — when she shouts FREEZE, hold completely still! ({ROUNDS} rounds)
          </p>
          <HealthLabGameCta
            variant="emerald"
            className="relative z-[3] mt-8"
            onClick={() => {
              playTap();
              startRef.current = Date.now();
              setRoundIndex(0);
              setSuccesses(0);
              setCrystals(0);
              beginRound();
            }}
          >
            Start Dancing
          </HealthLabGameCta>
        </>
      )}

      <div className="relative z-[3] mt-5 w-full max-w-sm">
        <AnimatePresence mode="wait">
          {phase === "dance" && (
            <HealthLabMissionBanner
              key="dance"
              eyebrow="Dance phase"
              title="🎵 Dance with Amy…"
              subtitle="Get ready to freeze!"
              tone="neutral"
            />
          )}
          {phase === "freeze" && (
            <HealthLabMissionBanner
              key="freeze"
              eyebrow="Statue mode"
              title="FREEZE!"
              subtitle="Hold completely still"
              tone="freeze"
            />
          )}
          {feedback && phase !== "dance" && phase !== "freeze" && (
            <HealthLabMissionBanner
              key="feedback"
              eyebrow={feedback.includes("Perfect") ? "Crystal grown" : "Keep trying"}
              title={feedback}
              tone={feedback.includes("Perfect") ? "success" : "neutral"}
            />
          )}
        </AnimatePresence>
      </div>

      {roundIndex > 0 && phase !== "intro" && (
        <p className="relative z-[3] mt-6 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-sm text-white/65">
          Round {Math.min(roundIndex + 1, ROUNDS)}/{ROUNDS} · Crystals: {crystals}
        </p>
      )}
    </HealthLabGameStage>
  );
}
