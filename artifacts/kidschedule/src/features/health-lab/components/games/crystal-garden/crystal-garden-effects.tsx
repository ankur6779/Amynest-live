import { memo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useHealthLabDialogEscape } from "../../../hooks/use-health-lab-dialog-escape";
import {
  CRYSTAL_GARDEN_ROUNDS,
  MOTION_TIER_LABELS,
  type FreezeMotionTier,
} from "./crystal-garden-constants";

export const CrystalGardenDanceLights = memo(function CrystalGardenDanceLights({
  active,
}: {
  active: boolean;
}) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {active && !reduced && (
        <>
          <motion.div
            className="pointer-events-none fixed inset-0 z-[1] health-lab-dance-lights"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden
          />
          {[...Array(6)].map((_, i) => (
            <motion.span
              key={`note-${i}`}
              className="pointer-events-none fixed z-[2] text-xl sm:text-2xl"
              style={{ left: `${8 + i * 15}%`, top: `${12 + (i % 3) * 8}%` }}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [20, -10, -30, -50],
                rotate: [-12, 8, -6, 0],
              }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.35 }}
              aria-hidden
            >
              {["🎵", "🎶", "✨", "💃", "🕺", "⭐"][i]}
            </motion.span>
          ))}
        </>
      )}
    </AnimatePresence>
  );
});

const TIER_STYLES: Record<
  FreezeMotionTier,
  { ring: string; glow: string; bg: string; pulse: boolean }
> = {
  perfect: {
    ring: "stroke-emerald-400",
    glow: "rgba(52,211,153,0.65)",
    bg: "from-emerald-500/25 to-teal-500/15",
    pulse: true,
  },
  slight: {
    ring: "stroke-amber-300",
    glow: "rgba(251,191,36,0.55)",
    bg: "from-amber-500/20 to-yellow-500/12",
    pulse: true,
  },
  wobble: {
    ring: "stroke-orange-400",
    glow: "rgba(251,146,60,0.6)",
    bg: "from-orange-500/22 to-amber-500/12",
    pulse: true,
  },
  danger: {
    ring: "stroke-rose-400",
    glow: "rgba(251,113,133,0.65)",
    bg: "from-rose-500/25 to-orange-500/15",
    pulse: true,
  },
};

export const CrystalGardenMotionMeter = memo(function CrystalGardenMotionMeter({
  tier,
  stability,
  active,
  className,
}: {
  tier: FreezeMotionTier;
  stability: number;
  active: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const style = TIER_STYLES[tier];
  const size = 100;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, stability / 100));

  if (!active) {
    return (
      <div className={cn("flex h-[100px] w-[100px] items-center justify-center rounded-full border border-white/10 bg-white/5", className)}>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Ready</span>
      </div>
    );
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {!reduced && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full blur-xl"
          style={{ background: style.glow }}
          animate={{ opacity: [0.35, 0.8, 0.35], scale: [1, 1.1, 1] }}
          transition={{ duration: tier === "danger" ? 0.4 : 1.2, repeat: Infinity }}
          aria-hidden
        />
      )}

      {tier === "perfect" && !reduced && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute text-sm"
              style={{ top: `${5 + i * 30}%`, left: `${8 + i * 28}%` }}
              animate={{ opacity: [0, 1, 0], y: [0, -6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              aria-hidden
            >
              ✨
            </motion.span>
          ))}
        </>
      )}

      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={style.ring}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.12 }}
          style={{ filter: `drop-shadow(0 0 8px ${style.glow})` }}
        />
      </svg>

      <div className={cn("absolute flex flex-col items-center justify-center rounded-full bg-gradient-to-br px-1", style.bg)} style={{ width: size - 22, height: size - 22 }}>
        <span className="text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-white/90">
          {MOTION_TIER_LABELS[tier]}
        </span>
        <span className="font-mono text-lg font-bold tabular-nums text-white">{Math.round(stability)}%</span>
      </div>
    </div>
  );
});

export const CrystalGardenFreezeCinematic = memo(function CrystalGardenFreezeCinematic({
  active,
  reduced,
}: {
  active: boolean;
  reduced: boolean;
}) {
  if (reduced) return null;

  return (
    <AnimatePresence>
      {active && (
        <>
          <motion.div
            className="pointer-events-none fixed inset-0 z-[25] bg-cyan-500/15"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0.35] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none fixed left-1/2 top-1/2 z-[26] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300/50"
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 3.5, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            aria-hidden
          />
          {[...Array(10)].map((_, i) => (
            <motion.span
              key={`freeze-particle-${i}`}
              className="pointer-events-none fixed left-1/2 top-1/2 z-[26] text-lg text-cyan-100"
              initial={{ opacity: 1, scale: 0 }}
              animate={{
                opacity: [1, 0],
                scale: [0, 1.2],
                x: Math.cos((i / 10) * Math.PI * 2) * 100,
                y: Math.sin((i / 10) * Math.PI * 2) * 100,
              }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              aria-hidden
            >
              ❄️
            </motion.span>
          ))}
        </>
      )}
    </AnimatePresence>
  );
});

