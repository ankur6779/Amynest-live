import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BREATH_MILESTONES } from "../../constants";
import { computeBreathScore } from "../../scoring";
import { validateBreathSession, applyCheatMultiplier } from "../../anti-cheat";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { SessionCompleteOptions } from "../../types";

interface Props {
  onComplete: (score: number, durationMs: number, options?: SessionCompleteOptions) => void;
  onExit: () => void;
}

export function BreathControlGame({ onComplete, onExit }: Props) {
  const [holding, setHolding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [celebrateMilestone, setCelebrateMilestone] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState("Hold the glowing button to start your balloon journey");
  const startRef = useRef<number | null>(null);
  const touchMovesRef = useRef<number[]>([]);
  const pointerCountRef = useRef(0);
  const lastMilestoneRef = useRef(0);
  const { playTap, playSuccess } = useHealthLabAudio();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!holding || finished) return;
    const id = window.setInterval(() => {
      if (startRef.current) {
        const sec = (Date.now() - startRef.current) / 1000;
        setElapsed(sec);
        for (const m of BREATH_MILESTONES) {
          if (sec >= m.seconds && lastMilestoneRef.current < m.seconds) {
            lastMilestoneRef.current = m.seconds;
            setCelebrateMilestone(`${m.emoji} ${m.label} level!`);
            setLiveMsg(`Reached ${m.label} level`);
            setTimeout(() => setCelebrateMilestone(null), 2000);
          }
        }
      }
    }, 50);
    return () => clearInterval(id);
  }, [holding, finished]);

  const milestone = [...BREATH_MILESTONES].reverse().find((m) => elapsed >= m.seconds);
  const bgProgress = Math.min(1, elapsed / 60);

  const handleEnd = useCallback(() => {
    if (finished) return;
    setHolding(false);
    setFinished(true);
    const durationMs = startRef.current ? Date.now() - startRef.current : 0;
    const holdSeconds = durationMs / 1000;
    const moves = touchMovesRef.current;
    const totalMovement = moves.reduce((a, b) => a + b, 0);
    const stability =
      moves.filter((m) => m > 0).length < 2
        ? Math.min(70, 40 + totalMovement * 5)
        : Math.max(0, 100 - (Math.max(...moves) - Math.min(...moves)) * 200);

    const verdict = validateBreathSession({
      holdSeconds,
      touchMoves: moves,
      pointerCount: pointerCountRef.current,
    });

    let score = applyCheatMultiplier(computeBreathScore(holdSeconds, stability), verdict);
    void playSuccess(score >= 95);
    setLiveMsg(`Journey complete. Score ${score}`);
    onComplete(score, durationMs, {
      cheatFlags: verdict.flags,
      eligibleForBadges: verdict.eligibleForBadges,
      eligibleForXp: verdict.eligibleForXp,
    });
  }, [finished, onComplete, playSuccess]);

  return (
    <div
      className="relative flex min-h-[70dvh] flex-col items-center justify-center px-4"
      style={{
        background: `linear-gradient(180deg, 
          hsl(${120 - bgProgress * 80}, 60%, ${45 - bgProgress * 25}%) 0%, 
          hsl(${220 + bgProgress * 40}, 70%, ${25 + bgProgress * 15}%) 100%)`,
      }}
    >
      <HealthLabLiveRegion message={liveMsg} />
      <button type="button" onClick={onExit} className="absolute left-4 top-4 z-10 min-h-[48px] text-sm text-white/70 underline">
        Exit
      </button>

      {/* Journey map */}
      <div className="mb-3 flex w-full max-w-xs justify-between px-2">
        {BREATH_MILESTONES.map((m) => (
          <span
            key={m.label}
            className={cn("text-lg transition-opacity", elapsed >= m.seconds ? "opacity-100" : "opacity-30")}
            aria-hidden
          >
            {m.emoji}
          </span>
        ))}
      </div>

      {!reduced && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {[...Array(5)].map((_, i) => (
            <motion.span
              key={`bird-${i}`}
              className="absolute text-xl"
              style={{ top: `${15 + i * 12}%` }}
              animate={{ x: ["-10%", "110%"] }}
              transition={{ duration: 8 + i * 2, repeat: Infinity, delay: i * 1.5 }}
            >
              🐦
            </motion.span>
          ))}
          {[...Array(8)].map((_, i) => (
            <motion.span
              key={`cloud-${i}`}
              className="absolute text-2xl opacity-60"
              style={{ top: `${10 + (i % 4) * 20}%`, left: `${(i * 13) % 80}%` }}
              animate={{ x: [0, 20, 0] }}
              transition={{ duration: 6 + i, repeat: Infinity }}
            >
              ☁️
            </motion.span>
          ))}
          {bgProgress > 0.4 &&
            [...Array(6)].map((_, i) => (
              <motion.span
                key={`star-${i}`}
                className="absolute text-sm"
                style={{ top: `${5 + i * 8}%`, left: `${(i * 17) % 90}%` }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              >
                ⭐
              </motion.span>
            ))}
        </div>
      )}

      <p className="mb-2 text-center text-sm text-white/80">Balloon Journey Adventure</p>
      <AnimatePresence>
        {celebrateMilestone && (
          <motion.p
            className="mb-4 text-xl font-bold text-amber-200"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {celebrateMilestone}
          </motion.p>
        )}
      </AnimatePresence>
      {milestone && !celebrateMilestone && (
        <p className="mb-4 text-lg font-bold text-amber-200">{milestone.emoji} {milestone.label}</p>
      )}

      <motion.div
        className="relative mb-6 flex items-end justify-center"
        animate={reduced ? {} : { y: -Math.min(elapsed / 60, 1) * 40 }}
      >
        <motion.div
          className="rounded-full bg-gradient-to-br from-rose-300 to-rose-500 shadow-lg"
          animate={reduced ? {} : { scale: 1 + Math.min(elapsed / 60, 1) * 0.4 }}
          style={{
            width: 60 + Math.min(elapsed / 60, 1) * 80,
            height: 70 + Math.min(elapsed / 60, 1) * 100,
          }}
        />
        <div className="ml-1 h-16 w-1 rounded bg-white/40" />
      </motion.div>

      <p className="mb-4 font-mono text-3xl font-bold text-white" aria-label={`${elapsed.toFixed(1)} seconds`}>
        {elapsed.toFixed(1)}s
      </p>

      <button
        type="button"
        className={cn(
          "h-32 w-32 rounded-full touch-manipulation select-none",
          "bg-gradient-to-br from-cyan-400 to-violet-600 health-lab-glow-pulse",
          "shadow-[0_0_40px_rgba(139,92,246,0.7)]",
          holding && "scale-95 shadow-[0_0_60px_rgba(34,211,238,0.9)]",
        )}
        onPointerDown={(e) => {
          if (e.isPrimary === false) return;
          e.preventDefault();
          playTap();
          pointerCountRef.current = 1;
          startRef.current = Date.now();
          touchMovesRef.current = [0.01];
          setHolding(true);
          setElapsed(0);
          lastMilestoneRef.current = 0;
          setLiveMsg("Holding steady — balloon rising");
        }}
        onPointerMove={(e) => {
          if (!holding) return;
          const delta = Math.abs(e.movementX) + Math.abs(e.movementY);
          touchMovesRef.current.push(Math.max(0.01, delta));
        }}
        onPointerUp={handleEnd}
        onPointerLeave={() => holding && handleEnd()}
        onPointerCancel={handleEnd}
        aria-label="Hold to inflate balloon"
      />

      <p className="mt-6 max-w-xs text-center text-xs text-white/60">
        Keep gentle micro-movements — taped fingers won't count!
      </p>
    </div>
  );
}
