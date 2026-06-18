import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GUIDANCE_MESSAGES } from "../../constants";
import { computeFreezeScore } from "../../scoring";
import { validateFreezeSession } from "../../anti-cheat";
import { useMotionSensor } from "../../hooks/use-motion-sensor";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import { HealthLabGameStage, HealthLabGameTopBar, HealthLabGamePanel } from "../health-lab-game-ui";
import { HealthLabPhaseFlash, HealthLabRoundRail, HealthLabStarfield } from "../health-lab-cinematic";
import { HealthLabGameOnboarding } from "../health-lab-onboarding";
import { HealthLabMotionCalibration } from "../health-lab-motion-calibration";
import { HealthLabMotionDebugOverlay } from "../health-lab-debug-overlay";
import { useReducedMotion } from "@/lib/reduced-motion";
import { cn } from "@/lib/utils";
import { playProceduralTone } from "@/lib/procedural-sfx";
import type { SessionCompleteOptions } from "../../types";
import {
  CRYSTAL_GARDEN_ROUNDS,
  getFreezeMotionTier,
  getGardenStage,
  getStatueRating,
  ROUND_CELEBRATIONS,
  STATUE_MESSAGES,
  type StatueRating,
} from "./crystal-garden/crystal-garden-constants";
import { CrystalGardenAmy } from "./crystal-garden/crystal-garden-amy";
import { CrystalGardenScene } from "./crystal-garden/crystal-garden-scene";
import {
  preloadCrystalGardenDance,
  useCrystalGardenDanceMusic,
} from "./crystal-garden/crystal-garden-audio";
import {
  CrystalGardenDanceLights,
  CrystalGardenFreezeCinematic,
  CrystalGardenMotionMeter,
  CrystalGardenRoundCelebration,
  CrystalGardenStatueAura,
  CrystalGardenVictory,
} from "./crystal-garden/crystal-garden-effects";

interface Props {
  onComplete: (score: number, durationMs: number, options?: SessionCompleteOptions) => void;
  onExit: () => void;
  childId?: number;
}

type Phase =
  | "onboarding"
  | "calibrating"
  | "dance"
  | "freeze"
  | "check"
  | "roundCelebration"
  | "finalVictory"
  | "done";

function playFreezeDramatic(): void {
  playProceduralTone(180, 120, "sawtooth", 0.035);
  setTimeout(() => playProceduralTone(90, 200, "sine", 0.04), 60);
  setTimeout(() => playProceduralTone(880, 150, "sine", 0.03), 100);
}

function playCrystalShimmer(): void {
  [1047, 1319, 1568].forEach((freq, i) => {
    setTimeout(() => playProceduralTone(freq, 90, "sine", 0.035), i * 70);
  });
}

