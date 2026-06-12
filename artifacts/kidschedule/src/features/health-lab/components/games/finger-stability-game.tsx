import { useCallback, useEffect, useRef, useState } from "react";
import { computeFingerStabilityScore } from "../../scoring";
import { validateFingerSession, applyCheatMultiplier } from "../../anti-cheat";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import { cn } from "@/lib/utils";
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
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4">
      <HealthLabLiveRegion message={liveMsg} />
      <button type="button" onClick={onExit} className="absolute left-4 top-4 min-h-[48px] text-sm text-white/70 underline">
        Exit
      </button>

      <h2 className="text-xl font-bold text-white">Crystal Core Reactor</h2>
      <p className="mt-2 text-sm text-violet-200/80">Keep your finger on the glowing core</p>

      {!active && (
        <div className="mt-4 flex gap-2">
          {DIFFICULTIES.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => { setDifficulty(i); playTap(); }}
              className={cn(
                "min-h-[48px] rounded-full px-3 py-2 text-xs",
                difficulty === i ? "bg-violet-500 text-white" : "bg-white/10 text-violet-200",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      <p className="mt-2 font-mono text-2xl text-white">{Math.max(0, BASE_DURATION - elapsed).toFixed(1)}s</p>

      <div
        ref={containerRef}
        className="relative mt-6 h-64 w-64 touch-none"
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
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-violet-400/50 transition-all"
          style={{
            width: 200 * ringScale,
            height: 200 * ringScale,
            background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(217,70,239,0.1))",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(167,139,250,${brightness}) 0%, rgba(139,92,246,0.3) 70%)`,
            boxShadow: `0 0 ${30 * brightness}px rgba(167,139,250,0.8)`,
            transform: `translate(calc(-50% + ${targetOffset.x + offset.x * 0.1}px), calc(-50% + ${targetOffset.y + offset.y * 0.1}px))`,
          }}
        />
        {crackLevel > 0.3 && (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-60" aria-hidden>
            💔
          </div>
        )}
      </div>

      {!active && elapsed === 0 && (
        <button
          type="button"
          onClick={() => {
            playTap();
            pointerCountRef.current = 1;
            startRef.current = Date.now();
            touchMovesRef.current = [0.01];
            setActive(true);
            setMaxDrift(0);
            setLiveMsg("Stabilize the core!");
          }}
          className="mt-6 min-h-[48px] rounded-2xl bg-violet-600 px-8 py-3 font-bold text-white"
        >
          Touch to Start
        </button>
      )}
    </div>
  );
}
