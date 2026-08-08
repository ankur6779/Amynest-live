import { memo, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import {
  isHealthLabLivingV1Enabled,
  livingPracticeVictoryCta,
  livingPracticeVictoryTitle,
} from "@/lib/health-lab/living-room";
import { useHealthLabDialogEscape } from "../../../hooks/use-health-lab-dialog-escape";
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
  const dismissRef = useRef<HTMLButtonElement>(null);
  useHealthLabDialogEscape(show, onDismiss, dismissRef);
  const living = isHealthLabLivingV1Enabled();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm",
            !living && !reduced && "health-lab-balloon-victory-shake",
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="crystal-reactor-victory-title"
          data-hl-living={living ? "1" : undefined}
        >
          {!living && !reduced && (
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
            className={cn(
              "relative max-w-sm rounded-3xl p-8 text-center",
              living
                ? "hl-living-deep-panel"
                : "border border-violet-300/30 bg-gradient-to-br from-indigo-950/95 via-violet-950/95 to-cyan-950/95 shadow-[0_24px_80px_-20px_rgba(139,92,246,0.65)]",
            )}
            initial={living || reduced ? { opacity: 0 } : { scale: 0.6, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <p className="text-5xl" aria-hidden>
              {living ? "✦" : "🏆"}
            </p>
            <h2
              id="crystal-reactor-victory-title"
              className={cn(
                "mt-4 text-2xl font-bold tracking-tight",
                living ? "hl-living-deep-title" : "text-white",
              )}
            >
              {living ? livingPracticeVictoryTitle() : "CRYSTAL REACTOR SAVIOR"}
            </h2>
            <p className={cn("mt-3 text-sm", living ? "text-[rgba(232,212,184,0.78)]" : "text-violet-200/75")}>
              {living ? "Steady hands practice complete." : "The megacity is fully powered!"}
            </p>
            <p
              className={cn(
                "mt-2 font-mono text-4xl font-bold tabular-nums",
                living ? "text-[rgba(255,252,248,0.96)]" : "text-cyan-200",
              )}
            >
              {Math.round(powerPct)}%
            </p>
            <p className={cn("mt-3 text-sm", living ? "text-[rgba(232,212,184,0.72)]" : "text-emerald-100/70")}>
              {living ? "A quiet effort — enough for now." : "Crystal towers online · vehicles in the sky 🚀"}
            </p>
            <button
              ref={dismissRef}
              type="button"
              onClick={onDismiss}
              className={cn(
                "mt-6 min-h-[48px] min-w-[48px] rounded-2xl px-8 py-3 text-sm font-bold",
                living
                  ? "hl-living-deep-primary-btn"
                  : "bg-gradient-to-r from-violet-500 to-cyan-500 text-white",
              )}
            >
              {living ? livingPracticeVictoryCta() : "Amazing!"}
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
