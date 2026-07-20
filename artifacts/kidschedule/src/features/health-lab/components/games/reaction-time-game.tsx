import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GUIDANCE_MESSAGES, REACTION_TIERS } from "../../constants";
import { computeReactionScoreWithPenalties } from "../../scoring";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import { HealthLabGameStage, HealthLabGameTopBar } from "../health-lab-game-ui";
import {
  HealthLabLaunchPad,
  HealthLabMissionBanner,
  HealthLabPhaseFlash,
  HealthLabRoundRail,
  HealthLabStarfield,
} from "../health-lab-cinematic";
import { HealthLabGameOnboarding } from "../health-lab-onboarding";
import { HealthLabGuidance } from "../health-lab-amy-character";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { SessionCompleteOptions } from "../../types";

const ROUNDS = 5;

interface Props {
  onComplete: (score: number, durationMs: number, options?: SessionCompleteOptions) => void;
  onExit: () => void;
  ghostBestMs?: number;
}

type Phase = "onboarding" | "countdown" | "wait" | "go" | "too-early" | "result";

export function ReactionTimeGame({ onComplete, onExit, ghostBestMs }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("onboarding");
  const [times, setTimes] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState(0);
  const [comboStreak, setComboStreak] = useState(0);
  const [showTier, setShowTier] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [liveMsg, setLiveMsg] = useState("Rocket Launch Academy");
  const goTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startRef = useRef(Date.now());
  const { playTap, playSuccess, playMiss, playCombo, playCelebration } = useHealthLabAudio();
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
    const delay = 2000 + Math.random() * 5000;
    timeoutRef.current = window.setTimeout(() => {
      goTimeRef.current = Date.now();
      setPhase("go");
      setLiveMsg("Launch! Tap now!");
      playTap();
    }, delay);
  }, [playTap, round]);

  const beginGame = useCallback(() => {
    playTap();
    startRef.current = Date.now();
    setRound(1);
    setPhase("countdown");
    setCountdown(3);
    setLiveMsg("Get ready for launch!");
  }, [playTap]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      startRound();
      return;
    }
    const id = window.setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(id);
  }, [phase, countdown, startRound]);

  useEffect(() => () => clearTimer(), []);

  const finishGame = useCallback(
    (allTimes: number[], fs: number) => {
      const avg = allTimes.reduce((a, b) => a + b, 0) / ROUNDS;
      const score = computeReactionScoreWithPenalties(avg, fs);
      setPhase("result");
      void playCelebration();
      setLiveMsg(`Mission complete! Average ${Math.round(avg)} milliseconds`);
      setTimeout(() => onComplete(score, Date.now() - startRef.current), 1500);
    },
    [onComplete, playCelebration],
  );

  const handleTap = () => {
    if (phase === "onboarding") return;
    if (phase === "countdown") return;

    if (phase === "wait") {
      clearTimer();
      playMiss();
      setFalseStarts((f) => f + 1);
      setComboStreak(0);
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

      if (ms < 300) {
        setComboStreak((s) => {
          const next = s + 1;
          if (next >= 2) playCombo(next);
          return next;
        });
      } else {
        setComboStreak(0);
      }

      void playSuccess(ms < 250);
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

  const megaLaunch = comboStreak >= 3;
  const phaseStyles =
    phase === "wait" || phase === "countdown" || phase === "too-early"
      ? "from-red-950/95 via-rose-950/90 to-slate-950/95"
      : phase === "go"
        ? "from-emerald-950/95 via-teal-900/90 to-cyan-950/95"
        : "from-indigo-950/95 via-violet-950/90 to-slate-950/95";

  if (phase === "onboarding") {
    return (
      <HealthLabGameOnboarding
        gameId="reaction-time"
        onExit={onExit}
        onStart={beginGame}
        startLabel="Launch Mission"
        ctaVariant="amber"
      />
    );
  }

  return (
    <HealthLabGameStage
      gameId="reaction-time"
      fullBleed
      className={cn("transition-colors duration-500", `bg-gradient-to-b ${phaseStyles}`)}
    >
      <HealthLabLiveRegion message={liveMsg} />
      <div className="relative z-20 shrink-0">
        <HealthLabGameTopBar onExit={onExit} title="Rocket Launch" />
      </div>
      <HealthLabStarfield count={16} />
      <HealthLabPhaseFlash active={phase === "go"} color="rgba(16,185,129,0.45)" />
      <HealthLabPhaseFlash active={phase === "too-early"} color="rgba(244,63,94,0.35)" />

      {round > 0 && (
        <HealthLabRoundRail
          current={Math.min(round - 1, ROUNDS - 1)}
          total={ROUNDS}
          label="Mission progress"
          className="relative z-[3] shrink-0 px-3 pt-2"
        />
      )}

      <button
        type="button"
        className="health-lab-game-region-grow relative z-[3] touch-manipulation select-none px-4 pb-6 sm:px-6"
        onClick={handleTap}
        aria-label={phase === "go" ? "Tap now — rocket launch" : "Reaction tap zone"}
      >
        <HealthLabLaunchPad
          phase={phase === "countdown" ? "countdown" : phase}
          reduced={reduced}
          comboStreak={comboStreak}
          megaLaunch={megaLaunch}
        />

        {phase === "countdown" && (
          <motion.p
            className="mt-6 text-6xl font-bold text-amber-300"
            key={countdown}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {countdown > 0 ? countdown : "GO!"}
          </motion.p>
        )}

        <h2 className="mt-6 text-[clamp(1.25rem,5vw,1.875rem)] font-bold tracking-tight health-lab-title-shine">
          Rocket Launch Academy
        </h2>

        <div className="mt-4">
          <HealthLabGuidance messages={GUIDANCE_MESSAGES.tap} intervalMs={3500} />
        </div>

        <div className="mt-5 w-full max-w-sm">
          <AnimatePresence mode="wait">
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

        {round > 0 && (
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