export function FreezeStatueGame({ onComplete, onExit, childId }: Props) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("onboarding");
  const [successes, setSuccesses] = useState(0);
  const [crystals, setCrystals] = useState(0);
  const [statueRating, setStatueRating] = useState<StatueRating | null>(null);
  const [roundCelebration, setRoundCelebration] = useState<(typeof ROUND_CELEBRATIONS)[number] | null>(null);
  const [showFinalVictory, setShowFinalVictory] = useState(false);
  const [freezeCinematic, setFreezeCinematic] = useState(false);
  const [liveMsg, setLiveMsg] = useState("Help Amy restore the magical Crystal Garden!");
  const startRef = useRef(Date.now());
  const freezePeakVariance = useRef(0);
  const pendingScoreRef = useRef<{ score: number; options: SessionCompleteOptions } | null>(null);

  const sensorActive =
    phase === "calibrating" ||
    phase === "dance" ||
    phase === "freeze" ||
    phase === "check" ||
    phase === "roundCelebration";
  const sensor = useMotionSensor(sensorActive, childId);
  const { playTap, playSuccess, playMiss, playMilestone, playCompletion } = useHealthLabAudio();
  const reduced = useReducedMotion();

  const gardenStage = getGardenStage(crystals);
  const motionTier = getFreezeMotionTier(sensor.stabilityPercent, sensor.variance);
  const amyMode =
    phase === "dance"
      ? "dance"
      : phase === "freeze"
        ? "freeze"
        : phase === "roundCelebration" || showFinalVictory
          ? "celebrate"
          : "idle";

  useCrystalGardenDanceMusic(phase === "dance" && !reduced);

  useEffect(() => {
    if (phase === "onboarding" || phase === "calibrating") {
      preloadCrystalGardenDance();
    }
  }, [phase]);

  const beginRound = useCallback(
    (round: number) => {
      setPhase("dance");
      setStatueRating(null);
      setRoundCelebration(null);
      setLiveMsg(`Round ${round + 1} of ${CRYSTAL_GARDEN_ROUNDS} — dance to grow crystals!`);
      const danceDuration = 2200 + Math.random() * 2800;
      setTimeout(() => {
        setFreezeCinematic(true);
        playFreezeDramatic();
        setTimeout(() => setFreezeCinematic(false), 700);
        setPhase("freeze");
        freezePeakVariance.current = 0;
        sensor.resetSamples();
        setLiveMsg("FREEZE! Become a crystal statue!");
        playTap();
      }, danceDuration);
    },
    [playTap, sensor],
  );

  const beginCalibration = useCallback(async () => {
    playTap();
    setPhase("calibrating");
    setLiveMsg("Hold device still for calibration");
    await sensor.runCalibration();
    startRef.current = Date.now();
    setRoundIndex(0);
    setSuccesses(0);
    setCrystals(0);
    beginRound(0);
  }, [playTap, sensor, beginRound]);

  const finishSession = useCallback(() => {
    const pending = pendingScoreRef.current;
    if (!pending) return;
    onComplete(pending.score, Date.now() - startRef.current, pending.options);
    setPhase("done");
  }, [onComplete]);

  const handleVictoryDismiss = useCallback(() => {
    setShowFinalVictory(false);
    finishSession();
  }, [finishSession]);

  useEffect(() => {
    if (phase !== "freeze") return;

    const sampleId = window.setInterval(() => {
      freezePeakVariance.current = Math.max(freezePeakVariance.current, sensor.variance);
    }, 50);

    const id = window.setTimeout(() => {
      setPhase("check");
      const verdict = validateFreezeSession(sensor.simulated, freezePeakVariance.current);
      const rating = getStatueRating(
        sensor.stabilityPercent,
        freezePeakVariance.current,
        sensor.simulated,
      );
      setStatueRating(rating);
      const stable = rating !== "fail" && verdict.valid;

      if (stable) {
        const newSuccesses = successes + 1;
        const newCrystals = crystals + 1;
        setSuccesses(newSuccesses);
        setCrystals(newCrystals);
        setLiveMsg(STATUE_MESSAGES[rating]);
        void playSuccess(rating === "master");
        void playMilestone();
        playCrystalShimmer();

        const celebration = ROUND_CELEBRATIONS[roundIndex];
        setRoundCelebration(celebration ?? null);
        setPhase("roundCelebration");

        const nextRound = roundIndex + 1;
        setRoundIndex(nextRound);

        if (nextRound >= CRYSTAL_GARDEN_ROUNDS) {
          const score = computeFreezeScore(newSuccesses, CRYSTAL_GARDEN_ROUNDS);
          pendingScoreRef.current = {
            score,
            options: {
              simulated: sensor.simulated,
              eligibleForBadges: verdict.eligibleForBadges && !sensor.simulated,
              cheatFlags: verdict.flags,
            },
          };
          setTimeout(() => {
            setPhase("finalVictory");
            setShowFinalVictory(true);
            void playCompletion();
          }, 2600);
        } else {
          setTimeout(() => beginRound(nextRound), 2600);
        }
      } else {
        setLiveMsg(sensor.simulated ? "Try with motion sensors for the full magic!" : "So close — freeze like a statue next time!");
        playMiss();

        const nextRound = roundIndex + 1;
        setRoundIndex(nextRound);

        if (nextRound >= CRYSTAL_GARDEN_ROUNDS) {
          const score = computeFreezeScore(successes, CRYSTAL_GARDEN_ROUNDS);
          pendingScoreRef.current = {
            score,
            options: {
              simulated: sensor.simulated,
              eligibleForBadges: verdict.eligibleForBadges && !sensor.simulated,
              cheatFlags: verdict.flags,
            },
          };
          setShowFinalVictory(true);
          void playCompletion();
          setPhase("finalVictory");
        } else {
          setTimeout(() => beginRound(nextRound), 2000);
        }
      }
    }, 2500);

    return () => {
      clearTimeout(id);
      clearInterval(sampleId);
    };
  }, [
    phase,
    sensor,
    roundIndex,
    successes,
    crystals,
    beginRound,
    playSuccess,
    playMiss,
    playMilestone,
    playCompletion,
  ]);

  if (phase === "onboarding") {
    return (
      <HealthLabGameOnboarding
        gameId="freeze-statue"
        onExit={onExit}
        onStart={() => {
          preloadCrystalGardenDance();
          void beginCalibration();
        }}
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
    <HealthLabGameStage
      gameId="freeze-statue"
      fullBleed
      className={cn(
        "relative h-[100dvh] overflow-hidden",
        phase === "dance"
          ? "bg-gradient-to-b from-violet-900/95 via-fuchsia-950/85 to-emerald-900/80"
          : "bg-gradient-to-b from-indigo-950/90 via-violet-950/80 to-emerald-950/70",
      )}
    >
      <HealthLabLiveRegion message={liveMsg} />
      <HealthLabStarfield count={18} />
      <CrystalGardenDanceLights active={phase === "dance" && !reduced} />
      <HealthLabPhaseFlash active={phase === "freeze"} color="rgba(34,211,238,0.35)" />
      <HealthLabPhaseFlash
        active={statueRating !== null && statueRating !== "fail"}
        color="rgba(52,211,153,0.35)"
      />
      <HealthLabMotionDebugOverlay sensor={sensor} />
      <CrystalGardenFreezeCinematic active={freezeCinematic} reduced={reduced} />

      <div className="relative z-20 shrink-0">
        <HealthLabGameTopBar onExit={onExit} title="Crystal Garden" />
      </div>

      {phase === "calibrating" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center">
          <HealthLabMotionCalibration progress={sensor.calibrationProgress} />
        </div>
      )}

      {phase !== "calibrating" && (
        <div className="absolute left-0 right-0 top-[3.75rem] z-[3] px-4">
          <HealthLabRoundRail
            current={Math.min(roundIndex, CRYSTAL_GARDEN_ROUNDS - 1)}
            total={CRYSTAL_GARDEN_ROUNDS}
            label="Crystal rounds"
          />
          <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/60">
            {gardenStage.label}
          </p>
        </div>
      )}

      {/* Amy + garden playfield */}
      {phase !== "calibrating" && (
        <div className="absolute inset-x-0 bottom-[9.5rem] top-[6.5rem] z-[2] flex flex-col items-center justify-center gap-3 px-4">
          <CrystalGardenAmy mode={amyMode} />

          {statueRating && statueRating !== "fail" && phase === "check" && (
            <motion.p
              className="rounded-full border border-cyan-300/40 bg-cyan-500/20 px-5 py-2 text-sm font-bold text-cyan-50"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {STATUE_MESSAGES[statueRating]}
            </motion.p>
          )}

          <div className="relative w-full max-w-md">
            <CrystalGardenStatueAura
              active={phase === "check" && statueRating !== null && statueRating !== "fail"}
              rating={statueRating === "fail" ? null : statueRating}
              reduced={reduced}
            />
            <CrystalGardenRoundCelebration
              show={phase === "roundCelebration" && roundCelebration != null}
              emoji={roundCelebration?.emoji ?? "💎"}
              label={roundCelebration?.label ?? ""}
              reduced={reduced}
            />
            <CrystalGardenScene
              stage={gardenStage}
              phase={phase}
              reduced={reduced}
              blooming={phase === "roundCelebration"}
            />
          </div>
        </div>
      )}

      {/* FIXED bottom HUD */}
      {phase !== "calibrating" && (
        <>
          <div
            className="absolute left-4 z-30"
            style={{ bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
          >
            <CrystalGardenMotionMeter
              tier={motionTier}
              stability={sensor.stabilityPercent}
              active={phase === "freeze" || phase === "check"}
            />
          </div>

          <div
            className="absolute right-4 z-30 rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 text-center backdrop-blur-md"
            style={{ bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
          >
            <p className="font-mono text-xl font-bold tabular-nums text-white">{crystals}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/45">Crystals</p>
          </div>

          <p className="pointer-events-none absolute bottom-1 left-0 right-0 z-20 px-16 text-center text-[10px] text-white/50">
            {phase === "dance"
              ? GUIDANCE_MESSAGES.freeze[0]
              : phase === "freeze"
                ? "Hold completely still!"
                : GUIDANCE_MESSAGES.freeze[Math.min(roundIndex, GUIDANCE_MESSAGES.freeze.length - 1)]}
          </p>
        </>
      )}

      <CrystalGardenVictory
        show={showFinalVictory}
        successes={successes}
        reduced={reduced}
        onDismiss={handleVictoryDismiss}
      />
    </HealthLabGameStage>
  );
}
