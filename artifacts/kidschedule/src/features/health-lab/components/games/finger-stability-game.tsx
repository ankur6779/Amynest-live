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
import {
  HealthLabMissionBanner,
  HealthLabReactorChamber,
  HealthLabStarfield,
} from "../health-lab-cinematic";
import { HealthLabGameOnboarding } from "../health-lab-onboarding";
import { HealthLabGuidance } from "../health-lab-amy-character";
import { HealthLabProgressRing } from "../health-lab-progress-ring";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { SessionCompleteOptions } from "../../types";

const BASE_DURATION = 20;

interface Props {
  onComplete: (score: number, durationMs: number, options?: SessionCompleteOptions) => void;
  onExit: () => void;
}

const DIFFICULTIES = ["Steady", "Pulse", "Drift"] as const;

export function FingerStabilityGame({ onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<"onboarding" | "playing">("onboarding");
  const [active, setActive] = useState(false);
  const [difficulty, setDifficulty] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [targetOffset, setTargetOffset] = useState({ x: 0, y: 0 });
  const [maxDrift, setMaxDrift] = useState(0);
  const [liveMsg, setLiveMsg] = useState("Crystal Core Reactor");
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);
  const touchMovesRef = useRef<number[]>([]);
  const pointerCountRef = useRef(0);
  const { playTap, playSuccess, playMilestone, playCompletion } = useHealthLabAudio();
  const reduced = useReducedMotion();

  const ringScale = Math.max(0.5, 1 - elapsed / BASE_DURATION * 0.35);
  const chargePercent = Math.min(100, (elapsed / BASE_DURATION) * 100);
  const crackLevel = Math.min(1, maxDrift / (60 * ringScale));
  const brightness = Math.max(0.3, 1 - crackLevel * 0.7);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      if (startRef.current) {
        const sec = (Date.now() - startRef.current) / 1000;
        setElapsed(sec);
        if (difficulty >= 2) {
          setTargetOffset({
            x: Math.sin(sec * 1.5) * 20 * (difficulty * 0.5),
            y: Math.cos(sec * 1.2) * 15 * (difficulty * 0.5),
          });
        } else if (difficulty === 1 && Math.floor(sec * 2) % 3 === 0) {
          setTargetOffset({ x: Math.sin(sec * 4) * 8, y: 0 });
        }
        if (sec >= BASE_DURATION) finish();
        if (Math.floor(sec) > 0 && Math.floor(sec) % 5 === 0 && sec - Math.floor(sec) < 0.1) {
          void playMilestone();
        }
      }
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, difficulty]);

  const finish = useCallback(() => {
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
      computeFingerStabilityScore(stability, BASE_DURATION),
      verdict,
    );
    void playCompletion();
    setLiveMsg(`Reactor charged! Score ${score}`);
    onComplete(score, durationMs, {
      cheatFlags: verdict.flags,
      eligibleForBadges: verdict.eligibleForBadges,
      eligibleForXp: verdict.eligibleForXp,
    });
  }, [maxDrift, onComplete, playCompletion]);

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
    setActive(true);
    setMaxDrift(0);
    setElapsed(0);
    setLiveMsg("Stabilize the core!");
  };

  if (phase === "onboarding") {
    return (
      <HealthLabGameOnboarding
        gameId="finger-stability"
        onExit={onExit}
        onStart={() => { setPhase("playing"); playTap(); }}
        startLabel="Power Up Reactor"
        ctaVariant="violet"
        extraContent={
          <div className="mt-4 w-full">
            <HealthLabGameChips
              options={DIFFICULTIES}
              selected={difficulty}
              onSelect={(i) => { setDifficulty(i); playTap(); }}
            />
          </div>
        }
      />
    );
  }

  return (
    <HealthLabGameStage gameId="finger-stability" className="items-center justify-center px-4 pb-10">
      <HealthLabLiveRegion message={liveMsg} />
      <HealthLabGameTopBar onExit={onExit} title="Crystal Core" />
      <HealthLabStarfield count={16} />

      {active && (
        <>
          <HealthLabMissionBanner
            eyebrow="Reactor online"
            title={`Energy ${Math.round(chargePercent)}%`}
            subtitle={`Integrity ${Math.round((1 - crackLevel) * 100)}% · stay centered`}
            tone={crackLevel > 0.5 ? "danger" : chargePercent >= 80 ? "success" : "neutral"}
            className="relative z-[3] mx-auto mt-2 max-w-sm"
          />
          <div className="relative z-[3] mt-4">
            <HealthLabProgressRing progress={chargePercent / 100} tone="violet" size={80}>
              <span className="font-mono text-lg font-bold tabular-nums text-white">
                {Math.round(chargePercent)}%
              </span>
            </HealthLabProgressRing>
          </div>
          <HealthLabGuidance messages={GUIDANCE_MESSAGES.reactor} className="relative z-[3] mt-3" />
        </>
      )}

      {!active && (
        <HealthLabGameChips
          options={DIFFICULTIES}
          selected={difficulty}
          onSelect={(i) => { setDifficulty(i); playTap(); }}
          className="relative z-[3] mt-4"
        />
      )}

      <div
        ref={containerRef}
        className="relative z-[3] mt-4 touch-none"
        onPointerDown={(e) => {
          if (active || !e.isPrimary) return;
          startGame();
          e.currentTarget.setPointerCapture(e.pointerId);
          handleMove(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => active && handleMove(e.clientX, e.clientY, e.movementX, e.movementY)}
        onPointerUp={() => active && finish()}
      >
        <HealthLabReactorChamber
          active={active}
          ringScale={ringScale}
          brightness={brightness}
          crackLevel={crackLevel}
          targetOffset={targetOffset}
          offset={offset}
          reduced={reduced}
        />
      </div>

      {!active && (
        <button
          type="button"
          className="health-lab-cta-premium relative z-[3] mt-6 min-h-[48px] rounded-2xl bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-500 px-8 py-3.5 text-sm font-bold text-white"
          onClick={startGame}
        >
          Touch to Start
        </button>
      )}

      <p className="relative z-[3] mt-4 text-center text-xs text-white/50">
        {active
          ? `${Math.max(0, BASE_DURATION - elapsed).toFixed(0)}s remaining — charge to 100%!`
          : "Keep your finger on the glowing core"}
      </p>
    </HealthLabGameStage>
  );
}
