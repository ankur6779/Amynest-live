import { useCallback, useEffect, useRef, useState } from "react";
import { FLAMINGO_DIFFICULTIES, FLAMINGO_MIN_DURATION } from "../../constants";
import { computeBalanceScore } from "../../scoring";
import { validateFlamingoSession, applyCheatMultiplier } from "../../anti-cheat";
import { useMotionSensor } from "../../hooks/use-motion-sensor";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import {
  HealthLabGameStage,
  HealthLabGameTopBar,
  HealthLabGameHero,
  HealthLabGameCta,
  HealthLabGameChips,
  HealthLabGameTimer,
  HealthLabGamePanel,
} from "../health-lab-game-ui";
import {
  HealthLabFilmGrain,
  HealthLabMissionBanner,
  HealthLabSkyIslandScene,
  HealthLabStarfield,
} from "../health-lab-cinematic";
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
      <HealthLabGameStage gameId="flamingo-balance" className="items-center justify-center px-4 pb-10">
        <HealthLabLiveRegion message={liveMsg} />
        <HealthLabGameTopBar onExit={onExit} title="Sky Island" />
        <HealthLabGameHero
          gameId="flamingo-balance"
          emoji="🦩"
          title="Sky Island Survival"
          subtitle={`Stand on one leg. Hold the phone steady. Survive wind gusts for at least ${minDuration}s!`}
        />
        {sensor.simulated && (
          <HealthLabGamePanel className="mx-4 mt-4 max-w-sm text-center text-xs text-amber-200">
            ⚠️ Simulation mode — badge rewards disabled. Enable motion sensors for full experience.
          </HealthLabGamePanel>
        )}
        <HealthLabGameChips
          options={FLAMINGO_DIFFICULTIES}
          selected={difficulty}
          onSelect={(i) => { setDifficulty(i); playTap(); }}
          className="mt-8"
        />
        <HealthLabGameCta
          variant="rose"
          className="mt-8"
          onClick={() => {
            playTap();
            startRef.current = Date.now();
            stabilitySamples.current = [];
            varianceSamples.current = [];
            setElapsed(0);
            setPhase("playing");
            setLiveMsg("Keep the island steady!");
          }}
        >
          Start Survival
        </HealthLabGameCta>
      </HealthLabGameStage>
    );
  }

  return (
    <HealthLabGameStage gameId="flamingo-balance" className="items-center justify-center px-4 pb-8">
      <HealthLabLiveRegion message={liveMsg} />
      <HealthLabGameTopBar onExit={onExit} title="Sky Island" />
      <HealthLabStarfield count={28} />
      <HealthLabFilmGrain />

      {weather === "wind" && !reduced && (
        <HealthLabMissionBanner
          eyebrow="Weather alert"
          title="💨 Wind gust!"
          subtitle="Hold steady — the island is shaking"
          tone="danger"
          className="absolute left-4 right-4 top-20 z-[3] max-w-sm mx-auto"
        />
      )}

      <div className="relative z-[3] mt-4">
        <HealthLabSkyIslandScene wobble={wobble} weather={weather} reduced={reduced} />
      </div>

      <HealthLabGameTimer
        value={`${elapsed.toFixed(1)}s`}
        label={`Stability ${Math.round(sensor.stabilityPercent)}% · Need ${minDuration}s`}
        className="relative z-[3] mt-8"
      />

      {elapsed < minDuration && (
        <HealthLabMissionBanner
          eyebrow="Survival clock"
          title={`${(minDuration - elapsed).toFixed(0)}s remaining`}
          subtitle="Keep the island steady to survive"
          tone="neutral"
          className="relative z-[3] mt-4 max-w-xs"
        />
      )}
    </HealthLabGameStage>
  );
}
