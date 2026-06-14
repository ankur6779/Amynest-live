import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint } from "lucide-react";
import { BREATH_MILESTONES } from "../../constants";
import { computeBreathScore } from "../../scoring";
import { validateBreathSession, applyCheatMultiplier } from "../../anti-cheat";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import {
  HealthLabGameStage,
  HealthLabGameTopBar,
  HealthLabGameTimer,
  HealthLabHoldOrb,
} from "../health-lab-game-ui";
import {
  HealthLabAltitudeBadge,
  HealthLabFilmGrain,
  HealthLabPhaseFlash,
  HealthLabStarfield,
} from "../health-lab-cinematic";
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
    <HealthLabGameStage
      gameId="breath-control"
      className="items-center justify-center px-4 pb-8"
      style={{
        background: `linear-gradient(180deg, 
          hsl(${120 - bgProgress * 80}, 60%, ${45 - bgProgress * 25}%) 0%, 
          hsl(${220 + bgProgress * 40}, 70%, ${25 + bgProgress * 15}%) 100%)`,
      } as CSSProperties}
    >
      <HealthLabLiveRegion message={liveMsg} />
      <HealthLabGameTopBar onExit={onExit} title="Balloon Journey" />
      <HealthLabStarfield count={bgProgress > 0.35 ? 50 : 24} />
      <HealthLabFilmGrain />
      <HealthLabPhaseFlash active={!!celebrateMilestone} color="rgba(251,191,36,0.4)" />

      {/* Journey map */}
      <div className="relative z-[3] mb-4 w-full max-w-sm rounded-2xl border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-md">
        <div className="flex justify-between">
          {BREATH_MILESTONES.map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "text-lg transition-all duration-500",
                  elapsed >= m.seconds ? "scale-110 opacity-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "opacity-25 grayscale",
                )}
                aria-hidden
              >
                {m.emoji}
              </span>
              <span className={cn("text-[9px] font-medium uppercase tracking-wide", elapsed >= m.seconds ? "text-amber-200/90" : "text-white/30")}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {milestone && (
        <div className="relative z-[3] mb-3 w-full max-w-xs px-2">
          <HealthLabAltitudeBadge
            label={milestone.label}
            emoji={milestone.emoji}
            progress={bgProgress}
          />
        </div>
      )}

      {!reduced && (
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
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

      <p className="relative z-[3] mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
        Balloon Journey Adventure
      </p>
      <AnimatePresence>
        {celebrateMilestone && (
          <motion.p
            className="relative z-[3] mb-4 rounded-2xl border border-amber-300/30 bg-amber-500/15 px-5 py-2 text-xl font-bold text-amber-100 shadow-[0_0_40px_-8px_rgba(251,191,36,0.5)]"
            initial={{ scale: 0.5, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {celebrateMilestone}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.div
        className="relative z-[3] mb-6 flex flex-col items-center"
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

      <HealthLabGameTimer value={`${elapsed.toFixed(1)}s`} label="Hold time" className="relative z-[3] mb-4" />

      <div className="relative z-[3]">
        <HealthLabHoldOrb
        holding={holding}
        disabled={finished}
        buttonRef={holdButtonRef}
        ariaLabel="Hold to inflate balloon"
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
      >
        <Fingerprint
          className={cn(
            "h-14 w-14 text-white/95 drop-shadow-md",
            holding ? "opacity-100" : "opacity-85",
          )}
          strokeWidth={1.5}
          aria-hidden
        />
      </HealthLabHoldOrb>
      </div>

      <p className="relative z-[3] mt-6 max-w-xs text-center text-xs leading-relaxed text-white/55">
        Place your finger on the circle and hold — gentle micro-movements only!
      </p>
    </HealthLabGameStage>
  );
}
