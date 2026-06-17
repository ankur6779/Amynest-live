import { memo, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import { REACTOR_STATE_COLORS, type ReactorState } from "./crystal-reactor-constants";

export const CrystalReactorToast = memo(function CrystalReactorToast({
  message,
}: {
  message: string | null;
}) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[14%] z-[6] -translate-x-1/2">
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            className="whitespace-nowrap rounded-2xl border border-violet-300/35 bg-violet-500/20 px-5 py-2.5 text-lg font-bold text-violet-50 shadow-[0_0_40px_-8px_rgba(139,92,246,0.55)] backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.7, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -12 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export const CrystalReactorMilestoneBurst = memo(function CrystalReactorMilestoneBurst({
  active,
  reduced,
}: {
  active: boolean;
  reduced: boolean;
}) {
  if (!active || reduced) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
      {[...Array(12)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-[45%] text-xl"
          initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [1, 0],
            scale: [0, 1.6],
            x: Math.cos((i / 12) * Math.PI * 2) * 85,
            y: Math.sin((i / 12) * Math.PI * 2) * 70,
          }}
          transition={{ duration: 0.75, ease: "easeOut" }}
        >
          {["⚡", "💎", "✨", "✦"][i % 4]}
        </motion.span>
      ))}
    </div>
  );
});

export const CrystalReactorParticles = memo(function CrystalReactorParticles({
  active,
  intensity,
  reduced,
}: {
  active: boolean;
  intensity: number;
  reduced: boolean;
}) {
  const count = useMemo(() => {
    if (!active || reduced) return 0;
    return Math.min(16, 4 + Math.floor(intensity * 12));
  }, [active, intensity, reduced]);

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: 20 + (i * 17) % 60,
        delay: (i % 5) * 0.12,
        symbol: ["⚡", "✨", "💎", "🌌"][i % 4],
      })),
    [count],
  );

  if (count === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute text-sm text-cyan-200/80"
          style={{ left: `${p.left}%`, bottom: "35%" }}
          animate={{ opacity: [0, 1, 0], y: [0, -80 - intensity * 40], scale: [0.5, 1, 0.3] }}
          transition={{ duration: 1.1 + intensity * 0.5, repeat: Infinity, delay: p.delay }}
        >
          {p.symbol}
        </motion.span>
      ))}
    </div>
  );
});

export const CrystalReactorStateBadge = memo(function CrystalReactorStateBadge({
  state,
  className,
}: {
  state: ReactorState;
  className?: string;
}) {
  const colors = REACTOR_STATE_COLORS[state];
  return (
    <div
      className={cn(
        "rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-md",
        colors.ring,
        "bg-black/30 text-white/90",
        className,
      )}
    >
      {colors.label}
    </div>
  );
});

export const CrystalReactorVictory = memo(function CrystalReactorVictory({
  show,
  powerPct,
  reduced,
  onDismiss,
}: {
  show: boolean;
  powerPct: number;
  reduced: boolean;
  onDismiss: () => void;
}) {
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
        >
          {!reduced && (
            <>
              <motion.div
                className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/20 blur-3xl"
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: [1, 1.5, 1.2], opacity: [0.8, 0.4, 0] }}
                transition={{ duration: 1.2 }}
                aria-hidden
              />
              {[...Array(24)].map((_, i) => (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute text-2xl"
                  style={{ left: `${(i * 11) % 100}%`, top: `${(i * 9) % 35}%` }}
                  initial={{ opacity: 0 }}
                  animate={{ y: 400, opacity: [0, 1, 0], rotate: 360 }}
                  transition={{ duration: 2.2, delay: i * 0.04 }}
                >
                  {["🎆", "⚡", "💎", "🚀", "✨"][i % 5]}
                </motion.span>
              ))}
            </>
          )}

          <motion.div
            className="relative max-w-sm rounded-3xl border border-violet-300/30 bg-gradient-to-br from-indigo-950/95 via-violet-950/95 to-cyan-950/95 p-8 text-center shadow-[0_24px_80px_-20px_rgba(139,92,246,0.65)]"
            initial={{ scale: 0.6, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <p className="text-5xl" aria-hidden>
              🏆
            </p>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">CRYSTAL REACTOR SAVIOR</h2>
            <p className="mt-3 text-sm text-violet-200/75">The megacity is fully powered!</p>
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-cyan-200">
              {Math.round(powerPct)}%
            </p>
            <p className="mt-3 text-sm text-emerald-100/70">Crystal towers online · vehicles in the sky 🚀</p>
            <button
              type="button"
              onClick={onDismiss}
              className="mt-6 min-h-[48px] rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-8 py-3 text-sm font-bold text-white"
            >
              Amazing!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export const CrystalReactorPowerMeter = memo(function CrystalReactorPowerMeter({
  powerPct,
  label,
  className,
}: {
  powerPct: number;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("health-lab-timer-glass min-w-[7rem] rounded-2xl px-4 py-3 text-center", className)}>
      <p className="font-mono text-2xl font-bold tabular-nums text-white">{Math.round(powerPct)}%</p>
      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/45">Power</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-blue-400"
          animate={{ width: `${Math.min(100, powerPct)}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
      <p className="mt-1.5 line-clamp-1 text-[8px] font-medium uppercase tracking-wide text-cyan-200/60">{label}</p>
    </div>
  );
});
