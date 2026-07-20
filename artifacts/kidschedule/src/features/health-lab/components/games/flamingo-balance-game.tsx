import { useCallback, useEffect, useRef, useState } from "react";
import { FLAMINGO_DIFFICULTIES, FLAMINGO_MIN_DURATION, GUIDANCE_MESSAGES } from "../../constants";
import { computeBalanceScore } from "../../scoring";
import { validateFlamingoSession, applyCheatMultiplier } from "../../anti-cheat";
import { useMotionSensor } from "../../hooks/use-motion-sensor";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import { HealthLabGameStage, HealthLabGameTopBar, HealthLabGameChips, HealthLabGamePanel } from "../health-lab-game-ui";
import { HealthLabProgressRing } from "../health-lab-progress-ring";
import { HealthLabPhaseFlash, HealthLabStarfield } from "../health-lab-cinematic";
import { HealthLabGameOnboarding } from "../health-lab-onboarding";
import { HealthLabMotionCalibration } from "../health-lab-motion-calibration";
import { HealthLabMotionDebugOverlay } from "../health-lab-debug-overlay";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { SessionCompleteOptions } from "../../types";
import {
  getIslandEvolution,
  getStabilityVisualTier,
  SKY_ISLAND_MAX_SECONDS,
  SKY_ISLAND_MILESTONES,
} from "./sky-island/sky-island-constants";
import { SkyIslandStabilityMeter } from "./sky-island/sky-island-stability-meter";
import { SkyIslandPremiumScene } from "./sky-island/sky-island-scene";
import {
  SkyIslandEncouragement,
  SkyIslandMilestoneBurst,
  SkyIslandParticles,
  SkyIslandToast,
  SkyIslandVictory,
} from "./sky-island/sky-island-effects";

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
  const [liveMsg, setLiveMsg] = useState("Protect your floating island — stay balanced!");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [milestoneBurst, setMilestoneBurst] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [legendaryVictory, setLegendaryVictory] = useState(false);
  const startRef = useRef<number | null>(null);
  const stabilitySamples = useRef<number[]>([]);
  const varianceSamples = useRef<number[]>([]);
  const finishingRef = useRef(false);
  const lastMilestoneRef = useRef(0);
  const victoryTriggeredRef = useRef(false);
  const unstableSinceRef = useRef<number | null>(null);

  const sensorActive = phase === "calibrating" || phase === "playing";
  const sensor = useMotionSensor(sensorActive, childId);
  const { playTap, playSuccess, playMilestone, playCompletion } = useHealthLabAudio();
  const reduced = useReducedMotion();

  const minDuration = FLAMINGO_MIN_DURATION[difficulty] ?? 15;
  const progress = Math.min(1, elapsed / minDuration);
  const evolution = getIslandEvolution(elapsed);
  const stabilityTier = getStabilityVisualTier(sensor.balanceZone, sensor.stabilityPercent);
  const particleIntensity = Math.min(1, elapsed / SKY_ISLAND_MAX_SECONDS);
  const flowerShake = sensor.balanceZone === "unstable" || showEncouragement;

  const beginCalibration = useCallback(async () => {
    playTap();
    setPhase("calibrating");
    setLiveMsg("Hold device still for calibration");
    await sensor.runCalibration();
    startRef.current = Date.now();
    stabilitySamples.current = [];
    varianceSamples.current = [];
    lastMilestoneRef.current = 0;
    victoryTriggeredRef.current = false;
    unstableSinceRef.current = null;
    setElapsed(0);
    setPhase("playing");
    setLiveMsg("Keep the island steady — you're its guardian!");
  }, [playTap, sensor]);

  const finishSession = useCallback(() => {
    if (finishingRef.current) return;
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
    void playSuccess(score >= 90);
    setLiveMsg("Island saved!");

    onComplete(score, durationMs, {
      cheatFlags: verdict.flags,
      simulated: sensor.simulated,
      eligibleForBadges: verdict.eligibleForBadges,
      eligibleForXp: verdict.eligibleForXp,
    });
  }, [elapsed, difficulty, sensor, minDuration, onComplete, playSuccess]);

  const handleVictoryDismiss = useCallback(() => {
    setShowVictory(false);
    finishSession();
  }, [finishSession]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (startRef.current) {
        const sec = (Date.now() - startRef.current) / 1000;
        setElapsed(sec);
        stabilitySamples.current.push(sensor.stabilityPercent);
        varianceSamples.current.push(sensor.variance);

        if (Math.random() < 0.012 + difficulty * 0.003) {
          setWeather((w) => (w === "calm" ? "wind" : "calm"));
        }

        for (const m of SKY_ISLAND_MILESTONES) {
          if (sec >= m.seconds && lastMilestoneRef.current < m.seconds) {
            lastMilestoneRef.current = m.seconds;
            setToastMessage(`${m.emoji} ${m.label}!`);
            setLiveMsg(m.label);
            setMilestoneBurst(true);
            void playMilestone();
            setTimeout(() => setMilestoneBurst(false), 800);
            setTimeout(() => setToastMessage(null), 2400);
          }
        }

        if (sensor.balanceZone === "unstable" || sensor.stabilityPercent < 40) {
          if (unstableSinceRef.current == null) unstableSinceRef.current = Date.now();
          else if (Date.now() - unstableSinceRef.current > 2200) {
            setShowEncouragement(true);
            setTimeout(() => setShowEncouragement(false), 2800);
            unstableSinceRef.current = null;
          }
        } else {
          unstableSinceRef.current = null;
          setShowEncouragement(false);
        }

        const readyToComplete = sec >= minDuration && sensor.stabilityPercent >= 45;
        const legendary = sec >= SKY_ISLAND_MAX_SECONDS;

        if ((readyToComplete || legendary) && !victoryTriggeredRef.current) {
          victoryTriggeredRef.current = true;
          setLegendaryVictory(legendary);
          setShowVictory(true);
          void playCompletion();
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, sensor.stabilityPercent, sensor.balanceZone, sensor.variance, difficulty, minDuration, playMilestone, playCompletion]);

  const wobble = reduced
    ? 0
    : (100 - sensor.stabilityPercent) * (0.22 + difficulty * 0.05) + (weather === "wind" ? 2.5 : 0);

  if (phase === "onboarding") {
    return (
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
              onSelect={(i) => {
                setDifficulty(i);
                playTap();
              }}
              className="mt-4"
            />
          </>
        }
      />
    );
  }

  return (
    <HealthLabGameStage
      gameId="flamingo-balance"
      fullBleed
      className="relative overflow-hidden bg-gradient-to-b from-sky-400/80 via-teal-300/40 to-emerald-200/30"
    >
      <HealthLabLiveRegion message={liveMsg} />
      <HealthLabStarfield count={14} />
      <HealthLabPhaseFlash active={milestoneBurst} color="rgba(52,211,153,0.35)" />
      <HealthLabMotionDebugOverlay sensor={sensor} />

      <div className="relative z-20 shrink-0">
        <HealthLabGameTopBar onExit={onExit} title="Sky Island" />
      </div>

      {phase === "calibrating" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center">
          <HealthLabMotionCalibration progress={sensor.calibrationProgress} />
        </div>
      )}

      {phase === "playing" && (
        <div className="relative z-[3] shrink-0 px-3 pt-1">
          <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md">
            <p className="mb-1.5 truncate text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-200/70">
              {evolution.label}
            </p>
            <div className="flex justify-between gap-0.5">
              {SKY_ISLAND_MILESTONES.map((m) => (
                <div key={m.seconds} className="flex flex-col items-center gap-0.5">
                  <span
                    className={cn(
                      "text-sm transition-all duration-500",
                      elapsed >= m.seconds
                        ? "scale-110 opacity-100 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                        : "opacity-25 grayscale",
                    )}
                    aria-hidden
                  >
                    {m.emoji}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {weather === "wind" && (
            <p className="mx-auto mt-2 w-fit rounded-full border border-slate-300/30 bg-slate-500/20 px-4 py-1.5 text-xs font-bold text-white/90 backdrop-blur-md">
              💨 Wind gust — hold steady!
            </p>
          )}
        </div>
      )}

      {phase === "playing" && (
        <div className="health-lab-game-region-grow relative z-[2] px-2">
          <SkyIslandMilestoneBurst active={milestoneBurst} reduced={reduced} />
          <SkyIslandToast message={toastMessage} />
          <SkyIslandEncouragement visible={showEncouragement} />
          <SkyIslandParticles
            active={sensor.balanceZone !== "unstable"}
            intensity={particleIntensity}
            tier={stabilityTier}
            reduced={reduced}
          />
          <SkyIslandPremiumScene
            evolution={evolution}
            wobble={wobble}
            weather={weather}
            stabilityTier={stabilityTier}
            balanceZone={sensor.balanceZone}
            reduced={reduced}
            showParadise={showVictory}
            flowerShake={flowerShake}
          />
        </div>
      )}

      {phase === "playing" && (
        <div className="health-lab-game-region-hud relative z-30 px-3 pt-1">
          <div className="mx-auto flex w-full max-w-md items-end justify-between gap-3">
            <SkyIslandStabilityMeter tier={stabilityTier} stability={sensor.stabilityPercent} />
            <HealthLabProgressRing progress={progress} tone="rose" size={72}>
              <span className="font-mono text-lg font-bold tabular-nums text-white">
                {Math.max(0, minDuration - elapsed).toFixed(0)}s
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-white/50">
                to go
              </span>
            </HealthLabProgressRing>
          </div>
          <p className="pointer-events-none mt-2 px-2 text-center text-[10px] leading-relaxed text-white/55">
            {GUIDANCE_MESSAGES.balance[Math.min(Math.floor(elapsed / 10), GUIDANCE_MESSAGES.balance.length - 1)]}
          </p>
        </div>
      )}

      <SkyIslandVictory
        show={showVictory}
        elapsed={elapsed}
        legendary={legendaryVictory}
        reduced={reduced}
        onDismiss={handleVictoryDismiss}
      />
    </HealthLabGameStage>
  );
}
