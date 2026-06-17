import { useCallback, useEffect, useRef, useState } from "react";
import { GUIDANCE_MESSAGES } from "../../constants";
import { computeFingerStabilityScore } from "../../scoring";
import { validateFingerSession, applyCheatMultiplier } from "../../anti-cheat";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import {
  HealthLabGameStage,
  HealthLabGameTopBar,
  HealthLabGameChips,
} from "../health-lab-game-ui";
import { HealthLabPhaseFlash, HealthLabStarfield } from "../health-lab-cinematic";
import { HealthLabGameOnboarding } from "../health-lab-onboarding";
import { useReducedMotion } from "@/lib/reduced-motion";
import { getProceduralAudioContext } from "@/lib/procedural-sfx";
import type { SessionCompleteOptions } from "../../types";
import {
  computeDriftOffset,
  getCityStage,
  getPowerPercent,
  getPowerStageLabel,
  getReactorState,
  REACTOR_DIFFICULTIES,
  REACTOR_DURATION_SEC,
  REACTOR_MILESTONES,
  type ReactorDriftMode,
} from "./crystal-reactor/crystal-reactor-constants";
import { CrystalReactorCity } from "./crystal-reactor/crystal-reactor-city";
import { CrystalReactorCore, CrystalReactorEnergyBeam } from "./crystal-reactor/crystal-reactor-core";
import {
  CrystalReactorMilestoneBurst,
  CrystalReactorParticles,
  CrystalReactorPowerMeter,
  CrystalReactorStateBadge,
  CrystalReactorToast,
  CrystalReactorVictory,
} from "./crystal-reactor/crystal-reactor-effects";

interface Props {
  onComplete: (score: number, durationMs: number, options?: SessionCompleteOptions) => void;
  onExit: () => void;
}

function useReactorHum(active: boolean) {
  useEffect(() => {
    const ctx = getProceduralAudioContext();
    if (!active || !ctx) return;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 55;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;

    const gain = ctx.createGain();
    gain.gain.value = 0.001;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.012, now + 0.35);

    return () => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        setTimeout(() => {
          try {
            osc.stop();
          } catch {
            /* stopped */
          }
        }, 250);
      } catch {
        /* ignore */
      }
    };
  }, [active]);
}

