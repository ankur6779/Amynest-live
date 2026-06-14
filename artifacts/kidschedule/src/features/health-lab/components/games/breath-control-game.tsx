import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint } from "lucide-react";
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
  const holdButtonRef = useRef<HTMLButtonElement>(null);
  const activePointerRef = useRef<number | null>(null);
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
  const inflate = Math.min(elapsed / 60, 1);
  const balloonW = 56 + inflate * 52;
  const balloonH = 72 + inflate * 68;
  const rise = reduced ? 0 : inflate * 40;

  const releasePointer = useCallback((pointerId?: number) => {
    const btn = holdButtonRef.current;
    const id = pointerId ?? activePointerRef.current;
    if (btn && id != null) {
      try {
        if (btn.hasPointerCapture(id)) btn.releasePointerCapture(id);
      } catch {
        /* pointer may already be released */
      }
    }
    activePointerRef.current = null;
  }, []);

  const handleEnd = useCallback((pointerId?: number) => {
    if (finished || !holding) return;
    const durationMs = startRef.current ? Date.now() - startRef.current : 0;
    if (durationMs < 200) {
      releasePointer(pointerId);
      setHolding(false);
      startRef.current = null;
      setElapsed(0);
      setLiveMsg("Place your finger on the glowing circle and hold steady");
      return;
    }
    releasePointer(pointerId);
    setHolding(false);
    setFinished(true);
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
  }, [finished, holding, onComplete, playSuccess, releasePointer]);

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
        className="relative mb-6 flex flex-col items-center"
        animate={reduced ? {} : { y: -rise }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      >
        <motion.div
          className="relative"
          style={{ width: balloonW, height: balloonH }}
          animate={
            reduced
              ? {}
              : {
                  scale: 1 + inflate * 0.15,
                  rotate: holding ? [-1.5, 1.5, -1.5] : 0,
                }
          }
          transition={
            holding && !reduced
              ? { rotate: { duration: 2.8, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.4 } }
              : { duration: 0.4 }
          }
        >
          {/* Balloon body */}
          <div
            className="absolute inset-0 shadow-[0_8px_24px_rgba(244,63,94,0.45)]"
            style={{
              borderRadius: "50% 50% 50% 50% / 58% 58% 42% 42%",
              background:
                "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 18%, transparent 42%), radial-gradient(circle at 70% 75%, rgba(190,24,93,0.35) 0%, transparent 55%), linear-gradient(155deg, #fda4af 0%, #fb7185 38%, #f43f5e 72%, #e11d48 100%)",
            }}
          />
          {/* Surface shine */}
          <div
            className="pointer-events-none absolute left-[18%] top-[14%] rounded-full bg-white/45 blur-[0.5px]"
            style={{ width: balloonW * 0.22, height: balloonH * 0.28 }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-[30%] top-[22%] rounded-full bg-white/25"
            style={{ width: balloonW * 0.1, height: balloonH * 0.12 }}
            aria-hidden
          />
          {/* Knot */}
          <div
            className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-[38%] rotate-45 rounded-sm bg-rose-700 shadow-sm"
            style={{ borderRadius: "2px 2px 6px 2px" }}
            aria-hidden
          />
        </motion.div>

        {/* String hangs below the balloon */}
        <svg
          width={Math.max(24, balloonW * 0.35)}
          height={48 + inflate * 12}
          viewBox="0 0 40 60"
          className="-mt-1 text-rose-200/80"
          aria-hidden
        >
          <path
            d="M20 0 C22 12, 18 22, 20 32 C22 42, 16 50, 20 58"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>

      <p className="mb-4 font-mono text-3xl font-bold text-white" aria-label={`${elapsed.toFixed(1)} seconds`}>
        {elapsed.toFixed(1)}s
      </p>

      <button
        ref={holdButtonRef}
        type="button"
        disabled={finished}
        className={cn(
          "relative flex h-32 w-32 items-center justify-center rounded-full touch-none select-none",
          "bg-gradient-to-br from-cyan-400 to-violet-600 health-lab-glow-pulse",
          "shadow-[0_0_40px_rgba(139,92,246,0.7)]",
          holding && "scale-95 shadow-[0_0_60px_rgba(34,211,238,0.9)]",
        )}
        onPointerDown={(e) => {
          if (finished || !e.isPrimary) return;
          playTap();
          pointerCountRef.current = 1;
          activePointerRef.current = e.pointerId;
          startRef.current = Date.now();
          touchMovesRef.current = [0.01];
          setHolding(true);
          setElapsed(0);
          lastMilestoneRef.current = 0;
          setLiveMsg("Holding steady — balloon rising");
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* older WebViews may not support capture */
          }
        }}
        onPointerMove={(e) => {
          if (!holding || activePointerRef.current !== e.pointerId) return;
          const delta = Math.abs(e.movementX) + Math.abs(e.movementY);
          touchMovesRef.current.push(Math.max(0.01, delta));
        }}
        onPointerUp={(e) => {
          if (activePointerRef.current !== e.pointerId) return;
          handleEnd(e.pointerId);
        }}
        onPointerCancel={(e) => {
          if (activePointerRef.current !== e.pointerId) return;
          handleEnd(e.pointerId);
        }}
        aria-label="Hold to inflate balloon"
      >
        <Fingerprint
          className={cn(
            "h-14 w-14 text-white/90 drop-shadow-md",
            holding ? "opacity-100" : "opacity-80",
          )}
          strokeWidth={1.5}
          aria-hidden
        />
      </button>

      <p className="mt-6 max-w-xs text-center text-xs text-white/60">
        Place your finger on the circle and hold — gentle micro-movements only!
      </p>
    </div>
  );
}
