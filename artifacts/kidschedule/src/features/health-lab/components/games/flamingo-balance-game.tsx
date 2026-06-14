import { useCallback, useEffect, useRef, useState } from "react";
import { FLAMINGO_DIFFICULTIES, FLAMINGO_MIN_DURATION, GUIDANCE_MESSAGES } from "../../constants";
import { computeBalanceScore } from "../../scoring";
import { validateFlamingoSession, applyCheatMultiplier } from "../../anti-cheat";
import { useMotionSensor } from "../../hooks/use-motion-sensor";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import { HealthLabGameStage, HealthLabGameTopBar, HealthLabGameChips, HealthLabGamePanel } from "../health-lab-game-ui";
import {
  HealthLabMissionBanner,
  HealthLabSkyIslandScene,
  HealthLabStarfield,
} from "../health-lab-cinematic";
import { HealthLabGameOnboarding } from "../health-lab-onboarding";
import { HealthLabMotionCalibration } from "../health-lab-motion-calibration";
import { HealthLabMotionDebugOverlay } from "../health-lab-debug-overlay";
import { HealthLabGuidance } from "../health-lab-amy-character";
import { HealthLabBalanceRing, HealthLabProgressRing } from "../health-lab-progress-ring";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { SessionCompleteOptions } from "../../types";

interface Props {
  onComplete: (score: number, durationMs: number, options?: SessionCompleteOptions) => void;
  onExit: () => void;
  childId?: number;
}

type Phase = "onboarding" | "calibrating" | "playing" | "done";

export function FlamingoBalanceGame({ onComplete, onExit, childId }: Props) {
  const [phase, setPhase] = useState<Phase>("onboarding");
  const [difficulty, setDifficulty] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [weather, setWeather] = useState<"calm" | "wind">("calm");
  const [liveMsg, setLiveMsg] = useState("Sky Island Survival");
  const startRef = useRef<number | null>(null);
  const stabilitySamples = useRef<number[]>([]);
  const varianceSamples = useRef<number[]>([]);
  const finishingRef = useRef(false);

  const sensorActive = phase === "calibrating" || phase === "playing";
  const sensor = useMotionSensor(sensorActive, childId);
  const { playTap, playSuccess, playMilestone } = useHealthLabAudio();
  const reduced = useReducedMotion();

  const minDuration = FLAMINGO_MIN_DURATION[difficulty] ?? 15;
  const progress = Math.min(1, elapsed / minDuration);

  const beginCalibration = useCallback(async () => {
    playTap();
    setPhase("calibrating");
    setLiveMsg("Hold device still for calibration");
    await sensor.runCalibration();
    startRef.current = Date.now();
    stabilitySamples.current = [];
    varianceSamples.current = [];
    setElapsed(0);
    setPhase("playing");
    setLiveMsg("Keep the island steady!");
  }, [playTap, sensor]);

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

    const score = applyCheatMultiplier(
      computeBalanceScore(elapsed, avgStability, difficulty),
      verdict,
    );
    void playSuccess();
    setLiveMsg("Island saved!");

    onComplete(score, durationMs, {
      cheatFlags: verdict.flags,
      simulated: sensor.simulated,
      eligibleForBadges: verdict.eligibleForBadges,
      eligibleForXp: verdict.eligibleForXp,
    });
  }, [phase, elapsed, difficulty, sensor, minDuration, onComplete, playSuccess]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (startRef.current) {
        const sec = (Date.now() - startRef.current) / 1000;
        setElapsed(sec);
        stabilitySamples.current.push(sensor.stabilityPercent);
        varianceSamples.current.push(sensor.variance);
        if (Math.random() < 0.015 + difficulty * 0.004) {
          setWeather((w) => (w === "calm" ? "wind" : "calm"));
        }
        if (sec >= minDuration && sensor.stabilityPercent >= 45) {
          finish();
        }
        if (Math.floor(sec) > 0 && Math.floor(sec) % 5 === 0 && sec - Math.floor(sec) < 0.15) {
          void playMilestone();
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, sensor.stabilityPercent, sensor.variance, difficulty, minDuration, finish, playMilestone]);

  const wobble = reduced ? 0 : (100 - sensor.stabilityPercent) * (0.25 + difficulty * 0.06) + (weather === "wind" ? 3 : 0);

  if (phase === "onboarding") {
    return (
      <>
        <HealthLabGameOnboarding
          gameId="flamingo-balance"
          onExit={onExit}
          onStart={beginCalibration}
          startLabel="Start Survival"
          ctaVariant="rose"
          extraContent={
            <>
              {sensor.simulated && (
                <HealthLabGamePanel className="mt-4 w-full text-center text-xs text-amber-200">
                  Simulation mode — enable motion sensors for full experience
                </HealthLabGamePanel>
              )}
              <HealthLabGameChips
                options={FLAMINGO_DIFFICULTIES}
                selected={difficulty}
                onSelect={(i) => { setDifficulty(i); playTap(); }}
                className="mt-4"
              />
            </>
          }
        />
      </>
    );
  }

  return (
    <HealthLabGameStage gameId="flamingo-balance" className="items-center justify-center px-4 pb-8">
      <HealthLabLiveRegion message={liveMsg} />
      <HealthLabGameTopBar onExit={onExit} title="Sky Island" />
      <HealthLabStarfield count={16} />
      <HealthLabMotionDebugOverlay sensor={sensor} />

      {phase === "calibrating" && (
        <HealthLabMotionCalibration progress={sensor.calibrationProgress} />
      )}

      {weather === "wind" && phase === "playing" && !reduced && (
        <HealthLabMissionBanner
          eyebrow="Weather alert"
          title="💨 Wind gust!"
          subtitle="Hold steady — the island is shaking"
          tone="danger"
          className="absolute left-4 right-4 top-20 z-[3] mx-auto max-w-sm"
        />
      )}

      {/* Balance ring + island */}
      <div className="relative z-[3] mt-4 flex flex-col items-center">
        {phase === "playing" && (
          <HealthLabBalanceRing
            zone={sensor.balanceZone}
            stability={sensor.stabilityPercent}
            className="mb-4"
          />
        )}
        <HealthLabSkyIslandScene
          wobble={wobble}
          weather={weather}
          reduced={reduced}
          balanceZone={sensor.balanceZone}
        />
      </div>

      {/* Progress ring */}
      {phase === "playing" && (
        <div className="relative z-[3] mt-6 flex flex-col items-center gap-3">
          <HealthLabProgressRing progress={progress} tone="rose" size={90}>
            <span className="font-mono text-xl font-bold tabular-nums text-white">
              {Math.max(0, minDuration - elapsed).toFixed(0)}s
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/50">to go</span>
          </HealthLabProgressRing>
          <HealthLabGuidance messages={GUIDANCE_MESSAGES.balance} />
        </div>
      )}
    </HealthLabGameStage>
  );
}