export function FingerStabilityGame({ onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<"onboarding" | "playing">("onboarding");
  const [active, setActive] = useState(false);
  const [difficulty, setDifficulty] = useState<ReactorDriftMode>(0);
  const [elapsed, setElapsed] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [targetOffset, setTargetOffset] = useState({ x: 0, y: 0 });
  const [maxDrift, setMaxDrift] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [milestoneBurst, setMilestoneBurst] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [liveMsg, setLiveMsg] = useState("Stabilize the crystal core and power the city!");
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);
  const touchMovesRef = useRef<number[]>([]);
  const pointerCountRef = useRef(0);
  const lastMilestoneRef = useRef(0);
  const pendingResultRef = useRef<{ score: number; durationMs: number; options: SessionCompleteOptions } | null>(
    null,
  );
  const { playTap, playSuccess, playMilestone, playCompletion } = useHealthLabAudio();
  const reduced = useReducedMotion();

  useReactorHum(active && !reduced);

  const ringScale = Math.max(0.5, 1 - (elapsed / REACTOR_DURATION_SEC) * 0.35);
  const powerPct = getPowerPercent(elapsed);
  const cityStage = getCityStage(powerPct);
  const powerLabel = getPowerStageLabel(powerPct);
  const driftDistance = Math.sqrt(offset.x ** 2 + offset.y ** 2);
  const ringRadius = 110 * ringScale;
  const reactorState = getReactorState(driftDistance, ringRadius);
  const crackLevel = Math.min(1, maxDrift / (60 * ringScale));
  const brightness = Math.max(0.35, 1 - crackLevel * 0.65);
  const particleIntensity = Math.min(1, elapsed / REACTOR_DURATION_SEC);

  const finishSession = useCallback(() => {
    const pending = pendingResultRef.current;
    if (!pending) return;
    onComplete(pending.score, pending.durationMs, pending.options);
  }, [onComplete]);

  const finish = useCallback(
    (completedFull = false) => {
      if (!startRef.current) return;
      setActive(false);
      const durationMs = Date.now() - startRef.current;
      const stability = Math.max(0, 100 - maxDrift * 3);
      const verdict = validateFingerSession({
        touchMoves: touchMovesRef.current,
        maxDrift,
        pointerCount: pointerCountRef.current,
        durationSeconds: durationMs / 1000,
      });
      const score = applyCheatMultiplier(
        computeFingerStabilityScore(stability, REACTOR_DURATION_SEC),
        verdict,
      );

      pendingResultRef.current = {
        score,
        durationMs,
        options: {
          cheatFlags: verdict.flags,
          eligibleForBadges: verdict.eligibleForBadges,
          eligibleForXp: verdict.eligibleForXp,
        },
      };

      if (completedFull) {
        setShowVictory(true);
        void playCompletion();
        setLiveMsg("Reactor fully stabilized!");
      } else {
        void playSuccess(score >= 85);
        setLiveMsg("The crystal needs more energy. Try again!");
        finishSession();
      }
    },
    [maxDrift, playCompletion, playSuccess, finishSession],
  );

  const handleVictoryDismiss = useCallback(() => {
    setShowVictory(false);
    void playSuccess(true);
    finishSession();
  }, [finishSession, playSuccess]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      if (startRef.current) {
        const sec = (Date.now() - startRef.current) / 1000;
        setElapsed(sec);
        setTargetOffset(computeDriftOffset(sec, difficulty));

        for (const m of REACTOR_MILESTONES) {
          if (sec >= m.seconds && lastMilestoneRef.current < m.seconds) {
            lastMilestoneRef.current = m.seconds;
            setToastMessage(`${m.emoji} ${m.label}!`);
            setLiveMsg(m.label);
            setMilestoneBurst(true);
            void playMilestone();
            setTimeout(() => setMilestoneBurst(false), 800);
            setTimeout(() => setToastMessage(null), 2200);
          }
        }

        if (sec >= REACTOR_DURATION_SEC) finish(true);
      }
    }, 50);
    return () => clearInterval(id);
  }, [active, difficulty, finish, playMilestone]);

  const handleMove = (clientX: number, clientY: number, movementX = 0, movementY = 0) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2 + targetOffset.x;
    const cy = rect.top + rect.height / 2 + targetOffset.y;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    setOffset({ x: dx, y: dy });
    setMaxDrift((m) => Math.max(m, dist));
    touchMovesRef.current.push(Math.abs(movementX) + Math.abs(movementY) + 0.01);
  };

  const startGame = () => {
    playTap();
    pointerCountRef.current = 1;
    startRef.current = Date.now();
    touchMovesRef.current = [0.01];
    lastMilestoneRef.current = 0;
    setActive(true);
    setMaxDrift(0);
    setElapsed(0);
    setOffset({ x: 0, y: 0 });
    setTargetOffset({ x: 0, y: 0 });
    setLiveMsg("Touch the core — your energy stabilizes the reactor!");
  };

  if (phase === "onboarding") {
    return (
      <HealthLabGameOnboarding
        gameId="finger-stability"
        onExit={onExit}
        onStart={() => {
          setPhase("playing");
          playTap();
        }}
        startLabel="Power Up Reactor"
        ctaVariant="violet"
        extraContent={
          <div className="mt-4 w-full">
            <HealthLabGameChips
              options={REACTOR_DIFFICULTIES}
              selected={difficulty}
              onSelect={(i) => {
                setDifficulty(i as ReactorDriftMode);
                playTap();
              }}
            />
          </div>
        }
      />
    );
  }

  return (
    <HealthLabGameStage gameId="finger-stability" fullBleed className="relative h-[100dvh] overflow-hidden">
      <HealthLabLiveRegion message={liveMsg} />
      <CrystalReactorCity stage={cityStage} reduced={reduced} />
      <HealthLabStarfield count={14} />
      <HealthLabPhaseFlash active={milestoneBurst} color="rgba(139,92,246,0.35)" />

      <div className="relative z-20 shrink-0">
        <HealthLabGameTopBar onExit={onExit} title="Crystal Core" />
      </div>

      {/* Full-screen touch zone */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-[10] touch-none"
        onPointerDown={(e) => {
          if (active || !e.isPrimary) return;
          startGame();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* older WebViews */
          }
          handleMove(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => active && handleMove(e.clientX, e.clientY, e.movementX, e.movementY)}
        onPointerUp={() => active && finish(false)}
        onPointerCancel={() => active && finish(false)}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-[9rem] top-[4rem] z-[2] flex flex-col items-center justify-center">
          <CrystalReactorToast message={toastMessage} />
          <CrystalReactorMilestoneBurst active={milestoneBurst} reduced={reduced} />
          <CrystalReactorParticles active={active} intensity={particleIntensity} reduced={reduced} />
          <CrystalReactorEnergyBeam active={active} fingerOffset={offset} reduced={reduced} />
          <CrystalReactorCore
            active={active}
            reactorState={reactorState}
            ringScale={ringScale}
            brightness={brightness}
            targetOffset={targetOffset}
            fingerOffset={offset}
            reduced={reduced}
            shake={reactorState === "critical"}
          />
        </div>
      </div>

      {/* FIXED bottom HUD */}
      <div
        className="absolute left-4 z-30"
        style={{ bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <CrystalReactorPowerMeter powerPct={active ? powerPct : 0} label={active ? powerLabel : "Standby"} />
      </div>

      <div
        className="absolute right-4 z-30 flex flex-col items-end gap-2"
        style={{ bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {active && <CrystalReactorStateBadge state={reactorState} />}
        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-center backdrop-blur-md">
          <p className="font-mono text-xl font-bold tabular-nums text-white">
            {active ? Math.max(0, REACTOR_DURATION_SEC - elapsed).toFixed(0) : REACTOR_DURATION_SEC}s
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/45">Remaining</p>
        </div>
      </div>

      {!active && (
        <div
          className="absolute left-1/2 z-30 -translate-x-1/2"
          style={{ bottom: "max(5rem, calc(env(safe-area-inset-bottom, 0px) + 3rem))" }}
        >
          <HealthLabGameChips
            options={REACTOR_DIFFICULTIES}
            selected={difficulty}
            onSelect={(i) => {
              setDifficulty(i as ReactorDriftMode);
              playTap();
            }}
          />
          <button
            type="button"
            className="health-lab-cta-premium mt-4 min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-500 px-8 py-3.5 text-sm font-bold text-white"
            onClick={startGame}
          >
            Touch to Start
          </button>
        </div>
      )}

      <p className="pointer-events-none absolute bottom-1 left-0 right-0 z-20 px-16 text-center text-[10px] text-white/50">
        {active
          ? GUIDANCE_MESSAGES.reactor[Math.min(Math.floor(elapsed / 5), GUIDANCE_MESSAGES.reactor.length - 1)]
          : "Keep your finger on the crystal to stabilize the reactor"}
      </p>

      <CrystalReactorVictory
        show={showVictory}
        powerPct={powerPct}
        reduced={reduced}
        onDismiss={handleVictoryDismiss}
      />
    </HealthLabGameStage>
  );
}
