import { useCallback, useEffect, useRef, useState } from "react";
import { computeFingerStabilityScore } from "../../scoring";
import { validateFingerSession, applyCheatMultiplier } from "../../anti-cheat";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import {
  HealthLabGameStage,
  HealthLabGameTopBar,
  HealthLabGameHero,
  HealthLabGameCta,
  HealthLabGameChips,
  HealthLabGameTimer,
} from "../health-lab-game-ui";
import {
  HealthLabFilmGrain,
  HealthLabMissionBanner,
  HealthLabReactorChamber,
  HealthLabStarfield,
} from "../health-lab-cinematic";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { SessionCompleteOptions } from "../../types";

const BASE_DURATION = 20;

interface Props {
  onComplete: (score: number, durationMs: number, options?: SessionCompleteOptions) => void;
  onExit: () => void;
}

const DIFFICULTIES = ["Steady", "Pulse", "Drift"] as const;

export function FingerStabilityGame({ onComplete, onExit }: Props) {
  const [active, setActive] = useState(false);
  const [difficulty, setDifficulty] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [targetOffset, setTargetOffset] = useState({ x: 0, y: 0 });
  const [maxDrift, setMaxDrift] = useState(0);
  const [liveMsg, setLiveMsg] = useState("Crystal Core Reactor — choose difficulty");
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);
  const touchMovesRef = useRef<number[]>([]);
  const pointerCountRef = useRef(0);
  const { playTap, playSuccess } = useHealthLabAudio();
  const reduced = useReducedMotion();

  const ringScale = Math.max(0.5, 1 - elapsed / BASE_DURATION * 0.35);

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
    let score = applyCheatMultiplier(
      computeFingerStabilityScore(stability, BASE_DURATION),
      verdict,
    );
    void playSuccess(score >= 85);
    setLiveMsg(`Reactor stabilized. Score ${score}`);
    onComplete(score, durationMs, {
      cheatFlags: verdict.flags,
      eligibleForBadges: verdict.eligibleForBadges,
      eligibleForXp: verdict.eligibleForXp,
    });
  }, [maxDrift, onComplete, playSuccess]);

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

  const crackLevel = Math.min(1, maxDrift / (60 * ringScale));
  const brightness = Math.max(0.3, 1 - crackLevel * 0.7);

  return (
    <HealthLabGameStage gameId="finger-stability" className="items-center justify-center px-4 pb-10">
      <HealthLabLiveRegion message={liveMsg} />
      <HealthLabGameTopBar onExit={onExit} title="Crystal Core" />
      <HealthLabStarfield count={36} />
      <HealthLabFilmGrain />

      {!active && (
        <HealthLabGameHero
          gameId="finger-stability"
          emoji="💎"
          title="Crystal Core Reactor"
          subtitle="Keep your finger on the glowing core — don't let it crack"
          className="relative z-[3] mt-2"
        />
      )}

      {active && (
        <HealthLabMissionBanner
          eyebrow="Reactor online"
          title="Stabilize the core"
          subtitle={`Integrity ${Math.round((1 - crackLevel) * 100)}% · stay centered`}
          tone={crackLevel > 0.5 ? "danger" : "neutral"}
          className="relative z-[3] mx-auto mt-2 max-w-sm"
        />
      )}

      {!active && (
        <HealthLabGameChips
          options={DIFFICULTIES}
          selected={difficulty}
          onSelect={(i) => { setDifficulty(i); playTap(); }}
          className="relative z-[3] mt-4"
        />
      )}

      <HealthLabGameTimer
        value={`${Math.max(0, BASE_DURATION - elapsed).toFixed(1)}s`}
        label="Time remaining"
        className="relative z-[3] mt-4"
      />

      <div
        ref={containerRef}
        className="relative z-[3] mt-4 touch-none"
        onPointerDown={(e) => {
          if (active || !e.isPrimary) return;
          playTap();
          pointerCountRef.current = 1;
          startRef.current = Date.now();
          touchMovesRef.current = [0.01];
          setActive(true);
          setMaxDrift(0);
          setElapsed(0);
          setLiveMsg("Stabilize the core!");
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

      {!active && elapsed === 0 && (
        <HealthLabGameCta
          variant="violet"
          className="relative z-[3] mt-6"
          onClick={() => {
            playTap();
            pointerCountRef.current = 1;
            startRef.current = Date.now();
            touchMovesRef.current = [0.01];
            setActive(true);
            setMaxDrift(0);
            setLiveMsg("Stabilize the core!");
          }}
        >
          Touch to Start
        </HealthLabGameCta>
      )}
    </HealthLabGameStage>
  );
}
