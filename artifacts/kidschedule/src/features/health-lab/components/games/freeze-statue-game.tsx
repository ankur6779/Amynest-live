import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GUIDANCE_MESSAGES } from "../../constants";
import { computeFreezeScore } from "../../scoring";
import { validateFreezeSession } from "../../anti-cheat";
import { useMotionSensor } from "../../hooks/use-motion-sensor";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import { HealthLabGameStage, HealthLabGameTopBar, HealthLabGamePanel } from "../health-lab-game-ui";
import {
  HealthLabFreezeOverlay,
  HealthLabGardenStage,
  HealthLabMissionBanner,
  HealthLabPhaseFlash,
  HealthLabRoundRail,
  HealthLabStarfield,
} from "../health-lab-cinematic";
import { HealthLabGameOnboarding } from "../health-lab-onboarding";
import { HealthLabMotionCalibration } from "../health-lab-motion-calibration";
import { HealthLabMotionDebugOverlay } from "../health-lab-debug-overlay";
import { HealthLabAmyCharacter, HealthLabGuidance } from "../health-lab-amy-character";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { SessionCompleteOptions } from "../../types";

const ROUNDS = 5;

interface Props {
  onComplete: (score: number, durationMs: number, options?: SessionCompleteOptions) => void;
  onExit: () => void;
  childId?: number;
}

type Phase = "onboarding" | "calibrating" | "dance" | "freeze" | "check" | "done";

export function FreezeStatueGame({ onComplete, onExit, childId }: Props) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("onboarding");
  const [successes, setSuccesses] = useState(0);
  const [crystals, setCrystals] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState("Crystal Garden Challenge");
  const startRef = useRef(Date.now());
  const freezePeakVariance = useRef(0);

  const sensorActive = phase === "calibrating" || phase === "dance" || phase === "freeze" || phase === "check";
  const sensor = useMotionSensor(sensorActive, childId);
  const { playTap, playSuccess, playMiss, playMilestone, playCelebration } = useHealthLabAudio();
  const reduced = useReducedMotion();

  const beginCalibration = useCallback(async () => {
    playTap();
    setPhase("calibrating");
    await sensor.runCalibration();
    startRef.current = Date.now();
    setRoundIndex(0);
    setSuccesses(0);
    setCrystals(0);
    beginRound(0);
  }, [playTap, sensor]);

  const beginRound = useCallback((round = roundIndex) => {
    setPhase("dance");
    setFeedback(null);
    setLiveMsg(`Round ${round + 1} of ${ROUNDS} — dance with Amy!`);
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
      const stable = sensor.stabilityPercent >= 65 && verdict.valid;

      if (stable) {
        setSuccesses((s) => s + 1);
        setCrystals((c) => c + 1);
        setFeedback("Perfect statue! 🌸→💎");
        setLiveMsg("Crystal grown!");
        void playSuccess(true);
        void playMilestone();
      } else {
        setFeedback(sensor.simulated ? "Simulation mode — try with motion sensors!" : "Nice try — stay still next time!");
        playMiss();
      }

      const nextRound = roundIndex + 1;
      setRoundIndex(nextRound);

      const finalSuccesses = stable ? successes + 1 : successes;
      if (nextRound >= ROUNDS) {
        const score = computeFreezeScore(finalSuccesses, ROUNDS);
        void playCelebration();
        onComplete(score, Date.now() - startRef.current, {
          simulated: sensor.simulated,
          eligibleForBadges: verdict.eligibleForBadges && !sensor.simulated,
          cheatFlags: verdict.flags,
        });
        setPhase("done");
      } else {
        setTimeout(() => beginRound(nextRound), 1500);
      }
    }, 2500);

    return () => {
      clearTimeout(id);
      clearInterval(sampleId);
    };
  }, [phase, sensor, roundIndex, successes, beginRound, onComplete, playSuccess, playMiss, playMilestone, playCelebration]);

  if (phase === "onboarding") {
    return (
      <HealthLabGameOnboarding
        gameId="freeze-statue"
        onExit={onExit}
        onStart={beginCalibration}
        startLabel="Start Dancing"
        ctaVariant="emerald"
        extraContent={
          sensor.simulated ? (
            <HealthLabGamePanel className="mt-4 w-full text-center text-xs text-amber-200">
              Simulation mode — badges disabled
            </HealthLabGamePanel>
          ) : undefined
        }
      />
    );
  }

  return (
    <HealthLabGameStage gameId="freeze-statue" className="items-center justify-center px-4 pb-10">
      <HealthLabLiveRegion message={liveMsg} />
      <HealthLabGameTopBar onExit={onExit} title="Crystal Garden" />
      <HealthLabStarfield count={16} />
      <HealthLabFreezeOverlay active={phase === "freeze"} />
      <HealthLabPhaseFlash active={phase === "freeze"} color="rgba(34,211,238,0.3)" />
      <HealthLabPhaseFlash active={!!feedback?.includes("Perfect")} color="rgba(52,211,153,0.35)" />
      <HealthLabMotionDebugOverlay sensor={sensor} />

      {phase === "calibrating" && (
        <HealthLabMotionCalibration progress={sensor.calibrationProgress} />
      )}

      {phase !== "calibrating" && (
        <HealthLabRoundRail
          current={Math.min(roundIndex, ROUNDS - 1)}
          total={ROUNDS}
          label="Crystal rounds"
          className="relative z-[3] mb-4 w-full"
        />
      )}

      <HealthLabAmyCharacter
        action="freeze"
        size="lg"
        showDemo={phase === "dance"}
        mood={phase === "freeze" ? "focused" : feedback?.includes("Perfect") ? "celebrate" : "happy"}
        className="relative z-[3]"
      />

      <h2 className="relative z-[3] mt-4 text-2xl font-bold tracking-tight health-lab-title-shine sm:text-3xl">
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

      <div className="relative z-[3] mt-4">
        <HealthLabGuidance
          messages={
            phase === "freeze"
              ? ["Hold still!", "Don't move!", "Statue mode!"]
              : phase === "dance"
                ? GUIDANCE_MESSAGES.freeze.slice(0, 2)
                : GUIDANCE_MESSAGES.freeze
          }
        />
      </div>

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

      {roundIndex > 0 && phase !== "calibrating" && (
        <p className="relative z-[3] mt-6 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-sm text-white/65">
          Round {Math.min(roundIndex + 1, ROUNDS)}/{ROUNDS} · Crystals: {crystals}
        </p>
      )}
    </HealthLabGameStage>
  );
}
