import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FLAMINGO_DIFFICULTIES, FLAMINGO_MIN_DURATION } from "../../constants";
import { computeBalanceScore } from "../../scoring";
import { validateFlamingoSession, applyCheatMultiplier } from "../../anti-cheat";
import { useMotionSensor } from "../../hooks/use-motion-sensor";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { SessionCompleteOptions } from "../../types";

interface Props {
  onComplete: (score: number, durationMs: number, options?: SessionCompleteOptions) => void;
  onExit: () => void;
  childId?: number;
}

export function FlamingoBalanceGame({ onComplete, onExit, childId }: Props) {
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [difficulty, setDifficulty] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [weather, setWeather] = useState<"calm" | "wind">("calm");
  const [liveMsg, setLiveMsg] = useState("Sky Island Survival — choose your difficulty");
  const startRef = useRef<number | null>(null);
  const stabilitySamples = useRef<number[]>([]);
  const varianceSamples = useRef<number[]>([]);
  const sensor = useMotionSensor(phase === "playing", childId);
  const { playTap, playSuccess } = useHealthLabAudio();
  const reduced = useReducedMotion();

  const minDuration = FLAMINGO_MIN_DURATION[difficulty] ?? 15;

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (startRef.current) {
        const sec = (Date.now() - startRef.current) / 1000;
        setElapsed(sec);
        stabilitySamples.current.push(sensor.stabilityPercent);
        varianceSamples.current.push(sensor.variance);
        if (Math.random() < 0.02 + difficulty * 0.005) {
          setWeather((w) => (w === "calm" ? "wind" : "calm"));
        }
        if (sec >= minDuration && sensor.stabilityPercent >= 50) {
          finish();
        }
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sensor.stabilityPercent, sensor.variance, difficulty, minDuration]);

  const finishingRef = useRef(false);

  const finish = useCallback(() => {
    if (phase !== "playing" || finishingRef.current) return;
    finishingRef.current = true;
    setPhase("done");
    const durationMs = startRef.current ? Date.now() - startRef.current : 0;
    const avgStability =
      stabilitySamples.current.length > 0
        ? stabilitySamples.current.reduce((a, b) => a + b, 0) / stabilitySamples.current.length
        : 50;
    const avgVariance =
      varianceSamples.current.length > 0
        ? varianceSamples.current.reduce((a, b) => a + b, 0) / varianceSamples.current.length
        : sensor.variance;

    const verdict = validateFlamingoSession({
      durationSeconds: elapsed,
      avgStability,
      variance: avgVariance,
      simulated: sensor.simulated,
      minDurationSeconds: minDuration,
    });

    let score = applyCheatMultiplier(
      computeBalanceScore(elapsed, avgStability, difficulty),
      verdict,
    );
    void playSuccess(score >= 90);
    setLiveMsg(`Balance complete. Score ${score}`);
    onComplete(score, durationMs, {
      cheatFlags: verdict.flags,
      simulated: sensor.simulated,
      eligibleForBadges: verdict.eligibleForBadges,
      eligibleForXp: verdict.eligibleForXp,
    });
  }, [phase, elapsed, difficulty, sensor, minDuration, onComplete, playSuccess]);

  const wobble = reduced ? 0 : (100 - sensor.stabilityPercent) * (0.3 + difficulty * 0.08) + (weather === "wind" ? 4 : 0);

  if (phase === "intro") {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4">
        <HealthLabLiveRegion message={liveMsg} />
        <button type="button" onClick={onExit} className="absolute left-4 top-4 min-h-[48px] text-sm text-white/70 underline">
          Exit
        </button>
        <span className="text-6xl">🦩</span>
        <h2 className="mt-4 text-xl font-bold text-white">Sky Island Survival</h2>
        <p className="mt-2 max-w-sm text-center text-sm text-violet-200/80">
          Stand on one leg. Hold the phone steady. Survive wind gusts for at least {minDuration}s!
        </p>
        {sensor.simulated && (
          <p className="mt-2 rounded-lg bg-amber-500/20 px-3 py-2 text-xs text-amber-200">
            ⚠️ Simulation mode — badge rewards disabled. Enable motion sensors for full experience.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {FLAMINGO_DIFFICULTIES.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => { setDifficulty(i); playTap(); }}
              className={cn(
                "min-h-[48px] rounded-full px-4 py-2 text-sm",
                difficulty === i ? "bg-violet-500 text-white" : "bg-white/10 text-violet-200",
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            playTap();
            startRef.current = Date.now();
            stabilitySamples.current = [];
            varianceSamples.current = [];
            setElapsed(0);
            setPhase("playing");
            setLiveMsg("Keep the island steady!");
          }}
          className="mt-8 min-h-[48px] rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-8 py-3.5 font-bold text-white"
        >
          Start Survival
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[70dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-400 to-indigo-700 px-4">
      <HealthLabLiveRegion message={liveMsg} />
      <button type="button" onClick={onExit} className="absolute left-4 top-4 z-10 min-h-[48px] text-sm text-white/70 underline">
        Exit
      </button>

      {weather === "wind" && !reduced && (
        <p className="absolute top-16 text-sm font-bold text-amber-200 animate-pulse" aria-hidden>💨 Wind gust!</p>
      )}

      {!reduced && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {[...Array(6)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-xs opacity-50"
              style={{ left: `${i * 18}%`, top: `${20 + (i % 3) * 25}%` }}
              animate={{ y: [0, -30, 0], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity }}
            >
              ✨
            </motion.span>
          ))}
        </div>
      )}

      <motion.div
        className="relative h-40 w-64 rounded-[50%] bg-gradient-to-br from-emerald-400/80 to-teal-600/80 shadow-xl"
        animate={{ rotate: wobble, x: wobble * 2, y: wobble }}
        transition={{ type: "spring", stiffness: 200, damping: 10 }}
      >
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl">🦩</span>
      </motion.div>

      <p className="mt-6 font-mono text-3xl font-bold text-white">{elapsed.toFixed(1)}s</p>
      <p className="mt-2 text-sm text-white/80">
        Stability: {Math.round(sensor.stabilityPercent)}% · Need {minDuration}s
      </p>

      {elapsed < minDuration && (
        <p className="mt-4 text-xs text-amber-200">Keep balancing… {(minDuration - elapsed).toFixed(0)}s to go</p>
      )}
    </div>
  );
}