export const CrystalGardenStatueAura = memo(function CrystalGardenStatueAura({
  active,
  rating,
  reduced,
}: {
  active: boolean;
  rating: "master" | "amazing" | "perfect" | null;
  reduced: boolean;
}) {
  if (!active || !rating || reduced) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center" aria-hidden>
      <motion.div
        className="absolute h-40 w-40 rounded-full bg-cyan-400/25 blur-2xl"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      {[...Array(8)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute text-xl"
          animate={{
            opacity: [0, 1, 0],
            y: [20, -40 - i * 8],
            x: Math.cos((i / 8) * Math.PI * 2) * 30,
          }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
        >
          {rating === "master" ? "👑" : rating === "amazing" ? "⭐" : "🧊"}
        </motion.span>
      ))}
    </div>
  );
});

export const CrystalGardenRoundCelebration = memo(function CrystalGardenRoundCelebration({
  show,
  emoji,
  label,
  reduced,
}: {
  show: boolean;
  emoji: string;
  label: string;
  reduced: boolean;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-[8] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {!reduced &&
            [...Array(12)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-2xl"
                initial={{ scale: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [1, 0.8, 0],
                  x: Math.cos((i / 12) * Math.PI * 2) * 70,
                  y: Math.sin((i / 12) * Math.PI * 2) * 50,
                }}
                transition={{ duration: 0.8, delay: 0.1 }}
              >
                {["💎", "✨", "🌸", "🦋"][i % 4]}
              </motion.span>
            ))}
          <motion.div
            className="rounded-3xl border border-cyan-300/35 bg-gradient-to-br from-cyan-500/25 to-violet-500/20 px-8 py-5 text-center shadow-[0_0_50px_-10px_rgba(34,211,238,0.55)] backdrop-blur-md"
            initial={{ scale: 0.6, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
          >
            <p className="text-4xl" aria-hidden>
              {emoji}
            </p>
            <p className="mt-2 text-lg font-bold text-white">{label}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export const CrystalGardenVictory = memo(function CrystalGardenVictory({
  show,
  successes,
  reduced,
  onDismiss,
}: {
  show: boolean;
  successes: number;
  reduced: boolean;
  onDismiss: () => void;
}) {
  const dismissRef = useRef<HTMLButtonElement>(null);
  useHealthLabDialogEscape(show, onDismiss, dismissRef);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm",
            !reduced && "health-lab-balloon-victory-shake",
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="crystal-garden-victory-title"
        >
          {!reduced && (
            <>
              <motion.div
                className="pointer-events-none absolute inset-x-0 top-[10%] h-28 bg-gradient-to-r from-cyan-400/30 via-violet-400/40 to-pink-400/30 blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                aria-hidden
              />
              {[...Array(24)].map((_, i) => (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute text-2xl"
                  style={{ left: `${(i * 11) % 100}%`, top: `${(i * 8) % 35}%` }}
                  initial={{ opacity: 0 }}
                  animate={{ y: 400, opacity: [0, 1, 0], rotate: 360 }}
                  transition={{ duration: 2.2, delay: i * 0.04 }}
                >
                  {["🎆", "💎", "🦋", "🌳", "✨"][i % 5]}
                </motion.span>
              ))}
            </>
          )}

          <motion.div
            className="relative max-w-sm rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-indigo-950/95 via-violet-950/95 to-cyan-950/95 p-8 text-center shadow-[0_24px_80px_-20px_rgba(34,211,238,0.55)]"
            initial={{ scale: 0.6, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <p className="text-5xl" aria-hidden>
              🏆
            </p>
            <h2 id="crystal-garden-victory-title" className="mt-4 text-2xl font-bold tracking-tight text-white">CRYSTAL GARDEN GUARDIAN</h2>
            <p className="mt-3 text-sm text-cyan-200/75">You restored the kingdom!</p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-amber-200">
              {successes}/{CRYSTAL_GARDEN_ROUNDS} Crystals
            </p>
            <p className="mt-3 text-sm text-emerald-100/70">Magical creatures have gathered! 🦄🐉</p>
            <button
              ref={dismissRef}
              type="button"
              onClick={onDismiss}
              className="mt-6 min-h-[48px] min-w-[48px] rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-8 py-3 text-sm font-bold text-white"
            >
              Amazing!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
